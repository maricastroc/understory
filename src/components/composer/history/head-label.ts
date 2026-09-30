import type { HeadCommit } from "@understory/core/types";
import { fmtDate } from "../../format";

export function headLabel(head: HeadCommit): { sha: string; day: string; year: string } {
  const [day, month, year] = fmtDate(head.date).split(" ");
  return { sha: head.sha.slice(0, 7), day: `${Number(day)} ${month}`, year };
}
