import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const AXE = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");

async function open(page: Page, width = 1440, state = "default") {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/dev/pr?state=${state}`);
  await page.getByRole("region", { name: "Changed regions" }).waitFor();
  await page.locator("svg line.stroke-li-datum").waitFor({ state: "attached" });
  await page.evaluate(() => document.fonts.ready);
}

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

const list = (page: Page) => page.getByRole("region", { name: "Changed regions" });
const row = (page: Page, id: string) =>
  list(page).getByRole("button", { name: new RegExp(`^${id},`) });
const tabBox = (page: Page, id: string) =>
  page.evaluate((region) => {
    const tab = [
      ...document.querySelectorAll<HTMLButtonElement>(`button[aria-label^="${region},"]`),
    ].find((b) => !b.closest('section[aria-label="Changed regions"]'))!;
    const r = tab.getBoundingClientRect();
    return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
  }, id);

test("default view fits 1440×900 with the whole composition and nothing extra", async ({
  page,
}) => {
  await open(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Drop legacy webhook path");
  await expect(page.getByRole("button", { name: /6 of 8 regions explained/ })).toBeInViewport();
  await expect(list(page).getByRole("button")).toHaveCount(8);
  for (let i = 1; i <= 8; i++) await expect(row(page, `R${i}`)).toBeInViewport();
  const geometry = await page.evaluate(() => {
    const datum = document.querySelector("svg line.stroke-li-datum")!.getBoundingClientRect();
    const hatches = [...document.querySelectorAll("svg rect.stroke-li-gap")].map(
      (r) => r.getBoundingClientRect().bottom,
    );
    const bands = [...document.querySelectorAll("svg rect.fill-li-evidence-tint")].filter(
      (r) => r.getBoundingClientRect().width > 100,
    );
    const clauses = [...document.querySelectorAll("li[data-clause] button")].map(
      (b) => b.getBoundingClientRect().height,
    );
    return { datum: datum.top, hatches, bands: bands.length, clauses };
  });
  expect(geometry.datum).toBeLessThan(900);
  expect(geometry.hatches).toHaveLength(2);
  for (const bottom of geometry.hatches) expect(bottom).toBeLessThanOrEqual(900);
  expect(geometry.bands).toBe(1);
  for (const h of geometry.clauses) expect(h).toBeLessThan(60);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(page.getByText(/Derived confidence/)).toHaveCount(0);
});

test("clause 1 dims R5–R8 and draws a green comb; clause 3 draws a clay dashed one", async ({
  page,
}) => {
  await open(page);
  await page.locator("li[data-clause] button").first().hover();
  await expect(page.locator("svg path.stroke-li-evidence")).not.toHaveCount(0);
  const opacity = await page.evaluate(() => {
    const tab = [...document.querySelectorAll<HTMLButtonElement>('button[aria-label^="R7,"]')].find(
      (b) => !b.closest('section[aria-label="Changed regions"]'),
    )!;
    return tab.style.opacity;
  });
  expect(Number(opacity)).toBeCloseTo(0.18, 2);
  await page.locator("li[data-clause] button").nth(2).hover();
  const dash = await page
    .locator("svg path.stroke-li-gap")
    .first()
    .getAttribute("stroke-dasharray");
  expect(dash).toBe("4 3");
});

test("R4 from the list, its tab or its core gives the same state; → moves to R5", async ({
  page,
}) => {
  const states: string[] = [];
  for (const how of ["row", "tab", "core"] as const) {
    await open(page);
    if (how === "row") await row(page, "R4").click();
    if (how === "tab") {
      const box = (await tabBox(page, "R4"))!;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    if (how === "core") {
      const box = (await tabBox(page, "R4"))!;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height + 60);
    }
    await page.mouse.move(5, 895);
    states.push(
      await page.evaluate(() =>
        JSON.stringify({
          pressed: document
            .querySelector('button[aria-pressed="true"][aria-label^="R4,"]')
            ?.getAttribute("aria-label"),
          hunk: !!document.querySelector('[aria-label="Diff for R4"]'),
          column: !!document.querySelector("svg rect.fill-li-steel-100"),
          letters: [...document.querySelectorAll("span.pointer-events-none.absolute > span")]
            .map((s) => s.textContent)
            .sort()
            .join(""),
        }),
      ),
    );
  }
  expect(new Set(states).size).toBe(1);
  expect(JSON.parse(states[0])).toMatchObject({ hunk: true, column: true, letters: "FGHIJ" });
  await page.keyboard.press("ArrowRight");
  await expect(row(page, "R5")).toHaveAttribute("aria-pressed", "true");
});

test("pr:1020 is one band with one tooltip and four 'Appears in' buttons", async ({ page }) => {
  await open(page);
  const band = page.getByRole("button", { name: /pull request pr:1020/ }).first();
  await band.hover();
  await expect(page.getByRole("tooltip")).toContainText("R1 · R2 · R3 · R4");
  await band.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("button", { name: /^R\d · / })).toHaveCount(4);
  await drawer.getByRole("button", { name: /^R3 · / }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row(page, "R3")).toHaveAttribute("aria-pressed", "true");
});

test("nothing in the instrument moves when the drawer opens or a hunk expands", async ({
  page,
}) => {
  await open(page);
  const before = await tabBox(page, "R6");
  await row(page, "R1").click();
  expect(await tabBox(page, "R6")).toEqual(before);
  await page.getByRole("button", { name: /All evidence/ }).click();
  expect(await tabBox(page, "R6")).toEqual(before);
});

for (const setup of ["default", "selected", "drawer", "coverage"] as const) {
  test(`axe in Chrome, contrast included: ${setup}`, async ({ page }) => {
    await open(page);
    if (setup === "selected") await row(page, "R4").click();
    if (setup === "drawer")
      await page
        .getByRole("button", { name: /pull request pr:1020/ })
        .first()
        .click();
    if (setup === "coverage") await page.getByRole("button", { name: /regions explained/ }).click();
    await page.mouse.move(5, 895);
    expect(await axeViolations(page)).toEqual([]);
  });
}

for (const state of ["all-silent", "evidence-only", "truncated", "many"]) {
  test(`axe in Chrome for the ${state} state`, async ({ page }) => {
    await open(page, 1440, state);
    expect(await axeViolations(page)).toEqual([]);
  });
}

for (const width of [1440, 1200, 960, 390]) {
  test(`responsive ${width}: no page overflow and the right region control`, async ({ page }) => {
    await open(page, width);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const listRows = await list(page).locator("li > button").count();
    if (width >= 1100) expect(listRows).toBe(8);
    else expect(await list(page).getByRole("button", { name: /^R\d,/ }).count()).toBe(8);
    if (width < 820) await expect(page.getByRole("button", { name: "+4 regions" })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
}
