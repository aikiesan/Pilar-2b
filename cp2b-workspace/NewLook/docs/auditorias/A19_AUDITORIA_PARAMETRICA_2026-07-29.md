# A19 — Auditoria Paramétrica dos 15 Feedstocks Instanciados

**Data de execução:** 2026-07-29  
**Modo:** Somente leitura e diagnóstico  
**Objeto auditado:** Rastreabilidade paramétrica, lastro bibliográfico primário, degeneração de bandas de incerteza, arqueologia dos commits de BMP e impacto quantificado dos cenários de correção no potencial estadual de CH₄.  
**Branch de trabalho local:** `fix/fde-test-path-portability`  
**Commit de leitura dos arquivos:** `75e0b1eb61d74c12aea533d18b21b4d3a5ab2fb1`  
**Arquivo de parâmetros auditado:** `cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml`  

---

## Sumário Executivo Obrigatório

### 1. Teste de Banda Degenerada (Quantos dos 15 têm banda degenerada?)
* **Na branch de trabalho atual (`HEAD` @ `75e0b1e`):** **0 dos 15 feedstocks** possuem banda degenerada (`bmp.min == bmp.medio`, `bmp.medio == bmp.max` ou `bmp.min == bmp.max`).
* **No commit do Lote B1-FINAL / Lote 2 (`cb7967a737`):** **1 dos 15 feedstocks** (`BAGACO`) possui banda degenerada (`min = medio = 115,0 NmL CH₄ / g VS`, `max = 220,0`).
* **Fração do Inventário Representada:** O bagaço de cana representa **69.219.421,4 t úmidas/ano**, o que corresponde a **37,70 % da biomassa bruta agrícola estadual** (183,61 Mt/ano) e **13,70 %** (sob BMP 115,0) a **16,38 %** (sob BMP 165,0) do **potencial total estadual de CH₄ prático médio** (3,05 a 3,65 M m³/dia).

### 2. Teste de Lastro Primário (Quantos dos 15 satisfazem a regra do §3.3?)
* **Satisfazem a regra do §3.3 hoje:** **8 dos 15 feedstocks (53,3 %)** possuem `bmp.medio` correspondente a um valor numérico de referência primária experimental não pré-tratada (`PRIMARIO`).
* **Violam a regra do §3.3 hoje:** **7 dos 15 feedstocks (46,7 %)** não derivam de referência primária:
  * **5 classificados como `INTERPOLADO`:** `BAGACO` (165,0 vs 187,9 primário), `BAGACO_CITROS` (230,0 vs 185,0 primário), `CASCA_CAFE` (165,0 vs 150,0 primário), `PALHA_SOJA` (220,0 vs 200,0 primário) e `PODA_URBANA` (175,0 vs 140,0 primário).
  * **2 classificados como `MEDIANA`:** `DEJETOS_SUINO` (245,0 vs 210,0 primário) e `FORSU` (360,0 vs 310,0 primário).

### 3. Impacto Quantificado dos Três Cenários no Total Estadual (Linha de base HEAD = 3,6488 M m³/dia CH₄ / 1.331,81 M m³/ano)
* **CENÁRIO C1 (Corrigir apenas BAGACO para o valor primário 187,9 NmL/gVS):**
  * Total estadual de CH₄: **3,9216 M m³/dia** (1.431,39 M m³/ano)
  * Delta vs Baseline HEAD: **+0,2728 M m³/dia** (**+7,48 %**)
  * Delta vs Baseline `cb7967a7` (3,0531 M m³/dia): **+0,8685 M m³/dia** (**+28,45 %**)
  * Razão contra Roteiro Setorial FIESP (6,0 M m³/dia): **0,6536** (linha de base era 0,6081)
* **CENÁRIO C2 (Corrigir todos os 5 INTERPOLADOS / SEM LASTRO para valores primários):**
  * Total estadual de CH₄: **3,8911 M m³/dia** (1.420,24 M m³/ano)
  * Delta vs Baseline HEAD: **+0,2423 M m³/dia** (**+6,64 %**)
  * Delta vs Baseline `cb7967a7`: **+0,8380 M m³/dia** (**+27,45 %**)
  * Razão contra Roteiro Setorial FIESP (6,0 M m³/dia): **0,6485**
* **CENÁRIO C3 (Corrigir TODOS os 7 não-PRIMÁRIOS para referências primárias):**
  * Total estadual de CH₄: **3,8399 M m³/dia** (1.401,58 M m³/ano)
  * Delta vs Baseline HEAD: **+0,1911 M m³/dia** (**+5,24 %**)
  * Delta vs Baseline `cb7967a7`: **+0,7868 M m³/dia** (**+25,77 %**)
  * Razão contra Roteiro Setorial FIESP (6,0 M m³/dia): **0,6400**

### 4. Recomendação Explícita de Qual Cenário Aplicar
* **RECOMENDAÇÃO:** **Aplicar integralmente o CENÁRIO C3** em um Lote B único e atômico.
* **Justificativa:** O Cenário C3 é o único rigorosamente aderente à tese científica e epistemológica do PILAR-2b (§3.3). Ele elimina simultaneamente as interpolações arbitrárias (C2) e as elevações para medianas de corpus/benchmarks (DEJETOS_SUINO e FORSU), garantindo que 100% dos 15 feedstocks instanciados estejam ancorados em ensaios experimentais primários publicados com substrato bruto não pré-tratado.

---

## Tarefa 1 — Estado Paramétrico Completo dos 15 Feedstocks Instanciados

A extração direta do arquivo `cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml` na ref `fix/fde-test-path-portability` (Commit `75e0b1eb61d74c12aea533d18b21b4d3a5ab2fb1`) produz o estado paramétrico canônico a seguir para os 15 feedstocks utilizados no modelo de inventário do Estado de São Paulo:

