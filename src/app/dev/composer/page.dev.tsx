import { ComposerPreview } from "./composer-preview";

export default async function ComposerPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const files = Number(params.files);
  return (
    <ComposerPreview
      state={params.state ?? "cold"}
      files={Number.isInteger(files) && files > 0 ? files : null}
    />
  );
}
