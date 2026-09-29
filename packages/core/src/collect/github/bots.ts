export type Actor = { __typename?: string; login: string } | null;

export const ACTOR = "author { __typename login }";

export const isBot = (actor: Actor | undefined): boolean => actor?.__typename === "Bot";

export function withoutBots<T extends { author: Actor }>(items: T[]): T[] {
  return items.filter((item) => !isBot(item.author));
}