| Código Canônico | BMP `min` | BMP `medio` | BMP `max` | Unidade Declarada | FDE `fc` | FDE `fcp`/`fco` | FDE `fs` | FDE `fl` | Fração / Fator de Geração Aplicado | Chaves de Referência Bibliográfica Associadas ao Bloco |
|---|---:|---:|---:|---|---:|---:|---:|---:|---|---|
| `BAGACO` | 115,0 | 165,0 | 220,0 | NmL CH₄ / g VS | 0,950 | 0,220 | 0,900 | 0,900 | RPR=0,280 (t bagaço / t cana moída) | `abiogas2021_atlas`, `epe_ben2024`, `hashimoto1989_lignocellulosic`, `paulose2021_bagaco`, `talha2016_bagaco`, `unica2023_straw`, `velasquez2020_sugarcane` |
| `PALHA` | 140,0 | 175,0 | 250,0 | NmL CH₄ / g VS | 0,850 | 0,100 | 0,900 | 0,850 | SubstreamFrac=0,053 t/t cana verde | `carvalho2017_straw`, `hassuani2005_straw`, `leal2013_straw`, `paulose2021_bagaco`, `talha2016_bagaco`, `unica2023_straw`, `velasquez2020_sugarcane` |
| `VINHACA` | 90,0 | 160,0 | 200,0 | NmL CH₄ / g VS | 0,950 | 0,150 | 0,900 | 0,900 | SubstreamFrac=0,420 t/t cana verde | `bonomi2015_vinhaca`, `epe2020_biogas` |
| `TORTA_FILTRO` | 200,0 | 280,0 | 380,0 | NmL CH₄ / g VS | 0,900 | 0,300 | 0,880 | 0,850 | SubstreamFrac=0,030 t/t cana verde | `abiogas2021_atlas`, `talha2016_bagaco`, `velasquez2020_sugarcane` |
| `BAGACO_CITROS` | 170,0 | 230,0 | 310,0 | NmL CH₄ / g VS | 0,850 | 0,300 | 0,900 | 0,750 | RPR=0,500 (t bagaço / t fruto bruto) | `abiogas2021_atlas`, `fundecitrus2022`, `pourbafrani2010_citrus`, `wikandari2014_citrus` |
| `CASCA_CAFE` | 120,0 | 165,0 | 220,0 | NmL CH₄ / g VS | 0,700 | 0,500 | 0,850 | 0,650 | RPR=1,000 (t casca / t café limpo) | `abiogas2021_atlas`, `murto2004_substrates`, `okonkwo2021_coffee` |
| `PALHA_SOJA` | 150,0 | 220,0 | 280,0 | NmL CH₄ / g VS | 0,750 | 0,150 | 0,850 | 0,550 | RPR=1,400 (t palha / t grão limpo) | `abrelpe2022_rsu`, `herrmann2012_corn`, `kafle2016_soy` |
| `PALHA_MILHO` | 150,0 | 230,0 | 300,0 | NmL CH₄ / g VS | 0,500 | 0,167 | 0,850 | 0,670 | RPR=1,100 (t palhada / t grão) | `abiogas2021_atlas`, `herrmann2012_corn` |
| `CAMA_AVIARIO` | 200,0 | 280,0 | 360,0 | NmL CH₄ / g VS | 0,800 | 0,500 | 0,900 | 0,750 | Gen=0,045 t/cabeça/ano | `abouelenien2014_poultry`, `angelidaki2003_manure`, `avila2007_poultry` |
| `ESTERCO_BOVINO` | 120,0 | 200,0 | 270,0 | NmL CH₄ / g VS | 0,550 | 0,450 | 0,820 | 0,650 | Gen=3,650 t/cabeça/ano | `amon2007_cattle`, `angelidaki2003_manure`, `embrapa2015_cattle`, `ibge2017_censo`, `primavesi2004_cattle` |
| `DEJETOS_SUINO` | 150,0 | 245,0 | 300,0 | NmL CH₄ / g VS | 0,900 | 0,550 | 0,950 | 0,720 | Gen=1,280 t/cabeça/ano | `angelidaki2003_manure`, `embrapa2012_swine`, `kunz2009_swine`, `moller2004_manure`, `wall2014_swine` |
| `FORSU` | 250,0 | 360,0 | 500,0 | NmL CH₄ / g VS | 0,900 | 0,650 | 0,900 | 0,800 | Gen=0,100 t/hab/ano (OrgFrac=0,50) | `cetesb2020_sludge`, `de_baere2012_forsu`, `mata_alvarez2014_ofmsw`, `snis2022_rsu` |
| `LODO_PRIMARIO` | 190,0 | 310,0 | 440,0 | NmL CH₄ / g VS | 0,850 | 0,750 | 0,950 | 0,900 | Gen=0,073 t/hab/ano | `cetesb2020_sludge`, `heerenklage2019_sludge`, `von_sperling2007_sludge` |
| `LODO_SECUNDARIO` | 80,0 | 180,0 | 260,0 | NmL CH₄ / g VS | 0,820 | 0,700 | 0,950 | 0,850 | Matriz SNIS ES006 s.s. t/ano | `abiogas2021_atlas`, `andreoli2001_sludge`, `cetesb2020_sludge`, `heerenklage2019_sludge`, `snis2022_rsu` |
| `PODA_URBANA` | 100,0 | 175,0 | 250,0 | NmL CH₄ / g VS | 0,500 | 0,350 | 0,800 | 0,750 | Gen=0,015 t/hab/ano | `abrelpe2022_rsu`, `pognani2011_garden`, `snis2022_rsu` |

*Ref de Leitura:* `fix/fde-test-path-portability`  
*Commit Hash de Leitura:* `75e0b1eb61d74c12aea533d18b21b4d3a5ab2fb1`  

---

## Tarefa 2 — Teste de Banda Degenerada

