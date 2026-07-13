import type { Artifact, DigResult, VerifiedNarrative } from "@git-investigator/core";

export type ErrorView = {
  tone: "error" | "muted";
  title: string;
  message: string;
  hint?: string;
};

const KIND_LABEL: Record<string, string> = {
  commit: "Commit",
  pull_request: "Pull Request",
  issue: "Issue",
  review: "Review",
};

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function page(nonce: string, location: string, body: string, footer = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<style>${STYLES}</style>
</head>
<body>
<header>
  <span class="eyebrow">Why is this line?</span>
  <h1>${esc(location)}</h1>
</header>
<main>${body}</main>
${footer}
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const retry = document.getElementById('retry');
  if (retry) retry.addEventListener('click', () => vscode.postMessage({ type: 'retry' }));
</script>
</body>
</html>`;
}

function retryFooter(label: string): string {
  return `<footer><button id="retry">${esc(label)}</button></footer>`;
}

export function renderLoading(nonce: string, location: string): string {
  return page(
    nonce,
    location,
    `<section class="loading"><span class="pulse"></span> Digging through history…</section>`,
  );
}

export function renderError(nonce: string, view: ErrorView, location: string): string {
  const hint = view.hint ? `<p class="hint">${esc(view.hint)}</p>` : "";
  return page(
    nonce,
    location,
    `<section class="banner ${view.tone === "error" ? "error" : "muted-banner"}">
      <h2 class="banner-title">${esc(view.title)}</h2>
      <p>${esc(view.message)}</p>
      ${hint}
    </section>`,
    retryFooter("Try again"),
  );
}

export function renderResult(nonce: string, result: DigResult, location: string): string {
  const parts: string[] = [];
  if (result.error) {
    parts.push(`<section class="banner warn"><p>${esc(result.error)}</p></section>`);
  }
  parts.push(renderNarrative(result.narrative));

  const { artifacts, contradictions, note } = result.evidence;
  if (note) parts.push(`<section class="note">${esc(note)}</section>`);
  if (contradictions.length) parts.push(renderContradictions(contradictions));
  parts.push(renderChain(artifacts));

  return page(nonce, location, parts.join("\n"), retryFooter("Re-investigate"));
}

function renderNarrative(narrative: VerifiedNarrative | null): string {
  if (!narrative) {
    return `<section class="note">No written summary — the collected evidence below still stands.</section>`;
  }

  if (!narrative.answerable) {
    return `<section class="answer-card abstain">
      <div class="card-label">The record doesn't say</div>
      <p>${esc(narrative.answer)}</p>
    </section>`;
  }

  const c = narrative.confidence;
  const grounding = narrative.grounded
    ? ""
    : `<p class="ungrounded">⚠ Some claims cite artifacts not in the evidence${
        narrative.unknownCitations.length ? `: ${esc(narrative.unknownCitations.join(", "))}` : ""
      }.</p>`;

  const answer = narrative.answer
    .split(/\n\n+/)
    .map((p) => `<p>${esc(p.trim())}</p>`)
    .join("");

  return `<section class="answer-card">
    <div class="confidence ${c.level}">
      <span class="dot"></span><span class="level">${c.level} confidence</span>
      <span class="counts">${c.primarySources} primary · ${c.corroborating} corroborating · ${c.contradicting} contradicting</span>
    </div>
    <div class="answer">${answer}</div>
    ${grounding}
    ${renderEntailment(narrative.entailment)}
  </section>`;
}

function renderEntailment(entailment: VerifiedNarrative["entailment"]): string {
  if (!entailment?.checked) return "";

  if (entailment.misattributed > 0) {
    const n = entailment.misattributed;
    return `<p class="ungrounded">⚠ ${n} cited source${n > 1 ? "s" : ""} not substantiated by its own content.</p>`;
  }

  const proven = entailment.checks.filter((x) => x.status === "supported" && x.quote);
  if (proven.length === 0) return "";
  const quotes = proven
    .map((x) => `<li class="quote">“${esc(x.quote ?? "")}”</li>`)
    .join("");
  return `<div class="substantiated">✓ Substantiated in-source<ul class="quotes">${quotes}</ul></div>`;
}

function renderContradictions(contradictions: DigResult["evidence"]["contradictions"]): string {
  const items = contradictions
    .map(
      (x) =>
        `<li><span class="tag warn-tag">${esc(x.kind)}</span> ${esc(x.detail)}${
          x.by ? ` <span class="muted">— ${esc(x.by)}</span>` : ""
        }</li>`,
    )
    .join("");
  return `<section><h2>Contradictions</h2><ul class="flat">${items}</ul></section>`;
}

function renderChain(artifacts: Artifact[]): string {
  if (!artifacts.length) {
    return `<section class="note">No supporting artifacts were collected.</section>`;
  }

  const ordered = [...artifacts].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const items = ordered
    .map((a) => {
      const label = KIND_LABEL[a.kind] ?? a.kind;
      const who = a.author?.name ? `<span class="muted">${esc(a.author.name)}</span>` : "";
      const when = a.date ? `<span class="muted">${esc(a.date.slice(0, 10))}</span>` : "";
      const parent = a.parentId ? `<span class="muted">↳ from ${esc(a.parentId)}</span>` : "";
      const snippet = a.body.split("\n").slice(1).join("\n").trim().slice(0, 280);
      const link = a.url ? `<a href="${esc(a.url)}">${esc(a.id)}</a>` : `<code>${esc(a.id)}</code>`;
      return `<li class="node ${esc(a.kind)}">
        <div class="node-head"><span class="tag">${esc(label)}</span> ${link} ${who} ${when} ${parent}</div>
        <div class="node-title">${esc(a.title)}</div>
        ${snippet ? `<div class="node-body">${esc(snippet)}</div>` : ""}
      </li>`;
    })
    .join("");

  return `<section><h2>Provenance <span class="muted">(${artifacts.length})</span></h2>
    <ul class="chain">${items}</ul>
  </section>`;
}

const STYLES = `
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 0 6px 24px; line-height: 1.5; font-size: 13px; }
  header { padding: 16px 0 10px; border-bottom: 1px solid var(--vscode-panel-border); margin-bottom: 16px; }
  .eyebrow { text-transform: uppercase; letter-spacing: .08em; font-size: 11px; color: var(--vscode-descriptionForeground); }
  h1 { font-size: 15px; margin: 4px 0 0; font-family: var(--vscode-editor-font-family); font-weight: 600; word-break: break-all; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--vscode-descriptionForeground); margin: 26px 0 10px; }
  section { margin-bottom: 12px; }
  p { margin: 8px 0; }
  a { color: var(--vscode-textLink-foreground); text-decoration: none; }
  a:hover { text-decoration: underline; }
  code { font-family: var(--vscode-editor-font-family); }
  .muted { color: var(--vscode-descriptionForeground); }
  .note { color: var(--vscode-descriptionForeground); font-size: 13px; }

  .loading { color: var(--vscode-descriptionForeground); display: flex; align-items: center; gap: 8px; }
  .pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--vscode-progressBar-background, var(--vscode-foreground)); animation: pulse 1.1s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: .3; } 50% { opacity: 1; } }

  .banner { padding: 12px 14px; border-radius: 6px; border: 1px solid var(--vscode-panel-border); }
  .banner-title { margin: 0 0 4px; color: var(--vscode-foreground); }
  .banner.error { border-color: var(--vscode-inputValidation-errorBorder); background: var(--vscode-inputValidation-errorBackground); }
  .banner.warn { border-color: var(--vscode-inputValidation-warningBorder); background: var(--vscode-inputValidation-warningBackground); }
  .banner.muted-banner { background: var(--vscode-textBlockQuote-background); }
  .hint { font-size: 12px; color: var(--vscode-descriptionForeground); }

  .answer-card { background: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-textLink-foreground); border-radius: 4px; padding: 12px 16px; }
  .answer-card.abstain { border-left-color: var(--vscode-descriptionForeground); }
  .card-label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--vscode-descriptionForeground); margin-bottom: 6px; }
  .answer { font-size: 14px; }
  .confidence { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 11px; margin-bottom: 10px; color: var(--vscode-descriptionForeground); }
  .confidence .level { text-transform: uppercase; letter-spacing: .05em; }
  .confidence .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; background: var(--vscode-descriptionForeground); }
  .confidence.high .dot { background: var(--vscode-charts-green); }
  .confidence.medium .dot { background: var(--vscode-charts-yellow); }
  .confidence.low .dot { background: var(--vscode-charts-red); }
  .ungrounded { color: var(--vscode-editorWarning-foreground); font-size: 13px; }
  .substantiated { color: var(--vscode-charts-green); font-size: 12px; margin-top: 8px; }
  .quotes { margin: 4px 0 0; }
  .quote { color: var(--vscode-descriptionForeground); font-style: italic; font-size: 12px; padding: 2px 0 2px 10px; border-left: 2px solid var(--vscode-charts-green); margin-top: 4px; }

  ul { list-style: none; padding: 0; margin: 0; }
  ul.flat li { padding: 6px 0; }
  .chain { position: relative; }
  .node { position: relative; padding: 10px 0 10px 18px; border-left: 2px solid var(--vscode-panel-border); margin-left: 4px; }
  .node::before { content: ""; position: absolute; left: -6px; top: 15px; width: 10px; height: 10px; border-radius: 50%; background: var(--vscode-editor-background); border: 2px solid var(--vscode-descriptionForeground); }
  .node.commit::before { border-color: var(--vscode-charts-green); }
  .node.pull_request::before { border-color: var(--vscode-charts-blue); }
  .node.issue::before { border-color: var(--vscode-charts-orange); }
  .node.review::before { border-color: var(--vscode-charts-purple); }
  .node-head { font-size: 12px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .node-title { font-weight: 600; margin: 3px 0; }
  .node-body { font-size: 12px; color: var(--vscode-descriptionForeground); white-space: pre-wrap; }

  .tag { display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; padding: 1px 6px; border-radius: 4px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
  .warn-tag { background: var(--vscode-inputValidation-warningBackground); color: var(--vscode-foreground); }

  footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid var(--vscode-panel-border); }
  button { font-family: inherit; font-size: 13px; color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; }
  button:hover { background: var(--vscode-button-hoverBackground); }
`;
