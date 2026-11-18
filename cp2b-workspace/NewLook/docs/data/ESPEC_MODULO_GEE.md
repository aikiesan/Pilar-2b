# Especificação: módulo de emissões evitadas (GEE) do PILAR-2b

> **Status:** proposta, 19/10/2026. Faz parte da estratégia
> [`../planning/ESTRATEGIA_2027_LIDERANCA_BIOECONOMIA.md`](../planning/ESTRATEGIA_2027_LIDERANCA_BIOECONOMIA.md) §3.4.
> Substitui a §6.6 de [`../CALCULATOR_METHODOLOGY.md`](../CALCULATOR_METHODOLOGY.md) quando for implementada.
> **Os valores marcados "conferir" precisam ser lidos na tabela citada antes de virar número oficial.**
> **Implementado em 19/10/2026 (C22):** `data/canonical_parameters/ghg.yaml`, `backend/app/services/ghg_service.py`,
> `/api/v1/ghg/{parameters,estimate,municipalities/{ibge}}`. Diferença deliberada em relação à §5: o metano perdido
> (vazamento, *slip*) não chega ao usuário e por isso **não desloca fóssil**; o módulo credita `BE_fossil` só sobre o
> volume entregue (ver a nota no fim da §5).

---

## 1. O problema no cálculo atual

`frontend/src/app/[locale]/calculator/calculatorEngine.ts:376`:

```ts
const co2TonsYear = ch4M3Year * 0.657 * (44 / 16) / 1000
```

O cálculo tem três problemas.

1. **Conceito.** O valor é o CO₂ liberado ao **queimar** o metano produzido. Esse CO₂ é biogênico e, pelas regras do IPCC e do GHG Protocol, tem emissão líquida zero. Ele não é uma redução.
   - Mesmo assim, `CALCULATOR_METHODOLOGY.md` §6.6 o descreve como "emissões evitadas pela substituição de fósseis".
   - O valor entra na receita de crédito de carbono (`carbonFull = co2TonsYear × co2CreditBrlTon`, linha 475) e, portanto, no payback.
2. **Densidade.** 0,657 kg/m³ é a densidade do CH₄ a 25 °C. Os volumes da plataforma estão em **Nm³** (0 °C, 1 atm), onde a densidade é **0,717 kg/Nm³**. O erro é de cerca de 8 %, menor que o problema 1.
3. **O que falta.** O benefício climático real do biogás tem duas partes, e nenhuma está no cálculo:
   - **(a) metano que deixaria de ser emitido** pelo manejo de linha de base (lagoa, esterqueira, aterro, ETE sem queima);
   - **(b) combustível fóssil deslocado** (diesel, gás natural, eletricidade do grid).

Para dejeto suíno ou bovino em lagoa anaeróbia, a parte (a) sozinha costuma ser **uma ordem de grandeza maior** que o número exibido hoje (§5). O erro atual subestima justamente o principal argumento do biogás.

## 2. Estrutura proposta

Para cada fluxo *s* (substrato) e rota *r* (eletricidade, biometano veicular, biometano na rede, térmico):

```
ER = BE_metano + BE_fossil − PE
```

| Termo | Significado | Fórmula |
|---|---|---|
| `BE_metano` | Metano que a linha de base emitiria | `Σ_s  VS_s × B0_s × MCF_base,s × ρ_CH4 × GWP_CH4` |
| `BE_fossil` | Fóssil deslocado pela energia útil | `E_util,r × EF_fossil,r` |
| `PE` | Emissões do projeto | `PE_vazamento + PE_slip + PE_flare + PE_transporte + PE_eletricidade_propria` |

- `VS_s` é a massa de sólidos voláteis (t/ano), que o motor *forward* já calcula (`biogas_forward.py`).
- `B0_s` é a capacidade máxima de produção de CH₄ (m³ CH₄/kg VS). Para coerência interna, usar o **BMP canônico** do `feedstocks.yaml`, convertido de NmL/gVS para m³/kg VS.
- `MCF_base,s` é o fator de conversão de metano do **sistema de manejo de linha de base**.
- `E_util,r` é a energia útil entregue pela rota: kWh elétricos, ou MJ de biometano no veículo.

### 2.1 Linha de base por substrato