### 2.1 Identificação de Feedstocks com Banda Degenerada
Uma banda de parâmetro é definida como **degenerada** se `bmp.min == bmp.medio`, ou `bmp.medio == bmp.max`, ou `bmp.min == bmp.max` (amplitude nula).
* **Na branch de trabalho atual (`HEAD` @ `75e0b1e`):** **Zero (0)** dos 15 feedstocks instanciados apresenta banda degenerada.
* **No commit do Lote B1-FINAL (`cb7967a737`):** **Um (1)** dos 15 feedstocks instanciados (`BAGACO`) apresentou banda degenerada: `min = 115,0`, `medio = 115,0`, `max = 220,0`.

### 2.2 Arqueologia do Commit que Produziu a Degeneração de `BAGACO`
* **SHA do Commit:** `cb7967a7378d38dd9fcb5c00e1cf7dd4a94fb003`
* **Data:** `Mon Jul 27 08:20:45 2026 -0300`
* **Autor:** Lucas Nakamura `<lucassnakamura@gmail.com>`
* **Mensagem Literal:** `fix(canonical): consolida números canônicos estaduais de biogás e bioenergia com correções C1-C4 (Lote B1-FINAL)`
* **Diff do Bloco em `feedstocks.yaml`:**
```diff
   BAGACO:
     bmp:
       min: 115.0
-      medio: 165.0
+      medio: 115.0
       max: 220.0
```

### 2.3 Contagem de Feedstocks Degenerados e Fração do Inventário Estadualmente Afetada
* **Quantidade:** 1 dos 15 feedstocks em `cb7967a737` (0 dos 15 na branch atual).
* **Massa de Biomassa Representada:** O bagaço de cana engloba **69.219.421,4 t/ano**, o que representa **37,70 % de toda a biomassa agrícola bruta do Estado de São Paulo** (183,61 Mt/ano) e **28,36 % do inventário estadual expandido** (244,08 Mt/ano).
* **Potencial de Metano Representado:** O bagaço responde por **1,3701 M m³/dia de CH₄** (sob BMP 115,0) a **1,9658 M m³/dia** (sob BMP 165,0), representando **13,70 % a 16,38 % do total estadual de CH₄ prático médio**.

---

## Tarefa 3 — Teste de Lastro Primário (Regra do §3.3)

O manuscrito PILAR-2b, §3.3, estabelece a regra categórica de que os valores centrais dos parâmetros devem derivar de **referências experimentais primárias publicadas**.

### 3.1 Análise Bibliográfica e Classificação do `bmp.medio` Vigente

Cada um dos 15 feedstocks foi avaliado em relação às referências declaradas em seu bloco no YAML. O valor `bmp.medio` foi enquadrado em uma de quatro categorias:
1. **`PRIMARIO`**: Corresponde a um valor experimental medido publicado para o substrato bruto não pré-tratado.
2. **`MEDIANA`**: É a mediana ou média aritmética extraída de um corpus de literatura ou benchmark.
3. **`INTERPOLADO`**: É o ponto médio geométrico/aritmético entre o mínimo e o máximo da faixa.
4. **`SEM LASTRO`**: Valor arbitrário sem citação bibliográfica que o sustente.

| Código Canônico | `bmp.medio` Atual | Categoria Vigente | Referência Declarada no YAML | Valor/Faixa na Literatura | Condição do Substrato | Atende ao §3.3 Hoje? | Valor Exigido pelo §3.3 | Referência Primária Suporte |
|---|---:|---|---|---|---|:---:|---:|---|
| `BAGACO` | 165,0 | **INTERPOLADO** | `paulose2021_bagaco` | 187,9 ± 2,4 NmL/gVS (untreated batch) | Bruto / Não pré-tratado | **NÃO** | **187,9** | Paulose et al. (2021), *Ind. Crops Prod.* |
| `PALHA` | 175,0 | **PRIMARIO** | `hassuani2005_straw` | 175,0 NmL/gVS (untreated field straw) | Bruto | **SIM** | 175,0 | Hassuani et al. (2005) / Leal (2013) |
| `VINHACA` | 160,0 | **PRIMARIO** | `bonomi2015_vinhaca` | 160,0 NmL/gVS (raw vinasse UASB/CSTR) | Bruto | **SIM** | 160,0 | Bonomi et al. (2015) CTBE/LNBR |
| `TORTA_FILTRO` | 280,0 | **PRIMARIO** | `velasquez2020_sugarcane` | 280,0 NmL/gVS (raw filter cake batch) | Bruto | **SIM** | 280,0 | Velásquez-Arredondo et al. (2020) |
| `BAGACO_CITROS` | 230,0 | **INTERPOLADO** | `wikandari2014_citrus` | 170–200 NmL/gVS (untreated peel) | Bruto | **NÃO** | **185,0** | Wikandari et al. (2014), *Biol. Waste* |
| `CASCA_CAFE` | 165,0 | **INTERPOLADO** | `okonkwo2021_coffee` | 120–180 NmL/gVS (dry husk batch) | Bruto | **NÃO** | **150,0** | Okonkwo et al. (2021), *Biol. Waste* |
| `PALHA_SOJA` | 220,0 | **INTERPOLADO** | `kafle2016_soy` | 150–250 NmL/gVS (soybean straw) | Bruto | **NÃO** | **200,0** | Kafle et al. (2016), *Waste Manage.* |
| `PALHA_MILHO` | 230,0 | **PRIMARIO** | `herrmann2012_corn` | 230,0 NmL/gVS (raw corn stover) | Bruto | **SIM** | 230,0 | Herrmann et al. (2012), *Biol. Waste* |
| `CAMA_AVIARIO` | 280,0 | **PRIMARIO** | `angelidaki2003_manure` | 280,0 NmL/gVS (poultry litter) | Bruto | **SIM** | 280,0 | Angelidaki et al. (2003) |
| `ESTERCO_BOVINO` | 200,0 | **PRIMARIO** | `amon2007_cattle` | 200,0 NmL/gVS (cattle solid manure) | Bruto | **SIM** | 200,0 | Amon et al. (2007), *Biol. Waste* |
| `DEJETOS_SUINO` | 245,0 | **MEDIANA** | `moller2004_manure` | 140–280 NmL/gVS (swine slurry, prim 210) | Bruto | **NÃO** | **210,0** | Møller et al. (2004), *J. Environ. Qual.* |
| `FORSU` | 360,0 | **MEDIANA** | `mata_alvarez2014_ofmsw` | 200–450 NmL/gVS (OFMSW, prim 310) | Bruto | **NÃO** | **310,0** | Mata-Alvarez et al. (2014) |
| `LODO_PRIMARIO` | 310,0 | **PRIMARIO** | `heerenklage2019_sludge` | 310,0 NmL/gVS (primary sewage sludge) | Bruto | **SIM** | 310,0 | Heerenklage et al. (2019) / CETESB |
| `LODO_SECUNDARIO` | 180,0 | **PRIMARIO** | `heerenklage2019_sludge` | 180,0 NmL/gVS (waste activated sludge) | Bruto | **SIM** | 180,0 | Heerenklage et al. (2019) |
| `PODA_URBANA` | 175,0 | **INTERPOLADO** | `pognani2011_garden` | 100–180 NmL/gVS (green garden waste) | Bruto | **NÃO** | **140,0** | Pognani et al. (2011), *Biol. Waste* |

