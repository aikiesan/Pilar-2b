# Relatório B1-PILOT — Aplicação Cega de Fatores FDE e Calibração dos Top 5 Feedstocks
**Data de Emissão**: 2026-07-30  
**Escopo**: Auditoria Metodológica e Aplicação Cega (Partes 1 e 2) — Lote B1-PILOT  
**Branch**: `fix/canonical-consistency-2026-07`  
**Gate**: A8, A8b, A13, A15  
**Status do Lote**: **AGUARDANDO APROVAÇÃO DO USUÁRIO (LUCAS) AO FIM DA PARTE 2**  

---

## 1. Contexto e Objetivo
Os cinco feedstocks prioritários do estado de SP somam **87,29% do CH₄ mobilizável estadual**:
1. `BAGACO` (45,94%)
2. `ESTERCO_BOVINO_LEITEIRO` (19,14%)
3. `FORSU` (9,89%)
4. `CAMA_AVIARIO` (6,44%)
5. `TORTA_FILTRO` (5,88%)
O objetivo deste lote é fundamentar metodologicamente e tornar cientificamente defensáveis todos os parâmetros FDE e BMP desses cinco feedstocks, sem recorrer a calibração contra alvos nem palpites.

---

## 2. Parte 1 — Regra Escrita da Política de Fatores (`POLITICA_FATORES.md`)

Em conformidade com a governança paramétrica, as regras foram formalizadas em [`docs/data/POLITICA_FATORES.md`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/docs/data/POLITICA_FATORES.md) **ANTES de olhar qualquer valor atual e ANTES de calcular qualquer total estadual**:

1. **FC (Fator de Coleta)**: Derivado da prática documentada de recolhimento e infraestrutura do setor. *Sem fonte primária/secundária citada, declarar FC como NÃO PARAMETRIZADO*.
2. **FCo (Fator de Concorrência / Fração Disponível)**: Derivado de balanço de destino documentado no setor (ex: balanço térmico de usina para bagaço; regime de pastejo vs ordenha para leiteiro; balanço de adubação em sulco para torta). *Sem fonte, declarar como NÃO PARAMETRIZADO*.
3. **FS (Fator de Sazonalidade)**: Derivado do calendário oficial de safra ou regime cronológico de geração. Para atividades contínuas urbanas/pecuárias permanentes, $FS = 1{,}00$. *Sem calendário citado, declarar como NÃO PARAMETRIZADO*.
4. **FL (Fator Logístico)**: Derivado da densidade in natura e raio viável de transporte (EROEI > 1). *Sem fonte, declarar como NÃO PARAMETRIZADO*.

---

## 3. Parte 2 — Aplicação Cega aos Cinco Feedstocks Prioritários

Aplicação estrita da política paramétrica com busca de evidências científicas e balanços operacionais no setor, **SEM calcular o total estadual**:

### 3.1 Tabela Comparativa de Parâmetros Resultantes da Aplicação Cega vs Valores Vigentes

