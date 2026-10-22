import type { Messages } from "../messages";
import { common } from "./common";
import { composer } from "./composer";
import { errors } from "./errors";
import { languages } from "./languages";
import {
  accessible,
  artifact,
  caseScreen,
  clause,
  drawer,
  gap,
  questions,
  reading,
  source,
  subject,
  verdict,
  why,
} from "./investigation";
import { loading } from "./loading";
import { map } from "./map";
import { shell } from "./shell";
import { time } from "./time";

export const ptBR: Messages = {
  common,
  languages,
  shell,
  errors,
  loading,
  time,
  composer,
  map,
  artifact,
  gap,
  reading,
  subject,
  clause,
  source,
  why,
  verdict,
  caseScreen,
  questions,
  accessible,
  drawer,
};
