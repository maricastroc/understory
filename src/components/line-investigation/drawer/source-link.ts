export function sourceLinkLabel(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (host === "github.com") return "Open on GitHub";
    if (host.includes("gitlab")) return "Open on GitLab";
    return "Open source";
  } catch {
    return "Open source";
  }
}
