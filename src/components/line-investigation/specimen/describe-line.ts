import { longAge } from "../format/age";
import type { BlameBarModel } from "./types";

export function describeLine(line: number, datum: boolean, bar: BlameBarModel | undefined): string {
  const parts = [`Line ${line}`];
  if (datum) parts.push("investigated line");
  if (bar) parts.push(`last changed by ${bar.shortSha}, ${longAge(bar.ageDays)} ago`);
  return `${parts.join(", ")}.`;
}
