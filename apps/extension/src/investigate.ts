import * as vscode from "vscode";
import type { ArtifactRef } from "@understory/core";
import { runDig } from "./client/dig";
import { DigError } from "./client/errors";
import { runLocalDig } from "./client/local";
import { type Mode, getBackendUrl, getMode, getWebUrl } from "./config";
import { nudgeOnce } from "./nudge";
import { getGithubToken, getGroqKey } from "./secrets";
import type { InvestigationTarget } from "./target";
import * as panel from "./webview/panel";
import type { ErrorView } from "./webview/render";
import { detectRemoteUrl } from "./web-link";

let lastRun: (() => Promise<void>) | undefined;

let drillContext: { repoPath: string; baseUrl: string } | undefined;

function withProgress(
  title: string,
  run: (token: vscode.CancellationToken) => Promise<void>,
): Thenable<void> {
  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title, cancellable: true },
    (_progress, token) => run(token),
  );
}

export async function investigate(target: InvestigationTarget): Promise<void> {
  lastRun = () => investigate(target);
  drillContext = undefined;
  const mode = getMode();
  panel.showLoading(target.location);

  await withProgress(`Understory — investigating ${target.location}…`, async (token) => {
    try {
      if (mode === "local") await runLocal(target, token);
      else await runBackend(target, target.workspacePath, getBackendUrl(), token);
    } catch (e) {
      panel.showError(errorView(e, mode), target.location);
    }
  });
}

export async function investigateRemote(target: InvestigationTarget): Promise<void> {
  lastRun = () => investigateRemote(target);
  panel.showLoading(target.location);

  const remote = await detectRemoteUrl(target.workspacePath);
  if (!remote) {
    panel.showError(
      {
        tone: "error",
        title: "No remote repository",
        message: "This workspace has no GitHub/GitLab remote.",
        hint: "Full provenance (PRs, reviews, issues) is collected from the remote's API — this repo needs a remote. Use “Why is this line?” for local commit history.",
      },
      target.location,
    );
    return;
  }

  await withProgress(`Understory — full investigation of ${target.location}…`, async (token) => {
    try {
      await runBackend(target, remote, getWebUrl(), token);
    } catch (e) {
      panel.showError(errorView(e, "backend"), target.location);
    }
  });
}

async function runLocal(
  target: InvestigationTarget,
  token: vscode.CancellationToken,
): Promise<void> {
  const [apiKey, githubToken] = await Promise.all([getGroqKey(), getGithubToken()]);
  const result = await runLocalDig(target, apiKey, githubToken);
  if (token.isCancellationRequested) return;
  panel.showResult(result, target.location);

  if (!apiKey) {
    vscode.window
      .showInformationMessage(
        "Understory: no Groq API key set — showing evidence only. Set one to get written answers.",
        "Set Groq API Key",
      )
      .then((pick) => {
        if (pick) void vscode.commands.executeCommand("understory.setGroqKey");
      });
  } else if (!githubToken && result.evidence.repo.remoteUrl?.includes("github.com")) {
    void nudgeOnce(
      "githubTokenLocalEnrich",
      "Understory: set a GitHub token to enrich local history with the PRs, issues, and reviews behind each commit.",
      "Set GitHub Token",
      "understory.setGithubToken",
    );
  }
}

async function runBackend(
  target: InvestigationTarget,
  repoPath: string,
  baseUrl: string,
  token: vscode.CancellationToken,
): Promise<void> {
  const controller = new AbortController();
  token.onCancellationRequested(() => controller.abort());
  const githubToken = await getGithubToken();
  const result = await runDig(
    baseUrl,
    { repoPath, location: target.location },
    controller.signal,
    githubToken,
  );
  //
  drillContext = { repoPath, baseUrl };
  panel.showResult(result, target.location, { canDrill: true });
}

export async function drill(ref: ArtifactRef): Promise<void> {
  const ctx = drillContext;
  if (!ctx) return;
  const label = ref.ref ?? ref.id;
  lastRun = () => drill(ref);
  panel.showLoading(label);

  await withProgress(`Understory — investigating ${label}…`, async (token) => {
    try {
      const controller = new AbortController();
      token.onCancellationRequested(() => controller.abort());
      const githubToken = await getGithubToken();
      const result = await runDig(
        ctx.baseUrl,
        { repoPath: ctx.repoPath, target: ref },
        controller.signal,
        githubToken,
      );
      panel.showResult(result, label, { canDrill: true });
    } catch (e) {
      panel.showError(errorView(e, "backend"), label);
    }
  });
}

export function retry(): void {
  void lastRun?.();
}

function errorView(e: unknown, mode: Mode): ErrorView {
  if (e instanceof DigError && e.kind === "offline") {
    return {
      tone: "error",
      title: "Backend unreachable",
      message: e.message,
      hint: `Start it with \`npm run dev\`, or point \`understory.backendUrl\` at a running backend.`,
    };
  }
  if (e instanceof DigError && e.kind === "cancelled") {
    return { tone: "muted", title: "Cancelled", message: "The investigation was cancelled." };
  }

  const message = e instanceof Error ? e.message : String(e);
  if (mode === "local" && /not a git repository|no path|does not have any commits/i.test(message)) {
    return {
      tone: "error",
      title: "Can't read git history",
      message,
      hint: "Open a folder that is a git repository with local commit history.",
    };
  }
  if (/\b404\b|not found|private|GITHUB_TOKEN/i.test(message)) {
    return {
      tone: "error",
      title: "Repository not accessible",
      message,
      hint: "If this is a private repo, run “Understory: Set GitHub Token” (a classic PAT with the `repo` scope), then try again.",
    };
  }
  return { tone: "error", title: "Investigation failed", message };
}
