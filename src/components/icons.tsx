import {
  BookMarked,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  ExternalLink,
  FileText,
  GitBranch,
  GitCommitHorizontal,
  GitFork,
  GitPullRequest,
  Lock,
  Menu,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Star,
  TriangleAlert,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ArtifactKind } from "@/lib/types";

type IconProps = { className?: string };

/** The one hand-drawn mark: a magnifying glass over a commit node. */
export function Logo({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <line x1="7" y1="2.5" x2="7" y2="21.5" strokeWidth="1.7" />
      <circle cx="7" cy="5" r="1.5" strokeWidth="1.7" />
      <circle cx="7" cy="19" r="1.5" strokeWidth="1.7" />
      <path d="M7 12 h5.5 a3 3 0 0 1 3 3 v4" strokeWidth="1.7" />
      <circle cx="15.5" cy="19" r="1.5" strokeWidth="1.7" />
      <circle cx="7" cy="12" r="4" strokeWidth="1.6" opacity="0.4" />
      <circle cx="7" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** GitHub mark — lucide dropped brand icons, so it's drawn here. */
export function Github({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const kindIcons: Record<ArtifactKind, LucideIcon> = {
  commit: GitCommitHorizontal,
  pull_request: GitPullRequest,
  issue: CircleDot,
  review: MessageSquare,
};

export function KindIcon({ kind, className }: { kind: ArtifactKind; className?: string }) {
  const Icon = kindIcons[kind] ?? GitCommitHorizontal;
  return <Icon className={className} />;
}

export const kindLabel: Record<ArtifactKind, string> = {
  commit: "Commit",
  pull_request: "Pull request",
  issue: "Issue",
  review: "Review",
};

export {
  GitCommitHorizontal as Commit,
  GitPullRequest as PullRequest,
  CircleDot as Issue,
  MessageSquare as Review,
  Search,
  Plus,
  BookMarked as Repo,
  GitBranch as Branch,
  Clock,
  FileText as FileIcon,
  Check,
  TriangleAlert as Alert,
  ExternalLink,
  Lock,
  ShieldCheck as Shield,
  Star,
  GitFork as Fork,
  Pencil,
  User,
  Users,
  X as Close,
  ChevronRight,
  ChevronLeft,
  Menu,
};
