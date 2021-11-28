const Fetch = require("node-fetch");
const Cheerio = require("cheerio");
const Moment = require("moment");
const Database = require("./Database");
const Log = require("./Log");

class FIA {
  constructor() {}

  async run() {
    const request = await Fetch("https://www.fia.com/documents/");
    if (request.ok !== true) {
      Log.Warn(`Encountered an ${request.status} on fia.com/documents`);
      return;
    }
    const parsedHtml = Cheerio.load(await request.text());
    const currentEvent = parsedHtml(".event-title.active").text().trim();
    let event;
    const dbEvent = await Database.events.findOne({
      name: currentEvent,
      year: new Date().getUTCFullYear(),
    });
    if (dbEvent === null) {
      const res = await Database.events.insertOne({
        name: currentEvent,
        year: new Date().getUTCFullYear(),
      });
      if (res.acknowledged) {
        event = res.insertedId.toString();
      } else return;
    } else {
      event = dbEvent._id.toString();
    }
    //const events = parsedHtml(".event-title");
    const documents = parsedHtml(`.event-title.active + ul a[href$=pdf]`);
    for (const key in documents) {
      const dataDoc = { event: event, isNew: true };
      const document = documents[key];
      if (
        document === undefined ||
        document.attribs === undefined ||
        document.attribs.href === undefined
      )
        continue;
      const url = document.attribs.href;
      dataDoc.url = encodeURI(`https://www.fia.com${url}`);
      dataDoc.title = parsedHtml(document)
        .find(parsedHtml(".title"))
        .text()
        .trim();
      dataDoc.date = parseInt(
        Moment(
          parsedHtml(document)
            .find(parsedHtml(".date-display-single"))
            .text()
            .trim(),
          "DD.MM.YY hh:mm"
        ).format("x")
      );
      if (
        dataDoc.url !== undefined &&
        dataDoc.title !== undefined &&
        dataDoc.date !== undefined
      ) {
        const res = await Database.documents.findOne({ url: dataDoc.url });
        if (res !== null) continue;

        await Database.documents.insertOne(dataDoc);
      }
    }
  }
}

module.exports = new FIA();
