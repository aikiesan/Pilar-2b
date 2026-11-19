# Incerteza do Cenário Real de SP: protótipo Monte Carlo + Sobol

> Gerado por `analysis/build_sp_real_uncertainty.py`. **Protótipo**: as larguras marcadas
> `assumed` em `sobol_indices.csv` são provisórias e devem ser substituídas por faixas
> derivadas do corpus antes de qualquer publicação.

- Determinístico publicado (reproduzido por este script, fluxo a fluxo): **7.832 bi Nm³ CH₄/ano**
- Monte Carlo (N = 200,000): P10 **7.30**, P50 **8.06**, P90 **8.89** bi Nm³/ano (P5–P95: 7.10–9.14)
- O número determinístico fica no percentil **36** da distribuição.

## O que mais move o número (Sobol, índice total ST)

| Parâmetro | ST | S1 | Fonte da faixa |
|---|---:|---:|---|
| `palha_bmp` | 0.239 | 0.209 | corpus |
| `palha_fracao_removivel` | 0.172 | 0.161 | atlas |
| `bovino_kg_esterco_dia` | 0.151 | 0.144 | assumed |
| `bovino_bmp` | 0.135 | 0.128 | corpus |
| `palha_kg_por_t_cana` | 0.110 | 0.101 | assumed |
| `campo_retencao_milho_soja_silv` | 0.104 | 0.105 | assumed |
| `campo_bmp_milho_soja_silv` | 0.038 | 0.029 | assumed |
| `vinhaca_ch4_frac` | 0.019 | 0.018 | atlas |
| `vinhaca_biogas_m3_por_m3_etanol` | 0.017 | 0.008 | assumed |
| `torta_bmp_x_vs` | 0.013 | 0.000 | assumed |

Convergência: ST com N = 65,536 e N = 131,072 estão lado a lado em `sobol_indices.csv`.
Soma de S1 = 0.909. Um valor próximo de 1 indica um modelo quase aditivo,
em que as interações entre parâmetros pesam pouco.

## Como ler

- Um ST alto com fonte `assumed` é **prioridade de pesquisa**: medir esse parâmetro reduz
  mais a incerteza do número estadual do que qualquer outro esforço.
- O intervalo P10–P90 é o que deveria acompanhar o número publicado (estratégia §2.3).
- S1 usa o estimador de Saltelli (2010), que é mais ruidoso que o de ST; valores de S1 abaixo
  de ~0,01 ou negativos são ruído amostral e devem ser lidos como zero.

## Limites deste protótipo

- Os parâmetros são amostrados de forma **independente**. BMP e VS do mesmo substrato, e as
  frações de retenção de culturas de campo, provavelmente são correlacionados; correlação
  positiva alargaria o intervalo.
- Só a incerteza **paramétrica** entra. Escolhas estruturais (vinhaça com FDE = 1,0, exclusão
  do bagaço, FS = FL = 1,0) não são parâmetros aqui e podem pesar mais que tudo acima.
- Os dados de atividade (PAM, PPM, Censo) são tratados como exatos.
- A largura do intervalo depende diretamente das faixas `assumed`. O valor deste
  protótipo está no **ranking** dos parâmetros e no método, não na largura exata.
