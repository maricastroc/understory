"use client";

import type { ArtifactRef, DigResult } from "@understory/core/types";
import { type ReactNode, useState } from "react";
import { toArtifactRef } from "../../format";
import type { SpecimenSlot } from "../instrument/types";
import { LiveCodeSpecimen } from "../specimen/LiveCodeSpecimen";
import { useSpecimenLayout } from "../specimen/use-specimen-layout";
import { LineInvestigation } from "./LineInvestigation";
import type { AnalysisLanguage, CasePhase } from "./types";

export function LiveLineInvestigation({
  result,
  repoPath,
  pending,
  analysis,
  token,
  onDrill,
  onFollowUp,
  onBackToQuestion,
  parent,
  phase,
  failure,
}: {
  result: DigResult;
  repoPath: string;
  pending: boolean;
  analysis?: AnalysisLanguage;
  token?: string;
  onDrill?: (ref: ArtifactRef) => void;
  onFollowUp?: () => void;
  onBackToQuestion?: () => void;
  parent?: { id: string; question?: string; onOpen?: () => void };
  phase?: CasePhase;
  failure?: ReactNode;
}) {
  const [now] = useState(() => Date.now());
  const layout = useSpecimenLayout();
  const ev = result.evidence;
  const loc = ev.location!;
  const canDrill = !!onDrill && (ev.repo.remoteUrl ?? "").includes("github.com");

  const renderSpecimen: SpecimenSlot = (slot) => (
    <LiveCodeSpecimen
      repo={repoPath}
      path={loc.file}
      sha={ev.repo.sha ?? null}
      datum={{ start: loc.startLine, end: loc.endLine }}
      question={ev.question}
      now={now}
      token={token}
      awaitingSha={phase === "collecting"}
      {...slot}
    />
  );

  return (
    <LineInvestigation
      result={result}
      pending={pending}
      analysis={analysis}
      now={now}
      layout={layout}
      renderSpecimen={renderSpecimen}
      onDrill={canDrill ? (a) => onDrill?.(toArtifactRef(a.source)) : undefined}
      onFollowUp={onFollowUp}
      onBackToQuestion={onBackToQuestion}
      parent={parent}
      phase={phase}
      failure={failure}
    />
  );
}