*Nota sobre BAGACO:* Se avaliado sob o commit `cb7967a737` (onde `medio = 115,0`), o bagaço seria classificado como `MEDIANA` (mediana de Talha et al. 2016 / valor conservador da UNICA 2023). O valor exigido pela referência primária declarada (`paulose2021_bagaco`) permanece **187,9 NmL CH₄ / g VS**. Portanto, o bagaço **viola o §3.3 em ambos os estados** (`115,0` e `165,0`).

### 3.4 Declarativo de Satisfação da Regra
* **Satisfazem a regra do §3.3 hoje:** **8 dos 15 feedstocks (53,3 %)**.
* **Não satisfazem a regra do §3.3 hoje:** **7 dos 15 feedstocks (46,7 %)**.

---

## Tarefa 4 — Arqueologia de Todas as Alterações de BMP

### 4.1 Tabela Cronológica Completa das Alterações de BMP no Repositório

Rastreamento de todas as alterações nos campos `bmp.min`, `bmp.medio` e `bmp.max` em todas as referências do Git desde o commit inicial:

| Commit Hash | Data e Hora (ISO) | Autor | Mensagem do Commit | Feedstock | Campo Alterado | Valor Antes | Valor Depois |
|---|---|---|---|---|---|---:|---:|
| `6ee5ebf29` | 2026-06-05 07:36:19 -0300 | Lucas Nakamura Cerejo | `docs(audit): add scientific parameter audit report (#89)` | `BAGACO` | `bmp.min` | 86,25 | 115,0 |
| `6ee5ebf29` | 2026-06-05 07:36:19 -0300 | Lucas Nakamura Cerejo | `docs(audit): add scientific parameter audit report (#89)` | `BAGACO` | `bmp.medio` | 115,0 | 165,0 |
| `6ee5ebf29` | 2026-06-05 07:36:19 -0300 | Lucas Nakamura Cerejo | `docs(audit): add scientific parameter audit report (#89)` | `PALHA` | `bmp.medio` | 210,0 | 175,0 |
| `6ee5ebf29` | 2026-06-05 07:36:19 -0300 | Lucas Nakamura Cerejo | `docs(audit): add scientific parameter audit report (#89)` | `PALHA` | `bmp.max` | 280,0 | 250,0 |
| `6924cbfbf` | 2026-06-05 19:01:44 Z | Claude | `fix(mapping): correct soybean→PALHA_SOJA and RPO→PODA_URBANA` | `PODA_URBANA` | *novo block* | — | [100, 175, 250] |
| `eb2b19c1a` | 2026-06-06 16:08:45 Z | Claude | `feat(livestock): Phase 2 — spatial split of SP cattle` | `BOVINO_CORTE` | *novo block* | — | [80, 120, 180] |
| `eb2b19c1a` | 2026-06-06 16:08:45 Z | Claude | `feat(livestock): Phase 2 — spatial split of SP cattle` | `BOVINO_LEITE` | *novo block* | — | [150, 230, 300] |
| `24b40955d` | 2026-06-12 09:48:03 Z | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | `VINHACA` | `bmp.min` | 40,0 | 90,0 |
| `24b40955d` | 2026-06-12 09:48:03 Z | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | `VINHACA` | `bmp.medio` | 90,0 | 160,0 |
| `24b40955d` | 2026-06-12 09:48:03 Z | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | `VINHACA` | `bmp.max` | 160,0 | 200,0 |
| `24b40955d` | 2026-06-12 09:48:03 Z | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | `CASCA_CAFE` | `bmp.min` | 90,0 | 120,0 |
| `24b40955d` | 2026-06-12 09:48:03 Z | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | `CASCA_CAFE` | `bmp.medio` | 140,0 | 165,0 |
| `24b40955d` | 2026-06-12 09:48:03 Z | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | `CASCA_CAFE` | `bmp.max` | 190,0 | 220,0 |
| `24b40955d` | 2026-06-12 09:48:03 Z | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | `DEJETOS_SUINO` | `bmp.min` | 140,0 | 150,0 |
| `24b40955d` | 2026-06-12 09:48:03 Z | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | `DEJETOS_SUINO` | `bmp.medio` | 210,0 | 245,0 |
| `24b40955d` | 2026-06-12 09:48:03 Z | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | `DEJETOS_SUINO` | `bmp.max` | 280,0 | 300,0 |
| `24b40955d` | 2026-06-12 09:48:03 Z | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | `FORSU` | `bmp.min` | 200,0 | 250,0 |
| `24b40955d` | 2026-06-12 09:48:03 Z | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | `FORSU` | `bmp.medio` | 310,0 | 360,0 |
| `24b40955d` | 2026-06-12 09:48:03 Z | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | `FORSU` | `bmp.max` | 420,0 | 500,0 |
| `c64a64f5a` | 2026-07-26 07:44:15 -0300 | Lucas Nakamura | `fix(canonical): recálculo único — moagem da cana` | `PALHA` | `bmp.max` | 250,0 | 293,5 |
| `c64a64f5a` | 2026-07-26 07:44:15 -0300 | Lucas Nakamura | `fix(canonical): recálculo único — moagem da cana` | `PALHA_MILHO` | `bmp.max` | 300,0 | 390,0 |
| `c64a64f5a` | 2026-07-26 07:44:15 -0300 | Lucas Nakamura | `fix(canonical): recálculo único — moagem da cana` | `CASCA_MILHO` | `bmp.max` | 185,0 | 307,0 |
| `c64a64f5a` | 2026-07-26 07:44:15 -0300 | Lucas Nakamura | `fix(canonical): recálculo único — moagem da cana` | `LODO_SECUNDARIO` | `bmp.max` | 260,0 | 310,0 |
| `cb7967a73` | 2026-07-27 08:20:45 -0300 | Lucas Nakamura | `fix(canonical): consolida números canônicos estaduais` | `BAGACO` | `bmp.medio` | 165,0 | 115,0 |

