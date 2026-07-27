# A1c — Correção da ponderação e fechamento das rotas da vinhaça

**Data:** 2026-07-27  
**Escopo:** auditoria somente leitura de A1b.  
**Regra observada:** `feedstocks.yaml` não foi alterado; este relatório não muda parâmetro canônico.

## Resultado executivo

1. A fonte localizada que informa a geração específica para as duas configurações atribui aproximadamente **8,6 L de vinhaça/L de etanol** tanto à destilaria autônoma (mosto de caldo) quanto à usina anexa (mosto de caldo + melaço). Com esses rendimentos iguais, ponderar por volume de vinhaça ou por volume de etanol produz os mesmos pesos condicionais de A1b: 15% e 85%. Assim, o **TS ponderado permanece 5,05%**, isto é, mudança de **0,00 ponto percentual (0,0%)** em relação a A1b.
2. A1b calculou `VS/TS` como média aritmética de duas razões. A agregação material correta é somar primeiro TS e VS, ambos ponderados por volume, e só então dividir. Isso dá **VS/TS = 74,26%**, e não 73,50%; a diferença é **+0,76 ponto percentual**. A concentração agregada de VS passa de 37,1175 para **37,5000 kg/m³** (+0,3825 kg/m³; +1,03%).
3. A razão DQO/VS de A1b não resulta de uma população amostral comum. Os valores arredondados de TS, VS/TS e DQO não são reproduzíveis como uma linha única das fontes citadas; A1b combinou revisões, estudos e pontos de preparação diferentes. Com a agregação material corrigida, a combinação de A1b daria **1,040 kg DQO/kg VS**, ainda mais baixa que 1,0507.
4. Existe fonte paulista que reporta **TS, TVS e DQO na mesma vinhaça coletada**. Usando somente Bueno et al. (2024), sem combinar fontes: TS = **53,43 g/L**, TVS = **21,90 g/L**, VS/TS = **40,99%**, DQO = **33,70 g/L** e DQO/VS = **1,539 kg/kg**. Essa razão cai na faixa de controle de 1,5–2,0. A amostra é de uma única usina anexa em Pradópolis; não é uma média estadual.
5. A alegação de que as fontes de A1b representam 15% e 85% da vinhaça paulista não está demonstrada. Esses percentuais aparecem em A1b sem tabela oficial reproduzível, denominador ou cálculo. Condicionalmente à hipótese 15/85 e ao rendimento igual de 8,6 L/L, eles também seriam 15/85 do volume; isso não transforma uma usina ou uma revisão em amostra representativa dessas frações.

## 1. Ponderação por volume de vinhaça

### 1.1 Fator de geração por rota

Moraes, Zaiat e Bonomi (2015) definem a correspondência de processo: destilaria autônoma produz etanol a partir de caldo; usina anexa produz açúcar e etanol e sua vinhaça deriva de caldo e melaço. A mesma família de modelos da Biorrefinaria Virtual de Cana informa que **ambas** as configurações geram cerca de **8,6 m³ de vinhaça/m³ de etanol**. Fuess et al. (2018) publica explicitamente 8,6 m³/m³ para a biorrefinaria anexa simulada.

| Rota usada em A1b | Configuração correspondente | Geração específica usada | Natureza e `n` |
|---|---|---:|---|
| Mosto de caldo | Destilaria autônoma | 8,6 L vinhaça/L etanol | estimativa de processo; `n` amostral = 0 |
| Mosto misto | Usina anexa | 8,6 L vinhaça/L etanol | estimativa de processo; `n` amostral = 0 |

Fontes:

