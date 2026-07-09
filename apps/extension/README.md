# Git Investigator — VS Code extension

Third frontend over the `src/lib` investigation core (alongside the CLI and the Next.js API).
It talks to a configurable backend over HTTP — it does **not** bundle the core.

## Status

- **Phase 1 (done):** scaffold + `gitInvestigator.digCurrentLine` command that captures the
  current workspace, active file and cursor line.
- **Phase 2 (done):** the command POSTs `{ repoPath, location }` to `{backendUrl}/api/dig` and
  renders loading → result → error in a Webview (answer, confidence, honest abstention,
  contradictions, evidence). Network happens in the extension host; the Webview only renders.
- **Phase 3 (done):** Webview layout polish (answer card + confidence + provenance timeline with
  kind-colored nodes), typed error states (backend offline / cancelled / failed) with an actionable
  hint, a **Re-investigate / Try again** button (webview→host `postMessage`), and the editor
  right-click menu entry.

## Try Phase 2

1. Start the backend from the repo root: `npm run dev` (serves `http://localhost:3000`).
   For the written summary, `GROQ_API_KEY` must be set in `.env.local`; without it the Webview
   shows the collected evidence plus a notice.
2. Press **F5** here (or reload the Extension Development Host with `Cmd+R` if it's already open,
   so it picks up the latest compiled code).
3. In the dev host window, open a file in a git repo, put the cursor on a line, and run
   **"Git Investigator: Why is this line?"**. A panel opens beside the editor with the result.

## Settings

- `gitInvestigator.backendUrl` (default `http://localhost:3000`) — the extension calls
  `{backendUrl}/api/dig`.

## Package & install (`.vsix`)

The extension has no runtime dependencies, so packaging bundles only the compiled `out/`.

```bash
npm run package      # → git-investigator-vscode-<version>.vsix
```

Install the built `.vsix` into any VS Code (no repo clone needed):

```bash
code --install-extension git-investigator-vscode-0.0.1.vsix
```

Or from the UI: **Extensions** view → `···` menu → **Install from VSIX…**. If the Extension
Development Host is open, close it first so the command isn't registered twice.

## Develop

```bash
npm install
npm run compile      # or: npm run watch
```

Then open this folder in VS Code and press **F5** ("Run Extension") to launch an Extension
Development Host. In that window, open any file, put the cursor on a line, and run
**"Git Investigator: Why is this line?"** from the Command Palette or the editor right-click menu.
