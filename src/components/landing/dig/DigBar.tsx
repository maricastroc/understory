"use client";

import { useMessages } from "@/i18n/LocaleProvider";
import { DIG_HATCH } from "./dig-hatch";
import { CONTAINER } from "../parts/landing-classes";
import { TOKEN } from "./dig-classes";
import { CodeLine } from "./DigSurface";
import type { DigModel, DigProgress } from "./types";

const CHAPTERS = ["01", "02", "03", "04", "05", "06"];

const TAB = "flex h-5 min-w-6 items-center justify-center border px-1 text-[11px] leading-none";
const TAB_ON = "border-li-ink bg-li-ink text-li-paper";
const TAB_PAST =
  "border-li-ink text-li-ink transition-colors group-hover/tab:bg-li-neutral-300 motion-reduce:transition-none";
const TAB_AHEAD =
  "border-li-neutral-400 text-li-neutral-700 transition-colors group-hover/tab:border-li-ink group-hover/tab:text-li-ink motion-reduce:transition-none";

export function DigBar({
  model,
  progress,
  anchors,
}: {
  model: DigModel;
  progress: DigProgress;
  anchors: string[];
}) {
  const t = useMessages().landing;
  const on = progress.under;
  const chapter = progress.chapter ?? CHAPTERS[0];
  const at = CHAPTERS.indexOf(chapter);
  const [tick, day] = (progress.depth ?? "±0|").split("|");
  const done = anchors.filter((id) => progress.reached.has(id)).length;
  const open = progress.reached.has("silence");
  const file = model.path.split("/").at(-1);
  const token = model.token;
  return (
    <div className="sticky top-0 z-20 h-0">
      <div
        inert={!on}
        className={`absolute inset-x-0 top-0 border-b border-li-divider bg-li-paper transition-[translate,opacity] duration-200 motion-reduce:transition-none ${
          on ? "" : "-translate-y-full opacity-0"
        }`}
      >
        <div className={CONTAINER}>
          <div className="relative flex h-11 items-center gap-3 font-li-mono text-xs text-li-neutral-700">
            <span className="max-xl:hidden">
              {file} : {model.line}
            </span>
            <nav
              aria-label={t.dig.chapters}
              className="flex items-center max-sm:hidden xl:absolute xl:left-[8.5rem]"
            >
              {CHAPTERS.map((n, i) => (
                <a
                  key={n}
                  href={`#dig-${n}`}
                  aria-label={`${t.dig.chapter(n)}, ${t.dig.names[i]}`}
                  aria-current={i === at ? "step" : undefined}
                  className="group/tab flex h-11 items-center gap-1.5 px-0.5 no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-li-focus"
                >
                  <span className={`${TAB} ${i === at ? TAB_ON : i < at ? TAB_PAST : TAB_AHEAD}`}>
                    {n}
                  </span>
                  {i === at && (
                    <span className="pr-1.5 whitespace-nowrap text-li-ink">{t.dig.names[i]}</span>
                  )}
                </a>
              ))}
            </nav>
            <span className="flex items-center gap-1.5 sm:hidden">
              <span className={`${TAB} ${TAB_ON}`}>{chapter}</span>/{CHAPTERS.at(-1)}
            </span>
            <span
              lang="en"
              className="absolute left-[calc(var(--bore-x)_-_var(--col)_*_1ch)] text-sm whitespace-pre text-li-ink max-xl:hidden"
            >
              <CodeLine model={model} />
            </span>
            <span lang="en" className="text-[13px] whitespace-pre text-li-ink xl:hidden">
              {token ? (
                <>
                  {model.code.slice(Math.max(0, token.start - 10), token.start)}
                  <span className={TOKEN}>{model.code.slice(token.start, token.end)}</span>
                  {model.code.slice(token.end, token.end + 1)}
                </>
              ) : (
                model.code.slice(0, 14)
              )}
            </span>
            <span
              className={`ml-auto flex items-center gap-2.5 ${progress.silent ? "text-li-gap-ink" : ""}`}
            >
              {progress.silent && (
                <span
                  aria-hidden
                  className="h-2.5 w-5 border border-dashed border-li-gap"
                  style={{ backgroundImage: DIG_HATCH }}
                />
              )}
              <span>
                {tick && <span className={day ? "max-xl:hidden" : ""}>{tick}</span>}
                {tick && day && <span className="max-xl:hidden"> · </span>}
                {day}
                {progress.silent && <span className="sr-only"> · {t.demo.notRecorded}</span>}
              </span>
              <span aria-hidden className="flex gap-1">
                {anchors.map((id) => (
                  <span
                    key={id}
                    className={`size-2 rounded-full ${
                      progress.reached.has(id) ? "bg-li-ink" : "border border-li-neutral-600"
                    }`}
                  />
                ))}
                {open && (
                  <span className="size-2 rounded-full border border-dashed border-li-gap-ink" />
                )}
              </span>
              <span className="sr-only">
                {t.dig.progress(done, anchors.length)}
                {open && ` · ${t.dig.open(1)}`}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
