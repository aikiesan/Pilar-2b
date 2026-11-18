# Plano — publicar a triagem de co-digestão de SP no mapa

Status: **proposta, aguardando aprovação**  ·  2026-09-08

---

## Contexto

O PR #213 retirou do mapa as camadas **Perfil C/N** e **Regime**: `cn_molar` era a
média aritmética ponderada por SV das razões C:N, que não é o C:N de uma mistura.
O nitrogênio é aditivo, então o correto é `ΣVS / Σ(VS/CN)`. O erro reclassificava
44% dos municípios e invertia a leitura C-dominante/N-dominante do território.

Ao levantar o material do dossiê de validação (o documento que vai para revisão
química externa), apareceu o que faltava: **o dado corrigido de São Paulo já
existe**, e satisfaz os dois critérios que o `CNPQ_TYPOLOGY.md` exige de um
snapshot aceitável.

`analysis/paper_figures/P2/canonical/dossier/dossier_municipios.csv` traz as duas
colunas lado a lado, nos 645 municípios:

| coluna | mediana | em C:N 20–30 |
|---|---|---|
| `cn_molar` (aritmético, o que foi retirado) | 49,19 | 111 |
| **`cn_harm`** (N-aditivo) | **32,26** | **191** |

Batem exatamente com o dossiê ("cai de 49 para 32"; "sobem de 111 para 191"). E
`real_sewage > 0` nos 645 — o 13º fluxo (lodo de ETE), ausente do snapshot
SP+MG que está na plataforma, está presente aqui.

Então não é preciso esperar o reprocessamento do `p2_canon.py` para devolver as
camadas em SP.

### O que NÃO serve como fonte

`canon_municipios.csv` e `canon_pairs_priority.csv`, no diretório acima, são de
uma triagem **obsoleta** (mediana 49,19, método aritmético). E a diferença não é
só numérica: os pares mudam de parceiro. Botucatu pareia com Porangaba no arquivo
velho e com Conchas no dossiê; Casa Branca com Divinolândia contra São José do
Rio Pardo. Corrigir o C:N muda quem se emparelha com quem.

**Fonte válida: apenas os CSVs em `canonical/dossier/`.**

---

## Decisão de cobertura

**SP correto, MG sem a camada.** As camadas derivadas de C:N passam a existir só
no escopo São Paulo; em Minas somem, com aviso de que aguardam reprocessamento.
Correto acima de completo — servir o número certo em SP e o errado em MG, no
mesmo controle, seria pior que a incoerência que o #213 removeu.

Isso é uma regressão de cobertura consciente: hoje há C:N em 1.498 municípios
(errado), passará a haver em 645 (certo).

---

## Fontes

| Arquivo | Linhas | Papel |
|---|---|---|
| `dossier_municipios.csv` | 645 | `cn_harm`, `regime`, `dom_stream`, `d_gas`, CH₄ por fluxo |
| `dossier_pairs_ranked.csv` | 183 | pares ranqueados; `ibge_a`/`ibge_b`, `coherence`, `fB_partner`, `dist_km`, `pot_comb_m3d`, `inhib_C`/`inhib_N` |
| `dossier_rgint.csv` | 11 | agregação por região intermediária (Escala C) |

`intra_all191_balanced.csv` **não é necessário**: os 191 são exatamente
`cn_harm ENTRE 20 AND 30` sobre a tabela municipal, e derivá-los assim evita um
join por nome de município (o arquivo não traz `ibge_code`).

---

## Fases

### Fase 1 — ingerir os índices municipais corrigidos de SP

Migração `031_municipality_cn_sp.sql`: acrescenta a `municipality_typology` as
colunas `cn_harm double precision`, `regime_harm text`, `dom_stream text`,
`d_gas_km double precision`, todas **NULL para MG**.

Colunas novas ao lado das antigas, não no lugar — é o que o comentário da
migração 030 já previa, e mantém `cn_molar` disponível para reproduzir as figuras
publicadas até elas serem regeradas.

