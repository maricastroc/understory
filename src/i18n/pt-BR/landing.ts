import type { Messages } from "../messages";

export const meta: Messages["meta"] = {
  description:
    "O motivo histórico por trás de decisões de código, reconstruído a partir do git. Feito para dizer quando o registro não responde.",
};

export const landing: Messages["landing"] = {
  tagline: "arqueologia de código",
  nav: "Principal",
  explain: "Explicar uma linha",
  explainGo: "Explicar uma linha →",
  hero: {
    who: "quem",
    when: "quando",
    why: "porquê",
    title: "Por que esta linha está",
    titleMark: "aqui?",
    lead: "O Understory reconstrói o raciocínio por trás de uma linha de código. Ele segue commits, pull requests e issues até a decisão que a colocou ali.",
  },
  standard: {
    title: "Não é um chat sobre o seu repositório. É um registro que você pode auditar.",
    kicker: "evidências > afirmações",
    quoteFound: (id) => `✓ Citação literal encontrada em ${id}`,
    rejected: "fora das evidências, rejeitada",
  },
  method: {
    silence: "Por que tentar de novo: sem registro",
  },
  closing: {
    title: "Interrogue o seu próprio código.",
    body: "Escolha um repositório e uma linha. Veja o que o histórico realmente diz.",
  },
  dig: {
    whyMissing: "não está no blame",
    what: "o quê",
    today: "hoje",
    cue: "role para escavar · profundidade = tempo",
    digGo: "Escavar um exemplo",
    unchanged: (age, line) => `quebra de escala · ${age}, linha ${line} sem mudança`,
    answer: (done, total) => `porquê reconstruído · ${done} de ${total}`,
    answerOpen: "fica em aberto na resposta, sem palpite",
    chapters: "Capítulos",
    chapter: (n) => `Capítulo ${n}`,
    names: ["A linha", "O blame", "A trilha", "A fonte", "O silêncio", "A leitura"],
    progress: (done, total) => `${done} de ${total}`,
    open: (n) => `${n} em aberto`,
    first: {
      title: "O blame para aqui.",
      note: "Ele aponta o último commit que mexeu na linha. O motivo, não.",
    },
    trail: {
      title: "Treze dias em março de 2023.",
      note: "O commit leva a um pull request, duas revisões e uma issue.",
    },
    proof: {
      title: "Conferido na fonte.",
      note: "Cada afirmação aponta os seus registros. Cada citação literal é encontrada na fonte antes de chegar a você.",
    },
    silence: {
      title: "Aqui o registro se cala.",
      looked: "procurado, e o provedor não tem",
    },
    reading: {
      title: "Três motivos no registro. Uma pergunta em aberto.",
      reconstructed: "reconstruído",
      verified: "verificado",
      quotes: (n) =>
        n === 1 ? "1 citação literal encontrada" : `${n} citações literais encontradas`,
      open: "Por que tentar de novo",
      openBody: (age) =>
        `Por ${age} antes da correção, nenhum pull request, revisão ou issue explica a primeira versão. A resposta deixa isso em aberto.`,
    },
    closing: {
      line: "uma linha do seu repositório",
      depth: "profundidade desconhecida",
    },
  },
  demo: {
    question: "Por que 3 tentativas?",
    claims: [
      "Limitado a 3, com backoff",
      "Depois de 212 clientes cobrados em dobro",
      "Na revisão, 5 virou 3 por um timeout de 10\u00a0s",
    ],
    firstRevision: "primeira versão",
    noBound: "sem limite",
    lineRead: "A linha era",
    line: (n) => `linha ${n}`,
    origin: (line, years) => `origem · linha ${line} escrita pela primeira vez há ${years} anos`,
    notRecorded: "sem registro",
  },
};
