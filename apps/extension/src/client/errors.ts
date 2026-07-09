export type DigErrorKind = "offline" | "http" | "cancelled" | "unknown";

export class DigError extends Error {
  readonly kind: DigErrorKind;

  constructor(kind: DigErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "DigError";
  }
}