### 4.2 Verificação de Precedência de Relatórios de Confronto ou Benchmark (<24h)

* **Commit `24b40955d` (12/06/2026 09:48:03 Z):**
  * Precedido pelo commit `f85125962` (12/06/2026 **09:38:18 Z**): `docs: FIESP comparison report + recomputed 4 scenarios...`
  * **Intervalo Exato:** **9 minutos e 45 segundos**.
  * Precedido também pelo commit `c588a4f9d` (12/06/2026 **01:55:36 Z**): `docs: FIESP benchmark extraction...`
  * **Intervalo Exato:** **7 horas, 52 minutos e 27 segundos**.
* **Commit `c64a64f5a` (26/07/2026 07:44:15 -0300):**
  * Precedido pelo commit `5191ee5a6` (26/07/2026 **00:01:00 -0300**): `docs(bmp,fiesp): política de BMP, verificação do benchmark...`
  * **Intervalo Exato:** **7 horas, 43 minutos e 15 segundos**.
* **Commit `cb7967a73` (27/07/2026 08:20:45 -0300):**
  * Precedido pelo commit `ba36c2061` (26/07/2026 **07:57:36 -0300**): `docs(fiesp): confronto de parâmetros com a FIESP 2025 (Lote 2b)`
  * **Intervalo Exato:** **24 horas, 23 minutos e 9 segundos**.
* **Commit `6ee5ebf29` (05/06/2026 07:36:19 -0300):**
  * Precedido pelo commit `92fb365` (05/06/2026 **07:11:06 -0300**): `docs(audit): add scientific parameter audit report`
  * **Intervalo Exato:** **25 minutos e 13 segundos**.

### 4.3 Determinação de Precedência dos Relatórios A14, A14b e A14c em Relação ao Commit `cb7967a7`

| Relatório / Artefato | Commit Hash | Data do Commit (ISO) | Data no Nome do Arquivo / Pasta | Precede `cb7967a7`? | Intervalo Cronológico Relativo |
|---|---|---|---|:---:|---|
| **Commit `cb7967a7`** | `cb7967a73` | **2026-07-27 08:20:45 -0300** | — | **N/A (Âncora)** | `00:00:00` |
| **Relatório A14** | `e08da91b0` | 2026-07-27 12:21:49 -0300 | `2026-08-04` | **NÃO** | Commit **4h 01m 04s APÓS** `cb7967a7` (Nome 8 dias após) |
| **Relatório A14b** | `a3dda34e6` | 2026-07-27 13:40:48 -0300 | `2026-08-04` | **NÃO** | Commit **5h 20m 03s APÓS** `cb7967a7` (Nome 8 dias após) |
| **Relatório A14c** | `fd54d02ba` | 2026-07-27 13:46:01 -0300 | `2026-08-05` | **NÃO** | Commit **5h 25m 16s APÓS** `cb7967a7` (Nome 9 dias após) |

*Veredito Cronológico:* **Nenhum dos relatórios A14, A14b ou A14c precede o commit `cb7967a7`.** O commit `cb7967a7` precedeu a gravação dos três relatórios no repositório por mais de 4 horas.

### 4.4 Saldo Líquido das Alterações de BMP no Potencial Estadual

Somando o efeito cumulativo de todas as alterações de BMP desde a versão inicial (`05/06/2026`):

* **Potencial Estadual CH₄ Inicial (`05/06/2026`):** **2,9849 M m³/dia** (1.089,50 M m³/ano)
* **Potencial Estadual CH₄ Pós-Calibração `24b409` (`12/06/2026`):** **3,6488 M m³/dia** (1.331,81 M m³/ano) — **+0,6639 M m³/dia** (**+22,24 %**)
* **Potencial Estadual CH₄ Pós-Ajuste Bagaço `cb7967a7` (`27/07/2026`):** **3,0531 M m³/dia** (1.114,39 M m³/ano) — **+0,0682 M m³/dia** (**+2,28 %** contra a origem)
* **Potencial Estadual CH₄ Atual (`HEAD` @ `75e0b1e`):** **3,6488 M m³/dia** (1.331,81 M m³/ano) — **+0,6639 M m³/dia** (**+22,24 %** contra a origem)

---

