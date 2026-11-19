# Developing the Understory extension

The extension embeds the same core as the web app (`packages/core`, bundled by esbuild) and has no runtime dependencies.

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
npm run package      # → understory-vscode-<version>.vsix, bundling dist/
code --install-extension understory-vscode-<version>.vsix
```

Or from the UI: **Extensions** view → `···` menu → **Install from VSIX…**. Close the Extension
Development Host first so the commands aren't registered twice.
