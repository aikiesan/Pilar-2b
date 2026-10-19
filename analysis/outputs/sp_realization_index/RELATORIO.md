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

## Leitura

- O estado produz **menos de 1 %** do biometano que o seu potencial mobilizável sustentaria,
  e as plantas autorizadas operam bem abaixo da capacidade. A lacuna é de **realização**
  (projetos, conexão, contratos), não de recurso.
- Metas oficiais citadas na estratégia (0,7 a 1,3 M m³/dia até 2027) mudariam o IRM para
  cerca de 4–8 %. Este script permite acompanhar mês a mês se isso acontece.
- O CP2b N3 já desconta o metano recuperado por plantas existentes (U), então o N4 é o
  potencial *ainda disponível*. Com IRM abaixo de 1 %, isso não muda os dois primeiros dígitos.
- Biometano é tratado como CH₄ puro (especificação ANP ≥ 90 % CH₄), o que superestima o IRM
  em no máximo ~10 %.
