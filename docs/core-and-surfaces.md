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

### Fase B — Workspaces + `packages/core`
- Raiz vira workspace (`packages/*`, `apps/*`); o app Next vira `apps/web`.
- Mover os arquivos **puros** para `packages/core`; casca-web fica em `apps/web`.
- Reescrever imports (`@/lib/*` → `@gi/core` só nos que moveram).
- **Entrega:** web builda e roda idêntica; core importável por qualquer casca. (Churn mecânica —
  fase isolada.)

### Fase C — Extensão em modo local (embedded)
- Extensão importa `@gi/core` e chama `investigate()` **in-process** com o path do workspace
  (adapter localGit). Chave do Groq via **SecretStorage**.
- Setting `gitInvestigator.mode`: `local` (in-process) | `backend` (HTTP, o que já existe).
  Mantém o cliente HTTP para apontar na **web hospedada** quando o alvo for repo remoto.
- **Entrega:** instalar o `.vsix` e usar em projeto local **sem manter nada rodando**.

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
