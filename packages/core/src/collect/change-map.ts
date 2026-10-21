import { commitPatch } from "./git";
import { rest } from "./github/client";

export type ChangedFile = {
  path: string;
  previousPath?: string | null;
  status: string;
  added: number;
  removed: number;
  patch: string | null;
};

export type MapHunk = {
  header: string;
  section: string;
  line: boolean;
  added: number;
  removed: number;
  rows: string[];
  cut: number;
};

export type MapFile = {
  path: string;
  previousPath?: string;
  status: string;
  added: number;
  removed: number;
  patch: "shown" | "not returned";
  hunks: MapHunk[];
  cutHunks: number;
};

export type ChangeMap = {
  budget: number;
  chars: number;
  files: MapFile[];
  cutFiles: number;
  line: { path: string; found: boolean; number: number | null };
  cut: { files: number; hunks: number; rows: number; lineHunkRows: number; clipped: number };
  complete: boolean;
};

export type LineAt = { path: string; text: string };

export const MAP_BUDGET = 32_000;
export const LINE_MARK = "← the investigated line";
export const GAP = "⋯";
const ROW_CHARS = 160;
const SECTION_CHARS = 80;
const WINDOW = 6;

type Parsed = { header: string; section: string; rows: string[] };

const isAdded = (row: string) => row.startsWith("+") && !row.startsWith("+++");
const isRemoved = (row: string) => row.startsWith("-") && !row.startsWith("---");

export function hunksOf(patch: string): Parsed[] {
  const hunks: Parsed[] = [];
  for (const row of patch.replace(/\r\n/g, "\n").split("\n")) {
    const head = /^(@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@)\s?(.*)$/.exec(row);
    if (head) hunks.push({ header: head[1], section: head[2].trim(), rows: [] });
    else if (hunks.length && row !== "\\ No newline at end of file") hunks.at(-1)!.rows.push(row);
  }
  for (const hunk of hunks) while (hunk.rows.length && hunk.rows.at(-1) === "") hunk.rows.pop();
  return hunks;
}

type Row = { index: number; sign: "+" | "-" | " "; number: number; text: string };

function numbered(hunk: Parsed): Row[] {
  const start = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(hunk.header);
  let before = Number(start?.[1] ?? 0);
  let after = Number(start?.[2] ?? 0);
  return hunk.rows.map((row, index) => {
    if (isAdded(row)) return { index, sign: "+", number: after++, text: row.slice(1) };
    if (isRemoved(row)) return { index, sign: "-", number: before++, text: row.slice(1) };
    before++;
    return { index, sign: " ", number: after++, text: row.slice(1) };
  });
}

const clip = (text: string, max: number) =>
  text.length <= max
    ? { text, clipped: false }
    : { text: `${text.slice(0, max - 1)}…`, clipped: true };

function lineHunk(
  files: ChangedFile[],
  at: LineAt,
): { path: string; hunk: number; row: number } | null {
  const wanted = at.text.trim();
  if (!wanted) return null;
  const ordered = [
    ...files.filter((f) => f.path === at.path),
    ...files.filter((f) => f.path !== at.path),
  ];
  for (const file of ordered) {
    const hits = hunksOf(file.patch ?? "").flatMap((hunk, h) =>
      hunk.rows.flatMap((row, r) =>
        isAdded(row) && row.slice(1).trim() === wanted ? [{ hunk: h, row: r }] : [],
      ),
    );
    if (hits.length === 1) return { path: file.path, ...hits[0] };
    if (hits.length > 1) return null;
  }
  return null;
}

export const fileLine = (
  f: Pick<MapFile, "path" | "previousPath" | "status" | "added" | "removed" | "patch">,
) =>
  `${f.path}${f.previousPath ? ` (was ${f.previousPath})` : ""} · ${f.status} · +${f.added} −${f.removed}${f.patch === "not returned" ? " · patch not returned" : ""}`;

export const hunkLine = (h: Pick<MapHunk, "header" | "section" | "line">) =>
  `${h.header}${h.section ? ` ${h.section}` : ""}${h.line ? " · holds the investigated line" : ""}`;