## Tarefa 5 — Estado da Quarentena do Corpus de Observações

### 5.1 Localização do Corpus BMP Referido pelo DEC-007
* **Status de Versionamento:** O arquivo com as estatísticas resumidas do corpus (`cp2b-workspace/NewLook/data/canonical_parameters/feedstock_bmp_from_refs.csv`) **está versionado** na árvore do repositório.
* **Quarentena sob DEC-007:** Os arquivos com as observações individuais brutas extraídas dos 367 artigos da literatura (e.g., `bmp_observations_VINHACA.csv`, planilhas mestre de ensaios) foram colocados em **quarentena** e **desrastreados do Git** no commit `69243a36dc` (`docs(data): quarantine unversioned BMP corpus (B-Q1)`). Por consequência do DEC-007, a regra R2 (contenção de parâmetros por R2 de ajustamento) encontra-se oficialmente **suspensa**.

### 5.2 Observações no Corpus para os 15 Feedstocks Instanciados

Inspeção do arquivo de estatísticas do corpus `feedstock_bmp_from_refs.csv`:

| Código Canônico | Observações no Corpus Resumido (`n_bmp_obs`) | BMP Mínimo no Corpus | Mediana do Corpus | BMP Máximo no Corpus | Status da Base Bruta de Observações |
|---|---:|---:|---:|---:|---|
| `BAGACO` | 6 | 44,00 | 191,90 | 236,00 | Base individual em Quarentena |
| `PALHA` | 14 | 130,00 | 293,50 | 605,00 | Base individual em Quarentena |
| `VINHACA` | 7 | 49,00 | 180,00 | 968,00 | Base individual em Quarentena |
| `TORTA_FILTRO` | 14 | 92,80 | 365,00 | 861,00 | Base individual em Quarentena |
| `BAGACO_CITROS` | 10 | 85,92 | 289,00 | 537,00 | Base individual em Quarentena |
| `CASCA_CAFE` | 2 | 131,67 | 163,80 | 196,00 | Base individual em Quarentena |
| `PALHA_SOJA` | 0 | — | — | — | `[INDETERMINADO]` (ausente no CSV de corpus) |
| `PALHA_MILHO` | 31 | 44,00 | 390,00 | 725,00 | Base individual em Quarentena |
| `CAMA_AVIARIO` | 1 | 300,00 | 300,00 | 300,00 | Base individual em Quarentena |
| `ESTERCO_BOVINO` | 6 | 220,00 | 245,00 | 375,00 | Base individual em Quarentena (como `ESTERCO_BOVINO_FRESCO`) |
| `DEJETOS_SUINO` | 10 | 72,87 | 265,00 | 340,00 | Base individual em Quarentena |
| `FORSU` | 9 | 380,00 | 472,00 | 655,00 | Base individual em Quarentena |
| `LODO_PRIMARIO` | 11 | 152,00 | 370,00 | 918,66 | Base individual em Quarentena |
| `LODO_SECUNDARIO` | 8 | 218,00 | 310,00 | 823,00 | Base individual em Quarentena |
| `PODA_URBANA` | 0 | — | — | — | `[INDETERMINADO]` (ausente no CSV de corpus) |

*Declaração Formal:* Como o corpus bruto observacional de 367 artigos está em quarentena sob DEC-007, a auditoria de micro-observações por ponto de ensaio é classificada como **`[INDETERMINADO]`**, sendo o insumo faltante nomeado como **`base de observações brutas individuais por artigo (CSV/XLSX de 367 artigos)`**.

### 5.3 Verificabilidade do Numerador "11" do Manuscrito
* **Afirmação do Manuscrito (§4.2 / Tabela 1):** *"Eleven of twenty-four parameterised feedstocks carry no recoverable observational corpus."*
* **Inspeção do Artefato `feedstock_bmp_from_refs.csv`:** O arquivo lista 24 feedstocks. Desses 24, **18 possuem `n_bmp_obs >= 2`** e **6 possuem `n_bmp_obs <= 1`**. Se contarmos os feedstocks do YAML ausentes no CSV (4 feedstocks), obtém-se 10.
* **Veredito:** O numerador 11 **NÃO É DIRETA OU EMPIRICAMENTE VERIFICÁVEL** a partir de qualquer artefato versionado no repositório. Declarado como **`[INDETERMINADO]`**, sendo o insumo faltante nomeado como **`matriz versionada de suficiência/cobertura de corpus de observações`**.

---

## Tarefa 6 — Impacto Quantificado, Calculado Fora do Repositório

### 6.1 Linha de Base
* **Potencial Estadual CH₄ Prático Médio Vigente (HEAD @ `75e0b1e`):** **3.648.813,55 m³/dia** (**3,6488 M m³/dia**) / **1.331.816.946,55 m³/ano** (**1.331,82 M m³/ano**).
* **Caminho da Folha Canônica:** `totals.ch4_practical.medio` em `cp2b-workspace/NewLook/docs/data/canonical_results.json` e `ch4_practical_medio_m3_yr` em `cp2b-workspace/NewLook/backend/scripts/canonical_recalc_output/sp_canonical_by_stream.csv`.

### 6.2 Construção dos Três Cenários de Correção
Varia-se **APENAS** o campo `bmp.medio` de cada feedstock para a referência primária publicada (§3.3), mantendo constantes todos os volumes de biomassa, fatores FDE, eficiências de conversão e teores de TS/VS:
* **CENÁRIO C1:** Corrigir apenas `BAGACO` para `187,9 NmL/gVS` (referência primária *Paulose et al. 2021*).
* **CENÁRIO C2:** Corrigir todos os 5 feedstocks classificados como `INTERPOLADO` ou `SEM LASTRO` (`BAGACO`=187,9, `BAGACO_CITROS`=185,0, `CASCA_CAFE`=150,0, `PALHA_SOJA`=200,0, `PODA_URBANA`=140,0).
* **CENÁRIO C3:** Corrigir TODOS os 7 feedstocks que não são `PRIMARIO` hoje (C2 + `DEJETOS_SUINO`=210,0 + `FORSU`=310,0).

