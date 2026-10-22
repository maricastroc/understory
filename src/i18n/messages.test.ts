import { describe, expect, it } from "vitest";
import { LOCALES } from "./locales";
import { messagesFor } from "./messages";

type Leaf = { path: string; value: unknown };

function leaves(node: unknown, path = ""): Leaf[] {
  if (node && typeof node === "object")
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [{ path, value: node }];
}

const SAMPLES: unknown[] = [0, 1, 2, 21, "linha 9", "linhas 2–5", "o arquivo", "pr:812"];

function rendered(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value !== "function") return [String(value)];
  const out: string[] = [];
  for (const sample of SAMPLES) {
    try {
      out.push(String(value(...Array(value.length).fill(sample))));
    } catch {}
  }
  if (out.length === 0) throw new Error("no sample renders this message");
  return out;
}

const SAME_IN_BOTH = new Set<string>([
  "time.unit.m",
  "time.unit.d",
  "time.dayMonth",
  "time.plainDate",
  "time.monthYear",
  "history.count.commit",
  "history.count.pull_request",
  "history.count.issue",
  "landing.method.trail.commit",
  "landing.method.trail.issue",
  "artifact.kind.commit",
  "artifact.kind.pull_request",
  "artifact.kind.issue",
  "artifact.relation.other",
  "gap.chip.pull_request",
  "gap.chip.issue",
  "subject.commit",
  "clause.source",
  "why.commitHead",
  "caseScreen.legend.commit",
  "caseScreen.legend.pr",
  "caseScreen.legend.issue",
  "caseScreen.hidden",
  "caseScreen.hiddenSymbol",
  "accessible.capitalized",
  "composer.noun.namespace",
  "composer.noun.interface",
  "composer.noun.enum",
  "composer.noun.struct",
  "composer.noun.trait",
  "composer.repo.source.github",
  "composer.repo.labels.branch",
  "composer.repo.labels.head",
  "map.rows.commits",
  "map.rows.prs",
]);

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
