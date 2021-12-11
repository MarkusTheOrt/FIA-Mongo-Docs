const Fetch = require("node-fetch");
const Cheerio = require("cheerio");
const Moment = require("moment");
const Database = require("./Database");
const Log = require("./Log");
const Puppeteer = require("puppeteer");
const S3 = require("aws-sdk/clients/s3");
const Config = require("../config.json");

class FIA {
  constructor() {
    this.browser = null;
    if (Config.s3Endpoint) {
      this.s3 = new S3({
        endpoint: Config.s3Endpoint,
        credentials: {
          accessKeyId: Config.s3Access,
          secretAccessKey: Config.s3Secret,
        },
        s3BucketEndpoint: false,
      });
    }
  }

  async screenshot(url, name) {
    if (!Config.s3Endpoint) return null;
    const browser = await Puppeteer.launch({
      args: [
        "--enable-font-antialiasing",
        "--font-render-hinting=none",
        "--no-sandbox",
        "--desktop",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--disable-infobars",
        "--disable-canvas-aa",
        "--disable-gl-drawing-for-tests",
        "--use-gl=swiftshader",
        "--disable-breakpad",
        "--disable-dev-shm-usage",
        "--user-dta-dir=./chromeData",
        "--mute-audio",
        "--enable-webgl",
        "--disable-2d-canvas-clip-aa",
        "--disable-web-security",
      ],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
    );
    await page.setViewport({
      width: 900,
      height: 1300,
      deviceScaleFactor: 1.5,
    });
    const pgNum = name in Config.pageConf ? Config.pageConf[name] : 1;
    console.log(name, pgNum);
    await page.goto(
      `https://production.pdf.markus-api.workers.dev/?pdf=${url}&page=${pgNum}`,
      { waitUntil: "networkidle2" }
    );
    await page.waitForSelector(".finished", { timeout: 10000 }).catch((e) => {
      console.log("Skipping");
    });

    //await new Promise((resolve) => setTimeout(resolve, 3000));
    const screengrab = await page.screenshot({ type: "webp", quality: 65 });
    await page.close();
    await browser.close();

    return screengrab;
  }

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
        const screen = await this.screenshot(dataDoc.url, dataDoc.title);
        const key = Date.now();
        if (screen != null) {
          const upload = await this.s3
            .upload({
              Bucket: Config.s3Bucket,
              Key: "" + key + ".webp",
              Body: screen,
              ACL: "public-read",
              ContentType: "image/webp",
            })
            .promise();
          if (upload) dataDoc.img = "" + key + ".webp";
          console.log(dataDoc.img);
        }
        await Database.documents.insertOne(dataDoc);
      }
    }
  }
}

module.exports = new FIA();
