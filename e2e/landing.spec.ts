import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

async function open(page: Page, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (/hydrat|did not match|server rendered/i.test(msg.text())) problems.push(msg.text());
  });
  page.on("pageerror", (err) => problems.push(err.message));
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector("[data-dig-item][data-reached]"));
  return problems;
}

const reached = (page: Page, id: string) =>
  page.locator(`[data-dig-item][data-dig-id="${id}"]`).getAttribute("data-reached");

const chapters = (page: Page) => page.getByRole("navigation", { name: "Chapters" });

for (const width of [1440, 375]) {
  test(`the hero at ${width} reads the blame line, the title, the product, the call, then the question`, async ({
    page,
  }) => {
    const problems = await open(page, width);
    const top = async (locator: ReturnType<Page["locator"]>) => (await locator.boundingBox())!.y;
    const blame = await top(
      page.locator("p:visible", { hasText: "$ git blame -L 9,9 src/billing/charge.ts" }),
    );
    const title = await top(
      page.getByRole("heading", { level: 1, name: "Why is this line here?" }),
    );
    const lead = await top(page.getByText(/^Understory investigates why a line/));
    const call = await top(page.locator("#dig-01").getByRole("link", { name: "Explain a line" }));
    const question = await top(page.getByText("Why exactly 3 retries?").first());
    expect(blame).toBeLessThan(title);
    expect(lead).toBeLessThan(call);
    expect(call).toBeLessThan(question);
    if (width < 1280) expect(title).toBeLessThan(lead);
    await expect(page.getByText("reasons found · 0 of 3")).toBeVisible();
    expect(problems).toEqual([]);
  });
}

test("the cover: at 16:10 the first screen holds the line, the title, the call and the question", async ({
  page,
}) => {
  test.slow();
  for (const [width, height] of [
    [1280, 800],
    [1440, 900],
    [1920, 1200],
  ]) {
    await open(page, width, height);
    for (const target of [
      page.getByRole("banner"),
      page.locator("p:visible", { hasText: "$ git blame -L 9,9 src/billing/charge.ts" }),
      page.getByRole("heading", { level: 1 }),
      page.locator("#dig-01").getByRole("link", { name: "Explain a line" }),
      page.getByText("Why exactly 3 retries?").first(),
      page.getByText("reasons found · 0 of 3"),
    ]) {
      const box = (await target.boundingBox())!;
      expect(box.y + box.height, `${width}×${height}`).toBeLessThanOrEqual(height);
    }
  }
});

test("orange marks the calls to action and the token the question asks about, nothing else", async ({
  page,
}) => {
  await open(page);
  const found = await page.evaluate(() => {
    const orange = ["rgb(180, 83, 9)", "rgb(143, 64, 8)", "rgb(250, 234, 208)"];
    const hits: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement | SVGElement>("body *")) {
      if (el.closest('a[href="/app"]')) continue;
      const s = getComputedStyle(el);
      const own = s.borderTopWidth === "0px" ? [] : [s.borderTopColor];
      const v = [s.color, s.backgroundColor, ...own, s.fill, s.stroke].find((c) =>
        orange.includes(c),
      );
      if (v) hits.push(`${el.tagName} ${el.textContent} ${v}`);
    }
    return hits;
  });
  expect(found).toEqual(["SPAN 3 rgb(180, 83, 9)"]);
  const primaries = page.getByRole("link", { name: /^Explain a line/ });
  await expect(primaries).toHaveCount(3);
  for (const link of await primaries.all()) {
    await expect(link).toHaveAttribute("href", "/app");
    await expect(link).toHaveCSS("background-color", "rgb(180, 83, 9)");
    expect(await link.locator("span[aria-hidden]").count()).toBe(4);
  }
});

test("scrolling digs: records below the front wait, then are reached in depth order", async ({
  page,
}) => {
  await open(page);
  expect(await reached(page, "issue:1187")).toBe("false");
  expect(await reached(page, "commit:7be210e")).toBe("false");
  await page.getByRole("heading", { name: "Checked against the source." }).scrollIntoViewIfNeeded();
  await expect.poll(() => reached(page, "issue:1187")).toBe("true");
  expect(await reached(page, "commit:7be210e")).toBe("false");
  await page.getByRole("heading", { name: "The record is silent here." }).scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 600);
  await expect.poll(() => reached(page, "commit:7be210e")).toBe("true");
});

test("the chapter bar appears under the hero and its tabs take you to each chapter", async ({
  page,
}) => {
  await open(page);
  await expect(chapters(page)).not.toBeInViewport();
  await page.getByRole("link", { name: "Dig through an example" }).click();
  await expect(page).toHaveURL(/#dig-02$/);
  await expect(chapters(page)).toBeInViewport();
  await expect(chapters(page).locator('[aria-current="step"]')).toHaveAccessibleName(
    "Chapter 02, The blame",
  );
  await chapters(page).getByRole("link", { name: "Chapter 05, The silence" }).click();
  await expect(page.getByRole("heading", { name: "The record is silent here." })).toBeInViewport();
  await expect(chapters(page).locator('[aria-current="step"]')).toHaveAccessibleName(
    "Chapter 05, The silence",
  );
});

test("with reduced motion the whole dig is open on arrival, nothing covers it", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const state = await page.evaluate(() => ({
    waiting: document.querySelectorAll('[data-dig-item][data-reached="false"]').length,
    items: document.querySelectorAll("[data-dig-item]").length,
    soil: getComputedStyle(document.querySelector("[data-dig-soil]")!).visibility,
  }));
  expect(state.items).toBeGreaterThan(5);
  expect(state.waiting).toBe(0);
  expect(state.soil).toBe("hidden");
  await expect(page.getByText("212 customers were charged twice").first()).toBeAttached();
});

test("without JavaScript every record is already in place", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The record is silent here." })).toBeVisible();
  expect(await page.locator('[data-dig-item][data-reached="false"]').count()).toBe(0);
  await context.close();
});

for (const width of [1440, 1280, 1279, 768, 375]) {
  test(`responsive ${width}: no horizontal overflow, axe clean`, async ({ page }) => {
    const problems = await open(page, width);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.mouse.move(0, 0);
    expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
    expect(problems).toEqual([]);
  });
}
