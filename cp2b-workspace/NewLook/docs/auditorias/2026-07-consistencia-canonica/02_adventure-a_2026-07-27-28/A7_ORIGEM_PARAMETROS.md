# A7 — Origem dos parâmetros em produção

**Data da auditoria:** 2026-07-26  
**Modo:** somente leitura. Nenhum parâmetro, YAML, banco ou artefato de aplicação foi alterado.

## Conclusão executiva

A página `scientific-database` combina duas populações distintas da base PostgreSQL de
produção:

1. os parâmetros do resíduo vêm das colunas agregadas de `residuos`;
2. a contagem e a lista bibliográfica vêm de `scientific_references`.

O card não calcula a mediana das referências. Em particular, o `n` mostrado ao lado do
BMP é `reference_count`, isto é, o número de referências de qualquer tipo associadas ao
resíduo. Ele não é `n` de observações BMP. O componente recebe
`residue.bmp_n_studies || residue.reference_count`; como o payload de produção não contém
`bmp_n_studies`, sempre cai em `reference_count`.

O resultado mais importante é, portanto:

> O mesmo card exibe um BMP agregado da linha de `residuos` e um `n` bibliográfico de
> `scientific_references`. Não há no endpoint uma relação observação → valor BMP que
> permita calcular aquele BMP a partir daquele `n`.

Nos 28 feedstocks canônicos, 23 possuem correspondência no payload de produção. Os
valores centrais batem em **23/28** para BMP, ST e SV. Considerando a tripla completa
min/médio/max, batem **19/28** em BMP e **23/28** em ST e SV. Cinco códigos canônicos não
têm correspondência. Para os fatores, a base de produção só tem o valor `medio`
preenchido: todas as 31 linhas têm `*_min = *_max = NULL`.

## 1. Endpoint e linhagem de cada campo

### 1.1 Chamadas feitas pela página

O frontend define:

```text
API_BASE_URL = NEXT_PUBLIC_API_URL || ''
```

e, em produção, chama:

```text
GET https://cp2b.unicamp.br/pilar2b/api/v1/residuos/?limit=100
GET https://cp2b.unicamp.br/pilar2b/api/v1/residuos/references/all?limit=5000&offset=0
GET https://cp2b.unicamp.br/pilar2b/api/v1/residuos/summary/by-sector
GET https://cp2b.unicamp.br/pilar2b/api/v1/residuos/conversion-factors/
GET https://cp2b.unicamp.br/pilar2b/api/v1/residuos/{id}
```

O primeiro endpoint retornou **31 resíduos**. O endpoint de referências retornou
**399 referências**.

### 1.2 Fonte imediata dos campos exibidos

| Campo na tela | Campo recebido | Consulta do backend | Fonte imediata em produção |
|---|---|---|---|
| BMP médio | `bmp_medio` | `SELECT r.* FROM residuos r` | PostgreSQL/Supabase, tabela `residuos` |
| BMP mínimo | `bmp_min` | idem | PostgreSQL/Supabase, tabela `residuos` |
| BMP máximo | `bmp_max` | idem | PostgreSQL/Supabase, tabela `residuos` |
| ST médio/faixa | `ts_medio`, `ts_min`, `ts_max` | idem | PostgreSQL/Supabase, tabela `residuos` |
| SV médio/faixa | `vs_medio`, `vs_min`, `vs_max` | idem | PostgreSQL/Supabase, tabela `residuos` |
| C:N | `chemical_cn_ratio` | idem | PostgreSQL/Supabase, tabela `residuos` |
| %CH4 | `chemical_ch4_content` | idem | PostgreSQL/Supabase, tabela `residuos` |
| `n` no parâmetro BMP | `bmp_n_studies || reference_count` | contagem de `scientific_references.primary_residue` | PostgreSQL/Supabase, tabela `scientific_references`; não é `n` BMP |
| Contagem no card | `reference_count` | mesma contagem | PostgreSQL/Supabase, tabela `scientific_references` |
| Lista de referências | resposta de `/references/all` e, no detalhe, `/{id}` | `SELECT * FROM scientific_references` | PostgreSQL/Supabase, tabela `scientific_references` |

O backend usa `settings.DATABASE_URL` via `psycopg2`; a configuração de implantação
documenta esse banco de produção como PostgreSQL gerenciado no Supabase. Os endpoints
acima não consultam arquivos YAML durante a requisição.

### 1.3 Papel do YAML e das tabelas estáticas

Há uma linhagem de geração declarada para BMP/ST/SV:

```text
feedstocks.yaml
  └─ scripts/generate_from_canonical.py
       └─ backend/app/migrations/016_canonical_sync.sql
            └─ tabela residuos
```

