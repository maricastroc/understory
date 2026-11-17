export function StageHeading({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-li-display text-[34px] leading-none font-semibold tracking-[-0.01em] text-li-ink">
        {title}
      </h2>
      <p className="max-w-190 text-[15px] leading-normal text-li-neutral-800">{lead}</p>
    </div>
  );
}
