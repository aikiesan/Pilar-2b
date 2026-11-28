# Perfil municipal para busca: design

Data: 28/11/2026. Status: rascunho para aprovação do Lucas.
Mock aprovado: `.superpowers/brainstorm/1209-1795865212/content/itabera-mock-v8.html` (Itaberá, 3521705).
Referência guardada no repositório, em `docs/superpowers/specs/2026-11-28-perfil-municipal-seo/`: `build_mock.py` (gerador: cálculos, projeção, desenho e regra de rótulos do mapa), `template3.html` (HTML/CSS do mock) e `itabera-mock-v8.html` (resultado). O PR 2 **porta** a regra de rótulos do `build_mock.py` (funções `free`, `clear`, `RESERVED`), sem redesenhar.

## Intenção e porquê

As páginas de município do PILAR-2b aparecem muito no Google e quase ninguém clica: 891 páginas com impressão, 40.767 impressões, 60 cliques (Search Console, até 24/11/2026). A maioria das buscas é de lugar: "onde fica itaberá", "itaberá sp", "itaberá fica perto de qual cidade". A página atual responde "potencial de biogás", que não é o que a pessoa perguntou.

O perfil novo responde primeiro o que o curioso quer saber (onde fica, quem mora, o que a terra virou, o que produz) e só depois puxa para o que só a CP2b tem: quanto metano os resíduos dali podem dar, o ranking no estado e o caminho para o WebGIS. Para o "onde fica", IBGE e Wikipédia sempre ganham; para "potencial de biogás de X", a CP2b é a única fonte. A página leva a pessoa do primeiro tipo de busca para o segundo, e é no segundo que a CP2b vira referência citável pelo Google e pelos resumos de IA (Gemini/AI Overviews).

## Objetivos

1. Todas as 1.498 páginas do escopo público (645 SP + 853 MG, `lib/mapScope.ts`) com o perfil completo do mock, sem placeholder.
2. Fatos escritos em texto no HTML do servidor (não só em gráfico), para o Google e as IAs poderem ler e citar.
3. Uma rede de páginas: perfis ligados aos vizinhos, páginas de região imediata e rankings do estado.
4. Estrutura pronta para o Brasil inteiro: dados carregados nacionalmente, página e endpoint sem nada específico de SP/MG.
5. Cada carga de dados em produção é um comando repetível, testado antes no Docker, com backup e conferência.

**Medida de sucesso:** CTR das páginas `/municipalities/*` no Search Console sobe de ~0,15% (60/40.767) para a faixa de 1–2% em 8 semanas após o deploy, e as consultas "potencial de biogás <município>" começam a aparecer.

## Não objetivos

- Publicar perfis fora de SP e MG agora. Os outros estados têm dados mas não têm o potencial de biogás calculado.
- Mudar o método de cálculo do potencial (N3/N4) ou a calculadora.
- Dados que existem só para SP (ficam como extras futuros; o perfil núcleo usa só fontes nacionais).
- FAQPage em JSON-LD: o Google não dá resultado rico para esse tipo de site. As perguntas ficam visíveis em texto.

## Anti-objetivos (falha mesmo que funcione)

- Uma página de MG mostrando número de SP, zero ou "N/A" onde deveria haver dado (a armadilha das fontes "só SP" com nome genérico).
- Texto que pareça gerado em massa ("X é um município encantador..."). Cada frase vem de um número real da página.
- Mapa interativo pesado no topo: no celular o primeiro conteúdo tem que aparecer rápido. O mapa do topo é SVG estático.
- Qualquer edição manual de dados no banco de produção.

## Restrições

