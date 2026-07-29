# B8 — Itens independentes de CI

**Data:** 2026-07-29
**Branch:** `fix/canonical-consistency-2026-07`
**Worktree:** `C:\Users\Lucas\Documents\Pilar2b-b8` (isolado; o working tree principal não foi tocado)
**Commits:** 4, um por item. Nenhum push, nenhum merge.
**B7 permanece parado no PASSO 1.2.**

| Item | Estado | Commit |
|---|---|---|
| 1. `UnicodeEncodeError` do gerador | **CONCLUÍDO** | `5d3472e` |
| 2. Versões de lint fixadas + formatadores | **CONCLUÍDO** — backend-lint verde | `5b8c0ec` |
| 3. `transformIgnorePatterns` / `next-intl` | **PARCIAL** — 3 → 2 suítes falhando | `8755c13` |
| 4. Remoção de `rpo`/PODA_URBANA | **PARCIAL — PARADA por não-neutralidade numérica** | `52e70ac` |
| 5. Execução das três suítes | **CONCLUÍDO** | — |

---

## Item 1 — `UnicodeEncodeError`

Dois caracteres do relatório não existem em cp1252: **U+03B7** (η) e **U+2192** (→).
Os outros 15 não-ASCII do arquivo codificam normalmente.

**Correção:** reconfigurar `sys.stdout`/`sys.stderr` para UTF-8 no import, antes de
qualquer `print`. Preserva o texto da saída exatamente; nenhuma folha numérica é tocada.

**Verificação por execução:**

```
encoding de stdout ANTES do import: cp1252
encoding de stdout DEPOIS do import: utf-8
teste de impressao dos dois caracteres problematicos: η → OK
EXIT=0
```

Critério do briefing atendido: o script não falha mais por encoding. Continua falhando
por `FileNotFoundError` do CSV desrastreado, que é o PASSO 1 do B7.

---

## Item 2 — Versões de lint e formatação

### Correção de um achado meu no A10 §8

O A10 registrou "`black`: 32 arquivos; `isort`: 13". **Esse número estava errado, e a
causa é a que eu havia levantado como VERIFY-5: rodei a versão errada.**

`requirements.txt` já traz `black>=26.5.1` e `isort==8.0.1`. Eu havia medido com
`black 23.12.1` e `isort 5.13.2`, que são as do Python global desta máquina.

| Ferramenta | Versão que usei no A10 | Versão do CI | Arquivos reprovados |
|---|---|---|---|
| black | 23.12.1 | **26.5.1** | 32 → **11** |
| isort | 5.13.2 | **8.0.1** | 13 → **4** |

Reexecutei num venv isolado com as versões corretas antes de formatar qualquer coisa.

### O não-determinismo era real, mas por outro motivo

`black>=26.5.1` é **piso, não pin**, e o workflow instalava `black isort flake8` sem
versão nenhuma. Fixados no workflow:

```yaml
run: pip install -r requirements.txt black==26.5.1 isort==8.0.1 flake8==7.3.0
```

### Resultado

```
black 26.5.1  → 11 files reformatted, 184 files left unchanged
isort 8.0.1   → 5 arquivos corrigidos, agora limpo
flake8 7.3.0  → 13 achados → 0  (exit 0)
```

Os 13 achados do flake8 eram 11 × E501, 1 × E305, 1 × F401. Onze caíram com a
formatação. Os dois restantes foram corrigidos à mão, ambos sem efeito de
comportamento:

- **F401** — `canonical_municipality.py` importava `get_params_for_stream` e não usava.
  Confirmado: não há `__all__`, e nenhum módulo importa esse símbolo de lá.
- **E501** — comentário de 125 caracteres carregando um DOI; URL movida para linha
  própria para continuar clicável.

**Nenhum arquivo de dados tocado.** `git status` do commit mostra apenas `.py` e o
workflow.

---

## Item 3 — `transformIgnorePatterns` (PARCIAL)

`next-intl` **já estava** na lista e as suítes falhavam mesmo assim. A causa é que
**`next/jest` sobrescreve `transformIgnorePatterns`**, então a entrada da config
customizada nunca chegava ao Jest.

Correção: resolver a config primeiro e só então gravar o padrão no objeto resolvido.
`use-intl` também adicionado — `next-intl` reexporta dele, e listar só `next-intl`
empurra o mesmo erro um pacote adiante.

| | Suítes | Testes |
|---|---|---|
| Antes | 3 falhando, 25 passando | 1 falhando, 577 passando |
| Depois | **2 falhando, 26 passando** | **0 falhando, 578 passando** |

