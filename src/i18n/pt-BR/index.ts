import type { Messages } from "../messages";
import { common } from "./common";
import { composer } from "./composer";
import { errors } from "./errors";
import { languages } from "./languages";
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
};
