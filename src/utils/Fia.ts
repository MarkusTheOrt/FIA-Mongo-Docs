// const Fetch = require("node-fetch");
// const Cheerio = require("cheerio");
// const Moment = require("moment-timezone");
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
