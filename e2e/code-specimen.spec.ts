import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

async function open(page: Page, query = "") {
  await page.goto(`/dev/specimen${query}`);
  await page.locator("section[data-datum-y]").waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function datumOffset(page: Page) {
  await page.locator('[data-testid="preview-datum-rule"]').waitFor({ state: "attached" });
  return page.evaluate(() => {
    const section = document.querySelector<HTMLElement>("section[data-datum-y]")!;
    const datum = section.querySelectorAll("li[data-datum]");
    const last = datum[datum.length - 1].getBoundingClientRect();
    const rule = document
      .querySelector('[data-testid="preview-datum-rule"]')!
      .getBoundingClientRect();
    const top = section.getBoundingClientRect().top;
    return {
      reported: Number(section.dataset.datumY),
      rowBottom: last.bottom - top,
      ruleCenter: (rule.top + rule.bottom) / 2 - top,
    };
  });
}

const VIEWPORTS = [
  { name: "1440-wide", width: 1440, mode: "panel", specimenWidth: 460 },
  { name: "1280-narrow", width: 1280, mode: "panel", specimenWidth: 420 },
  { name: "960-strip", width: 960, mode: "strip", specimenWidth: null },
  { name: "390-compact", width: 390, mode: "strip", specimenWidth: null },
] as const;

for (const vp of VIEWPORTS) {
  test(`responsive ${vp.name}: layout, datum alignment and no page overflow`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: 900 });
    await open(page);
    const section = page.locator("section[data-datum-y]");
    await expect(section).toHaveAttribute("data-mode", vp.mode);
    if (vp.specimenWidth) {
      await expect
        .poll(async () => Math.round((await section.boundingBox())!.width))
        .toBe(vp.specimenWidth);
    }
    const offset = await datumOffset(page);
    expect(Math.abs(offset.rowBottom - offset.reported)).toBeLessThanOrEqual(1);
    expect(Math.abs(offset.ruleCenter - offset.reported)).toBeLessThanOrEqual(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

const STATES = [
  "default",
  "expanded",
  "unpinned",
  "unavailable",
  "no-literal",
  "range",
  "long-line",
];

for (const state of STATES) {
  test(`state ${state} keeps the datum on the rule`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await open(page, `?state=${state}&layout=wide`);
    const offset = await datumOffset(page);
    expect(Math.abs(offset.rowBottom - offset.reported)).toBeLessThanOrEqual(1);
  });
}

test("long lines scroll inside the panel only", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "?state=long-line&layout=wide");
  const scroll = await page.evaluate(() => {
    const el = document.querySelector("section[data-datum-y] .overflow-x-auto")!;
    return { scroll: el.scrollWidth, client: el.clientWidth };
  });
  expect(scroll.scroll).toBeGreaterThan(scroll.client);
  await page
    .locator("section[data-datum-y] .overflow-x-auto")
    .evaluate((el) => (el.scrollLeft = 400));
  const offset = await datumOffset(page);
  expect(Math.abs(offset.rowBottom - offset.reported)).toBeLessThanOrEqual(1);
});

test("keyboard: focus ring, expand and collapse", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page, "?layout=wide");
  await page.keyboard.press("Tab");
  const toggle = page.getByRole("button", { name: "⋯ lines 20–24 · isTransient()" });
  await expect(toggle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("li[data-line]")).toHaveCount(24);
  await expect(page.getByRole("button", { name: "Show less" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.keyboard.press("Enter");
  await expect(page.locator("li[data-line]")).toHaveCount(19);
});

test("blame bars carry commit and age in the tooltip and in text", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "?layout=wide");
  const datumBar = page.locator('li[data-datum] [data-tone="datum"]');
  await expect(datumBar).toHaveAttribute("title", "92f6a3f · 3y 6m");
  await expect(page.locator("li[data-datum] .sr-only")).toHaveText(
    "Line 9, investigated line, last changed by 92f6a3f, 3 years 6 months ago.",
  );
});

for (const query of ["?layout=wide", "?layout=wide&state=unpinned", "?layout=compact"]) {
  test(`axe in Chrome, contrast included: ${query}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, query);
    expect(await axeViolations(page, { within: "section[data-datum-y]" })).toEqual([]);
  });
}

test("live data: the seeded demo through /api/file?ref and /api/blame", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/specimen?source=demo&layout=wide");
  await expect(page.locator('li[data-datum] [data-tone="datum"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("li[data-datum]")).toHaveAttribute("data-line", "8");
  const offset = await datumOffset(page);
  expect(Math.abs(offset.rowBottom - offset.reported)).toBeLessThanOrEqual(1);
});
