import type { BlameSpan } from "@understory/core/types";
import { SPECIMEN } from "./specimen-metrics";
import type { BlameBarModel, BlameTone, LineRange } from "./types";

const DAY = 86_400_000;

export function blameBars(
  spans: BlameSpan[] | null,
  lines: string[],
  visible: LineRange,
  datum: LineRange,
  now: number,
): Map<number, BlameBarModel> {
  const out = new Map<number, BlameBarModel>();
  if (!spans || spans.length === 0) return out;

  const ownerOf = (line: number) => spans.find((s) => s.startLine <= line && line <= s.endLine);
  let datumOwner: BlameSpan | null = null;
  for (let line = datum.start; line <= datum.end; line++) {
    const s = ownerOf(line);
    if (s && (!datumOwner || Date.parse(s.date) > Date.parse(datumOwner.date))) datumOwner = s;
  }

  const rows: Array<Omit<BlameBarModel, "width">> = [];
  for (let line = visible.start; line <= visible.end; line++) {
    if (!(lines[line - 1] ?? "").trim()) continue;
    const span = ownerOf(line);
    const at = span ? Date.parse(span.date) : NaN;
    if (!span || Number.isNaN(at)) continue;
    const inDatum = line >= datum.start && line <= datum.end;
    const tone: BlameTone = inDatum
      ? "datum"
      : span.sha === datumOwner?.sha
        ? "same-commit"
        : "neutral";
    rows.push({
      line,
      sha: span.sha,
      shortSha: span.shortSha,
      author: span.author ?? null,
      ageDays: Math.max(0, (now - at) / DAY),
      tone,
    });
  }

  const oldest = Math.max(0, ...rows.map((r) => r.ageDays));
  for (const r of rows) {
    const width =
      oldest > 0
        ? Math.max(SPECIMEN.barMin, Math.round((SPECIMEN.barMax * r.ageDays) / oldest))
        : SPECIMEN.barMax;
    out.set(r.line, { ...r, width });
  }
  return out;
}
