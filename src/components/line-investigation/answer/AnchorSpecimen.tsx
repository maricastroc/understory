"use client";

import type { Artifact, ArtifactRef } from "@understory/core/types";
import { useState } from "react";
import { dayDate, kindName, tickText } from "../copy/artifact-copy";
import { withoutTitle } from "../drawer/drawer-body";
import { sourceLinkLabel } from "../drawer/source-link";

const DAY = 86_400_000;

function shownId(a: Artifact | null, anchor: ArtifactRef): string {
  if (!a) return anchor.ref ?? anchor.id;
  if (a.kind === "commit") return a.ref ?? a.id.replace(/^commit:/, "");
  if (a.kind === "review" && a.author?.name) return `review·${a.author.name}`;
  return a.id;
}
const LONG = 520;

export function AnchorSpecimen({
  anchor,
  artifact,
  collected,
  now,
}: {
  anchor: ArtifactRef;
  artifact: Artifact | null;
  collected: number;
  now: number;
}) {
  const [open, setOpen] = useState(false);
  const noun = kindName(anchor.kind);
  const ref = shownId(artifact, anchor);
  const title = artifact?.title ?? anchor.title ?? ref;
  const body = artifact ? withoutTitle(artifact.body, artifact.title, null).body.trim() : "";
  const time = artifact ? Date.parse(artifact.date) : Number.NaN;
  const meta = [
    artifact?.author?.name,
    Number.isNaN(time) ? null : dayDate(artifact!.date),
    Number.isNaN(time) ? null : tickText((now - time) / DAY),
  ].filter(Boolean);
  const long = body.length > LONG;

  return (
    <section
      aria-label={`Anchor, ${noun} ${ref}`}
      className="flex w-full flex-col border border-li-divider bg-li-neutral-100 shadow-li-sm"
    >
      <div className="flex min-h-11 items-center gap-2 border-b border-li-divider px-4 py-2 font-li-mono text-xs">
        <span className="bg-li-datum-strong px-1.5 py-px font-medium text-li-ink">{ref}</span>
        <span className="text-li-text-subtle">
          {anchor.kind === "commit" ? `${noun} · ` : ""}anchor of this case
        </span>
        {artifact?.url && (
          <a
            href={artifact.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto font-li-body text-[12.5px] whitespace-nowrap text-li-ink underline decoration-li-neutral-400 underline-offset-2 hover:decoration-li-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus"
          >
            {sourceLinkLabel(artifact.url)} ↗
          </a>
        )}
      </div>
      <div className="flex flex-col gap-2 border-l-4 border-li-datum px-4 py-3.5">
        <p className="text-[15.5px] leading-snug font-semibold text-li-ink">{title}</p>
        {meta.length > 0 && (
          <p className="font-li-mono text-[11px] text-li-text-subtle">{meta.join(" · ")}</p>
        )}
        {body && (
          <p
            className={`text-[13.5px] leading-[1.55] whitespace-pre-wrap text-li-neutral-800 ${
              long && !open ? "line-clamp-12" : ""
            }`}
          >
            {body}
          </p>
        )}
        {long && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="w-fit cursor-pointer text-[12.5px] text-li-ink underline decoration-li-neutral-400 underline-offset-2 hover:decoration-li-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-li-focus"
          >
            {open ? "Show less" : "Show all"}
          </button>
        )}
      </div>
      <p className="border-t border-li-divider px-4 py-2 font-li-mono text-[11px] text-li-text-subtle">
        {collected} artifact{collected === 1 ? "" : "s"} collected around it
      </p>
    </section>
  );
}