Loader `load_dossier_sp_indices.py`, no mesmo formato do de tipologia: snapshot
imutável com SHA256, `--dry-run`, e portões — 645 linhas, todas com prefixo IBGE
35, `cn_harm` em faixa plausível, e a contagem de 191 em 20–30 como assinatura do
arquivo certo.

*Esforço: pequeno. Padrão já estabelecido.*

### Fase 2 — devolver Perfil C/N e Regime, corrigidos e SP-only

Endpoints passam a servir `cn_harm`/`regime_harm`; os modos voltam a
`buildColorModeOptions`, mas **só quando o escopo é SP** — em MG não aparecem.

Seguem atrás do gate beta. Não por estarem errados agora, mas porque a Seção 9 do
dossiê declara o limite: são candidatos de triagem de primeira ordem, não
projeções de rendimento. A legenda precisa dizer isso.

*Esforço: pequeno-médio. O maquinário de renderização não foi removido no #213.*

### Fase 3 — camada de pares (Escala B)

Tabela `codigestion_pairs` (183 linhas) e endpoint `GET /codigestion/pairs`.

Na tela: marcador na âncora rica em C, marcador no parceiro rico em N, linha
entre os centroides, espessura por `pot_comb_m3d` e opacidade por `coherence`.
Clique abre painel com C:N de cada ponta, distância, `fB_partner`, potencial
combinado, distância ao gás e os riscos de inibição (`inhib_C`/`inhib_N`) — que
são o que interessa a quem for validar quimicamente.

Filtro por faixa de coerência e por região intermediária.

*Esforço: o maior das quatro. É UI nova, não reaproveita camada existente.*

### Fase 4 — camada regional (Escala C)

11 regiões intermediárias com `cn_regional`, `vsC_share`, `n_sweet_mun`,
`dgas_med`. A geometria de RGINT já existe no mapa (`intermediate-regions`), então
é coroplético sobre camada existente mais um painel.

*Esforço: pequeno, se a geometria de RGINT casar por nome. Verificar antes.*

### Escala D — não fazer

O filtro de proximidade ao gás já existe como camadas de infraestrutura
(`gas_pipeline_*`, `gas_delivery_point`). `d_gas` por município entra como campo
no painel, não como camada nova.

---

## Riscos

| Risco | Tratamento |
|---|---|
| Publicar a partir dos `canon_*` obsoletos | Só `canonical/dossier/*` é fonte; o loader trava por SHA256 |
| Join de RGINT por nome | Conferir contra a geometria existente **antes** da Fase 4 |
| Ler os pares como projeção de rendimento | Rótulo explícito da Seção 9 na legenda e no painel |
| SP e MG divergirem em silêncio | Modos ausentes em MG, com aviso — não vazios |
| Dossiê e mapa divergirem de novo | Os portões do loader ancoram no 191 e no SHA256 |

---

## Verificação

- Loader: 645 linhas, 191 em C:N 20–30, mediana `cn_harm` 32,26.
- Endpoint: 401 sem token; 645 linhas com token; nenhum campo beta no GeoJSON público.
- Mapa em SP: Perfil C/N e Regime presentes, legenda somando 645.
- Mapa em MG: os dois modos **ausentes**, com aviso.
- Pares: 183 linhas, os 30 primeiros por `coherence` batendo com a Seção 6 do
  dossiê — Casa Branca×São José do Rio Pardo em C:N 45→17,7, 30,7 km, f_B 0,52.

---

## Em aberto (decisão de pesquisa, não de plataforma)

1. **MG.** Só sai do limbo com o reprocessamento do `p2_canon.py` incluindo o
   fluxo de esgoto. Sem isso, MG não tem C:N confiável.
2. **As figuras publicadas** ainda usam os números aritméticos.
3. **CHN elementar** (Seção 8 do dossiê): enquanto o carbono for fração suposta
   constante do SV, `cn_harm` é a melhor estimativa disponível, não valor medido.
