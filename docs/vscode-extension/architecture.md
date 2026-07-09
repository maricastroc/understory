# Extensão VS Code — Arquitetura (MVP)

> Documento de arquitetura. **Nenhum código ainda.** Objetivo: fechar as decisões
> estruturais antes de implementar, preservando a evolução do produto.

## 0. Princípio norteador

O núcleo (`src/lib`: `collect → synthesize → verify`) já é independente do Next.js.
Hoje ele tem **dois frontends** (CLI e API). A extensão é o **terceiro**.

A regra que resolve todos os objetivos de uma vez:

> **A fronteira do produto é um contrato HTTP versionado, não o Next.js.**
> A extensão conhece **o contrato + uma URL base**. Nada mais.
> Qualquer backend que implemente esse contrato (localhost, Vercel, on-prem) serve a extensão.

Isso satisfaz os três objetivos:
- **Não duplicar lógica** → a extensão não reimplementa `collect/synthesize/verify`; ela chama o contrato.
- **Não acoplar ao Next** → a extensão depende do *contrato*, não da app. O Next é só *uma* implementação.
- **Trocar de backend no futuro** → é trocar a URL (ou, mais tarde, a implementação do client).

---

## 1. Estrutura de diretórios da extensão

```
apps/extension/
  package.json              # manifesto da extensão (engines.vscode, contributes, activationEvents)
  tsconfig.json
  esbuild.mjs               # bundling do extension host (Node) e do webview (browser) — dois bundles
  src/
    extension.ts            # activate()/deactivate(); registra comandos
    commands/
      digCurrentLine.ts      # orquestra: contexto → client → webview
    context/
      workspaceContext.ts    # extrai workspace + arquivo + linha do editor ativo
      repoRef.ts             # resolve o repoRef discriminado (local | github | gitlab)
    client/
      DigClient.ts           # INTERFACE (seam) — dig(request): Promise<DigResult>
      HttpDigClient.ts       # única implementação no MVP (fetch → {backendUrl}/api/dig)
    config/
      settings.ts            # leitura tipada de gitInvestigator.* (backendUrl, timeout)
      secrets.ts             # tokens via SecretStorage (NUNCA em settings.json)
    webview/
      panel.ts               # cria/gerencia o WebviewPanel; ponte postMessage
      protocol.ts            # tipos das mensagens host↔webview
      ui/                    # bundle SEPARADO que roda dentro do webview (browser)
        main.ts              # render do DigResult + envio de mensagens ao host
        render.ts
        styles.css
  media/                    # ícones, assets estáticos servidos via localResourceRoots
```

Pontos não óbvios:

- **Dois bundles distintos.** O `extension host` roda em Node (tem `fetch`, `fs`, acesso a
  segredos). O `webview` roda num browser isolado (sem Node, sem rede própria por CSP). São
  ambientes diferentes → dois alvos de build no `esbuild.mjs`.
- **O webview nunca faz rede.** Toda chamada ao backend acontece no host. O webview só **renderiza**
  dados que o host manda e **emite intenções** de volta. Isso mantém tokens fora da superfície de
  render e permite uma CSP estrita.

---

## 2. Como a extensão conversa com o backend

### 2.1 O contrato (o coração do desacoplamento)

Um pacote compartilhado `packages/contract` define **request, response e versão**. Hoje o
`DigResult` já existe (`src/lib/types/dig-result.d.ts`); formalizamos a **entrada**.

```
POST {backendUrl}/api/dig
Headers:
  content-type: application/json
  x-gi-contract: 1                 # versão do contrato; backend rejeita incompatível
  x-github-token / x-gitlab-token  # opcionais, injetados pelo host a partir do SecretStorage
Body (DigRequest):
  {
    repoRef: RepoRef,              # discriminado — ver 2.2
    location?: string,             # "file:line" ou "file:start-end"
    target?: ArtifactRef,          # drill-down (fase posterior)
    question?: string,
    noCapture?: boolean
  }
Response: DigResult = { evidence, narrative, error? }   # já existe hoje
```

> **Adaptação mínima no backend:** a rota atual recebe `repoPath: string`. Introduzimos um
> *adapter* fino que converte `RepoRef → repoPath` (o formato que o core já entende), **sem tocar
> no core**. O core permanece intacto.

### 2.2 `RepoRef` discriminado (decisão a tomar agora)

O `repoPath` sobrecarregado de hoje não sobrevive a múltiplos backends. Formalizamos:

```
RepoRef =
  | { kind: "local";  path: string }                 # caminho absoluto no disco do usuário
  | { kind: "github"; owner: string; repo: string }
  | { kind: "gitlab"; host: string;  project: string }
```

A extensão detecta o remote git do workspace e preenche o que conseguir:
- tem remote GitHub/GitLab reconhecível → manda `github`/`gitlab` **e** o `local` como fallback;
- só local → manda `local`.

O **backend decide**: se for remoto (Vercel) e receber apenas `kind: "local"`, responde com erro
claro e acionável (ver Risco R1), porque não tem o filesystem.

