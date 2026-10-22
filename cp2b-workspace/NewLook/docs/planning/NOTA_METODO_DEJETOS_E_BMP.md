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
- `analysis/outputs/evidencia_fde/RELATORIO.md`: 41 registros de FC, FCo, FS e
  FL, lidos pela definição de cada fonte; 14 têm a definição do CP2b.
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

O registro de fatores ajuda a ler o FC de 0,5. Em SP, 0,36 % dos sistemas de
leite são confinados, 5,5 % intensivos a pasto, 19 % semiextensivos e 75 %
extensivos (inventário MCTI 2015, tier A). Numa fazenda da Embrapa em São
Carlos as vacas ficam no cocho de maio a outubro, metade do ano (tier B). Um
FC de 0,5 sobre todas as vacas ordenhadas pede coleta grande fora do
confinamento. Vale dizer no artigo de onde vem esse 0,5.

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

### 4. Definições de FS e FCo que o texto precisa fixar

- FS: a DEC-013 diz que o FS é massa retida após perda documentada, nunca dias
  de oferta / 365. O `DECISOES_METODOLOGICAS.md` ainda descreve o FS como
  "disponibilidade sazonal relativa à geração anual". Oito registros do
  Literature Watch dão FS como fração do ano (dias de cocho, safra de cana,
  café e laranja); um revisor que os conheça vai cobrar. Sugestão: uma frase
  nos Métodos dizendo que a sazonalidade pesa no dimensionamento da planta,
  não no potencial anual.
- FCo das aves: o CP2b usa 0,95 porque adubo é compatível com a digestão. O
  inventário MCTI 2015 diz que cerca de 80 % do esterco de aves já vai para
  adubo; quem ler o FCo como "fração não usada como adubo" chega a 0,2. A
  cama de frango tem preço de mercado como adubo (R$ 145–236/t, SC, 2010), o
  que torna o uso concorrente econômico. Vale uma frase no artigo.
- Confinado: os dias de cocho (68 a 151 por ciclo, conforme a categoria e o
  confinamento) não se aplicam, porque a
  base do CP2b é o estoque confinado do GEDAVE, não os animais que passam pelo
  cocho no ano. Vale deixar isso explícito para não parecer esquecimento.

### 5. Bagaço de laranja: quase todo já vira ração

O CP2b usa FCo de 0,25 (0,15–0,40), ou seja, 75 % do bagaço de laranja vai
para polpa peletizada, pectina e d-limoneno. A Visão Agrícola (ESALQ, 2004,
tier B) diz que o resíduo, 50 % do peso da fruta, vira polpa cítrica
peletizada para ração, com sobra de 0 a 5 %. Com 0,02 no lugar de 0,25, o
bagaço de laranja cai a cerca de 1/12 do que o CP2b conta hoje.

Pergunta: de onde vem o 0,25? Se houver dado das fábricas de suco de SP sobre
a fração que não vai para a peletização, ele resolve. Se não, a fonte de 2004
é antiga, mas é a única no registro.

## O que a literatura sustenta

- Poedeiras: dejeto fresco de 0,035–0,041 t/ave/ano contra a mediana de 0,050
  do CP2b; ST e SV dentro da faixa. A literatura fica perto do mínimo do CP2b.
- BMP da torta de filtro: o único registro tier A (262 NmL/g SV) cai dentro de
  200–380, perto da mediana de 280.
- BMP da casca de café: quatro registros tier A, todos dentro de 120–220.
- FC dos suínos: a eficiência de coleta de 90 % usada no Paraná (tier C) fica
  dentro de 0,70–0,95. O termo de coleta 0,90 das aves é o mesmo da fonte.
- FCo da vinhaça e dos suínos: 0,95 e 0,99 de unidades sem digestão, dentro de
  0,90–1,00.
- Palhas: o CP2b deixa no FC a palha que fica no solo (cana 0,40, milho 0,40,
  soja 0,30). A fração removível da literatura, comparada com FC × FCo, cai
  dentro ou se sobrepõe à faixa do CP2b: cana 0,27–0,5 contra 0,28–0,47;
  milho 0,12–0,5 contra 0,21–0,50; soja até 0,25 contra 0,18–0,40.
- FCo da casca de café: 0,5 (uso como adubo e combustível de secador), dentro
  de 0,50–0,70.

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
- FC do confinado: a mesma eficiência de 90 % fica acima do máximo de 0,75
  do CP2b. É tier C e vale para todos os rebanhos; não basta para mexer.
- Palha de cana: a decomposição no solo deixa 0,67 da massa aos 36 dias e
  0,31 ao fim de um ano (Embrapa, tier B), contra o FS de 0,92 do CP2b. O
  número depende de quanto tempo a palha fica no campo antes do enfardamento;
  vale registrar a premissa. O FCo da palha (0,90, queima em caldeira e 2G)
  continua sem fonte quantitativa para SP; o registro não fecha essa lacuna.
- Lacunas no registro de BMP: nada sobre bovinos, suínos, aves, lodo ou RSU.
  Vale pedir à rotina Literature Watch que priorize esses substratos.

## O que esta nota não faz

Não altera o CP2b, o snapshot, a plataforma nem o artigo. Os scripts que
geram os relatórios são só leitura e rodam de novo a cada versão do registro.
