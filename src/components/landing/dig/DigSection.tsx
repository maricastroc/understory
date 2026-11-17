import type { ReactNode } from "react";
import { CONTAINER } from "../parts/landing-classes";

export function DigSection({
  id,
  chapter,
  silent = false,
  labelledBy,
  label,
  bleed,
  children,
}: {
  id?: string;
  chapter: string;
  silent?: boolean;
  labelledBy?: string;
  label?: string;
  bleed?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      aria-label={label}
      data-dig-section={silent ? "silent" : "ink"}
      data-dig-chapter={chapter}
      className="relative scroll-mt-11"
    >
      {bleed}
      <div className={CONTAINER}>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-[var(--bore-x)] -ml-px w-0.5"
          >
            <span className="absolute inset-y-0 left-[0.5px] w-px bg-li-neutral-300" />
            {silent && <span className="absolute inset-y-0 -left-2 w-4.5 bg-li-paper" />}
            <span
              data-dig-bore
              className={`absolute inset-y-0 left-0 ${
                silent ? "border-l-2 border-dashed border-li-gap" : "w-0.5 bg-li-ink"
              }`}
            />
          </span>
          {children}
        </div>
      </div>
    </section>
  );
}
