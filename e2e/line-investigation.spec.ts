import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

async function open(page: Page, width = 1440, state = "resolved") {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/dev/line?state=${state}`);
  await page.locator('ol[aria-label="History, newest first"] button').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}

function labelBoxes(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('ol[aria-label="History, newest first"] button')].map((b) => {
      const r = b.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    }),
  );
}

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

test("the investigated line's bottom edge and the datum rule are the same pixel row", async ({
  page,
}) => {
  await open(page);
  const { row, rule } = await page.evaluate(() => {
    const datum = document.querySelector("li[data-datum]")!.getBoundingClientRect();
    const line = document.querySelector("svg line.stroke-li-datum")!.getBoundingClientRect();
    return { row: datum.bottom, rule: (line.top + line.bottom) / 2 };
  });
  expect(Math.abs(row - rule)).toBeLessThanOrEqual(1);
});

test("no confidence number, trace or titles in the default view", async ({ page }) => {
  await open(page);
  await expect(page.getByText("0.90")).toHaveCount(0);
  await expect(page.locator("path.stroke-li-evidence")).toHaveCount(0);
  await expect(page.getByText("Customers double-billed during Stripe outage")).toHaveCount(0);
});

test("labels never overlap, collapsed or revealed", async ({ page }) => {
  await open(page);
  expect(overlapping(await labelBoxes(page))).toBeNull();
  await page.locator('li[data-clause="c1"] button').hover();
  expect(overlapping(await labelBoxes(page))).toBeNull();
});

test("hovering clause 2 dims everything but its sources and draws the trace", async ({ page }) => {
  await open(page);
  await page.locator('li[data-clause="c1"] button').hover();
  await expect(page.locator("path.stroke-li-evidence")).toHaveCount(1);
  await expect(page.getByText("Customers double-billed during Stripe outage")).toBeVisible();
  await expect(page.getByText("Bound retries in chargeCustomer")).toBeVisible();
  const faded = await page.evaluate(
    () => [...document.querySelectorAll('svg g[opacity="0.25"]')].length,
  );
  expect(faded).toBeGreaterThanOrEqual(4);
});

test("opening the drawer does not move any pixel of the instrument", async ({ page }) => {
  await open(page);
  const before = await labelBoxes(page);
  const specimen = await page.locator("section[data-datum-y]").boundingBox();
  await page.getByRole("button", { name: /^E, issue/ }).click();
  await expect(page.getByRole("dialog", { name: "issue:1187" })).toBeVisible();
  const positions = (boxes: Array<{ top: number; left: number }>) =>
    boxes.map((b) => [b.top, b.left]);
  expect(positions(await labelBoxes(page))).toEqual(positions(before));
  expect(await page.locator("section[data-datum-y]").boundingBox()).toEqual(specimen);
});

test("keyboard only: preview, pin, open, step, close", async ({ page }) => {
  await open(page);
  await page.locator('li[data-clause="c0"] button').focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator('li[data-clause="c1"] button')).toHaveAttribute("aria-pressed", "true");
  const label = page.getByRole("button", { name: /^E, issue/ });
  await label.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "issue:1187" })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("dialog", { name: "7be210e" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(label).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator('li[data-clause="c1"] button')).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

for (const setup of ["default", "pinned", "drawer"] as const) {
  test(`axe in Chrome, contrast included: ${setup}`, async ({ page }) => {
    await open(page);
    if (setup === "pinned") await page.locator('li[data-clause="c1"] button').click();
    if (setup === "drawer") await page.getByRole("button", { name: /^E, issue/ }).click();
    await page.mouse.move(0, 0);
    expect(await axeViolations(page, { within: "main" })).toEqual([]);
  });
}

for (const width of [1440, 1280, 960, 390]) {
  test(`responsive ${width}: no page overflow, bore below the code`, async ({ page }) => {
    await open(page, width);
    const overflow = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      return main.scrollWidth - main.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
    const geometry = await page.evaluate(() => {
      const specimen = document.querySelector("section[data-datum-y]")!.getBoundingClientRect();
      const first = document
        .querySelector('ol[aria-label="History, newest first"] button')!
        .getBoundingClientRect();
      return {
        specimenBottom: specimen.bottom,
        specimenRight: specimen.right,
        firstTop: first.top,
        firstLeft: first.left,
        mode: document.querySelector("section[data-datum-y]")!.getAttribute("data-mode"),
      };
    });
    if (geometry.mode === "strip")
      expect(geometry.firstTop).toBeGreaterThan(geometry.specimenBottom);
    else expect(geometry.firstLeft).toBeGreaterThan(geometry.specimenRight);
  });
}
