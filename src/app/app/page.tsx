import { Suspense } from "react";
import { Investigator } from "@/components/investigator/Investigator";
import { readingOn } from "./reading-flag";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const reading = readingOn(await searchParams);
  return (
    <Suspense fallback={null}>
      <Investigator reading={reading} />
    </Suspense>
  );
}