- **Produção:** VM `cp2b-web` da Unicamp, Apache + PM2 (`pilar-backend`, `pilar-frontend`), banco `cp2b` (PostgreSQL 18, PostGIS 3.6.4, 6,2 GB). O banco `cp2b_db` é do site `cp2b_web` e fica fora; os bancos `arqueia*` são de outro projeto.
- **Disco:** o diretório de dados do PostgreSQL (`/var/lib/postgresql/18/main`) está no disco raiz de 15 GB com 3,6 GB livres. `/data` tem 45 GB livres. Backups e arquivos temporários de carga vão para `/data`, nunca para `/`. Mover o diretório de dados do PostgreSQL para `/data` é tarefa separada, fora deste design (as tabelas novas somam poucos MB).
- **Lucas faz todos os commits, pushes e merges.** PRs em PT-BR, com nome de comida, revisados com `/code-review --comment`.
- Fluxo existente de dados externos: o contrato `backend/ingest/` (fetch → load → validate → promote, com 8 gates) e os scripts `backend/scripts/promote_*.py`.
- Fonte e tokens visuais do app (Neulis Sans, `ink #1E3E4C`, `terra-600 #00573A`, `lima #B6E03B`, `.card`, `.eyebrow`, `.btn-*`).

## O que já existe (conferido em 28/11/2026)

| Item | Onde | Estado |
|---|---|---|
| Geometria de todos os 5.571 municípios | `municipalities.geometry`, `geometry_overview`, `geometry_detail` (migração 022) | produção, completo |
| Região imediata e intermediária | `municipalities.immediate_region(_code)`, `intermediate_region(_code)` | produção |
| População 2022, PIB per capita, densidade | `municipalities` via `scripts/promote_ibge_demographics.py` | nacional |
| `urban_population` / `rural_population` | colunas em `municipalities` | existem, **vazias de propósito** (o arquivo básico do Censo não traz a divisão) |
| PAM 2023 e PPM 2008–2024 | `municipality_timeseries` (formato longo: `ibge_code, year, source_id, variable, value, unit, quality, ingest_run_id`) | local nacional; **produção a conferir** (consulta na seção Deploy) |
| MapBiomas Col. 11 por município | `municipality_land_cover` (migração 041), 8 grupos | produção: 1985, 2005, 2025, 1.498 municípios |
| Rank N4, vizinhos, centróide | `GET /municipalities/{ibge}/context` | produção |
| Métricas de potencial | `GET /municipalities/{ibge}/metrics`, `/cp2b/municipalities/{ibge}` | produção |
| Canonical, hreflang, title, description, BreadcrumbList, Place | PRs 60 e 61 | aguardando merge |
| Sitemap com os perfis | `src/app/sitemap.ts` | `lastModified` fixo `2026-10-14` em todos |
| Imagem de compartilhamento por município | `[slug]/share-image/` | existe |

## Abordagens consideradas

**A. Arquivos JSON prontos, um por município**, gerados por script Python (dados + SVG do mapa), lidos pelo frontend. Mais rápido de entregar e não toca o banco. Descartada: cria um caminho de dados paralelo ao `ingest/`, sem as validações, exatamente onde o problema de MG caindo em placeholder passaria despercebido.

**B. Tudo pelo banco (escolhida).** Censo e histórico entram por fontes novas do `ingest/` na tabela longa que já existe; o land cover ganha anos e o grupo soja; um endpoint `/profile` junta tudo, inclusive o mapa desenhado no PostGIS; o frontend renderiza no servidor com ISR. Mais trabalho, mas segue o padrão do projeto, reaproveita metade do que existe e serve depois para comparar, dossiê e expansão nacional.

**C. Misto:** dados pelo banco, mapas como SVGs pré-gerados em `public/`. Tira o PostGIS do caminho da requisição, mas obriga a regenerar arquivos quando a malha mudar. Descartada porque o endpoint fica em cache de 1 h e o custo no PostGIS é baixo.

Lucas escolheu B em 28/11/2026.

## Design

### 1. Dados novos

Tudo carregado **para os 5.571 municípios** (mesmo esforço que só SP+MG; deixa a porta do Brasil aberta). Snapshots brutos congelados em `data/raw/<fonte>/<ano>/` (gitignored, como os demais; ver `data/raw/README.md`); o loader lê o snapshot, nunca a API ao vivo.

