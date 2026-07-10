import * as vscode from "vscode";
import { getWebUrl } from "./config";
import { investigate, retry } from "./investigate";
import { initSecrets, setGroqKeyInteractive } from "./secrets";
import { getCurrentTarget } from "./target";
import * as panel from "./webview/panel";
import { buildWebUrl, detectRemoteUrl } from "./web-link";

export function activate(context: vscode.ExtensionContext) {
  initSecrets(context.secrets);

  panel.setMessageListener((msg) => {
    if (msg.type === "retry") retry();
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("gitInvestigator.digCurrentLine", () => {
      try {
        void investigate(getCurrentTarget());
      } catch (e) {
        vscode.window.showWarningMessage(e instanceof Error ? e.message : String(e));
      }
    }),
    vscode.commands.registerCommand("gitInvestigator.openOnWeb", () => openOnWeb()),
    vscode.commands.registerCommand("gitInvestigator.setGroqKey", () => setGroqKeyInteractive()),
  );
}

async function openOnWeb(): Promise<void> {
  let target: ReturnType<typeof getCurrentTarget>;
  try {
    target = getCurrentTarget();
  } catch (e) {
    vscode.window.showWarningMessage(e instanceof Error ? e.message : String(e));
    return;
  }

  const remote = await detectRemoteUrl(target.workspacePath);
  if (!remote) {
    vscode.window.showWarningMessage(
      "Git Investigator: no GitHub/GitLab remote found. A full investigation on the web needs a remote repository.",
    );
    return;
  }

  const url = buildWebUrl(getWebUrl(), remote, target.relativeFile, target.line);
  await vscode.env.openExternal(vscode.Uri.parse(url));
}

export function deactivate() {}
