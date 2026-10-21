import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

const FILE = "src/billing/charge.ts";

type Sent = { path: string; language?: string };

async function serve(page: Page, written = "en") {
  const sent: Sent[] = [];
  const evidence = {
    question: "Why is this line the way it is?",
    repo: {
      path: "acme/payments-service",
      name: "payments-service",
      remoteUrl: "https://github.com/acme/payments-service",
      sha: "c5c5538a1d6f0e2b3c4d5e6f7a8b9c0d1e2f3a4b",
    },
    location: { file: FILE, startLine: 4, endLine: 4 },
    artifacts: [],
    contradictions: [],
  };
  const narrative = {
    answer: "The retry cap was set to three after the outage.",
    claims: [],
    language: written,
    grounded: false,
    unknownCitations: [],
    ungroundedClaims: 0,
    confidence: { score: 0.2, level: "low", primarySources: 0, corroborating: 0, contradicting: 0 },
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = request.postData();
    sent.push({ path, language: body ? JSON.parse(body).language : undefined });
    if (path === "/api/dig") {
      await new Promise((r) => setTimeout(r, 300));
      return route.fulfill({
        headers: { "content-type": "application/x-ndjson" },
        body: `${JSON.stringify({ phase: "evidence", evidence })}\n${JSON.stringify({ phase: "final", narrative })}\n`,
      });
    }
    if (path === "/api/narrate") return route.fulfill({ json: { narrative } });
    if (path === "/api/file")
      return route.fulfill({ json: { content: `${Array(8).fill("retry();").join("\n")}\n` } });
    if (path === "/api/blame") return route.fulfill({ json: { spans: [] } });
    if (path === "/api/investigations")
      return route.fulfill({ json: { investigations: [], persisted: false } });
    if (path === "/api/auth/me") return route.fulfill({ json: { user: null } });
    return route.fulfill({ status: 404, json: { error: "stubbed" } });
  });
  return (p: string) => sent.filter((s) => s.path === p);
}

function watchHydration(page: Page) {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (/hydrat|did not match|server rendered/i.test(msg.text())) problems.push(msg.text());
  });
  page.on("pageerror", (err) => problems.push(err.message));
  return problems;
}

const cookieOf = async (context: BrowserContext) =>
  (await context.cookies()).find((c) => c.name === "understory-locale");

const answerLanguage = (page: Page) => page.evaluate(() => localStorage.getItem("gi:lang"));

async function pick(page: Page, from: string, to: string) {
  await page.getByRole("button", { name: from }).click();
  await page.getByRole("button", { name: to, exact: true }).click();
}

test("a first visit is in English, with nothing stored", async ({ page, context }) => {
  const problems = watchHydration(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "Language: English" })).toBeVisible();
  expect(await cookieOf(context)).toBeUndefined();
  expect(problems).toEqual([]);
});

test("Portuguese, picked on the landing, is served from the first byte after a reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await pick(page, "Language: English", "Português");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("button", { name: "Idioma: Português" })).toBeVisible();
  const cookie = await cookieOf(context);
  expect(cookie?.value).toBe("pt-BR");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000 + 300 * 24 * 3600);

  const problems = watchHydration(page);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  expect(problems).toEqual([]);

  const html = await (await page.request.get("/")).text();
  expect(html).toContain('<html lang="pt-BR"');
  expect(html).toContain("Idioma:");
  expect(html).not.toContain("Language:");

  await pick(page, "Idioma: Português", "English");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect((await cookieOf(context))?.value).toBe("en");
});

test("the app renders in Portuguese without a mismatch on hydration", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "understory-locale", value: "pt-BR", url: baseURL! }]);
  const requests = await serve(page);
  const problems = watchHydration(page);
  await page.goto(`/app?repo=acme/payments-service&file=${FILE}&line=4`);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("group", { name: "Análise" })).toBeVisible({ timeout: 60_000 });
  expect(requests("/api/dig").map((r) => r.language)).toEqual(["pt"]);
  expect(problems).toEqual([]);
});

test("changing the interface on a case keeps the answer and calls no model", async ({ page }) => {
  const requests = await serve(page, "en");
  await page.goto(`/app?repo=acme/payments-service&file=${FILE}&line=4`);
  const analysis = page.getByRole("group", { name: "Analysis" });
  await expect(analysis).toBeVisible({ timeout: 60_000 });
  expect(requests("/api/dig").map((r) => r.language)).toEqual(["en"]);

  await pick(page, "Language: English", "Português");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  const análise = page.getByRole("group", { name: "Análise" });
  await expect(análise.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("The retry cap was set to three after the outage.")).toBeVisible();
  expect(requests("/api/dig")).toHaveLength(1);
  expect(requests("/api/narrate")).toHaveLength(0);
  expect(await answerLanguage(page)).toBeNull();

  await análise.getByRole("button", { name: "PT" }).click();
  await expect.poll(() => requests("/api/narrate").map((r) => r.language)).toEqual(["pt"]);
  expect(await answerLanguage(page)).toBe("pt");
});

test("an answer language chosen before survives the interface, both ways", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("gi:lang", "en");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/");
  await pick(page, "Language: English", "Português");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  const requests = await serve(page, "en");
  await page.goto(`/app?repo=acme/payments-service&file=${FILE}&line=4`);
  await expect(page.getByRole("group", { name: "Análise" })).toBeVisible({ timeout: 60_000 });
  expect(requests("/api/dig").map((r) => r.language)).toEqual(["en"]);
  expect(await answerLanguage(page)).toBe("en");
  await pick(page, "Idioma: Português", "English");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await answerLanguage(page)).toBe("en");
  expect(requests("/api/narrate")).toHaveLength(0);
});

for (const width of [1440, 390]) {
  test(`the language menu at ${width}: inside the page, axe with contrast`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Language: English" });
    await trigger.click();
    const list = page.getByRole("list", { name: "Language" });
    await expect(list).toBeVisible();
    const box = (await list.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await axeViolations(page, { within: "header" })).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(list).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await serve(page);
    await page.goto(`/app?repo=acme/payments-service&file=${FILE}&line=4`);
    await expect(page.getByText("blame @ c5c5538")).toBeVisible({ timeout: 60_000 });
    const header = page.getByRole("banner");
    const headerBox = (await header.boundingBox())!;
    const appTrigger = (await page
      .getByRole("button", { name: "Language: English" })
      .boundingBox())!;
    expect(appTrigger.x + appTrigger.width).toBeLessThanOrEqual(width);
    expect(appTrigger.y + appTrigger.height).toBeLessThanOrEqual(headerBox.y + headerBox.height);
    expect(await axeViolations(page, { within: "header" })).toEqual([]);
  });
}
