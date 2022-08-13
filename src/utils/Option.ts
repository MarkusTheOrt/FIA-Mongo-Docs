export interface None {
  readonly _tag: "None";
}

export interface Some<A> {
  readonly _tag: "Some";
  readonly value: A;
}

export type Option<A> = None | Some<A>;

export const none: Option<never> = { _tag: "None" };

export const some = <A>(a: A): Option<A> => ({ _tag: "Some", value: a });

export const isNone = (fa: Option<unknown>): fa is None => fa._tag === "None";

export const isSome = <A>(fa: Option<A>): fa is Some<A> => fa._tag === "Some";

export const unwrap = <A>(fa: Option<A>): A => {
  if (isNone(fa)) {
    throw new Error("Failed to unwrap Optional value.");
  }
  return fa.value;
};
