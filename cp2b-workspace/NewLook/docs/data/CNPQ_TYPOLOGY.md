# Tipologia de codigestão SP + MG (`municipality_typology`)

Fonte da camada beta **Tipologia de resíduo**, **Regime de nutrientes** e do
**Perfil C:N** do mapa. 1.498 municípios: 645 de São Paulo, 853 de Minas Gerais.

## Procedência

| | |
|---|---|
| Origem | Motor canônico PILAR-2b (`p2_canon.py`), entrega CNPq |
| Arquivo | `ENTREGA_clusters_CNPq/04_dados_entrada/SP_MG_municipios_indicadores.csv` |
| Snapshot | `backend/data/raw/cnpq_typology/2026/SP_MG_municipios_indicadores.csv` |
| sha256 | `601d227dd6d83d781bd3756bbe474a9608369027493c03034abef11a1435054a` |
| Migração | `backend/app/migrations/030_municipality_typology.sql` |
| Loader | `python -m scripts.load_municipality_typology` (idempotente, `--dry-run` roda só os gates) |

O snapshot é imutável. Uma extração nova exige um diretório novo com data nova —
o loader recusa carregar se o sha256 divergir.

## Gates do loader

1. **schema** — `ibge_code` de 7 dígitos, sem duplicata, sem nulo em coluna NOT NULL
2. **coverage** — exatamente 645 SP + 853 MG (contagem oficial IBGE)
3. **range** — `cn_molar` dentro de [5, 100]
4. **degeneração** — recusa carregar se `cn_molar` tiver menos de 100 valores
   distintos. Esse gate existe por causa do bug abaixo.
5. **idempotência** — upsert por `ibge_code`

## O que este dado corrigiu

O endpoint `/codigestion/municipality-cn-profiles` calculava o C:N somando as
colunas `*_biogas_m3_year`, que **só São Paulo popula**. Todo município sem
essas colunas caía no fallback `CN_OPTIMAL_MID = 25.0`. Resultado medido em
produção: 5.571 perfis com P25 = mediana = P75 = máximo = 25,0 — o mapa inteiro
pintado de uma cor só, e um município sem dado apresentado como "ótimo".

Agora o C:N vem de `cn_molar`: 1.498 perfis, 1.260 valores distintos,
11,39 a 67,39, mediana 31,98. Município sem linha na tabela é **omitido**, nunca
preenchido com um valor default.

O modo "Clusters K4" foi removido pelo mesmo tipo de problema:
`municipality_summary.cluster_id` estava 0/645 preenchido, então o mapa saía
cinza enquanto a legenda mostrava contagens de outro artefato.

## ⚠️ Ponto aberto — o método do C:N

`cn_molar` é a **média aritmética ponderada por sólidos voláteis**, que é o que
o `p2_canon.py` de fato calcula:

- l. 86 — `cn_molar = (vs_mat * cn_vec).sum(1) / vs_tot`
- l. 231 — `blended = (vs[i]*cn[i] + vs[j]*cn[j]) / (vs[i] + vs[j])`

**Não** é o balanço N-aditivo, que é o método declarado nos dossiês "Extra data
SP" e no rodapé das fichas RGINT. O `INVENTARIO.md` da entrega registra a
divergência: a mediana de `cn_molar` em `canon_municipios.csv` é 49,19 e há 111
municípios em C:N 20–30 — exatamente os números que o dossiê diz terem sido
superados ("cai de 49 para 32"; "sobem de 111 para 191").

Consequência: as oito receitas declaradas em C:N alvo 30 estão de fato em
C:N ≈ 16 pelo balanço N-aditivo. B03 cai à metade (598 → 278 mil t SV/ano);
A01 quase não muda (775 → 840).

Três decisões seguem pendentes: (1) fichas com números corrigidos ou da planilha;
(2) alvo 25 ou 30; (3) corrigir as três linhas do `p2_canon.py` e reprocessar —
o que muda tipologia, regime, os 141 elegíveis, os 30 pares e as figuras já
publicadas.

**É por isso que a coluna se chama `cn_molar` e não `cn`**: uma coluna
N-aditiva futura convive ao lado dela em vez de substituí-la em silêncio.

### Medição sobre este snapshot (2026-09-08)

O ponto acima deixou de ser teórico. Recalculando os 1.498 municípios a partir
das colunas `vs_*` do próprio snapshot:

| | atual (aritmético) | N-aditivo |
|---|---|---|
| Mediana SP+MG | 31,98 | **20,07** |
| Mediana SP (n=645) | 53,12 | 36,78 |
| Mediana MG (n=853) | 24,14 | 15,31 |
| SP em C:N 20–30 | **111** | 163 |

