import path from "node:path";
import type { Page } from "@playwright/test";

const AXE = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");

type AxeResult = { violations: Array<{ id: string; nodes: Array<{ target: string[] }> }> };

export async function axeViolations(
  page: Page,
  { within, settleMs }: { within?: string; settleMs?: number } = {},
): Promise<string[]> {
  if (settleMs) await page.waitForTimeout(settleMs);
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async (selector) => {
    const { axe } = window as unknown as {
      axe: { run: (el: Element | Document) => Promise<AxeResult> };
    };
    const result = await axe.run(selector ? document.querySelector(selector)! : document);
    return result.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
  }, within);
}
