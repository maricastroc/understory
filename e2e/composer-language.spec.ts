import { expect, type Page, test } from "@playwright/test";

async function open(page: Page, width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/dev/composer?stage=code&state=warm");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "What do you want to find out about line 9?" }).waitFor();
}

const field = (page: Page) =>
  page.getByRole("textbox", { name: "What do you want to know about line 9?" });
const line9 = (page: Page) =>
  page.locator("button[aria-pressed='true']").filter({ hasText: "for" });

test("the path and the stage title read like the landing", async ({ page }) => {
  await open(page);
  const current = page.locator('[aria-current="step"]');
  await expect(current).toContainText("04 question");
  const heading = page.getByRole("heading", { level: 2, name: "Investigate line 9" });
  expect(await heading.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(
    /^"?Barlow Condensed/,
  );
});

test("the token lights up in the code as the question names it, and goes out when it does not", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "What do you want to find out about line 9?" }).click();
  await expect(line9(page).locator("mark[data-asked]")).toHaveCount(0);
  await field(page).fill("Why exactly 3 retries?");
  const mark = line9(page).locator("mark[data-asked]");
  await expect(mark).toHaveText("3");
  await expect(mark).toHaveCSS("outline-style", "solid");
  await expect(page.getByText("asked of the token 3 · line 9")).toBeVisible();
  await field(page).fill("Why retry at all?");
  await expect(mark).toHaveCount(0);
  await expect(page.getByText(/asked of the token/)).toHaveCount(0);
});

test("on a phone the path keeps its boxes without scrolling the page", async ({ page }) => {
  await open(page, 375);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.locator('[aria-current="step"]')).toContainText("04 question");
});

test("on a phone the code moves to the token the question names, line numbers held in place", async ({
  page,
}) => {
  await open(page, 320);
  await page.getByRole("button", { name: /What do you want to find out about/ }).click();
  await field(page).fill("Why exactly 3 retries?");
  const scroller = page.locator("section[aria-label^='Code'] .overflow-auto");
  await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  const shown = await scroller.evaluate((box) => {
    const b = box.getBoundingClientRect();
    const token = box.querySelector("mark[data-asked]")!.getBoundingClientRect();
    const gutter = box
      .querySelector("button[aria-pressed='true'] [data-gutter]")!
      .getBoundingClientRect();
    return {
      token: token.left >= gutter.right && token.right <= b.left + box.clientWidth,
      number: Math.abs(gutter.left - b.left) <= 1,
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(shown).toEqual({ token: true, number: true, page: 0 });
});

test("on a wide screen the code stays where it is", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /What do you want to find out about/ }).click();
  await field(page).fill("Why exactly 3 retries?");
  await expect(line9(page).locator("mark[data-asked]")).toHaveText("3");
  expect(
    await page
      .locator("section[aria-label^='Code'] .overflow-auto")
      .evaluate((el) => el.scrollLeft),
  ).toBe(0);
});
