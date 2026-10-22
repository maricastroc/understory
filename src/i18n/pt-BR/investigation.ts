import type { Messages } from "../messages";

const of = (label: string) => {
  if (label === "o arquivo") return "do arquivo";
  if (label === "commit") return "do commit";
  if (label.startsWith("linhas ")) return `das ${label}`;
  if (label.startsWith("linha ")) return `da ${label}`;
  if (/^(commit|pull request) /.test(label)) return `do ${label}`;
  if (/^(revisão|issue) /.test(label)) return `da ${label}`;
  return `de ${label}`;
};

const at = (label: string) => {
  if (label === "o arquivo") return "no arquivo";
  if (label.startsWith("linhas ")) return `nas ${label}`;
  if (label.startsWith("linha ")) return `na ${label}`;
  if (/^(commit|pull request) /.test(label)) return `no ${label}`;
  if (/^(revisão|issue) /.test(label)) return `na ${label}`;
  return `em ${label}`;
};

const the = (label: string) => {
  if (label.startsWith("linhas ")) return `as ${label}`;
  if (label.startsWith("linha ")) return `a ${label}`;
  if (label.startsWith("commit ")) return `o ${label}`;
  return label;
};

export const artifact: Messages["artifact"] = {
  kind: { commit: "commit", pull_request: "pull request", review: "revisão", issue: "issue" },
  reviewState: {
    APPROVED: "Aprovada",
    CHANGES_REQUESTED: "Alterações solicitadas",
    COMMENTED: "Comentada",
    DISMISSED: "Descartada",
    PENDING: "Pendente",
  },
  undated: "sem data",
  opened: (date) => `aberto em ${date}`,
  open: (from, to) => `aberto ${from} → ${to}`,
  relation: { pull_request: "mesclado como", review: "em", issue: "fechada por", other: "via" },
  openOnGitHub: "Abrir no GitHub",
  openOnGitLab: "Abrir no GitLab",
  openSource: "Abrir a fonte",
};

export const gap: Messages["gap"] = {
  chip: { pull_request: "PR", review: "revisão", issue: "issue" },
  notVerified: "não verificado",
  noLinkedIssue: "sem issue vinculada",
  notRecorded: "sem registro",
  title: {
    pull_request: "Nenhum pull request, revisão ou issue",
    review: "Nenhuma revisão no pull request",
    issue: "Nenhuma issue vinculada ao pull request",
  },
  basis: {
    searched: "O provedor foi consultado e não tem nada registrado.",
    skipped:
      "Este commit não foi consultado (fora do limite de enriquecimento ou sem um remoto compatível).",
    failed: "A consulta falhou, então não se sabe o que existe.",
    unknown:
      "Este caso foi salvo antes de as consultas serem registradas, então não dá para confirmar a ausência.",
  },
  unverifiedBody: (id) =>
    `Nada aparece antes de ${id}, mas isso não foi verificado. O Understory não trata isso como silêncio.`,
  noPrReading: (id) =>
    `O blame chega até ${id}, e nenhum pull request, revisão ou issue foi encontrado para ele. A mensagem do próprio commit é tudo o que o registro guarda.`,
  noPr: (id) =>
    `O blame chega até ${id}, mas nenhum pull request, revisão ou issue o explica. O Understory não deduz um motivo aqui.`,
  noReview: (id) =>
    `${id} foi mesclado sem uma revisão registrada. O Understory não deduz o que uma revisão teria dito.`,
  noIssue: (id) =>
    `${id} não fecha nenhuma issue por palavra-chave. Uma issue ainda pode ser citada em outro lugar.`,
  silent: "Histórico em silêncio · recorded: false",
  unconfirmed: "Não verificado · ausência não confirmada",
};

export const reading: Messages["reading"] = {
  added: "adicionou esta linha",
  respaced: "mudou só o espaçamento desta linha",
  rewrote: "reescreveu esta linha",
  scope: {
    line: "fonte ligada diretamente a esta linha",
    change: "dito sobre a mudança como um todo",
    "earlier change": "dito sobre uma mudança anterior nesta linha",
    file: "do histórico do arquivo, não desta linha",
  },
  place: {
    "on the line": "comentário feito nesta linha",
    "in its hunk": "comentário feito perto desta linha",
    "same file, elsewhere": "comentário feito em outro ponto deste arquivo",
    "another file": "comentário feito em outro arquivo",
  },
  onEarlierVersion: (place) => `${place}, numa versão anterior`,
  earlierCaption: "encontrada ao seguir a linha para trás · não lida em busca de motivo",
  fileOnly: "Estas são mudanças no arquivo. Não foi possível ler o histórico da própria linha.",
  notRead: "O histórico da linha antes disto não foi lido.",
  notReadBecause: (why) => `O histórico da linha antes disto não foi lido: ${why}.`,
  why: {
    "depth limit": "esta visão só volta algumas mudanças",
    "request limit": "esta visão só volta algumas mudanças",
    "time limit": "seguir a linha levou tempo demais",
    "no patch": "o host não devolveu a mudança",
    "line not located": "não foi possível seguir a linha pela mudança",
    quota: "a cota de requisições do host estava baixa",
    cancelled: "a investigação foi cancelada",
  },
};

