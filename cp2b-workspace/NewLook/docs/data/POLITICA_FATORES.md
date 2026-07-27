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
- **Definição**: Fração adimensional $[0{,}0 \text{ a } 1{,}0]$ que reflete a distribuição cronológica da oferta ao longo dos 365 dias do ano.
- **Insumo Exigido**: Calendário oficial de safra agrícola ou regime cronológico de operação industrial/pecuária.
- **Unidade**: Adimensional (dias operacionais / 365 dias).
- **Regra na Ausência de Fonte**: Para atividades contínuas urbanas/pecuárias permanentes, $FS = 1{,}00$. Para safras sem calendário citado, declarar como **NÃO PARAMETRIZADO**.

### 2.4 Fator Logístico (FL)
- **Definição**: Fração adimensional $[0{,}0 \text{ a } 1{,}0]$ que representa a viabilidade de transporte do resíduo sem perda do balanço energético líquido (EROEI > 1).
- **Insumo Exigido**: Densidade da biomassa in natura ($kg/m^3$) e raio máximo de transporte econômico e operacional.
- **Unidade**: Adimensional.
- **Regra na Ausência de Fonte**: Declarar como **NÃO PARAMETRIZADO**.
