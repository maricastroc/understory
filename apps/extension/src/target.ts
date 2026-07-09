import * as path from "path";
import * as vscode from "vscode";

export type InvestigationTarget = {
  workspacePath: string;
  relativeFile: string;
  line: number;
  location: string;
};

export function getCurrentTarget(): InvestigationTarget {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    throw new Error("Open a file and place the cursor on a line first.");
  }

  const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
  if (!folder) {
    throw new Error("The active file is not inside an open workspace folder.");
  }

  const workspacePath = folder.uri.fsPath;
  const relativeFile = path.relative(workspacePath, editor.document.uri.fsPath);
  const line = editor.selection.active.line + 1;

  return { workspacePath, relativeFile, line, location: `${relativeFile}:${line}` };
}
