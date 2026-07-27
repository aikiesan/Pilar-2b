# Procedência dos resultados canônicos

**Estado:** rascunho da seção de métodos · **vigência:** B3-CONSOLIDA

## Cadeia de cálculo e publicação

```text
data/canonical_parameters/feedstocks.yaml
        ↓ canonical_loader.py + biogas_forward.py
atividade municipal (PAM/PPM/SNIS 2022 + fallbacks declarados)
        ↓ canonical_municipality.py
backend/scripts/compute_sp_canonical_totals.py
        ↓ execução única e guard contra baseline
docs/data/canonical_results.json
        ↓ leitura em tempo de consulta / marcadores validados no CI
API, mapa, export, comparador, cards, README, documentação e manuscrito
```

`feedstocks.yaml` é a fonte de parâmetros. O pipeline combina esses parâmetros
com atividade municipal, cria uma instância por município e feedstock e só então
agrega biomassa, CH₄, biogás, biometano e energia. O JSON grava o SHA-256 exato
do YAML consumido. As superfícies públicas usam `canonical_municipality.py` e
`map_metrics.py`; snapshots SQL históricos não são fontes publicáveis.

O gate `scripts/validate_canonical_consistency.py` extrai todas as folhas
numéricas do JSON. Afirmações publicadas referenciam o caminho da folha com
`{{canonical:caminho|scale=escala|precision=casas}}`. <!-- canonical-ignore: sintaxe ilustrativa --> A tolerância absoluta
máxima é `1e-6` e a relativa declarada é `1e-9`; relatórios históricos ficam
fora do gate apenas por exclusão nominativa e justificada.

## Política de parametrização

### BMP

BMP descreve o potencial bioquímico de metano em mono-digestão mesofílica de
substrato não pré-tratado. `bmp.medio` deve vir de referências primárias
compatíveis com essa base experimental; co-digestão e pré-tratamento podem
informar a banda, não deslocar o centro. Um benchmark estadual nunca é entrada
paramétrica. A antiga Regra R2 está suspensa pela DEC-007.

### Fatores de disponibilidade

A biomassa mobilizável é calculada, sem fator oculto, por:

`biomassa bruta × FC × FCo × FS × FL`.

- **FC — coleta:** parcela fisicamente recolhida ou acessível, sustentada por
  prática/setor ou dado medido.
- **FCo — concorrência:** parcela restante após usos concorrentes documentados.
- **FS — sazonalidade:** fração temporal de oferta; atividades urbanas ou
  pecuárias contínuas podem usar 1, desde que a continuidade seja declarada.
- **FL — logística:** parcela transportável sob restrição física/energética.

Na ausência da evidência exigida, o fator deve ser não parametrizado, nunca
preenchido para aproximar um total desejado. As regras completas estão em
`docs/data/POLITICA_FATORES.md`.

## Suficiência do corpus BMP

O critério de projeto é: `sufficient` para ao menos três observações;
`insufficient` para uma ou duas; `none` quando não há observação. Como o agregado
está em quarentena, esses rótulos são limitações históricas e não autorizam
reparametrização.

- **Insuficiente:** CAMA_AVIARIO, CASCAS_CITROS, POLPA_CAFE, CASCA_CAFE,
  DEJETOS_AVES e GORDURA.
- **Sem cobertura:** CASCA_SOJA, DEJETOS_BOVINO, ESTERCO_BOVINO,
  ESTERCO_BOVINO_CORTE, ESTERCO_BOVINO_LEITEIRO, ESTERCO_SUINO,
  MUCILAGEM_CAFE, ORGANICO_RSU, PALHA_SOJA, PODA_URBANA e SANGUE.

## Parametrizados e não instanciados

Estes códigos existem no catálogo, mas não entram no resultado vigente:

| Código | Motivo |
|---|---|
| CASCAS_CITROS, POLPA_CAFE, MUCILAGEM_CAFE | sem campo de atividade municipal mapeado |
| CASCA_SOJA, CASCA_MILHO | sem campo de atividade municipal mapeado no inventário vigente |
| DEJETOS_AVES | atividade avícola representada por CAMA_AVIARIO |
| ESTERCO_BOVINO | agregado substituído pela divisão corte/leite |
| DEJETOS_BOVINO, ESTERCO_SUINO | sem campo de atividade municipal mapeado |
| ORGANICO_RSU | rota alternativa excluída; FORSU usa CO111 e fallback explícito |
| PODA_URBANA | `coverage:none`; exclusão deliberada |
| GORDURA, SANGUE | sem campo de atividade municipal mapeado |

A lista legível por máquina e o motivo individual estão em
`canonical_results.json.parameterized_not_instantiated`.

## Quarentena

`data/quarantine/feedstock_bmp_from_refs.csv` e os 28 blocos `bmp.corpus` do YAML
estão marcados `quarantined_unversioned_source`. O agregado declara observações
que não estão versionadas individualmente, não possui gerador reproduzível e
não liga observação, condição experimental, unidade e referência. É preservado
para perícia, mas proibido como entrada de produção pela DEC-007.

Também permanecem fora da publicação os snapshots
`residue_streams_sp2023`/colunas municipais legadas: servem à reconstrução
histórica, não ao cálculo em tempo de consulta.

## Independência de alvos externos

Nenhum parâmetro foi movido para compensar a regressão B2 ou aproximar benchmark
externo. O intervalo Git **`cd039da..commit B3-CONSOLIDA`** não altera
`data/canonical_parameters/feedstocks.yaml`; o arquivo consumido conserva
SHA-256 `ea1f23b52ff4eb37703271df2cb4771dcc8aec0e14ed97449b88860180b07e48`,
gravado também no JSON. O B2 alterou código, atividade medida e procedência,
mantendo o catálogo fixo. Esta declaração é limitada a esse intervalo: a
auditoria A8 preserva separadamente a coincidência cronológica de alterações
mais antigas com comparações externas, sem inferir causalidade.

## Limitações declaradas

SNIS 2022 fornece CO111 para parte dos municípios; os demais usam fallback
populacional marcado por município. ES006 não cobre todos os 645. Lodos usam
conversão explícita de volume tratado para massa seca e depois para base úmida.
PODA_URBANA não é instanciada. Cobertura, contagens, conversões e validações
vigentes são emitidas pelo mesmo comando que gera `canonical_results.json`.
