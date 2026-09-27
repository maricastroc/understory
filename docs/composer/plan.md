# Composer ("New investigation") — etapa 04

> Implementa `design_handoff_git_investigator/04-composer/README.md` com `design/Composer v2.dc.html`
> como referência visual. O README do 04 é a fonte de verdade; onde este documento diverge do
> protótipo, vale o README.

## 1. Fases

| Fase | Commit | Conteúdo |
|---|---|---|
| Backend | `7e25b8e` | `packages/core/src/collect/history`: resumo do blame em marcas, seleção dos arquivos, blame multi-arquivo (GitHub, aliases), blame local com fronteira de clone raso, lookup de PR enxuto, cache por `(repo, path, blobSha)`. Rotas `/api/overview` e `/api/history-map`. |
| 1 | `f2d7198` | Layout do Composer v2 e estrutura do mapa só com dados do tree. |
| 2 | este | Preenchimento progressivo da §7. |

## 2. Decisões

| Tema | README / protótipo | Implementação e motivo |
|---|---|---|
| Arquivos mostrados | casos → últimos 12 commits → `rankShallow`, até 15 | Igual. Casos por caminho no repo atual, mais recentes primeiro, no máximo 5. `rankShallow` sem mudanças: em repos como o express ele puxa `test/app.*.js`, e a linha de escopo diz "N picked by path". |
| Ordem de exibição | "agrupado por pasta, alfabético" | Pastas na ordem do ranking do primeiro arquivo; arquivos em ordem alfabética dentro da pasta. |
| Eixo de profundidade | a captura fria mostra "−1y" | Eixo e marcas de ano só depois do primeiro arquivo mapeado (texto do README). |
| Datum | HEAD | `±0 · HEAD`, sha e data do commit da HEAD; nunca "today". |
| Fila | concorrência 1, prioridade mínima, pausa, aborta ao sair | `MapQueue` no cliente; `fetch` com `priority: "low"`; pausa enquanto a pessoa digita (700 ms de silêncio), enquanto o arquivo carrega e enquanto uma investigação está em andamento. "Sair do estágio" = sair da tela New investigation (abrir um caso, investigar): aborta tudo e devolve os arquivos em mapeamento para "not mapped". Ir para o código não aborta, porque abrir um arquivo deve mapeá-lo. |
| Ordem de preenchimento | cache → oportunista → 3 automáticos após 1 s → "Map N more" | Consulta ao cache para os 15 (zero GitHub), depois 3 automáticos após 1 s ocioso (1 query de blame + ≤ 1 de PR), "Map N more" em lotes de 5, abrir um arquivo o mapeia primeiro na fila. |
| Preenchimento oportunista | todo blame de arquivo inteiro | O blame do GitHub usado em investigações, no código do caso e em PRs grava o resumo no mesmo cache (o blob vem na mesma query). Blame local não grava: é barato e não gasta cota do GitHub. |
| Cache | permanente, compartilhado | Memória do processo; com Upstash configurado, Redis com prefixo `gi:map:` e 90 dias de TTL. Sem migração de banco. |
| Custo sem ação do usuário | ≤ 1 blame (3 arquivos) + ≤ 1 PR | Garantido pelo tamanho do lote automático e por `MAX_PR_OIDS = 100` por query; excedentes ficam "not checked". Tier de rate limit próprio (`map`) para nunca consumir a cota do seletor de arquivos. |
| Estados de lookup | PR found / no PR on GitHub / not checked | `found` verde, `none` hachura clay, `skipped` e `failed` contorno neutro. Sem remote no GitHub ou sem token: tudo neutro e a legenda diz "PR data unavailable for this repo". |
| Estados do núcleo | mapped / mapping / not mapped / unavailable | Mais `too-large` (blob acima de 400 kB): stub neutro e card "Too large to map". |
| Percentuais | escopo explícito | "N% of lines in M mapped files have a PR · K% not checked", só sobre arquivos mapeados. Nenhum número do repositório inteiro. |
| História rasa | corte e "≥" | Commits de fronteira lidos de `.git/shallow` (o blame roda com `--root`, então commits raiz não viram corte falso). Núcleo termina com as barras de quebra e o card diz "≥" e "History cut at clone depth". Tree truncado: "partial file list" na linha de metadados e "of ≥N files" no escopo. |
| Marcas de busca na profundidade do símbolo | tick âmbar na profundidade | Pendente: a busca atual devolve só caminhos, sem a linha da definição. A busca escurece os arquivos que não batem. |
| Varredura do repositório inteiro | "mais tarde" | Não feita. |

## 3. Prévia

`/dev/composer?state=cold|partial|auto|mapping|warm|unknown|loading` (só em desenvolvimento), com o
tree e os históricos sintéticos rotulados de `components/composer/fixtures`.
