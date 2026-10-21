export function readingOn(
  params: Record<string, string | string[] | undefined>,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.UNDERSTORY_READING === "1") return true;
  return env.NODE_ENV !== "production" && params.reading === "1";
}
