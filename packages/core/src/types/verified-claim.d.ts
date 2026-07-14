import type { Claim } from "./claim";

// A claim after grounding: `grounded` is true when at least one of its citations
// resolves to a collected artifact. A false here is an uncited interpolation — prose
// the model wrote without a source — which the confidence scorer refuses to reward.
export type VerifiedClaim = Claim & { grounded: boolean };
