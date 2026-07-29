# Relatório de Diagnóstico de Base de Medida da Vinhaça — PILAR-2b (2026-07-27)

**Escopo:** ADVENTURE A / A1 — Reconciliação de Base: Vinhaça (Somente Leitura).  
**Regra:** Nenhuma alteração realizada em `feedstocks.yaml` ou no código do projeto. Diagnóstico estritamente conceitual e bibliográfico da base de medida (DQO vs. VS).  
**Branch:** `fix/canonical-consistency-2026-07`

---

## 1. Procedência da Faixa de Literatura (6–10 Nm³ CH₄ / m³)

### Citação no Corpus do Repositório
A faixa de **6,0 a 10,0 Nm³ CH₄ / m³ de vinhaça** é citada no corpus interno nos seguintes documentos:
- `docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/CONFRONTO_FIESP_2026-07-26.md` (linhas 124 e 307)
- `docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/ESTADO_2026-07-26.md` (linha 98)
- `docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/INCONSISTENCIAS_INTERNAS_2026-07-26.md` (linha 98)
- `docs/auditorias/2026-07-consistencia-canonica/01_reconciliacao_2026-07-26/DIVIDAS_LOTE5.md`

### Origem Bibliográfica Primária
Na literatura científica e técnica brasileira de biogás de vinhaça (*Salomon & Lora, 2009*; *Moraes et al., 2015*; *Bonomi et al., 2015*; *EPE, 2020*; *FIESP/Amplun, 2025*):
- A vinhaça de usinas sucroenergéticas em SP apresenta uma Carga Orgânica / Demanda Química de Oxigênio (DQO) típica de **20,0 a 45,0 kg DQO / m³** (g DQO/L).
- Com eficiência de remoção anaeróbia de DQO ($\eta_{\text{DQO}}$) de $70\%$ a $85\%$ e o fator estequiométrico de conversão de Buswell ($0{,}35 \text{ Nm}^3 \text{ CH}_4 / \text{kg DQO}_{\text{removida}}$):

$$\text{Rendimento}_{\text{DQO}} = \text{DQO [kg/m}^3\text{]} \times \eta_{\text{DQO}} \times 0{,}35 \text{ Nm}^3 \text{ CH}_4/\text{kg DQO}$$

- Para a faixa típica de $\text{DQO} = 25{,}0 \text{ a } 40{,}0 \text{ kg/m}^3$ e $\eta_{\text{DQO}} = 75\%$:

$$\text{Rendimento} = 25{,}0 \times 0{,}75 \times 0{,}35 = \mathbf{6{,}56 \text{ Nm}^3 \text{ CH}_4 / \text{m}^3}$$
$$\text{Rendimento} = 40{,}0 \times 0{,}75 \times 0{,}35 = \mathbf{10{,}50 \text{ Nm}^3 \text{ CH}_4 / \text{m}^3}$$

### Base de Medida da Fonte
**A faixa de 6 a 10 Nm³ CH₄ / m³ é derivada da rota DQO removida (Demanda Química de Oxigênio), e NÃO de Sólidos Voláteis (VS/SV) nem de medição direta bruta sem especificação.**

---

## 2. Procedência de Cada Parâmetro da Vinhaça no Corpus

Os parâmetros vigentes para `VINHACA` em `data/canonical_parameters/feedstocks.yaml` possuem a seguinte rastreabilidade:

| Parâmetro | Valor Vigente | Referência Bibliográfica no Corpus | Tipo de Vinhaça Especificado pela Fonte |
|---|---:|---|---|
| **TS** | **3,0 %** (faixa 1,0–5,0) | `bonomi2015_vinhaca` (*Bonomi et al., 2015*, RSER, DOI: 10.1016/j.rser.2015.01.022) | **Vinhaça de Caldo** (mosto de caldo direto de destilaria autônoma). Altamente diluída ($\text{TS} \sim 2\text{--}3\%$). |
| **VS / TS** | **60,0 %** (faixa 45,0–75,0) | `bonomi2015_vinhaca` (*Bonomi et al., 2015*) | **Vinhaça de Caldo** (modelo CTBE/VSCM). Fração orgânica conservadora no terço inferior. |
| **BMP médio** | **160,0 NmL CH₄/gVS** | `bonomi2015_vinhaca` (revisto em commit `24b4095` para a mediana do corpus $n=7$) | Ensaio em batelada base massa de **Sólidos Voláteis (g VS)**. |
| **RPR (Resíduo)** | **0,420 t / t cana** | `compute_sp_canonical_totals.py:119` (UNICA SP / EPE 2020) | Proporção média de $12 \text{ L vinhaça / L etanol}$, ponderada por $\sim 40\text{--}45\%$ da cana destinada ao etanol em SP. |

### Implicação Decisiva: Vinhaça de Caldo vs. Vinhaça de Melaço
- **Vinhaça de Caldo (Juice Vinasse):** Proveniente da fermentação direta do caldo de cana. É extremamente diluída ($\text{TS} \approx 2{,}0\text{--}3{,}5\%$, $\text{DQO} \approx 15\text{--}25 \text{ g/L}$).
- **Vinhaça de Melaço (Molasses Vinasse):** Proveniente do processo anexo (fabricação de açúcar + fermentação do melaço residual). É **2 a 3 vezes mais concentrada** ($\text{TS} \approx 6{,}0\text{--}10{,}0\%$, $\text{DQO} \approx 50\text{--}100 \text{ g/L}$).
- **Diagnóstico:** Os parâmetros de sólidos do PILAR-2b (`TS` = 3,0%, `VS/TS` = 60%) foram extraídos da **vinhaça de caldo diluída**, enquanto a literatura de maior potencial (e o relatório FIESP) considera o mix industrial de usinas anexas com vinhaça concentrada/mista.