| Fonte nova (`source_id`) | Tabela SIDRA | Destino | Variáveis |
|---|---|---|---|
| `ibge_censo_idade` | 9514 (Censo 2022, idade × sexo) | `municipality_timeseries`, year 2022 | `pop_<faixa>_<sexo>` para 0–4 … 75–79, 80+ (17 faixas × `h`/`m`) |
| `ibge_censo_situacao` | 9923 (Censo 2022, situação do domicílio) | `municipalities.urban_population`, `rural_population` | urbana, rural |
| `ibge_censo_historico` | 200 (1970–2010) + 4714 (2022) | `municipality_timeseries` | `populacao_residente`, years 1970, 1980, 1991, 2000, 2010, 2022 |

Notas:
- O histórico tem municípios criados depois de 1970: anos sem valor ficam **ausentes** (sem linha), nunca zero. A página desenha a linha a partir do primeiro ano existente e diz "município criado em AAAA" quando faltar 1970.
- Gates próprios: soma nacional da tabela 9514 = 203.080.756 (igual ao gate do `promote_ibge_demographics.py`); urbana + rural = população 2022 por município; todo município de SP e MG presente em cada fonte.
- **Land cover vira fonte do `ingest/`** (`mapbiomas_cobertura`), com gates e `ingest_run`, para ter data de carga e as mesmas validações (decisão do Claude: a abordagem B pede que todo dado passe pelo contrato). O `scripts/load_municipality_land_cover.py` atual (fixo em SP/MG, apaga e reinsere anos, sem `ingest_run`) fica como referência da leitura do xlsx e é aposentado depois. Escopo de UFs por parâmetro, padrão SP+MG. Carrega 1985–2025 (41 anos). Grupo novo `soy` separado de `crops` (classe de nível 4 "Soja"); `crops` passa a ser "outras lavouras". Migração nova documenta o grupo e confere que a soma dos grupos por município e ano bate com o total do xlsx. Volume: 5.571 × 41 × 9 ≈ 2 milhões de linhas pequenas (~150 MB com índice); se o disco raiz pesar, carregar só SP+MG (1.498 × 41 × 9 ≈ 550 mil) e deixar o resto para quando o PostgreSQL estiver em `/data`. **Decisão de quanto carregar é do Lucas no deploy; o padrão é SP+MG.**
- PAM e PPM: nada novo; o perfil usa PAM 2023 (`pam_1612`, `pam_1613`) e PPM 2023 (`ibge_ppm`) que já estão na tabela longa.

### 2. Endpoint `GET /api/v1/municipalities/{ibge}/profile`

Um único pedido por página com tudo que o perfil precisa e que ainda não vem de `/metrics` e `/context`. Resposta (campos ausentes = `null`, nunca 0):

```jsonc
{
  "ibge_code": "3521705", "name": "Itaberá", "uf": "SP",
  "regions": { "immediate": {"code": "350004", "name": "Itapeva"}, "intermediate": {"code": "3502", "name": "Sorocaba"} },
  "place": {
    "centroid": {"lat": -23.86, "lng": -49.14},
    "nearest_city": {"ibge_code": "3522406", "name": "Itapeva", "km": 29.8},   // sede da região imediata, se não for ela mesma
    "capital": {"name": "São Paulo", "km": 257.9},                             // capital da UF
    "map": { "viewbox": "0 0 760 560", "self": "M…", "neighbours": [...], "others": [...], "states": [...], "labels": [...] },
    "inset": { "viewbox": "...", "state": "M…", "self_point": [x, y] }
  },
  "people": {
    "population_2022": 17983, "urban": 12320, "rural": 5663,
    "pyramid": [{"age": "0-4", "m": 512, "f": 489}, ...],
    "history": [{"year": 1970, "pop": 14585}, ...],
    "gdp_per_capita": {"value": 58842, "year": 2023},
    "density": 16.34, "state_density": 179
  },
  "land": { "years": [1985, ..., 2025], "series": {"pasture": [...], "soy": [...], "crops": [...], "forest": [...], ...}, "unit": "ha" },
  "production": {
    "crops": [{"key": "pam_soja_em_grao", "label": "Soja", "t": 163463}, ...],   // top 6 por tonelada, PAM 2023
    "harvested_ha": 88947,
    "herds": {"bovino": 21900, "galinaceos_total": 13000, "suino_total": 5125, "year": 2023}
  },
  "available": { "people": true, "land": true, "production": true, "energy": true }
}
```

