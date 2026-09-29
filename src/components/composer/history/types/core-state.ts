import type { FileHistory } from "@understory/core/types";
import type { CoreStatus } from "./core-status";

export type CoreState = { status: CoreStatus; history: FileHistory | null };
