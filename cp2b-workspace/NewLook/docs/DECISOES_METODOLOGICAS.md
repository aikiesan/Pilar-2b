# Decisões metodológicas — PILAR-2b

Registro das decisões que não são deriváveis do código. Cada entrada é datada e rastreável.

---

## 2026-08-08 — Uma equação, dois conjuntos de parâmetros que calculam, um catálogo, três cenários

**Contexto:** existiam três parametrizações de disponibilidade no repositório, confundidas como candidatas ao mesmo papel. Não são. São três coisas com funções distintas (Aventura B; auditoria em `docs/auditorias/B_reexpressao_fde_2026-08-08.md`).

**Equação única de disponibilidade** (Seção 2.3 do manuscrito):

    volume_mobilizável = volume_teórico × FDE ,  onde  FDE = FC × FCo × FS × FL

- **FC** — eficiência técnica de coleta.
- **FCo** — fração remanescente após usos concorrentes.
- **FS** — disponibilidade sazonal relativa à geração anual.
- **FL** — restrições logísticas/de transporte.

### Os três conjuntos e seus papéis

| Conjunto | Tabela/artefato | Nível | Alimenta cálculo? | Cenário | Papel no artigo |
|---|---|---|---|---|---|
| **B** (por fluxo) | `data/canonical_parameters/fde_flow_factors.csv` | 15 fluxos | **Sim** — produz Real e Ideal | **Real** (7.832.143.834) e **Ideal** (9.841.178.207) | **Apêndice** — única tabela que reproduz um número publicado, ao dígito |
| **1** (por substrato, `residuos`) | tabela `residuos` (fc/fcp/fs/fl_medio) | ~substratos | Sim — via `sp_fde_cascade.py` | **Conservative** (~3,301 bi, 16,59% do teórico) | Tabela de sensibilidade, rotulada por modelo |
| **3** (catálogo por substrato) | tabela `fde_residue_availability` (Tabela A1) | 30 substratos | **Não** — nenhum cenário a consulta | — | **Fora do artigo**; fica no depósito como camada de catálogo declarada |

**Decisões:**

1. **O Apêndice do artigo documenta o conjunto B** (derivado em `sp_scenarios_real_ideal.py`, reexpresso em `fde_flow_factors.csv`): 15 linhas de fluxo, FC/FCo com termo de origem, FS e FL, tier real e ideal, `provenance_class`. É a única tabela que reproduz um número publicado.

2. **O conjunto 3 (`fde_residue_availability` / Tabela A1) sai do artigo.** Ele documenta uma tabela que nenhum cenário publicado consulta; um revisor não reproduz nada a partir dele. A nota ᵇ da versão anterior descrevia o conjunto B sobre linhas do conjunto 3 — inconsistência removida. Permanece no depósito como catálogo, sem alegação de gerar resultado.

3. **O conjunto 1 (`residuos`) é a tabela do cenário Conservative**, em seção de sensibilidade, rotulada pelo modelo. Ressalva medida: o Conservative **não é piso para RSU** (464 M > 398 M do Real) e é **indefinido para esgoto** (sem coluna teórica decomposta).

4. **As três tabelas não se reconciliam entre si porque não são a mesma coisa.** Não harmonizar números; rotular cada tabela pelo modelo a que pertence.

### Achados que entram como texto

- **FS = FL = 1,00 em todos os 15 fluxos do conjunto B.** O método Atlas não modela sazonalidade nem logística — só FC e FCo. Declarar nas Limitações. Isto **derruba** a alegação (não verificada) de FS = 0,63 canavieiro contra FS = 1,0 urbano.
- **15 linhas de fluxo, 13 colunas setoriais municipais.** Usar 15 no Apêndice (fluxos com FDE distinto) e 13 na agregação municipal, com a diferença explicada uma vez. A cana é 3 substreams (vinhaça FDE 1,00 · torta 1,00 · palha 0,40/0,50).
- **Vinhaça: a diferença Real/Ideal é conversão (CH₄ 0,50→0,65), não disponibilidade.** FDE da vinhaça = 1,00 nos dois tiers.
- **Resíduos de arredondamento:** o agregado é `soma dos fluxos não arredondados, arredondada uma vez` (método do gerador). `Arredondar-por-fluxo-e-somar` introduz +1 Nm³ no Ideal. A tabela delta usa a agregação do gerador; o teste real é o delta por fluxo (todos zero).

### Regras de cálculo (registradas 2026-08-08)

- **Agregação: somar sem arredondar, arredondar uma vez.** O total publicável é `round(Σ valores_não_arredondados)`. `Arredondar-por-fluxo-e-somar` introduz +1 Nm³ no Ideal (9.841.178.208 vs 9.841.178.207). O gerador de estado já soma sem arredondar; a carga municipal grava floats por fluxo e o total do banco é `SUM(...)` sobre floats — as duas rotas respeitam a regra. A tabela delta usa esta agregação; o teste decisivo é o delta **por fluxo**.
- **Causa-raiz da fragilidade: constantes duplicadas.** `sp_scenarios_real_ideal.py` (estado) e `load_scenarios_real_ideal.py` (por município → banco) carregam **cópias independentes** dos mesmos fatores (BIOGAS_M3_POR_M3_ETANOL, CH4_VINHACA, PALHA_FRACAO, KG_ESTERCO_DIA, RSU_*, ESGOTO_*, BMP/VS). Uma edição em um e não no outro dessincroniza estado e município silenciosamente. "Um formalismo" exige que **os dois** leiam `fde_flow_factors.csv`; enquanto não lerem, qualquer mudança de fator tem de ser aplicada nos dois arquivos e verificada pelos dois portões (estado + 645 municípios).

### provenance_class — três valores, batendo com a coluna `source` de Parametros_Atlas

Aba `Parametros_Atlas` em `PILAR2b_SP_verificacao_por_municipio_v2.xlsx`. Classificação por fluxo em `fde_flow_factors.csv`:

| provenance_class | Critério (source) | Fluxos |
|---|---|---|
| `atlas_sourced` | source = Atlas de Bioenergia SP (2020) | vinhaça, torta de filtro, palha de cana, RSU (coleta p.90 + MO Eq V.5) |
| `pilar_derived` | source = husbandry literature / SP sewage collected-generated | bovinos, suínos, aves (FC de KG_ESTERCO_DIA), esgoto (coleta 0,905) |
| `inherited_assumed` | source = assumed (Atlas cane-straw analogy p.65) | milho, soja, silvicultura, aquicultura, citros, café, poda urbana |

FC de pecuária (8/12, 6/9, 0,025/0,035) e coleta de esgoto (0,905) são **`pilar_derived`, não Atlas** — confirmado contra a coluna `source` da aba. Fatores de conversão (BMP, VS, CH₄, DQO, EF_REM, per-capita) não são fatores de disponibilidade e não entram nesta tabela por fluxo.
