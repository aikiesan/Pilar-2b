# CP2b × Atlas Real, passo a passo por fluxo

> Gerado por `analysis/build_cp2b_fluxos.py`. Estado de SP, Nm³ CH₄/dia.

Os cenários Real e Ideal da plataforma, as camadas do mapa e o filtro de resíduos já servem o CP2b (Real = N4, Ideal = N3), os mesmos números do artigo. Os protótipos de análise calculam os fluxos pela cadeia do Atlas de Bioenergia SP 2020, Cenário Real (`backend/scripts/sp_scenarios_real_ideal.py`). Este relatório compara as duas, fluxo a fluxo.

Protótipos que leem a cadeia do Atlas: `build_bacias_aterro.py`, `build_biogram_national_share.py`, `build_biogram_reconciliation.py`, `build_integra_residuos.py`, `build_sp_biolng_santos.py`, `build_sp_digestate_nutrients.py`, `build_sp_green_corridors.py`, `build_sp_opportunity_sites.py`, `build_sp_real_uncertainty.py`.

- CP2b: CP2b v5.1, cenário med.
- Referência: N4, o que a plataforma chama de Cenário Real. Diferença acima de 20 % precisa de explicação na plataforma ou de nota à equipe do método.

## Passo a passo

| Fluxo | Atlas Real | N1 | N2 | N3 antes | Uso existente | N3 | N4 | N4 ÷ Atlas | Passo dominante |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Vinhaça** | 3.280.345 | 2.590.752 | 2.461.214 | 2.461.214 | 39.041 | 2.422.173 | 2.218.437 | × 0,68 | N1 / Atlas |
| Torta de filtro | 2.357.897 | 2.909.887 | 2.618.898 | 2.618.898 | 39.647 | 2.579.251 | 2.321.326 | × 0,98 | N1 / Atlas |
| **Bovinos** | 3.358.168 | 4.456.887 | 380.017 | 380.017 | 1.587 | 378.431 | 217.220 | × 0,06 | FC |
| **Suínos** | 56.139 | 101.781 | 86.514 | 86.514 | 2.591 | 83.922 | 42.585 | × 0,76 | FS × FL |
| **Aves** | 243.844 | 1.257.561 | 1.128.592 | 1.072.162 | 5.297 | 1.066.865 | 986.273 | × 4,04 | N1 / Atlas |
| **Esgoto** | 182.586 | 280.857 | 151.732 | 151.732 | 10.826 | 140.906 | 117.724 | × 0,64 | FC |
| **RSU orgânico** | 1.089.272 | 1.368.385 | 889.450 | 889.450 | 446.934 | 442.516 | 420.875 | × 0,39 | uso existente |

Fatores de cada passo (o produto é N4 ÷ Atlas):

| Fluxo | N1 / Atlas | FC | FCo | uso existente | FS × FL | N4 ÷ Atlas |
|---|---:|---:|---:|---:|---:|---:|
| Vinhaça | × 0,79 | × 0,95 | × 1,00 | × 0,98 | × 0,92 | × 0,68 |
| Torta de filtro | × 1,23 | × 0,90 | × 1,00 | × 0,98 | × 0,90 | × 0,98 |
| Bovinos | × 1,33 | × 0,09 | × 1,00 | × 1,00 | × 0,57 | × 0,06 |
| Suínos | × 1,81 | × 0,85 | × 1,00 | × 0,97 | × 0,51 | × 0,76 |
| Aves | × 5,16 | × 0,90 | × 0,95 | × 1,00 | × 0,92 | × 4,04 |
| Esgoto | × 1,54 | × 0,54 | × 1,00 | × 0,93 | × 0,84 | × 0,64 |
| RSU orgânico | × 1,26 | × 0,65 | × 1,00 | × 0,50 | × 0,95 | × 0,39 |

Por unidade da base do master (a mesma do Atlas), Nm³ CH₄/ano. N1 por unidade mistura a base e o rendimento do CP2b:

