import fetch from "node-fetch";
//import Log from "./Log.js";
import { Option, isNone, unwrap, none, some, isSome } from "./Option.js";
import Try from "./Try.js";
import Regexes from "./Regex.js";
import Database, { dbEvent, document } from "./Database.js";
import { ObjectId, WithId } from "mongodb";

/**
 * Scrapes the website, matches documents and inserts new ones.
 */
const runner = async () => {
  const body = await Try(fetch("https://www.fia.com/documents"));
  if (isNone(body)) return;
  const response = unwrap(body);
  if (!response.ok) return;

  const text = await Try(response.text());
  if (isNone(text)) return;

  const title = matchTitle(unwrap(text));
  if (isNone(title)) return;

  let event = await findEvent(unwrap(title));
  if (isNone(event)) {
    event = await insertEvent(unwrap(title));
    console.log(
      "Inserted new Event `%s` for %d",
      unwrap(title),
      new Date().getUTCFullYear()
    );
  }

  if (isNone(event)) return;

  const docs = matchDocuments(unwrap(text), event);
  if (isNone(docs)) return;

  for (const document of unwrap(docs)) {
    if (isNone(document)) continue;
    // Skip Documents already there.
    if (isSome(await findDocument(unwrap(document).url, unwrap(event)._id)))
      continue;

    await insertDocument(unwrap(document));
  }
};

/**
 * Matches the Event title.
 * @param text the Text to search.
 * @returns Possible title of Current Grand-Prix Weekend.
 */
const matchTitle = (text: string): Option<string> => {
  const match = text.match(Regexes.active_event);
  if (match === null) return none;
  if (match.groups === undefined) return none;
  if (match.groups.active === undefined) return none;
  return some(match.groups.active);
};

/**
 * Matches The Documents.
 * @param text The text to search.
 * @returns Possible list of Documents.
 */
const matchDocuments = (
  text: string,
  event: Option<WithId<dbEvent>> = none
): Option<Option<document>[]> => {
  if (isNone(event)) return none;
  const match = text.match(Regexes.docuemnts_list);
  if (match === null) return none;
  if (match.length === 0) return none;

  const docsMatch = match[0].matchAll(Regexes.documents_block);
  let next = undefined;
  const documents = [];
  do {
    next = docsMatch.next();
    if (next.done) continue;
    if (next.value.length > 0) {
      documents.push(matchDocument(next.value[0], event));
    }
  } while (!next.done);
  if (documents.length === 0) return none;
  return some(documents);
};

const matchDocument = (
  text: string,
  event: Option<WithId<dbEvent>> = none
): Option<document> => {
  if (isNone(event)) return none;
  const titleMatch = text.match(Regexes.document_title);
  if (titleMatch === null || titleMatch.groups === undefined) return none;

  const urlMatch = text.match(Regexes.document_url);
  if (urlMatch === null || urlMatch.groups === undefined) return none;

  const dateMatch = text.match(Regexes.document_date);
  if (dateMatch === null || dateMatch.groups === undefined) return none;

  return some({
    title: titleMatch.groups.title,
    url: `https://www.fia.com${encodeURI(urlMatch.groups.url)}`,
    date: new Date().getTime(),
    event: unwrap(event)._id.toString(),
  });
};

const findEvent = async (
  name: string,
  year = new Date().getUTCFullYear()
): Promise<Option<WithId<dbEvent>>> => {
  const event = await Try(Database.Events.findOne({ name: name, year: year }));
  return event;
};

const insertEvent = async (
  name: string,
  year = new Date().getUTCFullYear()
): Promise<Option<WithId<dbEvent>>> => {
  const event = await Try(
    Database.Events.insertOne({ name: name, year: year })
  );
  if (isNone(event) || !unwrap(event).acknowledged) return none;
  return some({ _id: unwrap(event).insertedId, name: name, year: year });
};

const findDocument = async (
  url: string,
  event: ObjectId
): Promise<Option<document>> => {
  const document = await Try(
    Database.Documents.findOne({ url: url, event: event.toString() })
  );
  return document;
};

const insertDocument = async (
  document: document
): Promise<Option<WithId<document>>> => {
  const doc = await Try(Database.Documents.insertOne(document));
  if (isNone(doc) || !unwrap(doc).acknowledged) return none;
  return some({ ...document, _id: unwrap(doc).insertedId });
};

export default runner;

