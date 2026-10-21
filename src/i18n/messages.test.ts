import { describe, expect, it } from "vitest";
import { LOCALES } from "./locales";
import { messagesFor } from "./messages";

type Leaf = { path: string; value: unknown };

function leaves(node: unknown, path = ""): Leaf[] {
  if (node && typeof node === "object")
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [{ path, value: node }];
}

const SAMPLE_ARGS = ["Portuguese", 3, "a1b2c3d"];

function rendered(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") {
    const args = SAMPLE_ARGS.slice(0, value.length);
    return [0, 1, 2].map((n) => String(value(...args.map((a) => (typeof a === "number" ? n : a)))));
  }
  return [String(value)];
}

const SAME_IN_BOTH = new Set<string>();

const en = leaves(messagesFor("en"));

describe("messages", () => {
  for (const locale of LOCALES) {
    const own = leaves(messagesFor(locale));

    it(`${locale} has exactly the keys English has, with the same kind of value`, () => {
      expect(own.map((l) => l.path)).toEqual(en.map((l) => l.path));
      for (const [i, leaf] of own.entries()) {
        expect(typeof leaf.value, leaf.path).toBe(typeof en[i].value);
        if (typeof leaf.value === "function")
          expect((leaf.value as () => string).length, leaf.path).toBe(
            (en[i].value as () => string).length,
          );
      }
    });

    it(`${locale} has no empty text, no dash and no unfilled value`, () => {
      for (const leaf of own) {
        for (const text of rendered(leaf.value)) {
          expect(text.trim(), leaf.path).not.toBe("");
          expect(text, leaf.path).toBe(text.trim());
          expect(text, leaf.path).not.toMatch(/—|undefined|NaN|\[object/);
        }
      }
    });
  }

  it("translates every text into Portuguese instead of leaving the English one", () => {
    const pt = leaves(messagesFor("pt-BR"));
    const untranslated = pt
      .filter(
        (leaf, i) =>
          !SAME_IN_BOTH.has(leaf.path) &&
          rendered(leaf.value).join() === rendered(en[i].value).join(),
      )
      .map((leaf) => leaf.path);
    expect(untranslated).toEqual([]);
  });
});
