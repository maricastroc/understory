import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

type Case = {
  evidence: { code: { startLine: number; lines: string[] } } & Record<string, unknown>;
  narrative: { claims: Array<{ text: string }> } & Record<string, unknown>;
};

const controls = JSON.parse(
  readFileSync("src/components/line-investigation/fixtures/control-cases.json", "utf8"),
) as { cases: Record<string, Case> };
const kept = JSON.parse(
  readFileSync("src/components/line-investigation/fixtures/kept-cases.json", "utf8"),
) as { cases: Record<string, Case> };

async function serve(page: Page, result: Case) {
  const { evidence, narrative } = result;
  const content = [...Array(evidence.code.startLine - 1).fill(""), ...evidence.code.lines].join(
    "\n",
  );
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/dig") {
      await new Promise((r) => setTimeout(r, 400));
      return route.fulfill({
        headers: { "content-type": "application/x-ndjson" },
        body: `${JSON.stringify({ phase: "evidence", evidence })}\n${JSON.stringify({ phase: "final", narrative })}\n`,
      });
    }
    if (path === "/api/file") return route.fulfill({ json: { content: `${content}\n` } });
    if (path === "/api/blame") return route.fulfill({ json: { spans: [] } });
    if (path === "/api/investigations")
      return route.fulfill({ json: { investigations: [], persisted: false } });
    return route.fulfill({ status: 404, json: { error: "stubbed" } });
  });
}

const open = async (page: Page, width: number, query: string) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/app?${query}`);
};

for (const width of [1440, 390])
  test(`the case screen with ?reading=1 at ${width}: a likely explanation, an answer without the check, the note on its source, axe with contrast`, async ({
    page,
  }) => {
    await serve(page, controls.cases["tslint-189"]);
    await open(page, width, "repo=palantir/tslint&file=src/linter.ts&line=189&reading=1");
    const why = page.getByRole("region", { name: "What the history supports" });
    const row = why.getByRole("button", { name: /Likely explanation/ });
    await expect(row).toBeVisible({ timeout: 60_000 });
    await expect(row).toContainText(controls.cases["tslint-189"].narrative.claims[0].text);
    await expect(why).not.toContainText("Documented for this line");
    await expect(page.getByRole("button", { name: /^Answered/ })).toBeVisible();
    await row.click();
    await expect(page.locator("[data-likely-note]")).toHaveText(
      "The passage documents the change it belongs to. Its link to this line is Understory's interpretation.",
    );
    const overflow = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      return main.scrollWidth - main.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
    await page.mouse.move(0, 0);
    expect(await axeViolations(page, { within: "main", settleMs: 400 })).toEqual([]);
  });

test("the case screen with ?reading=1: a reason documented for the line stays documented, with no note", async ({
  page,
}) => {
  await serve(page, kept.cases["q-796"]);
  await open(page, 1440, "repo=kriskowal/q&file=q.js&line=796&reading=1");
  const why = page.getByRole("region", { name: "What the history supports" });
  await expect(why.getByRole("button", { name: /Documented for this line/ })).toHaveCount(2, {
    timeout: 60_000,
  });
  await why
    .getByRole("button", { name: /Documented for this line/ })
    .first()
    .click();
  await expect(page.getByRole("region", { name: /^EVIDENCE · CLAUSE 1/ })).toBeVisible();
  await expect(page.locator("[data-likely-note]")).toHaveCount(0);
});

test("the case screen without the reading is the screen as it was", async ({ page }) => {
  await serve(page, controls.cases["tslint-189"]);
  await open(page, 1440, "repo=palantir/tslint&file=src/linter.ts&line=189");
  await expect(page.getByRole("region", { name: "Reconstructed why" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("button", { name: /^Resolved/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "What the history supports" })).toHaveCount(0);
});
