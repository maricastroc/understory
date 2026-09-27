import type { BlameSpan } from "@git-investigator/core/types";
import type { BlameStatus } from "./blame-status";

export type WindowBlame = { status: BlameStatus; spans: BlameSpan[] | null };
