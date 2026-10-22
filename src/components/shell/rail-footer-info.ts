import type { Messages } from "@/i18n/messages";
import type { AuthUser } from "../investigator/use-auth";
import { initials } from "./initials";
import type { RailFooterInfo } from "./types";

export function railFooterInfo(
  user: AuthUser | null,
  persisted: boolean,
  m: Messages,
): RailFooterInfo {
  if (!user) {
    return { name: m.shell.guest, initials: "?", subline: m.shell.guestHint, guest: true };
  }
  return {
    name: user.name,
    initials: initials(user.name),
    subline: persisted ? m.shell.savedEverywhere : m.shell.notSaved,
  };
}