### 2.3 O seam do client

A extensão depende de uma **interface** `DigClient`, não de `fetch` direto:

```
interface DigClient { dig(req: DigRequest, signal): Promise<DigResult> }
```

No MVP só existe `HttpDigClient`. Depois, um `EmbeddedDigClient` (que roda o core no próprio host)
pode ser injetado sem tocar nos comandos nem no webview. **A interface entra agora; a segunda
implementação fica adiada.**

---

## 3. Comandos e pontos de contribuição do VS Code

### MVP
- **Comando** `gitInvestigator.digCurrentLine` — "Git Investigator: Why is this line?"
  - Exposto no **Command Palette** e no **editor/context** (menu de clique-direito na linha).
- **Setting** `gitInvestigator.backendUrl` (string, default `http://localhost:3000`) — **nunca hardcoded**.
- **Setting** `gitInvestigator.requestTimeoutMs` (number, default ~120000 — o `dig` chega a 120s).
- **Segredos** (via SecretStorage, comandos dedicados `gitInvestigator.setGithubToken` etc.) —
  **fora do settings.json**, que é texto plano.
- **Activation**: `onCommand:gitInvestigator.digCurrentLine` (ativação preguiçosa; extensão leve).

### Adiado
- **CodeLens / Hover** ("Why is this line?" inline acima de cada linha) — afeta descoberta, não a mecânica.
- Comando de drill-down disparado a partir do webview (Fase 4).

---

## 4. Comunicação Webview ↔ Extensão

Fronteira de segurança: **o webview é superfície de render, não de confiança.**

- O host cria um `WebviewPanel` com CSP estrita: `default-src 'none'`, script só com **nonce**,
  `localResourceRoots` limitado a `media/` e ao bundle do webview. Sem rede a partir do webview.
- Comunicação **só** por `postMessage`, tipada em `webview/protocol.ts`.

```
Host → Webview:
  { type: "loading" }
  { type: "result",  payload: DigResult }
  { type: "error",   message: string, retryable: boolean }

Webview → Host:
  { type: "ready" }                         # webview montou; host então envia estado
  { type: "retry" }
  { type: "openArtifact", url }             # host abre no browser via env.openExternal
  { type: "drillDown",   target: ArtifactRef }   # host dispara novo dig (Fase 4)
```

Consequência arquitetural: como o **host** faz a rede (Node), **não há CORS** e os **tokens nunca
entram no webview**. Se o webview fizesse `fetch` direto, teríamos CORS + vazamento de token — por
isso a rede fica no host, por design.

---

## 5. Monorepo — compartilhar o núcleo sem duplicar

### Alvo

```
git-archeologist/                 # raiz vira workspace root (npm workspaces)
  package.json                    # "workspaces": ["packages/*", "apps/*"]
  packages/
    contract/                     # DigRequest/DigResult + zod schema + versão + interface DigClient
    core/        (FUTURO)         # ex-src/lib: collect/synthesize/verify (movido só na Fase 5)
  apps/
    web/                          # a app Next atual (src/app, components, api) → importa @gi/contract
    extension/                    # a extensão → importa APENAS @gi/contract (tipos), não o core
```

### Por que a extensão importa só `@gi/contract`

No MVP a extensão é **HTTP-only**: ela precisa dos **tipos** de resposta para renderizar e do schema
para validar — **não** da lógica de coleta. Importar só o contrato:
- evita duplicar tipos (objetivo "não duplicar"),
- mantém o bundle da extensão minúsculo,
- **não vaza** sua lógica de synthesis para o cliente.

### Estratégia de migração (faseada, sem big-bang)

1. **Extrair `packages/contract` primeiro** — é pequeno e seguro: tipos + zod + versão. A web passa a
   validar `/api/dig` contra esse schema (prova que o contrato é real; zero mudança de comportamento).
2. **Mover `src/lib` → `packages/core` fica para a Fase 5**, quando o modo embedded pagar o custo.
   Esse move quebra os aliases `@/lib/*` da web e por isso vive numa fase própria, longe de feature work.

Assim atacamos "não duplicar" já na Fase 0 com risco mínimo, e adiamos a churn grande.

---

## 6. Decisões: agora vs. adiáveis

### Decidir AGORA (baratas, difíceis de reverter depois)
- **Contrato HTTP versionado** + pacote `@gi/contract` (tipos + zod + campo de versão).
- **`RepoRef` discriminado** substituindo a string sobrecarregada na fronteira (core intocado, via adapter).
- **Interface `DigClient`** como seam (mesmo com uma só implementação).
- **`backendUrl` em Settings; tokens em SecretStorage.**
- **Rede só no host; webview render-only** via postMessage + CSP com nonce.
- **Bundler = esbuild; extensão depende só de `@gi/contract`** (não do core).

