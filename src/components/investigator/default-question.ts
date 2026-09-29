export const LINE_QUESTION = "Why is this line the way it is?";
export const RANGE_QUESTION = "Why are these lines the way they are?";
export const DEEP_LINK_QUESTION = "Why is this line the way it is? Reconstruct why it changed.";

export function defaultQuestion(target: { start: number; end: number; name?: string | null }) {
  if (target.name) return `Why is ${target.name} the way it is?`;
  return target.start === target.end ? LINE_QUESTION : RANGE_QUESTION;
}

export function isDefaultQuestion(question: string): boolean {
  const q = question.trim();
  return q === LINE_QUESTION || q === RANGE_QUESTION || q === DEEP_LINK_QUESTION;
}
