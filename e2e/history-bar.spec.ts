import { expect, test } from "@playwright/test";

for (const locale of ["en", "pt-BR"])
  for (const width of [390, 700, 1440])
    test(`the history's bar keeps its height while the page scrolls, ${locale} at ${width}`, async ({
      page,
      baseURL,
    }) => {
      await page
        .context()
        .addCookies([{ name: "understory-locale", value: locale, url: baseURL! }]);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dev/line?state=many-owners");
      await page.locator("#history").waitFor();
      await page.evaluate(() => document.fonts.ready);
      const bar = page.locator("#history > div").first();
      const back = bar.getByRole("button", { name: /^↑/ });
      await expect(back).toBeHidden();
      const resting = await bar.evaluate((e) => e.getBoundingClientRect().height);

      const heights: number[] = [];
      const bottom = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y <= bottom; y += 150) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.evaluate(() => new Promise(requestAnimationFrame));
        await page.evaluate(() => new Promise(requestAnimationFrame));
        heights.push(await bar.evaluate((e) => Math.round(e.getBoundingClientRect().height)));
      }
      await expect(back).toBeVisible();
      expect(new Set(heights)).toEqual(new Set([Math.round(resting)]));
    });
