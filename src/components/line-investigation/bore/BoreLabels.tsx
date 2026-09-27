import { artifactName, gapName } from "../copy/accessible-name";
import { dateLine, displayId, kindName, labelTitle, tickText } from "../copy/artifact-copy";
import { gapLabel, gapLetter, gapTitle } from "../copy/gap-copy";
import { longAge, shortAge } from "../format/age";
import { BORE } from "../layout/geometry";
import type { BoreLayout } from "../layout/types";
import type { ViewArtifact, ViewClause, ViewGap } from "../model/types";
import { EvidenceLetter } from "../parts/EvidenceLetter";
import type { LetterVariant } from "../parts/letter-variant";

type LabelItem =
  | { key: string; top: number; type: "artifact"; artifact: ViewArtifact }
  | { key: string; top: number; type: "group"; members: ViewArtifact[] }
  | { key: string; top: number; type: "gap"; gap: ViewGap; after: ViewArtifact }
  | { key: string; top: number; type: "break"; first: boolean; days: number };

function surface(selected: boolean, hovered: boolean): string {
  if (selected) return "bg-li-steel-100";
  if (hovered) return "bg-li-neutral-200";
  return "";
}

export function BoreLabels({
  layout,
  byId,
  gaps,
  clauses,
  active,
  revealed,
  hovered,
  inspected,
  shift,
  width,
  onHover,
  onInspect,
  onToggleGroup,
}: {
  layout: BoreLayout;
  byId: Map<string, ViewArtifact>;
  gaps: Map<string, ViewGap>;
  clauses: ViewClause[];
  active: Set<string> | null;
  revealed: Set<string>;
  hovered: string | null;
  inspected: string | null;
  shift: number;
  width: number | null;
  onHover: (id: string | null) => void;
  onInspect: (id: string) => void;
  onToggleGroup: (id: string) => void;
}) {
  const glyphById = new Map(layout.glyphs.map((g) => [g.id, g]));
  const items: LabelItem[] = [];
  for (const label of layout.labels) {
    const glyph = glyphById.get(label.id);
    if (glyph && glyph.members.length > 1) {
      const members = glyph.members.map((m) => byId.get(m)).filter((a): a is ViewArtifact => !!a);
      items.push({ key: label.id, top: label.top, type: "group", members });
      continue;
    }
    const artifact = byId.get(label.id);
    if (artifact) {
      items.push({ key: label.id, top: label.top, type: "artifact", artifact });
      continue;
    }
    const gap = gaps.get(label.id);
    const after = gap ? byId.get(gap.afterId) : undefined;
    if (gap && after) items.push({ key: label.id, top: label.top, type: "gap", gap, after });
  }
  layout.breaks.forEach((b, i) =>
    items.push({
      key: `break-${i}`,
      top: b.top + 0.5,
      type: "break",
      first: b.kind === "first",
      days: b.days,
    }),
  );
  items.sort((a, b) => a.top - b.top);

  const left = BORE.labelX + shift;
  const coreX = BORE.coreX + shift;
  const labelStyle = (top: number) => ({
    top,
    left,
    width: width ?? undefined,
    right: width ? undefined : 0,
  });

  const letterVariant = (a: ViewArtifact, dim: boolean): LetterVariant =>
    dim ? "dimmed" : a.role === "cited" ? "cited" : "supporting";

  return (
    <>
      <ol aria-label="History, newest first" className="pointer-events-none absolute inset-0">
        {items.map((item) => {
          if (item.type === "break") {
            const text = item.first
              ? `unchanged for ${shortAge(item.days)}`
              : `${shortAge(item.days)} gap`;
            return (
              <li
                key={item.key}
                className={`absolute font-li-mono text-li-text-subtle ${
                  item.first ? "text-[11px]" : "w-8 text-right text-[9.5px] leading-[1.2]"
                }`}
                style={
                  item.first
                    ? { top: item.top + 21, left: coreX + 16 }
                    : { top: item.top + 2, left: coreX - 44 }
                }
              >
                <span className="sr-only">
                  {item.first ? `${longAge(item.days)} unchanged` : `${longAge(item.days)} gap`}
                </span>
                <span aria-hidden>
                  {item.first ? (
                    text
                  ) : (
                    <>
                      {shortAge(item.days)}
                      <br />
                      gap
                    </>
                  )}
                </span>
              </li>
            );
          }

          if (item.type === "gap") {
            const { gap, after } = item;
            const selected = inspected === gap.id;
            const show = revealed.has(gap.id) || hovered === gap.id || selected;
            const dim = active !== null && !active.has(gap.afterId);
            return (
              <li
                key={item.key}
                className="pointer-events-auto absolute"
                style={labelStyle(item.top)}
              >
                <button
                  type="button"
                  aria-label={gapName(gap, after)}
                  onMouseEnter={() => onHover(gap.id)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(gap.id)}
                  onBlur={() => onHover(null)}
                  onClick={() => onInspect(gap.id)}
                  className={`grid w-full cursor-pointer grid-cols-[20px_minmax(0,1fr)] gap-2 rounded-[3px] py-0.5 pr-1.5 pl-0.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel motion-reduce:transition-none ${surface(selected, hovered === gap.id)}`}
                >
                  <EvidenceLetter
                    letter={gapLetter(gap)}
                    variant={dim ? "dimmed" : gap.verified ? "gap" : "unverified"}
                  />
                  <span className="pointer-events-none flex flex-col gap-0.5">
                    <span
                      className={`font-li-mono text-[11px] leading-4 ${gap.verified && !dim ? "text-li-gap-ink" : "text-li-text-muted"}`}
                    >
                      {gapLabel(gap)}
                    </span>
                    {show && (
                      <span
                        className={`text-[13.5px] leading-[1.35] ${gap.verified ? "text-li-gap-ink" : "text-li-text-subtle"}`}
                      >
                        {gapTitle(gap)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          }

          if (item.type === "group") {
            const first = item.members[0];
            const last = item.members[item.members.length - 1];
            const dim = active !== null && !item.members.some((m) => active.has(m.id));
            return (
              <li
                key={item.key}
                className="pointer-events-auto absolute"
                style={labelStyle(item.top)}
              >
                <button
                  type="button"
                  aria-expanded={false}
                  aria-label={`${item.members.length} ${kindName(first.kind)}s, ${first.letter} to ${last.letter}, collapsed. Show them.`}
                  onClick={() => onToggleGroup(item.key)}
                  className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-[3px] py-0.5 pr-1.5 pl-0.5 text-left hover:bg-li-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel"
                >
                  <EvidenceLetter
                    letter={`×${item.members.length}`}
                    variant={dim ? "dimmed" : "supporting"}
                  />
                  <span className={`font-li-mono text-[11px] ${dim ? "text-li-text-muted" : ""}`}>
                    {first.letter}–{last.letter} · {item.members.length} {kindName(first.kind)}s
                  </span>
                </button>
              </li>
            );
          }

          const a = item.artifact;
          const selected = inspected === a.id;
          const isHovered = hovered === a.id;
          const show = revealed.has(a.id) || isHovered || selected;
          const dim = active !== null && !active.has(a.id);
          return (
            <li
              key={item.key}
              className="pointer-events-auto absolute"
              style={labelStyle(item.top)}
            >
              <button
                type="button"
                aria-label={artifactName(a, clauses)}
                onMouseEnter={() => onHover(a.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(a.id)}
                onBlur={() => onHover(null)}
                onClick={() => onInspect(a.id)}
                className={`grid w-full cursor-pointer grid-cols-[20px_minmax(0,1fr)] gap-2 rounded-[3px] py-0.5 pr-1.5 pl-0.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-steel motion-reduce:transition-none ${surface(selected, isHovered)}`}
              >
                <EvidenceLetter letter={a.letter} variant={letterVariant(a, dim)} />
                <span className="pointer-events-none flex min-w-0 flex-col gap-0.5">
                  <span className="flex gap-2 font-li-mono text-[11px] leading-4">
                    <span className={`font-medium ${dim ? "text-li-text-muted" : "text-li-ink"}`}>
                      {displayId(a)}
                    </span>
                    {show && <span className="text-li-text-subtle">{dateLine(a)}</span>}
                  </span>
                  {show && (
                    <span
                      className={`line-clamp-2 text-[13.5px] leading-[1.35] ${
                        a.role === "cited" ? "text-li-ink" : "text-li-neutral-800"
                      }`}
                    >
                      {labelTitle(a)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {layout.ticks.map((t) => (
        <span
          key={`tick-${t.cluster}`}
          aria-hidden
          className="pointer-events-none absolute w-7 text-right font-li-mono text-[9.5px] text-li-text-subtle"
          style={{ top: t.y - 6, left: coreX - 38 }}
        >
          {tickText(t.days)}
        </span>
      ))}
    </>
  );
}