| Fluxo | Base | Atlas Real | CP2b N1 |
|---|---:|---:|---:|
| Vinhaça | 439.098.082 t de cana | 2,73 | 2,15 |
| Torta de filtro | 439.098.082 t de cana | 1,96 | 2,42 |
| Bovinos | 10.763.360 cabeça | 113,88 | 151,14 |
| Suínos | 1.591.238 cabeça | 12,88 | 23,35 |
| Aves | 199.056.680 cabeça | 0,45 | 2,31 |
| Esgoto | 44.411.238 habitante | 1,50 | 2,31 |
| RSU orgânico | 44.411.238 habitante | 8,95 | 11,25 |

Substratos do CP2b dentro de um fluxo (o Atlas tem um número só para o fluxo):

| Fluxo | Substrato | N1 | N2 | N3 | N4 | FC | FCo | Uso existente | FS × FL |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Bovinos | BOV_LEITE | 432.454 | 216.227 | 214.858 | 64.936 | × 0,50 | × 1,00 | × 0,99 | × 0,30 |
| Bovinos | BOV_CONFINADO | 251.985 | 163.790 | 163.572 | 152.284 | × 0,65 | × 1,00 | × 1,00 | × 0,93 |
| Bovinos | BOV_PASTO_MISTO | 3.772.448 | 0 | 0 | 0 | × 0,00 | — | — | — |
| Aves | AVES_CORTE | 892.984 | 801.529 | 756.465 | 698.936 | × 0,90 | × 0,95 | × 0,99 | × 0,92 |
| Aves | AVES_POSTURA | 364.577 | 327.062 | 310.400 | 287.337 | × 0,90 | × 0,95 | × 1,00 | × 0,93 |

## Por região intermediária

N4 ÷ Atlas Real em cada região. Se o fator é parecido em todas, a diferença vem de parâmetro; se varia, vem da base municipal, do uso existente ou da logística.

| Região | Vinhaça | Torta de filtro | Bovinos | Suínos | Aves | Esgoto | RSU orgânico |
|---|---:|---:|---:|---:|---:|---:|---:|
| Araraquara | 0,37 | 0,75 | 0,19 | 0,78 | 3,95 | 0,68 | 0,76 |
| Araçatuba | 0,64 | 0,86 | 0,04 | 0,47 | 4,61 | 0,20 | 0,79 |
| Bauru | 0,71 | 1,04 | 0,03 | 0,68 | 3,51 | 0,12 | 0,77 |
| Campinas | 0,56 | 1,12 | 0,06 | 0,78 | 4,12 | 0,47 | 0,78 |
| Marília | 0,63 | 1,15 | 0,03 | 1,33 | 4,49 | 0,10 | 0,74 |
| Presidente Prudente | 0,69 | 0,87 | 0,02 | 0,20 | 3,75 | 0,22 | 0,69 |
| Ribeirão Preto | 0,75 | 1,03 | 0,29 | 0,52 | 3,62 | 0,50 | 0,31 |
| Sorocaba | 0,75 | 1,29 | 0,06 | 0,80 | 4,11 | 0,32 | 0,69 |
| São José do Rio Preto | 0,78 | 0,99 | 0,12 | 0,47 | 4,12 | 0,43 | 0,73 |
| São José dos Campos | 0,00 | 0,00 | 0,02 | 0,89 | 3,96 | 0,43 | 0,12 |
| São Paulo | 0,00 | 0,00 | 0,02 | 0,60 | 4,02 | 0,89 | 0,20 |

## Para explicar

Diferença acima de 20 %: Vinhaça, Bovinos, Suínos, Aves, Esgoto, RSU orgânico.

A causa provável de cada um está no passo dominante e nos parâmetros abaixo. É uma primeira leitura: confirmar com a equipe do método antes de escrever na plataforma.

## Cadeia do Atlas Real (constantes do `sp_scenarios_real_ideal.py`)