export function changeMap(files: ChangedFile[], at: LineAt, budget = MAP_BUDGET): ChangeMap {
  const found = lineHunk(files, at);
  const home = found?.path ?? at.path;
  let spent = 0;
  let clipped = 0;
  const cost = (text: string) => text.length + 1;
  const show = (row: Row, mark = false) => {
    const c = clip(row.text, ROW_CHARS);
    if (c.clipped) clipped++;
    return `${row.sign}${String(row.number).padStart(5)} ${c.text}${mark ? `  ${LINE_MARK}` : ""}`;
  };

  type Slot = {
    hunk: MapHunk;
    pending: Row[];
    chosen: Map<number, string>;
    lineRest: boolean;
  };
  const entry = (file: ChangedFile): MapFile => ({
    path: file.path,
    ...(file.previousPath && file.previousPath !== file.path
      ? { previousPath: file.previousPath }
      : {}),
    status: file.status,
    added: file.added,
    removed: file.removed,
    patch: file.patch === null ? "not returned" : "shown",
    hunks: [],
    cutHunks: 0,
  });
  const order = [...files.filter((f) => f.path === home), ...files.filter((f) => f.path !== home)];
  const mapped: MapFile[] = [];
  const slots: Slot[] = [];
  let lineNumber: number | null = null;
  let cutFiles = 0;

  const first = order[0];
  if (first) {
    const file = entry(first);
    spent += cost(fileLine(file));
    mapped.push(file);
  }
  const parsedOf = new Map(order.map((f) => [f.path, hunksOf(f.patch ?? "")]));
  if (found && first && first.path === found.path) {
    const h = parsedOf.get(found.path)![found.hunk];
    const rows = numbered(h);
    const target = rows[found.row];
    lineNumber = target.number;
    const hunk: MapHunk = {
      header: h.header,
      section: clip(h.section, SECTION_CHARS).text,
      line: true,
      added: rows.filter((r) => r.sign === "+").length,
      removed: rows.filter((r) => r.sign === "-").length,
      rows: [],
      cut: 0,
    };
    const chosen = new Map<number, string>();
    for (const row of rows.slice(Math.max(0, found.row - WINDOW), found.row + WINDOW + 1)) {
      const text = show(row, row.index === found.row);
      chosen.set(row.index, text);
      spent += cost(text);
    }
    spent += cost(hunkLine(hunk));
    mapped[0].hunks.push(hunk);
    const rest = rows
      .filter((r) => r.sign !== " " && !chosen.has(r.index))
      .sort((a, b) => Math.abs(a.index - found.row) - Math.abs(b.index - found.row));
    slots.push({ hunk, pending: rest, chosen, lineRest: true });
  }

  for (const file of order.slice(1)) {
    const e = entry(file);
    const line = fileLine(e);
    if (spent + cost(line) > budget) {
      cutFiles++;
      continue;
    }
    spent += cost(line);
    mapped.push(e);
  }

  for (const file of mapped) {
    (parsedOf.get(file.path) ?? []).forEach((h, index) => {
      if (found && file.path === found.path && index === found.hunk) return;
      const rows = numbered(h);
      const hunk: MapHunk = {
        header: h.header,
        section: clip(h.section, SECTION_CHARS).text,
        line: false,
        added: rows.filter((r) => r.sign === "+").length,
        removed: rows.filter((r) => r.sign === "-").length,
        rows: [],
        cut: 0,
      };
      const head = cost(hunkLine(hunk));
      if (spent + head > budget) {
        file.cutHunks++;
        return;
      }
      spent += head;
      file.hunks.push(hunk);
      slots.push({
        hunk,
        pending: rows.filter((r) => r.sign !== " "),
        chosen: new Map(),
        lineRest: false,
      });
    });
  }

  let open = slots.filter((s) => s.pending.length > 0);
  while (open.length) {
    let placed = false;
    for (const slot of open) {
      const text = show(slot.pending[0]);
      if (spent + cost(text) > budget) continue;
      spent += cost(text);
      slot.chosen.set(slot.pending[0].index, text);
      slot.pending.shift();
      placed = true;
    }
    open = open.filter((s) => s.pending.length > 0);
    if (!placed) break;
  }

  let lineHunkRows = 0;
  let cutRows = 0;
  for (const slot of slots) {
    slot.hunk.cut = slot.pending.length;
    if (slot.lineRest) lineHunkRows += slot.pending.length;
    else cutRows += slot.pending.length;
    const kept = [...slot.chosen.entries()].sort((a, b) => a[0] - b[0]);
    slot.hunk.rows = kept.flatMap(([index, text], i) =>
      i > 0 && index !== kept[i - 1][0] + 1 ? [GAP, text] : [text],
    );
  }
  for (const file of mapped) {
    const position = new Map((parsedOf.get(file.path) ?? []).map((h, i) => [h.header, i]));
    file.hunks.sort((a, b) => (position.get(a.header) ?? 0) - (position.get(b.header) ?? 0));
  }

  const cutHunks = mapped.reduce((n, f) => n + f.cutHunks, 0);
  const map: ChangeMap = {
    budget,
    chars: 0,
    files: mapped,
    cutFiles,
    line: { path: home, found: !!found, number: lineNumber },
    cut: { files: cutFiles, hunks: cutHunks, rows: cutRows, lineHunkRows, clipped },
    complete: cutFiles === 0 && cutHunks === 0 && cutRows === 0 && lineHunkRows === 0,
  };
  return { ...map, chars: renderChangeMap(map).length };
}