// const Database = require("./Database");
// const Log = require("./Log");
// const S3 = require("aws-sdk/clients/s3");
// const Config = require("../config.js");
// const { execSync, spawnSync } = require("child_process");
// const fs = require("fs");

// class FIA {

//   private s3;

//   constructor() {
//     // Load the S3 client
//     if (Config.s3Endpoint) {
//       this.s3 = new S3({
//         endpoint: Config.s3Endpoint,
//         credentials: {
//           accessKeyId: Config.s3Access,
//           secretAccessKey: Config.s3Secret,
//         },
//         s3BucketEndpoint: false,
//       });
//     }
//   }

//   /**
//    * Creates a screenshot from the given url
//    * @param {string} url the url of the PDF document
//    * @param {string} name the name of the document
//    * @returns {Buffer} the screenshot
//    */
//   async screenshot(url, name) {
//     if (!Config.s3Endpoint) return null;

//     const pdf = await Fetch(url);
//     if (pdf.ok !== true) {
//       return null;
//     }
//     fs.writeFileSync("/tmp/fia.pdf", await pdf.buffer());

//     if (fs.existsSync("/tmp/fia.pdf") === false) {
//       Log.Warn("Failed to download FIA PDF");
//       return null;
//     }

//     const page = Config.pageConf[name] - 1 || 0;

//     try {
//       execSync(
//         `convert -density 200 /tmp/fia.pdf[${page}] -quality 90 /tmp/fia.jpg`
//       );
//     } catch (e) {
//       Log.Stack(e);
//     }

//     if (fs.existsSync("/tmp/fia.jpg") === false) {
//       Log.Error("Failed to convert pdf to jpg");
//       return null;
//     }

//     const screengrab = fs.readFileSync("/tmp/fia.jpg");

//     // Clean up
//     fs.rmSync("/tmp/fia.pdf");
//     fs.rmSync("/tmp/fia.jpg");

//     return screengrab;
//   }

//   /**
//    * Runs the FIA scraper
//    * @returns {Promise<void>}
//    */
//   async run() {
//     const request = await Fetch("https://www.fia.com/documents/");
//     if (request.ok !== true) {
//       Log.Warn(`Encountered an ${request.status} on fia.com/documents`);
//       return;
//     }
//     const parsedHtml = Cheerio.load(await request.text());
//     const currentEvent = parsedHtml(".event-title.active").text().trim();
//     let event;
//     const dbEvent = await Database.events.findOne({
//       name: currentEvent,
//       year: new Date().getUTCFullYear(),
//     });
//     if (dbEvent === null) {
//       const res = await Database.events.insertOne({
//         name: currentEvent,
//         year: new Date().getUTCFullYear(),
//       });
//       if (res.acknowledged) {
//         event = res.insertedId.toString();
//       } else return;
//     } else {
//       event = dbEvent._id.toString();
//     }
//     const documents = parsedHtml(`.event-title.active + ul a[href$=pdf]`);
//     for (const key in documents) {
//       const dataDoc = { event: event, isNew: true };
//       const document = documents[key];
//       if (
//         document === undefined ||
//         document.attribs === undefined ||
//         document.attribs.href === undefined
//       )
//         continue;
//       const url = document.attribs.href;
//       dataDoc.url = encodeURI(`https://www.fia.com${url}`);
//       dataDoc.title = parsedHtml(document)
//         .find(parsedHtml(".title"))
//         .text()
//         .trim();
//       dataDoc.date = parseInt(
//         Moment.tz(
//           parsedHtml(document)
//             .find(parsedHtml(".date-display-single"))
//             .text()
//             .trim(),
//           "DD.MM.YY hh:mm",
//           "Europe/France"
//         ).format("x")
//       );
//       if (
//         dataDoc.url !== undefined &&
//         dataDoc.title !== undefined &&
//         dataDoc.date !== undefined
//       ) {
//         const res = await Database.documents.findOne({ url: dataDoc.url });
//         if (res !== null) continue;
//         const screen = await this.screenshot(dataDoc.url, dataDoc.title);
//         const key = Date.now();
//         if (screen != null) {
//           const upload = await this.s3
//             .upload({
//               Bucket: Config.s3Bucket,
//               Key: "" + key + ".jpg",
//               Body: screen,
//               ACL: "public-read",
//               ContentType: "image/jpg",
//             })
//             .promise();
//           if (upload) dataDoc.img = "" + key + ".jpg";
//         }
//         await Database.documents.insertOne(dataDoc);
//       }
//     }
//   }
// }

// export default new FIA();
