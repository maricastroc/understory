import Link from "next/link";
import { Github, Logo } from "@/components/icons";

const authEnabled = !!process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID;

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <span className="flex min-w-0 items-center gap-1">
          <Logo className="size-[26px] shrink-0 text-accent" />
          <span className="truncate text-[15px] font-semibold tracking-tight">
            Git <span className="text-accent">Investigator</span>
          </span>
        </span>
        <span className="ml-3 hidden font-mono text-[11px] text-ink-3 sm:inline">
          {`// code archaeology`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {authEnabled && (
            <a
              href="/api/auth/login"
              className="hidden h-9 items-center gap-2 rounded-md border border-line-2 bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-inset sm:inline-flex"
            >
              <Github className="size-4" />
              Sign in
            </a>
          )}
          <Link
            href="/app"
            className="inline-flex h-9 items-center rounded-md bg-accent px-3.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-accent-press"
          >
            Open app
          </Link>
        </div>
      </nav>
    </header>
  );
}
