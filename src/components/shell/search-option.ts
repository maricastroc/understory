import type { RailItem } from "./types";

export type SearchOption = { type: "case"; item: RailItem } | { type: "file"; path: string };