export const subject: Messages["subject"] = {
  lines: (start, end) => (start === end ? `linha ${start}` : `linhas ${start}–${end}`),
  file: "o arquivo",
  commit: (ref) => `commit ${ref}`,
  historyOf: (label) => `Histórico ${of(label)}`,
  around: (label) => `Em torno ${of(label)}`,
  asItReadsNow: (label) => `${label} · como está agora`,
  today: "hoje",
  beforeToday: (age) => `${age} antes de hoje`,
  between: (age) => `${age} entre estas`,
  unchangedFor: (age) => `sem mudança há ${age}`,
  noChange: (age, label) => `${age} sem mudança ${at(label)}`,
  margin: {
    beforeToday: "antes de hoje",
    between: "entre",
    unchanged: "sem mudança",
    noChange: "sem mudança",
  },
  oldestChange: (label) => `mudança mais antiga registrada ${at(label)}`,
  earliestArtifact: "artefato mais antigo coletado",
  asked: {
    commit: "a mudança sobre a qual este caso pergunta",
    pull_request: "o pull request sobre o qual este caso pergunta",
    review: "a revisão sobre a qual este caso pergunta",
    issue: "a issue sobre a qual este caso pergunta",
  },
  wrote: (label) => `escreveu ${the(label)} como está hoje`,
  earlierChange: (label) => `uma mudança anterior ${at(label)}`,
};

export const clause: Messages["clause"] = {
  noReason: "nenhum motivo registrado",
  sources: (n) => (n === 1 ? "1 fonte" : `${n} fontes`),
  verified: (n) => (n === 1 ? "1 verificada" : `${n} verificadas`),
  weak: "apoio fraco",
  unsupported: "não sustentada",
  unaudited: "não auditada",
  notCollected: (n) => (n === 1 ? "1 não coletada" : `${n} não coletadas`),
  silent: "Sem registro. Nenhuma fonte explica isto.",
  source: (letter, kind, id) => `${letter}, ${kind} ${id}`,
  supportedBy: (sources) => `Apoiada por ${sources}.`,
  noSource: "Nenhuma fonte coletada.",
  quotesVerified: (n) =>
    n === 1 ? "1 citação literal verificada." : `${n} citações literais verificadas.`,
  noQuote: "Nenhuma citação literal.",
  weakDescription: "As fontes tratam do assunto, mas nenhuma linha comprova.",
  unsupportedDescription: "As fontes citadas não a sustentam.",
  unauditedDescription: "Não auditada.",
  neverCollected: (ids) => `Cita ${ids}, que nunca foi coletado.`,
};

export const source: Messages["source"] = {
  missing: "Citada, mas nunca coletada · não dá para conferir",
  verified: "✓ Citação literal encontrada na fonte",
  weak: "Citada · trata do assunto, mas nenhuma linha comprova",
  misattributed: "Citada · esta fonte não sustenta a afirmação",
  unaudited: "Citada · não auditada",
  elsewhere: "Citada · a citação literal está em outra fonte",
  noQuote: "Citada · sem citação literal nesta fonte",
};

