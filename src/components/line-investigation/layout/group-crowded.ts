import { BORE } from "./geometry";
import type { BoreItem } from "./types";

export function groupId(firstMemberId: string): string {
  return `group:${firstMemberId}`;
}

export function groupCrowded(
  items: BoreItem[],
  clusterOf: (time: number) => number,
  expanded: ReadonlySet<string>,
): Array<BoreItem & { members: string[] }> {
  const buckets = new Map<string, BoreItem[]>();
  for (const item of items) {
    if (item.kind === "pull_request") continue;
    const key = `${clusterOf(item.time)}:${item.kind}`;
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }

  const absorbed = new Map<string, BoreItem & { members: string[] }>();
  for (const members of buckets.values()) {
    if (members.length <= BORE.maxPerKind) continue;
    const id = groupId(members[0].id);
    if (expanded.has(id)) continue;
    const group = { ...members[0], id, endTime: null, members: members.map((m) => m.id) };
    for (const m of members) absorbed.set(m.id, group);
  }

  const out: Array<BoreItem & { members: string[] }> = [];
  const emitted = new Set<string>();
  for (const item of items) {
    const group = absorbed.get(item.id);
    if (!group) out.push({ ...item, members: [item.id] });
    else if (!emitted.has(group.id)) {
      emitted.add(group.id);
      out.push(group);
    }
  }
  return out;
}
