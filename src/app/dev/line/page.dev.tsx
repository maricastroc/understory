import { LinePreview } from "./line-preview";

export default async function LinePreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <LinePreview state={params.state ?? "resolved"} user={params.user ?? null} />;
}
