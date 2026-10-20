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

As páginas de dados (mandato, financiamento) guardam a resposta da API por até
uma hora. Se um cartão novo não aparecer depois do restart, apague esse cache e
reinicie o frontend:

```bash
docker compose exec frontend sh -c 'rm -rf .next/dev/cache/fetch-cache .next/cache/fetch-cache'
docker compose restart frontend
```

Primeira vez (ou depois de apagar os volumes): `cp .env.docker.example .env.docker`,
ajustar `SECRET_KEY` e `docker compose up --build`, como em
[`LOCAL_DOCKER_SETUP.md`](../LOCAL_DOCKER_SETUP.md). O cartão Clima do município
precisa da tabela `municipality_cp2b_potential`, que o serviço `db-migrations`
cria e popula no `--seed`.

Os parâmetros novos ficam em `data/canonical_parameters/` (o único diretório de
dados montado no contêiner): `ghg.yaml`, `financiamento_biometano.yaml`,
`bndes_biometano_operacoes.csv`, `mandato_biometano.yaml`,
`anp_biometano_producao_uf_mensal.csv` e `anp_biometano_plantas_ultimo_mes.csv`. Editar um deles exige
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
| `mandate/panel` | `latest.month` = `2026-04`, Brasil ≈ 443 mil m³/dia, SP ≈ 117 mil; metas 2026 (vigente) a 2030 (indicativa); cobertura ≈ 0,88 em 2026 e ≈ 0,45 em 2027; `route_switch` com molécula 2,63, purificação ≈ 1,44, limiar ≈ R$ 315/MWh e atributo de equilíbrio negativo a R$ 135, 190 e 225, ≈ 0,51 a 450; `revenue_stack` com teto de ≈ 0,0031 CBIO/m³ e CO₂ de 0,99–1,51 kg/m³; `biogenic_co2` com 9 plantas de SP (Essencis Caieiras primeiro, 41–53 t/dia), SP hoje 40–52 mil t/ano e biogás queimado 1,15–1,48 Mt/ano contra mercado de 584 mil t/ano; `sources_checked` = `2026-10-20`, `references` (6 fontes do painel) e `where_to_check` (7 páginas); cada bloco tem `references` por grupo, cada fonte com `title`, `publisher`, `date`, `url` e `kind` |

Para conferir as fontes de uma vez (toda fonte tem data e, salvo suposição, link):

```bash
curl -s localhost:8000/api/v1/mandate/panel -o panel.json
python -c "
import json, sys
d = json.load(open('panel.json', encoding='utf-8'))
refs = {r['key']: r for b in ('route_switch', 'revenue_stack', 'biogenic_co2')
        for g in d[b]['references'].values() for r in g}
refs.update({r['key']: r for r in d['references'] + d['where_to_check']
             + d['production_references'] + d['cgob']['references']
             + [g['source'] for g in d['targets']]})
for r in refs.values():
    print(r['kind'].ljust(10), r['date'].ljust(10), r['short'].ljust(28), r['url'] or '(suposição)')
print(len(refs), 'fontes')"
```

Deve listar 42 fontes; só as suposições (`estimativa`) aparecem sem link.

No Git Bash, `docker exec` com caminho absoluto precisa de `MSYS_NO_PATHCONV=1`
na frente (senão o Git Bash reescreve `/app/...` para um caminho do Windows):

```bash
MSYS_NO_PATHCONV=1 docker exec cp2b-backend-dev grep -c "def references" /app/app/services/mandate_service.py
```

A documentação interativa fica em <http://localhost:8000/docs> (seções ghg,
financing, mandate).

## 3. Páginas (frontend, porta 3006)

