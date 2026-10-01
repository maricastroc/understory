import { describe, expect, it } from "vitest";
import { narrativeLanguage } from "./narrative-language";

const of = (...texts: string[]) => ({
  answer: texts.join(" "),
  claims: texts.map((text) => ({ text, citations: [] })),
});

describe("narrativeLanguage", () => {
  it("trusts the language recorded on the narrative", () => {
    expect(
      narrativeLanguage({ ...of("O histórico não explica esta linha."), language: "en" }),
    ).toBe("en");
  });

  it("reads the answer alone in legacy narratives saved without claims", () => {
    expect(narrativeLanguage({ answer: "O limite foi fixado em 3 tentativas." })).toBe("pt");
    expect(narrativeLanguage({ answer: "The cap was set at three attempts." })).toBe("en");
  });

  it("tells Portuguese from English in narratives saved before it was recorded", () => {
    expect(narrativeLanguage(of("O histórico não explica por que esta linha está assim."))).toBe(
      "pt",
    );
    expect(
      narrativeLanguage(
        of(
          "O loop inicialmente era ilimitado, mas durante uma interrupção da Stripe ele reenviou cobranças; por isso o número de tentativas foi limitado a 3 com backoff exponencial.",
        ),
      ),
    ).toBe("pt");
    expect(
      narrativeLanguage(of("The history does not explain why this line is the way it is.")),
    ).toBe("en");
    expect(
      narrativeLanguage(
        of("Capped at three attempts, with 1 s · 2 s · 4 s backoff.", "Review cut five to three."),
      ),
    ).toBe("en");
  });

  it("does not guess when the text carries no signal", () => {
    expect(narrativeLanguage(of("refundCharge()", "3 · 7 s"))).toBeNull();
  });
});
