export type SymbolSpan = { start: number; end: number; name?: string; kind: string };

const INDENT_EXT = new Set(["py", "pyi"]);

const RESERVED = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "do",
  "else",
  "return",
  "with",
  "case",
  "try",
  "finally",
  "throw",
  "await",
  "typeof",
  "new",
  "delete",
  "in",
  "of",
]);

/**
 * Best-effort: given the clicked line, find the span of the enclosing
 * function/class/symbol so an investigation can target a whole unit instead of a
 * single line. A heuristic (brace matching or indentation), not a parser — it
 * degrades to null when it can't be sure, and the caller keeps the raw line.
 */
export function enclosingSymbol(lines: string[], line: number, file?: string): SymbolSpan | null {
  const ext = file ? (file.split(".").pop() ?? "").toLowerCase() : "";
  if (INDENT_EXT.has(ext)) return indentSymbol(lines, line);
  return braceSymbol(lines, line);
}

function braceSymbol(lines: string[], line: number): SymbolSpan | null {
  const san = lines.map(sanitize);
  const stack: number[] = [];
  const blocks: Array<[number, number]> = [];
  for (let i = 0; i < san.length; i++) {
    for (const ch of san[i]) {
      if (ch === "{") stack.push(i);
      else if (ch === "}") {
        const open = stack.pop();
        if (open !== undefined) blocks.push([open, i]);
      }
    }
  }

  const target = line - 1;
  const containing = blocks
    .filter(([open, close]) => open <= target && target <= close)
    .sort((a, b) => a[1] - a[0] - (b[1] - b[0]));

  for (const [open, close] of containing) {
    const header = headerFor(san, open);
    if (header) {
      return { start: header.start + 1, end: close + 1, name: header.name, kind: header.kind };
    }
  }
  return null;
}

function headerFor(
  san: string[],
  openLine: number,
): { start: number; name?: string; kind: string } | null {
  let start = openLine;
  while (start > 0 && openLine - start < 6) {
    const prev = san[start - 1].trimEnd();
    if (prev === "" || /[;{}]\s*$/.test(prev)) break;
    start--;
  }
  const text = san
    .slice(start, openLine + 1)
    .join(" ")
    .trim();
  const def = matchDefinition(text);
  return def ? { start, name: def.name, kind: def.kind } : null;
}

function matchDefinition(text: string): { name?: string; kind: string } | null {
  let m = text.match(/\b(class|interface|enum|struct|trait|namespace|module)\s+([A-Za-z_$][\w$]*)/);
  if (m) return { kind: m[1], name: m[2] };

  m = text.match(/\btype\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*=/);
  if (m) return { kind: "type", name: m[1] };

  m = text.match(/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)?\s*\(/);
  if (m) return { kind: "function", name: m[1] };

  m = text.match(/\b(?:func|fn|sub)\s+(?:\([^)]*\)\s*)?([A-Za-z_$][\w$]*)\s*[(<]/);
  if (m) return { kind: "function", name: m[1] };

  m = text.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*/);
  if (m && /=>\s*\{?\s*$|\bfunction\b/.test(text)) return { kind: "function", name: m[1] };

  m = text.match(
    /(?:^|[\s;])(?:public|private|protected|internal|static|final|abstract|override|async|get|set|\*|\s)*([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\([^;{]*\)\s*(?::\s*[^={]+)?\{?\s*$/,
  );
  if (m && !RESERVED.has(m[1])) return { kind: "method", name: m[1] };

  return null;
}

function indentSymbol(lines: string[], line: number): SymbolSpan | null {
  const target = line - 1;
  const def = /^(\s*)(?:async\s+)?(def|class)\s+([A-Za-z_]\w*)/;
  const indentOf = (s: string): number => s.length - s.trimStart().length;

  const active = lines[target] ?? "";
  const curIndent = active.trim() === "" ? Infinity : indentOf(active);

  let header = -1;
  let headerIndent = 0;
  let kind = "";
  let name = "";
  for (let i = target; i >= 0; i--) {
    const m = lines[i].match(def);
    if (m && (i === target || m[1].length < curIndent)) {
      header = i;
      headerIndent = m[1].length;
      kind = m[2];
      name = m[3];
      break;
    }
  }
  if (header === -1) return null;

  let end = header;
  for (let i = header + 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    if (indentOf(lines[i]) > headerIndent) end = i;
    else break;
  }
  return { start: header + 1, end: end + 1, name, kind: kind === "class" ? "class" : "function" };
}

function sanitize(line: string): string {
  let out = "";
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote && line[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "/" && line[i + 1] === "/") break;
    out += c;
  }
  return out;
}
