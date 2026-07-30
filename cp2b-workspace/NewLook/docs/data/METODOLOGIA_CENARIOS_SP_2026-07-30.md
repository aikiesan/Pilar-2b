# Metodologia — Potencial de Biogás e Biometano do Estado de São Paulo

**Plataforma:** PILAR-2b (NIPE/UNICAMP · FAPESP 2024/01112-1)
**Data:** 30 de julho de 2026
**Escopo:** 645 municípios do Estado de São Paulo
**Ano-base dos dados primários:** 2023 (IBGE PAM/PPM; SNIS/CETESB; Censo 2022)

> Este documento registra **todas as escolhas metodológicas** adotadas no
> recálculo do potencial de São Paulo, com a justificativa e a referência de cada
> uma. Destina-se a alimentar o manuscrito e a auditoria científica.

---

## 1. Enquadramento: dois níveis de potencial

Adotamos o enquadramento de **dois cenários** do *Atlas de Bioenergia do Estado
de São Paulo* (COELHO et al., 2020), incluindo sua terminologia, para que os
resultados sejam diretamente comparáveis à referência estadual.

| Cenário | Definição | Natureza |
|---|---|---|
| **Real** (curto prazo) | Resíduo que efetivamente chega a um digestor hoje: taxas de coleta e usos concorrentes atuais | Mobilizável |
| **Ideal** (fronteira) | 100% do resíduo **gerado** é coletado e tratado | Infraestrutura |

**Ponto crítico:** o Cenário Ideal do Atlas (p.92 e pp.115–116) é uma hipótese de
**infraestrutura de coleta**, não de química. Todos os parâmetros
físico-químicos — BMP, TS, VS, teor de CH₄ — são **idênticos** nos dois cenários.
Apenas as taxas de coleta e mobilização mudam. Isso torna o Cenário Ideal uma
fronteira auditável, e não uma inflação de coeficientes.

---

## 2. Base volumétrica: os volumes são METANO, não biogás

Toda a cadeia de cálculo produz **CH₄**, não biogás:

```
volume = massa_úmida × BMP × VS%
```

com BMP expresso em **NmL CH₄/gVS**. Não há divisão CH₄→biogás em nenhum ponto.

**Confirmação independente:** o fator energético embutido resulta em
**9,97 kWh por m³** do volume armazenado, que é o PCI do **metano** (9,94 kWh/Nm³,
BUENO et al., 2016) e não o do biogás (~6 kWh/m³ a 60% CH₄).

**Consequência para a comparação com a literatura:** o valor da plataforma
pertence à coluna **biometano** das tabelas comparativas, não à de biogás. O
biogás bruto é derivado por:

```
biogás = CH₄ / 0,625
```

adotando a convenção da FIESP (2025): *"1 Nm³ de biogás equivale a cerca de
0,625 Nm³ de biometano"*.

---

## 3. Correções aplicadas

### 3.1 Bagaço de cana — EXCLUÍDO

**Referência:** Atlas, p.65 — resíduos *"já aproveitados para geração de energia
(como o bagaço de cana)"* versus os *"ainda não (torta de filtro, vinhaça e
palha de cana)"*.

**Justificativa:** o bagaço é queimado nas caldeiras das usinas para cogeração.
Contabilizá-lo como disponível duplicaria energia que o setor já recupera.

**Erro corrigido:** o *pipeline* usava `BAGACO` como resíduo representativo de
toda a cana, aplicando seu fator de uso concorrente (FCo = 0,18) a **62% do
potencial total do estado**.

### 3.2 Vinhaça — ADICIONADA

**Referência:** Atlas, p.67 — *"114 m³ de biogás por m³ de etanol com
concentrações de 50% a 65% de metano"*.

**Justificativa científica para alta disponibilidade:** a fertirrigação **não é
uso concorrente**. A digestão anaeróbia é **sequencial**: o digestato conserva
K/N/P e segue para o campo, com DBO e odor reduzidos. Descontar a vinhaça por
fertirrigação contabiliza um fluxo de passagem como perda total.

**Evidência de ausência:** a massa de cana servida (247,2 Mt) corresponde a
**56,3%** da produção (439,1 Mt), compatível com bagaço + palha + torta + pontas
e pequena demais para conter vinhaça.

**Vantagem da rota do Atlas:** dispensa BMP e VS — parte diretamente do volume
de etanol, eliminando duas fontes de incerteza.

### 3.3 Palha de cana — fração recolhível do Atlas

**Referência:** Atlas, p.65 — *"foi adotado o emprego de apenas 40% da palha
disponível (em termos conservadores)"*.

**Justificativa:** 50–60% deve permanecer no campo para proteção do solo e
manutenção da umidade; o custo de recolhimento (R$ 65,00/t, CARDOSO, 2019b) o
inviabiliza economicamente em boa parte das usinas.

| | Real | Ideal |
|---|---:|---:|
| Fração recolhível | 0,40 | 0,50 |

### 3.4 Suínos — fator reconstruído por massa

