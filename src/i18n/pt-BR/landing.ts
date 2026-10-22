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
  howItWorks: "Como funciona",
  hero: {
    contrast: (blame, who, when, why) => [
      "O ",
      blame,
      " mostra ",
      who,
      " e ",
      when,
      ". O Understory mostra o ",
      why,
      ".",
    ],
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
    clauses: {
      title: "Cada afirmação aponta para as suas fontes",
      body: "Cada frase traz as letras dos artefatos que a sustentam. A conclusão funciona como um índice do registro.",
    },
    citations: {
      title: "Citações são conferidas, não tomadas como certas",
      body: "Uma verificação determinística encontra cada citação literal na sua fonte. Uma referência a algo que não foi coletado é barrada antes de chegar a você.",
    },
    silence: {
      title: "Mostra onde a pista esfria",
      body: "Uma lacuna só conta como silêncio quando o provedor confirma que não há nada ali. E, quando nenhuma fonte dá um motivo, a resposta foi feita para dizer isso, não para adivinhar.",
    },
    quoteFound: (id) => `✓ Citação literal encontrada em ${id}`,
    rejected: "fora das evidências, rejeitada",
    direct: "commit direto",
    reason: (label) => `motivo: ${label}`,
  },
  method: {
    title: "De uma linha que você não entende à decisão por trás dela.",
    point: {
      title: "Aponte uma linha",
      body: "Abra um repositório do GitHub, encontre o arquivo pelo nome ou por um símbolo e selecione a linha exata.",
    },
    follow: {
      title: "Desça pela trilha",
      body: "O blame encontra o commit. O pull request, as revisões e as issues por trás dele guardam o raciocínio, cada um na sua profundidade real no tempo.",
    },
    read: {
      title: "Leia a reconstrução",
      body: "Um porquê reconstruído, com cada afirmação ligada a uma fonte que você pode abrir. Ou a resposta honesta de que o registro não diz nada.",
    },
    trail: { commit: "commit", pullRequest: "pull request · revisão", issue: "issue" },
    silence: "Por que tentar de novo: sem registro",
  },
  closing: {
    title: "Interrogue o seu próprio código.",
    body: "Escolha um repositório e uma linha. Veja o que o histórico realmente diz.",
  },
  demo: {
    region: (path, line) => `Exemplo de investigação de ${path}, linha ${line}`,
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
    summary: {
      artifacts: (n) => (n === 1 ? "1 artefato" : `${n} artefatos`),
      clauses: (n) => (n === 1 ? "1 afirmação" : `${n} afirmações`),
      silences: (n) => (n === 1 ? "1 silêncio" : `${n} silêncios`),
    },
    askedToken: (token, line) => `pergunta sobre o token ${token} · linha ${line}`,
    askedLine: (line) => `pergunta sobre a linha ${line}`,
    current: (line) => `commit · escreveu a linha ${line} como está hoje`,
    originSilent: "A origem da linha não deixou registro",
    recordSilent: "Aqui o registro se cala",
    origin: (line, years) => `origem · linha ${line} escrita pela primeira vez há ${years} anos`,
    tally: (sources, quotes) =>
      `${sources === 1 ? "1 fonte" : `${sources} fontes`} · ${quotes === 1 ? "1 citação literal verificada" : `${quotes} citações literais verificadas`}`,
    heading: "porquê reconstruído · leia de cima para baixo",
    scroll: "Histórico da linha, role para o lado para ver as linhas longas",
    code: (from, to) => `Código, linhas ${from}–${to}`,
    specimenLines: (path, from, to) => `${path}, linhas ${from}–${to}`,
    quoted: "citação literal",
    silentAge: (age) => `${age} · registro em silêncio`,
    notRecorded: "sem registro",
    unchanged: "sem mudança",
    legend: {
      depth: "profundidade = tempo · a sondagem segue o token para baixo",
      cited: "citado",
      context: "contexto",
      trace: "rastro verificado",
      silent: "registro em silêncio",
    },
  },
};
