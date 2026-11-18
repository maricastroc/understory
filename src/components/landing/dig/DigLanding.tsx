"use client";

import { type CSSProperties, useMemo, useRef } from "react";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { formatDayMonth } from "@/i18n/format";
import { dayDate, displayId, tickText } from "../../line-investigation/copy/artifact-copy";
import { tallyText } from "../../line-investigation/copy/clause-copy";
import { gapChip } from "../../line-investigation/copy/gap-copy";
import type { ViewArtifact } from "../../line-investigation/model/types";
import { BlueprintCorners } from "../../line-investigation/parts/BlueprintCorners";
import {
  LANDING_NOW,
  landingLines,
  landingRejected,
  landingVersionsFor,
  landingViewFor,
} from "../demo/landing-fixture";
import { originText, refText } from "./dig-copy";
import { blameLine } from "./blame-line";
import { FADE, META, ON_BORE, POP, TRACE } from "./dig-classes";
import { DigReachedProvider, useReached } from "./dig-context";
import { digModel } from "./dig-model";
import { DigBar } from "./DigBar";
import { DigClause } from "./DigClause";
import { DigClosing } from "./DigClosing";
import { DigHead } from "./DigHead";
import { DigHero } from "./DigHero";
import { DigReading } from "./DigReading";
import { DigRecordBody } from "./DigRecordBody";
import { DigRow } from "./DigRow";
import { DigSection } from "./DigSection";
import { DigSilence } from "./DigSilence";
import { DigSurface } from "./DigSurface";
import { DigVersion } from "./DigVersion";
import type { DigRecord } from "./types";
import { useDigScroll } from "./use-dig-scroll";
import { Check } from "@/components/icons";

const FRAME =
  "overflow-x-clip [--bore-x:20px] [--code:clamp(10px,3vw,16px)] [--gutter:1rem] min-[641px]:[--gutter:1.5rem] xl:[--bore-x:calc(var(--code)_*_0.6_*_(var(--prefix)_+_var(--col)))] xl:[--code:19px]";

const SOIL =
  "pointer-events-none invisible absolute inset-0 z-10 bg-[linear-gradient(to_bottom,transparent,var(--color-li-paper)_7rem)]";

const clauseId = (artifactId: string) => `clause:${artifactId}`;

function Trace({ id, span, delay }: { id: string; span: string; delay: number }) {
  const on = useReached(id);
  return (
    <span
      aria-hidden
      className={`${TRACE} ${span} ${on ? "" : "scale-y-0"}`}
      style={{ transitionDelay: `${delay}ms` }}
    />
  );
}

function Thread({ first, last }: { first: boolean; last: boolean }) {
  const span = last ? "top-0 h-8 xl:h-3.5" : first ? "top-8 bottom-0 xl:top-3.5" : "inset-y-0";
  return (
    <>
      <span
        aria-hidden
        className={`absolute left-[calc(var(--bore-x)_+_0.55rem)] w-px bg-li-ink/45 xl:left-[calc(var(--bore-x)_-_0.8rem)] ${span}`}
      />
      <span
        aria-hidden
        className="absolute top-8 left-[var(--bore-x)] h-px w-[0.55rem] bg-li-ink/45 xl:top-3.5 xl:left-[calc(var(--bore-x)_-_0.8rem)] xl:w-[0.8rem]"
      />
    </>
  );
}

function Proven({ text, quote }: { text: string; quote: string | null }) {
  const at = quote ? text.indexOf(quote) : -1;
  if (!quote || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="bg-[linear-gradient(var(--color-li-evidence-quote),var(--color-li-evidence-quote))] bg-[length:100%_100%] bg-no-repeat transition-[background-size] duration-700 ease-out group-data-[reached=false]/row:bg-[length:0%_100%] motion-reduce:transition-none">
        {quote}
      </span>
      {text.slice(at + quote.length)}
    </>
  );
}

