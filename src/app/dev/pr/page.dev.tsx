import { PrPreview } from "./pr-preview";

export default async function PrPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <PrPreview state={params.state ?? "default"} user={params.user ?? null} />;
}
