import * as vscode from "vscode";
import { runDig } from "./client/dig";
import { DigError } from "./client/errors";
import { getBackendUrl } from "./config";
import type { InvestigationTarget } from "./target";
import * as panel from "./webview/panel";
import type { ErrorView } from "./webview/render";

let current: InvestigationTarget | undefined;

export async function investigate(target: InvestigationTarget): Promise<void> {
  current = target;
  const backendUrl = getBackendUrl();
  panel.showLoading(target.location);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Git Investigator — investigating ${target.location}…`,
      cancellable: true,
    },
    async (_progress, token) => {
      const controller = new AbortController();
      token.onCancellationRequested(() => controller.abort());
      try {
        const result = await runDig(
          backendUrl,
          { repoPath: target.workspacePath, location: target.location },
          controller.signal,
        );
        panel.showResult(result, target.location);
      } catch (e) {
        panel.showError(errorView(e, backendUrl), target.location);
      }
    },
  );
}

export function retry(): void {
  if (current) void investigate(current);
}

function errorView(e: unknown, backendUrl: string): ErrorView {
  if (e instanceof DigError && e.kind === "offline") {
    return {
      tone: "error",
      title: "Backend unreachable",
      message: e.message,
      hint: `Start it from the project root with \`npm run dev\`, or point \`gitInvestigator.backendUrl\` at a running backend (currently ${backendUrl}).`,
    };
  }
  if (e instanceof DigError && e.kind === "cancelled") {
    return { tone: "muted", title: "Cancelled", message: "The investigation was cancelled." };
  }
  return {
    tone: "error",
    title: "Investigation failed",
    message: e instanceof Error ? e.message : String(e),
  };
}
