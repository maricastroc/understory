import type { CSSProperties } from "react";
import { shortAge } from "../../../line-investigation/format/age";
import type { LineRange } from "../../../line-investigation/specimen/types";
import { pastValue } from "./past-value";
import { StrataCode } from "./StrataCode";
import { unchangedText } from "./strata-copy";
import { STRATA_COLUMNS } from "./strata-metrics";
import type { ClauseSlot, StrataLayout, StrataMetrics, StrataTrace, Stratum } from "./types";

const DATUM = 3;

function Node({ s, at, lit, wide }: { s: Stratum; at: string; lit: boolean; wide: boolean }) {
  const fill = lit ? "bg-strata-trace" : "bg-strata-ground";
  const place: CSSProperties = { left: at, top: s.node };
  if (s.artifact.kind === "commit") {
    return (
      <span
        className={`absolute -translate-1/2 rounded-full border-strata-ink ${fill} ${
          wide ? "size-3.5 border-2" : "size-2.75 border-[1.5px]"
        }`}
        style={place}
      />
    );
  }
  if (s.artifact.kind === "issue") {
    return (
      <span
        className={`absolute -translate-1/2 rotate-45 border-[1.5px] border-strata-ink ${fill} ${
          wide ? "size-4" : "size-3"
        }`}
        style={place}
      />
    );
  }
  return (
    <span
      className={`absolute h-[1.5px] w-3 -translate-1/2 ${lit ? "bg-strata-trace" : "bg-strata-ink"}`}
      style={place}
    />
  );
}

function BreakMarks({ at, y }: { at: string; y: number }) {
  return (
    <>
      <span
        className="absolute h-3 w-3.5 -translate-1/2 bg-strata-ground"
        style={{ left: at, top: y }}
      />
      {[-3.5, 3.5].map((d) => (
        <span
          key={d}
          className="absolute h-[1.5px] w-4.5 -translate-1/2 -rotate-[28deg] bg-strata-bore"
          style={{ left: at, top: y + d }}
        />
      ))}
    </>
  );
}

