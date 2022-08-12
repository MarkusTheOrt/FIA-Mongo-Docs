import { none, Option, some } from "./Option";

export default async <T>(promise: Promise<T>): Promise<Option<T>> => {
  try {
    return some(await promise);
  } catch {
    return none;
  }
};
