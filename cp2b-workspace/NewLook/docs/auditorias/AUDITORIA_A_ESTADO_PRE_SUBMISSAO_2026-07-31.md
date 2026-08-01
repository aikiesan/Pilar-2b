# AUDITORIA A — ESTADO DO REPOSITÓRIO ANTES DA SUBMISSÃO AO CEUS

**Data de execução:** 2026-07-31
**Modo:** Somente leitura (Aventura A).
**Repositório:** `github.com/aikiesan/Pilar-2b`
**Branch de execução:** `claude/pilar-2b-state-audit-9bdrff`
**HEAD:** `7bd8596` / `7bd85960c3cd9ad44ba8fcebce7c89ee9660e116`

---

## 0. DECLARAÇÃO DE NÃO-ALTERAÇÃO

> **Nenhuma alteração foi feita a nenhum arquivo auditado.**

Nenhum arquivo de código, parâmetro, dado ou configuração foi editado. Nada foi
adicionado ao índice durante a auditoria, nenhum merge, rebase ou checkout foi
executado. Nenhum comando de rede que altere o remoto foi invocado durante a
coleta de evidências (nem `git fetch`). O único arquivo criado é **este
relatório**.

**Ressalva de commit (2026-08-01).** Concluída a auditoria e sob autorização
explícita do autor, **este relatório — e somente ele — foi commitado e enviado**
para `claude/pilar-2b-state-audit-9bdrff`. Toda a evidência literal deste
documento foi coletada **antes** desse commit, com a árvore limpa em
`7bd8596` (ver §1.1). Nenhum arquivo auditado foi tocado nem antes nem depois.

**Ressalva de local do arquivo.** O enunciado pede a gravação em
`docs/auditorias/`. O diretório `docs/auditorias/` **não existe na raiz do
repositório** — a raiz tem apenas `docs/data/`. A trilha de auditoria versionada
vive em `cp2b-workspace/NewLook/docs/auditorias/` (A10, A17, A18, A19, B7). Este
relatório foi gravado lá, junto dos seus pares, em vez de criar um segundo
diretório de auditorias concorrente na raiz. Evidência literal em §7.

---

## RESSALVA METODOLÓGICA GLOBAL — O CLONE É RASO (`grafted`)

Toda afirmação de ancestralidade, de "primeiro commit que tocou X" e de datas
antigas neste relatório está limitada por isto:

```console
$ git rev-parse --is-shallow-repository
true

$ cat .git/shallow
915d2ceff20b9faaae59588660c9ca73f723994b
ebd2ce6229c493c53b934cb833555e59658b0cf2
f31c913e163d8c4a4b28c1ad6226e24872b638a8
```

O histórico local começa em `915d2ce` (2026-06-13). Objetos anteriores a esse
ponto **não existem localmente**. Onde isso muda a resposta, o achado é marcado
`NAO_VERIFICAVEL` e a mutação que o resolveria (`git fetch --unshallow`) está
listada em §8.2.

---

# PARTE 1 — ESTADO DO REPOSITÓRIO

## 1.1 Branch, HEAD e limpeza da árvore — **CONFIRMADO**

```console
$ git status --porcelain
$ git rev-parse --abbrev-ref HEAD
claude/pilar-2b-state-audit-9bdrff
$ git log -1 --format='%h|%H|%ad|%s' --date=iso
7bd8596|7bd85960c3cd9ad44ba8fcebce7c89ee9660e116|2026-07-31 16:16:17 -0300|fix(dados): 309 dos 399 artigos perderam o vinculo com o residuo no dedupe (#179)
```

`git status --porcelain` produziu **saída vazia**. A árvore de trabalho está
**limpa**: nenhuma modificação, nenhum arquivo em stage.

| Campo | Valor |
|---|---|
| Branch | `claude/pilar-2b-state-audit-9bdrff` |
| HEAD curto | `7bd8596` |
| HEAD completo | `7bd85960c3cd9ad44ba8fcebce7c89ee9660e116` |
| Data | 2026-07-31 16:16:17 −0300 |
| Assunto | `fix(dados): 309 dos 399 artigos perderam o vinculo com o residuo no dedupe (#179)` |

## 1.2 Branches e divergência contra `origin/main` — **CONFIRMADO**

```console
$ git branch -a -v
* claude/pilar-2b-state-audit-9bdrff                7bd8596 fix(dados): 309 dos 399 artigos perderam o vinculo com o residuo no dedupe (#179)
  main                                              9f89039 feat(map): selectable CVD-safe palettes for daltonic mode (#164)
  remotes/origin/claude/pilar-2b-state-audit-9bdrff 7bd8596 fix(dados): 309 dos 399 artigos perderam o vinculo com o residuo no dedupe (#179)
  remotes/origin/main                               9f89039 feat(map): selectable CVD-safe palettes for daltonic mode (#164)

$ git rev-list --left-right --count origin/main...HEAD
0	14
```

| Branch | Tip | Atrás de `origin/main` | À frente |
|---|---|---:|---:|
| `claude/pilar-2b-state-audit-9bdrff` (HEAD) | `7bd8596` | 0 | **14** |
| `origin/claude/pilar-2b-state-audit-9bdrff` | `7bd8596` | 0 | 14 |
| `main` (local) | `9f89039` | 0 | 0 |
| `origin/main` | `9f89039` | 0 | 0 |

