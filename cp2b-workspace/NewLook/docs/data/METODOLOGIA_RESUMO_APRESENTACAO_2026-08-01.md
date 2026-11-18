# PILAR-2b — Metodologia em uma leitura

**Potencial de biogás e biometano do Estado de São Paulo · 645 municípios**
NIPE/UNICAMP · FAPESP 2024/01112-1 · versão de 2026-08-01

> Resumo autocontido para apresentação. O detalhamento com justificativa e fonte
> de cada escolha está em `METODOLOGIA_CENARIOS_SP_2026-07-30.md`; a
> reconciliação numérica, em `VALIDACAO_CADEIA_NUMERICA_2026-08-01.md`.

---

## 1. Os números

| | Cenário Real | Cenário Ideal |
|---|---:|---:|
| **CH₄ / biometano** | **7,832 bi Nm³/ano** | 9,841 bi Nm³/ano |
| | **21,46 mi Nm³/dia** | 26,96 mi Nm³/dia |
| Biogás bruto | 12,531 bi Nm³/ano | 15,746 bi Nm³/ano |
| Energia elétrica | 29.584 GWh/ano | 37.172 GWh/ano |
| Fração do teórico | 39,36 % | 49,45 % |

Potencial teórico: **19,901 bi Nm³ CH₄/ano** (54,52 mi/dia).

**Os volumes são metano, não biogás.** Toda a cadeia produz CH₄ diretamente
(`massa × BMP × VS%`, BMP em NmL CH₄/gVS). O fator energético embutido dá
9,97 kWh/m³ — o PCI do metano, não o do biogás (~6 kWh/m³). Na comparação com a
literatura, o valor pertence à coluna **biometano**.

---

## 2. O enquadramento: dois cenários, do Atlas

Adotamos o par de cenários do *Atlas de Bioenergia do Estado de São Paulo*
(COELHO et al., 2020) — e seu vocabulário — para que o resultado seja lido
contra a referência estadual nos termos dela.

| | Definição | Natureza |
|---|---|---|
| **Real** | o resíduo que chega a um digestor hoje: coleta e usos concorrentes reais | mobilizável |
| **Ideal** | 100 % do que é **gerado** é coletado e tratado (p.92, pp.115–116) | infraestrutura |

**O Ideal é hipótese de coleta, não de química.** BMP, TS, VS e teor de CH₄ são
**idênticos** nos dois cenários; só coleta e mobilização mudam. Isso o torna uma
fronteira auditável em vez de uma inflação de coeficientes.

---

## 3. As quatro decisões que definem o resultado

**1 · Bagaço excluído.** Atlas p.65 separa resíduos "já aproveitados para geração
de energia (como o bagaço de cana)" dos que "ainda não" (torta, vinhaça, palha).
O bagaço é queimado em caldeiras das usinas; contabilizá-lo duplicaria energia
que o setor já recupera. **É exclusão de escopo, não FDE zero** — e é a escolha
que mais afasta o PILAR-2b dos estudos comparados.

**2 · Vinhaça adicionada.** Estava ausente do inventário. Rota direta do Atlas
(p.67): 114 m³ de biogás por m³ de etanol, 50–65 % CH₄, sem necessidade de
BMP/VS. **A fertirrigação não é uso concorrente:** a digestão é sequencial, o
digestato conserva K/N/P e volta ao campo com menor DBO e odor. O desconto por
uso concorrente não se aplica.

**3 · Palha na fração do Atlas.** p.65 adota "apenas 40 % da palha disponível (em
termos conservadores)", porque 50–60 % deve permanecer para proteção do solo. O
Real usa 40 %; o Ideal, 50 % — o limite superior do que pode ser removido
mantendo a cobertura exigida.

**4 · Suínos reconstruídos por massa.** O fator de 380 m³ CH₄/cabeça/ano só é
fisicamente significativo **por matriz**, mas era aplicado ao rebanho total
(1.591.238 cabeças contra 163.706 matrizes — multiplicador de 9,7×). Refeito a
partir de massa: rebanho × esterco coletável × BMP × VS.

---

## 4. Por que rejeitamos o FDE do banco

O fator de disponibilidade multiplicativo da plataforma
(`FDE = FC × FCo × FS × FL`) atribui **4,7 % ao milho e 0,8 % à soja** — a mesma
sobre-penalização já corrigida na cana, em que um **uso concorrente foi lançado
como perda total**. Um resíduo com destino alternativo não deixa de existir.

No lugar dele, a lógica agronômica do Atlas: resíduos de campo retêm 40 %/50 %
porque uma fração precisa ficar no solo; resíduos de processamento retêm
70 %/85 % porque chegam concentrados na indústria e a coleta não é a restrição
ativa.

**A diferença é resultado, não ruído — e é publicada como tal:**