O gerador escreve apenas `bmp_*`, `ts_*` e `vs_*`. Ele não escreve C:N, %CH4 nem os
quatro fatores. Há ainda uma ressalva operacional: a migração 016 usa códigos canônicos
como `VINHACA`, enquanto o payload vivo usa códigos de aplicação como `vinhaca_cana`.
Assim, o repositório demonstra a intenção de sincronização, mas não demonstra sozinho
qual execução/ponte atualizou as linhas vivas. O confronto numérico abaixo mostra que os
centros estão sincronizados.

`frontend/src/data/scientificData.ts` contém dados estáticos de fallback. Eles só são
usados se a API falhar; não foram usados na resposta de produção auditada.

`frontend/src/data/residueFactors.ts` **não é importado pela página
`scientific-database`**. Ele alimenta seletores e editores da análise avançada. Portanto,
ele não é a fonte dos cards científicos.

## 2. O `n` e a mediana pertencem ao mesmo corpus?

**Refutado, no sentido estrito.** O `n` mostrado não pertence a um corpus observacional
de BMP. Ele é a quantidade de registros bibliográficos associados ao resíduo, sem
restrição por parâmetro e sem valores individuais necessários para uma mediana.

É verdade que o número aparece ao lado de um BMP que difere da mediana anotada no YAML,
mas isso é uma justaposição de fontes, não uma estatística calculada sobre o mesmo
conjunto. Entre os 23 canônicos mapeados:

- 17 têm `bmp.corpus.median` não nula no YAML;
- em **17/17**, a mediana do corpus difere do `bmp_medio` mostrado;
- em nenhum desses casos o `reference_count` pode ser interpretado como o `n` de
  `bmp.corpus`.

Exemplos:

| Resíduo | BMP exibido | `n` exibido | `bmp.corpus.median` do YAML | `bmp.corpus.n` do YAML |
|---|---:|---:|---:|---:|
| BAGACO | 165 | 40 | 191,9 | 6 |
| VINHACA | 160 | 28 | 180 | 7 |
| TORTA_FILTRO | 280 | 21 | 365 | 14 |
| LODO_PRIMARIO | 310 | 30 | 370 | 11 |

Logo, o rótulo `nStudies={reference_count}` é semanticamente enganoso.

## 3. Linhagem dos quatro fatores de correção

### 3.1 O que existe no payload

`residuos` possui as colunas:

```text
fc_min, fc_medio, fc_max
fcp_min, fcp_medio, fcp_max
fs_min, fs_medio, fs_max
fl_min, fl_medio, fl_max
```

No payload auditado:

- `fc_medio`, `fcp_medio`, `fs_medio` e `fl_medio`: 30 valores não nulos em 31 linhas;
- todos os 12 campos `*_min` e `*_max`: **0 valores não nulos**;
- `dejetos_suinos` é a única linha sem os quatro valores médios.

Portanto, a afirmação “o Supabase tem min/médio/max” é verdadeira para o **esquema**, mas
não para o **conteúdo vivo**: em produção, min e max estão vazios.

### 3.2 O que a página efetivamente usa

A página baixa `/conversion-factors/`, mas guarda o resultado em
`conversionFactors` sem renderizá-lo. Esse endpoint consulta outra tabela,
`conversion_factors`, com oito fatores genéricos; ele não devolve `fc/fcp/fs/fl` por
resíduo.

Os quatro campos por resíduo chegam no payload de `/residuos/`, mas a tela científica
não os mostra individualmente. O KPI “fator de disponibilidade” usa
`fator_realista`, também da linha de `residuos`.

### 3.3 YAML deriva do Supabase?

**Não como linhagem atual.** A evidência aponta independência com ancestralidade comum:

- o YAML hoje contém bandas completas e referências por componente;
- o gerador canônico de BMP/ST/SV não escreve `fc/fcp/fs/fl`;
- a base viva preserva apenas centros legados e não preserva as bandas do YAML;
- nenhum trio min/médio/max dos quatro fatores pode coincidir, pois os extremos da base
  são nulos;
- os centros coincidem apenas parcialmente.

Há ainda deriva semântica: o YAML atual chama o componente
`fco_available`; a coluna legada chama-se `fcp_medio`. Em várias linhas os valores são
complementares, não iguais (por exemplo, VINHACA: YAML `fco_available=0,15`, produção
`fcp_medio=0,85`). Comparar esses campos como se fossem a mesma direção mascara a
mudança de convenção.

## 4. Confronto dos 28 canônicos

Critério:

- BMP/ST/SV: `✓` exige igualdade da tripla min/médio/max;
- fatores: como min/max estão nulos em produção, a tabela compara apenas o centro;
- `—`: sem correspondência no payload de produção;
- quando há dois equivalentes, basta um corresponder ao canônico.

