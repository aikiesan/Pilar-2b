# B-Q1 — Quarentena do corpus BMP agregado

**Data:** 2026-07-28

**Branch:** `fix/canonical-consistency-2026-07`

**Gate:** A8b, seções 5 e 8

## 1. Resultado

O artefato `feedstock_bmp_from_refs.csv` foi retirado da árvore de parâmetros
canônicos e preservado, sem alteração de conteúdo, em:

```text
data/quarantine/feedstock_bmp_from_refs.csv
```

Motivos da quarentena:

- proveniência das observações desconhecida;
- ausência de script gerador versionado;
- ausência das 196 observações individuais declaradas;
- ausência de linhagem observação → condição experimental → unidade → fonte;
- influência já materializada em quatro `bmp.max` publicados.

Os 28 blocos `bmp.corpus` foram mantidos no YAML como evidência histórica e
receberam:

```yaml
provenance: "quarantined_unversioned_source"
```

A Regra R2 foi suspensa. Nenhum número BMP foi removido, alterado ou revertido.

## 2. Verificação de consumidores antes da movimentação

### 2.1 Código rastreado

Comando:

```text
git grep -n "feedstock_bmp_from_refs\.csv" -- \
  ":!cp2b-workspace/NewLook/docs/**"
```

Saída: nenhuma ocorrência.

Conclusão: nenhum código de produção, backend, frontend, teste ou script
**rastreado** lê o CSV.

### 2.2 Leitor local não rastreado

A varredura do worktree encontrou:

```text
scripts/generate_a3b_report.py:8
bmp_csv = ... data\canonical_parameters\feedstock_bmp_from_refs.csv
```

`git ls-files scripts/generate_a3b_report.py` não retorna o arquivo. Portanto:

- é um script local não rastreado;
- não integra runtime, API ou frontend;
- continua apontando para o caminho antigo;
- não foi alterado nem incluído no commit B-Q1.

Essa referência quebrada é deliberadamente preservada fora do lote para não
incorporar trabalho local não rastreado ao commit isolado.

## 3. Movimentação e integridade

| Verificação | Resultado |
|---|---|
| Caminho anterior | `data/canonical_parameters/feedstock_bmp_from_refs.csv` |
| Caminho de quarentena | `data/quarantine/feedstock_bmp_from_refs.csv` |
| Linhas, incluindo cabeçalho | 25 |
| SHA-256 antes | `b2208eb833e7e3735275a8497b89398994178aadc91c9b54c2ce60184f5956a8` |
| SHA-256 depois | `b2208eb833e7e3735275a8497b89398994178aadc91c9b54c2ce60184f5956a8` |
| Conteúdo alterado | não |

O `data/quarantine/README.md` declara o motivo, a restrição de uso e os quatro
parâmetros afetados. O `.gitattributes` local desativa normalização textual de
CSV, preservando também a identidade do blob Git e os finais de linha originais.

## 4. Marcação dos blocos `bmp.corpus`

Validação após a edição:

| Propriedade | Resultado |
|---|---:|
| Blocos `bmp.corpus` no YAML | 28 |
| Blocos com `quarantined_unversioned_source` | 28 |
| Blocos com outra proveniência ou sem campo | 0 |
| YAML carregado por `yaml.safe_load` | válido |

A marca é descritiva. Ela não torna o artefato reproduzível e não autoriza uso
paramétrico.

## 5. Prova de invariância numérica

Antes da alteração, todos os escalares numéricos de `feedstocks.yaml` foram
extraídos por caminho, serializados em ordem determinística e resumidos com
SHA-256. A mesma operação foi repetida depois.

| Verificação | Antes | Depois |
|---|---:|---:|
| Quantidade de escalares numéricos | 762 | 762 |
| SHA-256 da projeção caminho→valor | `99f5d738968a6a99e4aabb66a049f31dd1b81028ad2c5cced60a843428462ded` | `99f5d738968a6a99e4aabb66a049f31dd1b81028ad2c5cced60a843428462ded` |

Resultado: nenhum valor numérico de parâmetro mudou.

