import * as vscode from "vscode";

const KEY = "groqApiKey";

let store: vscode.SecretStorage | undefined;

export function initSecrets(secretStorage: vscode.SecretStorage): void {
  store = secretStorage;
}

export async function getGroqKey(): Promise<string | undefined> {
  return store ? store.get(KEY) : undefined;
}

export async function setGroqKeyInteractive(): Promise<void> {
  const value = await vscode.window.showInputBox({
    prompt: "Groq API key — stored securely in VS Code SecretStorage",
    placeHolder: "gsk_…",
    password: true,
    ignoreFocusOut: true,
  });
  if (value === undefined) return;

  const trimmed = value.trim();
  if (!trimmed) {
    await store?.delete(KEY);
    vscode.window.showInformationMessage("Git Investigator: Groq API key cleared.");
    return;
  }

  await store?.store(KEY, trimmed);
  vscode.window.showInformationMessage("Git Investigator: Groq API key saved.");
}