export function renderChangeMap(map: ChangeMap): string {
  const out: string[] = [];
  for (const file of map.files) {
    out.push(fileLine(file));
    for (const hunk of file.hunks) {
      out.push(hunkLine(hunk));
      out.push(...hunk.rows);
      if (hunk.cut)
        out.push(`… ${hunk.cut} more changed ${hunk.cut === 1 ? "row" : "rows"} not shown`);
    }
    if (file.cutHunks)
      out.push(`… ${file.cutHunks} more ${file.cutHunks === 1 ? "hunk" : "hunks"} not shown`);
  }
  if (map.cutFiles)
    out.push(`… ${map.cutFiles} more ${map.cutFiles === 1 ? "file" : "files"} not shown`);
  return out.join("\n");
}

type CommitFilesAnswer = {
  files?: Array<{
    filename: string;
    previous_filename?: string;
    status?: string;
    additions?: number;
    deletions?: number;
    patch?: string;
  }>;
};

export async function githubChangedFiles(
  owner: string,
  repo: string,
  sha: string,
): Promise<ChangedFile[]> {
  const d = await rest<CommitFilesAnswer>(
    `/repos/${owner}/${repo}/commits/${encodeURIComponent(sha)}`,
  );
  return (d.files ?? []).map((f) => ({
    path: f.filename,
    ...(f.previous_filename ? { previousPath: f.previous_filename } : {}),
    status: f.status ?? "modified",
    added: f.additions ?? 0,
    removed: f.deletions ?? 0,
    patch: f.patch ?? null,
  }));
}

export function filesOfPatch(patch: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  for (const block of patch.replace(/\r\n/g, "\n").split(/^(?=diff --git )/m)) {
    const head = /^diff --git a\/(.+?) b\/(.+)$/m.exec(block);
    if (!head) continue;
    const from = /^rename from (.+)$/m.exec(block)?.[1] ?? head[1];
    const path = /^rename to (.+)$/m.exec(block)?.[1] ?? head[2];
    const status = /^new file mode/m.test(block)
      ? "added"
      : /^deleted file mode/m.test(block)
        ? "removed"
        : from !== path
          ? "renamed"
          : "modified";
    const at = block.search(/^@@ /m);
    const body = at < 0 ? "" : block.slice(at);
    const rows = body.split("\n");
    files.push({
      path,
      ...(from !== path ? { previousPath: from } : {}),
      status,
      added: rows.filter(isAdded).length,
      removed: rows.filter(isRemoved).length,
      patch: at < 0 ? null : body.replace(/\n$/, ""),
    });
  }
  return files;
}

export async function localChangedFiles(repoPath: string, sha: string): Promise<ChangedFile[]> {
  return filesOfPatch(await commitPatch(repoPath, sha));
}
