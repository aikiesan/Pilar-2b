# Atualização da série ANP de biometano por planta até 09/2026

## Consulta

- **Data da consulta:** 11/11/2026.
- **Página:** Painel Dinâmico de Produtores de Biometano (ANP), atualizada em 22/10/2026: <https://www.gov.br/anp/pt-br/centrais-de-conteudo/paineis-dinamicos-da-anp/paineis-e-mapa-dinamicos-de-produtores-de-combustiveis-e-derivados/painel-dinamico-de-produtores-de-biometano>
- **Arquivo baixado ("Base de dados utilizada no painel"):** <https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/biometano/biometano-dados-abertos.zip>
- **Conteúdo do zip:** `Biometano_DadosAbertos_CSV_Capacidade.csv` (por planta, usado aqui) e `Biometano_DadosAbertos_CSV_Producao.csv` (por UF, não incorporado nesta atualização). SHA-256 do zip: `0c5f71d595bc9df119a5ae64b4fbdb1b89910237911343816db20398396f4f00`.
- **Formato:** idêntico ao bruto anterior (UTF-8 com BOM, fim de linha CRLF, separador vírgula, vírgula decimal, mesmo cabeçalho, meses em ordem decrescente e CNPJ crescente). O bruto `anp_biometano_capacidade.csv` foi substituído pelo CSV da ANP sem alteração.

## Meses acrescentados

05/2026, 06/2026, 07/2026, 08/2026, 09/2026: 104 linhas novas (05/2026: 20 plantas; 06/2026: 21 plantas; 07/2026: 21 plantas; 08/2026: 21 plantas; 09/2026: 21 plantas). A série passa a cobrir 01/2020 a 09/2026 (615 linhas). Nenhuma linha antiga foi removida.

## Revisões de valores antigos

A ANP revisou 152 células de meses que já estavam no bruto: 32 de volume processado de biogás, 32 do percentual volume/capacidade correspondente e 88 de razão social. Capacidades, região, estado e município não mudaram.

### Volume processado de biogás (m³/d) e utilização (%)

| Mês | CNPJ | Planta | Município (UF) | Volume antes → depois | Utilização antes → depois |
|---|---|---|---|---|---|
| 03/2025 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 6.780 → 29.845 | 8% → 36% |
| 04/2025 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 632 → 22.382 | 1% → 27% |
| 05/2025 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 6.157 → 22.972 | 7% → 27% |
| 06/2025 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 0 → 6.121 | 0% → 7% |
| 07/2025 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 0 → 15.575 | 0% → 19% |
| 08/2025 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 0 → 20.114 | 0% → 24% |
| 09/2025 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 0 → 17.720 | 0% → 21% |
| 10/2025 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 3.768 → 21.208 | 4% → 25% |
| 11/2025 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 10.900 → 19.733 | 13% → 23% |
| 12/2025 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 12.133 → 19.411 | 14% → 23% |
| 01/2026 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 16.504 → 17.245 | 19% → 20% |
| 02/2026 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 16.721 → 19.696 | 19% → 23% |
| 03/2026 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 22.086 → 23.662 | 25% → 27% |
| 04/2026 | 12415018000214 | GEO ELÉTRICA TAMBOARA BIOENERGIA LTDA | Tamboara (PR) | 18.613 → 22.356 | 21% → 26% |
| 05/2025 | 38615333000106 | CRI GEO BIOGAS S.A. | Elias Fausto (SP) | 1.029 → 7.519 | 2% → 12% |
| 06/2025 | 38615333000106 | CRI GEO BIOGAS S.A. | Elias Fausto (SP) | 6.477 → 9.262 | 11% → 15% |
| 07/2025 | 38615333000106 | CRI GEO BIOGAS S.A. | Elias Fausto (SP) | 4.080 → 5.631 | 7% → 9% |
| 08/2025 | 38615333000106 | CRI GEO BIOGAS S.A. | Elias Fausto (SP) | 4.648 → 5.852 | 8% → 10% |
| 09/2025 | 38615333000106 | CRI GEO BIOGAS S.A. | Elias Fausto (SP) | 3.180 → 4.958 | 5% → 8% |
| 10/2025 | 38615333000106 | CRI GEO BIOGAS S.A. | Elias Fausto (SP) | 1.564 → 4.683 | 3% → 8% |
| 11/2025 | 38615333000106 | CRI GEO BIOGAS S.A. | Elias Fausto (SP) | 0 → 7.047 | 0% → 12% |
| 12/2025 | 38615333000106 | CRI GEO BIOGAS S.A. | Elias Fausto (SP) | 4.867 → 12.980 | 8% → 21% |
| 01/2026 | 38615333000106 | CRI GEO BIOGAS S.A. | Elias Fausto (SP) | 2.108 → 9.530 | 3% → 16% |
| 02/2026 | 38615333000106 | CRI GEO BIOGAS S.A. | Elias Fausto (SP) | 8.359 → 17.437 | 14% → 29% |
| 03/2026 | 38615333000106 | CRI GEO BIOGAS S.A. | Elias Fausto (SP) | 15.658 → 25.926 | 26% → 43% |
| 04/2026 | 38615333000106 | CRI GEO BIOGAS S.A. | Elias Fausto (SP) | 11.925 → 27.229 | 20% → 45% |
| 11/2025 | 50365355000152 | BIOMETANO VERDE PAULINIA S.A. | Paulinia (SP) | 21 → 20.591 | 0% → 9% |
| 12/2025 | 50365355000152 | BIOMETANO VERDE PAULINIA S.A. | Paulinia (SP) | 18 → 17.575 | 0% → 7% |
| 01/2026 | 50365355000152 | BIOMETANO VERDE PAULINIA S.A. | Paulinia (SP) | 39 → 38.627 | 0% → 16% |
| 02/2026 | 50365355000152 | BIOMETANO VERDE PAULINIA S.A. | Paulinia (SP) | 113 → 112.725 | 0% → 47% |
| 03/2026 | 50365355000152 | BIOMETANO VERDE PAULINIA S.A. | Paulinia (SP) | 186 → 186.458 | 0% → 78% |
| 04/2026 | 50365355000152 | BIOMETANO VERDE PAULINIA S.A. | Paulinia (SP) | 208 → 207.889 | 0% → 87% |

