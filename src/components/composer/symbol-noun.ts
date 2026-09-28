const NOUN: Record<string, string> = {
  method: "function",
  module: "module",
  namespace: "namespace",
};

export function symbolNoun(kind: string): string {
  return NOUN[kind] ?? kind;
}
