import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

async function open(page: Page, baseURL: string, width: number, state: string, reading = false) {
  await page.context().addCookies([{ name: "understory-locale", value: "pt-BR", url: baseURL }]);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/dev/line?state=${state}${reading ? "&reading=1" : ""}`);
  await page.locator("#history").waitFor();
  await page.evaluate(() => document.fonts.ready);
}

const overflow = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main")!;
    return main.scrollWidth - main.clientWidth;
  });

for (const width of [1440, 390]) {
  test(`the reading in Portuguese at ${width}: kinds of reason apart, the evidence, no overflow, axe`, async ({
    page,
    baseURL,
  }) => {
    await open(page, baseURL!, width, "kept-ws-revert-story", true);
    const zone = page.getByRole("region", { name: "O que o histórico sustenta" });
    await expect(zone.locator("[data-why-change]").first()).toContainText("última mudança");
    await expect(zone.getByRole("button", { name: /Documentado para esta linha/ })).toHaveCount(1);
    await expect(zone.getByRole("button", { name: /Explicação provável/ })).toHaveCount(2);
    await expect(page.getByRole("button", { name: /^Respondido/ })).toBeVisible();
    await expect.poll(() => overflow(page)).toBeLessThanOrEqual(0);

    await zone
      .getByRole("button", { name: /Explicação provável/ })
      .first()
      .click();
    const evidence = page.getByRole("region", { name: /^EVIDÊNCIA · AFIRMAÇÃO/ });
    await expect(evidence).toBeVisible();
    await expect(evidence.locator("[data-likely-note]")).toContainText(
      "A ligação dele com esta linha é uma interpretação do Understory.",
    );
    await evidence.getByRole("button", { name: "Ver no histórico ↓" }).click();
    await expect(page.locator("#history [aria-expanded='true']").first()).toBeVisible();
    await page.mouse.move(0, 0);
    expect(await axeViolations(page, { within: "main", settleMs: 400 })).toEqual([]);
  });
}

test("the verdict, its checks and the key in Portuguese", async ({ page, baseURL }) => {
  await open(page, baseURL!, 1440, "resolved");
  await page.getByRole("button", { name: /^Resolvido/ }).click();
  const popover = page.getByRole("dialog", { name: "Por que está resolvido" });
  await expect(popover).toContainText("Confiança calculada");
  await expect(popover).toContainText(/\d,\d\d · (alta|média|baixa)/);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Legenda" }).click();
  await expect(page.getByRole("list", { name: "Legenda" })).toContainText(
    "profundidade = tempo antes de hoje",
  );
  await expect(page.getByRole("button", { name: "Copiar o porquê" })).toBeVisible();
  await page.mouse.move(0, 0);
  expect(await axeViolations(page, { within: "main", settleMs: 400 })).toEqual([]);
});

test("a citation with no collected source reads as one, in Portuguese", async ({
  page,
  baseURL,
}) => {
  await open(page, baseURL!, 1440, "fabricated");
  await expect(page.getByRole("button", { name: /^Citação sem respaldo/ })).toBeVisible();
});

for (const width of [1440, 390]) {
  test(`the history in Portuguese at ${width}: its extent, a row, the way back, no overflow, axe`, async ({
    page,
    baseURL,
  }) => {
    await open(page, baseURL!, width, "resolved");
    const history = page.locator("#history");
    await expect(history.locator("h2 + span")).toHaveText(
      /^hoje ±0 → origem −\d+(,\d)?a · \d+ mudanças · \d+ artefatos$/,
    );
    const row = history.locator('[data-artifact="pr:812"]');
    await expect(
      row.getByRole("button", { name: "Voltar à afirmação 1 com pr:812 como fonte" }),
    ).toHaveText("↑ afirmação 1");
    await expect(history).toContainText(/citada pela afirmação \d/);
    await row.locator("button[aria-expanded]").click();
    await expect(row.getByRole("button", { name: "Investigar →" })).toBeVisible();
    await expect.poll(() => overflow(page)).toBeLessThanOrEqual(0);
    await page.mouse.move(0, 0);
    expect(await axeViolations(page, { within: "main", settleMs: 400 })).toEqual([]);
  });

  test(`a long run of uncited changes in Portuguese at ${width}: folded, then open`, async ({
    page,
    baseURL,
  }) => {
    await open(page, baseURL!, width, "many-owners");
    await expect(page.getByText("8 mudanças anteriores que a resposta não cita")).toBeVisible();
    await expect.poll(() => overflow(page)).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "Mostrar as 8" }).click();
    await expect(page.locator('[data-artifact="commit:b000001"]')).toBeVisible();
    await expect.poll(() => overflow(page)).toBeLessThanOrEqual(0);
    await page.mouse.move(0, 0);
    expect(await axeViolations(page, { within: "main", settleMs: 400 })).toEqual([]);
  });
}
