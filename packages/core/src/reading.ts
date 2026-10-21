import { owningCommit } from "./provenance";
import { FOLDED_COMMENT, partsOf } from "./record-part";
import type {
  Artifact,
  ChangeEntry,
  EntailmentStatus,
  Evidence,
  Explanation,
  Passage,
  PlacedComment,
  Placement,
  Quality,
  Reading,
  ReasonScope,
  Relation,
  Specificity,
  Standing,
  State,
  VerifiedNarrative,
} from "./types";

export type SourceFacts = {
  kind: string;
  link: Relation;
  comments: Array<{ placement: Placement; outdated: boolean }>;
};

export type CaseFacts = {
  granularity: string | null;
  alone: boolean;
  sources: Record<string, SourceFacts>;
};

export const qualityOf = (status: EntailmentStatus | null | undefined): Quality =>
  status === "supported"
    ? "stated by a cited source"
    : status === "weak"
      ? "insufficient"
      : status === "unsupported"
        ? "refuted"
        : "absent";

const hunkText = (row: string) => row.replace(/^[+\- ]/, "").trim();

export function placementOf(
  comment: PlacedComment,
  file: string,
  line: string,
  lineNumber?: number,
): Placement {
  if (comment.path !== file) return "another file";
  if (!comment.outdated && lineNumber !== undefined && comment.line === lineNumber)
    return "on the line";
  const wanted = line.trim();
  const rows = comment.diffHunk
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((row) => !row.startsWith("@@"));
  return wanted !== "" && rows.some((row) => !row.startsWith("-") && hunkText(row) === wanted)
    ? "in its hunk"
    : "same file, elsewhere";
}

const anchored = (placement: Placement) => placement === "on the line";

const onTheLine = (passage: Passage) =>
  passage.placement !== undefined && anchored(passage.placement);

const oneLine = (ev: Evidence): number | undefined =>
  ev.location && ev.location.startLine === ev.location.endLine ? ev.location.startLine : undefined;

const flat = (text: string) => text.replace(/\s+/g, " ").trim();

function commentOf(source: Artifact, quote: string): PlacedComment | undefined {
  const wanted = flat(quote).replace(FOLDED_COMMENT, "");
  const holding = (source.comments ?? []).filter((c) => flat(c.body).includes(wanted));
  return holding.length === 1 ? holding[0] : undefined;
}

const ORDER: Specificity[] = [
  "direct: a review comment on the line",
  "direct: the change is this block alone",
  "the change that last changed the line",
  "another change in the line's history",
  "the file's history",
  "none",
];

function specificityOfSource(facts: CaseFacts, source: SourceFacts): Specificity {
  if (facts.granularity === "file") return "the file's history";
  if (source.kind === "review" && source.comments.some((c) => anchored(c.placement)))
    return "direct: a review comment on the line";
  if (source.link === "this change")
    return facts.alone && source.kind === "commit"
      ? "direct: the change is this block alone"
      : "the change that last changed the line";
  return source.link === "another change" ? "another change in the line's history" : "none";
}

export function specificityOf(facts: CaseFacts | undefined, cited: string[]): Specificity {
  const found = cited.flatMap((id) => (facts?.sources[id] ? [facts.sources[id]] : []));
  if (!facts || found.length === 0) return "none";
  const each = found.map((source) => specificityOfSource(facts, source));
  return ORDER.find((level) => each.includes(level)) ?? "none";
}

export function stateOf(quality: Quality, specificity: Specificity): State {
  if (quality !== "stated by a cited source" || specificity === "none") return "not sustained";
  return specificity.startsWith("direct")
    ? "directly linked to the line"
    : "recorded for the change, no specific link shown";
}

function commitOf(source: Artifact, byId: Map<string, Artifact>): Artifact | null {
  let at: Artifact | undefined = source;
  for (let hops = 0; at && at.kind !== "commit" && hops < 6; hops++)
    at = at.parentId ? byId.get(at.parentId) : undefined;
  return at?.kind === "commit" ? at : null;
}

const markedLine = (ev: Evidence): string =>
  ev.code && ev.location ? (ev.code.lines[ev.location.startLine - ev.code.startLine] ?? "") : "";