**Erro identificado:** o fator de **380 m³ CH₄/cabeça/ano** era aplicado ao
**rebanho total** (1.591.238 cabeças), mas só é fisicamente plausível por
**matriz**. São Paulo tem **163.706 matrizes** — um multiplicador de **9,7×**.

**Verificação zootécnica independente:** a massa implícita resultava em
**177,1 kg de esterco/cabeça/dia**, entre 15× e 44× acima do que um suíno produz.

**Correção:** reconstrução por massa — `rebanho × esterco coletável × BMP × VS`.

| | Real | Ideal |
|---|---:|---:|
| Esterco coletável (kg/cabeça/dia) | 6,0 | 9,0 |

### 3.5 RSU — metodologia do Atlas

**Erro identificado:** a massa de fração orgânica implícita (16,63 Mt/ano)
**excedia todo o RSU gerado em São Paulo** (15,65 Mt/ano) — impossibilidade
física, independente de qual BMP se prefira.

**Correção — Atlas, Eq. V.5–V.6:**

```
MO_RSU   = RSU_coletado × 0,4646          (EMAE/PROEMA, 2011; GBio/IEE/USP, 2013)
V_biogás = MO_RSU × 101,5 Nm³/t           (ACHINAS et al., 2017)
CH₄      = V_biogás × 0,55                (ACHINAS et al., 2017)
```

Geração *per capita* por faixa populacional (SMA, 2017 — Atlas Tabela V.2):

| População urbana | kg/hab/dia |
|---|---:|
| até 25.000 | 0,7 |
| 25.001–100.000 | 0,8 |
| 100.001–500.000 | 0,9 |
| acima de 500.000 | 1,1 |

### 3.6 Esgoto sanitário — fluxo NOVO

Ausente do *pipeline*, embora `LODO_PRIMARIO` e `LODO_SECUNDARIO` já
carregassem 27 e 25 referências no banco.

**Atlas, Eq. VI.1:**

```
CH₄ = EC × DQO_média × P_CH₄ × Ef_rem
```

| Parâmetro | Valor | Fonte |
|---|---:|---|
| DQO média | 449,7 g/m³ | SILVA (2015) |
| P_CH₄ | 0,1115 Nm³ CH₄/kg DQO removida | Atlas Eq. VI.1 |
| Ef. remoção | 0,755 | SABESP (2018) |

### 3.7 Demais resíduos — lógica de retenção de solo

Milho, soja, citros, café, silvicultura, poda urbana e aquicultura eram servidos
como volumes **teóricos**, sem termo de disponibilidade.

**Decisão:** aplicar a mesma lógica agronômica que o Atlas usa para a palha de
cana, **e não o FDE armazenado no banco** (milho 4,7%; soja 0,8%), que sofre a
mesma sobre-penalização já corrigida para a cana — um uso concorrente lançado
como perda total.

| Classe | Fluxos | Real | Ideal | Racional |
|---|---|---:|---:|---|
| Resíduo de campo | milho, soja, silvicultura | 0,40 | 0,50 | Retenção de solo (analogia Atlas p.65) |
| Resíduo de processamento | citros, café | 0,70 | 0,85 | Já concentrado na indústria |
| Resíduo urbano coletado | poda | 0,80 | 0,95 | Coleta municipal já existente |

---

## 4. Parâmetros de conversão

| Parâmetro | Valor | Fonte |
|---|---:|---|
| Fração CH₄ do biogás | 0,625 | FIESP (2025) |
| PCI do CH₄ | 9,94 kWh/Nm³ | BUENO et al. (2016) |
| Eficiência elétrica | 0,38 | ABIOGAS (2018), média entre 0,35 (≤5.000 Nm³/dia) e 0,42 |
| Dias/ano | 365 | Convenção das tabelas comparativas de SP |

> A procedência completa está gravada na tabela `scenario_parameters` do banco
> (16 registros), consultável por SQL, com coluna de justificativa e página.

---

## 5. Resultados

### 5.1 Totais do Estado

| Grandeza | **Cenário Real** | **Cenário Ideal** |
|---|---:|---:|
| Metano / Biometano (Nm³/ano) | **7.832.143.834** | **9.841.178.207** |
| Metano / Biometano (Nm³/dia) | **21.457.928** | **26.962.132** |
| Biogás bruto (Nm³/ano) | 12.531.430.135 | 15.745.885.131 |
| Biogás bruto (Nm³/dia) | 34.332.685 | 43.139.411 |
| Energia térmica (GWh/ano) | 77.852 | 97.821 |
| Energia elétrica (GWh/ano) | 29.584 | 37.172 |

### 5.2 Por setor (Nm³ CH₄/ano)

| Setor | Real | Ideal |
|---|---:|---:|
| Agropecuária | 5,768 bi | 7,045 bi |
| Pecuária | 1,335 bi | 1,994 bi |
| Urbano | 0,489 bi | 0,502 bi |
| Silvicultura | 0,240 bi | 0,300 bi |

