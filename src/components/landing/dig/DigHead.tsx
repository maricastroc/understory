import type { ReactNode } from "react";
import { EYEBROW, ROW } from "./dig-classes";

export function DigHead({
  id,
  n,
  title,
  note,
  lane,
}: {
  id: string;
  n: string;
  title: string;
  note: string;
  lane?: ReactNode;
}) {
  return (
    <div className={`${ROW} pt-11 pb-6`}>
      {lane}
      <span aria-hidden className={`absolute inset-x-0 top-0 border-t border-li-divider`} />
      <p className={`${EYEBROW} max-xl:mb-2 xl:col-start-1 xl:row-start-1 xl:pt-4`}>{n}</p>
      <div className="xl:col-start-2 xl:row-start-1">
        <h2
          id={id}
          className="font-li-display text-[36px] leading-none font-semibold tracking-[-0.01em] text-balance xl:text-[46px]"
        >
          {title}
        </h2>
        <p className="mt-2.5 max-w-[34rem] text-[17px] leading-normal text-pretty text-li-neutral-800">
          {note}
        </p>
      </div>
    </div>
  );
}
