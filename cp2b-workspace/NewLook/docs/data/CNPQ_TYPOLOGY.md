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
N-aditiva futura convive ao lado dela em vez de substituí-la em silêncio. E é
por isso que estas camadas estão atrás do gate beta.

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