| Fluxo | Cálculo |
|---|---|
| Vinhaça | cana × 0,0478 m³ de etanol/t × 114 m³ de biogás/m³ de etanol × CH₄ 0,5 |
| Torta de filtro | cana × 35 kg/t × SV 20 % × BMP 280 NmL CH₄/g SV |
| Bovinos | todas as cabeças × 8 kg/dia coletável × SV 19,5 % × BMP 200 NmL CH₄/g SV |
| Suínos | todas as cabeças × 6 kg/dia coletável × SV 2,4 % × BMP 245 NmL CH₄/g SV |
| Aves | todas as cabeças × 0,025 kg/dia coletável × SV 17,5 % × BMP 280 NmL CH₄/g SV |
| Esgoto | população × 0,12 m³/hab/dia × coleta 0,905 × DQO 449,7 g/m³ × remoção 0,755 × 0,1115 Nm³ CH₄/kg DQO removida (fase líquida, não o lodo) |
| RSU orgânico | população × per capita do Atlas por faixa × coleta 0,9962 × fração orgânica 0,4646 × 101,5 Nm³ de biogás/t × CH₄ 0,55 |

## Parâmetros do CP2b (snapshot, cenário med com min e max)

| Substrato | Elemento | min | med | max | Unidade | Status | Fonte |
|---|---|---:|---:|---:|---|---|---|
| TORTA_FILTRO | g | 0.03 | 0.035 | 0.04 | t úmida / t cana moída | cp2b | Atlas SP 2020 p.66; real_rpr |
| TORTA_FILTRO | ST | 0.28 | 0.38 | 0.48 | fração | cp2b | feedstocks.yaml |
| TORTA_FILTRO | SV | 0.68 | 0.8 | 0.9 | fração de ST | cp2b | feedstocks.yaml |
| TORTA_FILTRO | BMP | 200.0 | 280.0 | 380.0 | Nm³ CH4 / t SV | cp2b | feedstocks.yaml |
| TORTA_FILTRO | FC | 0.85 | 0.9 | 0.95 | fração | cp2b | cp2b |
| TORTA_FILTRO | FCo | 0.9 | 1.0 | 1.0 | fração | cp2b | cp2b |
| TORTA_FILTRO | FS | 0.85 | 0.9 | 0.95 | fração | cp2b | cp2b |
| TORTA_FILTRO | FL | 0.78 | 0.85 | 0.92 | fração | cp2b | espacial (codig_alocado), por município: fl_espacial/outputs/fl_v5_municipio_substrato.csv; valores mostrados = feedstocks.yaml (referência v4) |
| TORTA_FILTRO | u (usos excludentes) / notas |  |  |  | texto | cp2b | Adubo é compatível com digestão (DBFZ). |
| VINHACA | direto | 57.0 | 65.55 | 74.1 | Nm³ CH4 / m³ etanol | cp2b | cp2b |
| VINHACA | FC | 0.9 | 0.95 | 0.98 | fração | cp2b | cp2b |
| VINHACA | FCo | 0.9 | 1.0 | 1.0 | fração | cp2b | cp2b |
| VINHACA | FS | 0.85 | 0.92 | 0.98 | fração | cp2b | cp2b |
| VINHACA | FL | 0.88 | 0.9 | 0.92 | fração | cp2b | espacial (codig_alocado), por município: fl_espacial/outputs/fl_v5_municipio_substrato.csv; valores mostrados = feedstocks.yaml (referência v4) |
| VINHACA | u (usos excludentes) / notas |  |  |  | texto | cp2b | Fertirrigação é compatível. |
| BOV_LEITE | g | 3.65 | 5.109999999999999 | 6.57 | t / vaca / ano (10–18 kg/dia) | provisorio | Embrapa Pecuária Sudeste via feedstocks.yaml (leite 10–18 kg/cab/dia) |
| BOV_LEITE | ST | 0.15 | 0.25 | 0.35000000000000003 | fração | provisorio | feedstocks.yaml |
| BOV_LEITE | SV | 0.68 | 0.78 | 0.85 | fração de ST | provisorio | feedstocks.yaml |
| BOV_LEITE | BMP | 120.0 | 200.0 | 270.0 | Nm³ CH4 / t SV | provisorio | feedstocks.yaml |
| BOV_LEITE | FC | 0.4 | 0.5 | 0.75 | fração | provisorio | cp2b |
| BOV_LEITE | FCo | 0.9 | 1.0 | 1.0 | fração | provisorio | cp2b |
| BOV_LEITE | FS | 0.95 | 0.98 | 1.0 | fração | provisorio | cp2b |
| BOV_LEITE | FL | 0.6 | 0.68 | 0.76 | fração | provisorio | espacial (codig_alocado), por município: fl_espacial/outputs/fl_v5_municipio_substrato.csv; valores mostrados = feedstocks.yaml (referência v4) |
| BOV_LEITE | u (usos excludentes) / notas |  |  |  | texto | provisorio | Adubo compatível. A = vacas ordenhadas (PPM 94). FC: IEA Task 37 (~40% coletável, Liebetrau 2021); yaml 0,75. |
| BOV_CONFINADO | g | 4.8545 | 7.3 | 9.125 | t / cab / ano (13,3–25 kg/dia) | provisorio | Montoro 2017 (13,33 kg/dia, ST 20,49%, SV 81%, Presidente Prudente); Cenario_Bovinocultura2 (20 kg/dia) |
| BOV_CONFINADO | ST | 0.18 | 0.205 | 0.23 | fração | provisorio | override cp2b: BMP 210–307 (Embrapa 0,21–0,23; Velásquez 2018 0,28; Montoro 2019 0,307) |
| BOV_CONFINADO | SV | 0.78 | 0.81 | 0.84 | fração de ST | provisorio | override cp2b: BMP 210–307 (Embrapa 0,21–0,23; Velásquez 2018 0,28; Montoro 2019 0,307) |
| BOV_CONFINADO | BMP | 210.0 | 260.0 | 307.0 | Nm³ CH4 / t SV | provisorio | override cp2b: BMP 210–307 (Embrapa 0,21–0,23; Velásquez 2018 0,28; Montoro 2019 0,307) |
| BOV_CONFINADO | FC | 0.4 | 0.65 | 0.75 | fração | provisorio | IEA Task 37 (40%); Cenario_Bovinocultura/2 (0,60–0,75; Herrero 2018, Mendes 2023) |
| BOV_CONFINADO | FCo | 0.9 | 1.0 | 1.0 | fração | provisorio | cp2b |
| BOV_CONFINADO | FS | 0.9 | 0.95 | 1.0 | fração | provisorio | cp2b |
| BOV_CONFINADO | FL | 0.52 | 0.65 | 0.85 | fração | provisorio | espacial (codig_alocado), por município: fl_espacial/outputs/fl_v5_municipio_substrato.csv; valores mostrados = feedstocks.yaml (referência v4) |
| BOV_CONFINADO | u (usos excludentes) / notas |  |  |  | texto | provisorio | Adubo compatível. A = estoque confinado GEDAVE. Nota: a consistência das fezes em confinamento varia com a dieta (teor de fibra fisicamente efetiva; Contadini 2 |
| BOV_PASTO_MISTO | g | 2.92 | 3.65 | 5.11 | t / cab / ano | cp2b | cp2b |
| BOV_PASTO_MISTO | ST | 0.15 | 0.25 | 0.35000000000000003 | fração | cp2b | feedstocks.yaml |
| BOV_PASTO_MISTO | SV | 0.68 | 0.78 | 0.85 | fração de ST | cp2b | feedstocks.yaml |
| BOV_PASTO_MISTO | BMP | 120.0 | 200.0 | 270.0 | Nm³ CH4 / t SV | cp2b | feedstocks.yaml |
| BOV_PASTO_MISTO | FC | 0.0 | 0.0 | 0.1 | fração | cp2b | cp2b |
| BOV_PASTO_MISTO | FCo | 0.9 | 1.0 | 1.0 | fração | cp2b | cp2b |
| BOV_PASTO_MISTO | FS | 0.95 | 0.98 | 1.0 | fração | cp2b | cp2b |
| BOV_PASTO_MISTO | FL | 0.52 | 0.65 | 0.85 | fração | cp2b | feedstocks.yaml |
| BOV_PASTO_MISTO | u (usos excludentes) / notas |  |  |  | texto | cp2b | Pasto e sistema misto: esterco de pastejo não recolhível (DBFZ/IEA). Máx. 10% para curral em sistema misto (Guerini Filho 2019: 20% em extensivo). |
| SUINOS | g | 0.73 | 1.28 | 2.0 | t / cab / ano | provisorio | cp2b |
| SUINOS | ST | 0.08 | 0.1 | 0.12 | fração | provisorio | override cp2b: ST 8–12% (excreta fresca; yaml 3% é chorume diluído) |
| SUINOS | SV | 0.7000000000000001 | 0.8 | 0.85 | fração de ST | provisorio | feedstocks.yaml |
| SUINOS | BMP | 150.0 | 245.0 | 300.0 | Nm³ CH4 / t SV | provisorio | feedstocks.yaml |
| SUINOS | FC | 0.7 | 0.85 | 0.95 | fração | provisorio | cp2b |
| SUINOS | FCo | 0.9 | 1.0 | 1.0 | fração | provisorio | cp2b |
| SUINOS | FS | 0.9 | 0.95 | 1.0 | fração | provisorio | cp2b |
| SUINOS | FL | 0.55 | 0.72 | 0.88 | fração | provisorio | espacial (codig_alocado), por município: fl_espacial/outputs/fl_v5_municipio_substrato.csv; valores mostrados = feedstocks.yaml (referência v4) |
| SUINOS | u (usos excludentes) / notas |  |  |  | texto | provisorio | Adubo compatível. FC reduzido: mediana paulista 33 cab/granja; 0,90–0,95 só para coleta ≤ 7 d (Kunz 2009). |
| AVES_CORTE | g | 0.035 | 0.045 | 0.06 | t cama / ave alojada / ano | cp2b | cp2b |
| AVES_CORTE | ST | 0.2125 | 0.25 | 0.28750000000000003 | fração | cp2b | feedstocks.yaml |
| AVES_CORTE | SV | 0.6282 | 0.698 | 0.7678 | fração de ST | cp2b | feedstocks.yaml |
| AVES_CORTE | BMP | 200.0 | 280.0 | 360.0 | Nm³ CH4 / t SV | cp2b | feedstocks.yaml |
| AVES_CORTE | FC |  |  |  | municipal | cp2b | GEDAVE: fração comercial da capacidade × 0,90 |
| AVES_CORTE | FCo | 0.85 | 0.95 | 1.0 | fração | cp2b | cp2b |
| AVES_CORTE | FS | 0.9 | 0.95 | 0.98 | fração | cp2b | cp2b |
| AVES_CORTE | FL | 0.65 | 0.75 | 0.85 | fração | cp2b | espacial (codig_alocado), por município: fl_espacial/outputs/fl_v5_municipio_substrato.csv; valores mostrados = feedstocks.yaml (referência v4) |
| AVES_CORTE | u (usos excludentes) / notas |  |  |  | texto | cp2b | Adubo compatível. A = galináceos − galinhas (PPM). |
| AVES_POSTURA | g | 0.04 | 0.05 | 0.055 | t dejeto fresco / galinha / ano (~0,15 kg/dia) | provisorio | Planilha Resíduo_Disponível (0,15 kg/ave/dia postura) |
| AVES_POSTURA | ST | 0.2 | 0.25 | 0.3 | fração | provisorio | override cp2b: ST 20–30% (dejeto fresco) |
| AVES_POSTURA | SV | 0.65 | 0.75 | 0.86 | fração de ST | provisorio | feedstocks.yaml |
| AVES_POSTURA | BMP | 150.0 | 250.0 | 340.0 | Nm³ CH4 / t SV | provisorio | feedstocks.yaml |
| AVES_POSTURA | FC |  |  |  | municipal | provisorio | cp2b |
| AVES_POSTURA | FCo | 0.85 | 0.95 | 1.0 | fração | provisorio | cp2b |
| AVES_POSTURA | FS | 0.9 | 0.95 | 0.98 | fração | provisorio | cp2b |
| AVES_POSTURA | FL | 0.62 | 0.7 | 0.78 | fração | provisorio | espacial (codig_alocado), por município: fl_espacial/outputs/fl_v5_municipio_substrato.csv; valores mostrados = feedstocks.yaml (referência v4) |
| AVES_POSTURA | u (usos excludentes) / notas |  |  |  | texto | provisorio | Adubo compatível. A = galinhas (PPM). |
| RSU_ORGANICO | g | 0.46 | 0.5 | 0.55 | fração orgânica do RSU coletado | provisorio | Atlas SP 2020 Eq. V.5 (0,4646); feedstocks.yaml (0,50–0,55) |
| RSU_ORGANICO | ST | 0.26 | 0.3058 | 0.3517 | fração | provisorio | feedstocks.yaml |
| RSU_ORGANICO | SV | 0.738 | 0.8200000000000001 | 0.902 | fração de ST | provisorio | feedstocks.yaml |
| RSU_ORGANICO | BMP | 170.0 | 270.0 | 360.0 | Nm³ CH4 / t SV | provisorio | feedstocks.yaml |
| RSU_ORGANICO | FC | 0.5 | 0.65 | 0.8 | fração | provisorio | cp2b |
| RSU_ORGANICO | FCo | 1.0 | 1.0 | 1.0 | fração | provisorio | cp2b |
| RSU_ORGANICO | FS | 0.98 | 1.0 | 1.0 | fração | provisorio | cp2b |
| RSU_ORGANICO | FL | 0.7 | 0.82 | 0.9 | fração | provisorio | espacial (codig_alocado), por município: fl_espacial/outputs/fl_v5_municipio_substrato.csv; valores mostrados = feedstocks.yaml (referência v4) |
| RSU_ORGANICO | u (usos excludentes) / notas |  |  |  | texto | provisorio | A = massa coletada SNIS 2022 (RDO+RPU). FC = separabilidade do orgânico em resíduo misturado (triagem mecânica; sem fonte primária — provisório). Aterro com cap |
| LODO_ETE | g | 0.037 | 0.073 | 0.122 | t úmida / hab / ano (ST 15%) | cp2b | cp2b |
| LODO_ETE | ST | 0.15 | 0.15 | 0.15 | fração | cp2b | override cp2b:  |
| LODO_ETE | SV | 0.55 | 0.68 | 0.8 | fração de ST | cp2b | feedstocks.yaml |
| LODO_ETE | BMP | 190.0 | 310.0 | 440.0 | Nm³ CH4 / t SV | cp2b | feedstocks.yaml |
| LODO_ETE | FC |  |  |  | municipal | cp2b | cp2b |
| LODO_ETE | FCo | 1.0 | 1.0 | 1.0 | fração | cp2b | cp2b |
| LODO_ETE | FS | 0.98 | 1.0 | 1.0 | fração | cp2b | cp2b |
| LODO_ETE | FL | 0.82 | 0.9 | 0.95 | fração | cp2b | espacial (codig_alocado), por município: fl_espacial/outputs/fl_v5_municipio_substrato.csv; valores mostrados = feedstocks.yaml (referência v4) |
| LODO_ETE | u (usos excludentes) / notas |  |  |  | texto | cp2b | FC = atendimento (IN056) × tratamento (IN016) × fração de ETEs compatíveis com digestão (não-lagoa; ANA/Atlas Esgotos 2019). Metagás subtraída no N3. |
