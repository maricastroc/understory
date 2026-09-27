import type { CodeSegment } from "./types";

type Language = { keywords: Set<string>; line: string[]; block: [string, string] | null };

const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

const JS = words(`
  import from export default as async await function return const let var if else for while do
  switch case break continue try catch finally throw new class extends implements interface type
  enum public private protected static readonly yield typeof instanceof in of void delete declare
  abstract get set satisfies keyof
`);
const PYTHON = words(`
  def class return if elif else for while try except finally raise import from as with lambda
  yield async await pass break continue in not and or is global nonlocal assert del
`);
const GO = words(`
  func package import return if else for range switch case default go defer var const type struct
  interface map chan select break continue fallthrough goto
`);
const RUST = words(`
  fn let mut pub impl struct enum trait use mod match if else for while loop return async await
  move where const static type crate self super unsafe dyn ref in as break continue
`);
const JVM = words(`
  package import class interface enum extends implements public private protected static final
  abstract return if else for while do switch case default break continue try catch finally throw
  throws new void var val fun object when is in override open sealed data companion namespace using
  async await readonly struct
`);
const RUBY = words(`
  def class module end return if elsif else unless for while until do begin rescue ensure raise
  yield require include extend and or not then when case
`);
const SHELL = words(
  `if then else elif fi for while do done case esac function return in export local`,
);

const C_LIKE = { line: ["//"], block: ["/*", "*/"] as [string, string] };
const HASH = { line: ["#"], block: null };

const LANGUAGES: Record<string, Language> = {
  ts: { keywords: JS, ...C_LIKE },
  tsx: { keywords: JS, ...C_LIKE },
  js: { keywords: JS, ...C_LIKE },
  jsx: { keywords: JS, ...C_LIKE },
  mjs: { keywords: JS, ...C_LIKE },
  cjs: { keywords: JS, ...C_LIKE },
  py: { keywords: PYTHON, ...HASH },
  go: { keywords: GO, ...C_LIKE },
  rs: { keywords: RUST, ...C_LIKE },
  java: { keywords: JVM, ...C_LIKE },
  kt: { keywords: JVM, ...C_LIKE },
  cs: { keywords: JVM, ...C_LIKE },
  scala: { keywords: JVM, ...C_LIKE },
  rb: { keywords: RUBY, ...HASH },
  sh: { keywords: SHELL, ...HASH },
  bash: { keywords: SHELL, ...HASH },
};

function languageFor(path: string): Language | null {
  const ext = (path.split(".").pop() ?? "").toLowerCase();
  return LANGUAGES[ext] ?? null;
}

function push(out: CodeSegment[], text: string, kind: CodeSegment["kind"]) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.kind === kind) last.text += text;
  else out.push({ text, kind });
}

function pushCode(out: CodeSegment[], text: string, keywords: Set<string>) {
  let cursor = 0;
  for (const m of text.matchAll(/[A-Za-z_$][\w$]*/g)) {
    if (!keywords.has(m[0])) continue;
    push(out, text.slice(cursor, m.index), "plain");
    push(out, m[0], "keyword");
    cursor = m.index + m[0].length;
  }
  push(out, text.slice(cursor), "plain");
}

export function highlightLines(lines: string[], path: string): CodeSegment[][] {
  const lang = languageFor(path);
  if (!lang) return lines.map((l) => (l ? [{ text: l, kind: "plain" }] : []));

  let inBlock = false;
  return lines.map((line) => {
    const out: CodeSegment[] = [];
    let i = 0;
    let code = "";
    const flush = () => {
      pushCode(out, code, lang.keywords);
      code = "";
    };

    while (i < line.length) {
      if (inBlock && lang.block) {
        const close = line.indexOf(lang.block[1], i);
        const end = close < 0 ? line.length : close + lang.block[1].length;
        push(out, line.slice(i, end), "comment");
        i = end;
        inBlock = close < 0;
        continue;
      }
      if (lang.block && line.startsWith(lang.block[0], i)) {
        flush();
        push(out, lang.block[0], "comment");
        i += lang.block[0].length;
        inBlock = true;
        continue;
      }
      if (lang.line.some((m) => line.startsWith(m, i))) {
        flush();
        push(out, line.slice(i), "comment");
        i = line.length;
        continue;
      }
      const ch = line[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        let j = i + 1;
        while (j < line.length && line[j] !== ch) j += line[j] === "\\" ? 2 : 1;
        flush();
        push(out, line.slice(i, Math.min(j + 1, line.length)), "plain");
        i = j + 1;
        continue;
      }
      code += ch;
      i++;
    }
    flush();
    return out;
  });
}
