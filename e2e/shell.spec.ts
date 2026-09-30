import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

async function open(page: Page, width = 1440, user = "synthetic") {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/dev/line?state=resolved&user=${user}`);
  await page.locator('ol[aria-label="History, newest first"] button').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}

for (const user of ["synthetic", "guest"]) {
  test(`axe on the whole page in Chrome, contrast included: ${user}`, async ({ page }) => {
    await open(page, 1440, user);
    await page.mouse.move(0, 0);
    await expect(page.getByRole("complementary", { name: "Investigations" })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
}

test("the rail marks the open case and nests the follow-up under its parent", async ({ page }) => {
  await open(page);
  const rail = page.getByRole("navigation", { name: "Case list" });
  const current = rail.locator('button[aria-current="page"]');
  await expect(current).toContainText("Why exactly 3 retries?");
  await expect(rail.locator("li").nth(1)).toContainText("from B · review·dmitri-k");
});

test("⌘K searches cases and Escape closes the list without unpinning the case", async ({
  page,
}) => {
  await open(page);
  await page.locator('li[data-clause="c1"] > button').click();
  await page.keyboard.press("Meta+k");
  const box = page.getByRole("combobox");
  await expect(box).toBeFocused();
  await page.keyboard.type("ledger");
  await expect(page.getByRole("option")).toHaveText(/Why does refund skip the ledger\?/);
  await page.keyboard.press("Escape");
  await expect(box).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('li[data-clause="c1"] > button')).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});

test("on a phone the cases open in a drawer that traps focus and closes on Escape", async ({
  page,
}) => {
  await open(page, 390);
  const drawer = page.getByRole("dialog", { name: "Investigations" });
  await expect(drawer).not.toBeInViewport();
  const menu = page.getByRole("button", { name: "Open investigations" });
  await menu.click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Close investigations" })).toBeVisible();
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

const EDGES = [
  { width: 1360, rail: true, strip: false, menu: false, mode: "panel", code: 460 },
  { width: 1359, rail: false, strip: true, menu: false, mode: "panel", code: 420 },
  { width: 1100, rail: false, strip: true, menu: false, mode: "panel", code: 420 },
  { width: 1099, rail: false, strip: true, menu: false, mode: "strip", code: null },
  { width: 820, rail: false, strip: true, menu: false, mode: "strip", code: null },
  { width: 819, rail: false, strip: false, menu: true, mode: "strip", code: null },
] as const;

async function inViewport(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((els) =>
    els.some((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth;
    }),
  );
}

for (const edge of EDGES) {
  test(`breakpoint ${edge.width}: shell and instrument switch together`, async ({ page }) => {
    await open(page, edge.width);
    expect(await inViewport(page, 'nav[aria-label="Case list"]')).toBe(edge.rail);
    expect(await inViewport(page, 'button[aria-label^="Show investigations, "]')).toBe(edge.strip);
    expect(await inViewport(page, 'button[aria-label="Open investigations"]')).toBe(edge.menu);
    const specimen = page.locator("section[data-datum-y]");
    await expect(specimen).toHaveAttribute("data-mode", edge.mode);
    if (edge.code) {
      await expect
        .poll(async () => Math.round((await specimen.boundingBox())!.width))
        .toBe(edge.code);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("the collapsed strip opens the case list as an overlay and gives focus back", async ({
  page,
}) => {
  await open(page, 1200);
  const strip = page.getByRole("button", {
    name: /^Show investigations, 5\. Open: Why exactly 3 retries\?/,
  });
  await strip.click();
  const overlay = page.getByRole("dialog", { name: "Investigations" });
  await expect(overlay).toBeInViewport();
  await expect(overlay.locator('button[aria-current="page"]')).toContainText(
    "Why exactly 3 retries?",
  );
  expect(await axeViolations(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(overlay).not.toBeInViewport();
  await expect(strip).toBeFocused();
});

for (const width of [1200, 960, 390]) {
  test(`axe at ${width}, contrast included`, async ({ page }) => {
    await open(page, width);
    await page.mouse.move(0, 0);
    expect(await axeViolations(page)).toEqual([]);
  });
}
