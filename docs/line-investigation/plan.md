# Line Investigation ("Bore") — plano de implementação e notas de especificação

> Fonte única de verdade para a implementação do handoff
> `design_handoff_line_investigation` (README + `Line Investigation v4.dc.html`).
> Onde este documento diverge do handoff, **este documento vence**: cada divergência abaixo
> foi decidida explicitamente a partir do que o sistema real consegue sustentar.

## 1. Princípios

1. **Verdade acima de fidelidade visual.** Se o mock implica evidência que o sistema não
   consegue sustentar, a UI se adapta; nunca se fabrica a evidência que falta.
2. **Estados de honestidade são preservados:** `weak`, não auditado, auditoria indisponível,
   contradição, claim sem citação, citação fabricada, misattribution e `answerable:false`.
3. **Carregamento progressivo só se for real.** `/api/dig` envia a evidência inteira numa fase
   e a síntese em outra; a UI não encena estágios que a API não transmite.
4. **"Saved across devices" só onde for verdade** (usuário logado, banco habilitado, casos de
   linha). Nunca para visitantes nem para casos de PR (localStorage).
5. **O HEAD atual não representa o arquivo histórico.** A nova UI lê código e blame no sha
   gravado na investigação (`evidence.repo.sha`). Casos sem sha não mostram blame e sinalizam
   que o código exibido é o do HEAD atual.
6. **PR Investigation fica intacta.** Componentes compartilhados que ela usa
   (`findings/Claims`, `EntailmentQuotes`, `SourcesUsed`, `UncitedClaimsAlert`, `rail/RailCard`,
   `chain/use-causal-chain`, `format`, `icons`, `ui`) não são removidos.

## 2. Decisões

| # | Tema | Decisão |
|---|---|---|
| D1 | Dados do demo | Fixture `DigResult` sintética e rotulada para testes determinísticos e validação visual. A produção nunca depende dela. Repo real no GitHub fica para depois. |
| D2 | Casos sem `location` (drill-down) | Continuam no `CaseView` atual. A nova UI só atende casos com `location`. |
| D3 | Gaps | Só se desenha `∅ not recorded` quando o sistema de fato procurou e não achou. Caso contrário o gap é **não verificado**, visualmente neutro. |
| D4 | Core/API | Mudanças mínimas e retrocompatíveis entram antes da UI (etapa 4). |
| D5 | Profundidade | Medida a partir de **hoje** (tempo de referência atual). A Key diz "depth = time before today". |
| D6 | Tokens | Namespace próprio (`li-*`). Landing, PR Investigation e Composer não mudam de accent nem de fonte. |
| D7 | Testes | jsdom + Testing Library + vitest-axe para a UI interativa (a partir da etapa 5). Playwright só para estados canônicos de layout/interação. |
| D8 | Contraste | Tokens de texto neutro corrigidos para ≥ 4.5:1. Nenhuma exceção de Axe evitável. |
| D9 | Sinais sem lugar no handoff | Preservados. Primeira implementação no popover do veredito, incluindo o estado explícito `Out of scope`. |
| D10 | Headline | Adiado. A UI usa o texto real da cláusula. Geração de headline é mudança futura, com avaliação própria. |

## 3. Correções ao handoff

