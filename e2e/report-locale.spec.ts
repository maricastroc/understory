import { expect, type Page, test } from "@playwright/test";
import { axeViolations } from "./axe";

const REMOTE = "https://github.com/acme/payments-service";

const artifacts = [
  {
    id: "commit:92f6a3f",
    kind: "commit",
    title: "Cap charge retries at 3, add backoff",
    body: "Cap charge retries at 3, add backoff\n\nBound retries to 3 attempts with 1s/2s/4s backoff.",
    url: `${REMOTE}/commit/92f6a3f`,
    date: "2023-03-15T16:20:00Z",
    author: { name: "Priya Raman" },
    ref: "92f6a3f",
    meta: { sha: "92f6a3f".padEnd(40, "0"), prLookup: "found" },
  },
  {
    id: "pr:812",
    kind: "pull_request",
    title: "Bound retries in chargeCustomer",
    body: "Bound retries in chargeCustomer\n\nUnbounded retries double-charged customers during the Stripe incident (#1187).",
    url: `${REMOTE}/pull/812`,
    date: "2023-03-09T10:00:00Z",
    ref: "#812",
    parentId: "commit:92f6a3f",
    meta: { mergedAt: "2023-03-15T16:20:00Z", reviewLookup: "none", issueLookup: "found" },
  },
  {
    id: "issue:1187",
    kind: "issue",
    title: "Customers double-billed during Stripe outage",
    body: "Customers double-billed during Stripe outage\n\n212 customers were charged twice.",
    url: `${REMOTE}/issues/1187`,
    date: "2023-03-02T09:14:00Z",
    ref: "#1187",
    parentId: "pr:812",
    meta: { state: "CLOSED" },
  },
];

const claims = [
  { text: "Retries were capped at three.", citations: ["commit:92f6a3f"], grounded: true },
  {
    text: "The cap followed 212 double charges.",
    citations: ["issue:1187", "pr:812"],
    grounded: true,
  },
];

const saved = {
  caseId: "case-1",
  question: "Why exactly 3 retries?",
  repoPath: "acme/payments-service",
  location: "",
  result: {
    evidence: {
      question: "Why exactly 3 retries?",
      repo: {
        path: "acme/payments-service",
        name: "payments-service",
        remoteUrl: REMOTE,
        branch: "main",
        sha: "c5c5538a1d6f0e2b3c4d5e6f7a8b9c0d1e2f3a4b",
      },
      artifacts,
      contradictions: [],
    },
    narrative: {
      answerable: true,
      recorded: true,
      grounded: true,
      claims,
      answer: claims.map((c) => c.text).join(" "),
      citations: ["commit:92f6a3f", "issue:1187", "pr:812"],
      unknownCitations: [],
      ungroundedClaims: 0,
      language: "en",
      confidence: {
        score: 0.82,
        level: "high",
        primarySources: 2,
        corroborating: 1,
        contradicting: 0,
      },
      entailment: {
        checked: true,
        supported: 2,
        misattributed: 0,
        checks: [
          {
            citation: "commit:92f6a3f",
            claim: 0,
            status: "supported",
            quote: "3 attempts with 1s/2s/4s backoff",
            reason: "the commit states it",
          },
          {
            citation: "issue:1187",
            claim: 1,
            status: "supported",
            quote: "212 customers were charged twice",
            reason: "the issue states it",
          },
        ],
      },
    },
  },
};

async function open(page: Page, baseURL: string, width: number) {
  await page.context().addCookies([{ name: "understory-locale", value: "pt-BR", url: baseURL }]);
  await page.setViewportSize({ width, height: 900 });
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (/hydrat|did not match|server rendered/i.test(msg.text())) problems.push(msg.text());
  });
  page.on("pageerror", (err) => problems.push(err.message));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/investigations")
      return route.fulfill({ json: { investigations: [saved], persisted: false } });
    if (path === "/api/auth/me") return route.fulfill({ json: { user: null } });
    return route.fulfill({ status: 404, json: { error: "stubbed" } });
  });
  await page.goto("/app?case=case-1");
  await page.getByRole("button", { name: "Voltar ao código" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  return problems;
}

for (const width of [1440, 390]) {
  test(`a saved case without a line, in Portuguese at ${width}: sections, rail, no overflow, axe`, async ({
    page,
    baseURL,
  }) => {
    const problems = await open(page, baseURL!, width);
    for (const name of [
      "Resultado",
      "Cadeia de proveniência",
      "Evidências",
      "Linha do tempo da proveniência",
    ])
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    await expect(page.getByText(/^Confiança alta · 82%$/)).toBeVisible();
    await expect(page.getByText("Retries were capped at three.")).toHaveAttribute("lang", "en");
    if (width >= 1280)
      await expect(
        page.getByRole("complementary", { name: "Detalhes da investigação" }),
      ).toBeVisible();
    await expect(page.getByText("Quem participou").filter({ visible: true })).toHaveCount(1);
    await expect(
      page.getByText("Todas as citações têm respaldo").filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Abrir a fonte/ }).first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.mouse.move(0, 0);
    expect(await axeViolations(page, { settleMs: 400 })).toEqual([]);
    expect(problems).toEqual([]);
  });
}
