import fetch from "node-fetch";
import { Option, isNone, unwrap, none, some, isSome } from "./Option.js";
import Try from "./Try.js";
import Regexes from "./Regex.js";
import Database, { dbEvent, document, WithImg } from "./Database.js";
import { ObjectId, WithId } from "mongodb";
import screenshot from "./Screenshot.js";
import upload from "./Upload.js";

/**
 * Scrapes the website, matches documents and inserts new ones.
 */
const runner = async () => {
  const body = await Try(fetch("https://www.fia.com/documents/championships/fia-formula-one-world-championship-14/season/season-2023-2042"));
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

    const newDoc = await insertDocument(unwrap(document));

    const file = await screenshot(newDoc as Option<WithId<WithImg>>);
    if (isNone(file)) return;
    const screeny = await upload(file, newDoc);
    if (isNone(file)) return;
    
    const update = await Try(Database.Documents.updateOne({ _id: unwrap(newDoc)._id }, { $set: {
      "img": unwrap(screeny)
    } }))
    

    if (isNone(update)) return;
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
