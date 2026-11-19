# A20: o potencial de MG "publication-ready" usa rebanho sintético

**Data:** 2026-10-19
**Escopo:** `analysis/build_mg_master_residues.py` e tudo o que consome `analysis/data/01_master_residue_streams_MG_2023.csv`:
- `build_mg_paper_verification.py`
- `build_mg_empirical_validation.py`
- `build_mg_biochemical_matching.py`
- `build_mg_spatial_clustering_figures.py`
- `run_pilar2b_mg_pipeline.py`
- `tests/test_pilar2b_mg_e2e.py`

**Impacto na plataforma:** nenhum direto. Nenhum código de `cp2b-workspace/NewLook` lê esse dataset; a camada MG do mapa vem de outro caminho (PAM e PPM via `bbp`).
**Impacto no paper:** alto. `analysis/paper_verification/MG_PAPER_DATA_VERIFICATION.md` declara o total "fully verified, mathematically consistent, and publication-ready".
**Alterações de código:** nenhuma. Este relatório só documenta e propõe.

---

## 1. O que o código faz

`ingest_mg_livestock()` (`build_mg_master_residues.py:753-837`) é rotulado "PPM 2023 / HERD MODELING", mas não lê dado da PPM. Para cada município, ele calcula:

```python
rural_area_ha = max(100.0, area_km2 * 100.0 * 0.65)
bov_heads     = rural_area_ha * bov_density     * 0.25   # densidade por RGint, assumida
swine_heads   = rural_area_ha * swine_density   * 0.05
poultry_heads = rural_area_ha * poultry_density * 0.08
bov_heads     = max(50.0,  bov_heads)                     # pisos
swine_heads   = max(10.0,  swine_heads)
poultry_heads = max(100.0, poultry_heads)
```

As densidades por região intermediária (por exemplo, 35 suínos/ha em Patos de Minas) estão escritas no código, sem fonte.

As linhas de saída levam `source_dataset = "CP2B_municipalities_DB+IBGE_PAM_PPM_PEVS"` (linhas ~907–1149). Quem lê o CSV entende que o rebanho é da PPM.

Além disso, os suínos usam `biogas_m3 = swine_heads * 380.0` (linha ~1105). É o fator por **matriz** aplicado ao rebanho **total**. A auditoria de SP (`backend/scripts/sp_scenarios_real_ideal.py`, docstring, item 4) identificou exatamente esse erro como uma inflação de cerca de 9,7× e o corrigiu reconstruindo por massa de dejeto.

## 2. Tamanho do erro

Os rebanhos implícitos podem ser lidos direto do CSV de saída: `residue_tons_yr` guarda as cabeças nos três fluxos.

| Espécie | Sintético MG (CSV) | Referência IBGE PPM 2023 | Razão |
|---|---:|---:|---:|
| Bovinos | 10,41 M | MG: **22,5 M** (informativo PPM 2023) | 0,46× (subestima) |
| Suínos | **19,55 M** | **Brasil inteiro: 43,0 M** | MG sintético = 45 % do rebanho **nacional** |
| Galináceos | **728,8 M** | **Brasil inteiro: 1,6 bi** | MG sintético = 45 % do rebanho **nacional** |

O rebanho suíno de MG é uma fração pequena do nacional; Santa Catarina, Paraná e Rio Grande do Sul concentram a suinocultura. Um valor de 45 % do Brasil é impossível sem precisar do número estadual exato.

Os totais estaduais de suínos e galináceos de MG não foram consultados porque a API SIDRA estava inacessível na sessão desta auditoria. **Antes de qualquer correção, conferir** na tabela SIDRA 3939, com `n3/31` e `p/2023`.

**Efeito no número principal.**
- Os suínos respondem por 7,43 bi de 21,61 bi Nm³/ano, ou **34 %** do total de MG.
- Com o rebanho real (cerca de 4× menor, por ordem de grandeza) e o fator corrigido por massa de dejeto (cerca de 9,7× menor), a contribuição dos suínos cai **mais de uma ordem de grandeza**.
- Os bovinos, por outro lado, sobem cerca de 2×.
- O total de MG e a razão "MG = 2,8× SP" **não se sustentam**.

## 3. Inconsistências de método com SP

| Regra | SP (canônico) | MG (este pipeline) |
|---|---|---|
| Fonte do rebanho | IBGE PPM | Densidade assumida × área rural, com pisos |
| Suínos | Massa de dejeto × VS × BMP | 380 m³/cabeça × rebanho total |
| Bagaço | Excluído (Atlas p.65: já vai para cogeração) | Contado com 70 % de exclusão |
| Rótulo da fonte | Rastreável | Diz "PPM", mas a PPM não é usada |

## 4. Recomendação

1. **Imediata:** acrescentar no topo de `MG_PAPER_DATA_VERIFICATION.md` um aviso que retira o selo "publication-ready" até a reemissão. *Feito junto com este relatório.*
2. **Correção:**
   - trocar `ingest_mg_livestock()` pela PPM real, já disponível no schema `bbp` (`backend/scripts/promote_ibge_ppm.py`, `--source bbp`) ou num snapshot SIDRA 3939 versionado;
   - reconstruir suínos, bovinos e aves por massa de dejeto, com as mesmas funções e constantes de `sp_scenarios_real_ideal.py`;
   - excluir o bagaço como em SP.
3. **Proteção:**
   - um gate em `tests/test_pilar2b_mg_e2e.py` que falha se o rebanho estadual de qualquer espécie divergir mais de 1 % do total PPM do estado;
   - outro que falha se `source_dataset` citar PPM num caminho que não leu a PPM.
4. **Comunicação:** se o número de 21,61 bi já circulou, por exemplo em apresentação, resumo ou e-mail a parceiros, emitir uma errata curta com o número reemitido. Ver a estratégia, §10.

## Fontes

- [IBGE: informativo PPM 2023 (bovinos por UF; totais nacionais de suínos e galináceos)](https://biblioteca.ibge.gov.br/visualizacao/periodicos/84/ppm_2023_v51_br_informativo.pdf)
- [Agência IBGE: valor da produção da pecuária e aquicultura em 2023](https://agenciadenoticias.ibge.gov.br/agencia-noticias/2012-agencia-de-noticias/noticias/41352-valor-da-producao-da-pecuaria-e-aquicultura-chega-a-r122-4-bilhoes-em-2023)
