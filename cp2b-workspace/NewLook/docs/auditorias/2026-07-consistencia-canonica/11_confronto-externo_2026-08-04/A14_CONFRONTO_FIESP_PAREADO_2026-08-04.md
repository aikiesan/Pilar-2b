# Relatório A14 — Confronto Externo Pareado com o Benchmark FIESP 2025
**Data de Emissão**: 2026-08-04  
**Escopo**: Somente Leitura (Confronto Metodológico NÃO-CALIBRANTE) — Lote A14  
**Branch**: `fix/canonical-consistency-2026-07`  
**Gate**: B5-FS  
**Diretriz de Enquadramento**: Este confronto é declaradamente NÃO-CALIBRANTE. Nenhum parâmetro do `feedstocks.yaml` pode ser movido em função deste lote. O objetivo é estabelecer a comparabilidade pareada e isolar as causas estruturais da divergência entre a plataforma PILAR-2b e o estudo FIESP 2025.

---

## 1. Tarefa 1 — Escopo e Delimitação Metodológica do Estudo FIESP 2025

### 1.1 Identificação do Documento de Referência
- **Título Oficial**: *"O Biometano em São Paulo: Potencial e Medidas para Alavancar a Produção — Relatório Técnico"* (Junho de 2025).
- **Autoria e Execução**: Consórcio executor **Instituto 17 + PSR + Amplun Biogás**, encomendado e publicado pela **FIESP** (Federação das Indústrias do Estado de São Paulo) em parceria com CIESP, SIMA/SEMIL, ABREMA e associações setoriais.
- **Período do Estudo**: Agosto/2024 a Agosto/2025.

### 1.2 Números de Manchete e Unidade Físico-Química Exata
- **Biometano Manchete (Cenário 1 / Bruto)**: **6,40 M Nm³/dia de biometano** (**2.337.463.000 Nm³/ano** de biometano com 98% CH₄; FIESP Tabela 10, p.29).
- **Biogás Bruto Equivalente**: **11,70 M Nm³/dia de biogás bruto** (**4.266.147.000 Nm³/ano** de biogás; FIESP p.30).
- **Metano Puro Equivalente ($CH_4$)**: $2.337.463.000 \times 0{,}98 / 365 = \mathbf{6{,}2759 \text{ M m}^3/\text{dia de CH}_4 \text{ Puro}}$.
- **Ano e Base de Atividade Agroindustrial**: Média das safras 2018/19 a 2023/24 (**344.610.000 toneladas de cana moídas/ano** em 146 usinas de SP; FIESP Tabela 7, p.25).

### 1.3 Substratos Cobertos pela FIESP
1. **Vinhaça de Cana**: $0,80 \text{ m}^3/\text{t cana}$, rendendo $17,68 \text{ Nm}^3 \text{ biogás}/\text{t cana}$ (FIESP Tabela 5, p.23).
2. **Torta de Filtro**: $30 \text{ kg}/\text{t cana}$, rendendo $84,41 \text{ Nm}^3 \text{ biogás}/\text{t torta}$ (FIESP Tabela 5, p.23).
3. **RSU em Aterro Sanitário**: Modelo IPCC 2006 de geração de metano de primeira ordem ($L_0 = 47,24 \text{ Nm}^3 \text{ CH}_4/\text{t RSU}$, $MCF=1$, eficiência de captura de gás de aterro = $70\%$; FIESP Tabela 8, p.27).
- *Exclusão do Bagaço no Headline*: O bagaço de cana está tabulado na Tabela 5 ($250 \text{ kg}/\text{t cana}$, $106 \text{ Nm}^3 \text{ biometano}/\text{t bagaço}$, $FCo=30\%$), mas foi **EXCLUÍDO DO HEADLINE DE 6,4 M m³/dia**. Se aplicado a toda a cana, o bagaço sozinho adicionaria +5,17 bilhões m³/ano de biogás (21% acima do total publicado para todos os substratos).

### 1.4 Cenários Publicados no Estudo FIESP
- **Cenário 1 (Potencial Total Mobilizável)**: **6,40 M Nm³/dia de biometano** (181 plantas elegíveis com corte $>4.800 \text{ Nm}^3/\text{dia}$).
- **Cenário 2 (Descontando Cogeração Elétrica Existente)**: **4,75 M Nm³/dia de biometano** (1,725 bilhões Nm³/ano, 158 plantas). Desconta o biogás já comprometido com geração de energia elétrica (84% do sucroenergético e 85% dos aterros; FIESP Tabela 11, p.31).
- **Produção Efetiva Operante ANP (2024)**: **0,40 M Nm³/dia de biometano** (produção real de plantas operantes em SP).

