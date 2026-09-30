import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

async function open(page: Page, width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
}

const demo = (page: Page) =>
  page.getByRole("region", { name: "Example investigation of src/billing/charge.ts line 9" });
const visibleClause = (page: Page, text: RegExp) =>
  demo(page).locator("li[data-clause] button:visible", { hasText: text });
const visibleCode = (page: Page) => demo(page).locator('ol[aria-label^="Code, lines"]:visible');
const visibleHistory = (page: Page) =>
  demo(page).locator('ol[aria-label="History, newest first"]:visible');

test("at 1440 the demo is the 1600-wide strata drawing scaled to fit, nothing clipped", async ({
  page,
}) => {
  await open(page);
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>(
        'section[aria-label^="Example investigation"] .origin-top-left',
      )?.style.transform !== "scale(1)",
  );
  const frame = await page.evaluate(() => {
    const inner = document.querySelector<HTMLElement>(
      'section[aria-label^="Example investigation"] .origin-top-left',
    )!;
    const outer = inner.parentElement!.getBoundingClientRect();
    const drawn = [...inner.querySelectorAll("[data-strata] *")].map(
      (e) => e.getBoundingClientRect().bottom - outer.top,
    );
    return {
      width: inner.style.width,
      scale: Number(/scale\(([\d.]+)\)/.exec(inner.style.transform)?.[1]),
      shown: inner.getBoundingClientRect().width,
      outer: outer.width,
      height: outer.height,
      lowest: Math.max(...drawn),
    };
  });
  expect(frame.width).toBe("1600px");
  expect(frame.scale).toBeLessThan(1);
  expect(Math.abs(frame.shown - frame.outer)).toBeLessThanOrEqual(1);
  expect(frame.lowest).toBeLessThanOrEqual(frame.height + 1);
  await expect(visibleCode(page)).toBeVisible();
});

test("the hero reads eyebrow, headline, subheadline, actions, then the preview", async ({
  page,
}) => {
  await open(page, 1440);
  const top = async (locator: ReturnType<Page["locator"]>) => (await locator.boundingBox())!.y;
  const order = [
    await top(page.getByText("tells you why", { exact: false }).first()),
    await top(page.getByRole("heading", { level: 1, name: "Why is this line here?" })),
    await top(page.getByText(/reconstructs the reasoning behind a line of code/)),
    await top(page.getByRole("link", { name: "How it works" })),
    await top(demo(page)),
  ];
  expect([...order].sort((a, b) => a - b)).toEqual(order);
});

test("clause 2 is active on load with a green trace to E and D; hover moves it", async ({
  page,
}) => {
  await open(page);
  await expect(visibleClause(page, /212 customers/)).toHaveAttribute("aria-pressed", "true");
  const records = visibleHistory(page).locator("li");
  const quoted = records.filter({ hasText: "quoted verbatim" });
  await expect(quoted).toHaveCount(1);
  await expect(quoted).toContainText("212 customers were charged twice");
  await expect(quoted).toContainText("Customers double-billed during Stripe outage");
  await expect(records.filter({ hasText: "Cap charge retries at 3" })).toHaveCount(1);
  await expect(records.filter({ hasText: "first revision" })).toContainText(
    "for (let attempt = 0; attempt < 5; attempt++) {",
  );

  await visibleClause(page, /Review cut/).hover();
  await page.mouse.move(5, 5);
  await expect(visibleClause(page, /Review cut/)).toHaveAttribute("aria-pressed", "true");
  await expect(visibleClause(page, /212 customers/)).toHaveAttribute("aria-pressed", "false");
  await expect(records.filter({ hasText: "quoted verbatim" })).toContainText(
    "3 gives a 7 s worst case",
  );
});

test("brand orange only on the primary calls to action; no ring, no percentage", async ({
  page,
}) => {
  await open(page);
  const found = await page.evaluate(() => {
    const orange = ["rgb(180, 83, 9)", "rgb(143, 64, 8)", "rgb(250, 234, 208)"];
    const hits: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement | SVGElement>("body *")) {
      if (el.closest('a[href="/app"].bg-li-brand')) continue;
      const s = getComputedStyle(el);
      for (const v of [s.color, s.backgroundColor, s.borderTopColor, s.fill, s.stroke]) {
        if (orange.includes(v)) hits.push(`${el.tagName} ${v}`);
      }
    }
    return { hits, percent: /\d+\s?%/.test(document.body.innerText) };
  });
  expect(found.hits).toEqual([]);
  expect(found.percent).toBe(false);
  const primaries = page.getByRole("link", { name: /^Explain a line/ });
  await expect(primaries).toHaveCount(3);
  for (const link of await primaries.all()) {
    await expect(link).toHaveCSS("background-color", "rgb(180, 83, 9)");
    await expect(link).toHaveCSS("color", "rgb(255, 255, 255)");
    expect(await link.locator("span[aria-hidden]").count()).toBe(4);
  }
});

test("the demo reads its palette from the strata tokens in globals.css", async ({ page }) => {
  await open(page);
  const trace = demo(page).locator("[data-strata]:visible .bg-strata-trace").first();
  await trace.waitFor({ state: "attached" });
  await page.evaluate(() =>
    document.documentElement.style.setProperty("--color-strata-trace", "rgb(1, 2, 3)"),
  );
  await expect(trace).toHaveCSS("background-color", "rgb(1, 2, 3)");
  await expect(demo(page)).toHaveCSS("background-color", "rgb(244, 241, 234)");
});

test("links resolve: /app and #method", async ({ page }) => {
  await open(page);
  for (const link of await page.getByRole("link", { name: /^Explain a line/ }).all())
    await expect(link).toHaveAttribute("href", "/app");
  await page.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/#method$/);
  await expect(
    page.getByRole("heading", { name: /From a line you don.t understand/ }),
  ).toBeInViewport();
});

for (const width of [1440, 1200, 1199, 700, 375]) {
  test(`responsive ${width}: no horizontal overflow, wide or stacked strata, axe clean`, async ({
    page,
  }) => {
    await open(page, width);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const code = visibleCode(page);
    await expect(code).toHaveCount(1);
    await expect(demo(page).locator("[data-strata]:visible")).toHaveAttribute(
      "data-strata",
      width < 1200 ? "stacked" : "wide",
    );
    await expect(visibleClause(page, /212 customers/)).toHaveAttribute("aria-pressed", "true");
    await expect(visibleHistory(page)).toHaveCount(1);
    if (width < 1200) {
      const scroller = await code
        .locator("xpath=ancestor::div[contains(@class, 'overflow-x-auto')][1]")
        .boundingBox();
      const codeBox = await code.boundingBox();
      const clauses = await visibleClause(page, /212 customers/).boundingBox();
      expect(codeBox!.y).toBeGreaterThan(clauses!.y);
      expect(scroller!.width).toBeLessThanOrEqual(width);
    }
    expect(await axeViolations(page)).toEqual([]);
  });
}
