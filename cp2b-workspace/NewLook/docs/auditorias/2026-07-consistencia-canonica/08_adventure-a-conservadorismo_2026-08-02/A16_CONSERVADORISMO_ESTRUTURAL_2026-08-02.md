# Relatório A16 — Auditoria Diagnóstica do Conservadorismo Estrutural e Parâmetros Não-Aproveitados
**Data de Emissão**: 2026-08-02  
**Escopo**: Somente Leitura (Auditoria Diagnóstica) — Lote A16  
**Branch**: `fix/canonical-consistency-2026-07`  
**Gate**: B2-CLOSE, B3-CONSOLIDA  
**Diretriz de Enquadramento**: Nenhum parâmetro alterado. Nenhum total recalculado. O objetivo é identificar conservadorismos não-justificados (dupla contagem de restrições ou operações sem respaldo na fonte) e mapear oportunidades de refinamento metodológico para a seção de limitações do manuscrito.

---

## 1. Tarefa 1 — Análise do Fator de Sazonalidade (FS) Aplicado Sobre Base Anual

### 1.1 Expressão no Código e Determinação da Operação
- **Arquivos e Linhas**: [`canonical_loader.py:158`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/services/canonical_loader.py#L158) e [`biogas_forward.py:130`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/services/biogas_forward.py#L130).
- **Expressão Real Executada**:
  $$\text{CH}_4 \text{ Prático (m}^3/\text{ano)} = \left[ \text{Biomassa Anual (t/ano)} \times \frac{TS}{100} \times \frac{VS}{100} \times BMP \right] \times (FC \times FCo \times FS \times FL \times \eta)$$
- **Diagnóstico da Variável de Entrada**: A quantidade de biomassa (`biomass_tons_wet`) inserida no modelo deriva de fontes oficiais (IBGE PAM, IBGE PPM, SNIS) que reportam a **massa total acumulada gerada ao longo de 365 dias do ano** ($t/\text{ano}$). Não é uma taxa de geração instantânea diária ($t/\text{dia}$).

### 1.2 O que FS Representa na Prática por Feedstock
| Categoria de Feedstock | Códigos Mapeados | Parâmetro FS Vigente | Significado Físico Real de FS no Modelo Atual | Diagnóstico de Dupla Contagem |
| :--- | :--- | :---: | :--- | :---: |
| **Agrícola (Safras)** | `BAGACO`, `PALHA`, `VINHACA`, `TORTA_FILTRO`, `CITROS`, `SOJA`, `MILHO`, `CAFE` | 0,85 a 0,90 | Simula a janela de safra (8-9 meses/ano) e a perda de capacidade/estocagem durante o período entresafra. | `[DESCONTO DUPLO MODERADO]`: A produção agrícola anual $t/\text{ano}$ da PAM já é o total colhido na safra. Multiplicar por 0,85-0,90 reduz em 10-15% a biomassa que já foi produzida. |
| **Pecuária (Permanente)** | `ESTERCO_BOVINO_LEITEIRO`, `CORTE`, `CAMA_AVIARIO`, `DEJETOS_SUINO` | 0,78 a 0,95 | Simula paralisações operacionais no manejo e oscilação de pastagem ao longo das estações seca/chuvosa. | `[SOBREPOSIÇÃO COM FC/FL]`: O rebanho PPM é permanente (365 dias). O manejo e a coletabilidade já são descontados pelo $FC$ de ordenha/curral. |
| **Urbano (Contínuo)** | `FORSU`, `PODA_URBANA` | 0,80 a 0,90 | Simula paralisação pontual de coleta em feriados/chuvas extremas. | `[SOBREPOSIÇÃO COM FC]`: A população é contínua e o $FC$ de coleta seletiva municipal já representa a eficiência média anual. |

### 1.3 Veredito e Quantificação do Efeito (Sem Aplicar Alteração)
- **Veredito**: `[SOBREPOSIÇÃO E DESCONTO DUPLO MODERADO]`. Aplicar $FS$ sobre totais anuais reduz adicionalmente a biomassa mobilizável em $5\%$ a $20\%$.
- **Quantificação do Efeito ($FS = 1{,}00$)**:
  - CH₄ Atual Verificado (com FS): **905,48 M m³/ano** (2,4808 M m³/dia)
  - CH₄ Hipotético Sem Desconto de FS ($FS = 1{,}00$): **1.018,45 M m³/ano** (2,7903 M m³/dia)
  - Magnitude do Desconto Implicito: **+112,97 M m³/ano CH₄ (+12,48%)**

---

## 2. Tarefa 2 — Decomposição de Independência dos 5 Menores Produtos de Disponibilidade

Decomposição do produto $Disponibilidade = FC \times FCo \times FS \times FL$ para os 5 menores feedstocks da economia paulista:

| Subfluxo (Stream) | Código Canônico | FC | FCo | FS | FL | Produto Implícito | Classificação de Independência | Evidência Físico-Mecanica e Sobreposição | Impacto Potencial da Remoção de Sobreposição |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| `corn` | `PALHA_MILHO` | 0,50 | 0,17 | 0,85 | 0,67 | **0,0475 (4,75%)** | **`[SOBREPOSIÇÃO CONFIRMADA]`** | $FCo = 0{,}17$ exige retenção de 83% de palha no solo para cobertura vegetal. $FL = 0{,}67$ penaliza a logística de enfardamento. O enfardamento É a operação mecânica que recolhe os 17% do solo. $FC$, $FCo$ e $FL$ descontam a mesma restrição operacional três vezes. | $FCo \times FL$ revisado para recolhimento direto eleva disponibilidade para ~12,5%. |
| `soybean` | `PALHA_SOJA` | 0,75 | 0,15 | 0,85 | 0,55 | **0,0526 (5,26%)** | **`[SOBREPOSIÇÃO CONFIRMADA]`** | $FCo = 0{,}15$ atende à diretriz RTRS de palhada em plantio direto. $FL = 0{,}55$ penaliza densidade e transporte. $FC = 0{,}75$ penaliza a eficiência da recolhedora. Há sobreposição entre $FC$ e $FL$ para a massa de palha enfardada na borda do talhão. | Reavaliação logística ajusta disponibilidade para ~10,0%. |
| `cattle_corte` | `ESTERCO_BOVINO_CORTE` | 0,35 | 0,35 | 0,78 | 0,52 | **0,0497 (4,97%)** | **`[SOBREPOSIÇÃO CONFIRMADA]`** | $FC = 0{,}35$ isola a fração de animais em confinamento/semiconfinamento em SP. $FCo = 0{,}35$ volta a descontar dejetos não-coletados em pasto aberto. Como o dejeto a pasto já teve $FC = 0$, aplicar $FCo = 0{,}35$ é desconto duplo de manejo extensivo. | Eliminação do desconto duplo eleva disponibilidade de corte para ~14,2%. |
| `cattle_leiteiro` | `ESTERCO_BOVINO_LEITEIRO` | 0,14 | 0,58 | 0,90 | 0,85 | **0,0621 (6,21%)** | **`[INDEPENDENTE]`** | $FC = 0{,}14$ representa a deposição física diária de excreta em piso concreto raspável de ordenha/pista (EMBRAPA Sudeste). $FCo = 0{,}58$ representa a fração do esterco raspado destinada à adubação orgânica direta sem biodigestão. Restrições independentes. | Nenhuma alteração recomendada. |
| `cana_palha` | `PALHA` (Cana) | 0,85 | 0,10 | 0,90 | 0,85 | **0,0650 (6,50%)** | **`[SOBREPOSIÇÃO CONFIRMADA]`** | $FCo = 0{,}10$ exige retenção de 90% da palha no solo para balanço agronômico (CTC/IAC). $FC = 0{,}85$ descontava a eficiência do enfardador sobre os 10% recolhidos. $FL = 0{,}85$ volta a descontar o frete do fardo até a usina. | Ajuste da recolha mecanizada de palha para fardo entregue na usina eleva disponibilidade para ~8,5%.

---

## 3. Tarefa 3 — Confronto de Rotas: Rota VS/BMP vs Rota DQO

Para feedstocks líquidos e semilíquidos, foi confrontado o rendimento de metano obtido pela rota canônica vigente (Sólidos Voláteis / BMP) contra a rota de Remoção de Carga Orgânica (DQO em reatores anaeróbios UASB/CSTR), com base em $350 \text{ NmL CH}_4 / \text{g DQO}_{\text{removida}}$:

| Feedstock Líquido / Semilíquido | Rota Vigente (VS / BMP) | Parâmetro DQO / VS (g DQO/g VS) | Eficiência de Remoção $\eta_{\text{DQO}}$ | Rendimento Rota DQO (NmL CH₄/g VS) | Delta de Conservadorismo de Rota (%) | Fonte da Matriz DQO e Eficiência $\eta_{\text{DQO}}$ |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`VINHACA`** | 350,0 NmL/gVS | 1,50 g DQO/g VS | 80% (Biodigestor UASB) | **420,0 NmL/gVS** | **+ 20,0 %** | Bonomi et al. (2015, [doi:10.1016/j.rser.2015.04.098](https://doi.org/10.1016/j.rser.2015.04.098)), Moraes et al. (2014). |
| **`DEJETOS_SUINO`** | 265,0 NmL/gVS | 1,35 g DQO/g VS | 75% (Lagoa Coberta / CSTR) | **354,4 NmL/gVS** | **+ 33,7 %** | Abouelenien et al. (2014), Oliver et al. (2008). |
| **`ESTERCO_BOVINO_LEITEIRO`** | 230,0 NmL/gVS | 1,30 g DQO/g VS | 70% (Biodigestor CSTR) | **318,5 NmL/gVS** | **+ 38,5 %** | Amon et al. (2007), Embrapa Pecuária Sudeste Documentos 39. |
| **`LODO_PRIMARIO`** | 360,0 NmL/gVS | 1,50 g DQO/g VS | 65% (Digestor Secundário) | **341,2 NmL/gVS** | **− 5,2 %** | CETESB (2020), Metcalf & Eddy (2014). |
| **`LODO_SECUNDARIO`** | 210,0 NmL/gVS | 1,25 g DQO/g VS | 55% (Digestor Biológico) | **240,6 NmL/gVS** | **+ 14,6 %** | CETESB (2020), Metcalf & Eddy (2014).

> [!IMPORTANT]
> **DECLARAÇÃO DE ININTERCAMBIABILIDADE DE ROTAS (Decisão D03)**: As rotas baseadas em Sólidos Voláteis ($VS/BMP$) e em Demanda Química de Oxigênio ($DQO$) **NÃO SÃO INTERCAMBIÁVEIS** no pipeline canônico. A rota de VS/BMP é a única mantida como padrão único no backend para manter a simetria de amostragem. Esta comparação serve estritamente para **dimensionar a magnitude do conservadorismo de rota**, que é item obrigatório na seção de limitações do manuscrito final.

---

## 4. Tarefa 4 — Parâmetros Inventariados no Banco e Não-Aproveitados no Pipeline

Varredura no banco SQL (tabela `residuos` e migrações [`005_cn_ratio_ranges.sql`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/migrations/005_cn_ratio_ranges.sql) e [`014_add_kinetics_column.sql`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/migrations/014_add_kinetics_column.sql)):

| Parâmetro Existente no Banco | Coluna / Localização SQL | Cobertura de Feedstocks | Uso Atual no Pipeline | Oportunidade de Refinamento Metodológico | Impacto Potencial Estimado |
| :--- | :--- | :---: | :---: | :--- | :---: |
| **Relação Carbono/Nitrogênio (C:N)** | `residuos.cn_ratio_min`, `max`, `chemical_cn_ratio` | 31 resíduos | Não consumido pelo pipeline de metano (usado apenas na UI de Co-digestão) | Permitiria calcular o **Índice de Balanço C:N** para co-digestão ótimo (C:N 25–30), ajustando o rendimento cinético em misturas de vinhaça (C:N=30) com torta (C:N=19) e cama de frango (C:N=11). | **Médio**: Otimização de misturas em plantas de co-digestão de usinas. |
| **Teor Específico de CH₄ (%)** | `residuos.chemical_ch4_content` e `feedstocks.yaml` | 28 feedstocks | Utilizado apenas para converter CH₄ em biogás bruto | Atualmente, relatórios consolidados externos adotam uma constante média de $57{,}1\%$ de CH₄. O uso do valor específico por feedstock (ex: vinhaça 65% CH₄ vs FORSU 52%) altera a energia térmica útil calculada. | **Baixo**: Precisão de conversão de volume térmico. |
| **Constantes Cinéticas ($k$, $day^{-1}$)** | `residuos.kinetics` (JSONB) | 12 resíduos | Não consumido (pipeline é modelo estático de batelada) | Permitiria simular a produção de CH₄ em função do Tempo de Retenção Hidráulica ($TRH = 20$ a $30$ dias) em reatores CSTR/UASB industriais. | **Alto**: Dimensionamento de capacidade real de reatores em regime contínuo. |
| **Densidade In Natura ($kg/m^3$)** | `residuos.densidade_in_natura` | 26 resíduos | Não consumido no cálculo de metano | Permitiria substituir o raio logístico genérico ($FL$) por uma equação de frete baseada na carga volumétrica do caminhão (ex: vinhaça $1.000 kg/m^3$ vs palha $120 kg/m^3$). | **Alto**: Fundamentação física do fator $FL$. |

---

## 5. Tarefa 5 — Inventário de Atividade Não-Capturada para os 13 Feedstocks Mortos

Mapeamento de fontes de dados municipais oficiais acessíveis para instanciar os 13 códigos parametrizados que hoje não possuem camada de atividade ativa no pipeline de SP:

| ID | Código No-Instanciado | Fonte Candidata Oficial | Campo de Atividade Candidato | Cobertura Municipal Esperada | Esforço de Integração |
| :-: | :--- | :--- | :--- | :---: | :---: |
| **1** | `CASCA_SOJA` | IBGE PAM (Tabela 1612) / CONAB | `producao_grao_toneladas` $\times 0{,}08 \text{ t casca/t grão}$ | ~320 municípios de SP | **Baixo** (extensão direta da PAM de soja existente) |
| **2** | `CASCA_MILHO` | IBGE PAM (Tabela 1612) / CONAB | `producao_grao_toneladas` $\times 0{,}10 \text{ t casca/t grão}$ | ~450 municípios de SP | **Baixo** (extensão da PAM de milho existente) |
| **3** | `POLPA_CAFE` | IBGE PAM (Tabela 1612) / ETE Cafeicultura | `producao_cafe_toneladas` $\times \text{fração via úmida}$ | ~180 municípios (Mogiana/Franca/Garça) | **Médio** (estimar fração municipal lavada via úmida) |
| **4** | `MUCILAGEM_CAFE` | IBGE PAM (Tabela 1612) / ETE Agro | `producao_cafe_toneladas` $\times 3,0 \text{ m}^3 \text{ efluente/t}$ | ~180 municípios | **Médio** (requer modelo de águas residuárias) |
| **5** | `CASCAS_CITROS` | IBGE PAM (Tabela 1613) / Fundecitrus | `producao_fruta_toneladas` $\times 0{,}15 \text{ casca seca/t}$ | ~350 municípios de SP | **Baixo** (partição direta de citros existentes) |
| **6** | `DEJETOS_AVES` | IBGE PPM (Tabela 3939 - Galinhas) | `efetivo_galinhas_poedeiras` $\times 0{,}035 \text{ t dejeto/cab/ano}$ | ~200 municípios (Bastos/Descalvado) | **Médio** (separar poedeiras de postura em gaiola) |
| **7** | `LODO_PRIMARIO` | SNIS Água e Esgoto / CETESB ETEs | `volume_esgoto_tratado_m3` $\times 0{,}15 \text{ kg SS/m}^3$ | 645 municípios de SP | **Médio** (join de dados SNIS ETE por código IBGE) |
| **8** | `LODO_SECUNDARIO` | SNIS Água e Esgoto / CETESB ETEs | `volume_esgoto_tratado_m3` $\times 0{,}10 \text{ kg SS/m}^3$ | 645 municípios de SP | **Médio** (join de dados SNIS ETE por código IBGE) |
| **9** | `GORDURA` | ABRELPE / Cadastro CIESP | `volume_caixa_gordura_m3` | Regiões Metropolitanas de SP | **Alto** (sem cadastro municipalizado padronizado) |
| **10** | `SANGUE` | MAPA / SIF / SISP Abatedouros | `cabecas_bovinos_suinos_abatidas` $\times 15 \text{ L/cab}$ | ~80 municípios com abatedouros SIF | **Médio** (base de abate inspecionado por município) |
| **11** | `VISCERAS` | MAPA / SIF / SISP Abatedouros | `cabecas_abatidas` $\times 25 \text{ kg/cab}$ | ~80 municípios com abatedouros SIF | **Médio** (base SIF) |
| **12** | `LEVEDURA` | UNICA / ANP Produção de Etanol | `producao_etanol_m3` $\times 0{,}02 \text{ t levedura/m}^3$ | ~170 municípios com usinas em SP | **Baixo** (associar diretamente à produção de etanol) |
| **13** | `CASCA_EUCALIPTO` | IBGE PEVS (Extração Vegetal/Silvicultura) | `area_eucalipto_ha` ou `volume_madeira_m3` | ~250 municípios (Vale do Paraíba/Itapetininga) | **Baixo** (dados municipais do PEVS disponíveis)

---

## 6. Conclusão Diagnóstica e Parada

1. **Identificação de Conservadorismos**: Mapeado o impacto do $FS$ sobre a base anual (+12,48% se $FS=1,00$), a sobreposição de restrições nos 5 menores feedstocks e o conservadorismo de rota VS vs DQO (+20% a +38% em vinhaça, suínos e leiteiro).
2. **Oportunidades de Refinamento**: Inventariados os parâmetros C:N, densidade in natura e cinéticas no banco SQL, bem como fontes de atividade municipal para os 13 feedstocks não-instanciados.
3. **NENHUM parâmetro alterado. NENHUM total recalculado.** PARADA ao fim.