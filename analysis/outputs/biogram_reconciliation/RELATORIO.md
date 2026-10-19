# C16, reconciliação BioGRAM × PILAR

> Gerado por `analysis/build_biogram_reconciliation.py`. O lado PILAR é calculado;
> o lado BioGRAM é digitado em `analysis/data/07_biogram_sp_seed.csv`.

- Áreas: 1 estado, 11 regiões intermediárias, 30 sítios (círculos de 30 km no centróide do município-sede). Município entra na área pelo centróide.
- Atlas-FDE Cenário Real, SP: 7.83 bi Nm³ CH₄/ano.
- CP2b: CP2b v5.1, cenário med. N3 7.00, N4 5.97 bi Nm³ CH₄/ano.
- No escopo do BioGRAM: Atlas 5.53, CP2b N3 5.18 bi Nm³ CH₄/ano (sem vinhaça, torta, silvicultura e aquicultura). É esse total que se compara.
- Valores BioGRAM digitados: **2** de 168 linhas da planilha.
- BioGRAM 1.2, Brasil inteiro (não há recorte estadual no arquivo): 67.19 bcm/ano, dos quais açucareiras 10.83, dejetos 20.79, oleaginosas 16.29.

## Estado de São Paulo

### Pelas abas do mapa (o que se compara)

| Aba do mapa | Atlas Real | CP2b N1 | CP2b N2 | CP2b N3 | CP2b N4 | BioGRAM | BioGRAM ÷ N3 | Causa |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Crop residues | 3,710 | 18,854 | 12,363 | 4,380 | 3,640 | 6,581 | 1.50 | parâmetro |
| Manure | 1,335 | 2,123 | 582 | 558 | 455 | — | — | sem dado BioGRAM |
| Biowaste | 489 | 658 | 408 | 238 | 220 | — | — | sem dado BioGRAM |
| Total | 5,534 | 21,635 | 13,353 | 5,176 | 4,315 | 9,372 | 1.81 | disponibilidade |

### Por categoria do PILAR

| Categoria | Atlas Real | CP2b N3 | CP2b N4 | Causa |
|---|---:|---:|---:|---|
| acucareiras | 2,410 | 3,827 | 3,221 | só no agregado do mapa |
| cereais | 544 | 248 | 187 | só no agregado do mapa |
| oleaginosas | 489 | 239 | 178 | só no agregado do mapa |
| outras_culturas | 266 | 65 | 54 | só no agregado do mapa |
| raizes_tuberculos | 0 | 0 | 0 | só no agregado do mapa |
| rsu | 423 | 187 | 177 | só no agregado do mapa |
| esgoto | 67 | 51 | 43 | só no agregado do mapa |
| vinhaca_torta | 2,058 | 1,826 | 1,657 | escopo |
| silvicultura_aquicultura | 240 | 0 | 0 | escopo |
| total_pilar | 7,832 | 7,002 | 5,972 |  |

Valores em milhões de Nm³ CH₄/ano. BioGRAM reescalado da área desenhada para a área do PILAR (248,219 km² no estado) quando `biogram_area_km2` está preenchido.

## O que a nota metodológica da IEA já explica

| Categoria | Grupo BioGRAM | Regra do BioGRAM | Causa esperada |
|---|---|---|---|
| acucareiras | Sugar crops | Palha e bagaço; 60 % da palha fica no campo; só ração e cama saem como outro uso (32 % disponível em EMDE). A queima de bagaço nas usinas não é descontada. | disponibilidade (bagaço) e parâmetro (palha) |
| cereais | Cereals and grains | 60 % no campo (milho 50 %); parte vai para ração e cama conforme a densidade de animais; milho 247 Nm³/t SV. | parâmetro |
| oleaginosas | Oil and protein | Mesma regra de campo; soja 240 Nm³/t SV. | parâmetro |
| outras_culturas | Other crops | Inclui frutas, café, algodão, forrageiras, hortaliças, tabaco; o PILAR só tem citros e café. | escopo |
| raizes_tuberculos | Roots and tubers | Mandioca, batatas; o PILAR não modela. | escopo |
| dejetos | Manure | 65 % recuperável em média, sem usos concorrentes; inclui búfalos, ovinos e caprinos. | disponibilidade (pasto) |
| rsu | Municipal solid waste | Inclui papel e papelão além de alimento e jardim; coleta e destinos do What a Waste 3.0. | escopo (papel) e parâmetro |
| esgoto | Wastewater | Lodo primário 150 e secundário 70 kg seco por ML tratado (HydroWASTE); 272 Nm³/t SV. | parâmetro |
| vinhaca_torta | fora | Não é matéria-prima do BioGRAM. | escopo |
| silvicultura_aquicultura | fora | Florestal excluído explicitamente; peixe não consta. | escopo |

Geral: grade de 0,125° (cerca de 14 km), produção agrícola FAO de 2020 projetada pelo OECD-FAO Outlook,
1 Nm³ de metano = 36 MJ, e cerca de 9 % do potencial técnico bruto sai por ser disperso demais para uma planta.

## Causas pré-classificadas (todas as linhas)

| Causa | Linhas |
|---|---:|
| só no agregado do mapa | 294 |
| sem dado BioGRAM | 166 |
| escopo | 84 |
| parâmetro | 1 |
| disponibilidade | 1 |

## Como preencher o lado BioGRAM

1. Abrir `areas.geojson` (QGIS ou geojson.io) e desenhar cada área no BioGRAM, começando pela
   prioridade 1 (estado), depois 2 (regiões) e 3 (sítios).
2. Para cada categoria, digitar valor e unidade (`PJ_ano`, `TJ_ano`, `GWh_ano`, `ktoe_ano`,
   `Mtoe_ano`, `bcme_ano`, `Nm3_ch4_ano`, `mi_Nm3_ch4_ano`, `bi_Nm3_ch4_ano`), as categorias
   BioGRAM somadas em `biogram_categorias_origem`, a data e a versão da ferramenta.
3. Quatro valores por área, um por aba do mapa (Total, Biowaste, Crop residues, Manure), em `mcme_ano`,
   com a área que o mapa mostra em `biogram_area_km2` e o custo médio em `biogram_custo_usd_gj`.
   Vinhaça, torta e silvicultura não entram na planilha: são escopo por definição.
4. Rodar o script de novo. A causa é uma primeira leitura: confirmar cada uma antes de publicar.

## Limites

- A referência é o CP2b N3 (mobilizável). Sem o snapshot CP2b, só o Atlas Real,
  e parâmetro e disponibilidade não se distinguem.
- Os sete fluxos "outros" do Atlas são totais estaduais espalhados pelos municípios na proporção
  do GWh técnico de `02_*`: rateio, não dado municipal.
- O BioGRAM soma células de 0,125° que caem no polígono; o PILAR, municípios pelo centróide. Nas
  regiões o efeito de borda é pequeno; num círculo de 30 km (cerca de 14 células) não é.
- Tolerância de concordância ±25 %; o vizinho mais próximo entre N1–N4 em escala log
  decide entre disponibilidade e parâmetro.
- Energia ↔ volume pelo PCI do PILAR (9.94 kWh/Nm³); bcme pela convenção IEA de 36 PJ/bcm.
