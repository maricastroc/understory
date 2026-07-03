export type Confidence = {
  score: number;
  level: "high" | "medium" | "low";
  primarySources: number;
  corroborating: number;
  contradicting: number;
};
