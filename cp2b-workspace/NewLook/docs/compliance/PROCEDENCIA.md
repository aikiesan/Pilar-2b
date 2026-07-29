# Procedência dos resultados canônicos

**Estado:** rascunho da seção de métodos · **vigência:** B6-SAZONALIDADE

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

Os parâmetros da conversão energética ficam em
`data/canonical_parameters/energy.yaml`. A rota representada é **cogeração
(CHP)**: ηel=0,40 e ηth=0,45 pertencem à mesma máquina e geram eletricidade e
calor útil simultaneamente; não são alternativas. O upgrading a biometano
(recuperação 0,97) é uma rota separada da CHP. O JSON grava também o SHA-256
desse arquivo energético.

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

`biomassa bruta × FC × FCo × FL`.

- **FC — coleta:** parcela fisicamente recolhida ou acessível, sustentada por
  prática/setor ou dado medido.
- **FCo — concorrência:** parcela restante após usos concorrentes documentados.
- **FL — logística:** parcela transportável sob restrição física/energética.

O antigo FS foi removido do produto. A sazonalidade passa a ser descrita por
`availability_profile`, com janela mensal, dias efetivos, estocabilidade, limite
de armazenamento, ponto de disponibilidade e fonte. Esse atributo distribui o
CH₄ anual no tempo e informa dimensionamento; não multiplica a massa anual.

Na ausência da evidência exigida, o fator deve ser não parametrizado, nunca
preenchido para aproximar um total desejado. As regras completas estão em
`docs/data/POLITICA_FATORES.md`.

## Suficiência do corpus BMP

O critério de projeto é: `sufficient` para ao menos três observações;
`insufficient` para uma ou duas; `none` quando não há observação. Como o agregado
está em quarentena, esses rótulos são limitações históricas e não autorizam
reparametrização.

- **Insuficiente:** CAMA_AVIARIO, CASCAS_CITROS, POLPA_CAFE, CASCA_CAFE,
  DEJETOS_AVES, GORDURA e PALHA_SOJA (n=1).
- **Sem cobertura:** CASCA_SOJA, DEJETOS_BOVINO, ESTERCO_BOVINO,
  ESTERCO_BOVINO_CORTE, MUCILAGEM_CAFE, ORGANICO_RSU, PODA_URBANA e SANGUE.

O B4 **corrige o documento, sem reverter as atribuições diretas** já presentes
no YAML: ESTERCO_SUINO tem n=10 por sinonímia com DEJETOS_SUINO;
PALHA_SOJA tem n=1 por atribuição direta; e ESTERCO_BOVINO_LEITEIRO tem n=6
por sinonímia com ESTERCO_BOVINO_FRESCO. Nesta última, a atribuição registra a
correção de base de sólidos totais (TS) entre esterco fresco de curral e a
atividade de vacas em ordenha. O agregado ESTERCO_BOVINO e
ESTERCO_BOVINO_CORTE continuam `none`. Como todos esses blocos de corpus seguem
em quarentena, a reconciliação é documental e não autoriza reparametrização.

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
| PODA_URBANA | `coverage:none`; não instanciada e camada removida da interface pública no B4 |
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
externo. De `cd039da` até B4, `feedstocks.yaml` permaneceu no SHA-256
`ea1f23b52ff4eb37703271df2cb4771dcc8aec0e14ed97449b88860180b07e48`.
O B5 realiza a única e última alteração paramétrica posterior: muda
exclusivamente FS para 1,00 nos 15 subfluxos instanciados, reconciliando a
operação com atividades anuais, e produz o SHA-256
`a18c23e555c5c3477e07bb27eb210b7972adb80d4a546c1fc0b8ae6a73f3f412`.
O B6 remove esse multiplicador identidade e acrescenta apenas perfis temporais
não multiplicativos, produzindo o SHA-256 registrado no resultado canônico.
FC, FCo, FL, BMP, TS, VS, atividade e rota VS/BMP permanecem intocados. Esta
declaração é limitada a esse intervalo: a auditoria A8 preserva separadamente a
coincidência cronológica de alterações mais antigas com comparações externas,
sem inferir causalidade.

## Limitações declaradas

SNIS 2022 fornece CO111 para parte dos municípios; os demais usam fallback
populacional marcado por município. ES006 não cobre todos os 645. Lodos usam
conversão explícita de volume tratado para massa seca e depois para base úmida.
PODA_URBANA não é instanciada. Cobertura, contagens, conversões e validações
vigentes são emitidas pelo mesmo comando que gera `canonical_results.json`.

As bandas `min`/`medio`/`max` são **extremos determinísticos acoplados dos
parâmetros**: cada execução aplica conjuntamente o conjunto inferior, central
ou superior. Elas não são propagação estatística, quantis, intervalos de
confiança nem distribuições de probabilidade; correlações e probabilidades dos
parâmetros não são modeladas. Essa é uma limitação explícita. Propagação por
Monte Carlo fica adiada para depois da submissão.

O B5 elimina o desconto temporal de FS sobre bases anuais; o B6 conclui a
separação ao remover FS e representar a sazonalidade como perfil temporal. As
possíveis sobreposições entre FC/FCo/FL da tarefa 2 e a comparação
VS/BMP×DQO da tarefa 3 permanecem apenas na discussão do manuscrito. Os totais
numéricos do A16 pertencem a um baseline anterior e estão superados.
