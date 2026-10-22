# Nota ao time do método CP2b: dejetos e BMP contra a literatura

Data: 22/10/2026 · Rascunho para revisão interna antes de circular.

## Por que esta nota

O artigo sai com o CP2b v5.1 (N3 e N4) e a plataforma não muda até a
submissão. Esta nota não propõe trocar nenhum número agora. Ela registra onde
a literatura que a rotina Literature Watch juntou em outubro concorda ou não
com os parâmetros do CP2b, para o time decidir o que entra como limitação no
artigo e o que fica para a v5.2.

Fontes desta nota (no repositório, branch `claude/epic-cray-bvxgrn`):

- `analysis/outputs/evidencia_geracao/RELATORIO.md`: 48 registros de geração
  de dejetos, 18 comparados com o CP2b, na unidade do CP2b.
- `analysis/outputs/evidencia_bmp/RELATORIO.md`: 40 registros de BMP.
- As faixas do CP2b vêm do `cp2b_parametros.csv` do snapshot v5.1, com o
  sha256 do loader conferido.

Os valores, DOIs e notas de qualidade (tier A/B/C) são os do registro da
rotina. Antes de citar qualquer um no artigo, abra a fonte.

## O que pede decisão

### 1. Bovino de leite: g do CP2b é cerca de 1/3 da excreção medida

| | t / vaca / ano, fresco |
|---|---|
| CP2b BOV_LEITE (g), mín–máx (med) | 3,65–6,57 (5,11), ou seja, 10–18 kg/dia |
| Embrapa, fezes + urina por vaca (tier B) | 16,4–17,5 (45–48 kg/dia) |
| Vacas em lactação, compost barn, MG (tier A, doi 10.15159/ar.20.105) | 13,0–24,1 (35,6–66 kg/dia) |

ST e SV do CP2b batem com a literatura (ST 17,8 %, SV 79–83 % de ST, dentro
das faixas). A diferença está no g.

Pergunta: o g de 10–18 kg/dia é excreção total ou já é a fração coletável?
Se for coletável, o FC de 0,5 desconta a coleta pela segunda vez. Se for
excreção total, está abaixo da literatura por um fator de 3 a 3,6.

### 2. Bovino confinado: matéria seca do CP2b acima da medida

| | t MS / cab / ano |
|---|---|
| CP2b BOV_CONFINADO (g × ST), mín–máx (med) | 0,87–2,10 (1,50) |
| Fezes de bovinos em terminação, 75 % de concentrado, MG (tier B) | 0,84–0,87 |

No fresco é o contrário: a Embrapa dá 30–35 kg/dia (fezes + urina), acima dos
13,3–25 kg/dia do CP2b. Mas a urina pesa e quase não tem sólidos; o metano
vem do SV. Pela matéria seca, a mediana do CP2b fica cerca de 1,8 vez acima
da medida. O SV medido (86–88 % de ST) fica um pouco acima da faixa do CP2b
(78–84 %), o que compensa só em parte.

Pergunta: a combinação g = 20 kg/dia com ST = 20,5 % (Montoro 2017) é
representativa do confinamento paulista, ou vale usar a matéria seca fecal
como âncora?

### 3. Frango de corte: o ST da cama e os lotes por ano

O CP2b usa 45 kg de cama por ave alojada por ano com ST de 25 %, ou seja,
cerca de 11,2 kg de matéria seca por ave alojada por ano. A literatura dá:

- ST da cama na retirada: 64,3 % (faixa 34–85 %, n = 165, RS/SC, tier A).
- Matéria seca por ave e por lote: 1,87 kg (SP, tier A, inclui a maravalha)
  e 1,49 kg (SP, primeiro lote, tier B).

A matéria seca do CP2b fecha com 6,0 a 7,6 lotes por ano. Se esse número de
lotes for o de SP, o produto g × ST está certo e só a separação entre massa
fresca e ST é diferente. Vale escrever isso no artigo, porque um leitor que
compare o ST de 25 % com a literatura vai estranhar.

Pergunta: qual é o número de lotes por ano usado (ou implícito) no CP2b?
Lembrete: parte da matéria seca é maravalha (0,7 kg por ave, tier A), que tem
BMP mais baixo que o dejeto.

## O que a literatura sustenta

- Poedeiras: dejeto fresco de 0,035–0,041 t/ave/ano contra a mediana de 0,050
  do CP2b; ST e SV dentro da faixa. A literatura fica perto do mínimo do CP2b.
- BMP da torta de filtro: o único registro tier A (262 NmL/g SV) cai dentro de
  200–380, perto da mediana de 280.
- BMP da casca de café: quatro registros tier A, todos dentro de 120–220.

## Para depois da submissão

- Bagaço: dois de três BMP brutos acima do máximo de 220 (326 e 273, tier B e
  C). Ainda é pouco para mexer.
- Vinhaça: Freitas 2023 (tier A, SP) dá 494 NmL/g SV, contra 90–200 no
  feedstocks.yaml da plataforma. O CP2b calcula por m³ de etanol e não é
  afetado. A faixa do yaml é que precisa de revisão.
- Bovino de pasto: o inventário nacional dá 24 kg/dia, 2,4 vezes o g do CP2b.
  Como o FC do pasto é 0, isso muda só o N1.
- Suínos: o registro só tem volume de chorume, sem ST. Falta um dado de
  excreta fresca com ST para comparar com o override de 8–12 %.
- Lacunas no registro de BMP: nada sobre bovinos, suínos, aves, lodo ou RSU.
  Vale pedir à rotina Literature Watch que priorize esses substratos.

## O que esta nota não faz

Não altera o CP2b, o snapshot, a plataforma nem o artigo. Os scripts que
geram os relatórios são só leitura e rodam de novo a cada versão do registro.
