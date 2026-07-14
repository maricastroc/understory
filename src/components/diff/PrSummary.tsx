"use client";

import type { DiffResult } from "@git-investigator/core/diff/types";
import type { Artifact } from "@git-investigator/core/types";
import { Claims } from "../findings/Claims";
import { EntailmentQuotes } from "../findings/EntailmentQuotes";
import { SourcesUsed } from "../findings/SourcesUsed";
import { UncitedClaimsAlert } from "../findings/UncitedClaimsAlert";
import { CopyButton } from "../CopyButton";
import { letter } from "../format";
import { Clock } from "../icons";
import { useLanguage } from "../use-language";
import { SectionLabel } from "../ui";

export function PrSummary({ result }: { result: DiffResult }) {
  const { language } = useLanguage();
  const claims = result.summaryClaims ?? [];

  if (claims.length === 0) {
    if (!result.summary) return null;
    return (
      <section>
        <div className="flex items-start justify-between gap-3">
          <SectionLabel title="Why the changed code exists" meta="narrative overview" />
          <CopyButton text={result.summary} label="Copy the why" />
        </div>
        <div className="flex items-start gap-3 rounded-[10px] border border-accent/25 bg-accent-tint/50 p-5 shadow-card">
          <Clock className="mt-0.5 size-5 shrink-0 text-accent-press" />
          <p lang={language} className="max-w-[72ch] text-[15px] leading-relaxed text-ink-body">
            {result.summary}
          </p>
        </div>
      </section>
    );
  }

  const byId = new Map<string, Artifact>();
  for (const f of result.findings) for (const a of f.artifacts) byId.set(a.id, a);

  const resolved = Array.from(new Set(claims.flatMap((c) => c.citations))).filter((id) =>
    byId.has(id),
  );
  const idToLetter = new Map(resolved.map((id, i) => [id, letter(i)]));

  const checks = result.summaryEntailment?.checked ? result.summaryEntailment.checks : [];
  const statusById = new Map(checks.map((c) => [c.citation, c.status]));
  const ungrounded = claims.filter((c) => !c.grounded).length;

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <SectionLabel
          title="Why the changed code exists"
          meta="executive history — each sentence traced to a cited, verified source"
        />
        <CopyButton text={claims.map((c) => c.text).join(" ")} label="Copy the why" />
      </div>
      <div className="rounded-[10px] border border-accent/25 bg-accent-tint/50 p-5 shadow-card">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 size-5 shrink-0 text-accent-press" />
          <Claims claims={claims} idToLetter={idToLetter} />
        </div>
        <UncitedClaimsAlert count={ungrounded} />
        <SourcesUsed resolved={resolved} byId={byId} statusById={statusById} />
        <EntailmentQuotes checks={checks} byId={byId} idToLetter={idToLetter} />
      </div>
    </section>
  );
}