- Moraes, Zaiat & Bonomi (2015), *Anaerobic digestion of vinasse from sugarcane ethanol production in Brazil: Challenges and perspectives*, DOI [10.1016/j.rser.2015.01.023](https://doi.org/10.1016/j.rser.2015.01.023), especialmente a definição das configurações e a Tabela 3: [PDF no Repositório USP](https://repositorio.usp.br/directbitstream/15fedb32-7dcf-48e0-becc-950e3d0d1011/PROD_23667_SYSNO_3024570.pdf).
- Fuess et al. (2018), *Diversifying the technological strategies for recovering bioenergy from the two-phase anaerobic digestion of sugarcane vinasse*, DOI [10.1016/j.renene.2018.02.003](https://doi.org/10.1016/j.renene.2018.02.003), Tabela 1: [manuscrito no Repositório UNESP](https://repositorio.unesp.br/server/api/core/bitstreams/fcf033ac-ac67-4015-a5fc-98a5ca83ea88/content).
- Síntese do modelo VSB que declara o mesmo valor para autônomas e anexas: [Virtual Sugarcane Biorefinery — seção “Vinasse from sugarcane mills”](https://www.sciencedirect.com/topics/engineering/virtual-sugarcane-biorefinery).

Esses 8,6 L/L são estimativas tecnológicas, não médias observacionais por tipo de mosto. A literatura também registra ampla variação de processo (por exemplo, 6–14 L/L). Portanto, o cálculo abaixo é a correção reproduzível com a única fonte encontrada que separa explicitamente as duas configurações; não é uma nova campanha amostral.

### 1.2 Pesos volumétricos

Para uma base de 1 L de etanol paulista, mantendo apenas para diagnóstico as frações não comprovadas de A1b:

```text
V_caldo = 0,15 L etanol × 8,6 L vinhaça/L etanol = 1,29 L vinhaça
V_misto = 0,85 L etanol × 8,6 L vinhaça/L etanol = 7,31 L vinhaça
V_total = 8,60 L vinhaça

w_caldo = 1,29 / 8,60 = 0,15
w_misto = 7,31 / 8,60 = 0,85
```

Logo, corrigir o objeto do peso — etanol para volume de vinhaça — **não muda os pesos**, porque os fatores específicos encontrados são iguais.

### 1.3 TS e VS/TS agregados

Mantendo os valores de A1b somente para testar sua aritmética:

| Rota | Peso por volume | TS | VS/TS | VS calculado |
|---|---:|---:|---:|---:|
| Caldo | 15% | 2,50% | 65,0% | 16,25 kg/m³ |
| Misto | 85% | 5,50% | 75,0% | 41,25 kg/m³ |

```text
TS = 0,15 × 25,00 + 0,85 × 55,00
   = 50,50 kg TS/m³
   = 5,05%

VS = 0,15 × 16,25 + 0,85 × 41,25
   = 37,50 kg VS/m³

VS/TS = 37,50 / 50,50
      = 0,742574
      = 74,26%
```

Comparação com A1b:

| Métrica | A1b | A1c, ponderação material | Delta |
|---|---:|---:|---:|
| TS | 5,05% | **5,05%** | **0,00 p.p.** |
| VS/TS | 73,50% | **74,26%** | **+0,76 p.p.** |
| VS | 37,1175 kg/m³ | **37,5000 kg/m³** | **+0,3825 kg/m³ (+1,03%)** |

A média `0,15 × 65% + 0,85 × 75% = 73,5%` só seria adequada se as duas correntes tivessem a mesma concentração de TS. Não têm.

## 2. Por que DQO/VS = 1,05 não fecha

### 2.1 As fontes não são uma população comum

A referência “Bonomi et al. (2015), DOI 10.1016/j.rser.2015.01.022” usada na camada documental do projeto está incorreta. O artigo de vinhaça é **Moraes, Zaiat & Bonomi (2015)**, DOI **10.1016/j.rser.2015.01.023**. Ele é uma **revisão** e sua Tabela 3 compila estudos distintos.

Os números exatos de A1b não formam uma linha dessa tabela:

- para caldo, a revisão inclui, entre outras, uma linha com DQO 15–33 g/L, TS 24 g/L e VS 20 g/L, e outra com DQO 31,3 g/L, TS 21,1 g/L e VS 15,6 g/L; nenhuma dá simultaneamente TS 2,50%, VS/TS 65% e DQO 22 kg/m³;
- para misto, a revisão inclui DQO 45 g/L e TS 53 g/L na compilação histórica, enquanto Fuess et al. (2017) mediu DQO 28,3 ± 4,6 g/L e TVS 20,775 ± 3,416 g/L em vinhaça de uma usina anexa de Pradópolis; isso não sustenta o par 42 kg/m³ e VS/TS 75% atribuído por A1b.

Fuess et al. (2017) também informa que DQO e TVS se referem a amostras **filtradas em papel de 3 µm** antes de alimentar o reator. O artigo não reporta TS da vinhaça nessa caracterização. Portanto ele não pode, sozinho, fornecer o `VS/TS` de A1b.

Fonte: Fuess et al. (2017), *Thermophilic two-phase anaerobic digestion using an innovative fixed-bed reactor...*, DOI [10.1016/j.apenergy.2016.12.071](https://doi.org/10.1016/j.apenergy.2016.12.071), seção 2.1: [PDF no Repositório UNESP](https://repositorio.unesp.br/server/api/core/bitstreams/f002c812-3e5d-4984-9883-aa0d22873851/content).

### 2.2 O ponto de amostragem não foi harmonizado

- Moraes et al. (2015) compila artigos com origens, safras, instalações e tratamentos distintos; não há um ponto de amostragem comum para a média montada em A1b.
- Fuess et al. (2017) caracteriza a vinhaça coletada em uma usina anexa e depois filtrada a 3 µm. O ponto físico exato dentro da usina não é declarado.
- As afirmações de A1b de “fundo de coluna” para todas as medições e de diluição por flegmaça de 5–10% não são acompanhadas de citação verificável.

Conclusão: **sim, a ponderação de A1b misturou populações**. Não há base para interpretar sua DQO e seu VS como análises da mesma vinhaça, do mesmo tipo e do mesmo ponto.

### 2.3 Razão corrigida sem trocar as entradas de A1b

Se apenas a aritmética de massa for corrigida:

```text
DQO = 0,15 × 22 + 0,85 × 42 = 39,00 kg/m³
VS  = 37,50 kg/m³
DQO/VS = 39,00 / 37,50 = 1,040 kg/kg
```

O problema não é resolvido; a razão fica ainda mais baixa. Isso confirma que não se trata apenas de escolher o peso correto.

## 3. Fechamento com TS, VS e DQO na mesma vinhaça

### 3.1 Fonte selecionada

Bueno et al. (2024) coletou vinhaça de cana na Usina São Martinho, Pradópolis, SP, e reportou na mesma Tabela 1:

- DQO total = **33.700 mg/L**;
- TS = **53,43 ± 1,30 g/L**;
- TVS = **21,90 ± 0,24 g/L**.

Fonte: Bueno et al. (2024), *Treatment of sugarcane vinasse in AnMBR and UASB: process performance and microbial community comparison*, DOI [10.3389/fbioe.2024.1489807](https://doi.org/10.3389/fbioe.2024.1489807), seção 2.1 e Tabela 1: [PDF da revista](https://public-pages-files-2025.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2024.1489807/pdf).

O artigo informa que os resultados são apresentados como média ± desvio-padrão, mas não declara o número de lotes independentes nem o `n` analítico específico da Tabela 1. Assim:

- `n` de instalações = **1**;
- `n` de correntes/lotes caracterizados de forma independente = **não informado**;
- `n` de réplicas analíticas de TS/TVS = **não informado**;
- `n` de DQO na tabela = **não informado**.

Não se deve converter o “±” em `n = 3` por suposição.

### 3.2 Cálculo usando somente essa fonte

```text
TS = 53,43 g/L = 5,343% m/v

VS/TS = 21,90 / 53,43
      = 0,409882
      = 40,99%

DQO/VS = 33,70 / 21,90
       = 1,5388 kg DQO/kg VS
```

| Métrica | Amostra única de Bueno et al. (2024) |
|---|---:|
| TS | **5,343% m/v** |
| VS/TS | **40,99%** |
| DQO | **33,70 kg/m³** |
| VS | **21,90 kg/m³** |
| DQO/VS | **1,539 kg/kg** |

Este é o fechamento observacional preferível porque não combina TS, VS e DQO de estudos diferentes. Ele **substitui a combinação de fontes para o teste de coerência**, mas não deve ser apresentado como média de São Paulo: representa uma instalação anexa e um conjunto de amostras cujo `n` independente não foi publicado.

Há outras publicações que também co-reportam os três parâmetros, mas misturá-las recriaria o problema que A1c deve eliminar. Por isso nenhuma média entre estudos foi feita.

## 4. Compatibilidade com a vinhaça de São Paulo e `n`

| Fonte invocada em A1b | O que a fonte realmente é | Tipo de vinhaça compatível | Fração da vinhaça de SP que ela mede | `n` relevante |
|---|---|---|---|---:|
| Salomon & Lora (2009) | estimativa/revisão de potencial energético | predominantemente valores genéricos ou de melaço; não separa uma amostra paulista caldo/misto | **desconhecida; não estimada** | 0 amostras próprias |
| “Bonomi et al. (2015)” | citação incorreta/duplicada do artigo de Moraes, Zaiat & Bonomi | revisão cobre caldo, melaço e misto em linhas de estudos diferentes | **desconhecida; não estimada** | 0 amostras próprias |
| Moraes, Zaiat & Bonomi (2015) | revisão e compilação | tipologias autônoma e anexa, mas não uma população estadual amostrada | **desconhecida; não estimada** | 0 amostras próprias; `n` varia por parâmetro compilado |
| Fuess et al. (2017) | experimento com vinhaça de usina de açúcar + etanol em Pradópolis | usina anexa; amostra filtrada a 3 µm para DQO/TVS | **uma instalação; fração estatística estadual desconhecida** | 1 instalação; lotes independentes não informados |
| Bueno et al. (2024), adotada para o fechamento | caracterização conjunta de TS, TVS e DQO da vinhaça da São Martinho | usina anexa em Pradópolis | **uma instalação; fração estatística estadual desconhecida** | 1 instalação; lotes/réplicas da caracterização não informados |

O `n = 7` citado por A1b vem de observações de **BMP** em `feedstock_bmp_from_refs.csv`. Ele não é o `n` das determinações de TS, VS ou DQO e não pode ser usado como tamanho amostral desta ponderação.

### Declaração explícita sobre as frações 15/85

- Não foi encontrada, nas referências dadas por A1b, uma apuração reproduzível demonstrando que 15% do etanol paulista provém de destilarias autônomas e 85% de anexas.
- Se esses percentuais forem mantidos apenas como hipótese e se forem aplicados os fatores iguais de 8,6 L/L, então as frações **condicionais de volume de vinhaça** também são 15% de caldo e 85% de anexa/mista.
- Isso é uma transformação algébrica da hipótese, não uma medição. A compatibilidade estatística efetivamente demonstrada pelas fontes experimentais é: **uma usina anexa; cobertura estadual desconhecida**.

## 5. Decisão de fechamento

Para qualquer checagem entre as rotas de sólidos e DQO, a combinação A1b deve ser tratada como **não identificada amostralmente**. O fechamento defensável é o da mesma vinhaça de Bueno et al. (2024): **TS 5,343% m/v; VS/TS 40,99%; DQO/VS 1,539**.

O valor de **5,05%** continua sendo apenas o resultado aritmético condicional da mistura 15/85 de A1b. A correção do peso para volume de vinhaça não o altera porque os fatores por configuração usados são iguais, mas a evidência disponível não autoriza promovê-lo a média representativa do estado.

**Status:** auditoria encerrada. Nenhuma alteração em `feedstocks.yaml`, código ou parâmetros canônicos.