export function factsOf(ev: Evidence): CaseFacts {
  const byId = new Map(ev.artifacts.map((a) => [a.id, a]));
  const last = owningCommit(ev);
  const scope = ev.code?.change?.scope;
  const file = ev.location?.file ?? "";
  const line = markedLine(ev);
  const relation = (a: Artifact): Relation => {
    const commit = commitOf(a, byId);
    if (!commit || !last) return "unlinked";
    return commit.id === last.id ? "this change" : "another change";
  };
  return {
    granularity: ev.coverage?.granularity ?? null,
    alone: !!scope && scope.files === 1 && scope.lines === scope.block,
    sources: Object.fromEntries(
      ev.artifacts.map((a) => [
        a.id,
        {
          kind: a.kind,
          link: relation(a),
          comments: (a.comments ?? []).map((comment) => ({
            placement: placementOf(comment, file, line, oneLine(ev)),
            outdated: comment.outdated,
          })),
        },
      ]),
    ),
  };
}

const sameCommit = (a: Artifact, sha: string) => {
  const own = typeof a.meta?.sha === "string" ? a.meta.sha : "";
  return own !== "" && (own.startsWith(sha) || sha.startsWith(own));
};

function didOf(ev: Evidence): Pick<ChangeEntry, "did" | "before"> {
  const change = ev.code?.change;
  if (!change) return {};
  if (change.before === null) return { did: "added", before: null };
  return {
    did: change.before.trim() === markedLine(ev).trim() ? "respaced" : "rewrote",
    before: change.before,
  };
}

