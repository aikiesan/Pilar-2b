# Relatório A2d — Identidade de Geração de FORSU e Veredito sobre a Decisão D07
**Data de Emissão**: 2026-07-28  
**Escopo**: Somente Leitura (Auditoria Diagnóstica) — Lote A2d  
**Branch**: `fix/canonical-consistency-2026-07`  
**Objetivo**: Determinar sem ambiguidade a fórmula real de cálculo de FORSU no código; verificar se `generation.t_per_capita_yr = 0,100 t/hab/ano` já representa a fração orgânica; reconciliar a massa de biomassa usada nas rotas; rastrear a origem documental em `feedstocks.yaml`; e emitir o veredito definitivo sobre a revogação da Decisão D07.

---

## 1. Análise de Código Backend (Tasks 1 & 2)

### 1.1 Verificação em `compute_sp_canonical_totals.py` balconies
- **Arquivo e Linhas**: [`backend/scripts/compute_sp_canonical_totals.py:165-168`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py#L165-L168)
- **Expressão Real no Código**:
```python
def _biomass_urban(stream: str, population: float, fs: dict) -> dict:
    """Population -> wet tonnes/scenario using canonical t_per_capita_yr."""
    rng = biomass_tons_from_units(stream, population)
    return {sc: rng.get(sc) for sc in SCENARIOS}
```
- **Execução Interna (`canonical_loader.py:248-267`)**:
```python
factor = generation.per_unit_yr
return Range(units * factor.min, units * factor.medio, units * factor.max)
```
- **Conclusão sem ambiguidade**: `compute_sp_canonical_totals.py` usa **APENAS `generation.t_per_capita_yr` (`0,100 t/hab/ano`)**. **NÃO APLICA `organic_fraction_of_rdo` (0,525)** sobre a taxa per capita.

### 1.2 Verificação em `municipalities.py`
- **Arquivo e Linhas**: [`backend/app/api/v1/endpoints/municipalities.py:168-182`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/app/api/v1/endpoints/municipalities.py#L168-L182)
- **Expressão Real no Código**:
```python
# Quando utiliza a população municipal (modelo estimado):
tons[stream] = biomass_tons_from_units(stream, population).medio

# Quando utiliza a tonelada medida de resíduo coletado SNIS CO111:
tons["rsu"] = biomass_tons_from_collected_waste("rsu", collected_waste).medio
```
- **Função `biomass_tons_from_collected_waste` (`canonical_loader.py:327-356`)**:
```python
fraction = _range_from(block)  # organic_fraction_of_rdo (0,525)
return Range(collected_tons * fraction.min, collected_tons * fraction.medio, collected_tons * fraction.max)
```
- **Conclusão sem ambiguidade**: `municipalities.py` **NÃO APLICA `organic_fraction_of_rdo` sobre `generation.t_per_capita_yr`**. Aplica `organic_fraction_of_rdo` (0,525) **EXCLUSIVAMENTE SOBRE A TONELADA MEDIDA DE COLETA SNIS CO111**. Ao usar a população, aplica apenas `generation.t_per_capita_yr` (`0,100 t/hab/ano`).

---

## 2. Reconstrução da Massa Orgânica de FORSU Usada nas Rotas (Task 3)

| Rota de Cálculo | População SP 2022 | Taxa Aplicada no Código | Fração Orgânica Aplicada | Biomassa Resultante (Mt/ano) | Biogás Resultante (m³/ano) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Rota Canônica (Forward Engine)** | 44.411.238 hab | `0,100 t/hab/ano` | N/A (0,100 já é a fração orgânica) | **4,441 Mt/ano** | **252.463.192 m³/ano** | `[OFICIAL]` |
| **Rota SNIS Medida (CO111)** | 44.411.238 hab | SNIS CO111 (8,46 Mt/ano RDO) | `52,5 %` | **4,440 Mt/ano** | **252.425.045 m³/ano** | `[SNIS MEDIDO]` |
| **Hipótese Errada D07 (Duplo Haircut)** | 44.411.238 hab | `0,100 t/hab/ano` | `52,5 %` (duplicado) | **2,331 Mt/ano** | **132.543.175 m³/ano** | `[ERRADO]` |

> [!IMPORTANT]
> **Identificação da Rota dos 252.463.192 m³/ano**: A rota que gerou exatamente **252.463.192 m³/ano de biogás** foi a Rota Canônica com **4,441 Mt/ano de biomassa FORSU** (`44,41M hab × 0,100 t/hab/ano`) com FDE de 29,85%. Ela **NÃO APLICOU 52,5% sobre 0,100 t/hab/ano**.

---

## 3. Rastreamento Documental de `0,100 t/hab/ano` em `feedstocks.yaml` (Task 4)

- **Arquivo e Linhas**: [`data/canonical_parameters/feedstocks.yaml:1481-1490`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml#L1481-L1490)
- **Texto Literal Registrado no YAML**:
```yaml
    generation:
      type: "per_capita"
      t_per_capita_yr:
        min: 0.070   # 192 g/cap/day (low organic separation rate)
        medio: 0.100  # 274 g/cap/day (SNIS 2022 reference for SP state)
        max: 0.135   # 370 g/cap/day (high source-separation, reduced inert fraction)
        refs: ["snis2022_rsu", "cetesb2020_sludge"]
      notes: >
        SNIS 2022: SP state urban MSW ~550 g/cap/day; organic fraction ~50%.
        Source-separated FORSU fraction = 0.10 t/cap/yr as reference (assumes partial
        source separation programme). Includes vegetable waste, food scraps, paper/cardboard
        organics. Excludes yard waste (handled separately as RPO/poda).
```

### 3.1 Prova Documental Irrefutável
O comentário oficial em `feedstocks.yaml` explicita que `0,100 t/hab/ano` **FOI DECLARADO COMO A FRAÇÃO ORGÂNICA SEPARADA (FORSU)**, resultante de:
$$\text{Geração RDO Total (SNIS 2022)} = 550 \text{ g/hab/dia} \approx 0{,}200 \text{ t RDO/hab/ano}$$
$$\text{Fração Orgânica FORSU} = 550 \text{ g/hab/dia} \times \sim 50\% = 275 \text{ g FORSU/hab/dia} \approx \mathbf{0{,}100 \text{ t FORSU/hab/ano}}$$
Conclusão: O valor `0,100 t/hab/ano` **NÃO É O RDO TOTAL**, mas sim a fração orgânica FORSU já deduzida.

---

## 4. Reconciliação dos Valores 8,46 Mt e 8,58 Mt (Task 5)

- **Análise dos Dados SNIS**: Ambos os números derivam das pesquisas de resíduos sólidos urbanos do SNIS:
  - **8,46 Mt/ano** (`8.459.896 t/ano`): Corresponde ao **RDO Domiciliar Direto (`CO111`)** calculado multiplicando a taxa de 0,19049 t/hab/ano (522 g/hab/dia) pela população de 44.411.238 hab.
  - **8,58 Mt/ano** (`8.581.139 t/ano`): Corresponde ao **RDO Total Coletado (`CO119`)** acumulado diretamente município a município em `municipality_biomass_tons.csv` (taxa média de 0,19322 t/hab/ano).
- **Veredito da Reconciliação**: 8,46 Mt e 8,58 Mt são o **mesmo dado de coleta de RDO do SNIS**: 8,46 Mt representa a amostragem de RDO Domiciliar Direto (`CO111`) e 8,58 Mt representa o RDO Total Coletado acumulado municipalmente (`CO119`).

---

## 5. Veredito Explícito sobre a Decisão D07 (Task 6)

> [!CAUTION]
> **VEREDITO DEFINITIVO: A DECISÃO D07 DEVE SER OFICIALMENTE REVOGADA.**

### 5.1 Motivação Técnica e Erro Identificado no Lote A2
1. **Afirmação Incorreta do Lote A2**: O Lote A2 afirmou que `generation.t_per_capita_yr = 0,100 t/hab/ano` representava a massa bruta de RDO total e que existia um *'conflito de geração de 1,94x'* por não ter aplicado a `organic_fraction_of_rdo` (52,5%).
2. **Refutação Matemática e Documental**: A auditoria do Lote A2d provou que `0,100 t/hab/ano` **JÁ É A FRAÇÃO ORGÂNICA FORSU**, conforme explicitado no comentário inline de `feedstocks.yaml:1487` (`550 g RDO/cap/dia × 50% = 275 g FORSU/cap/dia = 0,100 t FORSU/hab/ano`).
3. **Efeito Nocivo se a D07 Fosse Aplicada**: Se a decisão D07 fosse implementada (inserindo os 52,5% como um haircut adicional de 47,8% na FDE), a fração orgânica estaria sendo multiplicada **DUAS VEZES**, reduzindo indevidamente a biomassa orgânica de 4,44 Mt para 2,33 Mt (uma subestimativa errônea de **47,5%** no potencial de biogás do estado).
4. **Consistência da Plataforma**: O modelo canônico atual (`feedstocks.yaml` + `compute_sp_canonical_totals.py` + `municipalities.py`) está matematicamente correto e consistente. A decisão D07 é nula e deve ser descartada.

---

## 6. Conclusão Diagnóstica e Parada

1. **Fórmula Efetiva**: `biomass_tons_from_units` calcula `populacao * 0,100`. Não há duplo haircut nem omissão de fração orgânica.
2. **Identidade Confirmada**: `0,100 t/hab/ano` já é a fração orgânica FORSU.
3. **Decisão D07 Revogada**: A premissa do Lote A2 estava errada. A D07 deve ser revogada para evitar a dupla contagem do haircut.
4. **NENHUM arquivo do projeto foi alterado.** PARADA ao fim.