# PR Investigation ("Bore", núcleos paralelos) — plano da etapa 02

> Fonte de verdade para implementar `design_handoff_git_investigator/02-pr-investigation`
> (README + `design/PR Investigation.dc.html`). Onde este documento diverge do handoff, **este
> documento vence**. Tudo o que não está aqui segue `docs/line-investigation/plan.md`: princípios,
> tokens, acessibilidade, precedência do Esc, drawer, reduced motion.

## 1. Decisões (aprovadas em 2026-09-27)

| # | Tema | Decisão |
|---|---|---|
| PR-D1 | O que é uma região | Uma região é um trecho concreto: **path + intervalo de linhas** (lado base). O collector continua agrupando por commit de origem; uma camada de normalização na apresentação deriva as regiões dos `findings[].targets` (§2). Intervalos distintos viram regiões distintas, mesmo quando vêm do mesmo finding; regiões do mesmo finding compartilham a mesma cadeia de proveniência, sem duplicar nem inventar história. |
| PR-D2 | Profundidade | Só a proveniência coletada: por finding, commit → PR → reviews e issues. A história mais funda do protótipo (R1 → `pr:201` → `issue:140`) não é sintetizada. |
| PR-D3 | Hunks | As linhas do hunk são guardadas de forma aditiva em cada target (`BlameTarget.hunk`). Sem hunk (casos antigos), a linha não expande e a seleção continua funcionando. Barras de blame por linha ficam ocultas: não há idade por linha. |
| PR-D4 | Datum | `PullRef.createdAt` e `mergedAt` (aditivos). O datum é `createdAt`: "depth = time before this PR". Caso salvo sem `createdAt`: datum = hoje, rótulo "±0 · today". |
| PR-D5 | Carregamento e erro | No nível da investigação inteira: `/api/explain-diff` não transmite estágios, então não há lista/abas antes do resultado, nem erro por região. |
| PR-D6 | Triage truncada | Explícita: "8 of 23 regions" no cabeçalho da lista e uma linha no popover. Sem "Show all" (rodar sem limite estoura o orçamento do Groq). |
| PR-D7 | Fixture | `DiffResult` sintético e rotulado (#944) + variantes (tudo silencioso, só evidência, truncado, 20 regiões, grupos de banda sobrepostos) só para testes e validação visual. A produção nunca depende dela. |
| PR-D8 | Headline das cláusulas | Texto real truncado em uma linha até a etapa 13 (fora da entrega). |
| PR-D9 | `PrComposer` | Restilizado com os tokens `li-*`, mesmo comportamento. |
| PR-D10 | Drill-down | O caso filho aberto a partir do drawer do PR usa o `CaseView` existente (D2 do Line), com os tokens restilizados, sem redesenho. |

## 2. Normalização de regiões (a menor camada aditiva)

Função pura `deriveRegions(result)` na apresentação. O core não muda de semântica: continua
produzindo findings agrupados por commit de origem.

1. **Chave da região:** `${path}:${start}-${end}` do target (lado base). Um target que aparece em
   mais de um finding (o intervalo tem linhas de commits diferentes) é **uma** região ligada a
   todos esses findings.
2. **Proveniência da região:** união dos artefatos dos seus findings, deduplicados por id. Nada é
   copiado para "completar" uma região.
3. **Estado da região:**
   - `explained`: todos os seus findings `recorded` e `grounded`;
   - `silent`: nenhum finding `recorded`;
   - `partial`: o resto (alguns findings explicados, outros não). Conta como **não** explicada no
     "N of M"; o popover diz qual parte ficou sem registro;
   - sem síntese (`result.error`): todas as regiões ficam `unexplained` com "No reconstruction".
4. **Ordem e numeração:** regiões que compartilham um PR a montante formam um grupo contíguo
   (união por id de PR). Os grupos seguem a ordem do diff (path, linha) do seu primeiro trecho;
   dentro do grupo, ordem do diff. R1…Rn nessa ordem de exibição.
5. **Cláusulas do resumo → regiões:** uma cláusula cita a região R se alguma citação da cláusula
   está nos artefatos de R. Sem nenhuma região mapeada, a cláusula aparece sem tokens.
6. **Cláusula silenciosa derivada:** se há regiões `silent` que nenhuma cláusula cita, a
   apresentação acrescenta uma cláusula de sistema (texto da UI, não do modelo): "Why R6 and R7
   exist is not recorded". Com todas as regiões silenciosas, ela é a única: "Why these regions
   exist is not recorded".
7. **Letras:** todos os artefatos do PR, por profundidade (A = mais raso), mesma regra do Line.
   Cada região `silent` ganha uma entrada de gap (∅, "not recorded") no fim da sua cadeia.
8. **Confiança derivada:** não existe agregado no core. O popover mostra a média das confianças
   dos findings ponderada pelo número de regiões de cada um, rotulada "Derived confidence (average
   of regions)". Nunca aparece por região.

## 3. Geometria (`computePrSectionLayout`, pura)

- **Eixo:** a mesma escala do Line (`timeAxis`, extraída de `computeBoreLayout` sem mudar o Line):
  clusters < 45 dias, escala linear dentro, quebra fixa de 40 px entre clusters, tick só no
  primeiro glifo de cada cluster, rótulo de quebra "10m\ngap" na calha.
- **Núcleos:** `step = clamp(56, (right − firstCoreX − 40) / n, 96)`. Com mais de 12 regiões,
  núcleos agrupados por arquivo (token "R9–R12"); selecionar expande o arquivo no lugar.
- **Banda de PR** (PR em ≥ 2 regiões): um retângulo do núcleo mais à esquerda − 12 ao mais à
  direita + 12, de `createdAt` a `mergedAt` (mínimo 24 px). Os núcleos continuam visíveis por
  dentro. Grupo não contíguo: banda só na sequência contígua, stubs de 12 × altura nos núcleos
  isolados e uma linha tracejada ligando-os acima da banda.
