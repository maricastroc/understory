import { LinkPreview } from "./link-preview";

export default async function LinkPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  return <LinkPreview only={d === "a" || d === "b" || d === "c" ? d : null} />;
}
