import type { EntailmentStatus } from "@understory/core/types";
import type { Judgement, WrittenClaim } from "./eval-audit-claims";
import { type CaseFacts, crossTab, evidenceOf, specificityOf } from "./eval-link-states";
import { type PassageOrigin, passageKey, sitsIn } from "./eval-passage-origin";
import { type Adjudication, type RunRecord, type Verdict, runKey, verdictOf } from "./eval-report";

export type Presentation =
  | "documented for the line"
  | "inferred from the last change"
  | "told of an earlier change"
  | "said elsewhere in the change"
  | "from the file's history"
  | "stated, with no link to the line"
  | "not established";

export type Lead = Presentation | "abstained" | "out of scope" | "no answer";

export const POLICIES = [
  "only with a direct link",
  "also as an inference",
  "also for an earlier change, under that change",
] as const;

export type Policy = (typeof POLICIES)[number];

const ORDER: Presentation[] = [
  "documented for the line",
  "inferred from the last change",
  "told of an earlier change",
  "said elsewhere in the change",
  "from the file's history",
  "stated, with no link to the line",
  "not established",
];

export function saidElsewhere(facts: CaseFacts | undefined, sustaining: string[]): boolean {
  const mine = sustaining.flatMap((id) =>
    facts?.sources[id]?.link === "this change" ? [facts.sources[id]] : [],
  );
  return (
    mine.length > 0 &&
    mine.every(
      (source) =>
        source.kind === "review" &&
        source.comments.length > 0 &&
        source.comments.every((comment) => comment.placement === "another file"),
    )
  );
}

export function presentationOf(
  facts: CaseFacts | undefined,
  status: EntailmentStatus | null,
  sustaining: string[],
): Presentation {
  if (evidenceOf(status) !== "stated by a cited source") return "not established";
  const specificity = specificityOf(facts, sustaining);
  if (specificity.startsWith("direct")) return "documented for the line";
  if (specificity === "the change that last changed the line")
    return saidElsewhere(facts, sustaining)
      ? "said elsewhere in the change"
      : "inferred from the last change";
  if (specificity === "another change in the line's history") return "told of an earlier change";
  return specificity === "the file's history"
    ? "from the file's history"
    : "stated, with no link to the line";
}

export function givesSentence(policy: Policy, as: Lead): boolean {
  if (as === "documented for the line") return true;
  if (as === "inferred from the last change") return policy !== POLICIES[0];
  return as === "told of an earlier change" && policy === POLICIES[2];
}

export function claimPresentations(run: RunRecord, facts: CaseFacts | undefined): Presentation[] {
  const checks = run.narrative?.entailment?.checks ?? [];
  return (run.narrative?.claims ?? []).map((claim, at) => {
    const mine = checks.filter((check) => check.claim === at);
    const quoted = mine.filter((check) => check.quote).map((check) => check.citation);
    const cited = mine.length ? mine.map((check) => check.citation) : claim.citations;
    return presentationOf(facts, mine[0]?.status ?? null, quoted.length ? quoted : cited);
  });
}

export function leadOf(run: RunRecord, claims: Presentation[]): Lead {
  if (!run.narrative) return "no answer";
  if (run.narrative.answerable === false) return "out of scope";
  if (claims.length === 0) return "abstained";
  return ORDER.find((level) => claims.includes(level)) ?? "not established";
}

export type Group = "true" | "borrowed" | "false";

const BORROWED = /another part of the (same )?change|another change in the line/;

export const groupOf = (control: Pick<WrittenClaim, "kind" | "expect">): Group =>
  control.expect === "supported" ? "true" : BORROWED.test(control.kind) ? "borrowed" : "false";

export type ControlRow = {
  id: string;
  kind: string;
  group: Group;
  claim: number;
  pass: number;
  status: EntailmentStatus | null;
  presentation: Presentation;
};