- **Distâncias:** haversine entre o centróide do polígono e a sede (coordenada da sede municipal; usar `centroid_lat/lng` do município da sede se não houver tabela de sedes; ver "Deixado ao construtor").
- **Cidade de referência (`nearest_city`)**, decisão do Claude: (1) a sede da região imediata, se não for o próprio município; (2) se for a própria sede, a sede da região **intermediária**; (3) se também for ela (ex.: Sorocaba), `null`, e o parágrafo fala só da capital. A capital da UF nunca é cidade de referência dela mesma: para a capital, o parágrafo usa a região metropolitana/intermediária e omite a distância.
- **Vizinhos fora do escopo** (outra UF sem página, ex.: PR ao lado de Itaberá), decisão do Claude: aparecem no **mapa** com nome e a sigla da UF ("Wenceslau Braz (PR)"), sem link; aparecem no **texto** "faz limite com"; **não** aparecem nas barras de metano nem nas perguntas. A barra nunca mostra vazio ou "N/A".
- **Mapa no servidor (PostGIS):** enquadramento = bbox dos vizinhos, centro ± 0,62 × extensão (como o mock). Para o recorte: `ST_AsSVG(ST_SimplifyPreserveTopology(geometry_overview, tol), 0, 1)` com projeção equiretangular pelo cosseno da latitude central (mesma `Proj` do mock), para o próprio município, os vizinhos, todos os outros municípios que tocam o quadro **de qualquer UF** (a geometria é nacional) e o contorno dos estados vizinhos. Os rótulos (posição e se aparecem) são calculados no servidor com a mesma regra do mock: vizinhos sempre; outros por área decrescente com teste de colisão; áreas reservadas para o rótulo da capital (canto superior direito) e o mapinha (canto inferior esquerdo); escala de 20 km no canto inferior direito.
- **Cache:** resposta cacheada (o `cache_service` existente) e o frontend em ISR de 1 h. O mapa muda só quando a malha muda.
- `available.energy` = existe potencial N4 calculado para o município. Hoje é `true` para todo SP+MG; para outros estados será `false` até o cálculo existir.

### 3. Página (`src/app/[locale]/municipalities/[slug]/page.tsx`)

Ordem e conteúdo exatamente como o mock v8 (layout A no celular: mapa primeiro). Componentes server-side, sem biblioteca de mapa no topo:

1. **Topo:** breadcrumbs; eyebrow "Município de <UF por extenso>"; h1 "Onde fica <Nome> (<UF>)"; parágrafo-resposta gerado de dados ("<Nome> fica no <posição na UF>, na região de <imediata>, a N km de <sede> e N km da capital, em linha reta. Faz limite com A, B, C e mais N."); 3 números (habitantes, área, densidade com a do estado); chips (região intermediária, região imediata, código IBGE); botões "Abrir no mapa interativo" (primário) e "Comparar com vizinhos". Mapa SVG à direita (desktop 1fr/1fr) ou em cima (celular).
2. Navegação de capítulos fixa.
3. **Quem vive:** pirâmide etária, linha da população 1970–2022, cidade/campo, economia.
4. **A terra:** área empilhada MapBiomas 1985–2025 com o ano em que a maior lavoura passou o pasto anotado (quando houver cruzamento); dois números antes/depois.
5. **O que produz:** barras de lavouras (PAM) e rebanhos (PPM).
6. **Energia (gancho):** bloco escuro petróleo; metano N4, rank no estado, GWh/ano estimado, barra da mistura de resíduos, botão "Simular uma usina em <Nome>" e "Como calculamos"; os 4 tiles atuais do app; níveis do método; clima; 3 passos da transição. Se `available.energy = false`: bloco curto "Potencial de biogás em cálculo para <UF>", sem números, com link para o método.
7. **Vizinhos:** barras de metano dos vizinhos (com link para cada perfil), compartilhar, como citar.
8. **Perguntas:** 6 perguntas e respostas visíveis, geradas de dados (onde fica, perto de qual cidade, quantos habitantes, o que produz, potencial de biogás, posição no estado).
9. **Explorar:** WebGIS, resíduos principais, comparar, ranking, calculadora.
10. Notas e limitações; linha de fontes ("Dados: Método CP2b, CP2b v5.1 · IBGE · MapBiomas").

