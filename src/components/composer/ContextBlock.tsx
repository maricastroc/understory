import type { ReactNode } from "react";
import type { DomainKind } from "../line-investigation/parts/domain-kind";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";

export function ContextBlock({
  label,
  icon,
  children,
}: {
  label: string;
  icon: DomainKind;
  children: ReactNode;
}) {
  return (
    <section aria-label={label} className="flex flex-col gap-2 border-t-2 border-li-ink pt-3">
      <h3 className="flex items-center gap-2 font-li-mono text-[11px] tracking-[0.08em] text-li-ink uppercase">
        <DomainIcon kind={icon} size={14} />
        {label}
      </h3>
      {children}
    </section>
  );
}
