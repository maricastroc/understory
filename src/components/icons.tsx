import type { ArtifactKind } from "@/lib/types";

type IconProps = { className?: string };
const base = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  "aria-hidden": true,
} as const;

export function Logo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="10" r="1.9" fill="currentColor" />
      <line x1="10" y1="4.5" x2="10" y2="8" stroke="currentColor" strokeWidth="1.6" />
      <line x1="10" y1="12" x2="10" y2="15.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function Commit({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="8" r="2.6" strokeWidth="1.4" />
      <line x1="1.5" y1="8" x2="5.4" y2="8" strokeWidth="1.4" />
      <line x1="10.6" y1="8" x2="14.5" y2="8" strokeWidth="1.4" />
    </svg>
  );
}

export function PullRequest({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="4" cy="4" r="1.7" strokeWidth="1.3" />
      <circle cx="4" cy="12" r="1.7" strokeWidth="1.3" />
      <path d="M4 5.7v4.6" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="1.7" strokeWidth="1.3" />
      <path d="M12 10.3V7a3 3 0 0 0-3-3H6" strokeWidth="1.3" />
      <path d="M7.5 2.5 5.5 4l2 1.5" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function Issue({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="8" r="6" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Review({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function KindIcon({ kind, className }: { kind: ArtifactKind; className?: string }) {
  if (kind === "pull_request") return <PullRequest className={className} />;
  if (kind === "issue") return <Issue className={className} />;
  if (kind === "review") return <Review className={className} />;
  return <Commit className={className} />;
}

export const kindLabel: Record<ArtifactKind, string> = {
  commit: "Commit",
  pull_request: "Pull request",
  issue: "Issue",
  review: "Review",
};

export function Search({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="7" cy="7" r="4.5" strokeWidth="1.5" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Plus({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <line x1="8" y1="3" x2="8" y2="13" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="3" y1="8" x2="13" y2="8" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function Repo({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 2.5h8a1.5 1.5 0 0 1 1.5 1.5v9.5L11 12H4a1.5 1.5 0 0 1-1.5-1.5v-8Z" strokeWidth="1.3" />
      <path d="M5 2.5v9" strokeWidth="1.3" />
    </svg>
  );
}

export function Branch({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="4" cy="4" r="1.6" strokeWidth="1.3" />
      <circle cx="4" cy="12" r="1.6" strokeWidth="1.3" />
      <path d="M4 5.6v4.8" strokeWidth="1.3" />
      <circle cx="12" cy="4" r="1.6" strokeWidth="1.3" />
      <path d="M12 5.6C12 9 9 8 6 9" strokeWidth="1.3" />
    </svg>
  );
}

export function Clock({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="8" r="6" strokeWidth="1.3" />
      <path d="M8 4.8V8l2.2 1.4" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function FileIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 2.5h5.5L13 6v7.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z" strokeWidth="1.3" />
      <path d="M9 2.5V6h4" strokeWidth="1.3" />
    </svg>
  );
}

export function Check({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 8.5l3.2 3.2L13 5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Alert({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8 2.2 14.5 13.5H1.5L8 2.2Z" strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="8" y1="6.4" x2="8" y2="9.6" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.4" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ExternalLink({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h7v7M13 3 4 12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Lock({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.2" strokeWidth="1.3" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" strokeWidth="1.3" />
    </svg>
  );
}

export function Shield({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8 1.5 13.5 4v4c0 3.4-2.3 5.6-5.5 6.5C4.8 13.6 2.5 11.4 2.5 8V4L8 1.5Z" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.8 8l1.6 1.6L10.5 6.3" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Users({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="6" cy="5" r="2.3" strokeWidth="1.3" />
      <path d="M2.2 13c0-2.3 1.7-3.8 3.8-3.8S9.8 10.7 9.8 13" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="11.4" cy="5.6" r="1.8" strokeWidth="1.2" />
      <path d="M11 9.3c1.8 0 2.9 1.3 2.9 3.2" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronRight({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3l5 5-5 5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
