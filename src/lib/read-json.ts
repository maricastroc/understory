export async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? "The server sent an unexpected response — please try again."
        : `The server hit an error (${res.status}) — please try again in a moment.`,
    );
  }
}