| Canônico | Equivalente(s) em produção | BMP | ST | SV | FC médio | FCo/FCP médio | FS médio | FL médio |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| BAGACO | bagaco_cana | ✓ | ✓ | ✓ | ✓ | ≠ | ✓ | ✓ |
| PALHA | palha_cana | ≠ | ✓ | ✓ | ✓ | ≠ | ✓ | ✓ |
| VINHACA | vinhaca_cana | ✓ | ✓ | ✓ | ✓ | ≠ | ✓ | ✓ |
| TORTA_FILTRO | torta_filtro | ✓ | ✓ | ✓ | ≠ | ≠ | ≠ | ≠ |
| BAGACO_CITROS | bagaco_citros | ✓ | ✓ | ✓ | ✓ | ≠ | ✓ | ✓ |
| CASCAS_CITROS | cascas_citros; cascas_citros_ind | ✓ | ✓ | ✓ | ✓ | ≠ | ✓ | ✓ |
| CASCA_CAFE | casca_cafe | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POLPA_CAFE | polpa_cafe | ✓ | ✓ | ✓ | ✓ | ≠ | ✓ | ✓ |
| MUCILAGEM_CAFE | mucilagem_cafe | ✓ | ✓ | ✓ | ✓ | ≠ | ✓ | ✓ |
| CASCA_SOJA | casca_soja | ✓ | ✓ | ✓ | ✓ | ≠ | ✓ | ✓ |
| PALHA_SOJA | palha_soja | ✓ | ✓ | ✓ | ≠ | ≠ | ≠ | ≠ |
| PALHA_MILHO | palha_milho | ≠ | ✓ | ✓ | ≠ | ≠ | ✓ | ≠ |
| CASCA_MILHO | casca_milho | ≠ | ✓ | ✓ | ✓ | ≠ | ✓ | ✓ |
| CAMA_AVIARIO | cama_aviario | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DEJETOS_AVES | dejetos_aves_frescos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ESTERCO_BOVINO | esterco_bovino_fresco | ✓ | ✓ | ✓ | ≠ | ✓ | ≠ | ≠ |
| ESTERCO_BOVINO_CORTE | — | — | — | — | — | — | — | — |
| ESTERCO_BOVINO_LEITEIRO | — | — | — | — | — | — | — | — |
| DEJETOS_BOVINO | dejetos_bovinos_liquidos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DEJETOS_SUINO | dejetos_suinos_liquidos; dejetos_suinos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ≠ |
| ESTERCO_SUINO | — | — | — | — | — | — | — | — |
| FORSU | forsu_ur_rsu | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ORGANICO_RSU | — | — | — | — | — | — | — | — |
| LODO_PRIMARIO | lodo_primario_ete | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| LODO_SECUNDARIO | lodo_secundario_ete | ≠ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PODA_URBANA | — | — | — | — | — | — | — | — |
| GORDURA | gordura_sebo | ✓ | ✓ | ✓ | ✓ | ≠ | ✓ | ✓ |
| SANGUE | sangue_animal | ✓ | ✓ | ✓ | ✓ | ≠ | ✓ | ✓ |

### Totais

| Grupo | Tripla min/médio/max idêntica, dos 28 | Centro idêntico, dos 28 | Comparáveis mapeados |
|---|---:|---:|---:|
| BMP | **19** | **23** | 23 |
| ST | **23** | **23** | 23 |
| SV | **23** | **23** | 23 |
| FC | **0** | **19** | 23 |
| FCo disponível vs `fcp` legado | **0** | **9** | 23 |
| FS | **0** | **20** | 23 |
| FL | **0** | **18** | 23 |

As quatro divergências de banda BMP, apesar de todos os centros coincidirem, são:

| Canônico | YAML min/médio/max | Produção min/médio/max |
|---|---|---|
| PALHA | 140 / 175 / 293,5 | 140 / 175 / 250 |
| PALHA_MILHO | 150 / 230 / 390 | 150 / 230 / 300 |
| CASCA_MILHO | 110 / 145 / 307 | 110 / 145 / 185 |
| LODO_SECUNDARIO | 80 / 180 / 310 | 80 / 180 / 260 |

## Veredito

1. **Parâmetros químicos do card:** vêm da linha agregada de `residuos` no banco de
   produção; BMP/ST/SV estão numericamente sincronizados com o YAML nos centros.
2. **`n` e referências:** vêm de `scientific_references`; não sustentam matematicamente
   o BMP exibido.
3. **Tabela estática:** `scientificData.ts` é fallback; `residueFactors.ts` não participa
   desta página.
4. **Quatro fatores:** são uma linhagem legada e incompleta no banco vivo. O YAML atual
   não deriva deles; possui bandas e convenção próprias.
5. **Risco de interpretação:** o card mistura um parâmetro canônico/agregado com uma
   contagem bibliográfica independente e chama essa contagem de número de estudos do
   parâmetro.
