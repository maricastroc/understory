import type { Messages } from "../messages";

export const report: Messages["report"] = {
  backToCode: "Voltar ao código",
  inconclusive: "Inconclusivo",
  exhibits: (n) => (n === 1 ? "1 artefato" : `${n} artefatos`),
  exhibit: (letter) => `Artefato ${letter}`,
  confidence: (level) => `Confiança ${level.toLowerCase()}`,
  level: { high: "Alta", medium: "Média", low: "Baixa" },
  kind: { commit: "Commit", pull_request: "Pull request", issue: "Issue", review: "Revisão" },
  noConclusion: "Nenhuma conclusão foi produzida. Abaixo estão só as evidências coletadas.",
  copiedToClipboard: "Copiado para a área de transferência",
  findings: {
    title: "Resultado",
    meta: "Conclusão reconstruída, com cada afirmação ligada às fontes que cita",
    pendingMeta: "Reconstruindo a conclusão a partir das evidências…",
    pending: "Reconstruindo a conclusão…",
    pendingBody:
      "Escrevendo a resposta e conferindo cada citação na própria fonte. As evidências e a cadeia de proveniência abaixo já estão prontas.",
    concluded: "Conclusão da investigação",
    noRecord: "Nenhuma conclusão registrada",
    uncited: "sem citação",
    grounded: "Todas as citações têm respaldo",
    fabrication: "Citação sem respaldo",
    auditUnavailable: "Auditoria de citações indisponível, confiança limitada",
    notSubstantiated: (n) => (n === 1 ? "1 não sustentada" : `${n} não sustentadas`),
    substantiated: (n) => (n === 1 ? "1 sustentada na fonte" : `${n} sustentadas na fonte`),
    checkedInSource: "citações conferidas na fonte",
    contradicted: (n) =>
      n === 1
        ? "Uma fonte citada é contrariada pelo histórico posterior"
        : `${n} fontes citadas são contrariadas pelo histórico posterior`,
    contradictedNote: "O motivo registrado foi desfeito ou recusado depois, então a confiança cai.",
    substantiation: "Sustentação · citação literal da fonte",
    fabricated: (n) =>
      n === 1
        ? "1 citação sem respaldo barrada pela verificação:"
        : `${n} citações sem respaldo barradas pela verificação:`,
    notCollected: "Fora das evidências coletadas.",
    misattributed: (n) =>
      n === 1
        ? "Uma fonte citada não sustenta a afirmação"
        : `${n} fontes citadas não sustentam a afirmação`,
    misattributedNote:
      "A citação aponta para um artefato real, mas o texto da fonte não sustenta a afirmação, então ela não conta como apoio.",
    uncitedSentences: (n) =>
      n === 1
        ? "1 frase desta resposta não cita nenhuma fonte coletada. Ela aparece por transparência, mas não conta para a confiança."
        : `${n} frases desta resposta não citam nenhuma fonte coletada. Elas aparecem por transparência, mas não contam para a confiança.`,
    outOfScopeMeta: "A pergunta não corresponde ao histórico deste código",
    outOfScope: "Pergunta fora do escopo da investigação",
    outOfScopeAnswer:
      "Esta pergunta não pode ser respondida a partir do código selecionado e do seu histórico. Pergunte por que a linha existe, mudou ou foi introduzida.",
    sourcesUsed: "Fontes usadas",
    sourceNoun: { pull_request: "PR", commit: "Commit", issue: "Issue", review: "Revisão" },
  },
  chain: {
    title: "Cadeia de proveniência",
    meta: "Issue → pull request → revisão → commit: o caminho causal até esta linha e onde ele se interrompe",
    onChain: "Na cadeia citada",
    noIssue: "nenhuma issue vinculada",
    noReview: "nenhuma revisão registrada",
    direct: "Commit direto, sem pull request, issue ou revisão na trilha",
    commitsOnly:
      "Nenhum pull request, issue ou revisão foi encontrado antes destes commits. O histórico registrado desta linha são os próprios commits.",
    grouped:
      "Este caso salvo não registra as ligações estruturais, então a trilha aparece agrupada por tipo.",
    complete: "Trilha completa: cada mudança leva a um pull request, uma issue e uma revisão.",
    gaps: (n) =>
      n === 1
        ? "lacuna na trilha causal, tracejada abaixo. O motivo registrado da linha para aí."
        : "lacunas na trilha causal, tracejadas abaixo. O motivo registrado da linha para aí.",
    fewer: "Mostrar menos caminhos",
    all: (n) => `Mostrar os ${n} caminhos`,
    more: (n) => `· mais ${n}`,
  },
  evidence: {
    title: "Evidências",
    meta: (total, cited, supporting) =>
      `${total === 1 ? "1 artefato" : `${total} artefatos`} · ${cited === 1 ? "1 citado" : `${cited} citados`} · ${supporting} de apoio`,
    cited: "Citado",
    supporting: "De apoio",
    drillTitle: (question, kind) =>
      `Abre um novo caso ancorado ${/^(revisão|issue)$/.test(kind) ? "nesta" : "neste"} ${kind}, com a pergunta “${question}”`,
    investigate: "Investigar:",
  },
  timeline: {
    title: "Linha do tempo da proveniência",
    meta: "PR → commit → revisão → merge: a cadeia que formou esta linha, da mais antiga para a mais recente",
    onChain: (total) => `de ${total} na cadeia de proveniência`,
    showAll: (n) => `Mostrar as ${n} mudanças`,
    hidden: (n) => (n === 1 ? "· 1 anterior oculta" : `· ${n} anteriores ocultas`),
    onChainBadge: "Na cadeia",
    current: "· atual",
  },
  rail: {
    label: "Detalhes da investigação",
    repository: "Repositório",
    branch: "Branch",
    anchor: "Âncora",
    history: "Histórico",
    commits: (n) => (n === 1 ? "1 commit" : `${n} commits`),
    contributors: "Contribuidores",
    remote: "Remoto",
    open: "abrir",
    chain: "Cadeia de proveniência",
    people: "Quem participou",
    allGrounded: "Todas as citações têm respaldo",
    fabricated: (n) => (n === 1 ? "1 citação sem respaldo" : `${n} citações sem respaldo`),
    groundedNote:
      "Cada fonte citada aponta para um artefato real que foi coletado. Nenhuma citação sem verificação.",
    fabricatedNote:
      "Uma fonte citada não está nas evidências coletadas. A verificação barrou a citação.",
    primary: "Fontes primárias",
    corroborating: "Corroboram",
    contradicting: "Contrariam",
  },
};
