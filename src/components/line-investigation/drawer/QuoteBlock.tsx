import type { QuoteRange } from "@understory/core/types";
import { useFirstSight } from "../case/first-sight";

const SWEEP =
  "bg-[linear-gradient(var(--color-li-evidence-quote),var(--color-li-evidence-quote))] bg-[length:100%_100%] bg-no-repeat text-inherit animate-li-sweep";

function Quoted({ text, sight }: { text: string; sight: string | null }) {
  const first = useFirstSight(sight);
  return <mark className={first ? SWEEP : "bg-li-evidence-quote text-inherit"}>{text}</mark>;
}

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
  sight = null,
}: {
  body: string;
  range: QuoteRange | null;
  tone: keyof typeof BAR;
  caption?: string;
  sight?: string | null;
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
            <Quoted
              key={sight ?? "quote"}
              text={body.slice(range.start, range.end)}
              sight={sight}
            />
            {body.slice(range.end)}
          </>
        ) : (
          body
        )}
      </blockquote>
    </figure>
  );
}
