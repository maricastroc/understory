export const WIDE_GRID =
  "xl:grid xl:grid-cols-[8.5rem_minmax(0,calc(var(--bore-x)_-_11rem))_5rem_minmax(0,1fr)]";

export const RAIL = "pl-11 xl:pl-0";

export const ROW = `group/row relative ${RAIL} ${WIDE_GRID}`;

const MOVE = "ease-out motion-reduce:transition-none";

export const WIPE = `[clip-path:inset(-8px)] transition-[clip-path,opacity] duration-500 ${MOVE} group-data-[reached=false]/row:opacity-0 group-data-[reached=false]/row:[clip-path:inset(-8px_100%_-8px_-8px)]`;

export const TRACE =
  "absolute left-[var(--bore-x)] -ml-px w-0.5 origin-top bg-li-evidence transition-[scale] duration-200 ease-linear motion-reduce:transition-none";

export const POP = `transition-[scale] duration-200 ${MOVE} group-data-[reached=false]/row:scale-0`;

export const DRAW = `origin-left transition-[scale] duration-300 delay-150 ${MOVE} group-data-[reached=false]/row:scale-x-0`;

export const FADE = `transition-opacity duration-300 ${MOVE} group-data-[reached=false]/row:opacity-0`;

export const ON_BORE = "absolute left-[var(--bore-x)] -translate-x-1/2";

export const CODE_START = "xl:ml-[calc(var(--bore-x)_-_var(--col)_*_var(--code)_*_0.6)]";

export const AT_TOKEN =
  "left-[calc(12px_+_var(--col)_*_var(--code)_*_0.6)] xl:left-[var(--bore-x)]";

export const EYEBROW = "font-li-mono text-xs tracking-[0.08em] text-strata-bore-ink";

export const META = "font-li-mono text-[12.5px] leading-5 text-li-neutral-700";

export const TOKEN = "bg-li-datum-weak outline-[1.5px] outline-strata-bore-ink";
