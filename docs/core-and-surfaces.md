# Core + Adapters + 2 Surfaces — direção corrigida

> Corrige a direção do doc `vscode-extension/architecture.md`. O objetivo **não** é escolher
> entre extensão local **ou** web. São **os dois**, sobre **um core compartilhado**.

## O alvo

```
                         ┌─────────────────────────────┐
                         │           CORE              │   (runtime-agnostic, sem Next)
                         │  collect → rank → synth →    │
                         │             verify           │
                         └──────────────┬──────────────┘
              adapters de coleta        │
        ┌────────────────────────┬──────┴───────────────┐
        │ localGit               │ github/gitlab API     │
        │ (child_process, fs)    │ (fetch + token)       │
        └──────────┬─────────────┴──────────┬────────────┘
                   │                         │
        ┌──────────┴─────────┐    ┌──────────┴───────────┐
        │  VS Code extension │    │      Web app         │
        │  projetos LOCAIS   │    │  repos REMOTOS       │
        │  core in-process   │    │  backend hospedado   │
        └────────────────────┘    └──────────────────────┘
```

- **Extensão** → alvo é uma pasta local → adapter **localGit** → core roda **in-process** (sem
  `npm run dev`). Só o filesystem do usuário enxerga o histórico git local.
- **Web** → alvo é um repo remoto → adapter **github/gitlab API** → backend **hospedado** faz sentido
  (públicos via API pública, privados via token/OAuth).

## O que já está pronto (verificado no código)

- O `collect()` **já despacha** por adapter: `parseGitHubRepo` → GitHub, `parseGitLabRepo` → GitLab,
  senão → `collectLocal` (git local via `node:child_process`). Os três adapters já existem.
- `synthesize` e `verify` são **puros** (sem Next, sem casca web).
- Tokens já têm seam: `collect/token-context.ts` usa AsyncLocalStorage + fallback de env.

## O que falta (a distância real)

### 1. Uma fachada única `investigate()`
Hoje a orquestração `collect → synthesize → verify` está **duplicada** entre `api/dig/route.ts` e
`scripts/dig.ts`. Criar `investigate(input): Promise<DigResult>` no core (incluindo o try/catch de
synthesis que a rota já faz) e ter **as duas cascas chamando ela**.

### 2. Injetar a chave do LLM (o único acoplamento novo)
`llm.ts` faz `export const model = groq(process.env.GROQ_MODEL ...)` no load — `@ai-sdk/groq` lê
`GROQ_API_KEY` do env. Virar **lazy**: `getModel(config?)`, onde a chave pode ser passada.
- **Web**: chave do env do servidor (como hoje).
- **Extensão**: chave do **SecretStorage** do VS Code, injetada na chamada.

### 3. Separar core de casca-web fisicamente
Extrair para `packages/core` só o **puro**; deixar a casca-web no app.

| Vai para `packages/core` (puro) | Fica no app web (casca) |
|---|---|
| `collect/` (git, github, gitlab, rank, contradictions, token-context, symbol, parse-location) | `ratelimit.ts` |
| `synthesize.ts`, `verify.ts` | `db.ts` (Prisma) |
| `llm.ts` (após virar lazy) | `capture.ts` (analytics) |
| `anchor-question.ts`, `types/` | `collect/remote.ts` (delegação/on-prem) |
| a nova `investigate.ts` | `collect/resolve.ts` (clone server-side) |
|  | `auth/` |

> `collect/resolve.ts` (clone de repo remoto num tmp do servidor) é concern do backend web. A
> extensão não clona nada — o repo já está no disco.

## Plano em fases (cada fase mantém a web funcionando)

### Fase A — Fachada + LLM lazy (sem mover nada) ✅ FEITA
- `investigate()` criada em `src/lib/investigate.ts` (collect → synthesize → verify + o
  `synthesisError` que vivia na rota). Call-sites migrados: `api/dig/route.ts` e `scripts/dig.ts`
  (+ `scripts/eval.ts`, `scripts/mine-intents.ts` que usavam a API antiga).
- `llm.ts` → `getModel(config?)` lazy com `createGroq({ apiKey })`; `synthesize(ev, model)` agora
  recebe o model injetado. Tipo `Model` exportado.
- **Validado:** typecheck limpo, 101 testes passando, `/api/dig` e `npm run dig --why` rodando
  end-to-end pela fachada. Web idêntica em comportamento.
- Única mudança de wording: a mensagem de "sem GROQ key" ficou neutra (não cita "server/.env.local"),
  pois o core é surface-agnostic. Só aparece quando a chave não está setada.

