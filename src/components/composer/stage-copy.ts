import type { ComposerStage } from "./types/composer-stage";

export function stageCopy(input: {
  stage: ComposerStage;
  connecting: boolean;
  fileLoading: boolean;
  lineValue: string | null;
  subject: string;
  symbolName: string | null;
}): { title: string; lead: string } {
  if (input.stage === "repo") {
    return input.connecting
      ? { title: "Opening the repository", lead: "Reading its files and the commit at HEAD." }
      : {
          title: "Open a repository",
          lead: "Start from the code you want to understand. Public GitHub repositories open without signing in.",
        };
  }
  if (input.stage === "file") {
    return {
      title: "Find the file",
      lead: "Search for it, or pick one from the map below.",
    };
  }
  if (input.fileLoading) return { title: "Opening the file", lead: "Loading its current lines." };
  if (!input.lineValue) {
    return {
      title: "Choose a line or a range",
      lead: "Click the line you want explained, or drag across lines (or shift-click) to explain a range.",
    };
  }
  const about =
    input.symbolName ??
    (input.subject === "line" || input.subject === "range"
      ? input.lineValue
      : `this ${input.subject}`);
  return {
    title: `Ask about ${about}`,
    lead: "The answer follows its history through commits, pull requests and issues, and cites each source. When the record is silent, it says so.",
  };
}
