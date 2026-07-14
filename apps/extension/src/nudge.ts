import * as vscode from "vscode";

let state: vscode.Memento | undefined;

export function initNudge(memento: vscode.Memento): void {
  state = memento;
}

export async function nudgeOnce(
  key: string,
  message: string,
  action: string,
  command: string,
): Promise<void> {
  if (!state || state.get<boolean>(key)) return;
  await state.update(key, true);
  const pick = await vscode.window.showInformationMessage(message, action);
  if (pick) void vscode.commands.executeCommand(command);
}
