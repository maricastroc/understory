"use client";

import { useEffect, useState } from "react";

export type AuthUser = { login: string; name: string; avatarUrl: string };

export const authEnabled = !!process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID;

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!authEnabled) return;
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user: AuthUser | null }) => {
        if (alive) setUser(d.user ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return user;
}
