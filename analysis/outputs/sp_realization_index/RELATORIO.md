# Índice de Realização do biometano em SP (IRM)

> Gerado por `analysis/build_sp_realization_index.py` a partir dos dados abertos da ANP
> (`analysis/data/05d_*`, `05c_*`). Só biometano; o biogás para eletricidade (ANEEL) fica fora.

| Denominador (potencial mobilizável) | Nm³ CH₄/dia |
|---|---:|
| CP2b v5.1 N4 (o "Real" do mapa) | 16.36 M |
| CP2b v5.1 N3 (o "Ideal" do mapa) | 19.18 M |
| Atlas-FDE Real (METODOLOGIA_CENARIOS) | 21.46 M |

- Série: 07/2022 a 04/2026 (46 meses com produção em SP).
- Último mês (04/2026): **118 mil m³/dia** produzidos, **IRM = 0.72 %** do Real (N4); 0.55 % do Real Atlas.
- Média dos últimos 12 meses: 126 mil m³/dia (IRM N4 = 0.77 %).
- Capacidade **autorizada** pela ANP em SP (04/2026): 558 mil m³/dia, ou 3.4 % do Real (N4). Uso da capacidade no último mês: 21 %.

## E o biogás que não vira biometano?

- CIBiogás Panorama 2025 (2025): SP produz **4.9 M Nm³ de biogás por dia**, a maior parte no setor sucroenergético, queimado para eletricidade e calor.
- Com 55%–65% de CH₄, isso é **2.7–3.2 M Nm³ CH₄/dia**, ou **16–19 % do N4**: 23–27 vezes o biometano do último mês.
- Consequência para a leitura do IRM: SP **já aproveita** uma fração relevante do seu metano;
  o que está abaixo de 1 % é a parcela que chega à rede como **biometano**. A lacuna
  principal é de **rota** (eletricidade → biometano), não só de projetos novos.
- Consequência para o denominador: se o U do CP2b (metano já recuperado, descontado no N3)
  não incluir esse biogás sucroenergético, o N4 está superestimado na mesma ordem. O snapshot
  do CP2b não está no repositório; conferir `existing_use_subtracted_ch4_nm3_year` antes de
  publicar qualquer IRM.
- O número do CIBiogás é estadual e anual; não entra na série mensal e não se confunde com ela.

## Leitura

- O estado produz **menos de 1 %** do biometano que o seu potencial mobilizável sustentaria,
  e as plantas autorizadas operam bem abaixo da capacidade. A lacuna é de **realização**
  (projetos, conexão, contratos, e a conversão do biogás que hoje vira eletricidade),
  não de recurso.
- O peso do mandato nacional sobre essa oferta está em `build_sp_mandate_coverage.py`.
- O CP2b N3 já desconta o metano recuperado por plantas existentes (U), então o N4 é o
  potencial *ainda disponível*. Contra o N3, o IRM do último mês é 0.61 %;
  para o biogás total, ver acima.
- Biometano é tratado como CH₄ puro (especificação ANP ≥ 90 % CH₄), o que superestima o IRM
  em no máximo ~10 %.
