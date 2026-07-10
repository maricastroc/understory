import { Suspense } from "react";
import { Investigator } from "@/components/investigator/Investigator";

export default function AppPage() {
  return (
    <Suspense fallback={null}>
      <Investigator />
    </Suspense>
  );
}
