import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

function token(name: string): string {
  const m = css.match(new RegExp(`--color-li-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`missing token --color-li-${name}`);
  return m[1].trim();
}

function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function oklchToLinear(l: number, c: number, h: number): number[] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const [L, M, S] = [l_ ** 3, m_ ** 3, s_ ** 3];
  return [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ].map((v) => Math.min(1, Math.max(0, v)));
}

function luminance(value: string): number {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  const rgb = hex
    ? [0, 2, 4].map((i) => srgbToLinear(parseInt(hex[1].slice(i, i + 2), 16) / 255))
    : (() => {
        const m = value.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/);
        if (!m) throw new Error(`unsupported color ${value}`);
        return oklchToLinear(Number(m[1]), Number(m[2]), Number(m[3]));
      })();
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(token(fg)), luminance(token(bg))];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const SURFACES = [
  "paper",
  "neutral-100",
  "neutral-200",
  "datum-row",
  "datum-tint",
  "evidence-pinned",
  "evidence-tint",
  "steel-100",
];

describe("Line Investigation text tokens", () => {
  for (const fg of [
    "ink",
    "text-muted",
    "text-subtle",
    "evidence-ink",
    "gap-ink",
    "datum-ink",
    "steel-700",
  ]) {
    it(`${fg} reaches 4.5:1 on every surface it can sit on`, () => {
      for (const bg of SURFACES) expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("gap ink stays legible on the not-recorded chip", () => {
    expect(contrast("gap-ink", "gap-tint")).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the design's graphic neutrals out of the text tokens", () => {
    expect(contrast("neutral-600", "paper")).toBeLessThan(4.5);
    expect(token("text-muted")).not.toBe(token("neutral-600"));
  });
});
