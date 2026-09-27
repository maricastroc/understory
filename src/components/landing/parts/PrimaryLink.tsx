import Link from "next/link";
import type { ReactNode } from "react";
import { BlueprintCorners } from "../../line-investigation/parts/BlueprintCorners";
import { liButton } from "../../line-investigation/parts/button-class";

export function PrimaryLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={liButton("brand", className)}>
      <BlueprintCorners />
      {children}
    </Link>
  );
}
