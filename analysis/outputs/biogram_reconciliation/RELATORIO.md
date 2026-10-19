# C16, reconciliação BioGRAM × PILAR

> Gerado por `analysis/build_biogram_reconciliation.py`. O lado PILAR é calculado;
> o lado BioGRAM é digitado em `analysis/data/07_biogram_sp_seed.csv`.

- Áreas: 1 estado, 11 regiões intermediárias, 30 sítios (círculos de 30 km no centróide do município-sede). Município entra na área pelo centróide.
- Atlas-FDE Cenário Real, SP: 7.83 bi Nm³ CH₄/ano.
- CP2b: snapshot CP2b ausente (cp2b-workspace/NewLook/backend/data/raw/cp2b_potential/2026/cp2b_municipio_substrato_niveis.csv).
- Valores BioGRAM digitados: **0** de 336 linhas.

## Estado de São Paulo

| Categoria | Atlas Real | CP2b N3 | CP2b N4 | BioGRAM | Causa |
|---|---:|---:|---:|---:|---|
| palha_cana | 2,410 | — | — | — | sem dado BioGRAM |
| vinhaca_torta | 2,058 | — | — | — | sem dado BioGRAM |
| outras_culturas | 1,300 | — | — | — | sem dado BioGRAM |
| dejetos_animais | 1,335 | — | — | — | sem dado BioGRAM |
| rsu_organico | 398 | — | — | — | sem dado BioGRAM |
| esgoto | 67 | — | — | — | sem dado BioGRAM |
| lenhosos | 265 | — | — | — | sem dado BioGRAM |
| total | 7,832 | — | — | — | sem dado BioGRAM |

Valores em milhões de Nm³ CH₄/ano.

## Causas pré-classificadas (todas as linhas)

| Causa | Linhas |
|---|---:|
| sem dado BioGRAM | 336 |

## Como preencher o lado BioGRAM

1. Abrir `areas.geojson` (QGIS ou geojson.io) e desenhar cada área no BioGRAM, começando pela
   prioridade 1 (estado), depois 2 (regiões) e 3 (sítios).
2. Para cada categoria, digitar valor e unidade (`PJ_ano`, `TJ_ano`, `GWh_ano`, `ktoe_ano`,
   `Mtoe_ano`, `bcme_ano`, `Nm3_ch4_ano`, `mi_Nm3_ch4_ano`, `bi_Nm3_ch4_ano`), as categorias
   BioGRAM somadas em `biogram_categorias_origem`, a data e a versão da ferramenta.
3. Se o BioGRAM não cobre a categoria, `escopo_biogram = excluido`. Se só dá o total, use a linha `total`.
4. Rodar o script de novo. A causa é uma primeira leitura: confirmar cada uma antes de publicar.

## Limites

- A referência é o CP2b N3 (mobilizável). Sem o snapshot CP2b, só o Atlas Real,
  e parâmetro e disponibilidade não se distinguem.
- Os sete fluxos "outros" do Atlas são totais estaduais espalhados pelos municípios na proporção
  do GWh técnico de `02_*`: rateio, não dado municipal.
- Tolerância de concordância ±25 %; o vizinho mais próximo entre N1–N4 em escala log
  decide entre disponibilidade e parâmetro.
- Energia ↔ volume pelo PCI do PILAR (9.94 kWh/Nm³); bcme pela convenção IEA de 36 PJ/bcm.
