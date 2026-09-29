import * as vscode from "vscode";
import type { ArtifactRef, DigResult } from "@understory/core";
import { type ErrorView, renderError, renderLoading, renderResult } from "./render";

export type WebviewMessage = { type: "retry" } | { type: "drill"; ref: ArtifactRef };

let panel: vscode.WebviewPanel | undefined;
let messageListener: ((msg: WebviewMessage) => void) | undefined;

export function setMessageListener(fn: (msg: WebviewMessage) => void): void {
  messageListener = fn;
}

function nonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 32; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function ensurePanel(): vscode.WebviewPanel {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside, true);
    return panel;
  }
  panel = vscode.window.createWebviewPanel(
    "understory.result",
    "Understory",
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    { enableScripts: true, retainContextWhenHidden: true },
  );
  panel.webview.onDidReceiveMessage((msg: WebviewMessage) => messageListener?.(msg));
  panel.onDidDispose(() => {
    panel = undefined;
  });
  return panel;
}

export function showLoading(location: string): void {
  ensurePanel().webview.html = renderLoading(nonce(), location);
}

export function showResult(
  result: DigResult,
  location: string,
  opts: { canDrill?: boolean } = {},
): void {
  ensurePanel().webview.html = renderResult(nonce(), result, location, opts);
}

export function showError(view: ErrorView, location: string): void {
  ensurePanel().webview.html = renderError(nonce(), view, location);
}