Seções cujo `available.<x>` for `false` não aparecem (nem a pergunta correspondente). MG mantém o selo de piloto que o `mapScope` já define.

**Eletricidade:** a página usa os fatores da calculadora (`calculatorEngine.ts`: PCI do CH₄ 35,8 MJ/m³ × eficiência 0,35), para que o número bata com o "Simular uma usina". A diferença com `lib/gather.ts` (9,97 kWh/m³ × 0,38) fica registrada como item separado.

### 4. Camada de busca

- **Texto citável:** o parágrafo-resposta, as respostas das perguntas e uma frase-resumo por seção, todos no HTML do servidor.
- **JSON-LD:** manter `BreadcrumbList` e `Place` (PR 61) com `geo` e `containedInPlace` (região imediata, UF); adicionar `Dataset` para o potencial de biogás do município (nome, descrição, `creator` CP2b/Unicamp, `license`, `isBasedOn` IBGE/MapBiomas, `distribution` apontando para o REDU doi:10.25824/REDU/F36WP9, `temporalCoverage`, `spatialCoverage`).
- **Title/description:** os do PR 61, com a distância à sede: "Onde fica Itaberá (SP): mapa, população e potencial de biogás | CP2b".
- **Páginas novas:**
  - `/municipalities/region/<slug-da-imediata>`: mapa da região, lista dos municípios com população e metano, links para cada perfil. ~53 regiões imediatas em SP, ~70 em MG.
  - `/municipalities/ranking/<uf>`: os municípios do estado ordenados por metano N4, com link para cada perfil.
  - Segmentos de caminho em inglês, como o `/municipalities` atual (decisão do Claude). Ambas entram no sitemap e recebem links dos perfis (chip da região, rank no estado).
- **Sitemap:** `lastModified` real por perfil = data da última carga que afeta a página (máximo entre `ingest_run` de censo/land cover e a versão do método), servida pelo endpoint de diretório.
- **Imagem de compartilhamento:** a `share-image/` passa a desenhar o mapa do recorte e o nome, para os links compartilhados.
- **robots:** o Googlebot cobre os resumos de IA da busca; não bloquear `Google-Extended` (decisão do Lucas se quiser bloquear treino; o padrão é liberado).

### 5. Inglês (`/en`)

Decisão do Lucas (28/11/2026): inglês completo junto, mesma página nas duas línguas.
- Todo texto fixo vai para `messages/pt-BR.json` e `messages/en.json`.
- As frases montadas de dados (parágrafo-resposta, frases-resumo, as 6 perguntas e respostas, title, description, textos do JSON-LD) são moldes por língua com campos (`{name}`, `{km}`, `{seat}`…), não tradução automática. Ex.: "Onde fica Itaberá (SP)" / "Where is Itaberá (SP)"; "a 30 km de Itapeva e 258 km da capital, em linha reta" / "30 km from Itapeva and 258 km from the state capital, as the crow flies".
- Números no formato de cada língua (17.983 / 17,983). Nomes de lugares e de regiões IBGE não se traduzem; rótulos de grupos MapBiomas, lavouras e rebanhos sim.
- Caminhos iguais nas duas línguas, só o prefixo muda (`/pt-BR/municipalities/region/…`, `/en/municipalities/region/…`), como os perfis hoje; hreflang e sitemap seguem o padrão do PR 60.
- Cada PR de página (3, 4, 5) entrega as duas línguas; um teste confere que toda chave existe nos dois arquivos.

### 6. Expansão para o Brasil

Nada na página, no endpoint ou nos dados depende de SP/MG. Abrir um estado = incluí-lo no `mapScope`. Se o potencial ainda não estiver calculado, a página sai com lugar, pessoas, terra e produção, e a energia como "em cálculo". Abrir estados é decisão do Lucas, fora deste design.

