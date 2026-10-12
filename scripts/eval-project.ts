import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import type { EntailmentStatus } from "@understory/core/types";
import { parseControls, parseReplay } from "./eval-audit-claims";
import {
  type CaseFacts,
  type State,
  anchoringOf,
  crossTab,
  evidenceOf,
  isCausal,
  specificityOf,
  stateOf,
} from "./eval-link-states";
import { parseRecords } from "./eval-report";

const CURRENT = "2026-10-12-line-attribution.jsonl";
const BORROWED = /another part of the (same )?change|another change in the line/;

type Projected = {
  from: string;
  id: string;
  group: string;
  pass: number;
  claim: number;
  status: EntailmentStatus | null;
  evidence: string;
  specificity: string;
  state: State;
  anchoring: string | null;
  causal: boolean;
};

function show(title: string, table: Record<string, Record<string, number>>) {
  console.log(`\n${title}`);
  for (const [row, cells] of Object.entries(table))
    console.log(
      `  ${row}: ${Object.entries(cells)
        .sort((a, b) => b[1] - a[1])
        .map(([cell, n]) => `${n} ${cell}`)
        .join(" · ")}`,
    );
}

function main() {
  const out = process.argv[2];
  const factsFile = process.argv[3] ?? "eval/results/2026-10-12-link-signals.json";
  const replayFile =
    process.argv[4] ?? "eval/results/2026-10-12-patch-context-replay-one-question.jsonl";
  if (!out) {
    console.error(
      "usage: npm run eval:project -- <out.json> [link facts.json] [kept replay.jsonl]",
    );
    process.exit(1);
  }
  const kept = JSON.parse(readFileSync(factsFile, "utf8")) as { cases: CaseFacts[] };
  const facts = new Map(kept.cases.map((c) => [c.id, c]));
  const project = (
    base: Pick<Projected, "from" | "id" | "group" | "pass" | "claim">,
    text: string,
    cited: string[],
    status: EntailmentStatus | null,
  ): Projected => {
    const evidence = evidenceOf(status);
    const specificity = specificityOf(facts.get(base.id), cited);
    return {
      ...base,
      status,
      evidence,
      specificity,
      state: stateOf(evidence, specificity),
      anchoring: anchoringOf(facts.get(base.id), cited),
      causal: isCausal(text),
    };
  };

  const controls = parseControls(readFileSync("eval/audit-controls.json", "utf8"));
  const replay = parseReplay(readFileSync(replayFile, "utf8"));
  const written = controls.flatMap((control, at) =>
    replay.judgements
      .filter((j) => j.kind && j.claim === control.text)
      .map((j) =>
        project(
          {
            from: replayFile,
            id: control.id,
            group:
              control.expect === "supported"
                ? "true"
                : BORROWED.test(control.kind)
                  ? "borrowed"
                  : "false",
            pass: j.replay,
            claim: at,
          },
          control.text,
          control.citations,
          j.status,
        ),
      ),
  );

  const files = readdirSync("eval/results")
    .filter((name) => name.endsWith(".jsonl"))
    .filter(
      (name) => !readFileSync(`eval/results/${name}`, "utf8").startsWith('{"type":"meta","kind"'),
    );
  const claims = files.flatMap((name) =>
    parseRecords(readFileSync(`eval/results/${name}`, "utf8")).runs.flatMap((run) =>
      (run.narrative?.claims ?? []).map((claim, i) => {
        const checks = (run.narrative?.entailment?.checks ?? []).filter((k) => k.claim === i);
        return project(
          {
            from: name,
            id: run.id,
            group: `${run.category}, ${run.source === "synthetic" ? "synthetic" : "real lines"}`,
            pass: run.pass,
            claim: i,
          },
          claim.text,
          checks.length ? checks.map((k) => k.citation) : claim.citations,
          checks[0]?.status ?? null,
        );
      }),
    ),
  );

  const sub = (p: Projected) =>
    p.state === "not sustained" ? `not sustained, ${p.evidence}` : p.state;
  console.log(`Written controls, ${written.length} kept judgements of ${controls.length} claims`);
  show(
    "state, by what the control is",
    crossTab(written, (p) => p.group, sub),
  );
  show(
    "quality of the evidence alone",
    crossTab(
      written,
      (p) => p.group,
      (p) => p.evidence,
    ),
  );
  show(
    "specificity of the link alone",
    crossTab(
      written,
      (p) => p.group,
      (p) => p.specificity,
    ),
  );
  show(
    "claims that cite a review comment",
    crossTab(
      written.filter((p) => p.anchoring),
      (p) => `${p.group}, ${p.anchoring}`,
      sub,
    ),
  );

  for (const [title, rows] of [
    [`The pipeline as it is on main (${CURRENT})`, claims.filter((p) => p.from === CURRENT)],
    [`Every kept end-to-end run (${files.length} files)`, claims],
  ] as const) {
    console.log(`\n\n${title}: ${rows.length} claims`);
    show(
      "state, by category",
      crossTab(rows, (p) => p.group, sub),
    );
    show(
      "quality of the evidence, against specificity of the link",
      crossTab(
        rows,
        (p) => p.evidence,
        (p) => p.specificity,
      ),
    );
    show(
      "claims that cite a review comment",
      crossTab(
        rows.filter((p) => p.anchoring),
        (p) => `${p.group}, ${p.anchoring}`,
        sub,
      ),
    );
    show(
      "causal wording in the claim",
      crossTab(rows, (p) => (p.causal ? "causal wording" : "no causal wording"), sub),
    );
    const answers = new Map<string, Projected[]>();
    for (const p of rows)
      answers.set(`${p.from}|${p.id}|${p.pass}`, [
        ...(answers.get(`${p.from}|${p.id}|${p.pass}`) ?? []),
        p,
      ]);
    const best = (list: Projected[]) =>
      list.some((p) => p.state === "directly linked to the line")
        ? "at least one justification directly linked to the line"
        : list.some((p) => p.state === "recorded for the change, no specific link shown")
          ? "justified at the level of the change only"
          : "no sustained justification";
    show(
      "answers that made a claim",
      crossTab([...answers.values()], (list) => list[0].group, best),
    );
  }

  writeFileSync(
    out,
    `${JSON.stringify({ date: new Date().toISOString(), facts: factsFile, replay: replayFile, files, controls: written, claims }, null, 2)}\n`,
  );
}

main();
