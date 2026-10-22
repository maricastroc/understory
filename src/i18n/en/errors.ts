export const errors = {
  investigation: "The investigation couldn't be completed.",
  repository: "Couldn't open the repository.",
  notFound: "This repository looks private or doesn't exist.",
  rateLimited: (host: string) => `${host}'s rate limit was hit.`,
  busy: (wait: string) => `Too many requests in a row. Try again in ${wait}.`,
  busySoon: "Too many requests in a row. Try again in a moment.",
  tooLarge: "This case is too large to rewrite.",
  aiUnavailable: "AI reconstruction is unavailable for now.",
  ownerNotRepo:
    "That address points to a GitHub user or organization, not a repository. Use owner/repo or the repository's full URL.",
  notARepository: "That path isn't a git repository.",
  gitUnavailable:
    "Git isn't available here, so only GitHub repositories work. Use owner/repo or a full https://github.com/owner/repo URL.",
  server: "The server ran into a problem. Try again in a moment.",
  network: "Couldn't reach the server. Check your connection.",
  noEvidence: "The investigation came back without any evidence.",
  signInHint: "Signing in with GitHub is the easiest fix. No token needed.",
  installHint: "If the repository is private, install the Understory GitHub App to give it access.",
  installApp: "Install the GitHub App",
};
