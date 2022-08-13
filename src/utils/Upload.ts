import pkg from "@aws-sdk/client-s3";
import { Option, none, isNone, unwrap, some } from "./Option.js";
import Config from "../Config.js";
import { readFileSync } from "fs";
import Try from "./Try.js";
import { WithId } from "mongodb";
import { document } from "./Database.js";

const { S3 } = pkg;

export const S3Upload = async (
  filename: Option<string>,
  doc: Option<WithId<document>>
): Promise<Option<string>> => {
  if (isNone(filename)) return none;
  if (
    isNone(Config.s3Endpoint) ||
    isNone(Config.s3Access) ||
    isNone(Config.s3Secret) ||
    isNone(Config.s3Bucket)
  ) {
    console.log("S3 Settings unset.");
    return none;
  }

  const s3 = new S3({
    credentials: {
      accessKeyId: unwrap(Config.s3Access),
      secretAccessKey: unwrap(Config.s3Secret),
    },
    endpoint: unwrap(Config.s3Endpoint),
    bucketEndpoint: false,
    region: "US",
  });

  const buffer = readFileSync(unwrap(filename));
  const data = await Try(
    s3.putObject({
      Bucket: unwrap(Config.s3Bucket),
      Key: unwrap(doc)._id.toString() + ".jpg",
      ACL: "public-read",
      ContentType: "image/jpg",
      Body: buffer,
    })
  );

  if (isNone(data)) return none;
  if (unwrap(data).$metadata.httpStatusCode !== 200) return none;

  return some(`${unwrap(doc)._id.toString()}.jpg`);
};

export default S3Upload;
