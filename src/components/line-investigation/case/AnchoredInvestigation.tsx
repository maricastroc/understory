"use client";

import type { ArtifactRef, DigResult } from "@understory/core/types";
import { useState } from "react";
import { toArtifactRef } from "../../format";
import { AnchorSpecimen } from "../answer/AnchorSpecimen";
import type { SpecimenSlot } from "../instrument/types";
import { useSpecimenLayout } from "../specimen/use-specimen-layout";
import { LineInvestigation } from "./LineInvestigation";

export function AnchoredInvestigation({
  result,
  pending,
  onDrill,
  parent,
}: {
  result: DigResult;
  pending: boolean;
  onDrill?: (ref: ArtifactRef) => void;
  parent?: { id: string; question?: string; onOpen?: () => void };
}) {
  const [now] = useState(() => Date.now());
  const layout = useSpecimenLayout();
  const ev = result.evidence;
  const anchor = ev.anchor!;
  const artifact = ev.artifacts.find((a) => a.id === anchor.id) ?? null;
  const canDrill = !!onDrill && (ev.repo.remoteUrl ?? "").includes("github.com");

  const renderSpecimen: SpecimenSlot = () => (
    <AnchorSpecimen anchor={anchor} artifact={artifact} collected={ev.artifacts.length} now={now} />
  );

  return (
    <LineInvestigation
      result={result}
      pending={pending}
      now={now}
      layout={layout}
      renderSpecimen={renderSpecimen}
      onDrill={canDrill ? (a) => onDrill?.(toArtifactRef(a.source)) : undefined}
      parent={parent}
    />
  );
}