| Página | O que conferir |
|---|---|
| <http://localhost:3006/pt-BR/calculator> | Painel Clima: escolher destino atual do resíduo, uso da energia, purificação e vazamento; ver as três parcelas, o líquido e o vazamento de equilíbrio. A receita não soma mais crédito de carbono |
| <http://localhost:3006/pt-BR/compare?ids=3509502,3550308> | Linha de redução líquida de GEE vinda do módulo novo |
| <http://localhost:3006/pt-BR/municipalities/campinas-sp#clima> | Seção Clima (abre e fecha, abaixo da composição): metano evitado, fóssil deslocado, emissões do projeto, líquido e barras por resíduo |
| <http://localhost:3006/pt-BR/financing> | Menu Dados → Financiamento do biometano. Quatro números no topo, dois cartões por rota, tabela com fonte por linha e "Limites" |
| <http://localhost:3006/pt-BR/mandate> | Menu Dados → Mandato do biometano. Meta de 2026 (505 mil m³/dia), produção BR e SP de abr/2026, trajetória 2026–2030 com os atos, gráfico de 24 meses com a linha tracejada da meta. Abaixo do título, a linha "Números conferidos em 20 de out. de 2026", o link para "Onde conferir" e a legenda dos botões (um por tipo de fonte, mais "conta"). **Botões de fonte:** ao lado de cada número há um botão com a citação curta (ex.: "CNPE 4/2026", "CCEE, InfoPLD jul/2026") que abre a fonte direto em outra aba; suposições ("Suposição PILAR-2b", "Modelo PILAR-2b") têm borda tracejada e não são link; o botão "conta" desce até o bloco "Como calculamos" do cartão, com a conta escrita com os valores (na troca de rota: R$ 1,70 − (R$ 2,63 − R$ 1,44) = R$ 0,51/m³ a R$ 450/MWh, e limiar R$ 315/MWh). O cartão da troca de rota abre com "Premissas deste quadro": molécula, piso do CGOB, purificação, PLD, autoconsumo, PCI, rendimento, metano no biogás e biogás de SP, cada um com seus botões. No fim da página, "Como citar este painel" com a citação pronta. Cartão "Vale trocar o motor pela purificação?" (C17): PLD baixo, médio e alto "não precisa", autoconsumo R$ 0,51/m³, contra o piso de R$ 1,00/m³ pedido para o CGOB; limiar R$ 315/MWh; SP com ≈ 2,94 milhões m³/dia de metano, 3× a meta de 2027. Cartão "O que soma na receita de um m³ de biometano" (C27): quatro grupos (Soma, Vende-se uma vez, Soma com ressalva, Não somar), soma possível até R$ 3,80/m³, CBIO até R$ 0,10–0,17/m³, digestato 6 % / 81 % / 13 %. Cartão "CO₂ biogênico" (C20): quatro barras (SP hoje, na capacidade, biogás queimado e mercado brasileiro), tabela com 9 plantas em t/dia e o texto "cerca de 8 %" do mercado. Cada cartão termina em "Fontes deste quadro (N)": ao abrir, cada número com suas fontes, o tipo (oficial, dados, estudo, empresa, imprensa, estimativa), a data e o link, que abre em outra aba. O último cartão, "Onde conferir", lista as 7 páginas vivas |
| <http://localhost:3006/pt-BR/map> | Guia do Metaninho: na primeira visita, depois da escolha de cookies, ele aparece oferecendo o guia ("Mostrar o guia", "Agora não", "Não mostrar novamente"). O guia tem 12 passos no desktop e 8 no celular, com Voltar, Próximo, Fechar (X ou Esc) e "Não mostrar novamente". O botão "Guia do mapa", abaixo da bússola, abre o guia a qualquer momento. Para ver a oferta de novo: apagar `pilar2b-map-tour-done` do localStorage e `pilar2b-map-tour-later` do sessionStorage |
| <http://localhost:3006/pt-BR/proximity> | Clicar num ponto e "Analisar": cartão "Infraestrutura mais próxima" (gasoduto, usina termelétrica, rodovia estadual, linha de transmissão, ETE) com nome e distância, e no mapa uma linha tracejada colorida até cada um. "Camada não carregada no servidor" indica shapefile faltando em `backend/data/shapefiles/` |
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

Resultado nesta branch: backend 1341 passaram (5 pulados), frontend 980, raiz 59.

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
- **Troca de rota (C17), pilha de receitas (C27) e CO₂ biogênico (C20):** a
  conferência número a número, com o que foi corrigido em 20/10/2026 e o que
  ainda falta, está em
  [`VERIFICACAO_FONTES_PAINEL_MANDATO.md`](VERIFICACAO_FONTES_PAINEL_MANDATO.md).
  Em resumo: os valores do Mercado Cativo Verde (R$ 2,25 e 1,40) não foram
  confirmados e saíram do painel. A molécula passou a ser o custo do gás da
  Comgás (R$ 2,63/m³) e o atributo, o piso pedido para o CGOB (R$ 1,00/m³).
  O PLD passou a seguir os boletins da CCEE (R$ 135–225/MWh), a purificação
  ficou em € 25/MWh a R$ 5,80/€, e o CO₂ passou a 1,84 kg/m³ (20 °C, a
  referência da ANP).
- **CO₂ por município:** `municipalities.co2_reduction_tons_year` deixou de ser
  `energia × 0,4`. O seeder `sync_co2_from_ghg` grava nela a redução líquida do
  módulo de GEE (CP2b N4, cenário médio), o mesmo total do cartão Clima; os
  exports do município passam a chamá-la "Redução líquida de GEE (tCO₂e)". Num
  banco já populado, rodar uma vez (ele imprime o total do estado):

  ```bash
  docker compose exec backend python -m scripts.sync_co2_from_ghg
  curl -s localhost:8000/api/v1/statistics/summary   # total_co2_reduction_tons_year muda
  ```

  Sem a tabela do CP2b, o seeder recusa e a coluna fica como estava.