**Não está resolvido.** `jest --showConfig` mostra o padrão chegando reescrito com
separadores Windows:

```
node_modules\\(?!(@testing-library|next-intl|use-intl|@axe-core|@tanstack)\\)
```

e `use-intl` ainda não é transformado sob ele. `HeatmapLayer.test.tsx` e
`MunicipalityLayer.test.tsx` seguem sem compilar. **Não verifiquei se isso reproduz no
runner ubuntu** — pode ser específico de Windows. Duas saídas: rodar no runner para
decidir, ou usar a rota de `moduleNameMapper` que este repositório já aplica a
`react-leaflet` e `leaflet` pelo mesmo motivo.

---

## Item 4 — Remoção de `rpo`/PODA_URBANA (PARCIAL — **PARADA**)

### O que foi feito

`ResidueType` é compartilhado, então a remoção não cabia em um arquivo: foram **8**
(união de tipos, registro, duas camadas de mapa, mapa de cores do popup, e dois testes
que selecionavam `rpo`).

**Neutralidade numérica confirmada por construção:** `rpo` já estava fora de
`RESIDUES_BY_SECTOR`, que é o que `getSectorBiomassTons` itera. Nenhuma soma setorial
ou estadual se move. `tsc --noEmit` limpo; 578/578 testes de frontend passam.

Com isso o campo `coverage.poda_urbana.public_interface: "removed"` do arquivo canônico
deixa de ser falso para o registro de resíduos.

### Onde parei, e por quê

**`scenarioFactors.ts` NÃO foi alterado.** Eu havia removido `rpo` de
`SCENARIO_SECTOR_RESIDUES` e de `SCENARIO_RESIDUE_FACTORS` e **revertive** ao inspecionar
`applyScenarioToProps`:

```js
for (const [sector, residues] of Object.entries(SCENARIO_SECTOR_RESIDUES)) {
  for (const r of residues) {
    const field = `${r}_biogas_m3_year`;
    const base = Number(props[field]) || 0;
    const factor = SCENARIO_RESIDUE_FACTORS[r]?.[scenario] ?? 1.0;
    const scaled = base * factor;
    out[field] = scaled;
    sectorTotals[sector] += scaled;   // ← rpo entra no total urbano
    total += scaled;                   // ← e no total geral
  }
```

`rpo_biogas_m3_year × fator` é somado em `urban_biogas_m3_year` e em
`total_biogas_m3_year` nos cenários `conservador`, `fronteira` e `otimista`
(fatores 0,025 / 6,273 / 11,547). Remover `rpo` de qualquer um dos dois mapas **muda
número publicado** sempre que o valor servido de `rpo` for diferente de zero:

- tirar de `SCENARIO_SECTOR_RESIDUES` → a parcela some do total urbano e do total;
- tirar só de `SCENARIO_RESIDUE_FACTORS` → o fator cai para o `?? 1.0`, o que é **pior**:
  muda a parcela em vez de removê-la.

O cenário `baseline` não é afetado: `applyScenarioToProps` retorna `props` intacto nele.

**Não consegui confirmar por execução que o valor servido de `rpo` é zero.** O artefato
canônico diz `poda_urbana: {coverage: "none", instantiated: false}`, o que implica zero,
mas o gerador não roda nesta branch (PASSO 1 do B7) e não há banco acessível. Sem isso não
há tabela de delta, e o B8 proíbe commitar mudança numérica sem ela.

**Decisão do autor necessária.** Se o `rpo` servido for comprovadamente zero em todos os
645 municípios, a remoção em `scenarioFactors.ts` é neutra e trivial. Caso contrário, é
mudança de número publicado e pertence a um lote com tabela de delta.

Observação correlata, não tratada: `src/app/[locale]/municipality/[ibge_code]/page.tsx`
exibe `rpo_biogas_m3_year` diretamente em duas linhas (`:195`, `:411`), fora do sistema de
tipos. Sob DEC-012 isso também é "interface", mas removê-lo altera o que a página mostra e
ficou fora deste lote.

---

## Item 5 — Execução das três suítes

### backend-lint — **VERDE**

```
black . --check          → 184 files would be left unchanged
isort . --check-only     → (sem saída)
flake8 app/ …            → exit 0
```

### backend-test — **VERMELHO**, inalterado pelo B8

```
20 failed, 950 passed in 41.68s
```

Idêntico ao registrado no A10 §8. O B8 não tocou em nenhuma causa. Duas famílias:

