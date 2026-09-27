const CORNER =
  "pointer-events-none absolute size-2.75 text-li-ink/55 before:absolute before:top-0 before:left-1.25 before:h-full before:w-px before:bg-current after:absolute after:top-1.25 after:left-0 after:h-px after:w-full after:bg-current";

export function BlueprintCorners() {
  return (
    <>
      <span aria-hidden className={`${CORNER} -top-1.5 -left-1.5`} />
      <span aria-hidden className={`${CORNER} -top-1.5 -right-1.5`} />
      <span aria-hidden className={`${CORNER} -bottom-1.5 -left-1.5`} />
      <span aria-hidden className={`${CORNER} -right-1.5 -bottom-1.5`} />
    </>
  );
}
