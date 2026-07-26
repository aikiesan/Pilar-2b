# Dívidas registradas para o Lote 5 — sincronização da documentação

**Aberto em:** 2026-07-26 (fim do Lote 2b) · **Estado:** registro, nada corrigido

O Lote 5 é *"sincronização da documentação, sem digitar número"*. Até aqui as
pendências estavam espalhadas por cinco documentos de lotes diferentes. Este
arquivo é o registro único; cada linha aponta para onde o achado foi apurado.

**Regra que vale para todo o Lote 5:** nenhum número é digitado à mão. Os valores
vêm de `docs/data/estado_2026-07-26_lote2.json` (ou do que o suceder), e a
verificação é o script do Lote 4.

---

## A. Decisões do usuário, pendentes

| # | Item | Apurado em |
|---|---|---|
| **A1** | **`PALHA_SOJA`: 3 dos 4 fatores de disponibilidade (`fc`, `fs`, `fl`) sem fonte versionada.** Contribui 0,0831 Mm³/d de CH₄ medio ao total estadual. Imprime `—` na matriz de rastreabilidade. **Decisão do usuário, pendente.** | `DELTA_LOTE2_2026-07-26.md` §7.3 |
| **A2** | **Vinhaça: rendimento de CH₄ por m³.** PILAR-2b 2,88 Nm³/m³, abaixo da faixa citada de 6–10; FIESP 11,71, acima dela. Mexer nisso exige referência primária, nunca o benchmark. Candidato a lote próprio, não ao Lote 5. | `CONFRONTO_FIESP_2026-07-26.md` §2.1 |
| **A3** | **Fonte do "FIESP/AMPLUN 2021 ~16,0"**, citado em 4 arquivos sem lastro. Ou a fonte é localizada e registrada em `METADATA.json`, ou as 4 citações saem. O Lote 2b levantou dois candidatos nomeados (GEF Biogás Brasil 15,5 bi Nm³/ano; Instituto 17/BEP UK 2021 8,2 Mm³/d ≈ 15,5 Mm³/d de biogás), mas nenhum é confirmável. | `VERIFICACAO_BENCHMARK_FIESP_2026-07-25.md` §6; `CONFRONTO_FIESP_2026-07-26.md` §5 |
| **A4** | **URL do relatório FIESP 2025.** `data/benchmarks/fiesp_2025.yaml` tem `document.url: null` deliberadamente. | `CONFRONTO_FIESP_2026-07-26.md` §6 |

---

## B. Documentação que afirma o que deixou de ser verdade

| # | Item | Apurado em |
|---|---|---|
| **B1** | **O suplemento do paper cita `FDE_TRACEABILITY_MATRIX.md` como evidência de rastreabilidade por fator.** Removido o fallback `refs[0]`, **4 células imprimem `—`** (PALHA_SOJA fc/fs/fl, PODA_URBANA fl). O texto do suplemento precisa refletir isso — hoje ele afirma uma cobertura que a matriz já não sustenta. | `DELTA_LOTE2_2026-07-26.md` §7.3 |
| **B2** | **`FIESP_BENCHMARK_EXTRACTION.md` §1 e §6 incluem o bagaço no escopo do headline da FIESP.** A aritmética da própria FIESP o exclui: o bagaço sozinho excederia o total publicado em 21,2 %. | `CONFRONTO_FIESP_2026-07-26.md` §2.3 |
| **B3** | **`FOSS4G_PAPER_SUPPLEMENT.md`, `SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md` e `METADATA.json` publicam totais estaduais anteriores ao Lote 2.** Todos desatualizados. Inclui a tabela de parâmetros químicos do suplemento, que já divergia de `feedstocks.yaml` antes disso (D7). | `AUDITORIA_PILAR2B_2026-07-25.md` D2, D7; `DELTA_LOTE2_2026-07-26.md` §9 |
| **B4** | **Contagem de substratos: 26 → 28** após o porte da Fase 2. A auditoria já registrava 5 valores conflitantes em circulação (26/31/38/~38/50+); agora o autoritativo é **28**. As strings "31 resíduos" do i18n e do script continuam erradas. | `AUDITORIA_PILAR2B_2026-07-25.md` D3; `DELTA_LOTE2_2026-07-26.md` |
| **B5** | **A retenção medio/medio passou a 12,01 %** (era 10,73 %). Valor aprovado para o manuscrito em 2026-07-26. | `DELTA_LOTE2_2026-07-26.md` §1 |