export function StrataBore({
  layout,
  m,
  col,
  token,
  lit,
  trace,
  slots,
  clause,
}: {
  layout: StrataLayout;
  m: StrataMetrics;
  col: number;
  token: LineRange | null;
  lit: ReadonlySet<string> | null;
  trace: StrataTrace | null;
  slots: ClauseSlot[];
  clause: string | null;
}) {
  const wide = m.mode === "wide";
  const w = wide ? 3 : 2;
  const x = (dx = 0) => `calc(${m.codeX + dx}px + ${col}ch)`;
  const bore = x();
  const label = wide ? "text-xs" : "text-[11px]";

  const segments: Array<{ top: number; bottom: number; dashed: boolean }> = [];
  let cursor = m.datumY + DATUM;
  for (const b of layout.breaks.filter((b) => b.kind === "silent")) {
    segments.push({ top: cursor, bottom: b.top, dashed: false });
    segments.push({ top: b.top, bottom: b.bottom, dashed: true });
    cursor = b.bottom;
  }
  segments.push({ top: cursor, bottom: layout.origin, dashed: false });

  const traceX = wide ? 12 : 9;
  const width = (from: number, to: string) => `calc(${to} - ${x(from)})`;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 font-li-mono"
      style={{ fontSize: m.code.font, lineHeight: `${m.code.line}px` }}
    >
      {layout.strata.flatMap((s) => {
        if (!s.version || s.versionY === null) return [];
        const mark = token ? pastValue(s.version.text, token) : null;
        return [
          <span
            key={`v-${s.artifact.id}`}
            className={`absolute whitespace-pre ${wide ? "text-strata-neutral-600" : "text-strata-neutral-700"}`}
            style={{ top: s.versionY, left: m.codeX }}
          >
            <StrataCode
              segments={[{ text: s.version.text, kind: "plain" }]}
              mark={mark}
              tone="past"
            />
          </span>,
          ...(!mark && token
            ? [
                <span
                  key={`a-${s.artifact.id}`}
                  className="absolute box-border border-[1.5px] border-dashed border-strata-bore"
                  style={{
                    top: s.versionY,
                    height: m.code.line,
                    left: `calc(${m.codeX}px + ${token.start}ch)`,
                    width: `${Math.max(1, token.end - token.start)}ch`,
                  }}
                />,
              ]
            : []),
        ];
      })}

      {segments.map((seg) =>
        seg.dashed ? (
          <span
            key={seg.top}
            className="absolute border-l-strata-bore"
            style={{
              left: bore,
              top: seg.top,
              height: seg.bottom - seg.top,
              borderLeftWidth: w,
              borderLeftStyle: "dashed",
              marginLeft: -w / 2,
            }}
          />
        ) : (
          <span
            key={seg.top}
            className="absolute bg-strata-bore"
            style={{
              left: bore,
              top: seg.top,
              height: seg.bottom - seg.top,
              width: w,
              marginLeft: -w / 2,
            }}
          />
        ),
      )}

      {layout.breaks.map((b) => {
        const mid = (b.top + b.bottom) / 2;
        return (
          <span key={b.top}>
            {b.kind === "unchanged" && <BreakMarks at={bore} y={mid} />}
            <span className="absolute" style={{ left: x(10), top: mid }}>
              <span
                className={`block -translate-y-1/2 bg-strata-ground px-1.5 leading-4.5 whitespace-nowrap text-strata-neutral-700 ${label}`}
              >
                {b.kind === "silent"
                  ? `${shortAge(b.days)} · record silent`
                  : unchangedText(b.days)}
              </span>
            </span>
          </span>
        );
      })}

      {wide &&
        slots.map((slot) => {
          const on = slot.id === clause;
          const tone = on ? "bg-strata-trace" : "bg-strata-neutral-400";
          const h = on ? 1.5 : 1;
          const elbow = `${STRATA_COLUMNS.clause - 20}px`;
          const bent = Math.abs(slot.y - slot.anchor) > 0.5;
          return (
            <span key={slot.id}>
              <span
                className={`absolute ${tone}`}
                style={{
                  left: x(9),
                  top: slot.anchor - h / 2,
                  height: h,
                  width: width(9, bent ? elbow : `${STRATA_COLUMNS.clause}px`),
                }}
              />
              {bent && (
                <>
                  <span
                    className={`absolute ${tone}`}
                    style={{
                      left: elbow,
                      top: Math.min(slot.y, slot.anchor),
                      width: h,
                      height: Math.abs(slot.y - slot.anchor),
                    }}
                  />
                  <span
                    className={`absolute ${tone}`}
                    style={{ left: elbow, top: slot.y - h / 2, height: h, width: 20 }}
                  />
                </>
              )}
            </span>
          );
        })}

      {trace && (
        <>
          {trace.bottom > trace.top && (
            <span
              className="absolute w-[1.5px] bg-strata-trace"
              style={{ left: x(traceX), top: trace.top, height: trace.bottom - trace.top }}
            />
          )}
          {[trace.anchor, ...trace.stubs].map((y) => (
            <span
              key={y}
              className="absolute h-[1.5px] bg-strata-trace"
              style={{ left: x(w / 2), top: y - 0.75, width: traceX - w / 2 + 1.5 }}
            />
          ))}
        </>
      )}

      {layout.strata.map((s) => (
        <Node key={s.artifact.id} s={s} at={bore} lit={!!lit?.has(s.artifact.id)} wide={wide} />
      ))}

      <span
        className={`absolute -translate-1/2 rotate-45 bg-strata-bore ${wide ? "size-3.5" : "size-2.5"}`}
        style={{ left: bore, top: layout.origin }}
      />
      {layout.strata.flatMap((s) =>
        s.version?.absent && s.versionY !== null && !(token && pastValue(s.version.text, token))
          ? [
              <span
                key={`n-${s.artifact.id}`}
                className="absolute"
                style={{ left: bore, top: s.versionY + m.code.line + m.tail + (wide ? 12 : 8) }}
              >
                <span className="block -translate-x-1/2 text-[11px] leading-4 whitespace-nowrap text-strata-neutral-700">
                  {s.version.absent}
                </span>
              </span>,
            ]
          : [],
      )}
    </div>
  );
}
