import { GAP, LINE_MARK } from "@understory/core/collect/change-map";
import { z } from "zod";

export const PERTINENCE_SYSTEM = [
  "You read one change to a codebase and decide whether a stated reason explains what that change",
  "did to ONE line, the line under investigation.",
  "",
  "You are given the line, a sentence that gives a reason for it, the passage or passages of the",
  "project's record (a commit message, a pull request, a review, an issue) the sentence rests on,",
  "and a map of the whole change: every file it touched, every hunk, the changed rows with their",
  `numbers, and the line marked "${LINE_MARK}". The map may be cut. Where it is, it says how many`,
  `rows, hunks or files are not shown, and "${GAP}" marks rows left out inside a hunk.`,
  "",
  "That the passage is in the record is established, and so is that the change touched the line.",
  "Do not judge either. The sentence claims that the passage's reason is the line's: do not take its",
  "word for it. Judge only which part of the change the reason is about.",
  "",
  "Decide from what the rows do, not from the words they share with the passage. A change often does",
  "several things, and its record often gives a reason for each. A reason for another thing the same",
  "change did does not explain the line, even when it sits in the same pull request, the same file or",
  "the same hunk. A reason that explains the line may explain other parts too.",
  "",
  "Answer with one verdict:",
  "- the_line: the reason is why the change added or altered the line as it did.",
  "- another_part: other rows of this change carry the reason out, and the line's own change does not.",
  "- not_in_change: no row of this change carries the reason out. It is about something else, such as",
  "  an approach that was dropped or another change.",
  "- insufficient: what you are shown does not let you tell what the reason is about, because the",
  "  passage is too vague or the part of the change that would tell is not shown.",
  "- indeterminate: you can tell what the reason is about, and it is genuinely open whether it covers",
  "  the line's change.",
  "",
  "For the_line and another_part, copy into `row` ONE changed row of the map, exactly as shown, with",
  "its sign and number, that carries the reason out: for the_line, the line itself or a changed row",
  "next to it; for another_part, a row of the part that does. Leave `row` empty for the other",
  "verdicts. Keep `reason` to one short line.",
].join("\n");

export const pertinenceSchema = z.object({
  verdict: z.enum(["the_line", "another_part", "not_in_change", "insufficient", "indeterminate"]),
  row: z.string(),
  reason: z.string(),
});

export type PertinenceAnswer = z.infer<typeof pertinenceSchema>;

export type PertinenceInput = {
  line: {
    path: string;
    number: number | null;
    text: string;
    did: "added" | "rewrote" | "respaced" | null;
    before: string | null;
  };
  sentence: string | null;
  passages: Array<{ source: string; kind: string; parts: string[]; text: string }>;
  change: { id: string; title: string; files: number };
  map: string;
};

const didText = (line: PertinenceInput["line"]) =>
  line.did === "added"
    ? "added it"
    : line.did === "respaced"
      ? "changed only its spacing"
      : line.did === "rewrote"
        ? `rewrote it; before, it read: ${line.before ?? "(unknown)"}`
        : "changed it";

export function renderPertinence(input: PertinenceInput): string {
  return [
    `The line under investigation, as numbered in this change: ${input.line.path}${input.line.number ? `:${input.line.number}` : ""}`,
    `  ${input.line.text.trim()}`,
    `What this change did to it: ${didText(input.line)}`,
    "",
    ...(input.sentence === null
      ? ["The sentence under review: none is given. Judge the reason the passage gives."]
      : [
          "The sentence under review (it claims the reason; it may be wrong):",
          `  ${input.sentence}`,
        ]),
    "",
    `The passage${input.passages.length === 1 ? "" : "s"} it rests on:`,
    ...input.passages.map(
      (p) =>
        `  [${p.source} · ${p.kind}${p.parts.length ? `, ${p.parts.join(" and ")}` : ""}] “${p.text}”`,
    ),
    "",
    `The change: ${input.change.id} · ${input.change.title} · ${input.change.files} ${input.change.files === 1 ? "file" : "files"}`,
    input.map,
  ].join("\n");
}

export type Settled =
  | "the line's part"
  | "another part of the same file"
  | "another file"
  | "not in the change"
  | "insufficient evidence"
  | "indeterminate"
  | "row not in the map"
  | "row contradicts the verdict";

type MapRow = { path: string; hunk: number; index: number; text: string; line: boolean };

export function rowsOfMap(map: string): MapRow[] {
  const rows: MapRow[] = [];
  let path = "";
  let hunk = -1;
  let index = 0;
  for (const text of map.split("\n")) {
    if (
      /^\S.* · (added|modified|removed|renamed|copied|changed)\b/.test(text) &&
      !text.startsWith("@@")
    ) {
      path = text.split(" · ")[0].replace(/ \(was .*\)$/, "");
      continue;
    }
    if (text.startsWith("@@ ")) {
      hunk++;
      index = 0;
      continue;
    }
    if (text === GAP) {
      index++;
      continue;
    }
    if (/^[+\- ] *\d+ /.test(text)) {
      rows.push({
        path,
        hunk,
        index,
        text: text.replace(`  ${LINE_MARK}`, ""),
        line: text.endsWith(LINE_MARK),
      });
      index++;
    }
  }
  return rows;
}

function block(rows: MapRow[]): Set<MapRow> {
  const at = rows.findIndex((r) => r.line);
  const out = new Set<MapRow>();
  if (at < 0) return out;
  const changed = (r: MapRow | undefined, prev: MapRow) =>
    !!r &&
    r.path === prev.path &&
    r.hunk === prev.hunk &&
    Math.abs(r.index - prev.index) === 1 &&
    /^[+-]/.test(r.text);
  out.add(rows[at]);
  for (let i = at - 1; i >= 0 && changed(rows[i], rows[i + 1]); i--) out.add(rows[i]);
  for (let i = at + 1; i < rows.length && changed(rows[i], rows[i - 1]); i++) out.add(rows[i]);
  return out;
}

export function settle(answer: PertinenceAnswer, map: string): Settled {
  if (answer.verdict === "not_in_change") return "not in the change";
  if (answer.verdict === "insufficient") return "insufficient evidence";
  if (answer.verdict === "indeterminate") return "indeterminate";
  const rows = rowsOfMap(map);
  const wanted = answer.row.replace(`  ${LINE_MARK}`, "").trimEnd();
  const cited = rows.find((r) => r.text.trimEnd() === wanted);
  if (!cited) return "row not in the map";
  const own = block(rows);
  const home = rows.find((r) => r.line)?.path;
  const where: Settled = own.has(cited)
    ? "the line's part"
    : cited.path === home
      ? "another part of the same file"
      : "another file";
  if (answer.verdict === "the_line")
    return where === "the line's part" ? where : "row contradicts the verdict";
  return where === "the line's part" ? "row contradicts the verdict" : where;
}