### Fase B — Workspaces + `packages/core` ✅ FEITA
- Workspace `["packages/*"]` na raiz (o app Next **fica na raiz**, não virou `apps/web` — decisão de
  reduzir churn). `apps/extension` **não** entrou nos workspaces (fica standalone até a Fase C).
- Puros movidos (`git mv`) para `packages/@git-investigator/core/src`: `investigate/synthesize/
  verify/llm/anchor-question`, `types/`, e `collect/` inteiro **exceto** `remote.ts`/`resolve.ts`.
  Casca-web ficou em `src/lib`: `ratelimit`, `db`, `capture`, `auth/`, `collect/remote`,
  `collect/resolve`.
- Resolução por **alias** (igual ao `@/`): tsconfig `paths` + vitest `resolve.alias`
  (`@git-investigator/core` → `packages/core/src`). Sem `exports` map, sem `transpilePackages` —
  o core fica sob a raiz do projeto, então Next/tsx/vitest compilam o TS direto. 33 arquivos da web+
  scripts reescritos (`@/lib/<movido>` → `@git-investigator/core/<movido>`); os 4 arquivos do core
  que usavam `@/lib/types` viraram `../../types`.
- **Validado:** typecheck limpo, 101 testes passando, lint limpo, `/api/dig` HIGH 0.9 ao vivo,
  páginas `/` e `/app` em 200, CLI `npm run dig --why` — tudo pelo core extraído.
- Fix tangencial: `**/out/**` no eslint ignore (a build compilada da extensão estava sendo lintada).
- **Fix pós-deploy:** a Vercel falhou no type-check porque o tsconfig da web (`include: **/*.ts`)
  varria `apps/extension/src` (que importa `vscode`, tipos ausentes na Vercel). Corrigido com
  `exclude: [..., "apps/**"]`. Provado escondendo o node_modules da extensão e rodando `next build`.

### Fase C — Extensão consome o core + "abrir na web" ✅ FEITA
- **Embedded local (feito):** extensão vira workspace member; build migrou de `tsc` → **esbuild**
  (bundla o core no `dist/extension.js`, ~1MB). `investigate()` roda **in-process** com git local;
  chave do Groq via **SecretStorage**; setting `gitInvestigator.mode: local|backend`. vsce empacota
  com `--no-dependencies` (senão sobe pra raiz do repo e vaza `.env.local`). Resolução do core no
  esbuild/tsc via `tsconfig paths` (sem declarar o core como dep → sem symlink pro vsce seguir).
- **Decisão de produto (usuário, 2026-07-09):** git LOCAL só tem **commits** — PR/review/issue vivem
  na API. Pra "acesso a tudo", escolhido **abrir na web**: a extensão detecta o remote e abre o app
  hospedado com `repo+file+line`, onde a coleta por API dá a provenance completa.
- **Open-on-web (feito):** comando `gitInvestigator.openOnWeb` + `web-link.ts` (detecta `origin`,
  normaliza pra `https://host/owner/repo`) + setting `gitInvestigator.webUrl` →
  `vscode.env.openExternal({webUrl}/app?repo&file&line)`. Lado web: `/app` lê os query params
  (Suspense + `useSearchParams`) e auto-investiga.
- **Validado:** extensão typecheck+bundle+vsix (184KB) ok; `next build` ok (Suspense correto);
  deep-link serve 200; `/api/dig` via URL github pública retorna **commit+PR+5 reviews** (provenance
  completa). Repo privado dá 404 sem auth — restrição esperada (login na web resolve).
- Local (commits) e open-on-web (provenance completa) coexistem: dois gestos no menu de contexto.

### Fase D — Web como surface dedicada (depois)
- `apps/web` continua servindo repos remotos; tokens/OAuth já existem lá. Opcional: publicar.

## Decisões a confirmar agora

1. **Mover `src/lib` fisicamente para `packages/core`** (recomendado) vs. manter no lugar e aliasar.
   Recomendo mover — é o que força a fronteira core/casca de verdade.
2. **Nome do pacote**: `@gi/core` (placeholder). Ok?
3. **Começar pela Fase A** (fachada + LLM lazy), que não mexe em estrutura e é reversível.

## Riscos

- **Churn de imports na Fase B** — mecânica, mas ampla (todos os `@/lib/*` do app). Fazer isolada,
  sem feature junto.
- **Ordem de import do LLM** — por isso `getModel()` lazy, não `const model` no load.
- **`token-context` no build da extensão** — AsyncLocalStorage existe no extension host (Node), ok.
- **Nada de casca-web vaza pro core** — o quadro acima é a checagem; manter `packages/core` sem
  dependência de Next/Prisma/Upstash.
