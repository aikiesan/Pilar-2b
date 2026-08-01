# Validação da cadeia numérica — reconciliação ponta a ponta

**Data da execução:** 2026-08-01
**Base do repositório:** `main` @ `7bd8596` (PRs #166–#179)
**Ambiente:** Docker Desktop (Windows), PostgreSQL 15 + PostGIS 3.4, banco `cp2b_maps`

> Este documento registra **o que foi efetivamente executado e medido**, não o
> que o código promete. Cada número abaixo saiu de um comando cujo output está
> reproduzido. Onde algo não foi verificado, está dito que não foi.

---

## 1. O resultado

A cadeia foi medida em **três pontos independentes**. Os três devolveram o mesmo
valor, sem arredondamento intermediário:

| # | Ponto de medição | Toca o banco? | CH₄ Real (Nm³/ano) | CH₄ Ideal (Nm³/ano) |
|---|---|---|---:|---:|
| 1 | `sp_scenarios_real_ideal.py --master <csv>` | não | 7.832.143.834 | 9.841.178.207 |
| 2 | `load_scenarios_real_ideal.py --dry-run` | lê | 7.832.143.834 | 9.841.178.207 |
| 3 | `SUM(ch4_real_m3_year)` sobre 645 municípios | escreve | **7.832.143.834** | **9.841.178.207** |

645 de 645 municípios casados com o master em todas as execuções. Nenhum
*fallback*, nenhum município órfão.

O total **teórico** foi confirmado em separado, pelo seeder `sync_db_canonical`
durante a migração: **19.900.698.323 m³/ano**, idêntico ao valor publicado em
`RESULTADOS_SP_PARA_PAPER` e ao denominador da cascata de disponibilidade.

---

## 2. Por que os três pontos importam

Não é redundância. Os pontos 1 e 3 exercitam **caminhos de código diferentes**, e
o ponto 2 é o único que testa a junção entre eles.

`sp_scenarios_real_ideal.py` calcula os **quinze fluxos** a partir do master, em
memória, sem banco algum — é stdlib pura, sem `psycopg2`, sem `DATABASE_URL`.

`load_scenarios_real_ideal.py` **não** faz o mesmo. Ele combina duas origens por
município:

- **Fluxos reconstruídos** — cana (vinhaça, torta, palha), pecuária, RSU e
  esgoto: recalculados do master.
- **Fluxos herdados** — milho, soja, citros, café, silvicultura, poda e
  aquicultura: **lidos de colunas por município já existentes no banco** e
  multiplicados por uma fração de retenção. Não são recalculados.

Os herdados somam **~19,8 %** do Cenário Real (milho 7,0 + soja 6,2 +
silvicultura 3,1 + citros 2,5 + café 0,9 + poda 0,3 + aquicultura 0,0).

**O risco concreto:** se o banco tivesse sido carregado a partir de um estado
diferente do master vigente, um quinto do Cenário Real mudaria **sem erro e sem
aviso** — o total sairia diferente, e nada na execução indicaria por quê.

A coincidência exata entre os pontos 1 e 2 é o que descarta esse cenário. Ela
prova que as colunas herdadas no banco são consistentes com o master que produz
7.832.143.834. **Esta era a única ligação não verificada da cadeia antes de
2026-08-01.**

---

## 3. Como reproduzir

Com a stack no ar (`docker compose up -d`), a partir de
`cp2b-workspace/NewLook/`:

```bash
docker compose run --rm --entrypoint python db-migrations scripts/sp_scenarios_real_ideal.py --master data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv
```

**Portão de aceitação: o Cenário Real tem de devolver `7.832.143.834`.** Se não
bater, **pare** — não carregue no banco e não leve nenhum valor ao manuscrito.
Investigue o master primeiro (§4.1).

Só então:

```bash
docker compose run --rm --entrypoint python db-migrations scripts/load_scenarios_real_ideal.py --dry-run --master data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv
```

Divergência **aqui**, com o passo anterior verde, isola o problema nos fluxos
herdados — ou seja, no estado do banco, não no master. Sem `--dry-run` a carga é
efetivada. Conferência final:

```bash
docker exec cp2b-db-dev psql -U postgres -d cp2b_maps -c "select count(*), sum(ch4_real_m3_year), sum(ch4_ideal_m3_year) from municipalities where ibge_code::text like '35%';"
```

---

## 4. Duas armadilhas silenciosas

### 4.1 Existem três masters, em dois formatos incompatíveis

| Caminho | Formato | sha256 (blob git) |
|---|---|---|
| `data/canonical_parameters/SP_master_..._FINAL.csv` | **LARGO** | `7d0fb051…` |
| `docs/data/SP_master_..._FINAL.csv` | **LARGO** (idêntico) | `7d0fb051…` |
| `analysis/data/01_master_residue_streams_SP_2023.csv` | **LONGO** | `644cfb6a…` |

O motor de cenários lê o **LARGO**, acessando `prod_t_Cana_de_açúcar`,
`cabecas_Bovino`, `cabecas_Suíno___total`, `cabecas_Galináceos___total` e
`populacao_total_hab`.

**O modo de falha é silencioso.** O script usa `float(r.get(coluna) or 0)`.
Passar o master LONGO não levanta exceção — devolve **zeros**. Um total
implausivelmente baixo deve fazer suspeitar do master antes de qualquer outra
coisa.

### 4.2 O checksum do master depende do sistema operacional

| Forma | bytes | sha256 |
|---|---:|---|
| Blob git (LF) | 188.483 | `7d0fb051bb7cb74c…` |
| Working tree com `core.autocrlf=true` (Windows) | 189.129 | `2ab1d03d6293690e…` |

A diferença de 646 bytes é exatamente **1 byte por linha** das 646 do arquivo:
é CRLF contra LF, e nada mais. **As duas formas produzem totais idênticos** — o
motor foi executado sobre ambas em 2026-08-01 e devolveu 7.832.143.834 nos dois
casos.

Isto encerra a "divergência de checksum" que constava como pendência aberta: os
dois valores estavam corretos, cada um para a sua plataforma. Para verificar de
forma independente do sistema:

```bash
git show HEAD:cp2b-workspace/NewLook/data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv | sha256sum
```

Hashear a cópia da *working tree* no Windows devolverá o valor CRLF, e isso não
é um erro.

---

## 5. Defeitos de migração encontrados e corrigidos

A stack local não subia. A causa **não** era o banco desatualizado — eram dois
defeitos no próprio repositório, ambos presentes em `main` @ `7bd8596`.

### 5.1 Migração 004 — dez chaves estrangeiras órfãs

`004_import_panorama_data.sql` é auto-gerada (2025-11-19) e usa **dois
vocabulários de código incompatíveis dentro do mesmo arquivo**:

- o bloco SUBSECTORS cria os subsetores agrícolas com prefixo (`AG_CANA`,
  `AG_MILHO`), mas os de pecuária, indústria e urbano com nome puro
  (`AVICULTURA`, `RSU`, `ETE`);
- o bloco RESIDUOS referencia **tudo** com prefixo (`PC_AVES`, `UR_RSU`,
  `IN_CERVEJA`).

Resultado: dez subsetores referenciados nunca eram criados, e a FK
`residuos_subsector_codigo_fkey` derrubava a migração inteira no primeiro
resíduo não-agrícola.

```
ERROR: insert or update on table "residuos" violates foreign key constraint
DETAIL: Key (subsector_codigo)=(IN_PAPEL) is not present in table "subsectors".
```

Órfãos: `IN_PAPEL`, `IN_CERVEJA`, `IN_ALIMENTOS`, `IN_ABATEDOURO`, `PC_AVES`,
`PC_OUTROS`, `PC_BOVINOS`, `PC_SUINOS`, `UR_RSU`, `UR_ETE`.

**Verificado que não era artefato de banco antigo:** o mesmo erro foi reproduzido
num banco **vazio e recém-criado** (`fresh_test`), rodando 001 → 003 → 004 do
zero. A 004 nunca aplicou por completo em lugar nenhum — daí a tabela `residuos`
conter exatamente os 19 resíduos agrícolas, e nenhum outro.

**Correção:** os dez subsetores foram criados no vocabulário prefixado que o
bloco RESIDUOS espera. Reteste em banco limpo: 38 resíduos, saída limpa.

**Pendência deixada em aberto, deliberadamente:** sete dos dez são duplicatas
conceituais de subsetores que já existiam com nome puro (`PC_AVES` ↔
`AVICULTURA`, `UR_RSU` ↔ `RSU`, …). Os registros de nome puro ficaram sem resíduo
associado — inertes, mas presentes. Consolidá-los é decisão de taxonomia, não de
esquema, e afeta o agrupamento exibido na interface. **Não foi decidido aqui.**
Relaciona-se com a limitação 7 da metodologia (duplicação de códigos em
`residuos`).

Há ainda um caso que merece decisão editorial: o resíduo `APARAS_ALIMENTOS`
("Aparas e refiles", categoria `ALIMENTOS`, "Ind. Alimentícia") está classificado
sob `IN_PAPEL`. O código foi preservado como veio do gerador, mas a combinação é
provavelmente um erro de origem.

### 5.2 Migração 028 — coluna que nenhuma migração cria

`028_fix_status_labels.sql` atualiza `residuos.data_status`, coluna que **não é
criada por migração alguma** — vinha de `scripts/dedupe_residuos.py`, fora da
cadeia. O mesmo vale para os códigos minúsculos que a 028 procura
(`cascas_citros_ind`, `levedura_residual`, `soro_queijo`), ausentes do bloco
RESIDUOS da 004.

```
ERROR: column "data_status" of relation "residuos" does not exist
```

**Correção:** `ALTER TABLE residuos ADD COLUMN IF NOT EXISTS data_status TEXT;`
no topo da 028, para que o esquema deixe de depender de um script fora da cadeia.
Onde a coluna já existe, é no-op — a migração se mantém idempotente, como o
próprio cabeçalho dela declara.

### 5.3 Defeito latente, não corrigido

Em banco limpo, a migração `001_initial_schema.sql` falha com
`schema "auth" does not exist`: ela referencia um schema que a `020` só cria
dezenove migrações depois. Em bancos existentes a 001 já está marcada como
aplicada e o problema é inerte, mas **uma instalação genuinamente limpa vai
esbarrar nele**. Não foi corrigido nesta sessão.

---

## 6. O que este documento NÃO valida

Registrado explicitamente para que a validação não seja lida como mais ampla do
que é:

- **Concentração espacial.** Gini, o limiar de 67 % dos municípios e o Top-5 de
  regiões intermediárias **não** foram recomputados. Os valores em circulação
  (Gini 0,533; 184 municípios; Top-5 liderado por Ribeirão Preto) vêm de
  `canonical_results.json` de 27/07, calculado sob a metodologia **anterior** ao
  método Atlas. Não existe, em `main`, script que compute essas grandezas.
- **Cobertura de testes.** A medição de 24,26 % é de 29/07 e não foi refeita em
  `7bd8596`.
- **Validação FIESP** (MAE 13,2 %) e **plantas em operação** (MAE 20,8 %)
  permanecem como estavam: a primeira sofreu calibração *ex-post*, a segunda vem
  de valor codificado em `run_manuscript_validation.py:65`.
- **Cascata FDE.** `sp_fde_cascade.py` não foi executado nesta sessão; os valores
  da cascata (16,59 %) vêm da documentação de 30/07.

---

## 7. Estado final do banco

| Item | Valor |
|---|---|
| Migrações aplicadas | 23 / 23 |
| Municípios | 645 (todas as 645 geometrias preservadas) |
| `residuos` / `subsectors` | 38 / 25 |
| Referências científicas | 754 (458 inseridas nesta execução) |
| `ch4_real_m3_year` preenchido | 645 / 645 |

**Nota operacional:** o volume do banco **não** deve ser apagado. Nenhuma
migração insere municípios, `load_biomass_from_master.py` grava no Supabase (e
apenas com `--apply`), e não existe no repositório nenhuma fonte de geometria
municipal. Um `docker compose down -v` destruiria as 645 geometrias **sem
caminho de recarga a partir deste checkout**.
