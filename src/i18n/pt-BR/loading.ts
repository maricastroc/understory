import type { Messages } from "../messages";

export const loading: Messages["loading"] = {
  investigating: "Investigando…",
  stages: [
    "Coletando do git",
    "Montando a linha do tempo",
    "Reconstruindo os motivos",
    "Verificando as citações",
  ],
};
