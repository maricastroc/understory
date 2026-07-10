import * as vscode from "vscode";

export type Mode = "local" | "backend";

export function getMode(): Mode {
  return vscode.workspace.getConfiguration("gitInvestigator").get<Mode>("mode") ?? "local";
}

export function getBackendUrl(): string {
  const configured = vscode.workspace
    .getConfiguration("gitInvestigator")
    .get<string>("backendUrl");
  return (configured ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function getWebUrl(): string {
  const configured = vscode.workspace.getConfiguration("gitInvestigator").get<string>("webUrl");
  return (configured ?? "http://localhost:3000").replace(/\/+$/, "");
}
