# Busca pelas observações individuais de BMP — resultado

**Data:** 2026-07-25 · **Lote:** 1e-b · **Modo:** somente leitura
**Resultado:** **NÃO EXISTE** no que está versionado. **Nada foi criado nem
versionado**, conforme a instrução de parar antes disso.

Objetivo: localizar uma tabela com **uma linha por observação** — feedstock, valor
de BMP, unidade, referência — que sustente as 196 observações declaradas em
`data/canonical_parameters/feedstock_bmp_from_refs.csv`.

---

## 1. Onde foi procurado

| # | Escopo | Comando / método | Resultado |
|---|---|---|---|
| 1 | Todos os CSV/XLSX/JSON de `HEAD` | Cabeçalho de cada arquivo, filtrando por `bmp` | **1 arquivo**: `feedstock_bmp_from_refs.csv` — agregado, 24 linhas, uma por feedstock |
| 2 | Nomes de arquivo em **todas as refs** (1.363 commits) | `git log --all --name-only \| grep -iE "bmp\|observ\|corpus\|scientific_ref"` | 5 caminhos, nenhum com observações (§2) |
| 3 | Script gerador do CSV agregado | `git grep -l "feedstock_bmp_from_refs" $(git rev-list --all)` e grep em `HEAD` | **nenhum script, em nenhuma ref, escreve esse arquivo** |
| 4 | Export do banco (`export.csv`) | `git log --all --name-only \| grep -iE "^export\|export\.csv"` | **não versionado** |
| 5 | Zip do Drive extraído (446 arquivos, 74 MB) | `grep -rli bmp` + leitura de cabeçalho de todos os CSV | **nenhum** (§3) |
| 6 | Corpus bibliográfico | Colunas de `references_unified.csv` | **sem coluna de valor** (§4) |

---

## 2. Os cinco caminhos candidatos, e por que nenhum serve

| Caminho | Veredito |
|---|---|
| `data/canonical_parameters/feedstock_bmp_from_refs.csv` | **É o agregado**, não a origem. 24 linhas: `feedstock, n_bmp_obs, bmp_min, bmp_median, bmp_max, example_source_url` |
| `backend/app/migrations/015_correct_bmp_parameters.sql` | Migração que grava valores canônicos no banco. Não contém observações |
| `docs/data/REFERENCE_CORPUS_SUMMARY.md` | Sumário narrativo do corpus. Sem tabela por observação |
| `docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md` | Documento desta sessão |
| `cp2b-workspace/project_map/src/data/references/scientific_references.py` | Sistema de referências da V2 Streamlit (`import streamlit as st`), presente apenas no commit raiz `2fce883` de 2025-11-16. É um `dataclass Reference` com `id, title, authors, journal, year, doi, url, citation_abnt, citation_apa, category, description, keywords` — **nenhum campo de BMP** |

---

## 3. Zip do Drive

`grep -rli "bmp"` retornou 10 arquivos, todos `.xlsx` do diretório
`07_MATRIZES_15_CLASSES_FINAL`. Verificado com `openpyxl`, abrindo
`FINAL_ILUC_15_Classes_RGINT_3502.xlsx`:

- abas: `2008_2009`, `2009_2010`, `2010_2011`, … — séries de transição de uso da terra;
- cabeçalho: `De \ Para`, `1 - Culturas perenes`, `2 - Soja`, `3 - Soja + Milho 2ª safra`, …;
- **células contendo "bmp": 0**.

São matrizes iLUC de transição de classes. Os hits de `grep` são ruído binário do
formato compactado. Nenhum CSV do zip tem coluna com `bmp`, `metano`, `methane` ou
`ch4` no cabeçalho.

---

## 4. Como o CSV agregado foi produzido

O commit que o criou é `5d3c378`, 2026-06-12 09:35, `data: unify full 399
scientific_references corpus + mine BMP from notes`. O corpo declara:

