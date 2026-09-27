import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const AXE = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");

async function open(page: Page, width = 1440, user = "synthetic") {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/dev/line?state=resolved&user=${user}`);
  await page.locator('ol[aria-label="History, newest first"] button').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function axeViolations(page: Page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            el: Document,
          ) => Promise<{ violations: Array<{ id: string; nodes: Array<{ target: string[] }> }> }>;
        };
      }
    ).axe;
    const result = await axe.run(document);
    return result.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
  });
}

for (const user of ["synthetic", "guest"]) {
  test(`axe on the whole page in Chrome, contrast included: ${user}`, async ({ page }) => {
    await open(page, 1440, user);
    await page.mouse.move(0, 0);
    await expect(page.getByRole("complementary", { name: "Cases" })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
}

test("the rail marks the open case and nests the follow-up under its parent", async ({ page }) => {
  await open(page);
  const rail = page.getByRole("navigation", { name: "Case list" });
  const current = rail.locator('button[aria-current="page"]');
  await expect(current).toContainText("Why exactly 3 retries?");
  await expect(rail.locator("li").nth(1)).toContainText("from B · review·dmitri-k");
  await expect(rail.locator("li").last()).toContainText("#944 · 3 of 8 regions");
});

test("⌘K searches cases and Escape closes the list without unpinning the case", async ({
  page,
}) => {
  await open(page);
  await page.locator('li[data-clause="c1"] button').click();
  await page.keyboard.press("Meta+k");
  const box = page.getByRole("combobox");
  await expect(box).toBeFocused();
  await page.keyboard.type("webhook");
  await expect(page.getByRole("option")).toHaveText(/Drop legacy webhook path/);
  await page.keyboard.press("Escape");
  await expect(box).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('li[data-clause="c1"] button')).toHaveAttribute("aria-pressed", "true");
});

test("on a phone the cases open in a drawer that traps focus and closes on Escape", async ({
  page,
}) => {
  await open(page, 390);
  const drawer = page.getByRole("dialog", { name: "Cases" });
  await expect(drawer).not.toBeInViewport();
  const menu = page.getByRole("button", { name: "Open cases" });
  await menu.click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Close cases" })).toBeVisible();
  for (let i = 0; i < 20; i++) await page.keyboard.press("Tab");
  expect(await drawer.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeInViewport();
  await expect(menu).toBeFocused();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
