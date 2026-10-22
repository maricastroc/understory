import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

async function open(page: Page, baseURL: string, width: number) {
  await page.context().addCookies([{ name: "understory-locale", value: "pt-BR", url: baseURL }]);
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

const demo = (page: Page) =>
  page.getByRole("region", { name: "Exemplo de investigação de src/billing/charge.ts, linha 9" });

for (const width of [1440, 1199, 390]) {
  test(`the landing in Portuguese at ${width}: written for it, no overflow, axe`, async ({
    page,
    baseURL,
  }) => {
    const problems = await open(page, baseURL!, width);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Por que esta linha está aqui?",
    );
    await expect(
      page.getByText("O git blame mostra quem e quando. O Understory mostra o porquê."),
    ).toBeVisible();
    await expect(page.getByText(/^O Understory reconstrói o raciocínio/)).toBeVisible();
    await expect(page.getByRole("link", { name: /^Explicar uma linha/ })).toHaveCount(3);
    await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
    await expect(
      demo(page).locator("li[data-clause] button:visible", { hasText: /212 clientes/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(demo(page)).toContainText("Customers double-billed during Stripe outage");
    await expect(
      page.getByRole("heading", { name: "Interrogue o seu próprio código." }),
    ).toBeVisible();
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

test("the landing's description and the way to the method, in Portuguese", async ({
  page,
  baseURL,
}) => {
  await open(page, baseURL!, 1440);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /^O motivo histórico por trás de decisões de código/,
  );
  await page.getByRole("link", { name: "Como funciona" }).click();
  await expect(page).toHaveURL(/#method$/);
  await expect(
    page.getByRole("heading", {
      name: "De uma linha que você não entende à decisão por trás dela.",
    }),
  ).toBeInViewport();
});

test("the English description has no dash and reads the same otherwise", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Reconstruct the historical reason behind code decisions. Grounded in git, built to say so when the record is silent.",
  );
  await expect(page.getByText(/by tracing commits, pull requests, and issues/)).toBeVisible();
});