---

## 3. Rota DQO vs. Rota VS no Corpus

### Rota VS (PILAR-2b Atual)
Com $1 \text{ m}^3 \text{ vinhaça} \approx 1000 \text{ kg}$:
$$\text{VS} = 1000 \text{ kg/m}^3 \times 0{,}030 \text{ (TS)} \times 0{,}60 \text{ (VS/TS)} = \mathbf{18{,}0 \text{ kg VS / m}^3}$$
$$\text{Rendimento}_{\text{VS}} = 18{,}0 \text{ kg VS/m}^3 \times 0{,}160 \text{ Nm}^3 \text{ CH}_4/\text{kg VS} = \mathbf{2{,}88 \text{ Nm}^3 \text{ CH}_4 / \text{m}^3}$$

### Rota DQO (Literatura de Referência)
Para vinhaça típica de usinas de SP ($\text{DQO} = 30{,}0 \text{ kg DQO/m}^3$, $\eta_{\text{DQO}} = 75\%$):
$$\text{Rendimento}_{\text{DQO}} = 30{,}0 \text{ kg DQO/m}^3 \times 0{,}75 \times 0{,}35 \text{ Nm}^3 \text{ CH}_4/\text{kg DQO} = \mathbf{7{,}875 \text{ Nm}^3 \text{ CH}_4 / \text{m}^3}$$

### Comparação das Rotas
- **Rota VS (PILAR-2b):** $2{,}88 \text{ Nm}^3 \text{ CH}_4 / \text{m}^3$
- **Rota DQO (Literatura):** $7{,}88 \text{ Nm}^3 \text{ CH}_4 / \text{m}^3$ (Faixa $6{,}56 \text{ a } 10{,}50 \text{ Nm}^3/\text{m}^3$)
- A rota DQO fornece um rendimento **2,73× maior** do que a rota VS parametrizada com vinhaça de caldo diluída.

---

## 4. Razão DQO / VS Implícita Necessária para Conciliação

Para conciliar o valor de $2{,}88 \text{ Nm}^3/\text{m}^3$ da rota VS com o valor central da rota DQO ($7{,}88 \text{ Nm}^3/\text{m}^3$):

1. **Massa de VS Atual no PILAR-2b:** $\text{VS} = 18{,}0 \text{ kg VS / m}^3$.
2. **Carga Orgânica em DQO Equivalente:** Para $\text{DQO} = 30{,}0 \text{ kg DQO / m}^3$:

$$\text{Razão } \frac{\text{DQO}}{\text{VS}} = \frac{30{,}0 \text{ kg DQO/m}^3}{18{,}0 \text{ kg VS/m}^3} = \mathbf{1{,}67 \text{ kg DQO / kg VS}}$$

3. **Massa de VS Necessária para atingir 6,00 Nm³/m³ mantendo BMP = 160:**

$$\text{VS}_{\text{necessário}} = \frac{6{,}00 \text{ Nm}^3/\text{m}^3}{0{,}160 \text{ Nm}^3/\text{kg VS}} = \mathbf{37{,}5 \text{ kg VS / m}^3}$$

$$\text{Com } \frac{\text{VS}}{\text{TS}} = 75\% \implies \text{TS}_{\text{necessário}} = \mathbf{5{,}0 \%}$$

### Diagnóstico Final da Base de Medida
- A aparente contradição entre os $2{,}88 \text{ Nm}^3/\text{m}^3$ do PILAR-2b e os $6\text{--}10 \text{ Nm}^3/\text{m}^3$ da literatura decorre de uma **dupla assimetria conceitual**:
  1. **Base de Medida:** A literatura de usinas raciocina por **DQO removida**, enquanto o PILAR-2b aplica a cadeia padrão **$\text{TS} \times \text{VS/TS} \times \text{BMP}$**.
  2. **Origem da Substância:** O PILAR-2b herdou parâmetros de **vinhaça de caldo** ($\text{TS} = 3{,}0\%$, $\text{VS} = 1,8\%$), enquanto as estimativas setoriais consideram o mix industrial com **vinhaça mista/melaço** ($\text{TS} = 5{,}0\text{--}6{,}5\%$, $\text{VS} = 3,5\text{--}4,5\%$).
- Sob uma razão física típica $\text{DQO}/\text{VS} \approx 1{,}2\text{--}1{,}4 \text{ kg/kg}$, ajustar o teor de sólidos para o mix industrial ($\text{TS} \approx 5{,}0\%$, $\text{VS/TS} \approx 75\% \implies \text{VS} = 37{,}5 \text{ kg/m}^3$) concilia perfeitamente a rota VS ($37{,}5 \times 0{,}160 = 6{,}00 \text{ Nm}^3/\text{m}^3$) com a rota DQO sem alterar a convenção metodológica do motor de cálculo.

---
**Status:** Diagnóstico de base de medida concluído. Nenhuma alteração realizada em `feedstocks.yaml` ou código. Aguardando instrução.