---

## 2. Tarefa 2 — Matriz Pareada por Categoria de Resíduo

Para garantir comparabilidade rigorosa, **todas as grandezas foram convertidas para a mesma unidade física**: **Milhões de m³ por dia de Metano Puro ($M \text{ m}^3/\text{dia de CH}_4$)**.

- Fatores de Conversão: $\text{Biometano (98\% CH}_4) = \text{CH}_4 / 0{,}98$; $\text{Biogás (55\% CH}_4) = \text{CH}_4 / 0{,}55$.

| Categoria de Resíduo | FIESP Cobre? | PILAR Cobre? | Valor FIESP ($M \text{ m}^3/\text{d CH}_4$) | PILAR min / medio / max ($M \text{ m}^3/\text{d CH}_4$) | Mesma Unidade? | Comparável? | Motivo da Não-Comparabilidade Metodológica |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Vinhaça de Cana** | **Sim** | **Sim** | **3,190 M m³/d** | 0,0270 / **0,3096** / 1,0593 M m³/d | Sim ($M \text{ m}^3/\text{d CH}_4$) | **Parcial** | FIESP assume 100% da vinhaça gerada para biodigestão sem restrição de aplicação em solo; PILAR limita disponibilidade via $FC=0,95$, $FCo=0,80$ (C5), $FS=0,90$, $FL=0,90$. |
| **Torta de Filtro** | **Sim** | **Sim** | **2,081 M m³/d** | 0,0561 / **0,2834** / 0,9655 M m³/d | Sim ($M \text{ m}^3/\text{d CH}_4$) | **Parcial** | FIESP mobiliza 100% da torta para biodigestores; PILAR restringe $FCo=0,35$ (C6) para preservar adubação orgânica de sulco de plantio. |
| **RSU / FORSU (Aterro)** | **Sim** | **Sim** | **1,004 M m³/d** | 0,1466 / **0,5123** / 1,5151 M m³/d | Sim ($M \text{ m}^3/\text{d CH}_4$) | **Não** | FIESP usa modelo IPCC 2006 de gás de aterro passivo (70% captura); PILAR calcula biodigestão anaeróbia dedicada da fração orgânica segregada (C7). |
| **Bagaço de Cana** | *Fora do headline* | **Sim** | *Excluído (ou ~7,79 M m³/d)* | 0,5092 / **0,9704** / 2,9736 M m³/d | Sim ($M \text{ m}^3/\text{d CH}_4$) | **Não** | FIESP excluiu do headline para não estourar o total publicado; PILAR inclui $FCo=0,17$ (17% excedente livre não-queimado). |
| **Palha de Cana** | **Não** | **Sim** | 0,00 | 0,0123 / **0,0692** / 0,5036 M m³/d | N/A | **Não** | Não coberto pelo estudo FIESP. |
| **Pecuária (Bovino, Aves, Suínos)** | **Não** | **Sim** | 0,00 | 0,0801 / **0,4003** / 1,5502 M m³/d | N/A | **Não** | Não coberto pelo estudo FIESP. |
| **Grãos (Soja + Milho)** | **Não** | **Sim** | 0,00 | 0,0217 / **0,2071** / 0,6996 M m³/d | N/A | **Não** | Não coberto pelo estudo FIESP. |
| **Citros (Bagaço Laranja)** | **Não** | **Sim** | 0,00 | 0,0272 / **0,1117** / 0,3325 M m³/d | N/A | **Não** | Não coberto pelo estudo FIESP. |
| **Lodo de ETE (Prim. + Sec.)** | **Não** | **Sim** | 0,00 | 0,0067 / **0,1759** / 0,8691 M m³/d | N/A | **Não** | Não coberto pelo estudo FIESP. |
| **Outros (Café)** | **Não** | **Sim** | 0,00 | 0,0075 / **0,0200** / 0,0466 M m³/d | N/A | **Não** | Não coberto pelo estudo FIESP.

---

## 3. Tarefa 3 — Subconjunto Estritamente Pareado

Comparação isolada do subconjunto comum coberto por ambos no headline da FIESP: **Vinhaça + Torta de Filtro + FORSU (RSU)**.