> **DIVERGENTE — ponteiro `main` local desatualizado em relação ao GitHub.**
> O `origin/main` **local** aponta para `9f89039` (PR #164, 2026-07-23). A API do
> GitHub, consultada nesta sessão, informa que os PRs #166 a #179 foram
> **merged em `main`** entre 2026-07-30 e 2026-07-31 (§2.3), e o PR #179 tem
> `base.sha = 3139767…`. Ou seja: **os 14 commits que aqui aparecem "à frente
> de main" já são `main` no GitHub**; a referência local é apenas um snapshot do
> momento do clone e não foi (nem podia ser, em modo leitura) atualizada.
> Resolução em §8.2.

## 1.3 Tags e o lote B9 — **DIVERGENTE**

```console
$ git tag -l -n1
(saída vazia)
```

Nenhuma tag foi trazida no clone raso. Consulta à API do GitHub (`list_tags`):

| Tag | SHA |
|---|---|
| `v3.0-day2-auth-complete` | `e673d811fe5412d79525ecea758ee1ca8bd624dd` |
| `pre-fix-2026-07-25` | `dbea3a7e11acc45c19e9e81f68ccdd23cfb9558d` |
| `archive/dev-history-pre-squash` | `ec52631959a777d27c2f6a7df038b203d6d6a356` |

> **Não existe tag correspondente ao lote de parâmetros B9.** As três tags do
> repositório são: um marco de autenticação, um congelamento pré-correção de
> 2026-07-25 e um arquivo de histórico. Nenhuma menciona B9, parâmetros ou
> BMP. O lote B9 **não tem hash nem data de tag** porque não foi tagueado.
> (A data de cada tag exigiria `get_tag`/`get_commit` por tag; não afeta a
> conclusão, que é a ausência.)

## 1.4 `git log` de `main` e do caminho quantitativo — **CONFIRMADO**

### 1.4.1 `main` (50 últimos, clone raso)

```console
$ git log --oneline --graph --decorate -50 main
* 9f89039 (origin/main, main) feat(map): selectable CVD-safe palettes for daltonic mode (#164)
* 8594376 fix(tests): locate canonical data by search, not by counting parent dirs (#160)
* 0464ae0 feat(nav): make the interactive map the landing page; home becomes the guide hub (#163)
* dcff2a5 feat(map): state scope switcher + mobile-first municipality panel (#162)
* 4821801 docs: session handoff for the national go-live (#161)
* 21bd4bf fix(map): remove the Metano toggle — four toggles, not five (#159)
* ab27231 perf(map): serve the choropleth only what it paints (#158)
* b44f046 chore(beta): withhold all dataset exports until the data is cleared to publish (#157)
* 92dcb8a Metric-aware municipality views, national sugarcane, e o biogás/metano split (#156)
* d7fea17 National crop biomass (IBGE PAM) + measured urban waste + recovered metric toggles (#154)
* 3e2e26f fix(map): tie displayed values to served data + reconcile national totals against IBGE (#151)
* 0827308 docs(national): turnkey local data-load — orchestrator, manifest, runbook + roadmap (#150)
* 787eba6 National biomass + biogas map: head-count fix, coverage semantics, 5,570 municipalities (#148)
* fcf3630 fix(canonical): make feedstocks.yaml reachable in Docker, and its absence loud (#147)
* c579b6e fix(migrations): make 020 & 021 safe against the production DB (#146)
* 56ba508 feat(frontend): guide section + guided tour (recovered from lucas-boaro) (#143)
* cddfaea Live-verification sweep: fix 3 production bugs (LGPD DSR, auth rate limiter), first green CITE run, offline auth mode (#142)
* b169610 Zoom-smoothness perf pass + month playbooks (Jul–Dec) + migration 021 draft (#140)
* 63b26a6 Brazil expansion foundation: roadmap + data-ingestion framework (8-gate validation battery) + ingestion guide (#139)
* 3ee4cb2 Consolidated pending work: internal auth + GeoServer/OGC prep (#121), PII log sanitizer (#132), paper-credibility docs (#114) (#137)
* 011a58e Lean & stable round 3: E2E/unit-test/flake8/bandit gates + 2 retry bugs (#135)
* 9fbee10 Lean & stable: harden CI gates, fix crashing technology-routes endpoints, mechanical cleanup (#134)
* f73551e chore(lint): remove unused imports + dead code (pyflakes-clean) (#131)
* 5a84cae docs(foss4g): surface open-data/dynamics docs in README + add FOSS4G one-pager (#130)
* 4ef76bc feat(security): baseline HTTP security headers middleware (+ guardrail) (#129)
* 4e90aa7 feat(lgpd): drop CPF/CNPJ collection + add compliance guardrail tests (#127)
* 8e59528 docs(planning): month round-up + forward plan (compliance, cadence, sandbox limits) (#128)
* f225ff7 docs(data): SP biomass seasonality & temporal availability (dynamic view) (#126)
* a2b02e8 docs(data): SP waste generation & flow dynamics (how much, how distributed) (#125)
* d4442b9 docs(data): SP energy price & temporal dynamics (cost + what-times) (#124)
* b1f965b docs(data): energy, logistics & bioeconomy municipal data layer (#123)
* 0807b42 docs(data): open-data & API landscape for biomass/biogas mapping (SP→Brazil) (#122)
* 3a30a71 feat(privacy): LGPD consent gate, data-subject rights, real privacy/terms (#118)
* 13e482d chore: declutter repo root — remove duplicate CP2B_HANDOFF, relocate stray doc (#111)
* ffc6fa3 docs(readme): professional polish for FOSS4G presentation (#110)
* 915d2ce (grafted) docs: future vision & full possibility map (strategy) (#109)
```

O grafo é **linear** (sem bifurcações desenhadas) e termina em `915d2ce
(grafted)`.

### 1.4.2 Os 14 commits de HEAD que não estão no `main` local

```console
$ git log --format='%h %ad %s' --date=short origin/main..HEAD
7bd8596 2026-07-31 fix(dados): 309 dos 399 artigos perderam o vinculo com o residuo no dedupe (#179)
3139767 2026-07-31 feat(scripts): cascata FDE de SP ponderada pelo potencial teorico (#178)
604447c 2026-07-31 perf(api): guardar o payload ja comprimido — 324 ms -> ~46 ms por acerto (#177)
653e560 2026-07-31 perf(api): cache com ETag no GeoJSON do mapa (4,1 s → 55 ms) (#176)
98bc81e 2026-07-31 fix(map): barra lateral estourava a viewport e a lista de camadas nao rolava (#175)
17a8672 2026-07-31 feat(map): agrupar as camadas novas na aba Camadas em vez de empilha-las (#173)
10c8830 2026-07-31 Feat/camadas mapbiomas e benchmark (#174)
bc3a3cb 2026-07-31 feat(map): 9 camadas MapBiomas (gas, restricao, rodovias) e benchmark de carga (#172)
7fc6f32 2026-07-31 fix(map): "Ver Perfil Completo" saia da plataforma em producao (#171)
5e38edc 2026-07-31 feat(map): filtro por resíduo, headline por cenário, camada BETA e escala adaptativa (#170)
10b9eea 2026-07-30 Fix/sector rollup and bmp normalisation (#169)
db4ce0a 2026-07-30 Fix/sector rollup and bmp normalisation (#168)
f2d50c7 2026-07-30 Fix/sector rollup and bmp normalisation (#167)
4693708 2026-07-30 feat(docker, db): automate PostGIS database migrations and consolidate full project datasets (#166)
```

**Observe a lacuna: de `#164` (tip de `main`) salta-se para `#166`. O PR #165
não está em lugar nenhum deste histórico** — coerente com ele estar aberto (§2.2).

### 1.4.3 Restrito ao caminho canônico quantitativo — **CONFIRMADO**

```console
$ git log -1 --format='%h %ad %s' --date=short -- cp2b-workspace/NewLook/docs/data/municipality_biomass_tons.csv
915d2ce 2026-06-13 docs: future vision & full possibility map (strategy) (#109)

$ git log --format='%h %ad %s' --date=short -- cp2b-workspace/NewLook/data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv
4693708 2026-07-30 feat(docker, db): automate PostGIS database migrations and consolidate full project datasets (#166)

$ git log --format='%h %ad %s' --date=short -- cp2b-workspace/NewLook/data/canonical_parameters/blocker_13_provenance.json
4693708 2026-07-30 feat(docker, db): automate PostGIS database migrations and consolidate full project datasets (#166)
```

| Insumo do caminho canônico | Último commit visível | Data |
|---|---|---|
| `docs/data/municipality_biomass_tons.csv` (**Input of Record**) | `915d2ce` | **2026-06-13** |
| `data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv` | `4693708` | 2026-07-30 |
| `data/canonical_parameters/blocker_13_provenance.json` | `4693708` | 2026-07-30 |

> **NAO_VERIFICAVEL (data real do `municipality_biomass_tons.csv`).** `915d2ce` é
> exatamente o ponto de enxerto do clone raso. A data 2026-06-13 é o limite do
> que se enxerga, **não** necessariamente o commit que de fato alterou o arquivo
> pela última vez. O relatório B11 (2026-07-29) registra `92fb365` — 2026-06-05
> como último commit deste arquivo, o que é compatível com "anterior ao enxerto".
> Em qualquer leitura, **o Input of Record do gerador canônico é de junho e é
> anterior a toda a recalibração de julho**.

## 1.5 `cb7967a7` é ancestral de HEAD? — **DIVERGENTE (não é)**

```console
$ git cat-file -t cb7967a7
fatal: Not a valid object name cb7967a7

$ git merge-base --is-ancestor cb7967a7 HEAD
fatal: Not a valid object name cb7967a7
exit=128
```

O objeto **não existe no clone**. Via API do GitHub ele existe no remoto:

| Campo | Valor |
|---|---|
| SHA | `cb7967a7375c4b4fbdebc089cba7d5ba3714d93c` |
| Data | **2026-07-27T11:20:45Z** |
| Autor | Lucas Nakamura (`aikiesan`) |
| Assunto | `fix(canonical): consolida números canônicos estaduais de biogás e bioenergia com correções C1-C4 (Lote B1-FINAL)` |

**Resposta explícita: NÃO, `cb7967a7` não é ancestral do HEAD atual.** O
fundamento não é a ausência local, é a cronologia mais a topologia:

1. `origin/main` termina em `9f89039`, datado de **2026-07-23** (§1.4.1).
   `cb7967a7` é de **2026-07-27**. Nada de 27 de julho pode estar contido num
   ramo que termina em 23 de julho.
2. Os 14 commits que HEAD acrescenta a `main` estão integralmente listados em
   §1.4.2 e são de 30–31 de julho, todos com número de PR entre #166 e #179.
   `cb7967a7` não é nenhum deles.
3. `cb7967a7` pertence à linha do PR #165 (`fix/canonical-consistency-2026-07`),
   que está **aberto** (§2.2) e portanto não foi incorporado.

Isto reproduz, no HEAD de hoje, o que o relatório B11 §3.2 já registrara para o
commit irmão `78f92fd` daquela mesma branch: *"não é ancestral do HEAD atual
(`git merge-base --is-ancestor` retorna falso)"*.

> **Consequência direta para a submissão:** o relatório **A19 usa `cb7967a7`
> como uma de suas duas linhas de base** (`Delta vs cb7967a7 (3,0531 M m³/d)`).
> Metade da tabela comparativa de A19 §6.3 descreve um estado do repositório que
> **não está no HEAD** e que só existe num PR não integrado.

## 1.6 Stashes, não-rastreados e artefatos ignorados — **CONFIRMADO**

```console
$ git stash list
(saída vazia)
$ git status --porcelain -uall --ignored
(saída vazia)
```

**Zero stashes. Zero arquivos não rastreados. Zero arquivos ignorados presentes
em disco.** A árvore contém exatamente o que o HEAD contém.

Regras de `.gitignore` que incidem sobre o caminho canônico:

```console
$ grep -nE "csv|json|output|data|\.tif|db" .gitignore cp2b-workspace/NewLook/.gitignore
.gitignore:27:*_load_log.csv
.gitignore:28:manuscript_validation_*.json
.gitignore:30:analysis/outputs/
.gitignore:34:cp2b-workspace/NewLook/data/raw/
cp2b-workspace/NewLook/.gitignore:36:data/raw/*
cp2b-workspace/NewLook/.gitignore:37:data/rasters/*.tif
cp2b-workspace/NewLook/.gitignore:39:*.db
cp2b-workspace/NewLook/.gitignore:67:backend/data/shapefiles/
cp2b-workspace/NewLook/.gitignore:68:backend/data/rasters/
cp2b-workspace/NewLook/.gitignore:74:backend/data/raw/*
cp2b-workspace/NewLook/.gitignore:77:# Canonical recalculation outputs (regenerable via recalculate_biogas_canonical.py)
cp2b-workspace/NewLook/.gitignore:78:backend/scripts/canonical_recalc_output/
```

Os dois relevantes:

- **`backend/scripts/canonical_recalc_output/` é ignorado** — é exatamente o
  diretório de **saída** do gerador canônico (`compute_sp_canonical_totals.py`,
  linha 342). O produto do pipeline nunca é versionado.
- **`backend/data/raw/*` e `data/raw/*` são ignorados** — são os snapshots
  brutos de PAM/PPM/SNIS.

```console
$ ls -la cp2b-workspace/NewLook/backend/scripts/canonical_recalc_output/
ls: cannot access '...canonical_recalc_output/': No such file or directory
```

O diretório **não existe em disco**. Não há saída canônica materializada neste
checkout.

---

# PARTE 2 — PULL REQUESTS

**Ferramenta usada:** `gh` **não está disponível** neste ambiente —

```console
$ which gh; gh --version
/bin/bash: line 1: gh: command not found
```

Toda a Parte 2 foi obtida pelos tools MCP do GitHub (`list_pull_requests`,
`pull_request_read`, `get_commit`). São dados de API reais, não inferência.

## 2.1 PRs abertos — **CONFIRMADO**

| # | Título | Autor | Base | Head | Estado | Mergeable | Arquivos |
|---|---|---|---|---|---|---|---:|
| **165** | fix: saneamento de consistência canônica (auditoria + recálculo único) | `aikiesan` | `main` @ `9f89039` | `fix/canonical-consistency-2026-07` @ `f83c6b9` | open, não-draft | **`unknown`** | **202** |
| 145 | fix(landing): honesty pass (fake newsletter, WCAG stat, register CTA, dead links) | `aikiesan` | `main` @ `56ba508` | `feat/landing-revamp` @ `7d39c49` | open, não-draft | n/d | n/d |
| 141 | docs: verify Jul–Dec plans + frontend UI/UX review + fix broken IBGE links | `aikiesan` | `main` @ `b169610` | `claude/verify-repo-plans-x167n6` @ `74102d7` | open, não-draft | n/d | n/d |

- **PR #165:** +158.265 / −2.119 linhas, 52 commits, criado 2026-07-26,
  atualizado 2026-07-29.
- `mergeable_state` volta como **`unknown`** — o GitHub não recalculou a
  mergeabilidade. Ver §8.2.
- **NAO_VERIFICAVEL:** conclusão de CI e contagem de arquivos dos PRs #145 e
  #141 não foram consultadas individualmente. Ambos têm base desatualizada
  (`56ba508` de 2026-07-11 e `b169610` de 2026-07-03).

## 2.2 PR #165 em detalhe — **CONFIRMADO**

### 2.2.1 Continua **ABERTO**

```json
"number":165, "state":"open", "draft":false, "merged":false,
"mergeable_state":"unknown",
"head":{"ref":"fix/canonical-consistency-2026-07","sha":"f83c6b9a62a410723c6a4da64c812132ea677fa8"},
"base":{"ref":"main","sha":"9f890398a5ca750ef3817b528e6119e595f41b61"}
```

Não foi merged nem fechado. O próprio corpo do PR instrui, textualmente:

> **Não fazer merge.** O PR fica aberto para revisão.

### 2.2.2 CI — conclusões literais por check-run (head `f83c6b9`, 2026-07-29)

`total_count: 14`

| Check-run | `status` | `conclusion` |
|---|---|---|
| GitGuardian Security Checks | completed | `neutral` |
| CI Summary | completed | `success` |
| CodeQL | completed | `success` |
| OGC – CITE Conformance (TEAM Engine) | completed | `success` |
| OGC – Assembly & Acceptance | completed | `success` |
| Analyze (javascript) | completed | `success` |
| Analyze (python) | completed | `success` |
| Frontend - E2E Tests | completed | `success` |
| Frontend - Security Audit | completed | `success` |
| Frontend - Lint & Build | completed | `success` |
| **Frontend - Unit Tests** | completed | **`failure`** |
| **Backend - Unit Tests** | completed | **`failure`** |
| Backend - Security Check | completed | `success` |
| Backend - Lint & Format | completed | `success` |

> **DIVERGENTE — dois check-runs em `failure`, e o agregador diz `success`.**
> `Frontend - Unit Tests` e `Backend - Unit Tests` falharam, enquanto
> `CI Summary` concluiu `success`. Além disso, o corpo do PR afirma na tabela de
> verificação: *"`pytest tests/unit` — **958 passed** (17 novos)"*. **A afirmação
> do PR e a conclusão do CI do próprio PR se contradizem.** Note ainda que os
> check-runs são de **2026-07-29** e a base `main` do PR (`9f89039`) está hoje
> desatualizada em 14 commits (§1.2): estas conclusões descrevem um merge que
> não é mais o merge que aconteceria.

### 2.2.3 Arquivos que o PR #165 **apaga** — lista completa

Percorridas as 3 páginas de `get_files` (202 arquivos: 104 `added`, 82
`modified`, 12 `renamed`, **2 `removed`**):

| Arquivo removido |
|---|
| `cp2b-workspace/NewLook/docs/data/METADATA.json` |
| `cp2b-workspace/NewLook/docs/data/biogas_canonical_state_summary.csv` |

Renomeações (12) — nenhuma toca insumo de cálculo, exceto uma que vale registrar:

```
cp2b-workspace/NewLook/data/canonical_parameters/feedstock_bmp_from_refs.csv
  -> cp2b-workspace/NewLook/data/quarantine/feedstock_bmp_from_refs.csv
```

### 2.2.4 Algum arquivo apagado é insumo do pipeline canônico?

**Os insumos do gerador canônico são exatamente dois** (§3.1):
`docs/data/municipality_biomass_tons.csv` e
`data/canonical_parameters/feedstocks.yaml`.

- `municipality_biomass_tons.csv` — **não aparece no diff do PR #165 sob nenhum
  status** (verificado programaticamente sobre os 202 arquivos). Não é apagado
  por este PR.
- `feedstocks.yaml` — status `modified`, não removido.

**Portanto: nenhum dos 2 arquivos apagados é insumo direto do pipeline canônico
de SP.** Mas um dos dois **é** insumo de outro gate versionado:

```console
$ grep -rn "METADATA.json" --include=*.py cp2b-workspace/NewLook/backend/ingest/
backend/ingest/gates.py:14:    7. lineage       METADATA.json entry complete (no VERIFY placeholders)
backend/ingest/gates.py:227:        return GateResult("lineage", False, f"source '{source_id}' missing from METADATA.json")
backend/ingest/gates.py:239:    return GateResult("lineage", True, f"'{source_id}' fully documented in METADATA.json")
backend/ingest/contract.py:60:    # Path to docs/data/METADATA.json (overridable in tests).
```

`METADATA.json` alimenta o **gate de linhagem** da bateria de 8 gates de
ingestão. Apagá-lo remove a base do gate 7.

### 2.2.5 Merge do #165 deixaria `main` com CI vermelho ou pipeline inexecutável?

**CI vermelho — sim, pelo que está medido.** As duas suítes de teste unitário
(frontend e backend) concluíram `failure` no head do PR. Não existe execução
posterior. Isto é o que o CI literalmente reporta; não é predição.

**Pipeline canônico não-executável — NAO_VERIFICAVEL, com um sinal forte
contrário.** Determinar isso exigiria comparar o estado pós-merge com o HEAD, o
que requer materializar o merge (mutação). O que é verificável sem mutar:

- B11 §3.3 registra que `municipality_biomass_tons.csv` foi **desrastreado em
  `9fdfcb7`** na branch `fix/canonical-consistency-2026-07`, e que por isso *"o
  gerador roda aqui e falha em `fix/canonical-consistency-2026-07`"*.
- A18 (§ citada abaixo) reforça: *"sua remoção do Git inviabilizou a execução do
  gerador"*.
- Mas o diff atual do PR #165 **não lista esse arquivo em nenhum status** — o que
  é consistente com ele já ter sido removido em commit anterior da branch e não
  aparecer como delta contra a base, **ou** com a remoção ter sido revertida.
  **As duas leituras são compatíveis com o diff e não se distinguem sem checkout
  da branch.** Ver §8.2.

## 2.3 PRs merged nos últimos 60 dias (2026-06-01 → 2026-07-31) — **CONFIRMADO**

Ordenados do mais recente. Coluna "caminho quantitativo" = o PR mexeu em número,
parâmetro, insumo ou motor de cálculo publicável.

| # | `merged_at` | Base sha | Título | O que mudou no caminho quantitativo |
|---|---|---|---|---|
| 179 | 2026-07-31T19:16Z | `3139767` | fix(dados): 309 dos 399 artigos perderam o vínculo com o resíduo no dedupe | **Corpus bibliográfico**: religa 309 artigos ao resíduo. Afeta contagem de referências por parâmetro (a base de `n` da regra de contenção BMP), não os valores de BMP. |
| 178 | 2026-07-31T18:33Z | `604447c` | feat(scripts): cascata FDE de SP ponderada pelo potencial teórico | **Novo script quantitativo** `sp_fde_cascade.py`: decomposição teórico→FC→FCo→FS→FL ponderada. Lê do **banco**, não do YAML. Declara explicitamente não reproduzir os 7,83 bi publicados. |
| 177 | 2026-07-31T15:20Z | `653e560` | perf(api): guardar o payload já comprimido | Nenhuma. Cache/gzip. |
| 176 | 2026-07-31T14:52Z | `17a8672` | perf(api): cache com ETag no GeoJSON do mapa | Nenhuma. Cache HTTP. |
| 175 | 2026-07-31T14:44Z | `17a8672` | fix(map): barra lateral estourava a viewport | Nenhuma. CSS/layout. |
| 173 | 2026-07-31T14:07Z | `bc3a3cb` | feat(map): agrupar as camadas novas na aba Camadas | Nenhuma. UI. |
| 174 | 2026-07-31T14:06Z | `bc3a3cb` | Feat/camadas mapbiomas e benchmark | Camadas MapBiomas **de exibição** + benchmark de carga. Não entra no inventário (§5). |
| 172 | 2026-07-31T13:24Z | `7fc6f32` | feat(map): 9 camadas MapBiomas (gás, restrição, rodovias) + benchmark | Idem #174 — geolocalização de ativos, não potencial. |
| 171 | 2026-07-31T12:47Z | `5e38edc` | fix(map): "Ver Perfil Completo" saía da plataforma | Nenhuma. Roteamento. |
| 170 | 2026-07-31T12:21Z | `10b9eea` | feat(map): filtro por resíduo, headline por cenário, camada BETA, escala adaptativa | **Headline por cenário** — muda qual número o mapa exibe como manchete. |
| 169 | 2026-07-30T18:17Z | `f2d50c7` | Fix/sector rollup and bmp normalisation | **Rollup setorial + normalização de BMP.** Toca agregação por setor e unidades de BMP. |
| 168 | 2026-07-30T17:52Z | `4693708` | Fix/sector rollup and bmp normalisation | Idem (mesma branch, merge sucessivo). |
| 167 | 2026-07-30T12:45Z | `4693708` | Fix/sector rollup and bmp normalisation | Idem. |
| 166 | 2026-07-30T11:36Z | `9f89039` | feat(docker, db): automate PostGIS migrations + consolidate full project datasets | **Introduz** `SP_master_residue_streams_2023_FINAL.csv` (formato largo) e `blocker_13_provenance.json` no controle de versão. É o commit que cria a divergência de SHA-256 do §3.3. |
| 164 | 2026-07-23T12:26Z | `21bd4bf` | feat(map): selectable CVD-safe palettes for daltonic mode | Nenhuma. Acessibilidade de cor. |
| 160 | 2026-07-23T12:26Z | `21bd4bf` | fix(tests): locate canonical data by search, not by counting parent dirs | **Resolução de caminho** do `feedstocks.yaml` em testes. Head = `75e0b1e` — a linha de base dos relatórios A18/A19/B11. |
| 163 | 2026-07-23T12:16Z | `21bd4bf` | feat(nav): map as landing page | Nenhuma. Navegação. |
| 162 | 2026-07-23T12:15Z | `21bd4bf` | feat(map): state scope switcher + mobile municipality panel | Nenhuma. UI. |
| 161 | 2026-07-23T12:15Z | `21bd4bf` | docs: session handoff for the national go-live | Nenhuma. Documentação. |
| 159 | 2026-07-21T19:15Z | `b44f046` | fix(map): remove the Metano toggle | Remove uma métrica **da exibição**. |
| 158 | 2026-07-21T19:12Z | `b44f046` | perf(map): serve the choropleth only what it paints | Nenhuma. Payload. |
| 157 | 2026-07-21T17:32Z | `92dcb8a` | Beta: withhold all dataset exports until data cleared to publish | **Bloqueia exportação de dataset** — decisão de publicação, não de valor. |
| 156 | 2026-07-21T17:14Z | `d7fea17` | Metric-aware municipality views, national sugarcane, biogás/metano split | **Separa biogás de metano** nas views municipais. Cana nacional. |
| 154 | 2026-07-21T16:04Z | `3e2e26f` | National crop biomass (IBGE PAM) + measured urban waste + recovered metric toggles | **Biomassa agrícola nacional via IBGE PAM** + resíduo urbano medido. |
| 151 | 2026-07-19T01:42Z | `0827308` | Map data integrity + four metric toggles + daltonic mode | **Reconcilia totais nacionais contra IBGE**; amarra valores exibidos ao dado servido. |
| 150 | 2026-07-18T17:17Z | `787eba6` | docs(national): turnkey local data-load | Nenhuma (runbook). |
| 148 | 2026-07-18T16:48Z | `fcf3630` | National biomass + biogas map: head-count fix, coverage semantics, 5,570 municípios | **Correção de contagem de cabeças** (cabeças ≠ toneladas) + semântica de cobertura. |
| 147 | 2026-07-17T12:54Z | `c579b6e` | fix(canonical): make feedstocks.yaml reachable in Docker | **Resolução de caminho do `feedstocks.yaml`** (introduz `CANONICAL_PARAMETERS_PATH`). |
| 146 | 2026-07-13T14:57Z | `56ba508` | fix(migrations): make 020 & 021 safe against production DB | Migrações. |
| 143 | 2026-07-11T19:52Z | `cddfaea` | feat(frontend): guide section + guided tour | Nenhuma. |
| 142 | 2026-07-10T13:16Z | `b169610` | Live-verification sweep (LGPD DSR, auth rate limiter, CITE, offline auth) | Nenhuma. |
| 140 | 2026-07-03T17:55Z | `63b26a6` | Zoom-smoothness perf pass + month playbooks + migration 021 draft | Nenhuma. |

> **NAO_VERIFICAVEL (janela completa dos 60 dias).** A listagem da API cobre até
> 2026-07-03 nas 40 entradas retornadas. PRs merged entre **2026-06-01 e
> 2026-07-02** não foram enumerados (faltaria paginação adicional). O clone raso
> não supre a lacuna, pois seu enxerto é 2026-06-13 e não traz metadados de PR.

---

# PARTE 3 — REPRODUTIBILIDADE DO PIPELINE CANÔNICO

## 3.1 Gerador canônico e seus insumos — **CONFIRMADO**

**Gerador:** `cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py`
(359 linhas).

Insumos declarados no próprio código:

```python
# compute_sp_canonical_totals.py:56-63
# <NewLook> root: this file is backend/scripts/<here>
_NEWLOOK = Path(__file__).resolve().parents[2]
_CSV = _NEWLOOK / "docs" / "data" / "municipality_biomass_tons.csv"
_FEEDSTOCKS = _NEWLOOK / "data" / "canonical_parameters" / "feedstocks.yaml"

# São Paulo state resident population — IBGE Censo Demográfico 2022.
# https://censo2022.ibge.gov.br/  (SP: 44,411,238)
SP_POPULATION = 44_411_238
```

| Papel | Caminho exato |
|---|---|
| Gerador | `cp2b-workspace/NewLook/backend/scripts/compute_sp_canonical_totals.py` |
| Insumo 1 (*input of record*) | `cp2b-workspace/NewLook/docs/data/municipality_biomass_tons.csv` |
| Insumo 2 (parâmetros) | `cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml` |
| Insumo 3 (constante no código) | `SP_POPULATION = 44_411_238` |
| Motor | `backend/app/services/biogas_forward.py` |
| Adaptador YAML→motor | `backend/app/services/canonical_loader.py` |
| **Saída** | `backend/scripts/canonical_recalc_output/sp_canonical_by_stream.csv` (**ignorado pelo git**, §1.6) |

## 3.2 Rastreamento dos insumos e dependências externas — **CONFIRMADO**

```console
$ git ls-files --error-unmatch cp2b-workspace/NewLook/docs/data/municipality_biomass_tons.csv
cp2b-workspace/NewLook/docs/data/municipality_biomass_tons.csv
$ git check-ignore -v cp2b-workspace/NewLook/docs/data/municipality_biomass_tons.csv
exit=1
```

**Os dois insumos estão rastreados e commitados no HEAD.** A árvore está limpa
(§1.1), logo o conteúdo em disco é o conteúdo do HEAD.

**Dependências fora do controle de versão:**

| Dependência | Onde | Hash-locked / pinada? |
|---|---|---|
| **Variável de ambiente `CANONICAL_PARAMETERS_PATH`** | `canonical_loader.py:31` (`_PATH_ENV_VAR`) — se definida, **substitui inteiramente** o caminho do `feedstocks.yaml` | **NÃO.** Nenhuma validação, nenhum checksum. Qualquer YAML pode ser injetado silenciosamente. |
| Resolução por busca de `feedstocks.yaml` | `canonical_loader.py:43-47`, testa `parents[3]` e `parents[2]` | **NÃO.** Depende do layout de runtime (checkout vs Docker). |
| `SP_POPULATION` (Censo 2022) | constante literal no gerador, linha 63 | Pinada como literal; **sem regra de projeção** para anos > 2022. |
| Fatores de resíduo da cana | `SUGARCANE_SUBSTREAMS`, linhas 80-105 | Literais no código, com nota de proveniência em texto. Não hash-locked. |
| `CITRUS_RESIDUE_FRACTION = 0.50` | linha 74 | Literal no código. |

**O gerador canônico de SP não lê banco de dados, não lê `.tif`, não lê CSV em
cache fora do repositório.** Isso é verificável pela ausência de qualquer
`psycopg2`, `rasterio` ou caminho absoluto no arquivo (imports nas linhas 32-49:
`csv`, `logging`, `sys`, `pathlib`, `yaml`, e dois módulos `app.services`).

**Contraste — outros scripts quantitativos do repositório SIM dependem de
recursos externos:**

```console
$ grep -n "DATABASE_URL\|psycopg2.connect" backend/scripts/sp_fde_cascade.py
116:    url = os.environ.get("DATABASE_URL")
176:    conn = psycopg2.connect(args.dsn or dsn())
```

```python
# backend/scripts/load_biomass_tons.py:63-72
MAPBIOMAS_CSV = os.environ.get(
    "MAPBIOMAS_CSV",
    str(
        Path(__file__).parent.parent.parent.parent.parent
        / "FINAL_FILES-20260426T151225Z-3-001"
        / "FINAL_FILES"
        / "CSV"
        / "MB_col10_municipios.csv"
    ),
)
YEAR_COLUMN = "2024"
```

`load_biomass_tons.py` aponta para um diretório **cinco níveis acima da raiz do
repositório**, que não existe aqui e não é versionado.

## 3.3 O JSON de resultados canônicos mais recente — **DIVERGENTE**

**Arquivo lido (não regenerado):**
`cp2b-workspace/NewLook/data/canonical_parameters/SP_TOTAIS_CONSOLIDADOS_2026-07-30.json`
(147 linhas). Trechos literais:

```json
"potencial_mobilizavel": {
    "ch4_m3_ano": 3037463853,
    "ch4_m3_dia": 8321819,
    "fde_efetivo_pct": 15.3,
    "faixa_ch4_m3_ano": [ 1846214705, 4543010314 ],
    "faixa_ch4_m3_dia": [ 5058122, 12446604 ]
},
"potencial_mobilizavel_corrigido_rsu": {
    "ch4_m3_ano": 2665434387,
    "ch4_m3_dia": 7302560,
    "fde_efetivo_pct": 14.2,
    "faixa_ch4_m3_dia": [ 4038864, 11427345 ]
}
```

### O hash registrado dentro dele

> **DIVERGENTE — o JSON canônico não registra hash algum.**
> Foram lidas as 147 linhas. **Não existe campo `commit`, `git_sha`, `hash`,
> `revision` nem equivalente.** Uma busca por esses termos em todos os JSON de
> `data/canonical_parameters/` e `docs/data/` retorna **um único** resultado, e
> ele é de outro arquivo:
>
> ```console
> $ grep -rn "commit\|_hash\|git_sha\|hash" --include=*.json data/canonical_parameters/ docs/data/
> data/canonical_parameters/blocker_13_provenance.json:6:  "sha256_hash": "2ab1d03d…"
> docs/data/blocker_13_provenance.json:6:  "sha256_hash": "2ab1d03d…"
> ```
>
> Consequentemente as três perguntas — "o hash existe no histórico?", "é igual ao
> HEAD?" — **não têm objeto**. Não é que o hash não bata: **não há hash**. Os
> totais canônicos publicados não são atribuíveis a nenhum estado do código.

### O único hash que existe está errado — **DIVERGENTE**

`blocker_13_provenance.json` declara o SHA-256 do master canônico:

```json
"single_canonical_location": "cp2b-workspace/NewLook/data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv",
"sha256_hash": "2ab1d03d6293690e76b7d883599554307965772afc367a52f2f834eb5d7a28f9",
"file_size_bytes": 189129,
```

Medição do arquivo no HEAD:

```console
$ sha256sum cp2b-workspace/NewLook/data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv
7d0fb051bb7cb74c4588d8d77a0865c27a0e9c0b42bb3f43f91ec117a1aebfa5  ...
$ stat -c '%s bytes' ...
188483 bytes
```

| | Declarado no JSON | Medido no HEAD |
|---|---|---|
| SHA-256 | `2ab1d03d6293690e…` | **`7d0fb051bb7cb74c…`** |
| Tamanho | 189.129 bytes | **188.483 bytes** |

> **DIVERGENTE. O gate de proveniência do BLOCKER-13 está quebrado.** O arquivo
> mudou (646 bytes a menos) sem que o `blocker_13_provenance.json` fosse
> atualizado. Ambos foram introduzidos no **mesmo commit `4693708` (PR #166,
> 2026-07-30)** — a divergência nasceu junto com o registro. O campo
> `"blocker_13_status": "RESOLVED"` afirma um fechamento que o próprio checksum
> do arquivo desmente.
>
> Nota adicional: o alias declarado
> (`analysis/data/01_master_residue_streams_SP_2023.csv`, "mirrored & verified
> via SHA256") tem hash **`644cfb6a7285bde6…`** — um **terceiro** valor:
> ```console
> $ sha256sum analysis/data/01_master_residue_streams_SP_2023.csv
> 644cfb6a7285bde6a824da2bf8c3107f237cbfc9458b7cee8b26466eb401fc9c
> ```
> As duas cópias `_FINAL` (em `data/canonical_parameters/` e em `docs/data/`)
> são byte-idênticas entre si (`7d0fb051…`), mas **nenhuma** é idêntica ao alias.
> A alegação "mirrored & verified via SHA256" é falsa no HEAD.

### O arquivo que A18/A19 citam como canônico não existe — **DIVERGENTE**

```console
$ ls -la cp2b-workspace/NewLook/docs/data/canonical_results.json
ls: cannot access '...': No such file or directory
$ git ls-files | grep -i "canonical_results"
(saída vazia)
```

A19 §6.1 declara: *"Caminho da Folha Canônica: `totals.ch4_practical.medio` em
`cp2b-workspace/NewLook/docs/data/canonical_results.json`"*. **Esse arquivo não
existe e não é rastreado no HEAD.** Ele é `added` pelo PR #165, sob outro
caminho ainda (`cp2b-workspace/NewLook/backend/canonical_results.json`).

## 3.4 O gerador rodaria a partir de um checkout limpo do HEAD? — o que o código exige

Sem executar. Somente o que o código requer, lido literalmente.

| # | Requisito | Estado verificável no HEAD |
|---|---|---|
| 1 | `import yaml` (linha 41) | Dependência externa; `pyproject.toml`/`requirements.txt` presentes. Instalação não verificada. |
| 2 | `from app.services.biogas_forward import SCENARIOS, calculate_feedstock` (linha 43) | `backend/app/services/biogas_forward.py` **presente e rastreado**. |
| 3 | `from app.services.canonical_loader import STREAM_TO_CANONICAL, biomass_tons_from_units, get_params, get_params_for_stream` (linhas 44-49) | `canonical_loader.py` **presente**. Os 4 símbolos não foram individualmente conferidos. |
| 4 | `sys.path.insert(0, parents[1])` (linha 39) | Exige invocação com `backend/` resolvível — o cabeçalho documenta "run from the backend/ directory". |
| 5 | `_CSV = <NewLook>/docs/data/municipality_biomass_tons.csv` (linha 58) | **Presente e rastreado.** `parents[2]` a partir de `backend/scripts/` = `<NewLook>` — consistente com o layout de checkout. |
| 6 | `_FEEDSTOCKS = <NewLook>/data/canonical_parameters/feedstocks.yaml` (linha 59) | **Presente e rastreado.** |
| 7 | `out_dir = Path(__file__).parent / "canonical_recalc_output"` + `mkdir(parents=True, exist_ok=True)` (linhas 342-343) | Diretório **ausente**, mas o código o cria. **Ignorado pelo `.gitignore` (linha 78)** — a saída nunca será versionada. |
| 8 | Conexão a banco de dados | **Nenhuma exigida.** Sem `psycopg2`, sem `DATABASE_URL` neste arquivo. |
| 9 | Caminho absoluto hardcoded | **Nenhum neste arquivo.** Todos os caminhos derivam de `Path(__file__)`. |
| 10 | `CANONICAL_PARAMETERS_PATH` no ambiente | Se **definida**, `canonical_loader.resolve_feedstocks_path()` a honra e ignora o repositório. É um vetor de divergência silenciosa; não é um bloqueio. |

**Obstáculos de conteúdo — não de execução:**

- O gerador consumiria `municipality_biomass_tons.csv` **de 2026-06-13 ou
  anterior** (§1.4.3), isto é, anterior a toda a recalibração de julho. O código
  rodaria sobre um insumo defasado sem qualquer sinal de erro.
- O gerador **não produz** o `SP_TOTAIS_CONSOLIDADOS_2026-07-30.json` do §3.3.
  Sua única saída é `sp_canonical_by_stream.csv` (linhas 348-352) mais um print
  em stdout (`_scenario_print`). **O JSON de totais consolidados não tem gerador
  identificado neste repositório.**

**Não afirmo que roda. Não afirmo que falha.** O acima é o que o código exige.

---

# PARTE 4 — VALORES DE PARÂMETROS (relatados, nada alterado)

## 4.1 Contagem de feedstocks — **DIVERGENTE (26, não 28)**

```console
$ python3 -c "import yaml; d=yaml.safe_load(open('data/canonical_parameters/feedstocks.yaml')); print(len(d['feedstocks']))"
26
```

O corpo do PR #165 §6 afirma: *"a contagem de substratos passou de **26 para
28**"*. **No HEAD são 26.** Confirma que o PR #165 não está integrado.

## 4.2 Tabela completa: BMP e FCo por feedstock — **CONFIRMADO**

BMP em **NmL CH₄ / g VS** para todos (unidade declarada no cabeçalho do YAML,
linhas 11-12). FCo = `fde.components.fco`. Classificação primário/não-primário
conforme A19 §5 (tabela reproduzida em §4.3).

| Código | BMP min | **BMP médio** | BMP max | FCo min | **FCo médio** | FCo max | Tag de fonte (refs do BMP) | Classificação A19 |
|---|---:|---:|---:|---:|---:|---:|---|---|
| `BAGACO` | 115,0 | **165,0** | 220,0 | 0,15 | **0,22** | 0,38 | `paulose2021_bagaco`, `talha2016_bagaco`, `velasquez2020_sugarcane`, `unica2023_straw` | **INTERPOLADO** (não-primário) |
| `PALHA` | 140,0 | **175,0** | 250,0 | 0,05 | **0,10** | 0,18 | `paulose2021_bagaco`, `velasquez2020_sugarcane`, `talha2016_bagaco` | PRIMARIO |
| `VINHACA` | 90,0 | **160,0** | 200,0 | 0,10 | **0,15** | 0,28 | `bonomi2015_vinhaca` | PRIMARIO |
| `TORTA_FILTRO` | 200,0 | **280,0** | 380,0 | 0,22 | **0,30** | 0,40 | `talha2016_bagaco`, `velasquez2020_sugarcane` | PRIMARIO |
| `BAGACO_CITROS` | 170,0 | **230,0** | 310,0 | 0,25 | **0,30** | 0,35 | `wikandari2014_citrus`, `pourbafrani2010_citrus` | **INTERPOLADO** (não-primário) |
| `CASCAS_CITROS` | 160,0 | **210,0** | 290,0 | 0,22 | **0,30** | 0,40 | `wikandari2014_citrus`, `pourbafrani2010_citrus` | não instanciado |
| `CASCA_CAFE` | 120,0 | **165,0** | 220,0 | 0,40 | **0,50** | 0,60 | `okonkwo2021_coffee`, `murto2004_substrates` | **INTERPOLADO** (não-primário) |
| `POLPA_CAFE` | 190,0 | **245,0** | 290,0 | 0,32 | **0,40** | 0,50 | `okonkwo2021_coffee` | não instanciado |
| `MUCILAGEM_CAFE` | 260,0 | **320,0** | 390,0 | 0,38 | **0,45** | 0,55 | `okonkwo2021_coffee` | não instanciado |
| `CASCA_SOJA` | 230,0 | **300,0** | 380,0 | 0,36 | **0,40** | 0,44 | `kafle2016_soy` | não instanciado |
| `PALHA_SOJA` | 150,0 | **220,0** | 280,0 | 0,05 | **0,15** | 0,25 | `kafle2016_soy`, `herrmann2012_corn` | **INTERPOLADO** (não-primário) |
| `PALHA_MILHO` | 150,0 | **230,0** | 300,0 | 0,15 | **0,1667** | 0,1833 | `herrmann2012_corn` | PRIMARIO |
| `CASCA_MILHO` | 110,0 | **145,0** | 185,0 | 0,38 | **0,45** | 0,52 | `herrmann2012_corn` | não instanciado |
| **`CAMA_AVIARIO`** | 200,0 | **280,0** | 360,0 | 0,42 | **0,50** | 0,58 | `abouelenien2014_poultry`, `angelidaki2003_manure` | **PRIMARIO** |
| `DEJETOS_AVES` | 150,0 | **250,0** | 340,0 | 0,52 | **0,60** | 0,68 | `abouelenien2014_poultry` | não instanciado |
| `ESTERCO_BOVINO` | 120,0 | **200,0** | 270,0 | 0,32 | **0,45** | 0,58 | `amon2007_cattle`, `embrapa2015_cattle` | PRIMARIO |
| `DEJETOS_BOVINO` | 90,0 | **155,0** | 220,0 | 0,42 | **0,50** | 0,58 | `moller2004_manure`, `embrapa2015_cattle` | não instanciado |
| `DEJETOS_SUINO` | 150,0 | **245,0** | 300,0 | 0,50 | **0,55** | 0,60 | `moller2004_manure`, `wall2014_swine`, `embrapa2012_swine` | **MEDIANA** (não-primário) |
| `ESTERCO_SUINO` | 150,0 | **235,0** | 320,0 | 0,48 | **0,55** | 0,62 | `moller2004_manure`, `wall2014_swine` | não instanciado |
| `FORSU` | 250,0 | **360,0** | 500,0 | 0,52 | **0,65** | 0,80 | `mata_alvarez2014_ofmsw`, `de_baere2012_forsu`, `snis2022_rsu` | **MEDIANA** (não-primário) |
| `ORGANICO_RSU` | 170,0 | **270,0** | 360,0 | 0,05 | **0,12** | 0,25 | `mata_alvarez2014_ofmsw` | não instanciado |
| `LODO_PRIMARIO` | 190,0 | **310,0** | 440,0 | 0,65 | **0,75** | 0,85 | `heerenklage2019_sludge`, `cetesb2020_sludge` | PRIMARIO |
| `LODO_SECUNDARIO` | 80,0 | **180,0** | 260,0 | 0,62 | **0,70** | 0,80 | `heerenklage2019_sludge` | PRIMARIO |
| `PODA_URBANA` | 100,0 | **175,0** | 250,0 | 0,20 | **0,35** | 0,55 | `pognani2011_garden`, `abrelpe2022_rsu` | **INTERPOLADO** (não-primário) |
| `GORDURA` | 700,0 | **850,0** | 1050,0 | 0,18 | **0,25** | 0,35 | `sheets2015_fats`, `davidsson2008_grease` | não instanciado |
| `SANGUE` | 300,0 | **450,0** | 620,0 | 0,38 | **0,45** | 0,52 | `sheets2015_fats` | não instanciado |

> **Nota sobre "primário/não-primário":** essa classificação **não é um campo do
> `feedstocks.yaml`**. Ela existe apenas no relatório A19 §5, que classifica os
> **15 feedstocks instanciados** no cálculo estadual. Os 11 restantes estão
> definidos no YAML mas não entram no total de SP — marcados "não instanciado".
> O YAML não carrega essa informação; um leitor do YAML sozinho não consegue
> reconstruí-la.

## 4.3 Os três pontos específicos

### 4.3.1 Cama de aviário — **DIVERGENTE (conflito confirmado, não resolvido)**

**Valor literal no YAML no HEAD:** `bmp.medio = 280.0` NmL CH₄/g VS
(min 200,0 / max 360,0).

**Comentários de proveniência inline no YAML** (são as `refs` estruturadas, não
comentários soltos):

```yaml
CAMA_AVIARIO:
  bmp:
    refs:
      - id: abouelenien2014_poultry
        value: "Poultry litter BMP 200–320 NmL/gVS (cama de aviário with sawdust bedding)"
      - id: angelidaki2003_manure
        value: "280 NmL/gVS reference for litter in co-digestion"
```

**O que o corpus diz** (A19 §4, tabela de corpora):

```
| `CAMA_AVIARIO` | 1 | 300,00 | 300,00 | 300,00 | Base individual em Quarentena |
```

— **n = 1**, min = mediana = max = **300,00**, e o próprio A19 marca a base como
*"em Quarentena"*.

**Como A19 §5 classifica:**

```
| `CAMA_AVIARIO` | 280,0 | **PRIMARIO** | `angelidaki2003_manure` | 280,0 NmL/gVS (poultry litter) | Bruto | **SIM** | 280,0 | Angelidaki et al. (2003) |
```

**Registro do conflito, com as três peças lado a lado:**

| Fonte | Valor | Estado |
|---|---:|---|
| `feedstocks.yaml` @ HEAD | **280,0** | é o valor que o cálculo usa |
| Corpus BMP (n=1) | **300,0** | base em quarentena |
| A19 §5 — classificação | 280,0 = **PRIMARIO** | não entra em nenhum dos cenários C1/C2/C3 |

> O conflito 300 vs 280 **persiste no HEAD** e é estruturalmente invisível para
> os cenários de correção: por estar classificado `PRIMARIO`, `CAMA_AVIARIO` tem
> delta **0,0000 / 0,00 %** em C1, C2 **e** C3 (A19 §6.3). Ou seja, **nenhum dos
> três cenários de saneamento paramétrico tocaria neste conflito.** A cama de
> aviário responde por 0,2342 M m³/d — 6,4 % do total estadual de A19.

### 4.3.2 FCo médio do bagaço — **CONFIRMADO: 0,22, não zero**

```console
$ python3 -c "...; print(fs['BAGACO']['fde']['components']['fco'])"
{'min': 0.15, 'medio': 0.22, 'max': 0.38}
```

`FCo médio de `BAGACO` = **0,22**`. Confirmado; não é zero.

### 4.3.3 Convenção de sinal do FCo — **CONFIRMADO: fração de excedente aplicada diretamente**

**A fórmula, na docstring do motor:**

```python
# backend/app/services/biogas_forward.py:20-22
#     Practical (mobilisable) potential applies the Effective Availability Factor:
#         m3_CH4_practical = m3_CH4_theoretical × FDE
#         where FDE = FC × FCo × FS × FL × eta   (each in [0, 1])
```

**A linha que implementa o produto** (validador de rastreabilidade):

```python
# backend/scripts/validate_fde_traceability.py:85
prod = comps["fc"][sc] * comps["fco"][sc] * comps["fs"][sc] * comps["fl"][sc]
```

```python
# backend/scripts/validate_fde_traceability.py:86-88
stored = blk["availability"][sc]
if abs(prod - stored) > TOL:
    errors.append(f"{code}.{sc}: availability {stored} != FC×FCo×FS×FL {prod:.4f}")
```

**E o loader, que combina com o eta:**

```python
# backend/app/services/canonical_loader.py:102-119
def _resolve_fde(entry: dict) -> Range:
    """Effective FDE = availability (FC×FCo×FS×FL) × eta (conversion efficiency)."""
    ...
    if "availability" in block:
        avail = _range_from(block["availability"])
        eta = _eta_range(block.get("eta"))
        return Range(avail.min * eta.min, avail.medio * eta.medio, avail.max * eta.max)
```

**Verificação aritmética independente, no `BAGACO`:**

```
FC × FCo × FS × FL  =  0,95 × 0,22 × 0,90 × 0,90  =  0,169290
availability.medio armazenado no YAML             =  0,1693
```

Bate. Se a convenção fosse a inversa (`1 − FCo`), o produto seria
`0,95 × 0,78 × 0,90 × 0,90 = 0,600` — quase 3,6× o valor armazenado.

> **Convenção implementada: `FCo` é a fração de EXCEDENTE, multiplicada
> DIRETAMENTE.** Não é o inverso. `FCo = 0,22` no bagaço significa "22 % sobra
> após usos concorrentes", não "22 % é consumido".
>
> **Alerta de nomenclatura:** o PR #165 §3 propõe renomear `fco` →
> `fco_available` com a convenção `fco_available == 1 - fcp_committed` escrita no
> cabeçalho, justamente por ter sido *"a fonte da divergência D1"*. **No HEAD o
> campo ainda se chama `fco`, sem a convenção escrita no cabeçalho do YAML.**
> A semântica está correta no código, mas não está declarada no arquivo de
> parâmetros.

## 4.4 Cenário C3 — os sete não-primários — **CONFIRMADO (existe só como cenário de manuscrito)**

**Definição literal, A19 §6.2 linha 261:**

> **CENÁRIO C3:** Corrigir TODOS os 7 feedstocks que não são `PRIMARIO` hoje
> (C2 + `DEJETOS_SUINO`=210,0 + `FORSU`=310,0).

**Os sete, com valores atuais e alvos:**

| # | Código | BMP médio atual (HEAD) | BMP alvo C3 | Classe A19 | Δ CH₄ (M m³/d) | Δ % |
|---|---|---:|---:|---|---:|---:|
| 1 | `BAGACO` | **165,0** | 187,9 | INTERPOLADO | +0,2728 | +13,88 % |
| 2 | `BAGACO_CITROS` | **230,0** | 185,0 | INTERPOLADO | −0,0197 | −19,57 % |
| 3 | `CASCA_CAFE` | **165,0** | 150,0 | INTERPOLADO | −0,0015 | −9,09 % |
| 4 | `PALHA_SOJA` | **220,0** | 200,0 | INTERPOLADO | −0,0076 | −9,09 % |
| 5 | `PODA_URBANA` | **175,0** | 140,0 | INTERPOLADO | −0,0018 | −20,00 % |
| 6 | `DEJETOS_SUINO` | **245,0** | 210,0 | MEDIANA | −0,0012 | −14,29 % |
| 7 | `FORSU` | **360,0** | 310,0 | MEDIANA | −0,0500 | −13,89 % |

Todos os sete "BMP médio atual" foram conferidos **contra o YAML no HEAD**
(§4.2) — os sete conferem com o que A19 declarou.

### C3 está codificado no repositório?

```console
$ grep -rni "cenário c3\|scenario c3\|\bC3\b" --exclude-dir=.git --exclude-dir=node_modules .
```

Todos os acertos com semântica de "cenário C3" estão em **um único arquivo**:

```
docs/auditorias/A19_AUDITORIA_PARAMETRICA_2026-07-29.md:36
docs/auditorias/A19_AUDITORIA_PARAMETRICA_2026-07-29.md:43,44
docs/auditorias/A19_AUDITORIA_PARAMETRICA_2026-07-29.md:261,267,292,300,303,304,334
```

Os demais acertos de "C3" são **falsos positivos**: `%C3%` de URL-encoding em
CSVs de referências e num link do `Footer.tsx`, uma seção "C3. Limonene
Inhibition" do `SCIENTIFIC_AUDIT_REPORT.md`, uma seção "C3. IBGE — population"
do `OPEN_DATA_API_LANDSCAPE.md`, e bytes casuais em PNG/XLSX/TIF.

> **Resposta: C3 NÃO está codificado em lugar nenhum.** Nem no `feedstocks.yaml`,
> nem em script, nem em teste, nem em configuração. Existe **exclusivamente como
> cenário narrativo dentro do relatório A19**, cujos números foram calculados
> fora do controle de versão. A19 §6.3 recomenda *"Aplicar integralmente o
> CENÁRIO C3 em um Lote B único e atômico"* — **esse lote não foi executado.**

## 4.5 Totais canônicos como existem nos resultados commitados — **DIVERGENTE**

Este é o achado mais sério do relatório. **Existem TRÊS conjuntos de totais
estaduais mutuamente inconsistentes, todos commitados e vigentes no HEAD.**

### Conjunto A — `SP_TOTAIS_CONSOLIDADOS_2026-07-30.json`

```
potencial_mobilizavel.ch4_m3_ano        = 3.037.463.853   (3,037 bi Nm³/ano)
potencial_mobilizavel.ch4_m3_dia        = 8.321.819       (8,32 M m³/d)
faixa_ch4_m3_ano                        = [1.846.214.705, 4.543.010.314]
potencial_mobilizavel_corrigido_rsu     = 2.665.434.387   (2,665 bi Nm³/ano)
```

### Conjunto B — `docs/data/RESULTADOS_SP_PARA_PAPER_2026-07-30.md` ("números publicáveis")

```
| Metano / Biometano (Nm³/ano) | Real 7.832.143.834 | Ideal 9.841.178.207 |
| Metano / Biometano (Nm³/dia) | Real 21.457.928    | Ideal 26.962.132    |
```

### Conjunto C — `A19_AUDITORIA_PARAMETRICA_2026-07-29.md` (linha de base HEAD)

```
| **Linha de Base HEAD (`75e0b1e`)** | **3,6488** M m³/dia | **1.331,82** M m³/ano |
```

### RESOLUÇÃO DO AUTOR (2026-08-01)

Consultado sobre qual dos conjuntos é o vigente, o autor determinou:

> *"This is the latest values calculated — 7.832 bi
> (`RESULTADOS_SP_PARA_PAPER_2026-07-30.md`)."*

**O Conjunto B é o valor vigente.** Em consequência:

| Conjunto | Situação a partir de 2026-08-01 |
|---|---|
| **B** — `RESULTADOS_SP_PARA_PAPER_2026-07-30.md` (7,832 bi Real / 9,841 bi Ideal) | **VIGENTE** — é o número do manuscrito |
| A — `SP_TOTAIS_CONSOLIDADOS_2026-07-30.json` (3,037 bi) | **SUPERADO** |
| C — A19, linha de base HEAD (1,332 bi) | Diagnóstico paramétrico sobre estado anterior; não é número publicável |

Isto resolve a pergunta *"qual é o número"*. **A auditoria nunca apontou erro de
cálculo** — apontou a coexistência de três artefatos sem marcador de precedência.
Com a determinação acima, o mérito está resolvido.

**Pendência residual (documental, não numérica):** os Conjuntos A e C continuam
no repositório **sem marcador de superação**, e a exclusão deliberada do bagaço
que separa B de A (fator 2,6× no total) não tem nota de delta versionada. Um
revisor que abrir `SP_TOTAIS_CONSOLIDADOS_2026-07-30.json` — mesma data,
aparência de canônico — lerá 3,037 bi. Ver D1 revisto em §8.1.

### Confronto com os valores esperados no enunciado

| Grandeza | Esperado | Conjunto A | Conjunto B | Conjunto C | Veredito |
|---|---|---|---|---|---|
| **CH₄ central** | 3,060 | 3,037 bi/ano · 8,32 M/d | **7,832** bi/ano · 21,46 M/d | 1,332 bi/ano · 3,6488 M/d | **DIVERGENTE** |
| **Envelope baixo** | 0,894 | **1,846** bi/ano | n/d (cenário, não banda) | n/d | **DIVERGENTE** |
| **Envelope alto** | 10,515 | **4,543** bi/ano | 9,841 bi/ano (Ideal) | n/d | **DIVERGENTE** |
| **Total C3** | 3,84 | ausente | ausente | **3,8399** M m³/d | **CONFIRMADO** (A19 §6.3) |
| **Fração do bagaço** | 31,7 % | ausente | **0,0 %** (excluído) | ~53,9 % (1,9658/3,6488) | **DIVERGENTE** |
| **Fração orgânicos urbanos** | 22,5 % | ausente | **6,3 %** (RSU 5,1 + esgoto 0,9 + poda 0,3) | ~11,7 % (FORSU+PODA)/total | **DIVERGENTE** |
| **Gini** | 0,533 | ausente | ausente | ausente | **NAO_VERIFICAVEL** |
| **Municípios com 67 %** | ~184 | ausente | ausente | ausente | **NAO_VERIFICAVEL** |

**Notas de leitura, com citação literal.**

*Sobre o total C3 = 3,84* — único valor que fecha. A19 §6.3:

```
| **Cenário C3 (TODOS NÃO-PRIMÁRIOS)** | **3,8399** | **1.401,58** | **+0,1911** | **+5,24 %** |
```

Mas é o total de um cenário **não implementado** (§4.4), calculado sobre uma
linha de base (`75e0b1e`) que **não existe neste clone**:

```console
$ git cat-file -t 75e0b1e
fatal: Not a valid object name 75e0b1e
```

*Sobre a fração do bagaço* — o Conjunto B a coloca em **zero**, por decisão
explícita e documentada:

> **Bagaço de cana está deliberadamente ausente.** O Atlas (p.65) o classifica
> entre os resíduos *"já aproveitados para geração de energia"* […] Contabilizá-lo
> duplicaria energia que o setor sucroenergético já recupera em caldeiras.

Enquanto o Conjunto C tem o bagaço como **o maior item isolado**: `BAGACO` =
1,9658 de 3,6488 M m³/d. **Os dois documentos publicáveis, ambos datados de
2026-07-30, discordam sobre se o maior fluxo do estado entra ou não na conta.**

*Sobre Gini e os 184 municípios* — **NAO_VERIFICAVEL**. Ambos existem apenas
como citação de um arquivo ausente:

```
A10_RECONCILIACAO_MANUSCRITO_2026-07-29.md:485: | `gini.value` | **0,5330579289850965** |
A10_RECONCILIACAO_MANUSCRITO_2026-07-29.md:491: **Os números do manuscrito (184 municípios / 67,11 % / Gini 0,533) CONFEREM com o …
A18-VERIFICACAO-PAPER_2026-07-29.md:58: | **Gini** | 0,5264 (JSON) / 0,5331 (Lote 2) | … | `canonical_results.json:spatial_concentration.gini` |
```

A fonte declarada é `canonical_results.json`, que **não existe no HEAD** (§3.3).
A18 registra inclusive **dois** valores de Gini divergentes entre si (0,5264 vs
0,5331). Nenhum é recomputável a partir do que está versionado.

---

# PARTE 5 — BLOCKER-13 (roteamento de área de cultivo)

## 5.1 Milho, soja e café: a via ponta a ponta — **DIVERGENTE**

### O que o gerador canônico *declara*

```python
# compute_sp_canonical_totals.py:22
  soybean/corn/coffee: CSV already contains residue-equivalent tonnes from MapBiomas × yield_t_ha
```

```python
# compute_sp_canonical_totals.py:111
AGRICULTURAL_DIRECT = ("soybean", "corn", "coffee")  # MapBiomas × yield_t_ha → residue tonnes
```

```python
# compute_sp_canonical_totals.py:239-251
    # ── 3. Other agricultural (MapBiomas × yield_t_ha → residue tonnes) ─────
    for stream in AGRICULTURAL_DIRECT:
        count = _csv_state_total(rows, f"{stream}_biomass_tons_year")
        _accumulate(
            totals, out_rows, stream=stream, sector="agricultural",
            provenance="csv_residue_tonnes",
            input_count=count, biomass={sc: count for sc in SCENARIOS},
            params=get_params_for_stream(stream),
        )
```

Note que a função **não calcula nada de área**: lê a coluna
`{stream}_biomass_tons_year` já pronta e a repassa. Toda a atribuição a
MapBiomas está no **comentário**, não no código.

### O que a cadeia de dados *é*

Cadeia real, rastreada arquivo a arquivo:

```
analysis/data/01_master_residue_streams_SP_2023.csv        (formato LONGO, rastreado)
   │  colunas: ibge_code, year, residue_stream, residue_tons_yr, populacao_2022, source_dataset
   ▼  backend/scripts/load_biomass_from_master.py
   ▼  backend/app/services/biomass_import.py:96 build_municipality_biomass()
docs/data/municipality_biomass_tons.csv                    (derivado, 645 municípios)
   ▼  backend/scripts/compute_sp_canonical_totals.py:58 (_CSV)
   ▼  backend/app/services/biogas_forward.py + canonical_loader.py + feedstocks.yaml
backend/scripts/canonical_recalc_output/sp_canonical_by_stream.csv   (gitignored)
```

`biomass_import.py:135-139` — o milho/soja/café são repassados como toneladas,
sem nenhuma multiplicação por área:

```python
        if stream in AGRICULTURAL_STREAM_TO_KEY:
            key = AGRICULTURAL_STREAM_TO_KEY[stream]
            if raw > 0:
                rec[_CONFIG_BY_KEY[key].biomass_field] += raw  # raw is tonnes
```

**Primeira linha de dados do master longo**, literal:

```json
{ "ibge_code": "3500105", "municipality_name": "Adamantina", "year": "2023",
  "residue_stream": "coffee", "residue_tons_yr": "638.8",
  "conversion_factor": "280.0", "cf_unit": "m³/ton",
  "source_dataset": "CP2B_municipalities_DB+IBGE_PAM_PPM_PEVS" }
```

> O campo de proveniência do próprio dado diz **`CP2B_municipalities_DB +
> IBGE_PAM_PPM_PEVS`**. **MapBiomas não aparece.**

**Colunas de cultura do master largo** (`SP_master_residue_streams_2023_FINAL.csv`):

```
area_ha_Café_em_grão_Total     prod_t_Café_em_grão_Total
area_ha_Milho_em_grão          prod_t_Milho_em_grão
area_ha_Soja_em_grão           prod_t_Soja_em_grão
area_ha_Sorgo_em_grão          prod_t_Amendoim_em_casca   (…36 colunas ao todo)
```

> São **nomenclaturas literais do PAM/SIDRA**, com **área E produção declaradas
> pela mesma fonte**. "Amendoim em casca", "Sorgo em grão", "Café em grão Total"
> **não existem como classes do MapBiomas**. Um raster de uso do solo não
> distingue amendoim de sorgo.

### O único código que de fato usa área MapBiomas

```python
# backend/scripts/load_biomass_tons.py:6-9 (docstring)
Primary source:
  MapBiomas Collection 10 CSV (FINAL_FILES-20260426T151225Z-3-001)
  → land use area (ha) per municipality per year (we use 2024 column)
  → multiply by per-crop residue yield factors (t biomass residue / ha)
```

```python
# backend/scripts/load_biomass_tons.py:88-108
MAPBIOMAS_YIELD = {
    20: {"key": "sugarcane", "yield_t_ha": round(12.0 * SUGARCANE_COLLECTIBLE_FRACTION, 1), ...},
    39: {"key": "soybean", "yield_t_ha": 4.0, "note": "~3.5 t/ha grain × 1.15 residue ratio"},
    41: {"key": "corn",    "yield_t_ha": 4.5, "note": "Other Temporary Crops proxy — corn is dominant in SP but class is mixed"},
    46: {"key": "coffee",  "yield_t_ha": 0.6, "note": "1.5 t cherry/ha × 40% husks/pulp dry matter"},
    47: {"key": "citrus",  "yield_t_ha": 5.0, ...},
}
```

Três observações decisivas sobre este script:

1. **Ele não está na cadeia canônica.** `run_migrations.py:121-123` invoca
   `load_biomass_from_master`, não `load_biomass_tons`. As demais menções são
   comentários. `migrations/006_biomass_tons.sql:3` declara *"Populated by
   backend/scripts/load_biomass_tons.py using MapBiomas 2024"* — um caminho
   legado.
2. **Mesmo aqui não há produtividade PAM.** Os `yield_t_ha` são **constantes
   literárias fixas** (4,0 / 4,5 / 0,6 t/ha para todo o estado), não a
   produtividade municipal do PAM. A fórmula "Área MapBiomas × Produtividade
   PAM" **não está implementada em lugar nenhum do repositório**.
3. **O milho não tem classe própria.** Classe 41 = *"Other Temporary Crops"*,
   usada como *proxy* — o próprio comentário admite que a classe é mista.

### Respostas diretas

| Cultura | Área vem de raster MapBiomas? | Vem do PAM? | Mistura? |
|---|---|---|---|
| **Milho** | **Não** na cadeia canônica. Só em `load_biomass_tons.py` (fora da cadeia), e ali via classe 41 mista. | **Sim** — `prod_t_Milho_em_grão` / `area_ha_Milho_em_grão`, `source_dataset` = IBGE_PAM_PPM_PEVS. | Não no que produz os números publicados. |
| **Soja** | Idem (classe 39, fora da cadeia). | **Sim** — `prod_t_Soja_em_grão`. | Idem. |
| **Café** | Idem (classe 46, fora da cadeia). | **Sim** — `prod_t_Café_em_grão_Total`. | Idem. |

> **DIVERGENTE. A docstring do gerador canônico (linhas 22 e 111) atribui ao
> MapBiomas uma participação que o dado não tem.** Este é o núcleo do
> BLOCKER-13, e ele **permanece aberto no HEAD**: o relatório B11 (2026-07-29)
> recomendou explicitamente *"Corrigir o docstring de
> `compute_sp_canonical_totals.py:22`"* como *"o item de menor custo e maior
> efeito sobre o manuscrito"*. **A linha 22 está intacta no HEAD de 2026-07-31.**
>
> Enquanto isso, `blocker_13_provenance.json` declara
> `"blocker_13_status": "RESOLVED"` e `"primary_source": "MapBiomas Coleção 10 ×
> Produtividade Agrícola IBGE PAM"` — **uma metodologia que não existe no
> código.** O BLOCKER-13 está marcado como resolvido com base numa descrição
> incorreta da própria cadeia, e com um SHA-256 que não bate (§3.3).

## 5.2 Identificador de release do MapBiomas — todas as ocorrências — **DIVERGENTE**

```console
$ grep -rniE "cole[cç][aã]o *1?[0-9](\.[0-9])?|collection *1?[0-9](\.[0-9])?" --include=*.py --include=*.ts --include=*.tsx --include=*.json --include=*.yaml --include=*.md . | grep -i mapbiomas
```

| Arquivo:linha | String literal | Coleção |
|---|---|---|
| `backend/data/mapbiomas/mapbiomas_metadata.json:5` | `"source": "MapBiomas Collection 8"` | **8** |
| `backend/setup_mapbiomas.py:35` | `"source": "MapBiomas Collection 8"` | **8** |
| `backend/app/services/mapbiomas_service.py:31` | `# Based on MapBiomas Collection 8.0` | **8.0** |
| `backend/app/services/mapbiomas_service.py:267` | `"source": "MapBiomas Collection 8.0"` | **8.0** |
| `backend/tests/unit/services/test_mapbiomas_service.py:399` | `assert info["source"] == "MapBiomas Collection 8.0"` | **8.0** (teste **fixa** o valor estagnado) |
| `frontend/src/components/map/MapBiomasLegend.tsx:82` | `Fonte: MapBiomas Collection 8` | **8** (visível ao usuário) |
| `docs/PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md:96` | `MapBiomas (Collection 8)` | **8** |
| `docs/PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md:140` | `MapBiomas integration \| ✅ Implemented \| Collection 8` | **8** |
| `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:6` | `MapBiomas Collection 9` | **9** |
| `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:206` | `MapBiomas Collection 9 \| Land-use classification for crop/pasture areas` | **9** |
| `backend/scripts/load_biomass_tons.py:7` | `MapBiomas Collection 10 CSV (FINAL_FILES-20260426T151225Z-3-001)` | **10** |
| `data/canonical_parameters/blocker_13_provenance.json` | `"MapBiomas Coleção 10 × Produtividade Agrícola IBGE PAM"` | **10** |
| `docs/data/SCIENTIFIC_AUDIT_REPORT.md:621` | `MapBiomas Collection 10 (2024 column) and crop production data (PAM 2023)` | **10** |
| `docs/data/METADATA.json:52` | `"doi": "10.58053/MapBiomas/JNJGVT (Collection 10 reference; confirm DOI for the collection actually used)"` | **10**, com ressalva |
| `frontend/messages/en.json:1029` | `"Update Priority: MapBiomas Collection 10.0 and PAM 2024"` | **10.0** |
| `docs/planning/BRAZIL_EXPANSION_ROADMAP.md:143` | `Collection 8 in code, 9 in paper, 10/10.1 data in hand` | **8/9/10/10.1** |
| `docs/planning/BRAZIL_EXPANSION_ROADMAP.md:285` | `Ingest: MapBiomas Collection 10.1 LULC + 2008–2024 transition matrices` | **10.1** (planejado) |
| `docs/planning/playbooks/2026-10_OCTOBER.md:22,33,60` | `MapBiomas Collection 10.1 ingest`; `Retire the Collection 8 code path`; `Collection 8 code gone` | **10.1** (outubro) |
| `docs/data/METADATA.json:7` | `"DISCREPANCY: MapBiomas collection — code references Collection 8.0 …, while FOSS4G_PAPER_SUPPLEMENT.md states Collection 9. Reconcile and state ONE collection in the paper."` | discrepância auto-declarada |
| `docs/data/B11-ETAPA0-PROVENIENCIA_2026-07-29.md:33` | `Metadados do raster declaram Collection 8 / year 2024` vs `Coleção 10.1, ano 2024` afirmado | **8 vs 10.1** |

> **DIVERGENTE. Existem QUATRO identificadores de coleção simultâneos no HEAD:
> 8 / 8.0 (código, teste, UI, metadados do raster), 9 (suplemento do paper),
> 10 (scripts e proveniência do BLOCKER-13) e 10.1 (planejamento e camadas de
> infraestrutura).** O valor esperado — **Coleção 10.1, ano de referência 2024**
> — **não aparece em nenhum ponto do código do inventário**; só em documentos de
> planejamento (para outubro) e no dataset vetorial de **infraestrutura**.
>
> As ocorrências mais graves são as **estagnadas**:
> `test_mapbiomas_service.py:399` **trava** `Collection 8.0` por asserção — o CI
> falharia se alguém corrigisse o código; e `MapBiomasLegend.tsx:82` exibe
> `Collection 8` **ao público na interface**.
>
> B11 §2.1 registra ainda que a etiqueta é internamente impossível: *"A Coleção 8
> do MapBiomas termina em 2022; a Coleção 9 vai até 2023; só a Coleção 10 alcança
> 2024. `Collection 8` + `year 2024` não pode ser verdadeiro simultaneamente."*

## 5.3 O join entre anos — **DIVERGENTE (não há join entre anos)**

**O que se procura:** ano X de área MapBiomas × ano Y de produtividade PAM, e
onde esse join é feito.

**O que existe:**

| Fonte | Ano | Evidência literal |
|---|---|---|
| Master canônico de SP | **2023**, uniforme | coluna `year` = `"2023"`; B11 §2.3: *"5.769 de 5.769 linhas (100%). Não há mistura de anos."* |
| `load_biomass_tons.py` (fora da cadeia) | **2024** | `YEAR_COLUMN = "2024"` (linha 74) |
| População urbana | **2022** | `SP_POPULATION = 44_411_238` (Censo 2022), constante literal |
| SNIS | **2022** | `promote_snis.py:4-5` (`--years 2008-2022`) |
| PPM | **2024** | `ingest/sources/ibge_ppm/source.py:12-16` |

> **Não existe join entre ano de MapBiomas e ano de PAM na cadeia canônica,
> porque não existe leitura de MapBiomas na cadeia canônica.** Área e produção
> vêm ambas do PAM, do mesmo ano, na mesma linha do mesmo arquivo
> (`area_ha_Milho_em_grão` e `prod_t_Milho_em_grão`, §5.1). Não há
> cruzamento entre anos a documentar.

**O ano está fixado em código ou inferido em runtime?**

- Na cadeia canônica: **fixado no dado**, não no código. `compute_sp_canonical_totals.py`
  **não filtra por ano** — soma a coluna inteira do CSV (`_csv_state_total`,
  linhas 116-117). Se o CSV trouxesse múltiplos anos, eles seriam **somados
  silenciosamente**. A uniformidade 2023 é uma propriedade do arquivo, não uma
  garantia do código.
- Em `load_biomass_tons.py`: **fixado em código** (`YEAR_COLUMN = "2024"`),
  literal, sem parametrização.
- A população: **fixada em código** (constante), **sem regra de projeção** para
  anos > 2022 — B11 §2.4 confirma a busca sem resultado.

> **DIVERGENTE quanto à declaração de ano do manuscrito.** O inventário é
> **2023** (PAM), a população é **2022** (Censo), o SNIS é **2022**, o PPM é
> **2024**. Não há um "ano de referência" único a declarar. A alegação de ano
> **2024** para a base de biomassa não é sustentável pelo dado versionado.

---

# PARTE 6 — STACK E VERIFICAÇÕES DE FALSAS ALEGAÇÕES

## 6.1 react-leaflet, leaflet e Mapbox — **CONFIRMADO**

```console
$ grep -nE '"(react-leaflet|leaflet|next|react)"' frontend/package.json
58:    "leaflet": "^1.9.4",
61:    "next": "^16.2.6",
64:    "react": "^19.2.6",
68:    "react-leaflet": "^4.2.1",
```

Resolução efetiva no lockfile (`package-lock.json`):

```console
node_modules/react-leaflet -> 4.2.1
node_modules/leaflet       -> 1.9.4
node_modules/next          -> 16.2.6
mapbox in lock: []
```

| Pacote | Declarado | Travado no lock |
|---|---|---|
| `react-leaflet` | `^4.2.1` | **4.2.1** |
| `leaflet` | `^1.9.4` | **1.9.4** |
| `mapbox-gl` | **ausente** | **ausente** (lista vazia) |

### Grep de `mapbox` em todo o repositório

```console
$ grep -rni "mapbox" --exclude-dir=.git --exclude-dir=node_modules . | wc -l
6
```

**Seis acertos, todos em documentos de auditoria, todos registrando a ausência:**

| Arquivo:linha | Contexto literal |
|---|---|
| `docs/data/A18-VERIFICACAO-PAPER_2026-07-29.md:20` | `\| **Biblioteca de Mapas** \| Mapbox GL JS \| Leaflet / React-Leaflet (react-leaflet ^4.2.1, leaflet ^1.9.4; Mapbox ausente) \| frontend/package.json:dependencies \| **MÉDIO**. Legenda da Figura 1 e Seção de Arquitetura. \|` |
| `docs/data/A18-VERIFICACAO-PAPER_2026-07-29.md:475` | `* **Manuscrito / Legenda Fig 1:** Afirma **Mapbox GL JS**.` |
| `docs/data/A18-VERIFICACAO-PAPER_2026-07-29.md:476` | `* **Repositório (frontend/package.json):** mapbox-gl **NÃO EXISTE**. O sistema utiliza **React-Leaflet (react-leaflet ^4.2.1)** e **Leaflet (leaflet ^1.9.4)**.` |
| `docs/auditorias/A10_RECONCILIACAO_MANUSCRITO_2026-07-29.md:721` | `**3.2 mapbox-gl — [OK-5].** Ausente de package.json (dependências e devDependencies) e` |
| `docs/auditorias/A10_RECONCILIACAO_MANUSCRITO_2026-07-29.md:722` | `sem qualquer ocorrência da string mapbox em frontend/src. Nenhum resíduo. maplibre-gl` |
| `docs/auditorias/A10_RECONCILIACAO_MANUSCRITO_2026-07-29.md:1059` | `- **[OK-5]** mapbox-gl totalmente ausente de dependências e de imports. Nenhum resíduo.` |

> **CONFIRMADO: zero ocorrências de `mapbox` em código, configuração, i18n,
> assets de figura ou lockfile.** Os 6 acertos são metadiscurso de auditoria. **A
> alegação de "Mapbox GL JS" existe apenas no manuscrito**, e o repositório a
> contradiz de forma limpa.

## 6.2 Next.js, FastAPI, PostgreSQL, PostGIS — **CONFIRMADO**

```console
$ grep -inE "^(fastapi|uvicorn|sqlalchemy|psycopg|geoalchemy)" backend/requirements.txt
3:fastapi==0.136.1  # Updated from 0.115.7 — pulls starlette>=0.49.1 (fixes CVE-2025-54121, CVE-2025-62727)
4:uvicorn[standard]==0.47.0  # Updated from 0.24.0 - stability improvements
8:sqlalchemy==2.0.49
9:psycopg2-binary==2.9.12
32:geoalchemy2==0.20.0

$ grep -rniE "postgis/postgis|image: *post" --include=*.yml --include=*.yaml .
./docker-compose.yml:9:    image: postgis/postgis:15-3.4
./tests/ogc/docker-compose.ogc.yml:16:    image: postgis/postgis:15-3.4
./backend/docker-compose.production.yml:80:  # postgres:
./backend/docker-compose.production.yml:81:  #   image: postgis/postgis:15-3.4
```

| Componente | Versão efetivamente pinada |
|---|---|
| **Next.js** | `^16.2.6` → lock **16.2.6** |
| React | `^19.2.6` |
| **FastAPI** | **`0.136.1`** (pin exato `==`) |
| uvicorn | `0.47.0` (pin exato) |
| SQLAlchemy | `2.0.49` · psycopg2-binary `2.9.12` · GeoAlchemy2 `0.20.0` |
| **PostgreSQL** | **15** (via imagem) |
| **PostGIS** | **3.4** (via imagem `postgis/postgis:15-3.4`) |

> Ressalva: em produção o bloco `postgres` do `docker-compose.production.yml`
> está **comentado** (linhas 80-81) — o banco de produção é externo (o
> `DATABASE_URL` aponta para Supabase em vários scripts). **A versão real do
> PostgreSQL/PostGIS em produção não é determinável a partir do repositório**
> (NAO_VERIFICAVEL); 15/3.4 é a versão de desenvolvimento e de CI.

## 6.3 Cobertura municipal do SNIS — **NAO_VERIFICAVEL**

**Numerador/denominador medidos: não computáveis a partir do que está commitado.**

```console
$ ls cp2b-workspace/NewLook/data/canonical_parameters/snis_sp_activity_2022.csv
ls: cannot access ...: No such file or directory
$ git ls-files | grep -i "snis_sp_activity"
(saída vazia)
$ find . -iname "*snis*" -not -path "./.git/*" -not -path "*/node_modules/*"
./cp2b-workspace/NewLook/backend/scripts/promote_snis.py
./cp2b-workspace/NewLook/backend/ingest/sources/snis
```

Só existem o promotor e a fonte de ingestão. **Não há snapshot de dados do SNIS
versionado**, e `.gitignore` ignora `backend/data/raw/*` (§1.6). Os valores
214/431 aparecem apenas como **citação de um arquivo ausente**:

```
docs/data/A18-VERIFICACAO-PAPER_2026-07-29.md:25: Apenas 33,18% dos municípios (214 de 645) possuem valor medido (CO111); 431 usam fallback populacional | `canonical_results.json:coverage.forsu` / `data/canonical_parameters/snis_sp_activity_2022.csv`
docs/auditorias/A10_RECONCILIACAO_MANUSCRITO_2026-07-29.md:524:  "route_counts": { "population_fallback": 431, "snis_co111": 214 }
```

E B11 §3.2 já havia registrado o problema:

> **Esse arquivo não existe nesta branch, não é rastreado, e nada no backend o
> lê.** Ele foi adicionado no commit `78f92fd` […] que pertence **exclusivamente**
> a `fix/canonical-consistency-2026-07` e **não é ancestral do HEAD atual**.

> **NAO_VERIFICAVEL. Os números 214/431 não são mediveis no HEAD**: nem o CSV do
> SNIS nem o `canonical_results.json` que os agrega existem aqui. A aritmética
> 214 + 431 = 645 fecha, mas fechar não é medir. Resolução em §8.2.

## 6.4 Strings proibidas — grep completo

Buscas limitadas a fontes, docs, notebooks, configuração e SQL, **excluindo**
`node_modules`, `package-lock.json`, GeoJSON de fronteiras e o `.git`.

| String | Acertos substantivos | Veredito |
|---|---|---|
| **`133.82`** | **NENHUM** | **CONFIRMADO ausente** |
| **`empirically validated`** | **NENHUM** | **CONFIRMADO ausente** |
| **`Mapbox`** | 2 (ambos em `A18-VERIFICACAO-PAPER`, §6.1) | **CONFIRMADO** — só metadiscurso de auditoria |
| **`19.69`** | **6 substantivos** | **DIVERGENTE — presente no código** |
| `13.2` | 2, ambos falsos positivos | ausente de fato |
| `48.3` / `15.2` | falsos positivos apenas | ausente de fato |
| `85%` | 12+ acertos, semântica distinta | não é a alegação proibida |

### `19.69` — os seis acertos, com contexto

```
backend/scripts/run_manuscript_validation.py:65:    "total_M_m3_dia": 19.69,
backend/scripts/validate_manuscript_data.sql:10:--   • Aggregate state total  — 19.69 M m³/dia
backend/scripts/validate_manuscript_data.sql:32:--    Manuscript claim: 19.69 M m³/dia (≈ 7,187 M m³/ano)
backend/scripts/validate_manuscript_data.sql:42:    19.69                                                 AS manuscript_M_m3_dia,
backend/scripts/validate_manuscript_data.sql:45:        - 19.69,
backend/ingest/sources/aneel_siga/source.py:6:(`validation_plants_registry`) and settle the 19.69 vs 6.39 unit discrepancy.
backend/ingest/sources/aneel_siga/source.py:15:UNIT AUDIT (the 19.69 vs 6.39 discrepancy): SIGA's `MdaPotenciaOutorgadaKw`
backend/ingest/sources/aneel_siga/source.py:16:is in **kW**. 19.69 vs 6.39 is consistent with one number being read as GW
```

Contexto literal em `run_manuscript_validation.py`:

```python
# Manuscript reference values for comparison
MANUSCRIPT = {
    "total_M_m3_dia": 19.69,
    "industrial_scale_count": 125,
    "medium_count": 293,
    "sugarcane_pct_theoretical": 84.6,
    "sugarcane_pct_practical": 61.3,
    "mae_facility_pct": 20.8,
}
```

> **DIVERGENTE. `19.69` está codificado como valor de referência do manuscrito
> em dois scripts de validação executáveis** — não em comentário morto, mas como
> constante Python e como literal SQL de comparação. Junto dela vão outras cinco
> constantes de manuscrito (`125`, `293`, `84.6`, `61.3`, `20.8`) que nenhum dos
> três conjuntos de totais do §4.5 reproduz. Em `aneel_siga/source.py` as
> menções são de **auditoria de unidade** (kW vs GW) e têm caráter diferente —
> ali o `19.69` é o objeto do diagnóstico, não uma alegação.

### Falsos positivos, para o registro

- `13.2`: `Footer.tsx:44` (coordenada de um `<path>` SVG do ícone do WhatsApp) e
  `.pre-commit-config.yaml:15` (`rev: 5.13.2`).
- `48.3` / `15.2`: coordenadas em `brazilStates.ts` e valores de distância em
  `br_intermediary_regions_distances.sql`.
- `85%`: aparece 12+ vezes em `residueFactors.ts` e `MethodologyModal.tsx`, mas
  sempre como justificativa de fator FDE (`'85% coletável mecanicamente'`,
  `'CETESB P4.231 fertirrigação obrigatória 85% → 15% excedente'`), não como
  alegação de acurácia/cobertura. **Não é a string proibida.**

---

# PARTE 7 — TRILHA DE AUDITORIA

## 7.1 Conteúdo de `docs/auditorias/` — **CONFIRMADO**

```console
$ ls docs/auditorias/
ls: cannot access 'docs/auditorias': No such file or directory

$ ls -la cp2b-workspace/NewLook/docs/auditorias/
total 168
-rw-r--r-- 1 root root 70785 A10_RECONCILIACAO_MANUSCRITO_2026-07-29.md
-rw-r--r-- 1 root root 16661 A17_PRE_MERGE_PR165_2026-07-29.md
-rw-r--r-- 1 root root 14064 A18_INSUMOS_E_BMP_BAGACO_2026-07-29.md
-rw-r--r-- 1 root root 34324 A19_AUDITORIA_PARAMETRICA_2026-07-29.md
-rw-r--r-- 1 root root 13208 B7_SANEAMENTO_PRE_MERGE_2026-07-29.md
```

Relatórios de lote fora desse diretório:

```console
$ git ls-files | grep -iE "auditoria|/A[0-9]+_|/B[0-9]+"
cp2b-workspace/NewLook/docs/auditorias/A10_RECONCILIACAO_MANUSCRITO_2026-07-29.md
cp2b-workspace/NewLook/docs/auditorias/A17_PRE_MERGE_PR165_2026-07-29.md
cp2b-workspace/NewLook/docs/auditorias/A18_INSUMOS_E_BMP_BAGACO_2026-07-29.md
cp2b-workspace/NewLook/docs/auditorias/A19_AUDITORIA_PARAMETRICA_2026-07-29.md
cp2b-workspace/NewLook/docs/auditorias/B7_SANEAMENTO_PRE_MERGE_2026-07-29.md
docs/data/B11-ETAPA0-PROVENIENCIA_2026-07-29.md
```

Há também `docs/data/A18-VERIFICACAO-PAPER_2026-07-29.md` (nomenclatura A18
duplicada, assunto diferente do `A18_INSUMOS_E_BMP_BAGACO`).

| Documento | Data | Lote | Local |
|---|---|---|---|
| `A10_RECONCILIACAO_MANUSCRITO` | 2026-07-29 | A10 | `NewLook/docs/auditorias/` |
| `A17_PRE_MERGE_PR165` | 2026-07-29 | A17 | `NewLook/docs/auditorias/` |
| `A18_INSUMOS_E_BMP_BAGACO` | 2026-07-29 | A18 | `NewLook/docs/auditorias/` |
| `A18-VERIFICACAO-PAPER` | 2026-07-29 | A18 (bis) | `NewLook/docs/data/` |
| **`A19_AUDITORIA_PARAMETRICA`** | **2026-07-29** | **A19** | `NewLook/docs/auditorias/` |
| `B7_SANEAMENTO_PRE_MERGE` | 2026-07-29 | B7 | `NewLook/docs/auditorias/` |
| **`B11-ETAPA0-PROVENIENCIA`** | **2026-07-29** | **B11** | `docs/data/` (raiz) |

- **Lote A mais recente: A19** (`A19_AUDITORIA_PARAMETRICA_2026-07-29.md`).
- **Lote B mais recente: B11** (`B11-ETAPA0-PROVENIENCIA_2026-07-29.md`),
  fora do diretório de auditorias.

> **Todos os sete relatórios são datados do mesmo dia — 2026-07-29.** A trilha de
> auditoria **parou** nessa data. Nos dois dias seguintes foram feitos merges de
> 14 PRs (§2.3), incluindo três rodadas de *"sector rollup and bmp
> normalisation"* (#167, #168, #169) e a introdução do master largo e do
> `blocker_13_provenance.json` (#166) — **nenhum acompanhado de relatório de
> lote**.

## 7.2 Qual lote mudou por último um número publicado, e houve tabela de delta?

**Nenhum dos lotes A ou B versionados mudou um número publicado.** Todos os sete
são diagnósticos em modo leitura:

- B11 abre com: *"**Modo:** Somente leitura. Nenhum arquivo de dados, parâmetro ou
  código de cálculo foi alterado."* e fecha com *"Parada conforme instrução 0.5."*
- A19 apenas *projeta* cenários (C1/C2/C3) e **recomenda** aplicá-los;
  nenhum foi aplicado (§4.4).
- A17 e B7 são **pré-merge** do PR #165, que continua aberto (§2.2).

**A última alteração de número publicado veio de PRs, não de lotes de auditoria:**

| Candidato | Delta acompanhado? |
|---|---|
| **PR #165** (não integrado) | **Sim** — `docs/data/DELTA_LOTE2_2026-07-26.md`, com tabela de 12 grandezas e Δ% por linha, e baseline congelado reproduzido byte a byte antes da edição. **Mas o PR está aberto: o delta é de um estado que não é o HEAD.** |
| **PRs #166–#169** (integrados, 2026-07-30) | **NÃO.** Três merges consecutivos de *"sector rollup and bmp normalisation"* mais a consolidação de datasets, sem nenhum documento de delta versionado. |
| `RESULTADOS_SP_PARA_PAPER_2026-07-30.md` + `METODOLOGIA_CENARIOS_SP_2026-07-30.md` | Publicam os totais 7,83/9,84 bi. Trazem justificativas metodológicas, **mas não uma tabela de delta contra os totais anteriores** (3,037 bi do `SP_TOTAIS_CONSOLIDADOS` do mesmo dia). |

> **DIVERGENTE. O último conjunto de números publicados (Conjunto B, 7,83 bi,
> 2026-07-30) NÃO veio acompanhado de tabela de delta contra o conjunto que
> substituiu** — e, pior, **não o substituiu**: os dois coexistem no HEAD com a
> mesma data (§4.5). A regra que o próprio PR #165 estabelece — *"Nenhum valor
> publicado foi alterado sem tabela de delta com causa declarada"* — **foi
> quebrada nos merges de 30 de julho.**

## 7.3 `DECISOES_METODOLOGICAS.md` — **DIVERGENTE (não existe)**

```console
$ git ls-files | grep -i "DECISOES"
(saída vazia)
$ ls DECISOES_METODOLOGICAS.md cp2b-workspace/NewLook/docs/data/DECISOES_METODOLOGICAS.md
ABSENT
ABSENT
$ find . -name "DECISOES_METODOLOGICAS*" -not -path "./.git/*"
(saída vazia)
```

> **O arquivo `DECISOES_METODOLOGICAS.md` não existe em nenhum caminho do
> repositório e não é rastreado pelo git.** Não há "cinco entradas mais recentes"
> a listar.
>
> O registro de decisões metodológicas mais próximo que existe é
> `docs/data/METODOLOGIA_CENARIOS_SP_2026-07-30.md`, referenciado por
> `RESULTADOS_SP_PARA_PAPER_2026-07-30.md` como *"que registra as escolhas
> metodológicas"*. **Não é um log datado por entrada** e não substitui o
> arquivo pedido.

---

# PARTE 8 — FECHAMENTO

## 8.1 Tabela de todos os achados DIVERGENTE, por severidade

### Bloqueiam a submissão

| # | Achado | Evidência | Por que bloqueia |
|---|---|---|---|
| **D1** ~~bloqueante~~ → **RESOLVIDO NO MÉRITO, pendente documental** | Três conjuntos de totais coexistiam sem marcador de precedência. **O autor determinou em 2026-08-01 que o vigente é 7,832 bi (`RESULTADOS_SP_PARA_PAPER`).** Não havia erro de cálculo. **Resta:** A e C seguem no repositório sem marcador de superação. | §4.5 | Deixou de bloquear a submissão. Continua sendo risco de revisão: o JSON superado tem a mesma data e aparência de canônico. |
| **D2** → **rebaixado para documental** | A exclusão deliberada do bagaço (Atlas p.65, *"já aproveitado para geração de energia"*) é a escolha metodológica que separa B de A por fator 2,6×. A escolha é defensável e está justificada em texto. **Resta:** não há tabela de delta versionada registrando o efeito da exclusão sobre o total. | §4.5 | Revisor perguntará. A justificativa existe; falta o delta quantificado. |
| **D3** | **Nenhum resultado canônico registra o commit que o gerou.** `SP_TOTAIS_CONSOLIDADOS_2026-07-30.json` não tem campo de hash. | §3.3 | Nenhum número publicado é atribuível a um estado do código. Reprodutibilidade não é demonstrável. |
| **D4** | **O gerador do JSON de totais consolidados não existe no repositório.** `compute_sp_canonical_totals.py` só emite `sp_canonical_by_stream.csv` + stdout. | §3.4 | O artefato publicável não tem procedência computacional versionada. |
| **D5** | **`19.69` codificado como constante de manuscrito em dois scripts executáveis** (`run_manuscript_validation.py:65`, `validate_manuscript_data.sql:42,45`), junto de 125/293/84.6/61.3/20.8. | §6.4 | Alegação proibida, viva no código, e não reproduzida por nenhum dos três conjuntos de totais. |
| **D6** | **BLOCKER-13 marcado `RESOLVED` sobre uma descrição incorreta da cadeia** e com SHA-256 que não bate (`2ab1d03d…` declarado vs `7d0fb051…` medido; 189.129 vs 188.483 bytes). | §3.3, §5.1 | O gate de proveniência que sustentaria a Seção de Métodos está quebrado por dentro. |
| **D7** | **Docstring do gerador canônico atribui ao MapBiomas participação que ele não tem** (`compute_sp_canonical_totals.py:22,111`). B11 recomendou a correção em 29/07; **linha intacta em 31/07**. | §5.1 | É a origem provável da alegação "MapBiomas 10.1" no manuscrito. A Seção de Métodos precisa dizer PAM/PPM/SNIS/Censo. |

### Bloqueiam a redação da §4.2

| # | Achado | Evidência | Por que bloqueia |
|---|---|---|---|
| **D8** | **Quatro identificadores de coleção MapBiomas simultâneos** (8/8.0, 9, 10, 10.1). O esperado — 10.1/2024 — **não aparece no código do inventário**. Teste `test_mapbiomas_service.py:399` **trava** `Collection 8.0`. UI exibe `Collection 8`. | §5.2 | Não há um identificador de release citável. |
| **D9** | **Conflito BMP da cama de aviário persiste** (YAML 280 vs corpus n=1 = 300, base "em Quarentena"), e por estar classificado `PRIMARIO` **nenhum dos cenários C1/C2/C3 o corrige** (Δ = 0,00 % nos três). | §4.3.1 | 6,4 % do total estadual sobre um corpus de uma observação em quarentena. |
| **D10** | **C3 não está codificado em lugar nenhum** — existe só como narrativa em A19. A recomendação *"Aplicar integralmente o CENÁRIO C3 em um Lote B único e atômico"* não foi executada. | §4.4 | O cenário que o manuscrito pretende reportar não tem implementação. |
| **D11** | **Contagem de substratos: 26 no HEAD, 28 alegado pelo PR #165.** | §4.1 | Número de substratos é declarado no artigo. |
| **D12** | **Ano de referência não é único**: inventário 2023 (PAM), população 2022 (Censo), SNIS 2022, PPM 2024, `load_biomass_tons.py` 2024. Sem regra de projeção populacional. | §5.3 | Não há "ano-base" declarável. |
| **D13** | **Insumo canônico (`municipality_biomass_tons.csv`) é de 2026-06-13 ou anterior** — precede toda a recalibração de julho. | §1.4.3 | O número vigente descende de um insumo pré-recalibração. |
| **D14** | **A19 usa `cb7967a7` como linha de base, e `cb7967a7` não é ancestral do HEAD** (é do PR #165, aberto). | §1.5 | Metade da tabela comparativa de A19 §6.3 descreve um estado inexistente na linha principal. |
| **D15** | **`canonical_results.json`, fonte declarada de Gini/184/67 %/cobertura SNIS, não existe no HEAD.** | §3.3, §4.5, §6.3 | Todas as métricas de concentração espacial ficam sem lastro verificável. |
| **D16** | **Último conjunto publicado (7,83 bi) sem tabela de delta**; PRs #166–#169 mexeram em rollup setorial e normalização de BMP sem documento de lote. | §7.2 | Quebra a regra do projeto: *"Nenhum valor publicado foi alterado sem tabela de delta"*. |
| **D17** | **`DECISOES_METODOLOGICAS.md` não existe.** | §7.3 | Não há log de decisões a citar. |

### Cosméticos / higiene

| # | Achado | Evidência |
|---|---|---|
| **D18** | **PR #165 com dois check-runs em `failure`** (Frontend/Backend Unit Tests) enquanto `CI Summary` diz `success` e o corpo do PR alega "958 passed". Checks de 29/07, base 14 commits desatualizada. | §2.2.2 |
| **D19** | **Não há tag do lote B9.** As três tags existentes são de autenticação, congelamento de 25/07 e arquivo de histórico. | §1.3 |
| **D20** | **`main` local desatualizado** — 14 commits já merged no GitHub não estão no ponteiro local. | §1.2 |
| **D21** | **Campo ainda se chama `fco`, sem a convenção escrita no cabeçalho do YAML.** A semântica no código está correta (multiplicação direta), mas a renomeação para `fco_available` do PR #165 — feita justamente por ser *"a fonte da divergência D1"* — não está no HEAD. | §4.3.3 |
| **D22** | **Nomenclatura A18 duplicada**: `A18_INSUMOS_E_BMP_BAGACO` e `A18-VERIFICACAO-PAPER`, assuntos diferentes, mesma data, diretórios diferentes. | §7.1 |
| **D23** | **Saída do pipeline é `gitignore`d** (`canonical_recalc_output/`) e o diretório não existe em disco. | §1.6, §3.4 |
| **D24** | **Trilha de auditoria parou em 2026-07-29**; 14 PRs merged depois, sem lote. | §7.1 |

### Achados CONFIRMADOS que **não** são divergência (para o registro)

- Árvore limpa, sem stashes, sem não-rastreados, sem ignorados em disco (§1.1, §1.6).
- **FCo é fração de excedente, multiplicada diretamente** — verificado na fórmula,
  na linha de implementação e por aritmética independente (§4.3.3).
- **FCo médio do bagaço = 0,22**, não zero (§4.3.2).
- **Mapbox totalmente ausente** de código, deps e lockfile (§6.1).
- **`133.82` e `empirically validated` ausentes** do repositório (§6.4).
- Insumos do gerador canônico **rastreados e commitados**; o gerador **não** exige
  banco, raster nem caminho absoluto (§3.2, §3.4).
- **Total C3 = 3,8399** confere com o esperado 3,84 (§4.5).

## 8.2 Perguntas não respondíveis em modo leitura, e o que resolveria cada uma

| # | Pergunta em aberto | Mutação / credencial única que resolve |
|---|---|---|
| Q1 | Datas e commits reais dos arquivos anteriores a `915d2ce`; identidade do commit que de fato alterou `municipality_biomass_tons.csv` por último. | `git fetch --unshallow` |
| Q2 | Ancestralidade de `cb7967a7` e `75e0b1e` verificada por `git merge-base --is-ancestor` em vez de por cronologia. | `git fetch origin fix/canonical-consistency-2026-07` (traz os objetos; o `merge-base` em si é leitura) |
| Q3 | Estado real de `main` no GitHub e divergência verdadeira do HEAD. | `git fetch origin main` |
| Q4 | Data de cada uma das três tags, e confirmação definitiva de que nenhuma corresponde ao lote B9. | `git fetch --tags` |
| Q5 | **O merge do PR #165 deixaria o pipeline canônico inexecutável?** (o diff não lista `municipality_biomass_tons.csv`, mas B11/A18 registram que foi desrastreado na branch) | `git checkout fix/canonical-consistency-2026-07` **ou** `git fetch origin fix/canonical-consistency-2026-07 && git ls-tree FETCH_HEAD -- <caminho>` |
| Q6 | `mergeable_state` do PR #165 (hoje `unknown`) e conclusão de CI contra a base **atual**. | Push que force o GitHub a recalcular (ex.: `update_pull_request_branch`), ou nova execução de CI |
| Q7 | **Cobertura SNIS 214/431 medida**, com numerador e denominador computados. | Acesso ao `snis_sp_activity_2022.csv` (existe só no PR #165) **ou** credencial `DATABASE_URL` do banco de produção |
| Q8 | **Gini, top-N e os ~184 municípios com 67 %** recomputados. | Acesso a `canonical_results.json` (só no PR #165) **ou** execução do gerador — ambos mutações |
| Q9 | Reprodução dos totais canônicos e confronto contra os três conjuntos do §4.5. | Executar `python scripts/compute_sp_canonical_totals.py` (cria `canonical_recalc_output/`) |
| Q10 | Qual dos três conjuntos de totais o manuscrito deve citar. | **Decisão humana.** Nenhum comando resolve; é escolha do autor. |
| Q11 | Coleção e ano reais do mosaico MapBiomas. | Asset ID do Earth Engine / script de export da origem — **não existem no repositório** (B11 §2.1: *"A cadeia de custódia termina aí"*). Exige recuperação externa. |
| Q12 | Conclusão de CI e contagem de arquivos dos PRs #145 e #141. | `pull_request_read` por PR (leitura; apenas não executado nesta sessão) |
| Q13 | PRs merged entre 2026-06-01 e 2026-07-02 (janela dos 60 dias não coberta). | Paginação adicional de `list_pull_requests` (leitura; não executado) |
| Q14 | Versão real de PostgreSQL/PostGIS em produção (o bloco está comentado no compose). | Credencial de acesso ao banco de produção (`SELECT version(), PostGIS_Version()`) |
| Q15 | Se as dependências Python (`yaml`, etc.) instalam e os 4 símbolos importados de `canonical_loader` existem. | `pip install -r requirements.txt` + import — mutação de ambiente |

---

## Encerramento

**Nenhuma alteração foi feita.** Nenhum arquivo do repositório foi editado,
nenhum commit criado, nenhuma branch alterada, nenhum remoto tocado. O único
arquivo produzido é este relatório, em
`cp2b-workspace/NewLook/docs/auditorias/AUDITORIA_A_ESTADO_PRE_SUBMISSAO_2026-07-31.md`.

Nenhuma correção foi proposta. O diagnóstico para aqui.
