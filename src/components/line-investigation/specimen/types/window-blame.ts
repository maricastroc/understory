import type { BlameSpan } from "@understory/core/types";
import type { BlameStatus } from "./blame-status";

export type WindowBlame = { status: BlameStatus; spans: BlameSpan[] | null };
