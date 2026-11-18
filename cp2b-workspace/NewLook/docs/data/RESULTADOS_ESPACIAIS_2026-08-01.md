# Resultados espaciais — Cenário Real, método Atlas

**Data:** 2026-08-01 · **Base:** `main` @ `7bd8596` + correções desta sessão
**Fonte:** colunas `ch4_real_*` / `ch4_ideal_*` gravadas por
`load_scenarios_real_ideal.py`, reconciliadas em três pontos
(ver `VALIDACAO_CADEIA_NUMERICA_2026-08-01.md`)

> Todos os valores abaixo substituem os do manuscrito, que foram calculados sob
> o motor forward com FDE multiplicativo, anterior ao retrabalho de 30/07.
> Reprodução: `backend/scripts/sp_spatial_concentration.py`.

---

## 1. Concentração — o que muda no manuscrito

| Grandeza | Manuscrito | Vigente |
|---|---:|---:|
| Municípios para 67 % do potencial | 162 (**25,1 %**) | 193 (**29,9 %**) |
| Gini municipal | não reportado | **0,5105** |
| Municípios ≥ 50.000 m³/dia | 125 (19,4 %), 58,5 % do total | **132 (20,5 %), 54,8 %** |
| Maior município | Barretos, 1.782.051 m³/dia | **São Paulo, 390.490 m³/dia** |
| Menor não nulo | Barra do Chapéu, 280 m³/dia | **Águas de São Pedro, 66 m³/dia** |
| Amplitude | "quatro ordens de grandeza" | **5.917×** (3,77 ordens) |

Nenhum município tem potencial zero. Os demais limiares: 50 % em 113 municípios
(17,5 %), 80 % em 284 (44,0 %), 90 % em 382 (59,2 %).

**A liderança troca de natureza.** São Paulo assume o primeiro lugar com
390.490 m³/dia, dos quais **99,9 % são urbanos** (RSU + ETE + poda). Barretos cai
para 225.057 m³/dia — cerca de um oitavo do que lhe era atribuído — porque o
bagaço saiu do escopo. A afirmação de "quatro ordens de grandeza" já era um
arredondamento no manuscrito (6.364×) e continua sendo: são 3,77 ordens.

## 2. Regiões intermediárias

| # | Região | Real (%) | Ideal (%) |
|---|---|---:|---:|
| 1 | Ribeirão Preto | 17,82 | — |
| 2 | São José do Rio Preto | 13,88 | — |
| 3 | **Sorocaba** | 9,92 | — |
| 4 | **Marília** | 9,72 | — |
| 5 | Bauru | 9,51 | — |
| 6 | Presidente Prudente | 9,39 | — |
| 7 | Campinas | 9,30 | — |
| 8 | Araçatuba | 8,63 | — |
| 9 | Araraquara | 6,53 | — |
| 10 | São Paulo | 3,51 | — |
| 11 | São José dos Campos | 1,78 | — |

Top-5 = **60,86 %**, contra 67,4 % no manuscrito. **Sorocaba e Marília entram;
Araçatuba e Presidente Prudente saem.** Campinas fica em 7º, e não no Top-5 como
a auditoria de 27/07 previa — aquela previsão vinha de outra metodologia ainda.

## 3. Concentração por fluxo — o resultado mais forte da série

| Fluxo | % do estado | Gini | Municípios sem o resíduo |
|---|---:|---:|---:|
| Aquicultura | 0,0 | **0,967** | 493 |
| Café | 0,9 | 0,932 | 361 |
| Silvicultura | 3,1 | 0,893 | 280 |
| Citros | 2,5 | 0,859 | 308 |
| RSU (FORSU) | 5,1 | 0,838 | 0 |
| Suínos | 0,3 | 0,835 | 58 |
| Aves | 1,1 | 0,822 | 69 |
| Milho | 7,0 | 0,811 | 81 |
| Soja | 6,2 | 0,811 | 165 |
| Poda urbana | 0,3 | 0,802 | 0 |
| Esgoto (ETE) | 0,9 | 0,802 | 0 |
| Cana | 57,0 | 0,647 | 133 |
| Bovinos | 15,7 | **0,549** | 28 |
| **Total** | 100 | **0,510** | 0 |

**Todo fluxo individual é mais concentrado que o agregado.** O total (0,510) fica
abaixo de onze dos treze componentes. Isso não é artefato: os fluxos se
concentram em lugares **diferentes** e se compensam parcialmente no agregado —
um efeito de portfólio. É o argumento quantitativo mais direto a favor da
avaliação multi-resíduo, e o manuscrito hoje não o tem.

## 4. Tipologias regionais — a alegação do artigo, agora testada

