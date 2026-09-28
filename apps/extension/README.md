# Git Investigator — VS Code extension

Investigate why a line of code is the way it is without leaving the editor. The extension embeds
the same core as the web app (`packages/core`, bundled by esbuild) and has no runtime dependencies.

## Commands

- **Git Investigator: Why is this line?** (`gitInvestigator.digCurrentLine`, also in the editor
  context menu) — investigates the line under the cursor. In `local` mode it runs in-process
  against the local git repo; in `backend` mode it calls `{backendUrl}/api/dig`.
- **Git Investigator: Full Investigation (in editor)** (`gitInvestigator.digCurrentLineFull`) —
  sends the workspace's GitHub/GitLab remote to `{webUrl}/api/dig`, so PRs, reviews and issues
  are collected from the provider, and lets you drill into any cited artifact from the panel.
- **Git Investigator: Open Full Investigation on the Web** (`gitInvestigator.openOnWeb`) — opens
  `{webUrl}/app?repo=…&file=…&line=…`.
- **Git Investigator: Set Groq API Key** / **Set GitHub Token** — stored in VS Code's
  SecretStorage. Without a Groq key the panel shows the evidence only; a GitHub token enriches
  local history with the PRs, issues and reviews behind each commit and is sent along for private
  repositories.

## Settings

- `gitInvestigator.mode` — `local` (default) or `backend`.
- `gitInvestigator.backendUrl` — default `http://localhost:3000`, used in `backend` mode.
- `gitInvestigator.webUrl` — default `https://git-investigator.marianacastro.dev`, used by the full
  investigation and by Open on the Web.

## Develop

Install from the repository root (`npm install`; the extension is an npm workspace), then in this
folder:

```bash
npm run compile      # or: npm run watch
npm run typecheck
```

Open this folder in VS Code and press **F5** ("Run Extension"): it compiles and launches an
Extension Development Host.

## Package & install (`.vsix`)

```bash
npm run package      # → git-investigator-vscode-<version>.vsix, bundling dist/
code --install-extension git-investigator-vscode-0.0.1.vsix
```

Or from the UI: **Extensions** view → `···` menu → **Install from VSIX…**. Close the Extension
Development Host first so the commands aren't registered twice.