| Substrato | Linha de base padrão (SP) | Fonte do fator | Observação |
|---|---|---|---|
| Dejeto suíno | Lagoa anaeróbia descoberta | IPCC 2019 Refinement, Vol. 4, Cap. 10, Tab. 10.17 (MCF por clima): **conferir** valor para clima quente | É o caso de maior benefício. O usuário da calculadora deve poder escolher o sistema real da granja. |
| Dejeto bovino de leite (confinado) | Esterqueira ou lagoa | Idem | Gado a pasto tem MCF muito baixo; nesse caso o benefício de metano é pequeno e **não deve ser creditado**. |
| Cama de aviário | Disposição sólida ou uso direto no solo | Idem | MCF baixo; o benefício vem do deslocamento de fóssil e do fertilizante. |
| FORSU (RSU) | Aterro sanitário com a captação típica de SP | IPCC 2006/2019 Vol. 5, Cap. 3 (FOD): k, DOC, DOCf, MCF do aterro | Descontar o metano que o aterro **já captura**. Só o restante é evitável. |
| Esgoto (ETE) | Reator anaeróbio sem aproveitamento, ou lagoa | IPCC Vol. 5, Cap. 6, MCF por tipo de tratamento | Se a ETE já queima em flare, `BE_metano` ≈ 0 e sobra só `BE_fossil`. |
| Vinhaça | Fertirrigação in natura | Emissões de N₂O e CH₄ da aplicação (literatura nacional; conferir fatores do inventário nacional) | Linha de base ainda em debate. Começar com **apenas `BE_fossil`** e marcar o resto como pesquisa. |
| Palha, torta, culturas de campo | Deixada no campo | — | Não há metano evitado relevante. Só `BE_fossil`. Não inventar crédito. |

### 2.2 Fatores fósseis (`EF_fossil`)

| Rota | O que é deslocado | Fator padrão | Fonte |
|---|---|---|---|
| Biometano veicular | Diesel (frota pesada) | 74,1 tCO₂/TJ (padrão IPCC 2006 para gas/diesel oil) | IPCC 2006 Vol. 2, Tab. 3.2.1 |
| Biometano na rede ou industrial | Gás natural | 56,1 tCO₂/TJ | IPCC 2006 Vol. 2, Tab. 1.4 |
| Eletricidade | Grid do SIN | Fator **médio anual** publicado pelo MCTI. Para crédito (CDM ou mercado voluntário), usar a **margem combinada** do MCTI. | MCTI, "Fatores de emissão do SIN" |
| Térmico | Lenha, GLP ou óleo combustível, conforme o caso | Padrão IPCC por combustível | IPCC 2006 Vol. 2 |

> O grid brasileiro tem baixo carbono, então **eletricidade é a rota de menor benefício climático**.
> Biometano substituindo diesel é a maior. Essa diferença precisa aparecer na interface, porque
> muda a recomendação de rota.

### 2.3 Emissões do projeto (`PE`)

| Termo | Padrão sugerido | Nota |
|---|---|---|
| Vazamento do biodigestor | Padrão **2,5 %** do CH₄ produzido, faixa 1–4 % | Média medida em 60 plantas na Dinamarca, 2019–2021 (Danish Energy Agency, via gasworld e IEA Bioenergy Task 37). Entra no Monte Carlo |
| Escape no *upgrading* (*methane slip*) | Lavagem com água até cerca de 2 %; aminas cerca de 0,04 %; membranas abaixo de 1 % (Kvist e Aryal 2019, via IWA). Teto regulatório dinamarquês de 1 % desde 2023 | Por tecnologia, escolhida pelo usuário. Hoje é ignorado (`METODOLOGIA_CENARIOS` §limitações) |
| Flare | Eficiência de 90–98 % | Só nas horas sem uso energético |
| Transporte de substrato | km × t × fator diesel por t·km | Vem da superfície de custo logístico (estratégia §3.1) |
| Consumo próprio | Fração da energia gerada | Já é descontado do `E_util` |

Constantes físicas: `ρ_CH4 = 0,717 kg/Nm³` e PCI do CH₄ = 35,8 MJ/Nm³ (= 9,94 kWh/Nm³, o mesmo valor que a plataforma já usa).
`GWP_CH4`: 27,0 (AR6, metano não fóssil) como padrão, com opção de 28 (AR5) para compatibilidade com o inventário nacional. **A versão do GWP precisa aparecer em toda saída.**

## 3. Saídas

Por município × substrato × cenário (Real/Ideal), e por planta na calculadora:

| Campo | Unidade |
|---|---|
| `er_metano_evitado` | tCO₂e/ano |
| `er_fossil_deslocado` | tCO₂e/ano, por rota |
| `pe_total` | tCO₂e/ano |
| `er_liquida` | tCO₂e/ano, com P10/P50/P90 pelo Monte Carlo existente (`analysis/build_sp_real_uncertainty.py`) |
| `intensidade_carbono` | gCO₂e/MJ de biometano. É o número que o RenovaCalc e os compradores de CGOB usam. |
| `pct_emissoes_municipais_ch4` | `er_metano_evitado ÷ emissões de CH₄ do SEEG (agropecuária + resíduos)` do município |

## 4. Crédito: o que **não** prometer

- **Adicionalidade.** Uma redução só vira crédito se o projeto não aconteceria sem ele. A plataforma deve mostrar "potencial de redução", **não** "créditos".
- **Dupla contagem.** CBIO (RenovaBio), CGOB (ANP Res. 995/996), crédito voluntário e o futuro certificado paulista podem incidir sobre o **mesmo** biometano. A calculadora não pode somar receitas de instrumentos mutuamente excludentes. Por padrão, a interface deve oferecer **um** instrumento por vez.
- **Linha de base do usuário.** Na calculadora, a linha de base é um campo obrigatório ("hoje o dejeto vai para: lagoa / esterqueira / pasto / ..."). Sem resposta, só `BE_fossil` é calculado.