export function controlRows(
  controls: WrittenClaim[],
  judgements: Judgement[],
  facts: Map<string, CaseFacts>,
): ControlRow[] {
  return controls.flatMap((control, at) =>
    judgements
      .filter((j) => j.kind && j.id === control.id && j.claim === control.text)
      .map((j) => ({
        id: control.id,
        kind: control.kind,
        group: groupOf(control),
        claim: at,
        pass: j.replay,
        status: j.status,
        presentation: presentationOf(facts.get(control.id), j.status, control.citations),
      })),
  );
}

export type AnswerRow = {
  from: string;
  id: string;
  group: string;
  pass: number;
  verdict: Verdict;
  flagged: boolean;
  lead: Lead;
};

export type Reread = { case: string; runs: Record<string, { now: Verdict }> };

export type Manual = { adjudication?: Adjudication; reread?: Reread; flagged?: Set<string> };

export function verdictFor(from: string, run: RunRecord, manual: Manual = {}): Verdict {
  const reread = manual.reread?.case === run.id ? manual.reread.runs[`${from}#${run.pass}`] : null;
  return reread?.now ?? verdictOf(run, manual.adjudication ?? {});
}

export function answerRows(
  from: string,
  runs: RunRecord[],
  facts: Map<string, CaseFacts>,
  manual: Manual = {},
): AnswerRow[] {
  return runs.map((run) => ({
    from,
    id: run.id,
    group: `${run.category}, ${run.source === "synthetic" ? "synthetic" : "real lines"}`,
    pass: run.pass,
    verdict: verdictFor(from, run, manual),
    flagged: manual.flagged?.has(runKey(run)) ?? false,
    lead: leadOf(run, claimPresentations(run, facts.get(run.id))),
  }));
}

export type PassageRow = {
  from: string;
  id: string;
  row: string;
  where: string;
  change: "the last change" | "an earlier change" | "no change" | "not kept";
};

const NOT_KEPT = "not kept";

function passageRow(
  from: string,
  id: string,
  row: string,
  origin: PassageOrigin | undefined,
): PassageRow {
  if (!origin) return { from, id, row, where: NOT_KEPT, change: NOT_KEPT };
  const place = origin.placement ? `, ${origin.placement}` : "";
  return {
    from,
    id,
    row,
    where: `${sitsIn(origin.kind, origin.parts)}${place}`,
    change:
      origin.change === null ? "no change" : origin.last ? "the last change" : "an earlier change",
  };
}

export function controlPassages(
  controls: WrittenClaim[],
  judgements: Judgement[],
  facts: Map<string, CaseFacts>,
  origins: Map<string, PassageOrigin>,
): PassageRow[] {
  return controls.flatMap((control) =>
    judgements
      .filter((j) => j.kind && j.id === control.id && j.claim === control.text && j.quote)
      .flatMap((j) => {
        const as = presentationOf(facts.get(control.id), j.status, control.citations);
        const row = `${groupOf(control)}, ${as}`;
        const found = control.citations.flatMap(
          (source) => origins.get(passageKey(control.id, source, j.quote as string)) ?? [],
        );
        return found.length
          ? found.map((origin) => passageRow("controls", control.id, row, origin))
          : [passageRow("controls", control.id, row, undefined)];
      }),
  );
}

export function answerPassages(
  from: string,
  runs: RunRecord[],
  facts: Map<string, CaseFacts>,
  origins: Map<string, PassageOrigin>,
  manual: Manual = {},
): PassageRow[] {
  return runs.flatMap((run) => {
    const presented = claimPresentations(run, facts.get(run.id));
    const verdict = verdictFor(from, run, manual);
    return (run.narrative?.entailment?.checks ?? []).flatMap((check) =>
      check.quote && check.claim !== undefined
        ? [
            passageRow(
              from,
              run.id,
              `${presented[check.claim] ?? "not established"}, verdict ${verdict}`,
              origins.get(passageKey(run.id, check.citation, check.quote)),
            ),
          ]
        : [],
    );
  });
}