| Etapa | bi Nm³/ano | Fração do teórico |
|---|---:|---:|
| Teórico | 19,901 | 1,0000 |
| após FC (coleta) | 15,338 | 0,7707 |
| após FCo (uso concorrente) | 4,447 | 0,2235 |
| após FS (sazonalidade) | 4,024 | 0,2022 |
| após FL (logística) → **mobilizável FDE** | 3,301 | 0,1659 |
| **Cenário Real (Atlas)** | **7,832** | **0,3936** |
| **Cenário Ideal (Atlas)** | **9,841** | **0,4945** |

As duas últimas linhas **substituem** a cascata, não a continuam. A razão de
**2,37×** entre 3,301 e 7,832 é o efeito medido da rejeição do FDE. Publicamos a
cascata junto do resultado porque, sem ela, o leitor não teria como saber que um
FDE alternativo, presente no mesmo repositório, daria 3,301.

---

## 5. Composição do Cenário Real

| Resíduo | % | | Resíduo | % |
|---|---:|---|---|---:|
| Cana (vinhaça + torta + palha) | 57,0 | | Citros | 2,5 |
| Bovinos | 15,7 | | Aves | 1,1 |
| Milho | 7,0 | | Café | 0,9 |
| Soja | 6,2 | | Esgoto (ETE) | 0,9 |
| RSU (FORSU) | 5,1 | | Poda urbana | 0,3 |
| Silvicultura | 3,1 | | Suínos | 0,3 |
| | | | Aquicultura | 0,0 |

Fluxos incorporados nesta versão e ausentes das anteriores: **vinhaça,
silvicultura, esgoto sanitário, poda urbana, aquicultura**.

---

## 6. Proveniência dos dados

```
IBGE PAM 2023 (área E produção) + IBGE PPM (rebanho)
  + SNIS 2022 (RDO) + Censo IBGE 2022 (população)
        ▼
  SP_master_residue_streams_2023_FINAL.csv   (645 municípios, 58 colunas)
        ▼
  sp_scenarios_real_ideal.py  →  Cenário Real / Ideal
```

**Não há leitura de raster MapBiomas em nenhum elo do inventário.** Área e
produção vêm **ambas do PAM, na mesma linha** do master; as colunas são
nomenclatura literal PAM/SIDRA (`area_ha_Milho_em_grão`, `prod_t_Soja_em_grão`).
O MapBiomas entra na plataforma em três funções de **interface** que não tocam o
potencial: servidor de tiles, análise de buffer por raio, e as camadas de
infraestrutura (usinas, gasodutos, subestações).

**Ano-base é misto e deve ser declarado como tal:** produção agrícola **2023**;
população e saneamento **2022**. Não há regra de projeção populacional para anos
posteriores a 2022 — é constante fixa.

---

## 7. Posicionamento na literatura (biometano, mi Nm³/dia)

| | |
|---|---:|
| GEF Biogás Brasil 2023 | 42,5 |
| ABiogás 2020 | 36,4 |
| **PILAR-2b — Ideal (fronteira)** | **27,0** |
| Coelho et al. IEE-USP 2020 | 23,6 |
| **PILAR-2b — Real (curto prazo)** | **21,5** |
| SEMIL/SP 2023 | 9,8 |
| Instituto 17 / BEP-UK 2021 | 8,2 |
| Capacidade instalada ANP 2024 | 0,4 |

O Real fica **entre** a estimativa do IEE-USP e as projeções setoriais — que
incluem bagaço. O Ideal permanece **abaixo** de ABiogás e GEF, apesar de ser uma
fronteira: consequência direta da exclusão do bagaço.

---

## 8. Reprodutibilidade

Um comando, sem banco de dados, stdlib pura:

```bash
python backend/scripts/sp_scenarios_real_ideal.py --master data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv
```

**Portão de aceitação: `7.832.143.834 Nm³ CH₄/ano`.** Reconciliado em 2026-08-01
em três pontos independentes — motor sem banco, carga por município e soma SQL
sobre os 645 municípios — com valor idêntico nos três.

---

## 9. Limitações que declaramos

1. A fração recolhível de 0,40/0,50 para milho, soja e silvicultura é **analogia**
   com a palha de cana, não medição por cultura. **É a hipótese de maior
   alavancagem sobre o resultado.**
2. As frações de processamento (0,70/0,85) para citros e café são julgamento dos
   autores, sem fonte primária dedicada.
3. Esterco coletável representa faixas de sistemas de manejo, não medição
   municipal.
4. Eficiência elétrica de 0,38 é média entre as duas faixas de vazão do Atlas.
5. O biometano **não desconta perdas de *upgrading*** (1–3 % de *slip*): é limite
   superior.
6. Ano-base misto (§6); os parâmetros do Atlas derivam de base 2017, enquanto a
   moagem de cana cresceu ~32 % até 2023 — acompanhada por usarmos a produção
   2023.
7. A **concentração espacial** (Gini, limiar de 67 %, Top-5 de regiões
   intermediárias) **ainda não foi recomputada** sob este método. Os valores em
   circulação são anteriores a 30/07 e **não devem ser apresentados** até o
   recálculo.