export const why: Messages["why"] = {
  title: "O que o histórico sustenta",
  reconstructed: "O porquê reconstruído",
  likelyNote:
    "O texto citado documenta a mudança a que pertence. A ligação dele com esta linha é uma interpretação do Understory.",
  notIdentified: "Nenhuma justificativa para esta linha foi identificada no histórico.",
  documented: "Documentado para esta linha",
  likely: "Explicação provável",
  likelyMany: "Explicações prováveis",
  alsoQuoted: "Também citado para esta frase",
  fromRecord: "Do registro desta mudança",
  lastChange: "última mudança",
  earlierChange: "mudança anterior",
  theLastChange: "a última mudança",
  anEarlierChange: "uma mudança anterior",
  titled: (title) => `com o título “${title}”`,
  part: {
    title: "título",
    message: "mensagem",
    description: "descrição",
    discussion: "discussão",
    "review summary": "resumo",
    "review comment": "comentário",
  },
  and: "e",
  where: (head, parts) => (parts ? `${parts} ${of(head)}` : head),
  commitHead: "commit",
  quality: {
    insufficient: "insuficiente: as fontes citadas não dizem isso",
    refuted: "contrariada: as fontes citadas dizem outra coisa",
    absent: "ausente: nenhuma fonte citada foi verificada",
  },
  notEstablished: (n) => `Não estabelecido · ${n}`,
  sentenceOf: (label, n) => `${label} · afirmação ${n}`,
  changes: "Mudanças, da mais recente para a mais antiga",
  checking: (n) => `vendo a afirmação ${n} · Esc volta aqui`,
  selectClause: "selecione uma afirmação para ver a evidência",
  selectSentence: "selecione uma frase para ver a evidência",
  collecting: "Coletando o histórico da linha…",
  reconstructing: (n) =>
    n === 1 ? "Reconstruindo a partir de 1 artefato…" : `Reconstruindo a partir de ${n} artefatos…`,
  noHistory: "Nenhum histórico foi encontrado para esta linha.",
  noCommitAt: (sha) =>
    `A investigação leu ${sha} e não encontrou nenhum commit que a tenha alterado, então não há nada para rastrear.`,
  noCommit:
    "A investigação não encontrou nenhum commit que a tenha alterado, então não há nada para rastrear.",
  noReconstruction: "Sem reconstrução. As evidências abaixo estão completas.",
  outOfScope:
    "A pergunta está fora do que o histórico desta linha consegue responder. As evidências continuam abaixo.",
};

export const verdict: Messages["verdict"] = {
  label: {
    pending: "Reconstruindo…",
    "evidence-only": "Só evidências",
    "out-of-scope": "Fora do escopo",
    fabrication: "Citação sem respaldo",
    "not-recorded": "Sem registro",
    resolved: "Resolvido",
  },
  title: {
    pending: "Ainda reconstruindo",
    "evidence-only": "Por que não há reconstrução",
    "out-of-scope": "Por que está fora do escopo",
    fabrication: "Por que a citação está sem respaldo",
    "not-recorded": "Por que não há registro",
    resolved: "Por que está resolvido",
  },
  answered: "Respondido",
  checked: "O que foi verificado",
  confidenceNote: "Calculada a partir das verificações acima, nunca pela autoavaliação do modelo.",
  answeredConfidenceNote:
    "Calculada a partir das verificações acima, nunca pela autoavaliação do modelo. Ela avalia as fontes da resposta, não a ligação delas com esta linha.",
  derived: "Confiança calculada",
  level: { high: "alta", medium: "média", low: "baixa" },
  grounded: (grounded, total) =>
    `${grounded} de ${total === 1 ? "1 afirmação" : `${total} afirmações`} ${grounded === 1 ? "se apoia" : "se apoiam"} em fontes registradas`,
  resolvedUnknown: (resolved, total, unknown) =>
    `${resolved} de ${total === 1 ? "1 citação aponta" : `${total} citações apontam`} para artefatos reais; ${unknown} nunca foi coletado`,
  resolved: (resolved, total) =>
    `${resolved} de ${total === 1 ? "1 citação aponta" : `${total} citações apontam`} para artefatos reais`,
  verbatim: (n) =>
    n === 1 ? "1 citação literal encontrada" : `${n} citações literais encontradas`,
  misattributed: (n) => (n === 1 ? "1 mal atribuída" : `${n} mal atribuídas`),
  weak: (n) => (n === 1 ? "1 fraca" : `${n} fracas`),
  unaudited: (n) => (n === 1 ? "1 não auditada" : `${n} não auditadas`),
  auditUnavailable: "Auditoria de citações indisponível; a confiança fica limitada",
  uncited: (n) =>
    n === 1
      ? "1 afirmação não cita nada que foi coletado"
      : `${n} afirmações não citam nada que foi coletado`,
  fileLevel: "Só o histórico do arquivo, não o da linha",
  cosmetic: (ref) => `A última mudança, ${ref}, parece cosmética`,
  noReconstruction: "Nenhuma reconstrução foi produzida",
};

