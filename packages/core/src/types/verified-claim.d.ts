import type { Claim } from "./claim";

export type VerifiedClaim = Claim & { grounded: boolean };