function changesOf(ev: Evidence): ChangeEntry[] {
  const last = owningCommit(ev);
  const commits = ev.artifacts.filter((a) => a.kind === "commit");
  const walked = ev.lineage?.entries ?? [];
  const shown: ChangeEntry[] = commits.map((a) => {
    const found = walked.find((entry) => sameCommit(a, entry.sha));
    return {
      id: a.id,
      date: a.date,
      title: a.title,
      message: a.body,
      last: a.id === last?.id,
      shownToTheModels: true,
      ...(found?.did ? { did: found.did, before: found.before ?? null } : {}),
      ...(a.id === last?.id ? didOf(ev) : {}),
      reasons: [],
    };
  });
  const only: ChangeEntry[] = walked
    .filter((entry) => !commits.some((a) => sameCommit(a, entry.sha)))
    .map((entry) => ({
      id: `commit:${entry.sha.slice(0, 7)}`,
      date: entry.date,
      title: entry.title,
      ...(entry.message ? { message: entry.message } : {}),
      last: false,
      shownToTheModels: false,
      ...(entry.did ? { did: entry.did, before: entry.before ?? null } : {}),
      reasons: [],
    }));
  return [...shown, ...only].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

type Scoped = { entry: ChangeEntry; passage: Passage; scope: ReasonScope };

type Carrier = { entry: ChangeEntry; scope: ReasonScope; standing: Standing };

function carrierOf(scoped: Scoped[], citedChanges: Set<string>): Carrier | null {
  const direct = scoped.find((each) => each.scope === "line");
  if (direct) return { entry: direct.entry, scope: "line", standing: "documented for the line" };
  const able = scoped.filter(
    (each) =>
      (each.scope === "change" || each.scope === "earlier change") &&
      each.passage.placement !== "another file",
  );
  const latest = able.find((each) => each.entry.last);
  if (latest) return { entry: latest.entry, scope: latest.scope, standing: "inferred" };
  const [only] = able;
  if (!only || citedChanges.size !== 1 || !citedChanges.has(only.entry.id)) return null;
  return { entry: only.entry, scope: only.scope, standing: "inferred" };
}

function explanationOf(changes: ChangeEntry[]): Explanation {
  const standings = changes.flatMap((change) =>
    change.reasons.flatMap((reason) => (reason.standing ? [reason.standing] : [])),
  );
  if (standings.includes("documented for the line")) return "documented for the line";
  return standings.length ? "inferred" : "not identified";
}

export function readAnswer(ev: Evidence, narrative: VerifiedNarrative | null): Reading | null {
  if (!ev.location) return null;
  const byId = new Map(ev.artifacts.map((a) => [a.id, a]));
  const facts = factsOf(ev);
  const file = ev.location.file;
  const line = markedLine(ev);
  const changes = changesOf(ev);
  const plain: CaseFacts = {
    ...facts,
    sources: Object.fromEntries(
      Object.entries(facts.sources).map(([id, source]) => [id, { ...source, comments: [] }]),
    ),
  };
  const reading: Reading = {
    history: facts.granularity === "file" ? "the file" : "the line",
    changes,
    earlier: ev.lineage
      ? ev.lineage.stopped === "the line was added"
        ? null
        : ev.lineage.stopped
      : "not read",
    explanation: "not identified",
    unsustained: [],
    claims: [],
  };
  const scopeOf = (entry: ChangeEntry, passage: Passage): ReasonScope => {
    if (facts.granularity === "file") return "file";
    if (!entry.last) return "earlier change";
    const ownMessage = facts.alone && byId.get(passage.source)?.kind === "commit";
    return ownMessage || onTheLine(passage) ? "line" : "change";
  };
  const checks = narrative?.entailment?.checks ?? [];
  (narrative?.claims ?? []).forEach((claim, at) => {
    const mine = checks.filter((check) => check.claim === at);
    const status = mine[0]?.status ?? null;
    const quality = qualityOf(status);
    const cited = mine.length ? mine.map((check) => check.citation) : claim.citations;
    if (quality !== "stated by a cited source") {
      const specificity = specificityOf(plain, cited);
      reading.claims.push({
        claim: at,
        quality,
        specificity,
        state: stateOf(quality, specificity),
      });
      reading.unsustained.push({ claim: at, text: claim.text, quality });
      return;
    }
    const byChange = new Map<string, Passage[]>();
    for (const check of mine) {
      const source = byId.get(check.citation);
      const commit = source ? commitOf(source, byId) : null;
      if (!source || !commit || !check.quote) continue;
      const quote = check.quote;
      const comment = commentOf(source, quote);
      const parts = partsOf(source, quote);
      byChange.set(commit.id, [
        ...(byChange.get(commit.id) ?? []),
        {
          source: source.id,
          text: quote,
          ...(parts.length ? { parts } : {}),
          ...(comment
            ? {
                placement: placementOf(comment, file, line, oneLine(ev)),
                outdated: comment.outdated,
              }
            : {}),
        },
      ]);
    }
    const scoped: Scoped[] = [...byChange].flatMap(([commitId, passages]) => {
      const entry = changes.find((change) => change.id === commitId);
      return entry
        ? passages.map((passage) => ({ entry, passage, scope: scopeOf(entry, passage) }))
        : [];
    });
    const tied = scoped.filter((each) => each.scope === "line").map((each) => each.passage);
    const linked = specificityOf(plain, cited);
    const specificity: Specificity =
      facts.granularity === "file"
        ? linked
        : tied.some(onTheLine)
          ? "direct: a review comment on the line"
          : tied.length > 0
            ? "direct: the change is this block alone"
            : linked.startsWith("direct")
              ? "the change that last changed the line"
              : linked;
    reading.claims.push({ claim: at, quality, specificity, state: stateOf(quality, specificity) });
    const citedChanges = new Set(
      cited.flatMap((id) => {
        const source = byId.get(id);
        const commit = source ? commitOf(source, byId) : null;
        return commit ? [commit.id] : [];
      }),
    );
    const carrier = carrierOf(scoped, citedChanges);
    for (const { entry, passage, scope } of scoped) {
      const reason = entry.reasons.find((r) => r.claim === at && r.scope === scope);
      if (reason) reason.passages.push(passage);
      else
        entry.reasons.push({
          claim: at,
          scope,
          ...(carrier && carrier.entry === entry && carrier.scope === scope
            ? { standing: carrier.standing, sentence: claim.text }
            : {}),
          passages: [passage],
        });
    }
  });
  reading.explanation = explanationOf(changes);
  return reading;
}
