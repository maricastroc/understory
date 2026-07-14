// How well the collector could resolve the code's history — a deterministic signal about
// the QUALITY of what was gathered, separate from whether each artifact is real.
// - "line": true line-level blame (git log -L / GitHub-GitLab blame). The evidence is about
//   this exact line.
// - "file": blame was unavailable (file too large, or the blame API failed) so we fell back
//   to the file's recent commit history. Those commits speak to the FILE, not necessarily
//   this line — so an answer built on them cannot be high-confidence about the line itself.
export type Coverage = { granularity: "line" | "file" };
