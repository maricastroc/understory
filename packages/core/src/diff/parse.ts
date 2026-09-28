import type { ChangeLine, FileChange, LineRange, ParsedDiff } from "./types";

function stripPrefix(p: string): string {
  return p.replace(/^[ab]\//, "");
}

export function coalesce(nums: number[]): LineRange[] {
  if (nums.length === 0) return [];
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  const ranges: LineRange[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (n === prev + 1) {
      prev = n;
    } else {
      ranges.push({ start, end: prev });
      start = n;
      prev = n;
    }
  }
  ranges.push({ start, end: prev });
  return ranges;
}

type Draft = Omit<FileChange, "removedRanges" | "addedRanges" | "changes"> & {
  removed: number[];
  added: number[];
  changes: ChangeLine[];
};

function newDraft(): Draft {
  return {
    oldPath: null,
    newPath: null,
    status: "modified",
    binary: false,
    removed: [],
    added: [],
    changes: [],
  };
}

export function parseUnifiedDiff(diff: string): ParsedDiff {
  const lines = diff.split("\n");
  const files: FileChange[] = [];
  let cur: Draft | null = null;
  let inHunk = false;
  let oldNo = 0;
  let newNo = 0;
  let block = 0;
  let inBlock = false;
  const breakBlock = () => {
    if (inBlock) block++;
    inBlock = false;
  };

  const flush = () => {
    if (!cur) return;
    files.push({
      oldPath: cur.oldPath,
      newPath: cur.newPath,
      status: cur.status,
      binary: cur.binary,
      removedRanges: coalesce(cur.removed),
      addedRanges: coalesce(cur.added),
      changes: cur.changes,
    });
    cur = null;
  };

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      flush();
      cur = newDraft();
      inHunk = false;
      breakBlock();
      const m = line.match(/^diff --git (\S+) (\S+)$/);
      if (m) {
        cur.oldPath = stripPrefix(m[1]);
        cur.newPath = stripPrefix(m[2]);
      }
      continue;
    }
    if (!cur) continue;

    if (inHunk) {
      const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunk) {
        oldNo = Number(hunk[1]);
        newNo = Number(hunk[2]);
        breakBlock();
        continue;
      }
      if (line.startsWith("-")) {
        cur.removed.push(oldNo);
        cur.changes.push({ kind: "del", old: oldNo, new: null, text: line.slice(1), block });
        inBlock = true;
        oldNo++;
      } else if (line.startsWith("+")) {
        cur.added.push(newNo);
        cur.changes.push({ kind: "add", old: null, new: newNo, text: line.slice(1), block });
        inBlock = true;
        newNo++;
      } else if (line.startsWith(" ")) {
        breakBlock();
        oldNo++;
        newNo++;
      } else if (line.startsWith("\\")) {
        //
      } else {
        inHunk = false;
      }
      continue;
    }


    if (line.startsWith("new file mode")) {
      cur.status = "added";
      cur.oldPath = null;
    } else if (line.startsWith("deleted file mode")) {
      cur.status = "deleted";
      cur.newPath = null;
    } else if (line.startsWith("rename from ")) {
      cur.status = "renamed";
      cur.oldPath = line.slice(12).trim();
    } else if (line.startsWith("rename to ")) {
      cur.status = "renamed";
      cur.newPath = line.slice(10).trim();
    } else if (line.startsWith("Binary files") || line.startsWith("GIT binary patch")) {
      cur.binary = true;
    } else if (line.startsWith("--- ")) {
      const p = line.slice(4).trim();
      if (p === "/dev/null") cur.status = "added";
      else cur.oldPath = stripPrefix(p);
    } else if (line.startsWith("+++ ")) {
      const p = line.slice(4).trim();
      if (p === "/dev/null") cur.status = "deleted";
      else cur.newPath = stripPrefix(p);
    } else {
      const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunk) {
        oldNo = Number(hunk[1]);
        newNo = Number(hunk[2]);
        inHunk = true;
      }
    }
  }
  flush();

  return { files };
}