export function DigLanding() {
  const locale = useLocale();
  const t = useMessages();
  const d = t.landing.dig;
  const root = useRef<HTMLDivElement>(null);
  const progress = useDigScroll(root);

  const { model, blame, letters, anchors } = useMemo(() => {
    const view = landingViewFor(locale);
    const model = digModel(view, landingLines, landingVersionsFor(locale), LANDING_NOW);
    const records = [model.first, ...model.trail, model.proof];
    return {
      model,
      blame: blameLine(model),
      letters: new Map(view.artifacts.map((a) => [a.id, a.letter])),
      anchors: records.flatMap((r) => (r.clause ? [clauseId(r.artifact.id)] : [])),
    };
  }, [locale]);

  const depth = (a: ViewArtifact) =>
    `${a.daysBeforeNow === null ? "" : tickText(a.daysBeforeNow, locale)}|${dayDate(a.date, locale)}`;

  const date = (a: ViewArtifact) =>
    a.kind === "review" ? (
      formatDayMonth(t.time, a.date).dayMonth
    ) : (
      <>
        {dayDate(a.date, locale)}
        {a.daysBeforeNow !== null && (
          <>
            <span className="xl:hidden"> · </span>
            <span className="xl:block">{tickText(a.daysBeforeNow, locale)}</span>
          </>
        )}
      </>
    );

  const clause = (record: DigRecord, verified = false, className = "") =>
    record.clause && (
      <DigClause
        className={className}
        id={clauseId(record.artifact.id)}
        clause={record.clause}
        letters={letters}
        order={anchors.indexOf(clauseId(record.artifact.id)) + 1}
        total={anchors.length}
        verified={verified}
        tally={verified ? tallyText(record.clause, locale) : undefined}
      />
    );

  const first = model.first.artifact;
  const proof = model.proof.artifact;
  const origin = model.origin.artifact;
  const pull = model.trail.find((r) => r.artifact.kind === "pull_request")?.artifact ?? null;
  const traced = (a: ViewArtifact) => model.proof.clause?.citations.includes(a.id) ?? false;
  const threaded = model.trail
    .map((r) => r.artifact)
    .filter((a) => pull !== null && (a.id === pull.id || a.parentId === pull.id))
    .map((a) => a.id);

  const meta = (a: ViewArtifact) => {
    if (a.kind === "review" && pull) return `${t.artifact.relation.review} ${displayId(pull)}`;
    if (a.kind === "pull_request") return `${t.artifact.relation.pull_request} ${displayId(first)}`;
    return undefined;
  };

  const frame = { "--prefix": blame.width, "--col": model.column } as CSSProperties;

  return (
    <div className={FRAME} style={frame}>
      <DigSurface model={model} blame={blame} />
      <DigReachedProvider value={progress.live ? progress.reached : null}>
        <div ref={root} data-dig-after="06" className="relative overflow-y-clip">
          <DigBar model={model} progress={progress} anchors={anchors} />
          <DigHero model={model} blame={blame} />

          <div className="relative">
            <DigSection id="dig-02" chapter="02" labelledBy="dig-first">
              <DigHead id="dig-first" n="02" title={d.first.title} note={d.first.note} />
              <ol>
                <DigRow
                  id={first.id}
                  depth={depth(first)}
                  kind={first.kind}
                  date={date(first)}
                  node="top-[4.95rem] xl:top-[3.7rem]"
                  offset={64}
                  aside={clause(model.first, false, "xl:mt-[2.8rem]")}
                >
                  <div className="flex max-w-[37rem] flex-col gap-2">
                    <p className={META}>git blame · {t.landing.demo.line(model.line)}</p>
                    <div className="relative border border-li-divider bg-li-neutral-100 px-5 py-4">
                      <BlueprintCorners />
                      <DigRecordBody
                        record={model.first}
                        weight="lead"
                        meta={first.source.author?.name}
                      />
                      <p className="mt-4 flex flex-wrap gap-1.5 font-li-mono text-xs leading-5">
                        {[t.landing.hero.who, t.landing.hero.when, d.what].map((word, i) => (
                          <span
                            key={word}
                            className={`border border-li-evidence px-2 text-li-evidence-ink ${FADE}`}
                            style={{ transitionDelay: `${200 + i * 150}ms` }}
                          >
                            {word} <Check className="inline-block size-3 align-[-0.15em]" />
                          </span>
                        ))}
                        <span
                          className={`border border-dashed border-li-gap-ink px-2 text-li-gap-ink ${FADE}`}
                          style={{ transitionDelay: "800ms" }}
                        >
                          {t.landing.hero.why} ∅
                        </span>
                      </p>
                    </div>
                  </div>
                </DigRow>
              </ol>
            </DigSection>

            <DigSection id="dig-03" chapter="03" labelledBy="dig-trail">
              <DigHead id="dig-trail" n="03" title={d.trail.title} note={d.trail.note} />
              <ol>
                {model.trail.flatMap((record) => {
                  const a = record.artifact;
                  const weight = record.clause || a.kind === "pull_request" ? "plain" : "minor";
                  const lit = traced(a);
                  const at = threaded.indexOf(a.id);
                  return [
                    <DigRow
                      key={a.id}
                      id={a.id}
                      depth={depth(a)}
                      kind={a.kind}
                      date={date(a)}
                      aside={clause(record)}
                      lane={
                        <>
                          {at >= 0 && threaded.length > 1 && (
                            <Thread first={at === 0} last={at === threaded.length - 1} />
                          )}
                          {lit && (
                            <Trace id={proof.id} span="top-8 bottom-0 xl:top-3.5" delay={0} />
                          )}
                        </>
                      }
                    >
                      <DigRecordBody record={record} weight={weight} meta={meta(a)} />
                    </DigRow>,
                    ...(record.version
                      ? [
                          <DigVersion
                            key={`${a.id}-line`}
                            version={record.version}
                            token={model.token}
                            lane={lit && <Trace id={proof.id} span="inset-y-0" delay={150} />}
                          />,
                        ]
                      : []),
                  ];
                })}
              </ol>
            </DigSection>

            <DigSection id="dig-04" chapter="04" labelledBy="dig-proof">
              <DigHead
                id="dig-proof"
                n="04"
                title={d.proof.title}
                note={d.proof.note}
                lane={pull && <Trace id={proof.id} span="inset-y-0" delay={300} />}
              />
              <ol>
                <DigRow
                  id={proof.id}
                  depth={depth(proof)}
                  kind={proof.kind}
                  date={date(proof)}
                  aside={clause(model.proof, true)}
                  className="pb-3"
                  lane={pull && <Trace id={proof.id} span="top-0 h-8 xl:h-3.5" delay={450} />}
                >
                  <DigRecordBody record={model.proof} weight="lead">
                    {model.proof.excerpt && (
                      <div
                        data-dig-item
                        data-dig-offset="110"
                        className="group/row mt-1.5 flex max-w-[35rem] flex-col gap-3"
                      >
                        <p
                          lang="en"
                          className="border-l-2 border-li-evidence bg-li-neutral-100 px-5 py-4 text-[21px] leading-[1.45] text-pretty text-li-ink"
                        >
                          <Proven
                            text={model.proof.excerpt}
                            quote={model.proof.quote?.text ?? null}
                          />
                        </p>
                        <p
                          className={`text-[15px] font-semibold text-li-evidence-ink delay-500 ${FADE}`}
                        >
                          <Check className="mr-1 inline-block size-4 align-[-0.15em]" />
                          {t.landing.standard.quoteFound(refText(proof.id))}
                        </p>
                        <p className={`${META} delay-700 ${FADE}`}>
                          <span className="line-through">{refText(landingRejected[0])}</span> ·{" "}
                          {t.landing.standard.rejected}
                        </p>
                      </div>
                    )}
                  </DigRecordBody>
                </DigRow>
              </ol>
            </DigSection>

            <DigSilence model={model} question={t.landing.method.silence} />

            <DigSection chapter="05" label={displayId(origin)}>
              <ol className="pt-9">
                <DigRow id={origin.id} depth={depth(origin)} kind={origin.kind} date={date(origin)}>
                  <DigRecordBody
                    record={model.origin}
                    meta={origin.source.author?.name}
                    chip={
                      <span className="border border-dashed border-li-gap-ink px-1.5 font-li-mono text-xs leading-5 text-li-gap-ink">
                        {gapChip(model.gap, locale)}
                      </span>
                    }
                  />
                </DigRow>
                {model.origin.version && (
                  <DigVersion version={model.origin.version} token={model.token} />
                )}
              </ol>
              <div data-dig-item data-dig-offset="46" className="group/row relative h-16">
                <span className={`${ON_BORE} bottom-0`}>
                  <span className={`block size-4.5 rounded-full bg-li-ink ${POP}`} />
                </span>
                <p
                  className={`${META} absolute bottom-0 left-[calc(var(--bore-x)_+_1.5rem)] delay-200 max-xl:right-0 ${FADE}`}
                >
                  {originText(model.line, origin.daysBeforeNow, locale)}
                </p>
              </div>
            </DigSection>

            <div className="h-8" />
            <DigReading model={model} letters={letters} />

            <div data-dig-soil aria-hidden className={SOIL} />
          </div>
        </div>
      </DigReachedProvider>

      <DigClosing />
    </div>
  );
}
