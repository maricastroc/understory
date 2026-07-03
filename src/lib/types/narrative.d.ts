export type Narrative = {
  answer: string;
  citations: string[];
  // false = the history does not explain it (honest abstention)
  recorded: boolean;
};
