export type SpecimenSource =
  | { status: "loading"; lines: null; error: null }
  | { status: "ready"; lines: string[]; error: null }
  | { status: "error"; lines: null; error: string };
