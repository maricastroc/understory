import type { QuoteRange } from "@understory/core/types";

const BAR = {
  verified: "border-li-evidence",
  unverified: "border-li-neutral-400",
  gap: "border-li-gap",
} as const;

export function QuoteBlock({
  body,
  range,
  tone,
  caption,
}: {
  body: string;
  range: QuoteRange | null;
  tone: keyof typeof BAR;
  caption?: string;
}) {
  return (
    <figure className="flex flex-col gap-1">
      {caption && <figcaption className="text-[11.5px] text-li-text-subtle">{caption}</figcaption>}
      <blockquote
        className={`border-l-2 bg-li-neutral-100 px-3 py-2.5 text-sm leading-[1.55] whitespace-pre-wrap text-li-ink ${BAR[tone]}`}
      >
        {range ? (
          <>
            {body.slice(0, range.start)}
            <mark className="bg-li-evidence-quote text-inherit">
              {body.slice(range.start, range.end)}
            </mark>
            {body.slice(range.end)}
          </>
        ) : (
          body
        )}
      </blockquote>
    </figure>
  );
}
