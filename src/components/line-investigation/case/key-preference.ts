const KEY = "gi:li-key-open";

export function readKeyPreference(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function writeKeyPreference(open: boolean): void {
  try {
    window.localStorage.setItem(KEY, open ? "1" : "0");
  } catch {
    return;
  }
}
