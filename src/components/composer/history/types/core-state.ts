import type { FileHistory } from "@git-investigator/core/types";
import type { CoreStatus } from "./core-status";

export type CoreState = { status: CoreStatus; history: FileHistory | null };