| Causa | Testes | Observação |
|---|---|---|
| `FileNotFoundError` do `municipality_biomass_tons.csv` | `test_canonical_municipality_b2` (2), incluindo `test_public_surface_matches_canonical_for_all_bands` — a garantia do DEC-010 | PASSO 1 do B7 |
| Expectativas de parâmetro desatualizadas | `test_canonical_loader` (2), `test_biomass_residue_fractions` (3), `test_spatial_livestock` (3), `test_canonical_parameters` (1) | PASSO 4.2 do B7 — ver §A18 abaixo |
| Ambientais (sem PostgreSQL nem variáveis do job) | `test_geospatial_detail` (9) | Podem passar no runner |

### frontend-test — **VERMELHO**, melhorado

```
Test Suites: 2 failed, 26 passed, 28 total
Tests:       578 passed, 578 total
```

Nenhum teste falha. Duas suítes não compilam, pelo ESM do `use-intl` (item 3).

---

## §A18 — Três correções ao relatório A18

### 1. A reconciliação das contagens de teste está incorreta

O A18 explica meu "950 + 20" como *"950 unitários com fixtures expandidas + 20 testes de
integração"*. **Não é isso.** Minha saída literal foi:

```
python -m pytest tests/unit -q   →   20 failed, 950 passed
```

São **970 testes, todos em `tests/unit`, dos quais 20 FALHARAM**. Não há 20 testes de
integração na conta, e não são 950 aprovados de um total de 950.

A explicação real da divergência é outra e o A18 a tem em mãos sem perceber: **o A18 rodou
em `fix/fde-test-path-portability` @ `75e0b1e`** (declarado no seu próprio cabeçalho) e eu
rodei em `fix/canonical-consistency-2026-07`. São branches diferentes, com suítes
diferentes. 939 é a coleta numa; 970 é a coleta na outra.

A diferença importa porque a formulação do A18 sugere suíte verde, e ela não está verde.

### 2. O impacto do bagaço foi calculado sobre uma linha de base superada

O A18 reporta o total estadual como `3,6367 M m³/dia` sob BMP 115. Esse é o valor do
**Lote 2**. O `canonical_results.json` vigente registra
`totals.ch4_practical.medio = 1.116.862.580,9 m³/ano`, que é **3,0599 M m³/dia** — o valor
que o manuscrito publica e que o A10 §2.4 confirmou.

Entre o Lote 2 e o B1-FINAL o médio estadual caiu de 3,6367 para 3,0599. Os deltas
percentuais do A18 continuam válidos como razão isolada do bagaço, mas **os totais
estaduais absolutos que ele projeta (`3,6367` → `4,2324`) não correspondem ao estado
canônico atual.**

### 3. Sobre o BMP do bagaço: sua intuição de 165 tem base — e a política aponta mais alto

O A18 conclui que 115 "possui lastro rigoroso" e 165 "não possui lastro direto". A segunda
metade procede; a primeira merece um detalhe que o A18 não menciona.

O próprio `feedstocks.yaml` diz, na anotação da referência:

> `talha2016_bagaco`: *"86.25–143.75 NmL/gVS untreated batch; median 115 used as
> **conservative min**"*

E o bloco é:

```yaml
bmp:
  min: 115.0
  medio: 115.0
  max: 220.0
```

**`min` e `medio` são o mesmo número, e o YAML declara esse número como sendo o mínimo
conservador.** A banda está degenerada: o valor central colapsou sobre o limite inferior.

No mesmo bloco, a referência marcada como **primária** é `paulose2021_bagaco`, com
**187,9 NmL/gVS** (batelada mesofílica 37 °C, ISR=2, não pré-tratado), e o corpus registra
mediana **191,9**.

A §3.3 do manuscrito estabelece: *"Central values must derive from primary references
compatible with that experimental basis; co-digestion and pre-treatment results may inform
the band but may not displace the centre."*

Aplicada literalmente, essa política **não sustenta 115 como centro** — 115 é o mínimo
conservador de um estudo secundário. Também não sustenta 165, que é interpolação. Ela
aponta para **≈187,9**, a referência primária, com 220 (Velasquez, explosão a vapor)
corretamente restrito ao máximo.

**Portanto:** sua orientação de não aceitar 115 como central está bem fundamentada. Mas o
valor que a política do próprio artigo indica não é 165 — é a referência primária. Isso é
uma decisão paramétrica com tabela de delta e aprovação, fora do B8 e fora do B7 PASSO 4.2
como está redigido. Registro e não altero.

---

*Nenhum push, nenhum merge, nenhum parâmetro alterado. `feedstocks.yaml` intocado.*