export const caseScreen: Messages["caseScreen"] = {
  anchoredOn: "ancorado em",
  anchoredOnCommit: "ancorado no commit",
  onBranch: (branch) => `em ${branch}`,
  collecting: "Coletando",
  failed: "Falhou",
  backToQuestion: "← Voltar à pergunta",
  followUp: "Continuar neste arquivo",
  key: "Legenda",
  copied: "Copiado",
  copyWhy: "Copiar o porquê",
  legend: {
    commit: "commit",
    pr: "PR",
    review: "revisão",
    issue: "issue",
    notRecorded: "sem registro",
    notVerified: "não verificado",
    cited: "citada ·",
    supporting: "de apoio",
    depth: "profundidade = tempo antes de hoje",
  },
  continues: "↳ continua",
  drilledFrom: (question) => `aprofundado a partir de “${question}”`,
  followUpTo: (question) => `depois de “${question}”`,
  artifacts: (n) => (n === 1 ? "1 artefato" : `${n} artefatos`),
  aroundSummary: (label, artifacts) => `Em torno ${of(label)} · ${artifacts}`,
  historySummary: (n) => (n === 1 ? "Histórico · 1 mudança" : `Histórico · ${n} mudanças`),
  over: (summary, span) => `${summary} em ${span}`,
  historyArtifacts: (artifacts) => `Histórico · ${artifacts}`,
  evidenceOf: (n) => `EVIDÊNCIA · AFIRMAÇÃO ${n}`,
  sourceOf: (i, total) => `${i} DE ${total}`,
  sourcesOfClause: "Fontes desta afirmação",
  previousSource: "Fonte anterior",
  nextSource: "Próxima fonte",
  closeEvidence: "Fechar evidência",
  noSource: "Esta afirmação não cita nenhuma fonte coletada.",
  missingSource:
    "O modelo citou esta fonte, mas ela não está nas evidências que o Understory coletou, então a afirmação não pode ser conferida com ela.",
  depthOf: (depth, max) => `${depth} de ${max}`,
  showInHistory: "Ver no histórico ↓",
  investigate: "Investigar →",
  opensCase: (question) => `Abre um novo caso ancorado aqui: “${question}”`,
  anchor: (label) => `Âncora, ${label}`,
  anchorOfCase: "âncora deste caso",
  showLess: "Mostrar menos",
  showAll: "Mostrar tudo",
  showFile: "Mostrar arquivo",
  collectedAround: (n) =>
    n === 1 ? "1 artefato coletado em torno dela" : `${n} artefatos coletados em torno dela`,
  blameHint: {
    ready: "passe o mouse numa barra para ver o commit",
    loading: "carregando o blame…",
    unavailable: "blame indisponível nesta versão",
    unpinned: "HEAD atual, não a versão investigada",
  },
  codeLines: "Linhas de código, role para o lado para ver as mais longas",
  loadingFile: "Carregando o arquivo…",
  fileFailed: "Não foi possível carregar este arquivo.",
  hidden: (lines) => `⋯ ${lines}`,
  hiddenSymbol: (lines, symbol) => `⋯ ${lines} · ${symbol}`,
  lineAria: (line) => `Linha ${line}`,
  investigatedLine: "linha investigada",
  lastChangedBy: (sha, age) => `alterada por último em ${sha}, há ${age}`,
};

export const questions: Messages["questions"] = {
  line: "Por que esta linha é assim?",
  range: "Por que estas linhas são assim?",
  deepLink: "Por que esta linha é assim? Reconstrua por que ela mudou.",
  symbol: (name) => `Por que ${name} é assim?`,
  anchor: {
    commit: "Por que esta mudança foi feita?",
    pull_request: "Por que este pull request foi aberto?",
    issue: "Por que esta issue foi aberta?",
    review: "O que esta revisão apontou?",
  },
};

export const accessible: Messages["accessible"] = {
  notCited: "não citado por nenhuma afirmação",
  citedBy: (n) => `citado pela afirmação ${n}`,
  citedByMany: (list, last) => `citado pelas afirmações ${list} e ${last}`,
  quoteVerified: "citação literal verificada",
  noPrBefore: (target) => `nenhum pull request, revisão ou issue antes ${of(target)}`,
  noReviewOn: (target) => `nenhuma revisão ${at(target)}`,
  noIssueOn: (target) => `nenhuma issue vinculada ${at(target)}`,
  notVerified: (text) => `Não verificado: ${text}`,
  notRecorded: (text) => `Sem registro: ${text}`,
  capitalized: (text) => text.charAt(0).toUpperCase() + text.slice(1),
};

export const drawer: Messages["drawer"] = {
  mergedVia: (id) => `mesclado via ${id}`,
  reviewOn: (id) => `em ${id}`,
  reviewsWithText: (n) => (n === 1 ? "1 revisão com texto" : `${n} revisões com texto`),
  mergedThrough: (id) => `Mesclado por meio de ${id}`,
  noPrRefs: "Nenhum pull request menciona este commit",
  prsNotLooked: "Os pull requests deste commit não foram consultados",
  prLookupFailed: "A consulta de pull requests falhou para este commit",
  closes: (id) => `Fecha ${id}`,
  merged: (date) => `Mesclado em ${date}`,
  noMergeDate: "Nenhuma data de merge registrada",
  noReview: "Nenhuma revisão registrada",
  closedBy: (id) => `Fechada por ${id}`,
  state: (state) => `Estado: ${state}`,
  reviewState: (state) => `Estado da revisão: ${state}`,
  issueState: { open: "aberta", closed: "fechada" },
};