| Handoff | Realidade | Decisão |
|---|---|---|
| 5.4.1: datum = data da última mudança; Key "time before line N's last change" | O mock mede a partir de hoje (A = −3y 6m, "unchanged for 3 y 6 m", "±0 · line 9 today") | D5. Primeiro segmento sempre rotulado "unchanged for X"; traços de quebra só quando X ≥ 45 dias. |
| Tally "2 sources · 2 verified" | O entailment é por claim e grava **no máximo 1 quote verificada por claim** (só na fonte onde foi achada) | Célula verde = fonte que carrega a quote verificada da claim; demais fontes citadas = neutras. |
| Estados do tally: verified / cited / gap | Existem também `weak`, `unsupported`, não auditado (entailment desligado, falha, > 6 claims, check legado sem `claim`) e citação desconhecida | O view model expõe todos; a UI mapeia sem colapsar. |
| "Highlight como substring exata" | `verifyQuote` compara com espaço e caixa normalizados | `locateQuote` mapeia a quote para o intervalo original do body. |
| Letras | Hoje são por ordem cronológica; `letter(26)` gera `[` | Por profundidade (A = mais raso), desempate estável (tipo, id); após Z vem AA, AB… Citação desconhecida não tem letra: mostra o id riscado. O mock rotula o PR como B, mas ele é o 4º mais raso; vale A1, então no caso retry-cap o PR é D. |
| "6 of 6 citations resolve" | O mock conta ocorrências (`pr:812` citado duas vezes) | Conta citações **únicas**, como `verify()` (5 of 5 no caso retry-cap). |
| A8 "N of M" = 4 slots × lanes | O mock ("5 of 6") corresponde a preenchidos + gaps | M = preenchidos + gaps derivados. Só exibido quando **todos** os gaps são verificados; senão "N links". Modos `commits-only`/`grouped`: omitido. |
| Silêncio por cláusula (cláusula 4 do mock) | `toNarrative` descarta todas as claims quando `recorded:false` | Não existe por ora. `recorded:false` vira **uma** cláusula silenciosa com o texto de `answer`, **sem letras e sem trace** (ligá-la a um gap seria inventar o vínculo). |
| Gap sob commit sem PR | O collect não distinguia "procurado e não achado" de "não procurado" | Etapa 4 grava `prLookup`/`reviewLookup`/`issueLookup`. Ver §5. |
| Drawer "cobre só a região vazia" | A 1440px ele cobre o instrumento a partir de x = 772 (texto das cláusulas e fim dos labels) | Aceito como overlay. Validar legibilidade na etapa 9; não reflui o instrumento. |
| Pitch de labels 44 → 56 | Mudar o pitch no hover moveria os labels | Layout calculado uma vez com o pitch reservado (padrão 56). |
| Cluster "< 45 dias" | Encadeamento sem teto gera clusters de milhares de px | Um artefato entra no cluster se o intervalo até o anterior **e** o span total do cluster forem < 45 dias. |
| Artefatos esmaecidos a opacity 0.25 | Texto a 0.25 reprova contraste | Glyph e leader usam opacity; o **texto** do label troca para o token de texto atenuado (≥ 4.5:1). |
| Carregamento: commit → PR → reviews | `/api/dig` não transmite esses estágios | Código e datum aparecem já no loading (a partir do form). Stagger só na chegada real da evidência, sem legenda de estágios. |
| Drawer: contexto, autores, contagens | Autor de PR/issue, nº de comentários, "squashed", "committed directly", "days open", perguntas personalizadas não existem | Só linhas deriváveis: "Closes/Closed by", nº de reviews, "Already drilled into", linhas tocadas (com blame da janela). Pergunta de drill-down = `anchorQuestion[kind]`. |
| Texto do popover "never from the model" | Os veredictos do entailment vêm de um juiz LLM | "never the model's self-assessment". |
| Share | Não existe compartilhamento de caso | Oculto (A12). |
| Busca do header (A13) | Hoje só filtra casos | Mantida como filtro de casos até existir busca de arquivos/símbolos no header. |
| Investigação de intervalo/símbolo | Datum é uma linha só | Datum na última linha do intervalo; o intervalo inteiro recebe o fundo do datum. Revisar na etapa 5. |

## 4. Sinais existentes que precisam de lugar

Todos continuam visíveis. Enquanto o handoff não os desenha, entram no popover do veredito
como itens de checklist, na ordem abaixo:

| Sinal | Fonte | Tom |
|---|---|---|
| Cláusulas com fonte registrada | `claims[].grounded` | ✓ |
| Citações que resolvem para artefatos reais | `citations` vs `unknownCitations` | ✓ / fabricação |
| Quotes verificadas, weak, misattributed, não auditadas | `entailment.checks` | ✓ / ressalva |
| Auditoria indisponível (limitado) | `recorded && grounded && citações && !entailment.checked` | ressalva |
| Claims sem citação | `ungroundedClaims` | ressalva |
| Contradições (revert/reopened/declined) nas fontes citadas | `evidence.contradictions` | ressalva |
| Histórico só no nível de arquivo | `coverage.granularity === "file"` + `evidence.note` | ressalva |
| Última mudança parece cosmética | `cosmeticOrigin(evidence)` | ressalva |
| Não registrado | `recorded:false` + `answer` | silêncio |
| Fora de escopo | `answerable:false` + `answer` | estado próprio |
| Só evidência / erro da síntese | `narrative === null` + `error` | estado próprio |
| Confiança derivada | `confidence.score`, `confidence.level` | rodapé |

