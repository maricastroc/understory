import * as vscode from "vscode";

export type Mode = "local" | "backend";

export function getMode(): Mode {
  return vscode.workspace.getConfiguration("understory").get<Mode>("mode") ?? "local";
}

export function getBackendUrl(): string {
  const configured = vscode.workspace.getConfiguration("understory").get<string>("backendUrl");
  return (configured ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function getWebUrl(): string {
  const configured = vscode.workspace.getConfiguration("understory").get<string>("webUrl");
  return (configured ?? "http://localhost:3000").replace(/\/+$/, "");
}
