import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

async function portuguese(page: Page, baseURL: string) {
  await page.context().addCookies([{ name: "understory-locale", value: "pt-BR", url: baseURL }]);
}

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("the demo in Portuguese: the map, a file, a line and the question about it", async ({
  page,
  baseURL,
}) => {
  await portuguese(page, baseURL!);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app");
  await expect(page.getByRole("heading", { level: 1, name: "Nova investigação" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Histórico das linhas atuais" })).toBeVisible({
    timeout: 60_000,
  });
  const trail = page.getByRole("navigation", { name: "Etapas da investigação" });
  await expect(trail.locator('[aria-current="step"]')).toContainText("02 arquivo, etapa atual");
  await expect(page.getByText("Alterados nos últimos 12 commits")).toBeVisible();
  expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);

  await page.getByRole("button", { name: /^src\/billing\/charge\.ts, / }).click();
  const go = page.getByLabel(/^Ir para a linha/);
  await go.fill("8");
  await go.press("Enter");
  await expect(page.getByRole("button", { name: /^Linha 8, selecionada/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(trail.getByRole("button", { name: /^03 linha: linha 8/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Pergunte sobre a linha 8" }),
  ).toBeVisible();
  const context = page.getByRole("complementary", { name: "Contexto" });
  await expect(context).toContainText("Última alteração:");
  await expect(context).toContainText("antes do HEAD");
  await expect(page.getByRole("group", { name: "Responder em" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Investigar a linha 8 →" })).toBeVisible();
  expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
});

for (const width of [1440, 390]) {
  test(`the map in Portuguese at ${width}: no page overflow, axe with contrast`, async ({
    page,
    baseURL,
  }) => {
    await portuguese(page, baseURL!);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dev/composer");
    await expect(
      page.getByRole("list", { name: "Arquivos mostrados" }).getByRole("button"),
    ).toHaveCount(14);
    await expect.poll(() => overflow(page)).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: /^src\/billing\/charge\.ts/ }).focus();
    await expect(page.getByText("Aparece porque você tem casos aqui.")).toBeVisible();
    expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
  });
}

test("one much older file breaks the axis, and the legend and the note say so in Portuguese", async ({
  page,
  baseURL,
}) => {
  await portuguese(page, baseURL!);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/composer?state=outlier");
  await expect(page.getByRole("list", { name: "Legenda" })).toContainText(
    "profundidade comprimida após a quebra",
  );
  await expect(
    page.getByRole("button", {
      name: /^src\/webhooks\/legacy\.ts, linha mais antiga ainda presente com 14 anos/,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sobre este mapa" }).click();
  await expect(page.getByText(/Abaixo da quebra em zigue-zague/)).toBeVisible();
  const ticks = await page
    .locator("p[aria-hidden]")
    .evaluateAll((els) =>
      els.map((e) => e.textContent ?? "").filter((t) => /^−\d+[a-z]+$/.test(t)),
    );
  expect(ticks.length).toBeGreaterThan(0);
  expect(ticks.every((t) => /^−\d+(a|m|sem|d)$/.test(t))).toBe(true);
  expect(ticks.some((t) => t.endsWith("a"))).toBe(true);
  expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
});
