export function MiniCore({ fraction }: { fraction: number }) {
  const top = 4 + Math.min(1, Math.max(0, fraction)) * 48;
  return (
    <div aria-hidden className="relative h-16 w-7">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-li-datum" />
      <span className="absolute top-0 bottom-0 left-3.25 w-[1.5px] bg-li-neutral-500" />
      <span
        className="absolute left-2 size-3 rounded-full border-[1.5px] border-li-steel bg-li-paper"
        style={{ top }}
      />
    </div>
  );
}
