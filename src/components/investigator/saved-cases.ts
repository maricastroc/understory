import type { SavedCase } from "./saved-case";

export async function fetchSavedCases(): Promise<{ cases: SavedCase[]; persisted: boolean }> {
  try {
    const res = await fetch("/api/investigations");
    const data = (await res.json()) as { investigations?: SavedCase[]; persisted?: boolean };
    return { cases: data.investigations ?? [], persisted: data.persisted === true };
  } catch {
    return { cases: [], persisted: false };
  }
}
