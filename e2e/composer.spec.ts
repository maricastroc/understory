import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const AXE = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");

async function axeViolations(page: Page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (el: Document) => Promise<{ violations: Array<{ id: string; nodes: unknown[] }> }>;
        };
      }
    ).axe;
    return (await axe.run(document)).violations.map((v) => `${v.id} (${v.nodes.length})`);
  });
}

function watchMapRequests(page: Page) {
  const seen: string[] = [];
  page.on("request", (r) => {
    const p = new URL(r.url()).pathname;
    if (/^\/api\/(history-map|blame|dig)/.test(p)) seen.push(p);
  });
  return seen;
}

test("the demo opens on the file stage: map of current lines, then a file, a line, a question", async ({
  page,
}) => {
  const mapCalls = watchMapRequests(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app");
  await expect(page.getByRole("heading", { level: 1, name: "New investigation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "History of current lines" })).toBeVisible({
    timeout: 60_000,
  });
  const trail = page.getByRole("navigation", { name: "Investigation setup" });
  await expect(trail.getByRole("button", { name: "file" })).toHaveAttribute("aria-current", "step");
  await expect(page.getByText(/^2 of 2 files: /)).toBeVisible();
  await expect(page.getByText("PR data unavailable for this repo")).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await page
    .getByRole("button", { name: /^src\/billing\/charge\.ts, history not mapped yet/ })
    .click();
  await expect(trail.getByRole("button", { name: "src/billing/charge.ts" })).toBeVisible();
  const go = page.getByLabel(/^Go to line/);
  await go.fill("8");
  await go.press("Enter");
  await expect(page.getByRole("button", { name: /^Line 8, selected/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(trail.getByRole("button", { name: "line 8" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Investigate this line/ })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  expect(mapCalls).toEqual([]);
});

test("the repository slot leads back to the repository stage", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "History of current lines" })).toBeVisible({
    timeout: 60_000,
  });
  await page
    .getByRole("navigation", { name: "Investigation setup" })
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByRole("textbox", { name: "Repository" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Explain a pull request instead/ })).toHaveAttribute(
    "href",
    "/pr",
  );
  expect(await axeViolations(page)).toEqual([]);
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
  await expect(page.getByRole("button", { name: "Map 14 more" })).toBeDisabled();
});

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
    expect(await axeViolations(page)).toEqual([]);
  });
}
