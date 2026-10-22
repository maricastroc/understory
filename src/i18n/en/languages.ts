export const languages = {
  interface: "Language",
  answerIn: "Answer in",
  analysis: "Analysis",
  name: {
    en: "English",
    pt: "Portuguese",
  },
  rewriting: (language: string) => `rewriting in ${language}…`,
  rewriteFailed: (language: string) => `Could not rewrite this analysis in ${language}.`,
};
