import { expect, type Page, test } from "@playwright/test";

async function open(page: Page, width: number, query = "") {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/dev/line${query}`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("[data-asked]").waitFor();
}

const clause = (page: Page, n: number) => page.locator(`li[data-clause="c${n}"] > button`);

const glyphCentre = (page: Page, id: string) =>
  page.locator(`[data-artifact="${id}"] svg:not(.lucide)`).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + 13 };
  });

test("the title asks in the display face, with the token in orange", async ({ page }) => {
  await open(page, 1440);
  const title = page.getByRole("heading", { level: 1, name: "Why exactly 3 retries?" });
  expect(await title.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(
    /^"?Barlow Condensed/,
  );
  await expect(title.locator("[data-asked-mark]")).toHaveText("3");
  await expect(title.locator("[data-asked-mark]")).toHaveCSS("color", "rgb(180, 83, 9)");
  await expect(page.getByText("asked of the token 3 · line 9")).toBeVisible();
});

test("on a phone the code opens on the token, line numbers held in place", async ({ page }) => {
  await open(page, 390);
  const scroller = page.locator("section[data-mode] .overflow-x-auto");
  await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  const shown = await page.evaluate(() => {
    const box = document.querySelector("section[data-mode] .overflow-x-auto")!;
    const b = box.getBoundingClientRect();
    const token = document.querySelector("[data-asked]")!.getBoundingClientRect();
    const number = document.querySelector('[data-line="9"] > span')!.getBoundingClientRect();
    return {
      token: token.left >= b.left && token.right <= b.right,
      number: number.left >= b.left - 1,
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(shown).toEqual({ token: true, number: true, page: 0 });
});

test("pinning a clause draws a green trace between the records it cites", async ({ page }) => {
  await open(page, 1440);
  await clause(page, 1).click();
  const trace = page.locator(".animate-li-trace");
  await expect(trace).toHaveCount(1);
  await expect(trace).toHaveClass(/bg-li-evidence/);
  await trace.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const box = (await trace.boundingBox())!;
  const pull = await glyphCentre(page, "pr:812");
  const issue = await glyphCentre(page, "issue:1187");
  expect(Math.abs(box.x + box.width / 2 - pull.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y - pull.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y + box.height - issue.y)).toBeLessThanOrEqual(1);
  await clause(page, 1).click();
  await expect(trace).toHaveCount(0);
});

test("with reduced motion the trace, the sweep and the arrival are still, already in place", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, 1440);
  await clause(page, 1).click();
  for (const selector of [".animate-li-trace", ".animate-li-sweep"]) {
    await expect(page.locator(selector)).toHaveCount(1);
    await expect(page.locator(selector)).toHaveCSS("animation-name", "none");
  }
  await open(page, 1440, "?state=arriving");
  await page.locator("svg.animate-li-pop").first().waitFor();
  await expect(page.locator("svg.animate-li-pop").first()).toHaveCSS("animation-name", "none");
});