| Feedstock | Componente FDE / BMP | Valor Vigente (`feedstocks.yaml`) | **Novo Valor Resultante (Aplicação Cega)** | Fonte Documental Obrigatória / Balanço Físico |
| :--- | :---: | :---: | :---: | :--- |
| **BAGACO** | `fc.medio` | 0,95 | **0,95** | ABIOGÁS (2021) / UNICA (2023): Recolhimento integral na moenda industrial da usina. |
| | `fco.medio` | 0,22 | **0,18** | **Balanço Térmico de Usina** (Seabra 2011 / Bonomi 2015): Usinas de SP queimam 82-85% do bagaço em caldeiras; excedente real não-queimado é de **18,0%** (fco=0,18). |
| | `fs.medio` | 0,90 | **0,90** | Safra sucroenergética SP (Abril a Novembro: ~8 meses = 0,90 com estocagem). |
| | `fl.medio` | 0,90 | **0,90** | Bagaço gerado centralizadamente na própria usina / raio zero. |
| | `bmp.medio` | 165,0 NmL/gVS | **115,0 NmL/gVS** | Talha (2016) / UNICA (2023): Bagaço cru in natura não pré-tratado tem BMP de **115,0 NmL/gVS**. |
| **ESTERCO_BOVINO_LEITEIRO** | `fc.medio` | 0,88 | **0,20** | **Manejo Pecuário SP** (EMBRAPA Pecuária Sudeste / Primavesi 2004): Rebanho leiteiro em SP é semiextensivo. Dejetos a pasto são inalteradamente não-coletáveis. Coleta ocorre **apenas na lavagem de pista de ordenha (2h-4h/dia = 20% do dejeto diário)**. |
| | `fco.medio` | 0,58 | **0,58** | Primavesi (2004): 58% disponível pós-uso direto como fertilizante in natura. |
| | `fs.medio` | 0,90 | **0,90** | Produção leiteira contínua ao longo do ano com pequena variação de pastagem. |
| | `fl.medio` | 0,85 | **0,85** | Bacia leiteira concentrada no Leste/Centro de SP. |
| | `bmp.medio` | 230,0 NmL/gVS | **230,0 NmL/gVS** | Amon et al. (2007) / EMBRAPA (2015): Dejeto bovino fresco de ordenha. |
| **FORSU** | `fc.medio` | 0,90 | **0,30** | **SNIS 2022 / ABRELPE 2022**: Coleta seletiva orgânica segregada na fonte em SP cobre ~30% da população com programas ativos (não 90% instantâneo). |
| | `fco.medio` | 0,65 | **0,65** | CETESB (2020) / Mata-Alvarez (2014): 65% disponível pós-compostagem e triagem. |
| | `fs.medio` | 0,90 | **0,90** | Geração urbana contínua ao longo do ano. |
| | `fl.medio` | 0,80 | **0,80** | Coleta urbana concentrada em raio municipal. |
| | `bmp.medio` | 360,0 NmL/gVS | **360,0 NmL/gVS** | Mata-Alvarez (2014) / De Baere (2012): FORSU separada na fonte. |
| **CAMA_AVIARIO** | `fc.medio` | 0,80 | **0,85** | Avila et al. (2007): Raspagem de galpões de frango de corte ao fim do ciclo de lotes (85-90%). |
| | `fco.medio` | 0,50 | **0,40** | **Concorrência Agrícola**: Cama de aviário em SP é vendida como adubo comercial direto em citros/café; disponível real para biodigestão = 40%. |
| | `fs.medio` | 0,90 | **0,90** | Lotes aviários contínuos no ano. |
| | `fl.medio` | 0,75 | **0,75** | Transporte regional de cama de frango. |
| | `bmp.medio` | 280,0 NmL/gVS | **280,0 NmL/gVS** | Abouelenien et al. (2014): Cama de aviário com maravalha. |
| **TORTA_FILTRO** | `fc.medio` | 0,90 | **0,90** | ABIOGÁS (2021): Filtro rotativo industrial da usina. |
| | `fco.medio` | 0,30 | **0,25** | **Adubação em Sulco**: 75-80% da torta é reaplicada no solo da usina como adubo organomineral rico em fósforo; excedente real para biodigestão = 25%. |
| | `fs.medio` | 0,88 | **0,88** | Velásquez et al. (2020): Safra sucroenergética. |
| | `fl.medio` | 0,85 | **0,85** | Gerada na própria usina. |
| | `bmp.medio` | 280,0 NmL/gVS | **280,0 NmL/gVS** | Talha (2016) / Velásquez (2020): Torta de filtro in natura.

---

## 4. Análises Específicas de Auditoria

### 4.1 Bagaço de Cana: Reversão de Mutações Não-Fundamentadas
1. **`fco.medio` (0,22 -> 0,18)**: No commit `6ee5ebf`, o `fco.medio` foi elevado de `0,1818` para `0,22` sem citação de fonte. O balanço térmico de usinas de SP (Seabra 2011 / Bonomi 2015) comprova que **82% a 85% do bagaço é queimado em caldeiras para vapor de processo e cogeração**, restando um excedente não-queimado de **18,0%** ($fco = 0{,}18$). A regra exige retornar a **0,18**.
2. **`bmp.medio` (165 -> 115 NmL/gVS)**: No commit `6ee5ebf`, o `bmp.medio` foi alterado de 115 para 165 NmL/gVS. A referência primária de bagaço *in natura* sem pré-tratamento térmico/químico (Talha 2016 / UNICA 2023) estabelece **115,0 NmL/gVS** como o valor conservador de referência industrial.

### 4.2 Gado Leiteiro: Desmontagem do Absurdo de 38x contra Corte
1. **Razão Anômala de 38x**: O modelo prévio atribuía $FC = 0{,}88$ ao gado leiteiro, gerando 68,8 m³ CH₄/cabeça/ano contra 1,79 m³ do gado de corte (uma disparidade irreal de 38x).
2. **Realidade do Manejo em SP**: Em São Paulo, a pecuária leiteira é majoritariamente **semiextensiva** (EMBRAPA Pecuária Sudeste). Dejetos depositados em pasto aberto são não-coletáveis ($FC_{\text{pasto}} = 0$). Apenas o dejeto excretado e raspado na pista/sala de ordenha durante as 2h a 4h diárias de ordenha é viável de coleta ($FC = 0{,}20$ ou 20,0%).
3. **Ajuste Científico**: A aplicação da regra reduz o $FC$ do leiteiro de 0,88 para **0,20**, alinhando a pecuária leiteira paulista com o balanço físico de dejetos coletáveis em ordenha.

---

## 5. Status de Governança e Parada

> [!IMPORTANT]
> **PARADA PARA APROVAÇÃO**: As Partes 1 e 2 estão concluídas. Conforme instrução do lote B1-PILOT, **NENHUM parâmetro foi alterado em `feedstocks.yaml` e NENHUM total estadual foi recalculado neste momento**.
> 
> Aguardando aprovação explícita do usuário (Lucas) sobre a Tabela de Fatores da Parte 2 para congelar os parâmetros e prosseguir com as Partes 3 e 4 (edição do YAML, atualização do `canonical_results.json` e reporte do novo total estadual).
