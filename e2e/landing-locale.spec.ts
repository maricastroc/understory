import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

async function open(page: Page, baseURL: string, width: number) {
  await page.context().addCookies([{ name: "understory-locale", value: "pt-BR", url: baseURL }]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width, height: 900 });
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (/hydrat|did not match|server rendered/i.test(msg.text())) problems.push(msg.text());
  });
  page.on("pageerror", (err) => problems.push(err.message));
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  return problems;
}

for (const width of [1440, 1279, 390]) {
  test(`the landing in Portuguese at ${width}: written for it, no overflow, axe`, async ({
    page,
    baseURL,
  }) => {
    const problems = await open(page, baseURL!, width);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Por que esta linha está aqui?",
    );
    await expect(page.getByText(/^O Understory reconstrói o raciocínio/)).toBeVisible();
    await expect(page.getByRole("link", { name: /^Explicar uma linha/ })).toHaveCount(3);
    await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
    await expect(page.getByText("Por que 3 tentativas?").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "O blame para aqui." })).toBeAttached();
    await expect(
      page.getByRole("heading", { name: "Três motivos no registro. Uma pergunta em aberto." }),
    ).toBeAttached();
    await expect(
      page.getByRole("heading", { name: "Interrogue o seu próprio código." }),
    ).toBeAttached();
    await expect(page.locator("footer")).toContainText("evidências > afirmações");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.mouse.move(0, 0);
    expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
    expect(problems).toEqual([]);
  });
}

test("the evidence stays as it was recorded, marked as English", async ({ page, baseURL }) => {
  await open(page, baseURL!, 1440);
  const quote = page.getByText("212 customers were charged twice").first();
  await expect(quote).toBeAttached();
  await expect(quote.locator("xpath=ancestor-or-self::*[@lang][1]")).toHaveAttribute("lang", "en");
  await expect(page.getByText("Customers double-billed during Stripe outage")).toBeAttached();
  const blame = page.getByText("$ git blame -L 9,9 src/billing/charge.ts").first();
  await expect(blame).toBeVisible();
});

test("the landing's description, in Portuguese", async ({ page, baseURL }) => {
  await open(page, baseURL!, 1440);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /^O motivo histórico por trás de decisões de código/,
  );
});

test("the English description has no dash and reads the same otherwise", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Reconstruct the historical reason behind code decisions. Grounded in git, built to say so when the record is silent.",
  );
  await expect(page.getByText(/by tracing commits, pull requests, and issues/)).toBeVisible();
});
