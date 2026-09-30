import type { ArtifactKind } from "@understory/core/types";

export type CaseSubject =
  | { kind: "line"; label: string }
  | {
      kind: "anchor";
      label: string;
      id: string;
      artifact: ArtifactKind;
      noun: string;
      ref: string;
    };