---

## C. Cenário Fronteira — remoção

| # | Item | Apurado em |
|---|---|---|
| **C1** | **`FRONTIER_ALPHA = 0.5` continua em `compute_sp_canonical_totals.py`**, e o script segue imprimindo o 4º cenário e a linha de comparação FIESP com "31 resíduos". | `INVENTARIO_FRONTEIRA_2026-07-25.md` §2 |
| **C2** | **Os 11 multiplicadores de `scenarioFactors.ts` ficam órfãos** sem α: nenhuma fórmula no repositório os reproduz. Ou a chave `fronteira` sai de `MapScenarioKey` — o que altera a assinatura usada por mapa, painéis e 3 arquivos de teste — ou passam a ser gerados por `generate_from_canonical.py`. | `INVENTARIO_FRONTEIRA_2026-07-25.md` §3, §8.1 |
| **C3** | **`MapComponent.tsx:190` tem `'fronteira'` como cenário padrão do mapa.** Precisa de substituto explícito; `'baseline'` corresponde ao `medio`. | `INVENTARIO_FRONTEIRA_2026-07-25.md` §8.2 |
| **C4** | **14 strings de i18n afirmam publicamente superar o benchmark FIESP** (7 pt-BR + 7 en), agora sem cenário que as sustente. | `INVENTARIO_FRONTEIRA_2026-07-25.md` §5, §8.3 |
| **C5** | **`004_import_panorama_data.sql` tem 2 ocorrências de "fronteira"** — verificar se é sentido agrícola, homônimo, antes de tocar. | `INVENTARIO_FRONTEIRA_2026-07-25.md` §8.5 |

---

## D. Divergências entre camadas

| # | Item | Apurado em |
|---|---|---|
| **D1** | **As duas `calculateFDE` do frontend continuam divergentes entre si** — `analysis.ts:45` usa `1 - fcp`, `residuosApi.ts:453` multiplica `fcp` direto. O Lote 2 corrigiu o **nome e a fonte** no YAML (`fco_available`, convenção `== 1 - fcp_committed`), não as duas funções. | `AUDITORIA_PILAR2B_2026-07-25.md` D1; `DELTA_LOTE2_2026-07-26.md` §7.1 |
| **D2** | **A camada de mapa usa o bovino AGREGADO enquanto o total estadual usa a divisão corte/leiteiro.** Divergência deliberada e testada contra soma dupla, mas divergência. | `DELTA_LOTE2_2026-07-26.md` §5 |
| **D3** | **Vocabulário de cenário divergente:** `medio` no Python, `baseline` no TypeScript. | `AUDITORIA_PILAR2B_2026-07-25.md`; instrução do usuário |
| **D4** | **`rsu_organic` implica fração orgânica de ~27 %** (0,100 t/cap/ano sobre 0,365), contra os **52,5 %** que o próprio `feedstocks.yaml` declara em `organic_fraction_of_rdo`. Inconsistência interna, achada pelo confronto com a FIESP. | `CONFRONTO_FIESP_2026-07-26.md` §2.4, §6 |

---

## E. Fora do Lote 5, registrado para não se perder

| # | Item | Destino |
|---|---|---|
| **E1** | `validate_canonical_consistency.py` no CI da **raiz** do monorepo | **Lote 4** |
| **E2** | `canonical_results.json` + `compute_spatial_concentration.py` (Lorenz, Gini, top-N, RGINT com %) | **Lote 3** |
| **E3** | Validação em três camadas; nunca "MAE"/"erro"/"acurácia" na Camada 2 | **Lote 1b/1c** |
| **E4** | Atribuição FAPESP (2024/01112-1 = CCD do CP2B, infraestrutura; 2025/08745-2 = bolsa de pós-doc) e LICENSE com o texto integral da GPL-3.0 | **Lote 6** |
| **E5** | Export de `scientific_references` do Supabase → `bmp_observations.csv`; sem isso as 196 observações de BMP seguem não versionadas e R2 continua limitada a `n` e mediana | **usuário** |
| **E6** | Localizar o repositório do PILAR-2b v2.0 (Streamlit), ago–out/2025 | **usuário** |
| **E7** | Safrinha (`Milho_PAM_SAFRAS_Limpo.csv`) e CONAB — depois da submissão, seção de limitações | **decidido** |