```
- references_unified.csv: 367 unique refs, 363/367 with direct URL (99%),
  18 suspect_doi_reuse flagged, 29 feedstocks
- feedstock_bmp_from_refs.csv: 196 BMP observations across 24 feedstocks
```

O único script tocado no commit é `backend/scripts/unify_references.py`, cujo
cabeçalho diz (`:3-9`):

```
unify_references.py — Clean + unify the reference stores into one canonical CSV.

Input : a CSV export of the reference table (referencias_unificadas view OR the
        full `scientific_references` table). Expected columns (extra ignored):
Output: data/canonical_parameters/references_unified.csv
Usage: python3 scripts/unify_references.py <export.csv>
```

Três fatos decorrem disso:

1. **A entrada é um export ad-hoc** (`sys.argv[1]`, default `"export.csv"`) de uma
   tabela de banco — `scientific_references` — que vive no PostgreSQL/Supabase.
   Esse export **não está versionado**.
2. **`unify_references.py` não escreve `feedstock_bmp_from_refs.csv`.** Ele grava
   apenas `references_unified.csv` (`:168-171`). A única menção a BMP no script é
   `"BMP" in rtype` (`:154`), usada para marcar `peer_reviewed` — não para extrair
   valores.
3. **Os valores foram minerados do campo de texto livre `notes`** da tabela, como
   o `FIESP_BENCHMARK_AUDIT_REPORT.md:73` declara: *"Mineradas de
   `scientific_references.notes`"*. A mineração ocorreu em sessão e **só o
   resultado agregado foi commitado**.

---

## 5. O que `references_unified.csv` contém

367 linhas. Colunas, na íntegra:

```
feedstock_codes, citation, url, doi, year, peer_reviewed,
needs_url, suspect_doi_reuse, source_ids
```

**Nenhuma coluna de valor.** É um corpus bibliográfico: quais referências existem,
se têm URL, se o DOI é suspeito. Não registra o que cada referência mediu.

---

## 6. Conclusão

**As 196 observações individuais de BMP não existem em nenhum artefato versionado.**

O que existe é a agregação — `n`, mínimo, mediana, máximo por feedstock — commitada
sem o registro que a produziu, e sem script que a reproduza.

Isso responde à pergunta que motivava a busca. A cadeia é:

```
tabela scientific_references (banco, não versionada)
   → coluna notes, texto livre
   → mineração ad-hoc em sessão (sem script versionado)
   → feedstock_bmp_from_refs.csv (agregado, 24 linhas)   ← único elo versionado
```

Não é possível afirmar, a partir do repositório, que as medianas vieram de um
registro por observação — nem o contrário. O que se pode afirmar é que **o registro
por observação, se existiu, não foi preservado**, e que a etapa de mineração não
tem script.

Isso torna insustentável, como está, a frase "mediana de 367 artigos primários":
os 367 são referências bibliográficas; as 196 observações são um subconjunto
mineral de texto livre, sem rastro versionado.

---

## 7. Onde ainda pode existir, fora do Git

Não verificado — está fora do alcance desta sessão e é decisão do usuário:

1. **A tabela `scientific_references` no PostgreSQL/Supabase**, com a coluna
   `notes`. É a origem direta. Se ainda estiver populada, um `COPY ... TO CSV` a
   recupera na íntegra.
2. **O `export.csv`** usado como entrada de `unify_references.py`, se preservado na
   máquina onde o script rodou.
3. **Zotero, planilha de levantamento ou similar** onde as 367 referências foram
   compiladas.

Recuperar por (1) é o caminho mais direto e restauraria a reprodutibilidade
completa: com as observações versionadas, `feedstock_bmp_from_refs.csv` passa a ser
derivado por script, o IQR passa a ser calculável, e a §6 da `POLITICA_BMP.md`
deixa de ser limitação.

**Nada foi criado nesta sessão.** `data/canonical_parameters/bmp_observations.csv`
não existe e não foi criado, conforme a instrução.