A reprodução do método aritmético bate com a coluna `cn_molar` do arquivo
**linha a linha, divergência máxima 0,000000** — não há ambiguidade sobre o que
o snapshot carrega. E os 111 municípios equilibrados em SP são exatamente o
"antes" que o dossiê de validação descreve como superado ("sobem de 111 para
191"): o que foi publicado é o estado anterior à correção.

`regime` é função pura de `cn_molar` (`03_analise_flagship_SP_MG.py` l. 86-92:
`equilibrado = 20.0 <= cn <= 30.0`), então herda o erro inteiro: **661 dos 1.498
municípios (44%) mudam de classe**, e a leitura do território se inverte —
C-dominante 799→463, N-dominante 310→748.

`tipologia` **não** é afetada: é a família de resíduo dominante por fração de
VS e nunca toca a razão. Idem `share_c_rich`, `share_n_rich`, `shannon_h` e
`total_vs_t`.

### Decisão — camadas retiradas

**Perfil C/N** e **Regime de nutrientes** foram retirados do seletor de modos
(`ColorModeSelector.buildColorModeOptions`). **Tipologia** permanece. Estarem
atrás do gate beta cobre "provisório", não cobre "44% classificado errado" — e,
mais grave, a plataforma contradizia o dossiê enviado para validação externa.

O maquinário de renderização (`CnChoroLayer`, a legenda de C/N, os endpoints)
fica no lugar: restaurar é devolver as duas entradas àquela lista.

### O que um snapshot corrigido precisa satisfazer

Não basta trocar a fórmula sobre este arquivo. Corrigir só o método aqui dá
mediana SP 36,78 e 163 equilibrados — um **terceiro** conjunto, que não bate nem
com o que foi publicado nem com o dossiê (32 e 191). A diferença tem causa
identificada: o dossiê usa **13 resíduos**, incluindo lodo de esgoto (ETE,
C:N 18, rico em N); este snapshot tem **12 colunas `vs_*` e nenhuma de esgoto**.

Um snapshot aceitável precisa, então:

1. usar o balanço N-aditivo `ΣVS / Σ(VS/CN)` no `p2_canon.py` (l. 86 e 231) e no
   `03_analise_flagship_SP_MG.py` (l. 86);
2. incluir o fluxo de esgoto, fechando os 13 resíduos da Seção 4 do dossiê;
3. reproduzir os números que o dossiê declara (mediana SP 32, 191 equilibrados).

Os itens 1 e 2 mudam também tipologia, regime, os 141 elegíveis, os 30 pares e
as figuras publicadas — é decisão de pesquisa, não de plataforma.

### São Paulo já tem o dado corrigido (Fase 1, migração 031)

Os três critérios acima **são satisfeitos por um arquivo que já existia**:
`analysis/paper_figures/P2/canonical/dossier/dossier_municipios.csv`, o conjunto
de trabalho por trás do dossiê de validação bioquímica. Ele traz `cn_harm`
(N-aditivo) ao lado de `cn_molar` (aritmético) nos 645 municípios de SP, e
`real_sewage > 0` em todos — ou seja, os 13 fluxos.

| coluna | mediana | em C:N 20–30 |
|---|---|---|
| `cn_molar` | 49,19 | 111 |
| `cn_harm` | **32,26** | **191** |

Carregado por `scripts/load_dossier_sp_indices.py` nas colunas `cn_harm`,
`regime_harm`, `dom_stream` e `d_gas_km`, **SP apenas** — NULL nas 853 linhas de
MG, e NULL aqui significa "não calculado", nunca zero.

Efeito em SP: **201 dos 645 municípios (31%) mudam de classe de regime**, sendo
que 25 saltam de C-dominante para N-excess, extremos opostos.

⚠️ **Não usar** `canon_municipios.csv` nem `canon_pairs_priority.csv` do mesmo
diretório: são de uma triagem obsoleta (mediana 49,19). A diferença não é só
numérica — os pares mudam de parceiro. Botucatu casa com Porangaba no arquivo
velho e com Conchas no dossiê.

Minas Gerais continua sem C:N confiável até o reprocessamento do `p2_canon.py`
com o fluxo de esgoto. Plano completo em
[`planning/DOSSIE_SP_INTEGRACAO_MAPA.md`](../planning/DOSSIE_SP_INTEGRACAO_MAPA.md).

### Trava

`scripts/load_municipality_typology.py` ganhou o gate `_gate_cn_method`, que
recusa qualquer snapshot cujo `cn_molar` coincida com a média aritmética. Ele só
dispara na **identificação positiva** do método errado, nunca por simples
desacordo com uma recomputação — o banco bioquímico muda, e um gate que exigisse
igualdade exata bloquearia atualizações legítimas.

Consequência prática: **o snapshot hoje em produção não recarrega mais.** Os
dados já gravados permanecem no banco até alguém decidir o contrário; o loader
apenas se recusa a gravá-los de novo.

## Gate beta

As três camadas exigem um token real do backend:

- `GET /api/v1/codigestion/municipality-typology` → 401 sem token
- `GET /api/v1/codigestion/municipality-cn-profiles` → 401 sem token

O gate é no **servidor**, de propósito. O frontend roda hoje com
`NEXT_PUBLIC_DISABLE_AUTH=true`, que entrega a todo visitante um `TEST_USER`
sintético — `useAuth().isAuthenticated` é `true` para tráfego anônimo. Uma
checagem só de UI abriria a camada para a internet inteira. Por isso
`lib/betaAccess.ts` olha para o token armazenado (`getStoredToken()`), que só
existe após um `POST /auth/login` de verdade.

Conta local para desenvolvimento (banco docker descartável):

```bash
docker exec -e ADMIN_EMAIL=voce@example.com -e ADMIN_PASSWORD='SuaSenhaForte123' \
  -e ADMIN_NAME='Seu Nome' cp2b-backend-dev python -m scripts.seed_admin
```

## Nota de processo

`backend/ingest/README.md` define o contrato de 8 gates para fontes externas,
mas o passo `promote` está bloqueado até a migração 021. Este dado é um artefato
derivado interno, não uma fonte externa, então entrou por migração numerada +
loader com gates próprios em vez de `ingest/sources/`.
