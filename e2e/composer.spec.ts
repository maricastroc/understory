import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

function watchRequests(page: Page) {
  const blame: string[] = [];
  const map: Array<{ mode: string; files: number }> = [];
  page.on("request", (r) => {
    const p = new URL(r.url()).pathname;
    if (/^\/api\/dig/.test(p)) blame.push(p);
    if (p === "/api/history-map") {
      const body = JSON.parse(r.postData() ?? "{}");
      map.push({ mode: body.mode, files: body.files?.length ?? 0 });
    }
  });
  return { blame, map };
}

test("the demo opens on the file stage: map of current lines, then a file, a line, a question", async ({
  page,
}) => {
  const calls = watchRequests(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app");
  await expect(page.getByRole("heading", { level: 1, name: "New investigation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "History of current lines" })).toBeVisible({
    timeout: 60_000,
  });
  const trail = page.getByRole("navigation", { name: "Investigation path" });
  await expect(trail.locator('[aria-current="step"]')).toContainText("02 file, current step");
  await expect(trail.getByRole("button")).toHaveCount(1);
  await expect(page.getByText("Changed in the last 12 commits")).toBeVisible();
  await expect(page.getByText(/PR data (is )?unavailable/)).toBeHidden();
  expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);

  await page.getByRole("button", { name: /^src\/billing\/charge\.ts, / }).click();
  await expect(
    trail.getByRole("button", { name: /^02 file: src\/billing\/charge\.ts/ }),
  ).toBeVisible();
  const go = page.getByLabel(/^Go to line/);
  await go.fill("8");
  await go.press("Enter");
  await expect(page.getByRole("button", { name: /^Line 8, selected/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(trail.getByRole("button", { name: /^03 line: line 8/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Ask about line 8" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Context" })).toContainText(
    "Last changed by",
  );
  await expect(page.getByRole("button", { name: /Investigate line 8/ })).toBeVisible();
  expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
  expect(calls.blame).toEqual([]);
});

test("the demo maps its files by itself after a second of idle; no remote means neutral marks", async ({
  page,
}) => {
  const calls = watchRequests(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app");
  const files = page.getByRole("list", { name: "Files shown" });
  await expect(
    files.getByRole("button", { name: /^src\/billing\/refund\.ts, oldest surviving line/ }),
  ).toBeVisible({ timeout: 60_000 });
  expect(calls.map[0]).toEqual({ mode: "cached", files: 2 });
  expect(calls.map.filter((c) => c.mode === "map").every((c) => c.files <= 3)).toBe(true);
  await expect(
    files.getByRole("button", { name: /^src\/billing\/charge\.ts, oldest surviving line/ }),
  ).toBeVisible();
  const marks = await page.evaluate(() => {
    const canvas = document.querySelector('ul[aria-label="Files shown"]')!.parentElement!;
    return {
      neutral: canvas.querySelectorAll("svg rect.fill-li-paper.stroke-li-neutral-500").length,
      hatch: canvas.querySelectorAll("svg rect.stroke-li-gap").length,
      found: canvas.querySelectorAll("svg rect.fill-li-evidence-tint").length,
    };
  });
  expect(marks.neutral).toBeGreaterThan(0);
  expect(marks.hatch).toBe(0);
  expect(marks.found).toBe(0);
  await expect(page.getByText(/PR data (is )?unavailable/)).toBeHidden();
  await page.getByRole("button", { name: "About this map" }).click();
  await expect(page.getByText(/^PR data is unavailable for this repo/)).toBeVisible();
  await expect(page.getByText(/Not a sample of the whole repository\.$/)).toBeVisible();
  const inspector = page.getByRole("complementary", { name: "File inspector" });
  await expect(inspector).toContainText("Hover or focus a file to inspect its history.");
  await expect(inspector.getByRole("button")).toHaveCount(0);
  await files.getByRole("button", { name: /^src\/billing\/charge\.ts/ }).focus();
  await expect(inspector.getByRole("button", { name: "Open charge.ts →" })).toBeVisible();
  await expect(inspector).toContainText("Oldest line");
  expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(inspector).toContainText("Hover or focus a file to inspect its history.");
  expect(calls.blame).toEqual([]);
  expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
});

test("the first node of the path leads back to the repository stage", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "History of current lines" })).toBeVisible({
    timeout: 60_000,
  });
  await page
    .getByRole("navigation", { name: "Investigation path" })
    .getByRole("button", { name: /^01 repository/ })
    .click();
  await expect(page.getByRole("heading", { level: 2, name: "Open a repository" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Repository" })).toBeFocused();
  await expect(page.getByRole("button", { name: /Open the demo/ })).toBeVisible();
  await expect(page.getByText(/Sign in with GitHub/)).toHaveCount(0);
  await page.waitForTimeout(400);
  expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
});

test("the cold map matches the design geometry at 1440", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/composer");
  const files = page.getByRole("list", { name: "Files shown" });
  await expect(files.getByRole("button")).toHaveCount(14);
  const geometry = await page.evaluate(() => {
    const canvas = document.querySelector('ul[aria-label="Files shown"]')!.parentElement!;
    const c = canvas.getBoundingClientRect();
    const datum = canvas.querySelector("svg line.stroke-li-datum")!.getBoundingClientRect();
    const stubs = [...canvas.querySelectorAll("svg line[stroke-dasharray='3 3']")].map((l) => {
      const r = l.getBoundingClientRect();
      return { x: Math.round(r.x - c.x + r.width / 2), h: Math.round(r.height) };
    });
    return { width: c.width, datum: Math.round(datum.y + datum.height / 2 - c.y), stubs };
  });
  expect(geometry.width).toBe(1120);
  expect(geometry.datum).toBe(132);
  expect(geometry.stubs[0].x).toBe(74);
  expect(geometry.stubs[1].x - geometry.stubs[0].x).toBe(64);
  expect(geometry.stubs.every((s) => s.h === 24)).toBe(true);
  await expect(page.getByRole("button", { name: "Map 14 more" })).toBeEnabled();
});

for (const state of ["auto", "mapping", "warm", "unknown"]) {
  test(`axe in Chrome, contrast included: ${state} map`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/dev/composer?state=${state}`);
    await expect(page.getByRole("list", { name: "Files shown" }).getByRole("button")).toHaveCount(
      14,
    );
    await page.getByRole("button", { name: /^config\/env\.ts/ }).focus();
    expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
  });
}

for (const width of [1440, 1024, 390]) {
  test(`responsive ${width}: no page overflow, the map scrolls inside itself, axe clean`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dev/composer");
    await expect(page.getByRole("list", { name: "Files shown" }).getByRole("button")).toHaveCount(
      14,
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: /^src\/billing\/charge\.ts/ }).focus();
    await expect(page.getByText("Shown because you have cases here.")).toBeVisible();
    expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
  });
}

test("one much older file breaks the depth axis explicitly and the legend says so", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/composer?state=outlier");
  await expect(page.getByRole("list", { name: "Legend" })).toContainText(
    "depth compressed past the break",
  );
  await expect(
    page.getByRole("button", {
      name: /^src\/webhooks\/legacy\.ts, oldest surviving line 14 years/,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "About this map" }).click();
  await expect(page.getByText(/below the zigzag break it is compressed/)).toBeVisible();
  expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
});

test("the path focus ring hugs the step it belongs to", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/composer?state=cold");
  const trail = page.getByRole("navigation", { name: "Investigation path" });
  await expect(trail.getByRole("button")).toHaveCount(1);
  const step = trail.getByRole("button", { name: /^01 repository/ });
  await step.focus();
  const box = (await step.boundingBox())!;
  const content = await step.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect().width;
  });
  expect(box.width).toBeLessThanOrEqual(content + 1);
  expect(box.height).toBeLessThan(32);
  expect(await step.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
});
