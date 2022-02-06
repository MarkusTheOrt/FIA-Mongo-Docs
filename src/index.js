const Log = require("./utils/Log");
const Database = require("./utils/Database");
const Fia = require("./utils/Fia");
const Config = require("./config.js");

(async () => {
  Database.connect();
  while (true) {
    await Fia.run();
    await new Promise((resolve) =>
      setTimeout(resolve, Config.fetchInterval * 1000)
    );
  }
})().catch((e) => Log.Stack(e));
