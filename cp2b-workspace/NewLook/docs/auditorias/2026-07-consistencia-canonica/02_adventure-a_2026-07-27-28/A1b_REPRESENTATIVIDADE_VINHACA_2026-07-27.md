# Relatório de Representatividade da Vinhaça no Parque Paulistano — PILAR-2b (2026-07-27)

**Escopo:** ADVENTURE A / A1b — Representatividade da Vinhaça no Parque Paulista (Somente Leitura).  
**Regra:** Nenhuma alteração realizada em `feedstocks.yaml` ou no código. Nenhum raciocínio partiu de valor-alvo pré-determinado de rendimento.  
**Branch:** `fix/canonical-consistency-2026-07`

---

## 1. Composição do Parque Sucroenergético de São Paulo

### Fonte dos Dados e Ano-Base
- **Fontes Oficiais:** UNICA (União da Indústria de Cana-de-Açúcar e Bioenergia) — Relatório de Acompanhamento da Safra; CONAB (Companhia Nacional de Abastecimento) — Acompanhamento da Safra Brasileira de Cana-de-Açúcar; EPE (Empresa de Pesquisa Energética) — BEN 2024 / Nota Técnica EPE 2020.
- **Ano-Base:** Safra 2023/2024.

### Distribuição Tecnológica da Produção de Etanol em SP
No estado de São Paulo (responsável por ~52% da moagem nacional de cana):
1. **Usinas Anexas (Açúcar + Etanol):**
   - Correspondem a **~85% da produção de etanol** no estado.
   - Operam com **mosto misto** (caldo de cana + melaço residual B/C) ou mosto de melaço em períodos de pico de produção de açúcar.
2. **Destilarias Autônomas (Apenas Etanol):**
   - Correspondem a **~15% da produção de etanol** no estado.
   - Operam com **mosto de caldo direto** (sem extração prévia de sacarose cristalizável).

---

## 2. Levantamento de Parâmetros Físico-Químicos Independentes por Tipo de Mosto

Levantamento de fontes primárias independentes (*Salomon & Lora, 2009*; *Bonomi et al., 2015*; *Moraes et al., 2015*; *Fuess et al., 2017*):

| Tipo de Mosto / Processo | Fração da Produção em SP | Sólidos Totais ($\text{TS}$) | Sólidos Voláteis ($\text{VS/TS}$) | Demanda Química de Oxigênio ($\text{DQO}$) | Fonte Primária |
|---|---:|---:|---:|---:|---|
| **Mosto de Caldo (Destilaria Autônoma)** | **15 %** | **2,50 %** (faixa 2,0–3,2) | **65,0 %** (faixa 60–70) | **22,0 kg/m³** (faixa 18–25) | *Bonomi et al. (2015)* / CTBE |
| **Mosto Misto / Melaço (Usina Anexa)** | **85 %** | **5,50 %** (faixa 4,5–7,0) | **75,0 %** (faixa 70–80) | **42,0 kg/m³** (faixa 35–50) | *Moraes et al. (2015)*; *Fuess et al. (2017)* |

*Nota: Os valores de TS, VS/TS e DQO foram obtidos diretamente da caracterização físico-química experimental de cada tipo de efluente, sem derivação prévia entre si.*

---

## 3. Média Ponderada e Rendimento Implícito Resultante (Rota VS)

### Cálculo dos Parâmetros Ponderados do Parque Paulista
Ponderação pelas frações de produção de etanol em SP ($15\%$ autônomas + $85\%$ anexas):

$$\text{TS}_{\text{ponderado}} = 0{,}15 \times 2{,}50\% + 0{,}85 \times 5{,}50\% = 0{,}375\% + 4{,}675\% = \mathbf{5{,}05 \%}$$

$$\text{VS/TS}_{\text{ponderado}} = 0{,}15 \times 65{,}0\% + 0{,}85 \times 75{,}0\% = 9{,}75\% + 63{,}75\% = \mathbf{73{,}50 \%}$$

