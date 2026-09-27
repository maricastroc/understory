"use client";

import { useState } from "react";
import {
  SYNTHETIC_FILE_PATH,
  syntheticChargeBlame,
  syntheticChargeLines,
} from "@/components/line-investigation/fixtures/synthetic-charge-file";
import { SYNTHETIC_NOW } from "@/components/line-investigation/fixtures/synthetic-retry-cap";
import { lineInvestigationFonts } from "@/components/line-investigation/fonts";
import { CodeSpecimen } from "@/components/line-investigation/specimen/CodeSpecimen";
import { LiveCodeSpecimen } from "@/components/line-investigation/specimen/LiveCodeSpecimen";
import type {
  BlameStatus,
  LineRange,
  SpecimenLayout,
} from "@/components/line-investigation/specimen/types";
import {
  SPECIMEN_LAYOUTS,
  useSpecimenLayout,
} from "@/components/line-investigation/specimen/use-specimen-layout";

const LONG_LINE =
  "      return await stripe.charges.create(req, { idempotencyKey: `charge:${req.id}:${req.customerId}:${req.amount}` });";

type Variant = {
  lines: string[];
  datum: LineRange;
  question: string;
  blameStatus: BlameStatus;
  expanded: boolean;
};

function variantFor(state: string): Variant {
  const base: Variant = {
    lines: syntheticChargeLines,
    datum: { start: 9, end: 9 },
    question: "Why exactly 3 retries?",
    blameStatus: "ready",
    expanded: false,
  };
  if (state === "expanded") return { ...base, expanded: true };
  if (state === "unpinned") return { ...base, blameStatus: "unpinned" };
  if (state === "unavailable") return { ...base, blameStatus: "unavailable" };
  if (state === "loading") return { ...base, blameStatus: "loading" };
  if (state === "no-literal") return { ...base, question: "Why is this line the way it is?" };
  if (state === "range") return { ...base, datum: { start: 9, end: 11 } };
  if (state === "long-line") {
    return { ...base, lines: syntheticChargeLines.map((l, i) => (i === 10 ? LONG_LINE : l)) };
  }
  return base;
}

function layoutFor(key: string | null, responsive: SpecimenLayout): SpecimenLayout {
  if (key && key in SPECIMEN_LAYOUTS) return SPECIMEN_LAYOUTS[key as keyof typeof SPECIMEN_LAYOUTS];
  return responsive;
}

export function SpecimenPreview({
  state,
  layout,
  demo,
}: {
  state: string;
  layout: string | null;
  demo: { repo: string; sha: string | null } | null;
}) {
  const responsive = useSpecimenLayout();
  const active = layoutFor(layout, responsive);
  const variant = variantFor(state);
  const [expanded, setExpanded] = useState(variant.expanded);
  const [datumY, setDatumY] = useState<number | null>(null);
  const [now] = useState(() => (demo ? Date.now() : Date.parse(SYNTHETIC_NOW)));
  const toggle = () => setExpanded((v) => !v);
  const ruleLeft = active.mode === "panel" ? (active.width === "wide" ? 460 : 420) : 0;

  return (
    <main
      className={`${lineInvestigationFonts} min-h-screen bg-li-paper px-8 py-6 font-li-body text-li-ink max-[820px]:px-4`}
    >
      <p className="mb-4 font-li-mono text-[11px] leading-4 text-li-text-muted">
        dev preview · CodeSpecimen · {demo ? `live ${demo.repo}` : "synthetic fixture"} · {state} ·{" "}
        {active.mode}/{active.width}
      </p>
      <div data-testid="instrument" className="relative w-full max-w-280">
        {demo ? (
          <LiveCodeSpecimen
            repo={demo.repo}
            path="src/billing/charge.ts"
            sha={demo.sha}
            datum={{ start: 8, end: 8 }}
            question="Why exactly 3 retries?"
            now={now}
            expanded={expanded}
            onToggleExpanded={toggle}
            layout={active}
            onDatumY={setDatumY}
          />
        ) : (
          <CodeSpecimen
            path={SYNTHETIC_FILE_PATH}
            lines={variant.lines}
            datum={variant.datum}
            question={variant.question}
            blame={variant.blameStatus === "unpinned" ? null : syntheticChargeBlame}
            blameStatus={variant.blameStatus}
            now={now}
            layout={active}
            expanded={expanded}
            onToggleExpanded={toggle}
            onDatumY={setDatumY}
          />
        )}
        {datumY !== null && (
          <div
            aria-hidden
            data-testid="preview-datum-rule"
            className="absolute right-0 h-0.5 bg-li-datum"
            style={{ top: datumY - 1, left: ruleLeft }}
          />
        )}
      </div>
    </main>
  );
}
