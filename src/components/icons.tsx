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
  MessageSquare,
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
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <line
        x1="15"
        y1="15"
        x2="21"
        y2="21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="1.9" fill="currentColor" />
      <line x1="10" y1="4.5" x2="10" y2="8" stroke="currentColor" strokeWidth="1.6" />
      <line x1="10" y1="12" x2="10" y2="15.5" stroke="currentColor" strokeWidth="1.6" />
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
  User,
  Users,
  X as Close,
  ChevronRight,
  ChevronLeft,
};