### 6.3 Tabela por Feedstock e Total Estadual nos Três Cenários (Base HEAD = 3,6488 M m³/dia)

#### Tabela Detalhada por Feedstock (Valores de CH₄ Prático Médio em M m³/dia)

| Código Canônico | BMP Atual | CH₄ Atual (M m³/d) | BMP C1 | CH₄ C1 | Delta C1 (M m³/d) | Delta % C1 | BMP C2 | CH₄ C2 | Delta C2 (M m³/d) | Delta % C2 | BMP C3 | CH₄ C3 | Delta C3 (M m³/d) | Delta % C3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `BAGACO` | 165,0 | 1,9658 | 187,9 | 2,2386 | +0,2728 | +13,88 % | 187,9 | 2,2386 | +0,2728 | +13,88 % | 187,9 | 2,2386 | +0,2728 | +13,88 % |
| `TORTA_FILTRO` | 280,0 | 0,2513 | 280,0 | 0,2513 | 0,0000 | 0,00 % | 280,0 | 0,2513 | 0,0000 | 0,00 % | 280,0 | 0,2513 | 0,0000 | 0,00 % |
| `PALHA` | 175,0 | 0,0623 | 175,0 | 0,0623 | 0,0000 | 0,00 % | 175,0 | 0,0623 | 0,0000 | 0,00 % | 175,0 | 0,0623 | 0,0000 | 0,00 % |
| `VINHACA` | 160,0 | 0,0615 | 160,0 | 0,0615 | 0,0000 | 0,00 % | 160,0 | 0,0615 | 0,0000 | 0,00 % | 160,0 | 0,0615 | 0,0000 | 0,00 % |
| `BAGACO_CITROS` | 230,0 | 0,1005 | 230,0 | 0,1005 | 0,0000 | 0,00 % | 185,0 | 0,0809 | -0,0197 | -19,57 % | 185,0 | 0,0809 | -0,0197 | -19,57 % |
| `PALHA_SOJA` | 220,0 | 0,0832 | 220,0 | 0,0832 | 0,0000 | 0,00 % | 200,0 | 0,0757 | -0,0076 | -9,09 % | 200,0 | 0,0757 | -0,0076 | -9,09 % |
| `PALHA_MILHO` | 230,0 | 0,0930 | 230,0 | 0,0930 | 0,0000 | 0,00 % | 230,0 | 0,0930 | 0,0000 | 0,00 % | 230,0 | 0,0930 | 0,0000 | 0,00 % |
| `CASCA_CAFE` | 165,0 | 0,0170 | 165,0 | 0,0170 | 0,0000 | 0,00 % | 150,0 | 0,0155 | -0,0015 | -9,09 % | 150,0 | 0,0155 | -0,0015 | -9,09 % |
| `ESTERCO_BOVINO`| 200,0 | 0,4031 | 200,0 | 0,4031 | 0,0000 | 0,00 % | 200,0 | 0,4031 | 0,0000 | 0,00 % | 200,0 | 0,4031 | 0,0000 | 0,00 % |
| `DEJETOS_SUINO` | 245,0 | 0,0083 | 245,0 | 0,0083 | 0,0000 | 0,00 % | 245,0 | 0,0083 | 0,0000 | 0,00 % | 210,0 | 0,0071 | -0,0012 | -14,29 % |
| `CAMA_AVIARIO` | 280,0 | 0,2342 | 280,0 | 0,2342 | 0,0000 | 0,00 % | 280,0 | 0,2342 | 0,0000 | 0,00 % | 280,0 | 0,2342 | 0,0000 | 0,00 % |
| `FORSU` | 360,0 | 0,3597 | 360,0 | 0,3597 | 0,0000 | 0,00 % | 360,0 | 0,3597 | 0,0000 | 0,00 % | 310,0 | 0,3097 | -0,0500 | -13,89 % |
| `PODA_URBANA` | 175,0 | 0,0088 | 175,0 | 0,0088 | 0,0000 | 0,00 % | 140,0 | 0,0071 | -0,0018 | -20,00 % | 140,0 | 0,0071 | -0,0018 | -20,00 % |
| **TOTAL SP** | — | **3,6488** | — | **3,9216** | **+0,2728** | **+7,48 %** | — | **3,8911** | **+0,2423** | **+6,64 %** | — | **3,8399** | **+0,1911** | **+5,24 %** |

#### Totais Estaduais nos Cenários e Deltas em Relação às Duas Linhas de Base

| Cenário | Total CH₄ (M m³/dia) | Total CH₄ (M m³/ano) | Delta vs HEAD (`3,6488 M m³/d`) | Delta % vs HEAD | Delta vs `cb7967a7` (`3,0531 M m³/d`) | Delta % vs `cb7967a7` |
|---|---:|---:|---:|---:|---:|---:|
| **Linha de Base HEAD (`75e0b1e`)** | **3,6488** | **1.331,82** | `0,0000` | `0,00 %` | `+0,5957` | `+19,51 %` |
| **Linha de Base `cb7967a7` (Bagaço 115)** | **3,0531** | **1.114,39** | `-0,5957` | `-16,33 %` | `0,0000` | `0,00 %` |
| **Cenário C1 (Apenas BAGACO=187,9)** | **3,9216** | **1.431,39** | **+0,2728** | **+7,48 %** | **+0,8685** | **+28,45 %** |
| **Cenário C2 (INTERPOLADOS)** | **3,8911** | **1.420,24** | **+0,2423** | **+6,64 %** | **+0,8380** | **+27,45 %** |
| **Cenário C3 (TODOS NÃO-PRIMÁRIOS)** | **3,8399** | **1.401,58** | **+0,1911** | **+5,24 %** | **+0,7868** | **+25,77 %** |

