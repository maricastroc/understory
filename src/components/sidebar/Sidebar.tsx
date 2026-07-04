import type { AuthUser } from "../investigator/use-auth";
import { SidebarBody } from "./SidebarBody";
import type { CaseItem } from "./case-item";

export function Sidebar({
  items,
  activeId,
  onSelect,
  onRemove,
  filtering = false,
  user,
}: {
  items: CaseItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  filtering?: boolean;
  user?: AuthUser | null;
}) {
  return (
    <aside className="hidden w-67 shrink-0 flex-col border-r border-line-2 bg-surface-2 md:flex">
      <SidebarBody
        items={items}
        activeId={activeId}
        onSelect={onSelect}
        onRemove={onRemove}
        filtering={filtering}
        user={user}
      />
    </aside>
  );
}