type Table = Record<string, Record<string, number>>;

export type OriginTables = { passages: number; where: Table; change: Table };

export function originTables(rows: PassageRow[]): OriginTables {
  return {
    passages: rows.length,
    where: crossTab(
      rows,
      (row) => row.row,
      (row) => row.where,
    ),
    change: crossTab(
      rows,
      (row) => row.row,
      (row) => row.change,
    ),
  };
}

function count<T>(rows: T[], keyOf: (row: T) => string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of rows) totals[keyOf(row)] = (totals[keyOf(row)] ?? 0) + 1;
  return totals;
}

function sentences<T>(rows: T[], rowOf: (row: T) => string, asOf: (row: T) => Lead): Table {
  const table: Table = {};
  for (const policy of POLICIES)
    table[policy] = count(
      rows.filter((row) => givesSentence(policy, asOf(row))),
      rowOf,
    );
  return table;
}

const sameOnEvery = <T>(rows: T[], keyOf: (row: T) => string, asOf: (row: T) => string) => {
  const seen = new Map<string, Set<string>>();
  for (const row of rows) seen.set(keyOf(row), (seen.get(keyOf(row)) ?? new Set()).add(asOf(row)));
  return { same: [...seen.values()].filter((all) => all.size === 1).length, of: seen.size };
};

export type ControlTables = {
  judgements: number;
  claims: number;
  total: Record<string, number>;
  presented: Table;
  byKind: Table;
  sentence: Table;
  borrowedAsAnInference: Record<string, number>;
  trueNotPresented: Record<string, number>;
  steady: { same: number; of: number };
};

export function controlTables(rows: ControlRow[]): ControlTables {
  const of = (group: Group, as: Presentation) =>
    rows.filter((row) => row.group === group && row.presentation === as);
  return {
    judgements: rows.length,
    claims: new Set(rows.map((row) => row.claim)).size,
    total: count(rows, (row) => row.group),
    presented: crossTab(
      rows,
      (row) => row.group,
      (row) => row.presentation,
    ),
    byKind: crossTab(
      rows,
      (row) => row.kind,
      (row) => row.presentation,
    ),
    sentence: sentences(
      rows,
      (row) => row.group,
      (row) => row.presentation,
    ),
    borrowedAsAnInference: count(of("borrowed", "inferred from the last change"), (row) => row.id),
    trueNotPresented: count(of("true", "not established"), (row) => row.id),
    steady: sameOnEvery(
      rows,
      (row) => String(row.claim),
      (row) => row.presentation,
    ),
  };
}

export type AnswerTables = {
  answers: number;
  total: Record<string, number>;
  lead: Table;
  sentence: Table;
  verdicts: Table;
  accepted: Record<string, number>;
  acceptedWithASentence: Table;
  failed: Table;
  flagged: Table;
  realLines: Table;
  steady: Record<string, { same: number; of: number }>;
};

export function answerTables(rows: AnswerRow[]): AnswerTables {
  const group = (row: AnswerRow) => row.group;
  const lead = (row: AnswerRow) => row.lead;
  const accepted = rows.filter((row) => row.verdict === "pass");
  const scored = rows.filter((row) => row.lead !== "no answer");
  return {
    answers: rows.length,
    total: count(rows, group),
    lead: crossTab(rows, group, lead),
    sentence: sentences(rows, group, lead),
    verdicts: crossTab(rows, group, (row) => row.verdict),
    accepted: count(accepted, group),
    acceptedWithASentence: sentences(accepted, group, lead),
    failed: crossTab(
      rows.filter((row) => row.verdict === "fail"),
      group,
      lead,
    ),
    flagged: crossTab(
      rows.filter((row) => row.flagged),
      group,
      lead,
    ),
    realLines: crossTab(
      rows.filter((row) => row.group.endsWith("real lines")),
      (row) => row.id,
      lead,
    ),
    steady: Object.fromEntries(
      [...new Set(scored.map(group))].map((name) => [
        name,
        sameOnEvery(
          scored.filter((row) => row.group === name),
          (row) => `${row.from}|${row.id}`,
          lead,
        ),
      ]),
    ),
  };
}

