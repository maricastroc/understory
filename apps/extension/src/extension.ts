import * as vscode from "vscode";
import { getWebUrl } from "./config";
import { drill, investigate, investigateRemote, retry } from "./investigate";
import { initNudge } from "./nudge";
import { initSecrets, setGithubTokenInteractive, setGroqKeyInteractive } from "./secrets";
import { getCurrentTarget } from "./target";
import * as panel from "./webview/panel";
import { isArtifactRef } from "./webview/render";
import { buildWebUrl, detectRemoteUrl } from "./web-link";

export function activate(context: vscode.ExtensionContext) {
  initSecrets(context.secrets);
  initNudge(context.globalState);

  panel.setMessageListener((msg) => {
    if (msg.type === "retry") retry();
    else if (msg.type === "drill" && isArtifactRef(msg.ref)) void drill(msg.ref);
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("gitInvestigator.digCurrentLine", () => {
      try {
        void investigate(getCurrentTarget());
      } catch (e) {
        vscode.window.showWarningMessage(e instanceof Error ? e.message : String(e));
      }
    }),
    vscode.commands.registerCommand("gitInvestigator.digCurrentLineFull", () => {
      try {
        void investigateRemote(getCurrentTarget());
      } catch (e) {
        vscode.window.showWarningMessage(e instanceof Error ? e.message : String(e));
      }
    }),
    vscode.commands.registerCommand("gitInvestigator.openOnWeb", () => openOnWeb()),
    vscode.commands.registerCommand("gitInvestigator.setGroqKey", () => setGroqKeyInteractive()),
    vscode.commands.registerCommand("gitInvestigator.setGithubToken", () =>
      setGithubTokenInteractive(),
    ),
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
