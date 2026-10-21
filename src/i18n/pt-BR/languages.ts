import type { Messages } from "../messages";

export const languages: Messages["languages"] = {
  interface: "Idioma",
  answerIn: "Responder em",
  analysis: "Idioma da análise",
  name: {
    en: "inglês",
    pt: "português",
  },
  rewriting: (language) => `reescrevendo em ${language}…`,
  rewriteFailed: (language) => `Não foi possível reescrever a análise em ${language}:`,
};
