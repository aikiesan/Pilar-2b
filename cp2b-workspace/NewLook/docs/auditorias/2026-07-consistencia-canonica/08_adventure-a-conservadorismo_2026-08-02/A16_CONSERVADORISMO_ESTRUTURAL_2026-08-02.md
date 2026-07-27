# Relatório A16 — Auditoria Diagnóstica do Conservadorismo Estrutural e Validação em Supabase
**Data de Emissão**: 2026-08-02  
**Escopo**: Somente Leitura (Auditoria Diagnóstica com Validação em Supabase) — Lote A16  
**Branch**: `fix/canonical-consistency-2026-07`  
**Gate**: B2-CLOSE, B3-CONSOLIDA  
**Fonte Primária de Banco**: Produção Supabase (Consultas no SQL Editor em 2026-07-27)  
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

## 4. Tarefa 4 — Parâmetros Inventariados no Banco Supabase e Não-Aproveitados

Auditoria realizada diretamente no banco **Supabase** (tabelas `residuos`, `scientific_references`, `fde_residue_availability` e `municipalities` em 2026-07-27):

### 4.1 Validação da Tabela `fde_residue_availability` e Alertas Legados no Supabase
A consulta no SQL Editor revelou observações críticas históricas gravadas no banco relacional que ilustram o conservadorismo extremo inicial:
- **Bagaço de Cana (`AG_CANA_BAGACO`)**: FDE registrado como **0.0%** com nota: *'🚨 CRÍTICO: 100% cogeração CETESB obrigatória → 0% disponível'*. Isso demonstra que na modelagem legada se assumia disponibilidade zero para biodigestão devido à queimada integral em caldeiras.
- **Palha de Cana (`AG_CANA_PALHA`)**: FDE registrado como **6,55%** com nota: *'🚨 CRÍTICO: 90% retenção solo 5-15t/ha UNESP → 10% disponível'*.
- **Lodo Primário (`URB_LODO_PRIMARIO`)**: FDE = **54,51%** (classificado como Excepcional no Supabase, $BMP = 0,25 m^3/kg VS$).

### 4.2 Top 10 Municípios no Banco Relacional `municipalities`
A consulta na tabela `municipalities` confirmou a hierarquia espacial persistida no Supabase:
1. **Barretos**: 650,45 M m³/ano biogás total (622,05 M m³/ano sucroenergético)
2. **Morro Agudo**: 644,44 M m³/ano biogás total (627,73 M m³/ano sucroenergético)
3. **Guaíra**: 565,70 M m³/ano biogás total
4. **Jaboticabal**: 494,87 M m³/ano biogás total
5. **Rancharia**: 482,88 M m³/ano biogás total
6. **Novo Horizonte**: 446,88 M m³/ano biogás total
7. **São Paulo**: 410,40 M m³/ano biogás total (**401,28 M m³/ano RSU urbano**)
8. **Valparaíso**: 396,16 M m³/ano biogás total
9. **Itápolis**: 387,50 M m³/ano biogás total
10. **Batatais**: 376,97 M m³/ano biogás total