- **PR de um núcleo só:** o retângulo de 12 px do Line.
- **Commit de origem compartilhado:** o mesmo artefato e a mesma letra em cada núcleo.
- **Reviews:** traços de 12 px na borda direita da banda (ou do retângulo), na data.
- **Issue:** losango centrado abaixo da banda, ligado por uma haste de 1,5 px.
- **Região silenciosa:** o último commit em contorno e, abaixo, a hachura 18 × 48.
- **Fim do núcleo:** no artefato mais fundo, com tampa de 12 px quando termina numa banda.
- **Letras da região selecionada:** 14 px à direita do glifo; banda 34 px à esquerda, no meio;
  reviews à direita dos traços; issue à direita do losango; colisões descem em passos de 16 px e
  nunca sobre o glifo de outro núcleo.

## 4. Componentes

| Reaproveito | Estendo | Crio |
|---|---|---|
| shell e rail, tokens, `liButton`, `EvidenceLetter`, glifos e quebras do bore, `EvidenceDrawer`, `QuoteBlock`, `Legend`, `Toolbar`, `use-focus-return`, `key-preference`, `ErrorState`, `use-explain-diff`, `use-pr-history`, `prMetrics` | `ClauseRow` (refs de região e tally por região), `VerdictButton` → `CoverageChip`, `VerdictPopover` (conteúdo do PR), drawer ("Appears in" e regiões na lista), reducer do caso (região selecionada/hover, ← →), `Legend` (banda entre regiões, "depth = time before this PR") | `RegionToken`, `RegionList`/`RegionRow`/`HunkView`, `RegionComb`, `ArtifactTooltip`, `PrSection` (núcleos), `PrInvestigation`, `deriveRegions`, `buildPrView`, `computePrSectionLayout`, fixtures |

Saem da rota `/pr`: `DiffView`, `FindingCard`, `PrSummary`, `ConfidenceLedger`, `Genealogy` e o
`PrRail` (painel de métricas). `findings/*` continua para o `CaseView`.

## 5. Implementação — decisões e desvios

| Tema | Handoff | Implementação e motivo |
|---|---|---|
| Ordem dos grupos | não especificada | Grupos de regiões que compartilham PR primeiro (maior primeiro), depois ordem do diff. A numeração da #944 sintética difere do protótipo nas regiões avulsas (as silenciosas são R5 e R8). |
| Região ligada a vários commits | — | Estado `partial` (conta como não explicada). Célula do tally metade verde, metade hachurada; o chip fica neutro e diz "· N partly"; o popover explica "Rn is partly recorded: a of b origin commits explained". Visto em dado real: `chalk/chalk#664` tem 1 região com 2 commits de origem (antes aparecia como "2 regions"). |
| Escala de tempo | `computeBoreLayout` do Line | Mesmo algoritmo (`timeAxis` extraído do Line, que não mudou): clusters < 45 dias, escala linear dentro, quebra fixa de 40 px. Só os parâmetros de densidade são próprios (`PR_SCALE`: 1,5–6 px/dia, padding 6), porque 8 núcleos não cabem na densidade de um núcleo com trilha de rótulos. |
| Primeiro segmento | — | 24 px sem traços de quebra; a calha mostra o tick do primeiro cluster. |
| Lista de regiões | `listbox` + `aria-activedescendant` | Botões com `aria-pressed`/`aria-expanded` e tabindex rotativo (↑/↓): um `option` não pode conter a região do hunk expandido. Mesmo uso de teclado, HTML válido. |
| Hunk | 4 linhas + "⋯ N more removed lines" | Até 4 linhas `−` (todas as `+` do bloco) e o resto resumido; barras de blame por linha ocultas (sem idade por linha). |
| Quote repetida | um `QuoteBlock` por cláusula | A mesma quote usada pelo finding e por uma cláusula do resumo vira um bloco só, com legenda "for R1–R4 and clause 1". |
| Cláusula silenciosa | texto do modelo | Texto da UI ("Why R5 and R8 exist is not recorded") para regiões silenciosas que nenhuma cláusula cita. |
| Confiança derivada | "0.78 · medium" | Média ponderada por região, com a faixa real de níveis ("0.86 · medium–high"); o core não tem agregado nem limiares para converter score em nível. |
| Tom do chip | verde; clay com 0 explicadas | Clay só quando todas as regiões são silenciosas; neutro quando nenhuma está totalmente explicada mas há parciais. |
| Loading | lista e abas primeiro, núcleos progressivos | Linha de status fixa no `PrComposer` ("reading the diff, blaming…"); o stepper que avançava sozinho a cada 1,6 s foi removido (não havia sinal da API). |
| Share | oculto | Oculto. |
| Drill-down | filho sob o caso do PR | "Investigate →" abre `/app?drill=…&parent=<chave do PR>`; o rail aninha o filho sob o PR. Em repositório GitHub sem login, `/api/dig` exige o GitHub App (restrição já existente). |
| `CaseView` do drill-down | — | Tokens remapeados por escopo (`.legacy-tokens`): laranja → steel, good → verde de evidência, warn/crit → neutros, Barlow/Plex. Estrutura inalterada (ainda tem o anel de confiança e os cards). |
| Núcleos agrupados | token "R9–R12" | Aba cresce com o rótulo; selecionar uma região expande o arquivo no lugar. |
| Prévia | — | `/dev/pr?state=default|all-silent|evidence-only|truncated|legacy|many|overlapping` e `/dev/case` (só em desenvolvimento). |

## 6. Estado

Etapa 02 implementada, sem commit; checkpoint visual e funcional.