## 5. Exemplo numérico (ilustrativo, para dimensionar o erro atual)

Granja de suínos que captura **1.000.000 Nm³ CH₄/ano** e usa o biometano no lugar de diesel. Suposições ilustrativas: a linha de base (lagoa) emitiria 80 % desse metano, e o projeto perde 2 % em vazamento e *slip*.

| Termo | Cálculo | tCO₂e/ano |
|---|---|---:|
| **Cálculo atual da calculadora** | 1.000.000 × 0,657 × 44/16 ÷ 1000 | **1.807** |
| `BE_metano` | 1.000.000 × 0,80 × 0,717 kg × 27 ÷ 1000 | 15.487 |
| `BE_fossil` (diesel) | 1.000.000 × 35,8 MJ = 35,8 TJ × 74,1 | 2.653 |
| `PE` (vazamento + slip, 2 %) | 20.000 × 0,717 × 27 ÷ 1000 | −387 |
| **Redução líquida proposta** | | **≈ 17.750** |

A redução real seria **cerca de 10×** o número exibido hoje. A mesma planta gerando eletricidade para o SIN teria `BE_fossil` muito menor, porque o grid é limpo, enquanto `BE_metano` continuaria dominante.

Agora uma planta de **palha de cana** com o mesmo volume. `BE_metano` = 0 (a palha no campo não gera metano relevante). Ficam só `BE_fossil` menos `PE`, cerca de 2.270 tCO₂e no caso diesel. **O cálculo atual daria o mesmo 1.807 para as duas plantas**, e é isso que esconde a diferença de valor climático entre substratos.

> **Nota de implementação.** A tabela acima credita o diesel sobre o volume produzido. O módulo credita só o volume
> **entregue** (produzido − vazamento − *slip*), o que é fisicamente correto. Na granja de suínos a diferença é de 0,3 %
> (17.700 contra 17.750). Na planta de palha ela é maior, e os números do parágrafo seguinte, calculados pelo módulo,
> ficam: com 2,5 % de vazamento e 2 % de *slip* sobre o gás que chega ao *upgrading*, `BE_fossil` = 2.535,
> `PE` = 861 e redução líquida ≈ **1.673** tCO₂e. O vazamento que zera o benefício cai para cerca de **10 %**
> (12 % sem *slip*). O texto original segue abaixo, para registro.

**O vazamento pesa muito mais onde não há metano evitado.** Na planta de palha, com 2,5 % de vazamento e 2 % de *slip* (lavagem com água), `PE` = 45.000 × 0,717 × 27 ÷ 1000 ≈ 871 tCO₂e. A redução líquida cai de cerca de 2.270 (com 2 % de perda) para cerca de 1.780: um quinto a menos, e um terço abaixo do caso sem perda (2.653). O vazamento que zera o benefício é `BE_fossil ÷ (ρ × GWP)` ≈ 2.653 ÷ 19,36 ≈ **14 %** do metano produzido. Na granja de suínos, o mesmo vazamento corta só cerca de 5 %. Consequência: para palha, vinhaça e outros substratos sem `BE_metano`, o módulo deve exibir o vazamento como premissa de primeira linha, e o relatório de lastro do CGOB (estratégia, C1) deve pedir medição, não padrão.

## 6. Implementação

1. `data/canonical_parameters/ghg.yaml` com MCF por sistema de manejo, `EF_fossil`, GWP (com versão), faixas de vazamento e *slip*. Cada valor com DOI ou tabela do IPCC, como em `feedstocks.yaml`.
2. `backend/app/services/ghg_service.py`, uma função pura no estilo de `biogas_forward.py`, com testes:
   - a palha tem `BE_metano` = 0;
   - a ETE com flare tem `BE_metano` = 0;
   - o exemplo da §5 dá ±1 %;
   - `PE` nunca deixa `ER` acima de `BE`.
3. Endpoint `GET /api/v1/ghg/municipalities/{ibge}` e uma versão POST para a calculadora.
4. Calculadora:
   - remover a fórmula local;
   - adicionar o campo "destino atual do resíduo";
   - mostrar as três parcelas;
   - trocar o rótulo "Créditos de Carbono" por "Potencial de redução de emissões".
   - O `calculatorEngine.test.ts:82` muda junto.
5. Dossiê municipal: uma seção "Clima", com a comparação com o SEEG.
6. `CALCULATOR_METHODOLOGY.md` §6.6 reescrita, e uma entrada nos *patch notes*: "o número de CO₂ mudou porque o método mudou".

## 7. Correção imediata (antes do módulo completo)

Enquanto o módulo não existe, a correção mínima e honesta é:

- renomear a saída para "CO₂ biogênico da combustão (não é redução)", **ou** removê-la;
- desligar `carbonFull` do cálculo de receita e de payback.

Assim a calculadora para de exibir um número com o significado errado, o que é melhor do que manter um número errado com rótulo de crédito.