const cells = (row: Record<string, number> = {}) =>
  Object.entries(row)
    .sort((a, b) => b[1] - a[1])
    .map(([cell, n]) => `${n} ${cell}`)
    .join(" · ") || "none";

const lines = (title: string, table: Table) => [
  "",
  title,
  ...Object.entries(table).map(([row, columns]) => `  ${row}: ${cells(columns)}`),
];

const shares = (title: string, table: Table, total: Record<string, number>) => [
  "",
  `${title} (${POLICIES.join(" · ")})`,
  ...Object.entries(total).map(
    ([group, all]) =>
      `  ${group}: ${POLICIES.map((policy) => table[policy]?.[group] ?? 0).join(" · ")} of ${all}`,
  ),
];

export function controlLines(t: ControlTables): string[] {
  const at = (group: Group, as: Presentation) => t.presented[group]?.[as] ?? 0;
  const all = (group: Group) => t.total[group] ?? 0;
  const wrong = at("borrowed", "documented for the line") + at("false", "documented for the line");
  return [
    `Written controls, ${t.judgements} kept judgements of ${t.claims} claims`,
    ...lines("what each would be presented as, by what the control is", t.presented),
    "",
    "read against what each control is",
    `  grave, a borrowed or false claim presented as documented for the line: ${wrong}`,
    `  grave, a false claim presented as an inference: ${at("false", "inferred from the last change")} of ${all("false")}`,
    `  incorrect attribution, a borrowed reason presented as an inference: ${at("borrowed", "inferred from the last change")} of ${all("borrowed")} (${cells(t.borrowedAsAnInference)})`,
    `  legitimate uncertainty, a true claim presented as an inference: ${at("true", "inferred from the last change")} of ${all("true")}`,
    `  a true claim documented for the line: ${at("true", "documented for the line")} of ${all("true")}`,
    `  a true claim told of the earlier change it is about: ${at("true", "told of an earlier change")} of ${all("true")}`,
    `  a borrowed reason told of an earlier change: ${at("borrowed", "told of an earlier change")} of ${all("borrowed")}`,
    `  lost, a true claim the audit did not credit: ${at("true", "not established")} of ${all("true")} (${cells(t.trueNotPresented)})`,
    ...shares("judgements whose sentence would reach the reader", t.sentence, t.total),
    ...lines("by kind of control", t.byKind),
    "",
    `Controls presented the same way on every judgement: ${t.steady.same} of ${t.steady.of}.`,
  ];
}

export function answerLines(title: string, t: AnswerTables): string[] {
  return [
    "",
    "",
    `${title}: ${t.answers} runs`,
    ...lines("what leads each answer, by category", t.lead),
    ...shares("runs in which the reader is given a sentence", t.sentence, t.total),
    ...lines("the verdict kept for each run, by the checks or by hand", t.verdicts),
    ...shares("of the runs whose kept verdict is a pass", t.acceptedWithASentence, t.accepted),
    ...lines("runs whose kept verdict is a fail, by what would lead them", t.failed),
    ...lines("runs a kept read of the claims found to say something no source supports", t.flagged),
    ...lines("real lines, case by case", t.realLines),
    "",
    "cases led the same way on every pass of a run",
    ...Object.entries(t.steady).map(([group, s]) => `  ${group}: ${s.same} of ${s.of}`),
  ];
}

export const NOT_PERTINENCE =
  "Where a passage sits and which change it belongs to are read from the record. Neither says that the passage is the reason for the investigated line.";

export function originLines(title: string, t: OriginTables): string[] {
  return [
    "",
    "",
    `${title}: ${t.passages} verified passages`,
    ...lines("where each passage sits in the record", t.where),
    ...lines("the change each passage's record belongs to", t.change),
  ];
}
