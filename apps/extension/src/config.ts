import * as vscode from "vscode";

export function getBackendUrl(): string {
  const configured = vscode.workspace
    .getConfiguration("gitInvestigator")
    .get<string>("backendUrl");
  return (configured ?? "http://localhost:3000").replace(/\/+$/, "");
}
