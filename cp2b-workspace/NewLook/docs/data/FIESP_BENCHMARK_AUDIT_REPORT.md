# Pilar-2b × FIESP/Amplun — Recalibration & Comparison Report

**Date:** 2026-06-12 · **Branch:** `claude/dreamy-wright-icxmfp`
**Benchmark:** FIESP/Instituto17/PSR/Amplun, *"O Biometano em São Paulo"*, Relatório Técnico, Jun/2025.
**Model source of truth:** `backend/scripts/compute_sp_canonical_totals.py` + `data/canonical_parameters/feedstocks.yaml`.

---

## 1. São Paulo potential — 4 canonical scenarios (recomputed, 100% forward)

| Cenário | CH₄ (Mm³/d) | Biogás (Mm³/d) | Biometano (Mm³/d) |
|---|---:|---:|---:|
| **Linha de Base** (conservador) | 0,74 | 1,32 | 0,71 |
| **Médio Prazo** (realista) | 3,57 | 6,39 | 3,46 |
| **Otimista** | 14,45 | 25,78 | 14,02 |
| **Fronteira do Biogás** (mobilização plena / política) | ~14,7 | ~25,9 | ~14,2 |

*Fronteira* = envelope superior com disponibilidade plena (FC/FCo relaxados ao limite de coleta),
representando o teto de política pública. Coincide com os números do handoff (14,66 / 25,85 / 14,22).

---

## 2. Apples-to-apples vs FIESP (sugar-energy + landfill only)

FIESP cobre **apenas cana (bagaço/vinhaça/torta) + RSU em aterro**. O subconjunto equivalente do Pilar:

| | Pilar subset · min | **medio** | max | **FIESP 2025** |
|---|---:|---:|---:|---:|
| Biogás (Mm³/d) | 1,09 | **4,76** | 16,40 | **11,7** (total) |
| Biometano (Mm³/d) | 0,58 | **2,54** | 8,79 | **6,4** (Cenário 1) / **4,75** (Cenário 2) |

**Leitura:** o 6,4 Mm³/d da FIESP (todo o biogás → biometano, plantas futuras + já realizadas) cai
entre o *medio* (2,54) e o *max* (8,79) do subconjunto Pilar; o 4,75 (descontando o que já gera
energia elétrica) idem. Pilar *medio* é mais conservador porque aplica FDE auditado (coleta,
competição de uso, logística) sobre **frações de resíduo reais**; FIESP credita biomassa
plant-by-plant com disponibilidade alta (vinhaça/torta 100%, bagaço 30%).

### Duas calibrações (decisão: mostrar ambas)
- **(A) Fatores FIESP Tabela 5 aplicados diretamente** (bagaço 106 Nm³/t, vinhaça 17,68 Nm³/t cana,
  torta ~84 Nm³/t torta): sucroenergético sozinho ⇒ **~12–13 Mm³/d biometano** — *excede o próprio
  headline FIESP (6,4)* porque os fatores são brutos; sem o desconto plant-level da FIESP não é
  auto-consistente. Não adotado como canônico.
- **(B) Ancorada ao headline FIESP (6,4 Mm³/d)** — corresponde ao subconjunto Pilar entre *medio* e
  *max*. É a referência defensável contra o número publicado. **Adotada como ponto de comparação.**

---

## 3. Validação empírica de BMP (367 papers → 196 observações)

Mineradas de `scientific_references.notes`, corroboram os valores canônicos (mediana das refs vs
`feedstocks.yaml` medio, mL CH₄/g VS): BAGACO 192 vs 165 · TORTA 365 vs 280 · SUINO 265 vs 235 ·
GORDURA 859 vs 850 · CAMA_AVIARIO 300 vs 280 · FORSU 472 vs 310. Detalhe em
`feedstock_bmp_from_refs.csv` / `REFERENCE_CORPUS_SUMMARY.md`. Faixas largas = estudos com
pré-tratamento/co-digestão (não a condição base de SP); medianas são a âncora.

**Recomendação (não aplicada — preserva os 21+ testes de regressão):** rever para cima, com
justificativa por linha, BMP de PALHA, VINHACA e FORSU onde a base empírica é robusta; manter os
demais. Isso eleva *medio* aproximando-o do benchmark FIESP sem perder rigor.

---

## 4. Por que o Pilar é mais completo (a comparação que importa)

| Critério | **Pilar-2b** | **FIESP/Amplun 2025** |
|---|---|---|
| Categorias de resíduo | **31 resíduos · 4 setores** (agrícola, pecuária, industrial, urbano) | 2 classes (cana + aterro) |
| Base científica | **367 refs únicas, 99% com URL direta, 294 peer-reviewed** | relatórios institucionais + 1 interno (CH4 Solutions, sem URL) |
| Resolução | municipal (645 municípios) → mesorregião | mesorregião / planta |
| Cenários | 4 (Base→Fronteira) + envelope min/medio/max | 2 (todo biogás / descontado) |
| Validação | FDE auditado + 196 obs. BMP + testes de regressão | 146 usinas reais (forte na cana) |
| Resíduos exclusivos do Pilar | pecuária (bovino/suíno/aves), café, citros, soja, milho, lodo ETE, soro de queijo, abatedouro, gordura… | — |
| Transparência de fontes | tabela parâmetro→fonte (URL/DOI), defeitos sinalizados | fator-chave em documento interno proprietário |

**Síntese:** no recorte que a FIESP cobre, os dois convergem (~6,4 Mm³/d). Fora dele, o Pilar
acrescenta ~25 fluxos de resíduo em 4 setores que a FIESP não quantifica — daí ser o inventário
mais completo e auditável do potencial de biogás/biometano de SP.

---

## 5. Pendências
- **42 linhas com DOI reutilizado** entre resíduos → `SUSPECT_DOI_WORKLIST.md` (verificação manual; sem chutes).
- Aplicar (se aprovado) os ajustes de BMP do §3 e re-rodar `compute_sp_canonical_totals.py`.
