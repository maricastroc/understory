import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const AXE = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");
const DEMO = path.join(process.cwd(), ".demo/payments-service");

async function axeViolations(page: Page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: { run: (el: Document) => Promise<{ violations: Array<{ id: string }> }> };
      }
    ).axe;
    return (await axe.run(document)).violations.map((v) => v.id);
  });
}

test("the composer keeps its flow in the new look: open, find, pick a line, ask", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app");
  const repo = page.getByLabel("Repository URL or path");
  await repo.fill(DEMO);
  await repo.press("Enter");
  await expect(page.getByRole("button", { name: "Opened" })).toBeVisible({ timeout: 60_000 });
  expect(await axeViolations(page)).toEqual([]);

  await page.getByLabel("Search files or symbols").fill("charge");
  await page.locator("button", { hasText: "src/billing/charge.ts" }).first().click();
  const go = page.getByLabel(/^Go to line/);
  await go.fill("8");
  await go.press("Enter");
  await expect(page.getByRole("button", { name: /^Line 8, selected/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: /Investigate this line/ })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});