Também preservados: "Copy the why", voltar ao código, remover caso (×), `LangToggle`,
`AccountMenu` / "Sign in with GitHub".

## 5. Contrato de dados (etapa 4)

Todos os campos novos são **opcionais**; resultados persistidos antigos continuam válidos e
são lidos como "desconhecido".

| Campo | Onde | Valores |
|---|---|---|
| `evidence.repo.sha` | `RepoRef` | sha completo do commit em que blame/histórico foram lidos |
| `meta.prLookup` | artefato `commit` | `found` · `none` · `skipped` · `failed` |
| `meta.mergedAt` | artefato `pull_request` | ISO, quando o PR/MR foi mergeado |
| `meta.reviewLookup` | artefato `pull_request` (GitHub) | `found` · `none` |
| `meta.issueLookup` | artefato `pull_request` (GitHub) | `found` · `none` |
| `meta.state` | artefato `review` (GitHub) | `APPROVED`, `CHANGES_REQUESTED`, `COMMENTED`, `DISMISSED`, `PENDING` |

Semântica de `prLookup`:
- `found`: o provedor devolveu ao menos um PR/MR associado.
- `none`: o provedor foi consultado para este commit e respondeu que não há PR/MR.
- `skipped`: não houve consulta (limite de enriquecimento, repo sem remote suportado, sem token).
- `failed`: a consulta falhou ou o commit não existe no provedor.

`reviewLookup: found` sem artefato de review significa review sem texto: **não** é gap.
`prLookup: found` sem PR na lane significa que o PR foi atribuído a outro commit da mesma trilha
(deduplicação do collect): também **não** é gap.

### Quando um gap é verificado

| Gap | Verificado quando | Rótulo |
|---|---|---|
| PR ausente | `commit.meta.prLookup === "none"` | não registrado |
| Review ausente | `pr.meta.reviewLookup === "none"` | não registrado |
| Issue ausente | `pr.meta.issueLookup === "none"` | nenhuma issue vinculada |
| Qualquer outro caso | — | não verificado (neutro) |

`verifyQuote` saiu de `entail.ts` para `packages/core/src/quote.ts` (reexportado, mesmo
contrato), junto com `locateQuote`, que devolve o intervalo original no body.

### Endpoints

- `GET /api/file?repo&path[&ref]`: `ref` opcional, sha hexadecimal (7–40). Sem `ref`, lê o
  HEAD do branch padrão (comportamento atual do Composer).
- `GET /api/blame?repo&path&ref&start&end`: `ref` obrigatório (sha), janela de no máximo 400
  linhas. Responde `{ path, ref, spans: BlameSpan[] }`, com
  `BlameSpan = { startLine, endLine, sha, shortSha, date, author? }` recortado à janela.
  Erro → a UI esconde as barras de blame; nunca as fabrica.

## 6. View model (etapa 2)

`buildInvestigationView(result, { now, pending? })` é puro e não persiste nada. Produz:
- `verdict`: `pending` · `evidence-only` · `out-of-scope` · `fabrication` · `not-recorded` · `resolved`;
- `artifacts` ordenados por profundidade, com letra, dias antes de `now`, cláusulas que citam,
  papel (`cited`/`supporting`), `onBore`, quotes verificadas com intervalo no body;
- `clauses` com texto real, letras, citações desconhecidas, status de auditoria da claim e
  células do tally por fonte;
- `gaps` derivados da cadeia, com `verified` e o motivo quando não verificado;
- `checklist` do §4;
- `links` (`N of M`) quando aplicável;
- `answer` e `error` preservados.

`onBore`: artefatos da trilha de blame da linha. Em `coverage: file` nenhum commit está
comprovadamente na trilha; o bore mostra só os citados e seus vizinhos de cadeia, e o drawer
lista todos.

## 7. Layout do bore (etapa 3)

