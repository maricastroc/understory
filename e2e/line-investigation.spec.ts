import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

async function open(page: Page, width = 1440, state = "resolved") {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/dev/line?state=${state}`);
  await page.locator(`[data-answer="${width >= 1100 ? "panel" : "strip"}"]`).waitFor();
  await page.locator('ol[aria-label="History, newest first"] button').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}

const clause = (page: Page, n: number) => page.locator(`li[data-clause="c${n}"] > button:visible`);
const evidence = (page: Page) => page.getByRole("region", { name: /^EVIDENCE · CLAUSE/ });
const box = async (page: Page, selector: string) =>
  (await page.locator(selector).first().boundingBox())!;

function overlapping(boxes: Array<{ top: number; bottom: number; left: number; right: number }>) {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5)
        return [i, j];
    }
  }
  return null;
}

test("the answer comes first: code beside the why, the history below both", async ({ page }) => {
  await open(page);
  const code = await box(page, "section[data-datum-y]");
  const why = (await page.getByRole("region", { name: "Reconstructed why" }).boundingBox())!;
  const history = await box(page, "section#history");
  expect(code.x + code.width).toBeLessThan(why.x);
  expect(history.y).toBeGreaterThan(Math.max(code.y + code.height, why.y + why.height));
  await expect(page.getByText("select a clause to check its evidence")).toBeVisible();
});

test("a clause opens its evidence under itself and the code does not move", async ({ page }) => {
  await open(page);
  const before = await box(page, "section[data-datum-y]");
  await clause(page, 1).click();
  await expect(clause(page, 1)).toHaveAttribute("aria-expanded", "true");
  const panel = evidence(page);
  await expect(panel).toBeVisible();
  await expect(panel.locator("mark")).toHaveText("212 customers were charged twice");
  const clauseBox = (await clause(page, 1).boundingBox())!;
  const panelBox = (await panel.boundingBox())!;
  expect(panelBox.y).toBeGreaterThanOrEqual(clauseBox.y + clauseBox.height - 1);
  expect(await box(page, "section[data-datum-y]")).toEqual(before);
});

test("a source deep in a long history is checked without opening the history", async ({ page }) => {
  await open(page, 1440, "many-owners");
  const height = () => page.evaluate(() => document.documentElement.scrollHeight);
  const start = await height();
  await clause(page, 3).click();
  await expect(evidence(page)).toContainText("7be210e");
  await expect(evidence(page)).toContainText("an earlier change to lines 7–16");
  await expect(page.getByRole("button", { name: "Show 8" })).toBeVisible();
  expect((await height()) - start).toBeLessThan(420);
  expect(await height()).toBeLessThan(2000);
});

test("show in history lands on the source, and the bar leads back to the clause", async ({
  page,
}) => {
  await open(page);
  await clause(page, 1).click();
  await evidence(page).getByRole("button", { name: "Show in history ↓" }).click();
  const located = page.locator('[data-artifact="issue:1187"]');
  await expect(located).toHaveAttribute("data-located", "true");
  await expect(located).toBeInViewport();
  const bar = page.locator("section#history > div.sticky");
  await expect(bar).toContainText("tracing clause 2");
  await expect(bar).toContainText("at 15 Mar 2023");
  await bar.getByRole("button", { name: "↑ Back to clause 2" }).click();
  await expect(clause(page, 1)).toBeInViewport();
  await expect(clause(page, 1)).toBeFocused();
});

test("quiet years are drawn as short breaks, not as distance", async ({ page }) => {
  await open(page);
  const breaks = page.locator('ol[aria-label="History, newest first"] > li.h-10');
  await expect(breaks).toHaveCount(2);
  await expect(breaks.nth(0)).toContainText("unchanged for 3y 6m");
  await expect(breaks.nth(1)).toContainText("1y 8m with no change to line 9");
  for (const b of await breaks.all())
    expect((await b.boundingBox())!.height).toBeLessThanOrEqual(40);
});

test("history rows never overlap, folded or opened", async ({ page }) => {
  await open(page, 1440, "many-owners");
  const rows = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("[data-artifact] button[aria-expanded]")].map((b) => {
        const r = b.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      }),
    );
  expect(overlapping(await rows())).toBeNull();
  await page.getByRole("button", { name: "Show 8" }).click();
  await page.locator('[data-artifact="pr:812"] button[aria-expanded]').click();
  expect(overlapping(await rows())).toBeNull();
});

test("keyboard only: open a clause, step its sources, close, land back on the clause", async ({
  page,
}) => {
  await open(page);
  await clause(page, 0).focus();
  await page.keyboard.press("ArrowDown");
  await expect(clause(page, 1)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(evidence(page)).toBeVisible();
  await evidence(page).getByRole("button", { name: "Next source" }).focus();
  await page.keyboard.press("Enter");
  await expect(evidence(page)).toContainText("Bound retries in chargeCustomer");
  await page.keyboard.press("ArrowLeft");
  await expect(evidence(page)).toContainText("Customers double-billed during Stripe outage");
  await page.keyboard.press("Escape");
  await expect(evidence(page)).toHaveCount(0);
  await expect(clause(page, 1)).toBeFocused();
});

for (const setup of ["default", "evidence", "located", "long"] as const) {
  test(`axe in Chrome, contrast included: ${setup}`, async ({ page }) => {
    await open(page, 1440, setup === "long" ? "many-owners" : "resolved");
    if (setup !== "default" && setup !== "long") await clause(page, 1).click();
    if (setup === "located")
      await evidence(page).getByRole("button", { name: "Show in history ↓" }).click();
    await page.mouse.move(0, 0);
    expect(await axeViolations(page, { within: "main", settleMs: 400 })).toEqual([]);
  });
}

for (const width of [1440, 1280, 960, 390]) {
  test(`responsive ${width}: no page overflow, evidence in place, history below the code`, async ({
    page,
  }) => {
    await open(page, width);
    const overflow = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      return main.scrollWidth - main.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
    await clause(page, 1).click();
    const clauseBox = (await clause(page, 1).boundingBox())!;
    const panelBox = (await evidence(page).boundingBox())!;
    expect(panelBox.y).toBeGreaterThanOrEqual(clauseBox.y + clauseBox.height - 1);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(width);
    const code = await box(page, "section[data-datum-y]");
    const history = await box(page, "section#history");
    expect(history.y).toBeGreaterThan(code.y + code.height);
  });
}
