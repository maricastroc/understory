import type { Claim } from "./claim";

export type Narrative = {
  answer: string;
  // The answer, decomposed into individually-cited factual assertions. Empty when the
  // narrative abstains or is out of scope. `answer` is the derived prose join of these.
  claims: Claim[];
  citations: string[];
  recorded: boolean;
  answerable: boolean;
};
