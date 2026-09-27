import type { AuthUser } from "../investigator/use-auth";
import { initials } from "./initials";
import type { RailFooterInfo } from "./types";

export function railFooterInfo(user: AuthUser | null, persisted: boolean): RailFooterInfo {
  if (!user) return { name: "Guest", initials: "?", subline: "Sign in to save line cases" };
  return {
    name: user.name,
    initials: initials(user.name),
    subline: persisted
      ? "Line cases saved across devices"
      : "Line cases aren't saved on this server",
  };
}
