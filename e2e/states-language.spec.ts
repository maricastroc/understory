import { expect, type Page, test } from "@playwright/test";

async function open(page: Page, state: string, width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/dev/line?state=${state}`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("[data-asked]").waitFor();
}

test("while collecting, the answer waits in dashed slots and counts the seconds", async ({
  page,
}) => {
  await open(page, "collecting");
  const status = page.getByRole("status").filter({ hasText: "Collecting the line's history…" });
  await expect(status).toBeVisible();
  const slots = status.locator("ul[aria-hidden] > li");
  await expect(slots).toHaveCount(3);
  await expect(slots.first().locator("span").first()).toHaveCSS("border-top-style", "dashed");
  await expect(status).toContainText(/· \d+ seconds?/, { timeout: 5000 });
});

test("on a phone the slots fit without scrolling the page", async ({ page }) => {
  await open(page, "collecting", 375);
  await expect(page.getByRole("status").filter({ hasText: "Collecting" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("a failure reads as a plate with corners, the technical detail in mono", async ({ page }) => {
  await open(page, "failed");
  const alert = page.getByRole("region", { name: "Reconstructed why" }).getByRole("alert");
  await expect(alert).toContainText("The server ran into a problem");
  await expect(alert.locator(":scope > span.pointer-events-none")).toHaveCount(4);
  await expect(alert.locator(":scope > svg")).toHaveCount(0);
  await expect(alert).toHaveCSS("box-shadow", "none");
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
  expect(
    await alert.getByText("HTTP 502").evaluate((el) => getComputedStyle(el).fontFamily),
  ).toMatch(/^"?IBM Plex Mono/);
});

test("the clauses fit in one after another when the answer arrives", async ({ page }) => {
  await open(page, "arriving");
  const rows = page.locator("li[data-clause].animate-li-wipe");
  await rows.first().waitFor();
  const delays = await rows.evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).animationDelay),
  );
  expect(delays.length).toBeGreaterThan(1);
  expect(delays).toEqual(delays.map((_, i) => `${(i * 120) / 1000}s`));
  await rows.first().evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  await expect(rows.first()).toHaveCSS("opacity", "1");
});

test("with reduced motion the clauses are already in place", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "arriving");
  const row = page.locator("li[data-clause].animate-li-wipe").first();
  await row.waitFor();
  await expect(row).toHaveCSS("animation-name", "none");
});