O manuscrito afirma que a estrutura de fatores "identificou três tipologias
regionais estruturalmente distintas", sem derivá-las. Agrupamento por k-médias
sobre a **composição** de resíduos (participações, não volumes), com silhueta
avaliada de k=2 a k=8:

| k | 2 | **3** | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|
| silhueta | 0,477 | **0,539** | 0,519 | 0,431 | 0,437 | 0,426 | 0,436 |

**O máximo ocorre exatamente em k = 3.** A tipologia tripla é sustentada pelos
dados, não imposta. Os grupos:

| Tipologia | Municípios | Perfil dominante |
|---|---:|---|
| Cana + bovinos | 353 | interior canavieiro |
| Bovinos + milho | 224 | agropecuária diversificada |
| RSU + esgoto | 68 | urbano-concentrado |

Isto converte uma afirmação não sustentada em resultado — e é, provavelmente, o
ganho mais barato disponível para o artigo.

## 5. Potencial × malha de gás — análise nova

Distância do centroide municipal à malha de gás natural (transporte +
distribuição, ANP/EPE), recortada ao estado:

| Faixa | Municípios | mi m³/dia | % do estado |
|---|---:|---:|---:|
| 0–10 km | 162 | 4,28 | 19,9 |
| 10–25 km | 96 | 2,49 | 11,6 |
| 25–50 km | 96 | 3,41 | 15,9 |
| 50–100 km | 168 | 5,41 | 25,2 |
| 100–200 km | 122 | 5,85 | 27,2 |
| > 200 km | 1 | 0,03 | 0,1 |

**Apenas 47,4 % do potencial mobilizável está a até 50 km de um ponto de
injeção**; 52,5 % está além disso. A restrição de escoamento é geográfica e
mensurável, e é a justificativa empírica mais forte para o módulo de proximidade
da plataforma — que hoje o artigo descreve como funcionalidade, sem resultado.

## 6. Intensidade por habitante

| | |
|---|---:|
| Estado | 176,4 m³ CH₄/hab·ano |
| Mediana municipal | 703,0 |
| P90 municipal | 2.564,4 |
| Máximo | Sandovalina, 8.225 |

A mediana municipal é **4×** a média estadual: o potencial por habitante
concentra-se em municípios pequenos de base agrícola, enquanto o volume absoluto
concentra-se nos grandes. Volume e intensidade apontam para políticas
diferentes, e o artigo hoje só reporta volume.

---

## 7. Inventário de figuras geradas

Geradas em `analysis/paper_figures/out/` (fora do git — ver o `.gitignore` de lá).

| Arquivo | Conteúdo |
|---|---|
| `fig01_potencial_total_gasodutos` | potencial municipal + malha de gás |
| `fig02_potencial_por_setor` | quatro painéis: agrícola, pecuária, urbano, silvicultura |
| `fig03_absoluto_vs_percapita` | volume × intensidade, lado a lado |
| `fig04_residuos_painel` | 13 fluxos numa folha, com Gini e cobertura |
| `fig05_01..13_residuo_*` | um mapa por resíduo, cada um com a malha de gás |
| `fig06_lorenz_gini` | Lorenz Real/Ideal + Gini por fluxo |
| `fig07_sensibilidade_limiar` | sensibilidade do corte de 50 mil m³/dia |
| `fig08_regioes_intermediarias` | participação regional nos dois cenários |
| `fig09_tipologias_k` | silhueta e cotovelo — quantas tipologias |
| `fig10_tipologias_mapa` | mapa das três tipologias + perfil |
| `fig11_real_vs_ideal` | ganho absoluto e relativo do Cenário Ideal |
| `fig12_proximidade_gasodutos` | distância à malha + potencial por faixa |
| `fig13_composicao_regional` | mistura de resíduos por região |

**Substituem no manuscrito:** Figura 4 (cascata) e Figura 5 (coroplético).
**Figura 1 precisa ser refeita** por outro motivo — descreve Mapbox GL JS,
Next 15.5.7, FastAPI 0.104.1 e Supabase, e nenhum dos quatro corresponde ao
sistema atual (Leaflet 1.9.4, Next 16.2.6, FastAPI 0.136.1, PostgreSQL local).

## 8. Limites destes resultados

- A malha de gás vem de shapefiles ANP/EPE **não versionados** no repositório;
  a análise de proximidade não é reproduzível a partir de um clone limpo.
- Distância é medida do **centroide** municipal, não da localização provável da
  planta — é triagem, não estudo de rota.
- As tipologias usam composição, não sazonalidade. A alegação do manuscrito
  sobre `FS = 0,63` para regiões canavieiras contra `FS = 1,0` para urbanas
  **não** foi verificada aqui.
- Nada nesta série revalida FIESP, plantas em operação ou cobertura de testes.
