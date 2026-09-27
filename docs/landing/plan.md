# Landing — etapa 03

> Implementa `design_handoff_git_investigator/03-landing` (README + `design/Landing.dc.html`) com o
> refinamento pedido depois (hero editorial em coluna única + preview do produto). Onde este
> documento diverge do handoff, **este documento vence**.

## Decisões e desvios

| Tema | Handoff | Implementação e motivo |
|---|---|---|
| Hero | duas colunas: título à esquerda, parágrafo e CTAs à direita | Coluna única editorial: eyebrow → título (Barlow Condensed, `clamp(56px, 9vw, 112px)`) → subtítulo → CTAs, com mais espaço negativo. O preview vem logo abaixo. |
| Subtítulo | "Point at a line. Git Investigator digs…" | "Git Investigator reconstructs the reasoning behind a line of code — tracing commits, pull requests, and issues back to the decision that introduced it." |
| Destaque do título | sublinhado âmbar grosso em "here?" | Sublinhado fino (0,06 em) na cor do datum, a mesma da barra do logo. |
| Cor de ação | steel | Steel, igual ao `/app`. O laranja da marca aparece só como datum (título, régua e linha investigada). |
| Demo | instrumento solto, 1120 × 560 | Mesmo `Instrument` do `/app` (modo `demo`) dentro de uma moldura de janela: barra com arquivo, linha e a pergunta do caso. O frame tem 1120 × 584, porque a hachura real (96 px, escala de tempo real) termina em y = 574 e 560 a cortaria. |
| Forma compacta | < 640: cláusulas + bore, sem código | < 900: o layout vertical do próprio app (cláusulas, código em faixa, bore) em vez de encolher o painel. |
| Cláusula 4 (silêncio por cláusula) | trace clay tracejado até F e a hachura | Não existe no produto (plano do Line §3). O demo mostra as 3 cláusulas que o `/app` renderiza; F e a hachura ∅ continuam no bore. |
| Letras | cláusula 2 → E e B | Por profundidade (A1): o PR é D, então cláusula 2 → E e D. |
| Tally | "2 sources · 2 verified" | "2 sources · 1 verified": o entailment grava no máximo 1 quote verificada por claim. |
| Fixture | escrita no formato do view model | `DigResult` estático passado pelo `verify` + `buildInvestigationView` reais no load do módulo (mesmo formato, nada divergente à mão). Nunca chama a API. |
| Diagrama de PR | 6 núcleos desenhados à mão | `computePrSectionLayout` + `SectionGraphics` + `SectionOverlay static` sobre um `DiffResult` estático. R1 desce até `issue:140` porque o trecho tem linhas de dois commits (normalização da etapa 02); por isso aparece `pr:201` no caminho. O eixo de profundidade do app fica visível. |
| Método, passo 3 | cláusula clay "Before 2023: not recorded" com ∅ | Forma da cláusula silenciosa do app (anel tracejado, sem letras), com texto que não sugere silêncio parcial. |
| Sign in | ghost | Ghost "Sign in" (auth GitHub existente); logado, o avatar do `AccountButton`. |

## Componentes

- **Reaproveitados:** `Instrument`, `WhyZone`, `ClauseRow`, `ClauseLetters`, `BoreGraphics`, `BoreLabels`, `CodeSpecimen`, `SpecimenLine`, `ArtifactGlyph`, `EvidenceLetter`, `QuoteBlock`, `RegionToken`, `SectionGraphics`, `SectionOverlay`, `BrandMark`, `AccountButton`, `liButton`, `BlueprintCorners`.
- **Estendidos:** `Instrument`/`WhyZone`/`ClauseRow`/`BoreLabels` (modo `demo`/`dense`/`static`), `CodeSpecimen`/`RangeToggle` (`static`), `SectionOverlay` (`static` → `SectionCaptions`), `AccountButton` (`signIn="ghost"`), `use-element-height` (mede `offsetHeight`, imune ao `transform: scale`).
- **Extraídos:** `GapHatch`, `DatumRule`, `ClauseRing`, `ClauseTally`, `ClauseText`, `StaticLabels`, `SectionAxis`.
- **Removidos:** landing antiga (`Hero`, `ReviewCopilot`, `Principles`, `Method`, `SiteFooter`, `content.ts`), `components/SiteHeader.tsx`, `AccountMenu.tsx`.

## Estado

Implementada, sem commit; checkpoint visual e funcional.
