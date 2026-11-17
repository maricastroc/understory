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
    lead: "O Understory investiga por que uma linha de código existe. Para isso, percorre commits, pull requests e issues em busca das decisões que levaram à sua implementação.",
  },
  standard: {
    kicker: "evidências > afirmações",
    quoteFound: (ref) => `✓ Trecho confirmado na ${ref}`,
    rejected: "descartado por não estar entre as evidências",
  },
  method: {
    silence: "Por que repetir a tentativa? Sem explicação registrada.",
  },
  closing: {
    title: "Interrogue o seu próprio código.",
    body: "Escolha um repositório e uma linha de código. Descubra o que o histórico revela sobre ela.",
  },
  dig: {
    asked: (token, line) => `pergunta sobre o número ${token} · linha ${line}`,
    whyMissing: "não está no blame",
    what: "o quê",
    today: "hoje",
    cue: "role para escavar · profundidade = tempo",
    digGo: "Escavar um exemplo",
    unchanged: (age, line) => `quebra de escala · ${age}, linha ${line} sem mudança`,
    answer: (done, total) => `motivos encontrados · ${done} de ${total}`,
    answerOpen: "Sem evidências, a resposta permanece em aberto.",
    chapters: "Capítulos",
    chapter: (n) => `Capítulo ${n}`,
    names: ["A linha", "O blame", "A trilha", "A fonte", "O silêncio", "A leitura"],
    progress: (done, total) => `${done} de ${total}`,
    open: (n) => `${n} em aberto`,
    first: {
      title: "O blame para aqui.",
      note: "O git blame mostra quem alterou a linha e quando. Mas não explica por quê.",
    },
    trail: {
      title: "Treze dias em março de 2023.",
      note: "A partir do commit, a investigação encontra um pull request, duas revisões e uma issue.",
    },
    proof: {
      title: "Conferido na fonte.",
      note: "Cada conclusão aponta para os registros que a sustentam. As citações são verificadas diretamente nas fontes.",
    },
    silence: {
      title: "Aqui o registro se cala.",
      note: (ref) =>
        `O histórico chega ao commit ${ref}, mas não há pull requests, revisões ou issues que expliquem a decisão. Sem evidências suficientes, o Understory deixa a pergunta em aberto.`,
      looked: "Nenhum registro encontrado nas fontes consultadas",
    },
    reading: {
      title: "Três motivos no registro. Uma pergunta em aberto.",
      note: "Cada resposta é acompanhada das evidências que permitem conferir como ela foi construída.",
      reconstructed: "reconstruído",
      verified: "verificado",
      quotes: (n) => (n === 1 ? "1 trecho confirmado" : `${n} trechos confirmados`),
      open: "Por que repetir a tentativa?",
      openBody: (age) =>
        `A primeira versão permaneceu por ${age} sem registros que expliquem sua origem. O Understory mantém essa pergunta em aberto.`,
    },
    closing: {
      line: "uma linha do seu repositório",
      depth: "profundidade desconhecida",
    },
  },
  demo: {
    question: "Por que 3 tentativas?",
    claims: [
      "Limite de 3 tentativas, com espera progressiva",
      "A mudança veio após 212 clientes serem cobrados em dobro",
      "Na revisão, o limite caiu de 5 para 3 por causa de um timeout de 10 segundos",
    ],
    noBound: "sem limite",
    lineRead: "Versão anterior da linha",
    line: (n) => `linha ${n}`,
    origin: (line, years) => `origem · linha ${line} escrita pela primeira vez há ${years} anos`,
    notRecorded: "sem registro",
  },
};
