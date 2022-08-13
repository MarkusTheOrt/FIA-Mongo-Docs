import { execSync } from "child_process";
import fetch from "node-fetch";

import { isNone, isSome, none, Option, some, unwrap } from "./Option.js";
import Config from "../Config.js";
import { document } from "./Database.js";
import Try from "./Try.js";
import Log from "./Log.js";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { WithId } from "mongodb";

const screenshot = async (
  doc: Option<WithId<document>>
): Promise<Option<string>> => {
  checkMagick();

  const dlDoc = await downloadDoc(doc);
  if(isNone(dlDoc)) return none;
  try {
    execSync(
        `convert -density 200 ${unwrap(dlDoc)}[${getPageNumber(doc)}] -quality 90 ${unwrap(dlDoc)}.jpg`
      );
    } catch {
      console.log("Error Screenshotting PDF");
      return none;
    }

  return some(`${unwrap(dlDoc)}.jpg`);
};

export const checkMagick = (): boolean => {
  try {
    execSync("which convert");
    return true;
  } catch {
    console.log("ImageMagick convert not found.");
    return false;
  }
};

export const downloadDoc = async (
  doc: Option<WithId<document>>
): Promise<Option<string>> => {
  if (isNone(doc)) return none;
  const response = await Try(fetch(unwrap(doc).url));
  if (isNone(response)) {
    Log.Error("Couldn't download Document from the interwebz");
    return none;
  }
  if (!unwrap(response).ok) {
    Log.Error(`Error from "${unwrap(doc).url}" - ${unwrap(response).status}`);
    return none;
  }

  writeFileSync(
    `/tmp/fia/${unwrap(doc)._id.toString()}.pdf`,
    Buffer.from(await unwrap(response).arrayBuffer())
  );
  if (!existsSync(`/tmp/fia/${unwrap(doc)._id.toString()}.pdf`)) {
    Log.Error(
      `Couldn't find downloaded document "${`/tmp/fia/${unwrap(
        doc
      )._id.toString()}.pdf`}"`
    );
    return none;
  }
  return some(`/tmp/fia/${unwrap(doc)._id.toString()}.pdf`);
};

export const setupTempFolder = () => {
  if (existsSync('/tmp/fia/')) return;
  mkdirSync("/tmp/fia/");
}

export const getPageNumber = (doc: Option<document>): number => {
  if (isSome(doc) && unwrap(doc).title in Config.pageConf) return Config.pageConf[unwrap(doc).title] - 1;
  return 0;
}
export default screenshot;
