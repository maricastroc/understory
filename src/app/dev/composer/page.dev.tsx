import { ComposerPreview } from "./composer-preview";

export default async function ComposerPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <ComposerPreview state={params.state ?? "cold"} />;
}
