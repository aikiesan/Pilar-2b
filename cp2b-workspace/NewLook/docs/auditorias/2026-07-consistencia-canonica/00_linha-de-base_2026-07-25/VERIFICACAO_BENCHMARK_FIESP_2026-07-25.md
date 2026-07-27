# Verificação do benchmark FIESP — as duas magnitudes citadas

**Data:** 2026-07-25 · **Lote:** 1e-c
**Resultado:** o rótulo do Sankey foi **REMOVIDO** dos dois locales. Não foi possível
determinar, a partir do que está versionado, a qual grandeza ele se referia.

---

## 1. A divergência

| Citação | Onde | Valor | Grandeza | Unidade |
|---|---|---|---|---|
| A | `messages/pt-BR.json:882` e `en.json:882` (rótulo do Sankey) | **~16 bilhões m³/ano** | **CH₄** | bilhões m³ / **ano** |
| B | resto do repositório | **6,4 Mm³/d** | **biometano** | M m³ / **dia** |

6,4 Mm³/d × 365 ≈ 2,3 bilhões m³/ano. Razão entre A e B: **≈ 6,8×**.

---

## 2. O que a FIESP de fato reporta

Fonte de registro: `docs/data/FIESP_BENCHMARK_EXTRACTION.md`, extração página a
página do PDF *"O Biometano em São Paulo: Potencial e Medidas para Alavancar a
Produção — Relatório Técnico"*, Junho de 2025, Instituto 17 + PSR + Amplun,
publicado pela FIESP. O documento é um **PDF escaneado sem camada de texto**,
extraído por renderização com PyMuPDF e leitura visual, com número de página
registrado por valor.

Citação direta transcrita na extração (`:149-150`):

> *"4,3 bilhões Nm³/ano de biogás ou 2,3 bilhões Nm³/ano de Biometano. Esse
> potencial em volume médio diário de biometano seria de 6,4 milhões de Nm³/dia."*

Totais tabulados (`FIESP_BENCHMARK_EXTRACTION.md:130-131`):

| Grandeza | Anual | Diário |
|---|---:|---:|
| **Biogás** | 4 266 147 mil Nm³/ano ≈ **4,3 bilhões** | 11 694 mil Nm³/dia ≈ **11,7 Mm³/d** |
| **Biometano** | 2 337 463 mil Nm³/ano ≈ **2,3 bilhões** | 6 404 mil Nm³/dia ≈ **6,4 Mm³/d** |

Escopo: **apenas** resíduos sucroenergéticos das 146 usinas de SP e RSU em aterros
sanitários. Não cobre pecuária, café, citros, soja, milho, lodo de ETE, abatedouro
nem poda (`FIESP_BENCHMARK_EXTRACTION.md:20-31`).

Corroboração independente registrada na extração (`:151`): Instituto 17 (2021),
**~4,2 bilhões Nm³/ano de biogás**.

**Nenhum valor publicado pela FIESP em 2025 é 16 bilhões m³/ano, de biogás ou de CH₄.**

---

## 3. De onde vem o numeral 16

Existe no repositório uma segunda citação FIESP, de **outro estudo e outro ano**:

| Local | Texto |
|---|---|
| `backend/scripts/compute_sp_canonical_totals.py:319` | `FIESP/AMPLUN 2021 (bruto, todos setores) : ~16,0 M m³/dia biogás` |
| `docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md:65` | `FIESP/AMPLUN **2021** (bruto) \| ~16,0 M m³/dia biogás \| Todos os setores; potencial teórico bruto` |
| `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:133` | `FIESP/AMPLUN 2021 (gross) \| ~16.0 \| All sectors; theoretical gross potential` |
| `docs/data/SCIENTIFIC_AUDIT_REPORT.md:782` | `FIESP/AMPLUN 2021 gross \| ~16 M m³ biogas/day \| All sectors` |

O numeral **16** existe, portanto — mas como **16,0 M m³ por DIA de BIOGÁS**, não
como 16 bilhões m³/ano de CH₄.

Conversão, para deixar o descompasso explícito:

```
16,0 M m³/dia × 365 = 5,84 bilhões m³/ano de biogás
16 bilhões m³/ano ÷ 365 = 43,8 M m³/dia
```

O rótulo do Sankey preservou o numeral e trocou **duas coisas ao mesmo tempo**: a
unidade (M/dia → bilhões/ano) e a grandeza (biogás → CH₄).