`computeBoreLayout(items, gaps, { now, datumY, … })` é puro. Parâmetros padrão:

| Parâmetro | Valor |
|---|---|
| Cluster | intervalo ao anterior < 45 d **e** span total < 45 d |
| px/dia no cluster | `clamp(12, 120 / spanDias, 24)` |
| Quebra | 40 px, rótulo com o intervalo real |
| Primeiro segmento | 40 px, "unchanged for X"; traços só se X ≥ 45 d |
| Banda de PR | `createdAt` → `mergedAt`; mínimo 12 px centrado em `createdAt` sem `mergedAt` |
| Gap | 96 px (PR ausente), 40 px (review/issue ausente), 24 px quando não verificado |
| Labels | trilha própria sem colisão, pitch reservado 56 px |
| Leaders | cotovelo; offsets decrescentes com a profundidade dentro de cada grupo de sobreposição, nunca se cruzam |
| Ticks | só no primeiro glyph de cada cluster |
| Excesso | mais de 4 artefatos do mesmo tipo num cluster viram um glyph com contagem; bandas de PR nunca são agrupadas; a escala de tempo é a mesma agrupado ou expandido |
| Datas inválidas | artefato fica fora do bore (só no drawer), nunca com profundidade inventada |

Um gap que colidiria com o próximo glyph empurra os mais profundos para baixo (distâncias só
aumentam).

## 8. Tokens (etapa 1)

Namespace `li-` no `@theme` do Tailwind. Nada existente muda. Texto neutro corrigido para
≥ 4.5:1 sobre papel, neutral-100, neutral-200, fundo do datum, pinned e steel-100:

| Token | Valor | Uso |
|---|---|---|
| `--color-li-text-muted` | `#666669` | substitui neutral-600 e neutral-500 em **texto** (≥ 4.64:1) |
| `--color-li-text-subtle` | `#5d5d60` | hints e meta (≥ 5.32:1) |

Neutros 300–500 continuam como tokens **gráficos** (barras, leaders, células). Fontes Barlow e
IBM Plex Mono são carregadas só na árvore da nova UI (etapa 5).

## 9. Etapas

Cada etapa é uma mudança isolada: commit convencional de uma linha, sem coautor, sem
comentários no código.

| # | Etapa | Testes |
|---|---|---|
| 0 | Fixtures: `DigResult` sintético (retry cap) + variantes de estado + legados | coerência da fixture (quotes passam `verifyQuote`, confiança vem de `verify`) |
| 1 | Tokens `li-*` | build, lint |
| 2 | `buildInvestigationView` | todos os estados do §6 |
| 3 | `computeBoreLayout` | §7 + critérios de aceite do bore |
| 4 | Core/API do §5 | artefatos, lookup, sha, parsers de blame, validação das rotas |
| — | **Checkpoint de revisão** | — |
| 5 | `CodeSpecimen`, janela de código, barras de blame, `datumY`; fontes; jsdom/RTL/axe | puros + componentes + Playwright nos estados canônicos |
| 6 | `Bore` (SVG `aria-hidden` + `<ol>`), atrás de flag | builders de path, axe |
| 7 | `ClauseRow` + reducer | reducer, teclado |
| 8 | Nova composição só para casos com `location` | regressão `/pr` |
| 9 | Drawer, popover do veredito, Key | foco, stepping, axe |
| 10 | Shell, rail com filhos, migração `parentCaseId` | rail, zod, migração |
| 11 | Estados | view model |
| 12 | Responsivo | Playwright nos estados canônicos |
| 13 | ~~Headline e silêncio por cláusula~~ — fora do escopo desta entrega (decisão de 2026-09-27) | — |

## 10. Restrições conhecidas do repositório

- Repos de hosts que não são GitHub/GitLab são clonados com `--depth 150`: o histórico local
  da linha pode estar truncado.
- GitHub: `associatedPullRequests(first: 1)`, `reviews(first: 5)`,
  `closingIssuesReferences(first: 5)`, 8 comentários por fio, enriquecimento limitado a 10
  commits.
- GitLab: enriquecimento de MR limitado a 10; notas não têm estado de review.
- Blame via API usa o último commit de cada linha; histórico completo da linha só em checkout
  local (`git log -L`).
