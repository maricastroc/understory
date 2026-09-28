import { ErrorState } from "../ErrorState";
import { liButton } from "../line-investigation/parts/button-class";

export function CaseFailure({
  message,
  signedIn,
  onRetry,
  onBack,
}: {
  message: string;
  signedIn: boolean;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <ErrorState message={message} signedIn={signedIn} onRetry={onRetry} />
      <div>
        <button type="button" onClick={onBack} className={liButton("ghost", "", "sm")}>
          Back to code
        </button>
      </div>
    </>
  );
}