### Adiar (sem custo de reversão)
- Mover `src/lib → packages/core` (só quando vier o embedded).
- `EmbeddedDigClient` / modo offline (BYOK).
- Pacote de UI React compartilhado entre web e webview.
- CodeLens/Hover e drill-down a partir do webview.
- Fluxo de login/billing/metering.
- Publicação no Marketplace (durante o dev, sideload do `.vsix`).

---

## 7. Riscos arquiteturais

- **R1 — Localidade do filesystem (o risco central).** Backend remoto (Vercel) não enxerga o repo
  local. Repo local-only/privado só é investigável por um backend **local**. *Mitigação:* `RepoRef`
  discriminado + erro claro e acionável ("este backend não acessa repositórios locais; configure um
  backend local ou garanta um remote suportado") + guiar o usuário ao backend certo.
- **R2 — Ambiguidade de `repoPath`.** Se não formalizarmos `RepoRef` agora, a extensão acumula
  heurísticas que apodrecem. *Mitigação:* decidir agora (§2.2).
- **R3 — Drift do contrato.** Tipos duplicados divergem. *Mitigação:* `@gi/contract` único +
  `x-gi-contract` versionado; backend rejeita versão incompatível.
- **R4 — Vazamento de token no webview.** *Mitigação:* rede só no host; webview sem rede; CSP+nonce.
- **R5 — Divergência de UI.** Dois renderizadores do mesmo case-file (React web vs. webview).
  *Mitigação:* manter o webview **data-driven** sobre os mesmos tipos; extrair `packages/ui`
  presentacional depois. MVP aceita um renderizador enxuto.
- **R6 — Requests longos / timeout / cancelamento.** `dig` chega a 120s; serverless tem limite de
  função. *Mitigação:* timeout configurável, `CancellationToken`, UI de progresso, e o rate-limit de
  synthesis já tratado no servidor.
- **R7 — Edge cases de contexto.** Multi-root workspace, arquivo fora de repo git, arquivo não salvo,
  arquivo fora do workspace. *Mitigação:* `workspaceContext` valida e falha com mensagem clara.
- **R8 — Churn do monorepo.** Mover `src/lib` quebra aliases `@/lib`. *Mitigação:* fase isolada (§5).

---

## 8. Plano de implementação — fases pequenas (cada uma entrega algo funcionando)

### Fase 0 — Fundação do contrato (sem UI)
Extrair `packages/contract` (DigRequest/DigResult + zod + versão + interface `DigClient`). Fazer
`/api/dig` validar contra o schema compartilhado.
**Entrega:** web funciona igual, agora falando um contrato formal versionado. Seam criado.

### Fase 1 — Walking skeleton da extensão (sem backend)
Scaffold de `apps/extension`. Comando `digCurrentLine` extrai workspace + arquivo + linha e mostra o
`file:line` resolvido (info message ou webview trivial). Cria a setting `backendUrl`.
**Entrega:** `.vsix` instalável que extrai corretamente o contexto do editor.

### Fase 2 — MVP real: backend + Webview de resultado
`HttpDigClient` chama `{backendUrl}/api/dig` com o contrato; resolve `RepoRef` a partir do remote.
Webview renderiza `DigResult` de verdade (narrativa + evidências + provenance), com loading/erro e
**abstenção honesta**.
**Entrega:** apontar para `http://localhost:3000` (seu Next rodando) → investigações reais a partir
do editor. **Este é o MVP.**

### Fase 3 — Backend configurável de verdade + tokens
Validar/normalizar `backendUrl` (localhost/Vercel/on-prem). Tokens via SecretStorage, injetados como
headers pelo host. Tratar o caso "backend remoto não lê repo local" (R1) com erro acionável.
**Entrega:** mesma extensão serve Vercel (repos GitHub/GitLab) e localhost (repos locais).

### Fase 4 — Interações do webview + descoberta
Mensagens webview→host: drill-down num artefato citado (→ `target`), abrir URL de artefato, retry.
CodeLens/Hover ("Why is this line?").
**Entrega:** o loop de drill-down (já existente no produto web) funciona dentro da IDE.

### Fase 5 (adiada) — Monorepo completo + modo embedded
Mover `src/lib → packages/core`; web importa de lá. `EmbeddedDigClient` roda o core no extension host
→ synthesis local (BYOK), sem backend externo.
**Entrega:** extensão roda sem backend externo — a história de privacidade/on-prem individual.

---

## Apêndice — mapa do que já existe e é reaproveitado

- `src/lib/collect` — coleta (git local + adapters GitHub/GitLab). Reusado via contrato, intocado.
- `src/lib/synthesize`, `src/lib/verify` — narrativa + verificação. Reusados via contrato.
- `src/lib/types/dig-result.d.ts` — **já é** o corpo da resposta do contrato.
- `src/app/api/dig/route.ts` — vira a **primeira implementação** do contrato (adiciona validação +
  adapter `RepoRef → repoPath`).
- `scripts/dig.ts` — precedente que prova o desacoplamento do core (o CLI já o consome direto).