- Casos persistidos antes desta mudança não têm sha, lookup, `mergedAt` nem estado de review.
- GitHub: "review" é review formal; comentários de conversa vão para o body do PR. Issue
  ausente só significa "nenhuma issue vinculada por palavra de fechamento".
- Commit local que não existe no GitHub (não enviado) resulta em `prLookup: failed`.
- GitLab: só `prLookup` e `mergedAt`; ausência de review/issue fica "não verificada".

## 11. Etapa 5 — CodeSpecimen: decisões de implementação

| Tema | Handoff | Implementação e motivo |
|---|---|---|
| `datumY` | "headerH + padTop + index × rowH + rowH" | Inclui a borda superior de 1px: 281 no caso retry-cap, o mesmo pixel medido no DOM do v4. |
| Respiro inferior | painel fixo de 580px | 8px entre a última linha e o rodapé, como o v4 (painel 460 × 580 nos dois). |
| Linhas acima escondidas | só o rodapé colapsa | No modo painel, uma linha de controle no topo (`⋯ lines 1–N`) ocupa uma fileira, para o datum continuar no alvo. |
| Voltar a colapsar | não especificado | O rodapé expandido vira "Show less". |
| Linhas em branco | sem barra no mock | Sem barra de blame (apresentação; o blame existe). |
| `aria-label` por linha | pedido no handoff | Texto `sr-only` dentro da linha: `aria-label` esconderia o código do leitor de tela. |
| Tom "mesmo commit" em intervalo | não especificado | Só o commit que mudou o intervalo por último, como o `owningCommit` do core. |
| Largura das barras | valores do mock | `40 × idade ÷ idade mais antiga visível`, mínimo 2px. |
| Estados de blame | não especificados | Cabeçalho diz "loading blame…", "blame unavailable for this revision" ou "current HEAD, not the investigated revision"; nunca desenha barras sem dados. |
| Texto neutro | neutral-500/600 | `text-muted` (#666669) por D8. |
| Número de linha clicável | "manter o comportamento do Composer" | Não interativo no specimen; o Composer continua igual. |
| Modo faixa (820–1099 / < 820) | ±3 / ±2 com "Show file" | Implementado; o rail e o resto do instrumento reorganizam nas etapas 8, 10 e 12. |

Preview só de desenvolvimento em `/dev/specimen` (`page.dev.tsx`, fora do build de produção via
`pageExtensions`), com a fixture sintética ou, com `?source=demo`, dados reais da demo semeada.

`next.config.ts` fixa `turbopack.root` no projeto: um `package-lock.json` solto na home fazia o
Turbopack vigiar a home inteira (requisições de ~20s e reinícios por memória em dev).

Testes: Vitest em dois projetos (`node` para `*.test.ts`, `dom`/jsdom para `*.test.tsx`), axe via
vitest-axe no jsdom sem a regra de contraste (jsdom não calcula cor) e axe completo no Chrome via
Playwright (`npm run test:e2e`, usa o Chrome instalado localmente).

## 12. Etapas 6–9 — decisões de implementação

| Tema | Handoff | Implementação e motivo |
|---|---|---|
| Headline da cláusula | headline curto | Texto real da cláusula truncado em uma linha (D10); nome acessível é o texto completo. |
| Altura reservada (A3) | medir fora da tela | Cópia invisível do texto (até 3 linhas) reserva a altura em CSS; acima de 3 linhas o texto expandido sobrepõe com sombra. |
| Espaçamento de labels | 56 px aprovado | 60 px: label revelado (id + título em 2 linhas) mede ~58 px e colidia com o seguinte. |
| Grupo colapsado (> 4 do mesmo tipo) | expande no hover | Expande no clique e quando a cláusula em foco cita um membro; hover reorganizava o layout sob o cursor. |
| Label fora do `activeSet` | opacity 0.25 | Glyph e leader a 0.25; texto e letra em `text-muted` (D8, contraste). |
| Banda de PR não citada | só o estilo citado | Papel + contorno de tinta, como commit/issue de apoio. |
| PR aberto por muito tempo | — | A banda atravessa quebras (ex.: express #5167, 2,75 anos). Fiel aos dados. |
| Marcação de cláusula por artefato | só no hover do label | Igual: inspecionar (drawer) não marca cláusulas. |
| Modo faixa (< 1100) | bore abaixo do datum | Bore começa abaixo da faixa de código; a régua continua sob a linha investigada, largura total; o rótulo "±0 · line N today" some. Núcleo em x = 48 (o handoff pede 40/24, mas ticks e rótulos de quebra precisam de ~44 px à esquerda). Trace começa no bore, não cruza o código. Tally vai para baixo do texto. |
| Título | uma linha com reticências | Quebra título/localização em telas estreitas; abaixo de 820 px o h1 tem até 2 linhas (com 1 linha sobrava "Why exa…"). |
| Botões primário e ghost | aço `#5980a6` | `steel-700` (5,78:1); o aço dá 3,71:1 com texto claro (D8). |
| Drawer | top 56 px | Top 52 px (altura do header atual; o header de 56 px é da etapa 10). 50 % entre 820–1099 px, bottom sheet 85vh abaixo de 820 px. |
| Gap não verificado | não desenhado | Letra "?", contorno neutro tracejado, 24 px, sem hachura, texto "not verified"; o drawer explica o motivo (skipped / failed / unknown). |
| Gap de review/issue | "before 7be210e" | "on pr:N" (o gap é do PR, não de um commit). |
| Contexto no drawer | linhas livres | Só linhas deriváveis de arestas e lookups ("Closes issue:X", "Merged 15 Mar 2023", "No pull request references this commit"). |
| Share | — | Oculto (A12). |
| Copy the why | — | Mantido na barra inferior (plano §4). |
| Ask a follow-up | Composer pré-preenchido | Volta ao Composer com repo, arquivo e linha selecionados e rolados; exige `prefill` no Composer, `select` no `use-file-viewer` e `focusLine` no `CodeViewer`. |
| Rail direito | não reintroduzir | Removido para casos de linha; casos ancorados mantêm `CaseView` e rail (D2). |
| Veredito com claims misattributed | — | Continua "Resolved" (critério atual: `recorded` + `grounded`); a confiança cai e o popover mostra a contagem. Decisão pendente. |
| Rótulo acima da janela de código | símbolo do trecho | Símbolo mais próximo da janela (fim do trecho escondido). |

Preview só de desenvolvimento em `/dev/line?state=…` (mesma tela, dentro do shell real, com a
fixture sintética e suas variantes).

## 13. Etapa 10 — shell, rail de casos e pai/filho

| Tema | Handoff | Implementação e motivo |
|---|---|---|
| Header | marca, repo, busca, Explain a PR, New investigation, avatar | Igual, com 56 px. Acrescenta o seletor EN/PT (idioma da narrativa já existia) e "Sign in with GitHub" para convidado quando o OAuth está ativo. Share continua oculto (A12). |
| Seletor de repo | troca de repo | Mostra o repo do caso aberto (nome, branch · sha7 do caso, não HEAD) ou o do Composer. O popover oferece "New investigation here" e "Open repository ↗"; não substitui o `RepoBar` do Composer. Caminho local vira o nome da pasta; largura máxima 384 px. |
| Busca | "Search files, symbols or cases" | Casos sempre; arquivos só com repo aberto (mesmo `/api/files` do Composer). Sem índice de símbolos: o placeholder diz "Search cases" quando não há repo. ⌘K foca; Esc fecha sem chegar ao caso. Oculta abaixo de 1280 px (abaixo disso espremia até ~40 px). |
| Rail | Cases, All/Lines/PRs, linhas com glyph | `<aside>` nomeado "Cases" com `<nav>` "Case list" (axe `region`). Casos de linha e PRs na mesma lista; filho logo abaixo do pai com cotovelo; filho órfão fica no topo. O ✕ de remover sobrepõe o fim do título no hover (a largura do título é a do v4); em tela de toque o espaço fica reservado. |
| Subtítulo de linha | `charge.ts:9 · 5 of 6 links` | "N of M links" só quando todos os gaps foram verificados; senão "N links"; sem sufixo quando não há gaps. |
| Subtítulo de filho ancorado | `from C · review·dmitri-k` | Letra do artefato na vista do pai (a nossa ordem de letras é a do bore). |
| Subtítulo de PR | `#944 · 3 of 8 regions` | Regiões explicadas (`recorded` e `grounded`) de regiões detalhadas, a mesma conta de "Regions explained" do `/pr`. |
| Rodapé | "Cases saved across devices" | Convidado: "Sign in to save line cases". Logado: "Line cases saved across devices" só quando o servidor persiste (`GET /api/investigations` devolve `persisted`); senão "Line cases aren't saved on this server". PRs continuam só no navegador. |
| Fonte | Barlow no app todo | Barlow só no header e no rail; corpos do Composer e do `/pr` não mudam (D6). |
| `/pr` | — | Mesmo shell; o rail lista PRs do navegador e casos de linha salvos (abrem em `/app?case=`). Corpo e `PrRail` inalterados; rail direito com altura total. |
| Mobile (< 768) | drawer | Botão de menu abre o rail num diálogo com foco preso, Esc e ✕ no cabeçalho do rail; foco volta ao botão. |
| Drawer de evidência | top 56 px | Top 56 px (header novo). |
| Pai/filho | `parentCaseId` | Coluna `parentCaseId` (migração `20260927160000_investigation_parent_case`). "Ask a follow-up" grava o pai quando a nova pergunta é no mesmo arquivo; drill-down grava o pai. A API tolera banco sem a coluna (P2022): salva sem o pai e devolve `parentSaved: false`. **A migração precisa ser aplicada antes do deploy.** |
| `?case=ID` | — | Abre o caso salvo depois de carregar a lista; id desconhecido é ignorado. |

Mantidos para o passe de refinamento visual (sem problema funcional ou de acessibilidade):

- Trace e tick da régua se sobrepõem no lane x≈482.
- Linhas vazias intencionais no topo do painel de código quando há poucas linhas acima do datum.

Decisão de produto pendente: veredito "Resolved" com claims misattributed (§12). Comportamento
atual preservado.

## 14. Etapa 11 — estados

| Tema | Handoff | Implementação e motivo |
|---|---|---|
| Carregamento | código e datum na hora; bore progressivo por estágio | Enquanto o `/api/dig` coleta, o caso já aparece como rascunho a partir do formulário: título, código no HEAD (cabeçalho "loading blame…"), datum e o texto "Collecting the line's history…" com 4 linhas de skeleton. Sem legenda de estágios: a API não transmite estágios. Quando a evidência chega, o mesmo componente continua montado (a `key` do rascunho passa para o caso) e o arquivo troca para o sha do caso sem apagar as linhas. |
| Espaço reservado no título | — | Durante a coleta, "blame @ ·······" e "Ask a follow-up" ficam reservados invisíveis, para a linha do título não quebrar na chegada; o datum não se move (medido: 161 → 161 px). |
| Stagger | 60 ms, de cima para baixo, nenhum com reduced motion | Só na chegada real da evidência numa tela que estava coletando; caso salvo aberto pelo rail não anima. Ordem pela profundidade do glifo; o rótulo anima junto com o seu glifo. `animation-fill-mode: backwards` para não brigar com o esmaecimento por opacidade. |
| Erro | shell mantido, mensagem + Retry na área do instrumento | Erro de caso de linha fica no lugar do "why", com `ErrorState` ("Try again" repete a mesma pergunta, com o mesmo pai) e "Back to code". Drill-down (sem `location`) continua no caminho antigo (D2). |
| Vazio | "no history yet… added in the working tree" | "No history was found for this line." + "The investigation read <sha7> and found no commit that changed it…". O sistema não sabe se a linha está só na working tree (o collect lê o HEAD); o texto diz apenas o que foi lido. Sem bore, sem "All evidence · 0" e sem Key. |
| Overflow de código | `overflow-x: auto` só no painel | Já era assim desde a etapa 5 (a "linha cortada" anotada na etapa 10 era rolagem horizontal com barra oculta). |
| Recuperação parcial | cláusulas silenciosas por cláusula | Não existe (depende da etapa 13, fora do escopo). |

## 15. Estado

Etapas 0–11 implementadas e comitadas; etapa 12 (responsivo) em seguida. A etapa 13 ficou fora desta entrega.
