import Log from "./utils/Log.js";
import Database from "./utils/Database.js";
//import FIA from "./utils/Fia.js";
import Config from "./Config.js";

(async () => {
  await Database.connect();
  for (;;) {
    //await Fia.run();
    await new Promise<void>((resolve) =>
      setTimeout(resolve, Config.fetchInterval * 1000)
    );
  }
})().catch((e) => Log.Stack(e));