### 3.1 O estudo de 2021 não tem fonte versionada

As quatro citações de "FIESP/AMPLUN 2021 ~16,0" são asserções sem referência: sem
página, sem URL, sem DOI. `docs/data/METADATA.json` registra **apenas**
`fiesp_2025` na lista de fontes; não há entrada para um estudo de 2021. A extração
página a página cobre exclusivamente o relatório de 2025.

A única menção a 2021 com fonte é a corroboração do **Instituto 17 (2021):
~4,2 bilhões Nm³/ano de biogás** — que equivale a **11,5 Mm³/d**, não a 16,0.

---

## 4. Cronologia

| Data | Evento |
|---|---|
| **2026-05-09** | `80a27ec` — `feat: i18n overhaul for analysis charts/panels + Sankey visual redesign` cria o rótulo `sankey_benchmark_label` com o texto "~16 bilhões m³ CH₄/ano" nos dois locales |
| 2026-06-12 01:55 | `1c8db39` — extração página a página do relatório FIESP 2025 entra no repositório |

O rótulo é **um mês anterior** à extração da fonte. No momento em que foi escrito,
o único "16" disponível no repositório era o do estudo de 2021, em M m³/dia de
biogás.

---

## 5. Determinação

**A citação A está errada como escrita.** Isso é determinável: nenhuma das duas
referências FIESP no repositório reporta 16 bilhões m³ de CH₄ por ano.

**A qual das duas ela pretendia se referir NÃO é determinável.** Ambas as
hipóteses exigiriam supor o que não está escrito:

| Hipótese | O que seria preciso admitir |
|---|---|
| Referia-se ao FIESP 2025 | Que "16" substituiu 4,3 (biogás) ou 2,3 (biometano) bilhões — nenhum dos dois arredonda para 16, e a grandeza CH₄ não é reportada pela FIESP 2025 |
| Referia-se ao FIESP/AMPLUN 2021 | Que "M m³/dia" virou "bilhões m³/ano" e "biogás" virou "CH₄" — duas trocas simultâneas — e ainda assim a fonte de 2021 não está versionada |

Converter qualquer um dos números para "consertar" o rótulo seria escolher a
hipótese mais plausível, o que a instrução deste lote proíbe.

**Ação tomada:** o rótulo foi **removido** dos dois locales, junto com o bloco de
JSX que o renderizava (`BiomassFlowSankey.tsx`), com comentário no código
apontando para este documento. O gráfico Sankey mantém a legenda de aproveitamento
e perdas; perdeu apenas a linha de referência externa.

---

## 6. Divergências que ficam abertas

Registradas, não resolvidas:

1. **A citação "FIESP/AMPLUN 2021 ~16,0 M m³/dia" não tem fonte versionada** e
   aparece em quatro arquivos, incluindo a saída impressa do script canônico
   (`compute_sp_canonical_totals.py:319`) e o suplemento do paper
   (`FOSS4G_PAPER_SUPPLEMENT.md:133`). Ou a fonte é localizada e registrada em
   `METADATA.json`, ou as quatro citações saem. **Escopo do Lote 5.**
2. **O estudo de 2021 conflita com a corroboração da própria extração**: Instituto 17
   (2021) reporta ~4,2 bilhões Nm³/ano ≈ 11,5 Mm³/d de biogás; a citação de 2021 no
   repositório diz 16,0 Mm³/d. Podem ser estudos distintos do mesmo ano, ou a mesma
   fonte citada com valores diferentes. Não determinável com o que está versionado.
3. **Ambiguidade declarada pela própria extração e ainda não resolvida**
   (`FIESP_BENCHMARK_EXTRACTION.md:60-64`): o fator de torta de filtro da Tabela 5
   da FIESP, "84,41 Nm³/t de cana processada", é fisicamente implausível por
   tonelada de cana e é quase certamente por tonelada de torta. Marcado
   *"Flagged for user confirmation"* desde 2026-06-12; segue sem confirmação.

---

## 7. Reprodução

```bash
grep -rn "sankey_benchmark_label" cp2b-workspace/NewLook/frontend/   # agora vazio
sed -n '128,152p' cp2b-workspace/NewLook/docs/data/FIESP_BENCHMARK_EXTRACTION.md
grep -rn "FIESP/AMPLUN 2021" --include=*.md --include=*.py .
git log --all -S"sankey_benchmark_label" --reverse --format='%h %ad %s' --date=short | head -1
```
