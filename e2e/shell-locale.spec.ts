import { expect, type Page, type Route, test } from "@playwright/test";
import { axeViolations } from "./axe";

const FILE = "src/billing/charge.ts";

async function portuguese(page: Page, baseURL: string) {
  await page.context().addCookies([{ name: "understory-locale", value: "pt-BR", url: baseURL }]);
}

type Answer = Parameters<Route["fulfill"]>[0];

async function stub(page: Page, answers: Record<string, () => Answer>) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (answers[path]) return route.fulfill(answers[path]());
    if (path === "/api/investigations")
      return route.fulfill({ json: { investigations: [], persisted: false } });
    if (path === "/api/file")
      return route.fulfill({ json: { content: `${Array(8).fill("retry();").join("\n")}\n` } });
    if (path === "/api/blame") return route.fulfill({ json: { spans: [] } });
    return route.fulfill({ status: 404, json: { error: "stubbed" } });
  });
}

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [1440, 390]) {
  test(`the shell in Portuguese at ${width}: names, no overflow, axe with contrast`, async ({
    page,
    baseURL,
  }) => {
    await portuguese(page, baseURL!);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dev/line?state=resolved&user=guest");
    await page.locator('ol[aria-label="History, newest first"] button').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect.poll(() => overflow(page)).toBeLessThanOrEqual(0);
    if (width < 1360) {
      await page.getByRole("button", { name: "Abrir investigações" }).click();
      const drawer = page.getByRole("dialog", { name: "Investigações" });
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole("navigation", { name: "Lista de casos" })).toBeVisible();
      await expect(drawer.getByText("Visitante")).toBeVisible();
      await page.keyboard.press("Escape");
    } else {
      await expect(page.getByRole("complementary", { name: "Investigações" })).toBeVisible();
    }
    await page.mouse.move(0, 0);
    expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
  });
}

test("a case that cannot be collected says why in Portuguese, with GitHub's own words below", async ({
  page,
  baseURL,
}) => {
  await portuguese(page, baseURL!);
  await stub(page, {
    "/api/dig": () => ({
      status: 400,
      json: {
        error: "GitHub API 404 — not found; is the repo public?",
        detail: "GitHub API 404 — not found; is the repo public?",
        code: "not-found",
        host: "GitHub",
      },
    }),
  });
  await page.goto(`/app?repo=acme/payments-service&file=${FILE}&line=4`);
  const alert = page.getByRole("alert").filter({ hasText: "Este repositório" });
  await expect(alert).toBeVisible({ timeout: 60_000 });
  await expect(alert.getByText("Este repositório parece privado ou não existe.")).toBeVisible();
  await expect(alert.getByText("GitHub API 404 — not found; is the repo public?")).toHaveAttribute(
    "lang",
    "en",
  );
  await expect(alert.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltar ao código" })).toBeVisible();
  expect(await axeViolations(page, { within: "main", settleMs: 300 })).toEqual([]);
});

test("too many requests in a row tells the wait in words", async ({ page, baseURL }) => {
  await portuguese(page, baseURL!);
  await stub(page, {
    "/api/dig": () => ({
      status: 429,
      headers: { "Retry-After": "20" },
      json: { error: "Rate limit exceeded — try again in 20s.", code: "busy" },
    }),
  });
  await page.goto(`/app?repo=acme/payments-service&file=${FILE}&line=4`);
  await expect(
    page.getByText("Muitas requisições seguidas. Tente novamente em 20 segundos."),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Rate limit exceeded")).toHaveCount(0);
});

test("a repository that cannot be opened says so in Portuguese", async ({ page, baseURL }) => {
  await portuguese(page, baseURL!);
  await stub(page, {
    "/api/repo": () => ({
      status: 400,
      json: { error: "Not a git repository: ./nowhere", code: "not-a-repository" },
    }),
  });
  await page.goto("/app");
  const alert = page.getByRole("alert").filter({ hasText: "repositório git" });
  await expect(alert.getByText("Esse caminho não é um repositório git.")).toBeVisible({
    timeout: 60_000,
  });
  await expect(alert.getByText("Not a git repository: ./nowhere")).toHaveAttribute("lang", "en");
});