Nenhum script de cálculo estadual foi executado.

## 6. Suspensão da Regra R2

`POLITICA_BMP.md` agora declara que R2:

- está suspensa desde B-Q1;
- não pode criar, ampliar, validar ou reprovar bandas BMP;
- não pode ser executada em CI enquanto a fonte estiver em quarentena;
- não causa reversão automática dos quatro máximos vigentes;
- somente pode ser reativada por decisão metodológica posterior com fonte
  reproduzível.

`REGRA_BMP_ESPECIFICACAO_2026-07-25.md` foi preservada como especificação
histórica, marcada como suspensa. Seus caminhos de leitura apontam para a cópia
em quarentena, mas seu trecho de verificação não deve ser executado.

## 7. Tabela de delta antecipada para B1

Esta tabela é exclusivamente instrutiva. A coluna “delta se revertido” descreve
o efeito local de restaurar o valor pré-R2; **nenhum delta foi aplicado**.

| Feedstock | Campo | Pré-R2 | Atual | Alteração histórica R2 | Delta se revertido no B1 |
|---|---|---:|---:|---:|---:|
| `PALHA` | `bmp.max` | 250 | 293,5 | +43,5 (+17,40%) | −43,5 (−14,82%) |
| `PALHA_MILHO` | `bmp.max` | 300 | 390 | +90 (+30,00%) | −90 (−23,08%) |
| `CASCA_MILHO` | `bmp.max` | 185 | 307 | +122 (+65,95%) | −122 (−39,74%) |
| `LODO_SECUNDARIO` | `bmp.max` | 260 | 310 | +50 (+19,23%) | −50 (−16,13%) |

Os percentuais históricos usam o valor pré-R2 como denominador. Os percentuais
de eventual reversão usam o valor atual como denominador. A tabela não é
recomendação de rota e não parte de valor-alvo; apenas registra os dois estados
já existentes no histórico Git.

## 8. Decisão metodológica

Foi registrada `[DEC-015] — Quarentena do Corpus BMP Agregado e Suspensão da
Regra R2` em `DECISOES_METODOLOGICAS.md`.

A decisão:

- revisa a autoridade atribuída ao corpus em `[DEC-001]`, sem apagar a entrada
  histórica;
- classifica `bmp.corpus` como evidência histórica em quarentena;
- suspende qualquer efeito normativo de suas medianas;
- mantém os valores atuais até B1;
- exige tabela de delta para reversão ou requalificação.

## 9. Arquivos do lote

| Arquivo | Ação |
|---|---|
| `data/canonical_parameters/feedstock_bmp_from_refs.csv` | removido por movimentação |
| `data/quarantine/feedstock_bmp_from_refs.csv` | adicionado com conteúdo idêntico |
| `data/quarantine/.gitattributes` | preservação byte a byte dos CSVs em quarentena |
| `data/quarantine/README.md` | criado |
| `data/canonical_parameters/feedstocks.yaml` | somente metadado de proveniência |
| `docs/data/POLITICA_BMP.md` | R2 suspensa e caminho atualizado |
| `docs/data/REGRA_BMP_ESPECIFICACAO_2026-07-25.md` | marcada como especificação histórica suspensa |
| `docs/data/REFERENCE_CORPUS_SUMMARY.md` | caminho e estado de quarentena atualizados |
| `docs/data/DECISOES_METODOLOGICAS.md` | `[DEC-015]` adicionada |
| `docs/auditorias/2026-07-consistencia-canonica/05_adventure-b-superficies_2026-07-28-29/B-Q1_QUARENTENA_CORPUS_2026-07-28.md` | relatório arquivado |

## 10. Critério de saída

- [x] nenhum consumidor rastreado do CSV;
- [x] conteúdo preservado por SHA-256;
- [x] 28 de 28 blocos marcados;
- [x] R2 suspensa;
- [x] quatro valores mantidos;
- [x] delta antecipado documentado;
- [x] nenhum escalar numérico alterado;
- [x] nenhum total estadual recalculado.
