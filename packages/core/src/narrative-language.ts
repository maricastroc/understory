import type { Narrative, NarrativeLanguage } from "./types";

const PT =
  /(?<!\p{L})(não|que|foi|para|por|uma|um|com|dos|das|pela|pelo|esta|este|está|são|porque|então|também|quando|mais|como|linha|histórico|explica|tentativas|cobrança)(?!\p{L})|\p{L}*(?:ção|ções|ão)(?!\p{L})/giu;
const EN =
  /(?<!\p{L})(the|was|were|to|and|because|this|that|with|for|of|is|are|line|when|which|it|why|does|not|explain|history)(?!\p{L})/giu;

export function narrativeLanguage(
  n: Pick<Narrative, "answer"> & { claims?: Narrative["claims"]; language?: NarrativeLanguage },
): NarrativeLanguage | null {
  if (n.language) return n.language;
  const text = [n.answer, ...(n.claims ?? []).map((c) => c.text)].join(" ");
  const pt = text.match(PT)?.length ?? 0;
  const en = text.match(EN)?.length ?? 0;
  if (pt === 0 && en === 0) return null;
  return pt > en ? "pt" : "en";
}
