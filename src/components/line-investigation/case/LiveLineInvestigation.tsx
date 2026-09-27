"use client";

import type { ArtifactRef, DigResult } from "@git-investigator/core/types";
import { useState } from "react";
import { toArtifactRef } from "../../format";
import type { SpecimenSlot } from "../instrument/types";
import { LiveCodeSpecimen } from "../specimen/LiveCodeSpecimen";
import { useSpecimenLayout } from "../specimen/use-specimen-layout";
import { LineInvestigation } from "./LineInvestigation";

export function LiveLineInvestigation({
  result,
  repoPath,
  pending,
  token,
  onDrill,
  onFollowUp,
}: {
  result: DigResult;
  repoPath: string;
  pending: boolean;
  token?: string;
  onDrill?: (ref: ArtifactRef) => void;
  onFollowUp?: () => void;
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
      {...slot}
    />
  );

  return (
    <LineInvestigation
      result={result}
      pending={pending}
      now={now}
      layout={layout}
      renderSpecimen={renderSpecimen}
      onDrill={canDrill ? (a) => onDrill?.(toArtifactRef(a.source)) : undefined}
      onFollowUp={onFollowUp}
    />
  );
}
