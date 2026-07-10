import * as vscode from "vscode";

const GROQ_KEY = "groqApiKey";
const GITHUB_KEY = "githubToken";

let store: vscode.SecretStorage | undefined;

export function initSecrets(secretStorage: vscode.SecretStorage): void {
  store = secretStorage;
}

async function setSecretInteractive(
  key: string,
  label: string,
  opts: { prompt: string; placeHolder: string },
): Promise<void> {
  const value = await vscode.window.showInputBox({
    prompt: opts.prompt,
    placeHolder: opts.placeHolder,
    password: true,
    ignoreFocusOut: true,
  });
  if (value === undefined) return;

  const trimmed = value.trim();
  if (!trimmed) {
    await store?.delete(key);
    vscode.window.showInformationMessage(`Git Investigator: ${label} cleared.`);
    return;
  }

  await store?.store(key, trimmed);
  vscode.window.showInformationMessage(`Git Investigator: ${label} saved.`);
}

export async function getGroqKey(): Promise<string | undefined> {
  return store ? store.get(GROQ_KEY) : undefined;
}

export function setGroqKeyInteractive(): Promise<void> {
  return setSecretInteractive(GROQ_KEY, "Groq API key", {
    prompt: "Groq API key — stored securely in VS Code SecretStorage",
    placeHolder: "gsk_…",
  });
}

export async function getGithubToken(): Promise<string | undefined> {
  return store ? store.get(GITHUB_KEY) : undefined;
}

export function setGithubTokenInteractive(): Promise<void> {
  return setSecretInteractive(GITHUB_KEY, "GitHub token", {
    prompt:
      "GitHub token for private repos — a classic PAT with the `repo` scope. Stored in VS Code SecretStorage.",
    placeHolder: "ghp_…",
  });
}