Nota: na Biometano Verde Paulínia (OneBio), os volumes anteriores eram cerca de mil vezes menores que os revisados (ex.: 208 → 207.889 m³/d em 04/2026), o que sugere correção de unidade no informe.

### Razão social

| CNPJ | Antes → depois | Meses revisados |
|---|---|---|
| 11131464000587 | GÁS VERDE S.A. → GÁS VERDE SEROPÉDICA S.A. | 07/2020 a 04/2026 (70 meses) |
| 24025216000250 | GASGRID GÁS E ENERGIA S.A → ZEG BIOGÁS E ENERGIA S.A | 09/2021 a 06/2022 (10 meses) |
| 51447607000155 | BIOENERGIA SANTA CRUZ LTDA. → BIOMETANO SANTA CRUZ LTDA. | 09/2025 a 04/2026 (8 meses) |

## Plantas novas e plantas que sumiram

- Nova: SCBIO ENERGIAS RENOVÁVEIS SPE LTDA. (CNPJ 47290256000225), Campos Novos (Santa Catarina), a partir de 05/2026.
- Nova: BIOMETANO SÃO LEOPOLDO S.A. (CNPJ 53291355000143), Sao Leopoldo (Rio Grande do Sul), a partir de 06/2026.
- **Plantas novas em SP: nenhuma.** As duas plantas novas ficam em SC e RS.
- Nenhuma planta sumiu da base.

## Conferências

- Cocal Narandiba (CNPJ 14788495000170): volumes de 08/2025 a 04/2026 inalterados (23.913, 21.817, 25.414, 23.390, 15.438, 16.464, 20.035, 18.810 e 19.087 m³/d de biogás).
- Antes de 08/2025, os volumes da Cocal Narandiba (0 a 30 m³/d) seguem como a ANP publica: são lacuna de informe, não produção baixa, e não foram alterados.
- `util_pct` = volume processado de biogás ÷ capacidade de processamento de biogás (diferença máxima de 0,5 ponto percentual, arredondamento da ANP); não é produção de biometano.
- `05e_anp_biometano_plant_volume_monthly.csv` e `05c_anp_biometano_plants_latest.csv` foram regenerados com `analysis/build_anp_biometano_dataset.py`, sem mudança de lógica.

## Pendências

- As duas plantas novas não têm entrada no dicionário de enriquecimento do script (`ENRICH`): saem com `plant_id` genérico (`anp_<CNPJ>`) e setor `industry`. São Leopoldo (RS) também não tem centroide (`EXTRA`) e fica sem lat/lon.
- O CNPJ 24025216000250 passou a se chamar ZEG Biogás e Energia na base da ANP; o nome amigável no script continua "Gasgrid Gás e Energia".
- A cópia da plataforma (`cp2b-workspace/NewLook/data/canonical_parameters/anp_biometano_plantas_ultimo_mes.csv`) não foi atualizada nesta mudança e continua em 04/2026.
- A série estadual (`anp_biometano_producao.csv` e o 05d) não foi atualizada; o zip da ANP traz a versão até 09/2026.
