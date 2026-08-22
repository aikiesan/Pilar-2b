# Camadas MapBiomas 10.1 no mapa — o que entra, quanto pesa, por quê

**Fonte:** `SHAPEFILES_MAPBIOMAS_10.1` · **Tabela:** `infrastructure_features` (migração 023)
**Carga:** `backend/scripts/load_infrastructure_layers.py` (idempotente)
**API:** `/api/v1/infrastructure/features/{layer_id}/geojson`

---

## 1. Por que estas e não as outras

A pasta traz 44 camadas de infraestrutura e mais de 30 territoriais. A pergunta
que decidiu cada inclusão foi: **isso muda alguma conclusão sobre o potencial de
biogás?** Camada bonita que não muda leitura é peso de payload sem contrapartida.

Três blocos entraram, por três razões distintas:

**Rota de escoamento.** Antes, o mapa mostrava onde está o resíduo e por onde
passa o gasoduto — mas não onde é possível **injetar**. Sem os pontos de entrega,
a pergunta "para onde vai o biometano deste município?" não tinha resposta
cartográfica.

**Restrição de sítio.** Potencial *mobilizável* não é o mesmo que *licenciável*.
Unidades de conservação de proteção integral, terras indígenas e assentamentos
são as restrições que um revisor cobra quando se afirma potencial por município.

**Logística.** O fator FL do FDE é logístico e hoje vem de literatura, não de
distância medida. A malha rodoviária pavimentada é o insumo que permitiria
derivá-lo — e, enquanto isso, é referência de leitura para o mapa.

---

## 2. O que foi medido antes de servir

Payload real da API, recorte de São Paulo, com a simplificação padrão de cada
camada e o whitelist de atributos aplicado:

| camada | feições (SP) | gzip | bruto | filtro |
|---|---:|---:|---:|---|
| `gas_delivery_point` | 39 | 2 KB | 23 KB | `uf=SP` |
| `compression_station` | 8 | 1 KB | 6 KB | `uf=SP` |
| `gas_processing_unit` | 2 | <1 KB | 1 KB | `uf=SP` |
| `gas_pipeline_outflow` | 4 | 2 KB | 5 KB | bbox |
| `indigenous_territory` | 54 | 18 KB | 62 KB | bbox |
| `settlement` | 207 | 82 KB | 307 KB | `uf=SP` |
| `protected_area_state` | 105 | 138 KB | 446 KB | bbox |
| `highway_federal` | 1.528 | 74 KB | 550 KB | bbox |
| `highway_state` | 6.164 | 261 KB | 2.167 KB | bbox |

Todas **desligadas por padrão** e buscadas só quando o usuário liga o toggle —
nenhuma delas toca a primeira pintura do mapa.

### As três alavancas de otimização, em ordem de ganho

1. **Filtro na origem.** As rodovias entram só pavimentadas: 32.910 → 23.332
   feições estaduais no país. Leito natural e trecho em obras não escoam resíduo.
2. **Whitelist de atributos.** Foi o maior ganho isolado nas rodovias: 4.399 →
   2.167 KB. Depois de simplificar a geometria, dois terços do que sobrava eram
   `geometriaa`, `concession`, `canteirodi` e afins, repetidos em 6.164
   segmentos, que nem o desenho nem o popup usam. Custa zero de fidelidade.
3. **Simplificação Douglas-Peucker**, `ST_SimplifyPreserveTopology`, tolerância
   por camada (0,001° ≈ 111 m). Sem diferença visível na escala estadual, que é
   a única em que estas camadas são desenhadas. Ajustável por requisição com
   `?simplify=`; `0` força resolução plena.

---

## 3. Filtro espacial: `uf` ou `bbox`, nunca por engano

Camadas de **ponto** carregam UF da fonte e usam `?uf=SP`. Linhas e polígonos
que cruzam divisa **não** têm `uf`: o carregador deixa NULL de propósito, porque
fixar uma seria mentira. Essas usam `?bbox=`, que roda no índice GIST.

> Cuidado que já custou uma carga errada: o campo de UF de algumas camadas
> territoriais guarda o **nome** do estado, não a sigla. O código antigo fazia
> `str(raw)[:2].upper()` e gravava `'SÃ'`, `'MI'`, `'RI'` — que não casam com
> filtro nenhum e *parecem dado*. Hoje `_clean_uf` só aceita duas letras ASCII.

---

## 4. O que foi deliberadamente deixado de fora

**`ATLANTIC_FOREST_LAW`** — medida, é **uma única feição** de 13,4 MB brutos;
mesmo simplificada a 0,002° ainda são 2,6 MB (1 MB gzip) para desenhar algo
praticamente uniforme sobre o estado. Como camada visual, é muito custo para
pouca informação. O caminho certo para ela é outro: uma **coluna por município**
com a fração de área sob a lei, calculada uma vez no banco. Vira um número
comparável e some do payload.

**`UGRHS_v3`** — são bacias nacionais (PCJ, Paranapanema, Paraíba do Sul), **não**
as 22 UGRHIs paulistas. Para dialogar com o planejamento hídrico estadual, a
fonte teria de ser a SEMIL/SP.

**Termelétricas fósseis** — 705 em SP, mas **634 são a óleo diesel**: geração de
emergência, não substituível por biometano. Só as 52 a gás natural interessariam.

---

## 5. Recarregar

```bash
# Docker Desktop: lê diretamente os ZIPs da entrega MapBiomas e preserva o volume
docker compose --profile infrastructure run --rm infrastructure-loader

# Entrega em outro diretório no host
MAPBIOMAS_ARCHIVE_DIR="<host>/shapefiles_infraestrutura_mapbiomas" \
  docker compose --profile infrastructure run --rm infrastructure-loader
```

O carregador é idempotente por `layer_id` (apaga e regrava a camada), então
rodar de novo é seguro — ao contrário da migração 004. O bootstrap também
instala as fontes legadas de ETEs e rodovias SP a partir de uma revisão fixada
do repositório de dados. A entrega atual contém a área protegida estadual `v1`,
aceita como fallback para o nome `v2`, mas não contém `SETTLEMENTS_v3`; por isso
a camada de assentamentos responde como coleção vazia até que a fonte oficial
seja fornecida.