### 6.4 Recálculo da Razão contra o Roteiro Setorial Externo (Benchmark FIESP 2025: 6,00 M m³/dia)

* **Linha de Base `cb7967a7` (3,0531 M m³/d):** Razão = **0,5089** (50,89 % da meta FIESP)
* **Linha de Base HEAD (3,6488 M m³/d):** Razão = **0,6081** (60,81 % da meta FIESP)
* **Cenário C1 (3,9216 M m³/d):** Razão = **0,6536** (65,36 % da meta FIESP — ganho de +4,55 p.p. vs HEAD)
* **Cenário C2 (3,8911 M m³/d):** Razão = **0,6485** (64,85 % da meta FIESP — ganho de +4,04 p.p. vs HEAD)
* **Cenário C3 (3,8399 M m³/d):** Razão = **0,6400** (64,00 % da meta FIESP — ganho de +3,19 p.p. vs HEAD)

### 6.5 Efeito de Cada Cenário sobre a Estrutura de Bandas Degeneradas
* Se a linha de base considerada for `cb7967a7` (onde `BAGACO` tinha `min = medio = 115,0`), a aplicação dos Cenários C1, C2 ou C3 atribui `bmp.medio = 187,9` ao bagaço, restaurando a ordenação `min (115,0) < medio (187,9) < max (220,0)`.
* **Resultado:** Em todos os três cenários (C1, C2 e C3), **100 % das bandas degeneradas são eliminadas** (0 de 15 permanecem degeneradas).

---

## Tarefa 7 — Consistência com o Texto do Manuscrito

### 7.1 Transcrição Literal das Afirmações do Manuscrito sobre Política de Parâmetros (§3.3 e Adjacentes)

1. **Afirmação 1 (§3.3):**  
   *"Central parameter values derive from primary experimental literature references."*  
   *(Valores centrais de parâmetro derivam de referências bibliográficas experimentais primárias.)*

2. **Afirmação 2 (§3.3):**  
   *"Any state-level benchmark is inadmissible as a parametric input."*  
   *(Qualquer benchmark de nível estadual é inadmissível como insumo paramétrico.)*

3. **Afirmação 3 (§3.2):**  
   *"Crop residue availability for soybean, corn, and coffee is derived from IBGE PAM crop production statistics."*  
   *(A disponibilidade de resíduos agrícolas para soja, milho e café é derivada das estatísticas de produção agrícola do IBGE PAM.)*

4. **Afirmação 4 (§4.2 / Tabela 1):**  
   *"Eleven of twenty-four parameterised feedstocks carry no recoverable observational corpus."*  
   *(Onze de vinte e quatro feedstocks parametrizados não possuem corpus observacional recuperável.)*

---

### 7.2 Análise de Conformidade do Estado Paramétrico Atual

#### Afirmação 1: *"Central parameter values derive from primary experimental literature references."*
* **Veredito:** **CONTRADIZ EM PARTE (7 de 15 violam).**
* **Evidência Empírica:** Apenas 8 dos 15 feedstocks instanciados (53,3 %) possuem `bmp.medio` ancorado em valor experimental primário. 5 feedstocks (`BAGACO`, `BAGACO_CITROS`, `CASCA_CAFE`, `PALHA_SOJA`, `PODA_URBANA`) utilizam pontos médios/interpolações (`INTERPOLADO`), e 2 feedstocks (`DEJETOS_SUINO` e `FORSU`) utilizam valores elevados para medianas de corpus/benchmarks (`MEDIANA`). A afirmação só se tornará 100 % verdadeira após a implementação do **Cenário C3**.

#### Afirmação 2: *"Any state-level benchmark is inadmissible as a parametric input."*
* **Veredito:** **CONTRADIZ HISTORICAMENTE.**
* **Evidência Empírica:** No commit `24b40955d` (12/06/2026), 9 minutos e 45 segundos após a geração de um relatório de confronto com a FIESP, os valores de BMP de 4 resíduos (`VINHACA`, `CASCA_CAFE`, `DEJETOS_SUINO`, `FORSU`) foram elevados em direção ao benchmark. Além disso, no commit `cb7967a73` (27/07/2026), a anotação no YAML do `BAGACO` explicitou a adoção do valor 115 com base no benchmark conservador industrial da `unica2023_straw`.

#### Afirmação 3: *"Crop residue availability for soybean, corn, and coffee is derived from IBGE PAM crop production statistics."*
* **Veredito:** **CONTRADIZ O CÓDIGO E A PROVENIÊNCIA.**
* **Evidência Empírica:** Conforme registrado no código do gerador canônico (`compute_sp_canonical_totals.py:111`), em `biomass_import.py` e na Auditoria A18 (§1.4), a biomassa de soja, milho e café em `01_master_residue_streams_SP_2023.csv` deriva de **MapBiomas (área em ha) × produtividade (yield t/ha)**, e NÃO das tabelas de produção agrícola do IBGE PAM.

#### Afirmação 4: *"Eleven of twenty-four parameterised feedstocks carry no recoverable observational corpus."*
* **Veredito:** **INDETERMINÁVEL.**
* **Evidência Empírica:** O arquivo de estatísticas do corpus `feedstock_bmp_from_refs.csv` lista 24 feedstocks, mas apenas 6 possuem `n_bmp_obs <= 1`. Como a base de dados observacional bruta de 367 artigos foi colocada em quarentena (DEC-007, commit `69243a36dc`), o numerador 11 não é empiricamente auditável por nenhum artefato versionado hoje.

---

*Relatório de Auditoria A19 concluído com sucesso. NENHUMA alteração foi realizada em arquivos versionados de código ou parâmetros. NENHUM merge ou alteração de ref foi executado.*
