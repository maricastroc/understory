import { expect, type Page, test } from "@playwright/test";

const FILE = "packages/apollo-link-http/src/httpLink.ts";

async function serve(page: Page) {
  const evidence = {
    question: "Why is this line the way it is?",
    repo: {
      path: "apollographql/apollo-link",
      name: "apollo-link",
      remoteUrl: "https://github.com/apollographql/apollo-link",
      sha: "c5c5538a1d6f0e2b3c4d5e6f7a8b9c0d1e2f3a4b",
    },
    location: { file: FILE, startLine: 10, endLine: 10 },
    artifacts: [],
    contradictions: [],
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/dig") {
      await new Promise((r) => setTimeout(r, 300));
      return route.fulfill({
        headers: { "content-type": "application/x-ndjson" },
        body: `${JSON.stringify({ phase: "evidence", evidence })}\n${JSON.stringify({ phase: "final", narrative: null })}\n`,
      });
    }
    if (path === "/api/file")
      return route.fulfill({ json: { content: `${Array(12).fill("x();").join("\n")}\n` } });
    if (path === "/api/blame") return route.fulfill({ json: { spans: [] } });
    if (path === "/api/investigations")
      return route.fulfill({ json: { investigations: [], persisted: false } });
    return route.fulfill({ status: 404, json: { error: "stubbed" } });
  });
}

async function open(page: Page, width: number) {
  await serve(page);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/app?repo=apollographql/apollo-link&file=${FILE}&line=10`);
  await page.getByText("blame @ c5c5538").waitFor({ timeout: 60_000 });
}

const overflow = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main")!;
    return main.scrollWidth - main.clientWidth;
  });

test("a long path in the title row stays inside the page at 390", async ({ page }) => {
  await open(page, 390);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  const blame = (await page.getByText("blame @ c5c5538").boundingBox())!;
  expect(blame.x + blame.width).toBeLessThanOrEqual(390);
});

test("a long path in the title row keeps one line at 1440", async ({ page }) => {
  await open(page, 1440);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  const dir = (await page.getByText("packages/apollo-link-http/src/").boundingBox())!;
  const blame = (await page.getByText("blame @ c5c5538").boundingBox())!;
  expect(Math.abs(dir.y - blame.y)).toBeLessThan(2);
});
