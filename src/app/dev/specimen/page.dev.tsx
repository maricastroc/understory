import path from "node:path";
import { headSha } from "@git-investigator/core/collect/git";
import { SpecimenPreview } from "./specimen-preview";

const DEMO_REPO = ".demo/payments-service";

export default async function SpecimenPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const demo = params.source === "demo";
  const demoSha = demo ? await headSha(path.resolve(process.cwd(), DEMO_REPO)) : null;
  return (
    <SpecimenPreview
      state={params.state ?? "default"}
      layout={params.layout ?? null}
      demo={demo ? { repo: DEMO_REPO, sha: demoSha } : null}
    />
  );
}
