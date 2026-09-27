import type { ChecklistTone } from "../model/types";

export type PopoverRow = {
  key: string;
  glyph: string;
  tone: ChecklistTone;
  text: string;
  clay?: boolean;
};