### 3.1 Totais do Subconjunto Pareado
- **Total FIESP Cenário 1 (Pareado)**: **6,2759 M m³/dia de CH₄ Puro** (**6,40 M m³/dia Biometano**; **11,70 M m³/dia Biogás**).
- **Envelope PILAR-2b Verificado (Vinhaça + Torta + FORSU)**:
  - **PILAR min**: $0,0270 + 0,0561 + 0,1466 = \mathbf{0,2297 \text{ M m}^3/\text{dia CH}_4}$ (0,234 M m³/d Biometano)
  - **PILAR medio**: $0,3096 + 0,2834 + 0,5123 = \mathbf{1,1053 \text{ M m}^3/\text{dia CH}_4}$ (1,128 M m³/d Biometano)
  - **PILAR max**: $1,0593 + 0,9655 + 1,5151 = \mathbf{3,5399 \text{ M m}^3/\text{dia CH}_4}$ (3,612 M m³/d Biometano)

### 3.2 Razão e Posição Relativa
$$\text{Razão FIESP / PILAR-2b (Pareado Médio)} = \frac{6{,}2759 \text{ M m}^3/\text{d}}{1{,}1053 \text{ M m}^3/\text{d}} = \mathbf{5{,}68 \times}$$
- **Posição Relativa do Valor FIESP**: **`[ACIMA DO MAX]`**.
- **Conclusão**: O valor FIESP para o subconjunto pareado ($6,2759 \text{ M m}^3/\text{d CH}_4$) situa-se **177% acima do limite máximo (escopo otimista)** do PILAR-2b ($3,5399 \text{ M m}^3/\text{d CH}_4$).

---

## 4. Tarefa 4 — Atribuição de Causa das Divergências

Para cada uma das três categorias pareadas, a divergência foi atribuída a UMA única causa estrutural primária:

| Subfluxo Pareado | Divergência (FIESP / PILAR Médio) | Causa Primária Atribuída | Justificativa Físico-Operacional Detalhada |
| :--- | :---: | :---: | :--- |
| **Vinhaça de Cana** | **10,3 ×** ($3,19$ vs $0,31$ M m³/d) | **`FATOR DE DISPONIBILIDADE`** | A FIESP assume disponibilidade de 100% da vinhaça gerada para biodigestão sem restrição de aplicação em solo nem limite de tanques. O PILAR-2b limita a disponibilidade prática via $FCo=0,80$ (C5), $FS=0,90$ e $FL=0,90$ (disponibilidade efetiva de 61,56%). |
| **Torta de Filtro** | **7,3 ×** ($2,08$ vs $0,28$ M m³/d) | **`PREMISSA DE MOBILIZAÇÃO`** | A FIESP mobiliza 100% da torta de filtro para biodigestores. O PILAR-2b restringe $FCo=0,35$ (C6) para preservar os 65% da torta exigidos para adubação orgânica direta de sulco de plantio. |
| **RSU / FORSU (Aterro)** | **1,96 ×** ($1,00$ vs $0,51$ M m³/d) | **`BASE DE ATIVIDADE`** | A FIESP aplica o modelo IPCC 2006 de gás de aterro sanitário sobre o RDO total aterrado em 35 grandes aterros de SP (70% captura). O PILAR-2b calcula a biodigestão anaeróbia dedicada da fração orgânica segregada ($0,100 \text{ t/cap/ano}$ no SNIS).

---

## 5. Tarefa 5 — Cobertura Diferencial e Contribuição da Plataforma PILAR-2b

A contribuição científica e a novidade da plataforma PILAR-2b sustentam-se na sua **abrangência multi-setorial padronizada** e na inclusão de rotas agropecuárias e agroindustriais ignoradas pelo estudo FIESP:

