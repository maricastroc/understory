import * as vscode from "vscode";
import { getCurrentTarget } from "./target";
import { investigate, retry } from "./investigate";
import * as panel from "./webview/panel";

export function activate(context: vscode.ExtensionContext) {
  panel.setMessageListener((msg) => {
    if (msg.type === "retry") retry();
  });

  const command = vscode.commands.registerCommand("gitInvestigator.digCurrentLine", () => {
    try {
      void investigate(getCurrentTarget());
    } catch (e) {
      vscode.window.showWarningMessage(e instanceof Error ? e.message : String(e));
    }
  });

  context.subscriptions.push(command);
}

export function deactivate() {}
