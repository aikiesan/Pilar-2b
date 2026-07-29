# Política Metodológica de Parametrização de Fatores FDE (POLITICA_FATORES.md)
**Data de Emissão**: 2026-07-30  
**Escopo**: Regra de Governança Paramétrica — Lote B1-PILOT  
**Branch**: `fix/canonical-consistency-2026-07`  
---

## 1. Diretriz de Governança
Esta política estabelece os critérios obrigatórios para a atribuição dos três componentes multiplicativos do Fator de Disponibilidade e Eficiência (FDE), do atributo não multiplicativo de disponibilidade temporal e do Potencial Bioquímico de Metano (BMP) na plataforma PILAR-2b.
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

### 2.3 Disponibilidade temporal (`availability_profile`)
- **Natureza**: atributo descritivo, não multiplicativo. Registra
  `window_months`, `days_available_yr`, `storable`, `max_storage_days`,
  `point_of_availability` e a fonte da janela.
- **Interpretação**: PAM, PPM e SNIS fornecem massas anuais já integradas.
  Sazonalidade redistribui essa massa no calendário e afeta vazão instantânea,
  armazenamento e dimensionamento; não reduz o potencial anual.
- **FS removido**: o componente histórico `fde.components.fs` foi retirado do
  catálogo e do motor no B6. Após o B5 todos os seus valores eram 1,00, isto é,
  um multiplicador identidade. Mantê-lo sugeriria falsamente que dias de
  safra/365 devem descontar uma base anual.
- **Estocagem**: `storable` informa se o fluxo pode atravessar parte da
  entressafra; `max_storage_days` é obrigatório quando verdadeiro. Perdas de
  estocagem não são implicitamente descontadas no potencial e exigem modelo
  físico próprio para aplicação futura.
- **Capacidade implícita**: para fluxo não estocável, calcula-se
  `days_available_yr/365`. É métrica de engenharia, nunca fator do potencial.

### 2.4 Fator Logístico (FL)
- **Definição**: Fração adimensional $[0{,}0 \text{ a } 1{,}0]$ que representa a viabilidade de transporte do resíduo sem perda do balanço energético líquido (EROEI > 1).
- **Insumo Exigido**: Densidade da biomassa in natura ($kg/m^3$) e raio máximo de transporte econômico e operacional.
- **Unidade**: Adimensional.
- **Regra na Ausência de Fonte**: Declarar como **NÃO PARAMETRIZADO**.

## 3. Equação vigente

O produto físico de disponibilidade é:

`availability = FC × FCo_available × FL`

e o FDE efetivo permanece `availability × η`. O perfil temporal é aplicado
apenas para distribuir o CH₄ anual entre meses; sua soma deve reproduzir
exatamente o total canônico anual.