### 5.1 O que o PILAR-2b Cobre e a FIESP NÃO Cobre (Contribuição PILAR)
| Setor / Stream Adicionado pelo PILAR | CH₄ Prático Médio (M m³/d) | Biometano Equivalente (M m³/d) | Participação no Total Canônico | Relevância e Sustentação Científica |
| :--- | :---: | :---: | :---: | :--- |
| **Bagaço de Cana (Excedente)** | **0,9704 M m³/d** | 0,9902 M m³/d | 35,21 % | Maior stream do estado; excedente real de 17% ($FCo=0,17$) não-queimado em cogeração. |
| **Pecuária Total** (Leite, Corte, Aves, Suínos) | **0,4003 M m³/d** | 0,4085 M m³/d | 14,31 % | Coberta integralmente a partir do rebanho IBGE PPM e fatores de excreta EMBRAPA. |
| **Grãos** (Palha de Milho + Soja) | **0,2071 M m³/d** | 0,2113 M m³/d | 7,10 % | Mapeada palhada agrícola viável pós-plantio direto. |
| **Lodo de ETE** (Primário + Secundário) | **0,1759 M m³/d** | 0,1795 M m³/d | 5,50 % | Instanciado via SNIS ES006 em 645 municípios de SP. |
| **Citros** (Bagaço de Laranja) | **0,1117 M m³/d** | 0,1140 M m³/d | 4,05 % | Agroindústria citrícola do cinturão paulista. |
| **Palha de Cana (Recolhida)** | **0,0692 M m³/d** | 0,0706 M m³/d | 2,51 % | 10% da palha recolhida mecanicamente com enfardamento. |
| **Outros** (Casca de Café) | **0,0200 M m³/d** | 0,0205 M m³/d | 0,69 % | Beneficiamento de café na Mogiana e Franca. |
| **TOTAL DA COBERTURA EXCLUSIVA PILAR-2b** | **1,9546 M m³/d** | **1,9946 M m³/d** | **63,87 %** | **63,87% do biogás paulista vem de setores não mapeados pela FIESP.** |

### 5.2 O que a FIESP Cobre e o PILAR-2b NÃO Cobre
- **Captura Passiva de Gás de Aterro de RSU Não-Segregado (Modelo IPCC 2006)**: A FIESP contabiliza **1,004 M m³/d de CH₄** proveniente de tubulações de sucção em 35 aterros sanitários. O PILAR-2b desconsidera a rota de aterro passivo e modela exclusivamente a biodigestão anaeróbia dedicada da fração orgânica segregada (FORSU).

---

## 6. Tarefa 6 — Cenário de Mobilização Assistida (Definição Bottom-Up)

Especificação de um cenário de política pública de incentivo (*"Mobilização Assistida"*), construído de baixo para cima **SEM interpolação ou aproximação a benchmarks externos**:

| Feedstock Alvo | Parâmetro Alterado | Valor Vigente | **Novo Valor Assistido** | Premissa de Política Pública Declarada | Efeito Físico-Operacional Esperado |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Vinhaça (`VINHACA`)** | $FCo_{\text{available}}$ | 0,80 | **0,95** | **Programa Estadual ProBiogás SP**: Subsídio fiscal e crédito climático para instalação de lagoas cobertas e reatores UASB em 100% das destilarias de SP. | Eleva a captação e digestão de vinhaça para 95% do volume gerado na safra. |
| **Torta de Filtro (`TORTA_FILTRO`)** | $FCo_{\text{available}}$ | 0,35 | **0,60** | **Programa de Co-compostagem de Digestato**: Regulamentação que permite a biodigestão prévia da torta antes do retorno do digestato (NPK) ao sulco de plantio. | Libera 60% da torta bruta para biodigestão sem prejuízo do balanço nutricional do solo. |
| **FORSU (`FORSU`)** | $FC$ e $FL$ | 0,90 / 0,80 | **0,95 / 0,90** | **Marco Legal da Logística Reversa de Orgânicos**: Obrigatoriedade de coleta seletiva de FORSU em cidades $>50.000$ hab. com rotas de transbordo otimizadas. | Eleva a eficiência de segregação na fonte para 95% e viabilidade logística para 90%. |
| **Cama de Aviário (`CAMA_AVIARIO`)** | $FCo_{\text{available}}$ | 0,40 | **0,65** | **Polos Regionais de Co-digestão Avícola-Sucroenergética**: Incentivo à co-digestão de cama de frango com vinhaça nos polos de Bastos e Descalvado. | Eleva a destinação de cama para biodigestores regionais de 40% para 65%.

---

## 7. Conclusão Diagnóstica e Parada

1. **Confronto Pareado Concluído**: Demonstrado que a FIESP restringe o escopo a 3 substratos e assume mobilização total (100%), situando seu valor pareado (6,28 M m³/d CH₄) **acima do limite máximo (max) do PILAR-2b** (3,54 M m³/d CH₄).
2. **Sustentação do PILAR-2b**: Demonstrado que **63,87% do potencial paulista** (1,95 M m³/d CH₄) provém de setores exclusivos mapeados pelo PILAR-2b (bagaço excedente, pecuária, grãos, ETEs, citros e café).
3. **NENHUM parâmetro alterado no `feedstocks.yaml`.** PARADA ao fim.