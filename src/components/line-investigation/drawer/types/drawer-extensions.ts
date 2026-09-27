import type { EvidenceEntry } from "../../copy/types";
import type { AppearsInLink } from "./appears-in-link";

export type DrawerExtensions = {
  countLabel?: string;
  appearsIn?: (entry: EvidenceEntry) => AppearsInLink[];
  aside?: (entry: EvidenceEntry) => string | null;
  quoteCaption?: (clauseId: string | null) => string | undefined;
};
