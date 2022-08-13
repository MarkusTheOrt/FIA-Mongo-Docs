import { none, Option, some } from "./Option.js";

export default async <T>(
  promise: Promise<T>
): Promise<Option<Exclude<T, null | undefined>>> => {
  try {
    const data = await promise;
    if (data === null || data === undefined)
      return none as Option<Awaited<Exclude<T, null | undefined>>>;
    return some(data) as Option<Awaited<Exclude<T, null | undefined>>>;
  } catch {
    return none as Option<Exclude<T, null | undefined>>;
  }
};