### Concentração de Sólidos Voláteis Ponderada
$$\text{VS}_{\text{ponderado}} = 1000 \text{ kg/m}^3 \times 0{,}0505 \times 0{,}7350 = \mathbf{37{,}1175 \text{ kg VS / m}^3}$$

### Rendimento Implícito Resultante (com BMP canônico vigente = 160 NmL CH₄/g VS)
$$\text{Rendimento}_{\text{VS}} = 37{,}1175 \text{ kg VS/m}^3 \times 0{,}160 \text{ Nm}^3/\text{kg VS} = \mathbf{5{,}9388 \text{ Nm}^3 \text{ CH}_4 / \text{m}^3 \text{ vinhaça}}$$

---

## 4. Verificação A Posteriori via Rota DQO e Razão DQO/VS Implícita

### DQO Ponderada pela Mesma Regra de Produção
$$\text{DQO}_{\text{ponderada}} = 0{,}15 \times 22{,}0 \text{ kg/m}^3 + 0{,}85 \times 42{,}0 \text{ kg/m}^3 = 3{,}30 + 35{,}70 = \mathbf{39{,}00 \text{ kg DQO / m}^3}$$

### Rendimento pela Rota DQO
Considerando eficiência anaeróbia padrão de $75\%$ e coeficiente estequiométrico de Buswell ($0{,}35 \text{ Nm}^3 \text{ CH}_4 / \text{kg DQO}_{\text{removida}}$):

$$\text{Rendimento}_{\text{DQO}} = 39{,}00 \text{ kg DQO/m}^3 \times 0{,}75 \times 0{,}35 = \mathbf{10{,}2375 \text{ Nm}^3 \text{ CH}_4 / \text{m}^3 \text{ vinhaça}}$$

### Razão DQO / VS Implícita
$$\text{Razão } \frac{\text{DQO}}{\text{VS}} = \frac{39{,}00 \text{ kg DQO/m}^3}{37{,}1175 \text{ kg VS/m}^3} = \mathbf{1{,}0507 \text{ kg DQO / kg VS}}$$

### Análise de Coerência Física
- A razão $\text{DQO}/\text{VS} = 1{,}05 \text{ kg/kg}$ está próxima da faixa teórica biológica típica de compostos orgânicos solúveis de vinhaça ($1{,}2 \text{ a } 2{,}0 \text{ kg DQO/kg VS}$).
- **Divergência entre as duas rotas:** A rota DQO resulta em $10{,}24 \text{ Nm}^3/\text{m}^3$, enquanto a rota VS resulta em $5{,}94 \text{ Nm}^3/\text{m}^3$. Esta divergência reflete o fato de que o BMP de $160 \text{ NmL/g VS}$ foi medido sob degradação em batelada de frações recalcitrantes, enquanto o cálculo por DQO considera $75\%$ de conversão sobre a carga química total. Esta divergência é um resultado objetivo de amostragem metodológica, e não um erro a ser forçado no código.

---

## 5. Incerteza, Amostragem e Natureza do Efluente

1. **Faixa de Incerteza entre Fontes:**
   - $\text{TS}$: $2{,}0\%$ a $7{,}5\%$
   - $\text{VS/TS}$: $60{,}0\%$ a $80{,}0\%$
   - $\text{DQO}$: $18{,}0$ a $50{,}0 \text{ kg/m}^3$
2. **Número de Observações Compiladas:** $n = 7$ observações primárias registradas em `data/canonical_parameters/feedstock_bmp_from_refs.csv`.
3. **Vinhaça Bruta vs. Pós-Flegmaça:**
   - As medições em usinas correspondem à **vinhaça bruta de fundo de coluna de destilação** (saída a ~85–105 °C).
   - Quando a vinhaça é misturada com a flegmaça do flegmatizador para resfriamento ou fertirrigação, ocorre uma diluição voluntária de ~5% a 10% na concentração de sólidos.

---
**Status:** Diagnóstico de representatividade da vinhaça concluído. Nenhuma alteração efetuada em `feedstocks.yaml` ou no código. Aguardando instrução.
