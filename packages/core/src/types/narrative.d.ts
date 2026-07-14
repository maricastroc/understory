import type { Claim } from "./claim";

export type Narrative = {
  answer: string;
  claims: Claim[];
  citations: string[];
  recorded: boolean;
  answerable: boolean;
};