### 5.3 Posicionamento na literatura (biometano, Nm³/dia)

| Estudo | mi Nm³/dia | bi Nm³/ano |
|---|---:|---:|
| GEF Biogás Brasil (2023) | 42,5 | 15,50 |
| ABiogás (2020) | 36,4 | 13,30 |
| **PILAR-2b — Cenário Ideal** | **27,0** | **9,84** |
| Coelho et al. / IEE-USP (2020) | 23,6 | 8,60 |
| **PILAR-2b — Cenário Real** | **21,5** | **7,83** |
| SEMIL/SP (2023) | 9,8 | 3,60 |
| Instituto 17 / BEP-UK (2021) | 8,2 | 3,00 |
| *Capacidade instalada ou em instalação (ANP, 2024)* | *0,4* | *0,14* |

Os dois cenários **enquadram** o resultado de Coelho et al. (2020) — o Real
abaixo, o Ideal acima —, o que é coerente: aquele estudo adota cenário ideal para
esgoto mas escopo de substratos mais restrito.

O Cenário Real corresponde a **~54×** a capacidade de biometano instalada ou em
instalação no Estado (ANP, 2024).

---

## 6. Limitações declaradas

1. **Fração recolhível de resíduos de campo (0,40/0,50)** para milho, soja e
   silvicultura é **analogia** com a palha de cana, não medição específica por
   cultura. É a hipótese de maior alavancagem sobre o resultado.
2. **Frações de processamento (0,70/0,85)** para citros e café são julgamento
   dos autores, sem fonte primária dedicada.
3. **Esterco coletável** (6–9 kg/cab/dia suínos; 8–12 bovinos) representa faixas
   de sistemas de manejo, não medição por município.
4. **Eficiência elétrica de 0,38** é média entre as duas faixas de vazão do
   Atlas; plantas específicas devem usar 0,35 ou 0,42.
5. **Biometano não desconta perdas de *upgrading*** (1–3% de *slip* de CH₄ em
   plantas reais) — é limite superior.
6. **Ano-base misto:** dados primários 2023; parâmetros do Atlas derivados de
   base 2017. A população de SP variou pouco no período, mas a moagem de cana
   cresceu ~32%, o que o cálculo acompanha por usar a produção 2023.
7. **Duplicação de códigos na tabela `residuos`** (~27 substratos em dois esquemas
   de codificação) permanece **não resolvida**; não afeta estes resultados, que
   não derivam daquela tabela, mas afeta o explorador de parâmetros.

---

## 7. Reprodutibilidade

| Artefato | Caminho |
|---|---|
| Motor de cenários (estado) | `backend/scripts/sp_scenarios_real_ideal.py` |
| Carga por município | `backend/scripts/load_scenarios_real_ideal.py` |
| Migração de esquema + procedência | `backend/app/migrations/026_scenarios_real_ideal.sql` |
| Validação contra o Atlas (RSU) | `backend/scripts/validate_rsu_against_atlas.py` |
| Reconciliação de massa | `backend/scripts/reconcile_biomass_mass.py` |
| Cenários teórico/mobilizável (anterior) | `backend/scripts/sp_theoretical_vs_mobilisable.py` |
| Normalização do corpus de BMP | `backend/scripts/normalize_bmp_corpus.py` |
| Master canônico (fonte primária) | `data/raw/abiove_sp_processed/SP_master_residue_streams_2023_FINAL.csv` |

---

## 8. Referências

- ABIOGAS. *Nota técnica — eficiência de motores ciclo Otto a biogás.* 2018.
- ACHINAS, S. et al. A technological overview of biogas production from biowaste.
  *Engineering*, 2017.
- ANP. *Capacidade instalada de biometano.* 2024.
- BUENO, C. et al. Poder calorífico inferior do metano. 2016.
- CARDOSO, T. F. Custo de recolhimento de palha de cana. 2019b.
- COELHO, S. T. et al. **Atlas de Bioenergia do Estado de São Paulo.** São Paulo:
  IEE/USP, 2020. *(referência metodológica central deste trabalho)*
- EMAE/PROEMA. *Composição gravimétrica de RSU.* 2011.
- FIESP. *Panorama do biogás e biometano — Tabela 1 e Figura 1.* 2025.
- GBio/IEE/USP. *ACV comparativa entre tecnologias de aproveitamento energético
  de resíduos sólidos.* P&D Emae/Aneel 0393-00611, 2013.
- IPCC. *Guidelines for National Greenhouse Gas Inventories*, v.5. 2006.
- INSTITUTO 17. *O Estado de São Paulo e a descarbonização pelo uso do biogás.* 2021.
- LEME, M. M. V. Eficiência de captação de biogás em aterro sanitário. 2010.
- SABESP. *Eficiência de remoção de DQO em ETE.* 2018.
- SEMIL. *Plano Estadual de Energia 2050.* 2023a.
- SILVA, DQO média do esgoto sanitário. 2015.
- SMA. *Plano Estadual de Resíduos Sólidos de São Paulo.* 2017.
