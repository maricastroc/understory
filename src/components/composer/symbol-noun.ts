const KNOWN = [
  "function",
  "module",
  "namespace",
  "class",
  "interface",
  "enum",
  "struct",
  "trait",
  "type",
] as const;

export type SymbolNoun = (typeof KNOWN)[number] | "symbol";

export function symbolNoun(kind: string): SymbolNoun {
  if (kind === "method") return "function";
  return (KNOWN as readonly string[]).includes(kind) ? (kind as SymbolNoun) : "symbol";
}
