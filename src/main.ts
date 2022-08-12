import Log from "./utils/Log.js";
import Database from "./utils/Database.js";
import runner from "./utils/Fia.js";
import Config from "./Config.js";

(async () => {
  await Database.connect();
  for (;;) {
    await runner();
    await new Promise<void>((resolve) =>
      setTimeout(resolve, Config.fetchInterval * 1000)
    );
  }
})().catch((e) => Log.Stack(e));