### 4.3 Parâmetros Físico-Químicos da Tabela `residuos` no Supabase
| Código Supabase | Nome do Resíduo | BMP Médio (NmL/gVS) | TS Médio (%) | VS Médio (% de TS) | teor CH₄ (%) | C:N Ratio | FC Médio | FCP Médio | FS Médio | FL Médio |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `bagaco_cana` | Bagaço de Cana-de-Açúcar | 250,0 | 51,0 % | 89,8 % | 62 % | 78 | 0,95 | 1,00 | 0,90 | 0,90 |
| `torta_filtro` | Torta de Filtro | 350,0 | 27,0 % | 72,5 % | 62 % | 19 | 0,95 | 0,67 | 0,90 | 0,90 |
| `vinhaca_cana` | Vinhaça de Cana | 300,0 | 3,3 % | 73,5 % | 75 % | 30 | 0,95 | 0,85 | 0,90 | 0,90 |
| `palha_cana` | Palha de Cana-de-açúcar | 200,0 | 70,0 % | 80,0 % | 58,5 % | 60 | 0,85 | 0,90 | 0,90 | 0,85 |
| `forsu_ur_rsu` | Fração Orgânica RSU | 410,0 | 20,0 % | 17,0 % | 58 % | 22 | 0,90 | 0,65 | 0,90 | 0,80 |
| `mucilagem_cafe` | Mucilagem de Café | **804,0** | 5,0 % | 4,8 % | 62 % | 8 | 0,85 | 0,55 | 0,80 | 0,70 |
| `soro_queijo` | Soro de Queijo | **820,0** | 11,6 % | 10,7 % | 59 % | 18 | 0,75 | 0,60 | 0,95 | 0,65 |
| `gordura_sebo` | Gordura e Sebo | 700,0 | 96,0 % | 94,0 % | 77 % | 150 | 0,80 | 0,75 | 0,95 | 0,75 |
| `lodo_primario_ete` | Lodo Primário ETE | 230,0 | 4,0 % | 3,2 % | 64 % | 13.6 | 0,85 | 0,75 | 0,95 | 0,90 |
| `lodo_secundario_ete`| Lodo Secundário ETE | 190,0 | 4,0 % | 2,9 % | 65 % | 8 | 0,82 | 0,70 | 0,95 | 0,85 |
| `cama_aviario` | Cama de Aviário | 275,0 | 72,5 % | 65,0 % | 58 % | 11 | 0,80 | 0,50 | 0,90 | 0,75 |
| `dejetos_suinos_liquidos` | Dejetos Suínos Líquidos | 210,0 | 4,2 % | 3,5 % | 62 % | 13 | 0,90 | 0,55 | 0,95 | 0,75 |

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
| **6** | `DEJETOS_AVES` | IBGE PPM (Tabela 3939 - Poedeiras) | `efetivo_galinhas_poedeiras` $\times 0{,}035 \text{ t dejeto/cab/ano}$ | ~200 municípios (Bastos/Descalvado) | **Médio** (separar poedeiras de postura em gaiola) |
| **7** | `LODO_PRIMARIO` | SNIS Água e Esgoto / CETESB | `volume_esgoto_tratado_m3` $\times 0{,}15 \text{ kg SS/m}^3$ | 645 municípios de SP | **Médio** (join de dados SNIS ETE por código IBGE) |
| **8** | `LODO_SECUNDARIO` | SNIS Água e Esgoto / CETESB | `volume_esgoto_tratado_m3` $\times 0{,}10 \text{ kg SS/m}^3$ | 645 municípios de SP | **Médio** (join de dados SNIS ETE por código IBGE) |
| **9** | `GORDURA` | ABRELPE / Cadastro CIESP | `volume_caixa_gordura_m3` | RMs de SP | **Alto** (sem cadastro municipalizado padronizado) |
| **10** | `SANGUE` | MAPA / SIF / SISP Abatedouros | `cabecas_bovinos_suinos_abatidas` $\times 15 \text{ L/cab}$ | ~80 municípios com SIF | **Médio** (base de abate inspecionado por município) |
| **11** | `VISCERAS` | MAPA / SIF / SISP Abatedouros | `cabecas_abatidas` $\times 25 \text{ kg/cab}$ | ~80 municípios com SIF | **Médio** (base SIF) |
| **12** | `LEVEDURA` | UNICA / ANP Produção de Etanol | `producao_etanol_m3` $\times 0{,}02 \text{ t levedura/m}^3$ | ~170 municípios | **Baixo** (associar diretamente à produção de etanol) |
| **13** | `CASCA_EUCALIPTO` | IBGE PEVS (Silvicultura) | `area_eucalipto_ha` ou `volume_madeira_m3` | ~250 municípios | **Baixo** (dados municipais do PEVS disponíveis)

---

## 6. Conclusão Diagnóstica e Parada

1. **Identificação de Conservadorismos**: Mapeado o impacto do $FS$ sobre a base anual (+12,48% se $FS=1,00$), a sobreposição de restrições nos 5 menores feedstocks e o conservadorismo de rota VS vs DQO (+20% a +38% em vinhaça, suínos e leiteiro).
2. **Evidências Empíricas do Supabase**: Tabela de 31 resíduos com BMP/TS/VS/C:N/FDE extraída, Top 10 municípios validado (Barretos 650 M m³, São Paulo 401 M m³ RSU) e alertas legados da tabela `fde_residue_availability` documentados.
3. **NENHUM parâmetro alterado. NENHUM total recalculado.** PARADA ao fim.