## Entrega em PRs

1. **Dados:** fontes `ibge_censo_idade`, `ibge_censo_situacao`, `ibge_censo_historico`; fonte `mapbiomas_cobertura` (land cover anual com `soy`); migração; relatórios do ingest.
2. **Endpoint `/profile`:** incluindo o mapa SVG e os rótulos, com testes (Itaberá, um município de divisa SP/PR, um de MG, um criado depois de 1970).
3. **Página parte 1:** topo, mapa, quem vive, a terra, o que produz.
4. **Página parte 2:** energia, vizinhos, perguntas, explorar, JSON-LD `Dataset`, title/description.
5. **Rede:** páginas de região e ranking, sitemap com `lastModified` real, imagem de compartilhamento com mapa.

Os PRs 60 e 61 entram antes do 3.

## Deploy na VM (cada PR de dados ou endpoint)

Pré-condição (uma vez, só leitura): conferir PAM/PPM em produção.
```sql
SELECT source_id, left(ibge_code,2) AS uf, max(year), count(DISTINCT ibge_code)
FROM municipality_timeseries WHERE left(ibge_code,2) IN ('35','31')
GROUP BY 1,2 ORDER BY 1,2;
```
Esperado: `pam_1612`, `pam_1613`, `ibge_ppm` com 645 (35) e 853 (31). Se faltar, carregar antes com os promotores existentes.

Sequência:
```bash
cd /var/www/pilar2b/repo && git pull
sudo -u postgres pg_dump -Fc -d cp2b -t <tabelas tocadas> > /data/backups/cp2b_<tabelas>_AAAA-MM-DD.dump
sudo -u postgres psql -d cp2b -1 -v ON_ERROR_STOP=1 -f cp2b-workspace/NewLook/backend/app/migrations/0XX_....sql
# snapshot bruto copiado para /data/pilar2b_raw/ e apontado pelo loader
python -m ingest.runner run <fonte> --year 2022           # mesmo comando do Docker; gates bloqueiam se falhar
sudo -u postgres psql -d cp2b -c "<consultas de conferência do PR>"
pm2 restart pilar-backend      # depois pilar-frontend, quando o PR for de página
```
- Dados entram antes do frontend; o endpoint responde `available: false` com a tabela vazia.
- Proibido: `UPDATE`/`INSERT` manual, CSV fora do loader, dado e código no mesmo passo.
- Recomendado: um usuário só de leitura para conferências do dia a dia.
- Rollback: `pg_restore --clean -d cp2b -t <tabela>` do dump; `git checkout` do commit anterior e `pm2 restart`.

## Riscos

- **Posição média ~10 no Google:** o CTR depende também de subir posição; o texto citável e a rede de páginas ajudam, mas a medida de 8 semanas pode ficar curta.
- **Rótulos do mapa em casos extremos** (municípios minúsculos na Grande SP/BH, municípios enormes no norte de MG): o algoritmo de colisão do mock foi testado só em Itaberá. Os testes do PR 2 incluem casos extremos e uma revisão visual de uma amostra (~20 municípios) antes do PR 3.
- **Disco raiz** em 75%: carga de land cover nacional pode pesar; padrão SP+MG.
- **PRs 60/61** com passos manuais de deploy (Apache e robots.txt do `cp2b_web`) ainda pendentes.

## Deixado ao construtor

- Nome exato das variáveis na tabela longa e layout interno das fontes `ingest`, seguindo `sources/aneel_siga/`.
- Tolerância do `ST_SimplifyPreserveTopology` e precisão do `ST_AsSVG`, desde que o mapa do topo fique abaixo de ~60 KB por página.
- Coordenada da sede municipal: se não houver no banco, usar o centróide do município-sede e registrar como limitação (o mock usou a coordenada da cidade de Itapeva; a diferença é de poucos km).
- Componentização da página e testes de frontend, seguindo o padrão atual.
- Textos das 6 perguntas, desde que cada resposta venha de um número da página.
