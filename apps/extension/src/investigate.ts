import * as vscode from "vscode";
import { runDig } from "./client/dig";
import { DigError } from "./client/errors";
import { runLocalDig } from "./client/local";
import { type Mode, getBackendUrl, getMode } from "./config";
import { getGroqKey } from "./secrets";
import type { InvestigationTarget } from "./target";
import * as panel from "./webview/panel";
import type { ErrorView } from "./webview/render";

let current: InvestigationTarget | undefined;

export async function investigate(target: InvestigationTarget): Promise<void> {
  current = target;
  const mode = getMode();
  panel.showLoading(target.location);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Git Investigator — investigating ${target.location}…`,
      cancellable: true,
    },
    async (_progress, token) => {
      try {
        if (mode === "local") {
          await runLocal(target, token);
        } else {
          await runBackend(target, token);
        }
      } catch (e) {
        panel.showError(errorView(e, mode), target.location);
      }
    },
  );
}

async function runLocal(target: InvestigationTarget, token: vscode.CancellationToken): Promise<void> {
  const apiKey = await getGroqKey();
  const result = await runLocalDig(target, apiKey);
  if (token.isCancellationRequested) return;
  panel.showResult(result, target.location);

  if (!apiKey) {
    vscode.window
      .showInformationMessage(
        "Git Investigator: no Groq API key set — showing evidence only. Set one to get written answers.",
        "Set Groq API Key",
      )
      .then((pick) => {
        if (pick) void vscode.commands.executeCommand("gitInvestigator.setGroqKey");
      });
  }
}

async function runBackend(
  target: InvestigationTarget,
  token: vscode.CancellationToken,
): Promise<void> {
  const backendUrl = getBackendUrl();
  const controller = new AbortController();
  token.onCancellationRequested(() => controller.abort());
  const result = await runDig(
    backendUrl,
    { repoPath: target.workspacePath, location: target.location },
    controller.signal,
  );
  panel.showResult(result, target.location);
}

export function retry(): void {
  if (current) void investigate(current);
}

function errorView(e: unknown, mode: Mode): ErrorView {
  if (e instanceof DigError && e.kind === "offline") {
    return {
      tone: "error",
      title: "Backend unreachable",
      message: e.message,
      hint: `Start it with \`npm run dev\`, point \`gitInvestigator.backendUrl\` at a running backend, or switch \`gitInvestigator.mode\` to \`local\`.`,
    };
  }
  if (e instanceof DigError && e.kind === "cancelled") {
    return { tone: "muted", title: "Cancelled", message: "The investigation was cancelled." };
  }

  const message = e instanceof Error ? e.message : String(e);
  if (mode === "local" && /not a git repository|no path|does not have any commits/i.test(message)) {
    return {
      tone: "error",
      title: "Can't read git history",
      message,
      hint: "Open a folder that is a git repository with local commit history.",
    };
  }
  return { tone: "error", title: "Investigation failed", message };
}
