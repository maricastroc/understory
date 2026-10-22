import { useMessages } from "@/i18n/LocaleProvider";
import type { ApiFailure } from "@/lib/api-error";
import { ErrorState } from "../ErrorState";
import { liButton } from "../line-investigation/parts/button-class";

export function CaseFailure({
  failure,
  signedIn,
  onRetry,
  onBack,
}: {
  failure: ApiFailure;
  signedIn: boolean;
  onRetry: () => void;
  onBack: () => void;
}) {
  const m = useMessages();
  return (
    <>
      <ErrorState
        failure={failure}
        title={m.errors.investigation}
        signedIn={signedIn}
        onRetry={onRetry}
      />
      <div>
        <button type="button" onClick={onBack} className={liButton("ghost", "", "sm")}>
          {m.common.backToCode}
        </button>
      </div>
    </>
  );
}
