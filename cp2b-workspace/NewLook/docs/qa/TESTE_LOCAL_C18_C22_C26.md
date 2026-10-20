# Teste local no Docker Desktop: C22, C18 e C26

Roteiro para conferir, no Docker Desktop, o que a branch `claude/epic-cray-bvxgrn`
trouxe da Estratégia 2027 (rodada 2): o módulo de GEE com vazamento (C22), o
observatório do financiamento (C18) e o painel do mandato (C26). Cada passo diz o
que deve aparecer; se algo diferir, anote a URL e o que viu.

## 1. Subir a branch

No Git Bash, em `~/Documents/Pilar2b`:

```bash
git fetch origin claude/epic-cray-bvxgrn
git checkout claude/epic-cray-bvxgrn
git pull origin claude/epic-cray-bvxgrn
cd cp2b-workspace/NewLook
```

Não há dependência nova (Python nem npm). Se o ambiente já estava de pé:

```bash
docker compose up -d
docker compose restart backend frontend   # o Next guarda as mensagens antigas em memória
```

Primeira vez (ou depois de apagar os volumes): `cp .env.docker.example .env.docker`,
ajustar `SECRET_KEY` e `docker compose up --build`, como em
[`LOCAL_DOCKER_SETUP.md`](../LOCAL_DOCKER_SETUP.md). O cartão Clima do município
precisa da tabela `municipality_cp2b_potential`, que o serviço `db-migrations`
cria e popula no `--seed`.

Os parâmetros novos ficam em `data/canonical_parameters/` (o único diretório de
dados montado no contêiner): `ghg.yaml`, `financiamento_biometano.yaml`,
`bndes_biometano_operacoes.csv`, `mandato_biometano.yaml` e
`anp_biometano_producao_uf_mensal.csv`. Editar um deles exige
`docker compose restart backend` (a leitura fica em cache).

## 2. API (backend, porta 8000)

```bash
curl -s localhost:8000/api/v1/ghg/parameters | head -c 400; echo
curl -s -X POST localhost:8000/api/v1/ghg/estimate \
  -H 'Content-Type: application/json' \
  -d '{"ch4_produced_nm3_year": 1000000, "baseline": "lagoa_anaerobia"}'; echo
curl -s 'localhost:8000/api/v1/ghg/municipalities/3509502?level=n4' | head -c 600; echo
curl -s localhost:8000/api/v1/financing/benchmarks | head -c 600; echo
curl -s localhost:8000/api/v1/mandate/panel | head -c 600; echo
```

| Chamada | O que conferir |
|---|---|
| `ghg/parameters` | JSON do `ghg.yaml`: `constantes`, `linhas_de_base`, `rotas`, `emissoes_projeto` |
| `ghg/estimate` | `gwp_version: "AR6"`; `er_net_t = be_methane_t + be_fossil_t − pe_total_t`; `note` diz que não é crédito; `unverified` lista a linha de base |
| `ghg/municipalities/3509502` (Campinas) | `totals` e `substrates` com números; 503 indica que o seed do CP2b não rodou |
| `financing/benchmarks` | 7 operações; aterro R$ 1.978–2.596 por m³/dia; agroindustrial R$ 4.116–6.504; Onebio marcada como limite inferior |
| `mandate/panel` | `latest.month` = `2026-04`, Brasil ≈ 443 mil m³/dia, SP ≈ 117 mil; metas 2026 (vigente) a 2030 (indicativa); cobertura ≈ 0,88 em 2026 e ≈ 0,45 em 2027 |

A documentação interativa fica em <http://localhost:8000/docs> (seções ghg,
financing, mandate).

## 3. Páginas (frontend, porta 3006)

| Página | O que conferir |
|---|---|
| <http://localhost:3006/pt-BR/calculator> | Painel Clima: escolher destino atual do resíduo, uso da energia, purificação e vazamento; ver as três parcelas, o líquido e o vazamento de equilíbrio. A receita não soma mais crédito de carbono |
| <http://localhost:3006/pt-BR/compare?ids=3509502,3550308> | Linha de redução líquida de GEE vinda do módulo novo |
| <http://localhost:3006/pt-BR/municipalities/campinas-sp#clima> | Cartão Clima: metano evitado, fóssil deslocado, emissões do projeto, líquido e barras por resíduo |
| <http://localhost:3006/pt-BR/financing> | Menu Dados → Financiamento do biometano. Quatro números no topo, dois cartões por rota, tabela com fonte por linha e "Limites" |
| <http://localhost:3006/pt-BR/mandate> | Menu Dados → Mandato do biometano. Meta de 2026 (505 mil m³/dia), produção BR e SP de abr/2026, trajetória 2026–2030 com os atos, gráfico de 24 meses com a linha tracejada da meta |
| <http://localhost:3006/pt-BR/map> | Tour do Metaninho: abre sozinho na primeira visita (12 passos no desktop, 8 no celular). Voltar, Próximo, Fechar (X ou Esc, volta na próxima visita) e "Não mostrar novamente". O botão "?" abaixo da bússola reabre. Para ver a abertura automática de novo: apagar `pilar2b-map-tour-done` no localStorage |
| <http://localhost:3006/pt-BR/patch-notes> | Versões 3.7.0 (GEE) e 3.8.0 (financiamento e mandato) |
| As mesmas URLs com `/en/` | Textos em inglês, sem chave crua aparecendo |

Vale olhar também no celular (DevTools, 390 px) e no modo escuro. Há um estouro
horizontal de cerca de 7 px no celular que já existia antes (aparece também em
`/data/legend`); não veio desta branch.

## 4. Testes automatizados

No host, se tiver Python e Node; ou dentro dos contêineres:

```bash
# backend
docker compose exec backend python -m pytest -q -p no:cacheprovider

# frontend
docker compose exec frontend npm run typecheck
docker compose exec frontend npm run i18n:check
docker compose exec frontend npx jest
```

Na raiz do repositório (protótipos de análise):

```bash
python -m pytest tests --ignore=tests/test_pilar2b_mg_e2e.py
```

Resultado nesta branch: backend 1322 passaram (5 pulados), frontend 968, raiz 53.

Os protótipos de reconciliação BioGRAM leem o snapshot CP2b, que não está no Git
(`backend/data/raw/cp2b_potential/2026/`). Sem ele, o script avisa e as colunas
CP2b saem vazias: não commite essas saídas, rode na máquina que tem o snapshot.

## 5. Conferir antes de citar

- **Mandato (C26):** volumes de 2026 e 2027 contra os PDFs da Resolução CNPE
  4/2026 e da Portaria MME 942/2026 (links na página). Em 2026, 181.728.000 m³ e
  504,8 mil m³/dia são os dois números publicados (a razão dá 360 dias, não 365);
  o painel usa o diário. A meta de 2027 está em consulta pública até 06/11/2026;
  2028–2030 são indicativas, escaladas da de 2027.
- **GEE (C22):** fatores de conversão de metano (MCF) do IPCC para lagoa, aterro e
  ETE; *slip* de motor (CHP); fator do SIN do MCTI. A API lista os que faltam
  conferir em `unverified`.
- **Financiamento (C18):** a ingestão dos dados abertos do BNDES não rodou (o
  ambiente de nuvem não alcança bndes.gov.br); as 7 operações vêm de notícias com
  fonte por linha. Mauá e Vila Velha usam o investimento conjunto.
- **Pendência conhecida:** `municipalities.co2_reduction_tons_year` ainda é
  `energia × 0,4` (`backend/scripts/sync_db_canonical.py`) e outros endpoints o
  servem. O cartão Clima e a calculadora já usam o módulo novo.
