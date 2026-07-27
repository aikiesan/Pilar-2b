# Política Metodológica de Parametrização de Fatores FDE (POLITICA_FATORES.md)
**Data de Emissão**: 2026-07-30  
**Escopo**: Regra de Governança Paramétrica — Lote B1-PILOT  
**Branch**: `fix/canonical-consistency-2026-07`  
---

## 1. Diretriz de Governança
Esta política estabelece os critérios obrigatórios para a atribuição dos quatro componentes do Fator de Disponibilidade e Eficiência (FDE) e do Potencial Bioquímico de Metano (BMP) na plataforma PILAR-2b.
Nenhum parâmetro pode ser definido por calibração contra alvos estaduais ou palpites de calibração. Cada componente deve derivar exclusivamente de evidências físicas e balanços operacionais documentados no setor.

---

## 2. Regras por Componente FDE

### 2.1 Fator de Coleta (FC)
- **Definição**: Fração adimensional $[0{,}0 \text{ a } 1{,}0]$ da biomassa ou dejeto gerado fisicamente que é acessível e recolhida pela infraestrutura e prática operacional do setor.
- **Insumo Exigido**: Prática documentada de recolhimento no setor (estudos de manejo animal da EMBRAPA, censos de infraestrutura urbana ABRELPE/SNIS, relatórios operacionais de usinas UNICA).
- **Unidade**: Adimensional ($t_{\text{recolhida}} / t_{\text{gerada}}$ ou $\text{cabeças}_{\text{confinadas}} / \text{rebanho}_{\text{total}}$).
- **Regra na Ausência de Fonte**: Se não houver fonte primária ou secundária citada comprovando a prática de recolhimento, o FC deve ser declarado como **NÃO PARAMETRIZADO** e a confiança classificada como NULA.

### 2.2 Fator de Concorrência e Disponibilidade (FCo)
- **Definição**: Fração adimensional $[0{,}0 \text{ a } 1{,}0]$ do resíduo coletado que permanece fisicamente disponível para biodigestão anaeróbia após deduzidos os usos concorrentes consolidados.
- **Insumo Exigido**: Balanço de destino documentado no setor:
  - *Bagaço de cana*: Balanço térmico e energético de usina (massa queimada em caldeiras para vapor de processo e cogeração elétrica vs. excedente físico real de bagaço sobressalente).
  - *Resíduos pecuários*: Balanço de adubação orgânica in natura e uso direto em solo.
  - *FORSU*: Destinação municipal de resíduos (compostagem vs. digestão anaeróbia).
  - *Torta de filtro*: Aplicação em sulco de plantio de canavial como adubo organomineral.
- **Unidade**: Adimensional ($t_{\text{excedente}} / t_{\text{coletada}}$).
- **Regra na Ausência de Fonte**: Declarar como **NÃO PARAMETRIZADO**.

### 2.3 Fator de Sazonalidade (FS)
- **Definição operacional vigente após B5-FS**: Fração adimensional
  $[0{,}0 \text{ a } 1{,}0]$ da massa anual que permanece aproveitável após
  perdas físico-químicas documentadas por degradação durante a estocagem entre
  geração/colheita e alimentação do digestor. Apesar do nome histórico
  `fs`, o fator **não representa mais dias de oferta/365 nem janela de safra**.
- **Por que a definição mudou**: PAM, PPM e SNIS fornecem atividade anual, já
  integrada ao longo dos 365 dias. Multiplicar essa massa por dias
  operacionais/365 desconta novamente uma produção que já ocorreu.
- **Insumo exigido para $FS<1$**: ensaio ou balanço de massa que relacione
  duração e condição de estocagem à perda de massa seca, sólidos voláteis ou
  potencial metanogênico do mesmo substrato. A fonte deve sustentar cada limite
  `min`/`medio`/`max`.
- **Unidade**: adimensional
  ($t_{\text{aproveitável após estocagem}}/t_{\text{atividade anual}}$).
- **Regra na ausência de fonte específica de estocagem**: $FS=1{,}00$ nos três
  cenários. Calendário de safra, continuidade operacional, feriados, chuva ou
  número de ciclos por ano não são evidência de perda de massa.
- **Capacidade de planta**: limite de processamento durante uma janela de safra
  é uma restrição de dimensionamento, não FS. Deve ser modelado em fator
  próprio ou, quando fisicamente justificado, em logística; não é transferido
  automaticamente para FL.
- **Não sobreposição**: interrupção de coleta/manejo já refletida em FC ou
  dificuldade de transporte já refletida em FL não pode ser descontada outra
  vez em FS.

### 2.4 Fator Logístico (FL)
- **Definição**: Fração adimensional $[0{,}0 \text{ a } 1{,}0]$ que representa a viabilidade de transporte do resíduo sem perda do balanço energético líquido (EROEI > 1).
- **Insumo Exigido**: Densidade da biomassa in natura ($kg/m^3$) e raio máximo de transporte econômico e operacional.
- **Unidade**: Adimensional.
- **Regra na Ausência de Fonte**: Declarar como **NÃO PARAMETRIZADO**.
