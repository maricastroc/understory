import type { ReactNode } from "react";
import type { DomainKind } from "../line-investigation/parts/domain-kind";
import { DomainIcon } from "../line-investigation/parts/DomainIcon";
import { SECTION_RULE } from "./composer-classes";

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
    <section aria-label={label} className={`flex flex-col gap-2 ${SECTION_RULE}`}>
      <h3 className="flex items-center gap-2 li-eyebrow text-li-ink">
        <DomainIcon kind={icon} size={14} />
        {label}
      </h3>
      {children}
    </section>
  );
}
