# Micro-transições no mapa — plano de viabilidade

> Plano para decidir **antes de mudar qualquer linha de código de produção**.
> Complementa a spec `FLUXOS_DE_ENERGIA_MICROTRANSICOES.md` (o "o quê") com o "se dá, como e em que
> ordem". Base: `main` em 3fe4072. Data: 2026-11-22.

---

## 0. Resumo executivo

**Veredito: viável, com três condições.**

1. **A refatoração vem antes da animação.** Hoje a camada de municípios é recriada a cada troca de
   substrato, cenário ou métrica, porque os handlers de hover, tooltip e popup guardam esses valores
   no momento da montagem. Enquanto isso não mudar, não há como animar. Essa refatoração sozinha já
   é uma melhoria grande: no escopo nacional, cada troca hoje congela a interface por **0,2 a 1,6 s**
   (medido). Sem remontagem, a mesma troca cabe num único quadro.
2. **Duas estratégias de animação, escolhidas por medição.** No escopo SP (e MG), interpolar a cor
   de cada município quadro a quadro custa ~1 ms de redesenho por quadro: cabe folgado em 60 fps. No
   escopo nacional, o mesmo tween custa 10 a 57 ms por quadro e gera long tasks contínuas num notebook
   modesto. Para o nacional, a técnica é o **crossfade por snapshot** (copiar o canvas atual, aplicar o
   estado novo de uma vez e esmaecer a cópia): 1 redesenho por troca em vez de 40.
3. **Rede de segurança antes de tudo:** testes de caracterização do comportamento atual, benchmark
   com a geometria real do banco, flag de rollback e PRs pequenos.

Esforço estimado até a primeira entrega visível (coroplético que se reorganiza): **~2 a 3 semanas**
em 4 PRs. Detalhe na seção 5.

---

## 1. Escopo deste plano

| Dentro | Fora (fica para depois, já descrito na spec) |
|---|---|
| Coroplético de biogás/biomassa que se reorganiza (substrato, cenário, métrica, paleta, quebras) | Fluxos de Energia (partículas) |
| Fundação de movimento (tokens, tween, OKLab, reduced-motion) | Cartograma de Dorling, zoom semântico, swipe |
| Hover e seleção consistentes, holofote, contorno traçado, câmera | Transições entre modos categóricos (crossfade simples entra; montagem por classe não) |
| Correções de base que a animação exige (seção 3) | Migração para MapLibre |

---

## 2. Evidência: benchmark de redesenho do canvas

### 2.1 Método
- Página Leaflet 1.9.4 isolada, `preferCanvas: true` (igual ao `MapComponent.tsx`), viewport
  1280×720, Chromium headless.
- Geometria: malha municipal pública (base IBGE mais antiga), simplificada com **mapshaper a 120 m**,
  a mesma técnica e tolerância da migration 039 (`geometry_map`). SP: 645 municípios, 77 vértices em
  média. Brasil: 5.564 municípios, 109 vértices em média.
- CPU 1× (máquina de desenvolvimento) e **4× mais lenta** (emulação via CDP de um notebook
  institucional modesto).
- Três operações: **(A)** recolorir todos os municípios a cada quadro por 40 quadros (um tween);
  **(B)** recolorir só os que estão no viewport; **(C)** o comportamento atual, remover e recriar a
  camada; **(D)** crossfade por snapshot.
- `redraw` = tempo do `_redraw` do renderer canvas do Leaflet (instrumentado); `quadro` = intervalo
  entre `requestAnimationFrame`; `long tasks` = `PerformanceObserver('longtask')`, tarefas > 50 ms.

### 2.2 Resultados (DPR 1)

| Cenário | CPU | Tween: redraw p50 | Tween: quadro p50 | Long tasks em 40 quadros | **Hoje: remontar (por troca)** |
|---|---|---|---|---|---|
| SP, zoom 7 (645) | 1× | 1,1 ms | 16,7 ms (60 fps) | 0 | 34–47 ms |
| SP, zoom 7 | 4× | 10,3 ms | 37,9 ms (~26 fps) | 0 | 126–170 ms |
| Nacional, zoom 4 (5.564) | 1× | 10,3 ms | 23,5 ms (~43 fps) | 0 | **225–296 ms** |
| Nacional, zoom 4 | 4× | 56,3 ms | 128,6 ms (~8 fps) | **40** | **0,77–1,66 s** |
| Nacional, vista de SP zoom 7 | 1× | 6,1 ms | 22,7 ms | 0 | 218–292 ms |
| Nacional, vista de SP zoom 7 | 4× | 32,6 ms | 129 ms | 40 | 0,87–1,26 s |

| Alternativas no nacional | CPU | Custo por troca | Long tasks por troca |
|---|---|---|---|
| (B) Tween só no viewport (vista SP, 1.827 visíveis) | 4× | redraw p50 32,8 ms por quadro: **praticamente igual ao (A)** | 40 em 40 quadros |
| (D) Crossfade por snapshot | 1× | 38–55 ms (cópia 2–3 ms + 1 redesenho) | 0 |
| (D) Crossfade por snapshot | 4× | 176–215 ms (cópia ~11 ms + 1 redesenho) | ~1 |

O laço de `setStyle` em si é barato em todos os casos (≤ 8 ms no pior). O custo está no redesenho.

### 2.3 Conclusões
1. **SP e MG: tween por município é viável**, inclusive em máquina lenta (26 fps sem long tasks).
2. **Nacional: tween por município não é viável** em hardware modesto. "Só o viewport" (proposto na
   spec 5.3) **não resolve**: o redesenho do Leaflet percorre e desenha todos os polígonos que cruzam
   a área suja, e no viewport de um estado isso já é quase tudo. **A spec deve trocar essa mitigação
   pelo crossfade por snapshot** (ver seção 4, ADR-1).
3. **A remontagem atual é o maior custo de todos.** Eliminá-la é ganho de performance com ou sem
   animação, e justifica a Etapa 1 por si só.

### 2.4 Limitações (por isso há o Gate G0)
- A malha pública é mais antiga que a do banco; o `geometry_map` real pode ter mais vértices.
- Chromium headless rasteriza o canvas por software. Com DPR 2 os intervalos de quadro inflam
  muito por conta da composição em software, sem refletir uma GPU real; por isso a tabela usa DPR 1.
  Os tempos de JS (`setStyle` e `_redraw`) são a métrica confiável.
- **Gate G0:** rodar o benchmark com a geometria real exportada da API local (seção 9) e num
  notebook físico da equipe com tela retina ou HiDPI antes da Etapa 3.

---

## 3. Diagnóstico do código atual

Problemas encontrados ao ler os arquivos que a mudança toca. "Bloqueia" = precisa ser resolvido
antes de animar.

| # | Problema | Onde | Efeito hoje | Bloqueia? |
|---|---|---|---|---|
| D1 | A `<GeoJSON>` remonta a cada troca de substrato, cenário, métrica, modo ou resíduos (`key` com 8 valores) | `MunicipalityLayer.tsx`, `key=` | Congelamento medido na seção 2 (até 1,6 s no nacional em máquina lenta); impossível animar | **Sim** |
| D2 | **Causa do D1:** `onEachFeature` captura na montagem `getMapValue` (substrato, cenário, resíduos), `isCanonicalPaint` (`paintBetaData`), o HTML da tooltip e as props do popup (`metric`, `scenario`) | `MunicipalityLayer.tsx`, `onEachFeature` | Correto só porque remonta; sem remontar, o reset do hover e as tooltips ficariam com valores antigos | **Sim** |
| D3 | A prop `style` muda de identidade com os dados, e o react-leaflet aplica `setStyle` na hora | `MunicipalityLayer.tsx`, `useCallback style` | Sem remontagem, as cores saltariam para o final antes do tween | **Sim** |
| D4 | **Bug visual existente:** o `mouseout` restaura `weight: 1, color: '#666666'`, mas o estilo base é `0.65 / '#4b5563'`, e no MG o contorno azul (`MG_DATA_STROKE`) é perdido. Depois de passar o mouse, o município fica com contorno diferente dos vizinhos | `MunicipalityLayer.tsx`, `mouseout` | Inconsistência visível hoje; com animação, ficaria evidente | Sim (o reset precisa usar a mesma função do estilo base) |
| D5 | Cada hover chama `setHoveredMunicipality` no `MapComponent` (1.620 linhas, 31 `useState`), que re-renderiza tudo; `spDisplayData` e `mgDisplayData` refiltram 5.571 features a cada render, sem `useMemo`; `MunicipalityLayer` não é memoizado | `MapComponent.tsx` (~linhas 495, 628, 976–984) | Trabalho desperdiçado a cada movimento do mouse; durante uma animação, compete com os quadros | Não bloqueia, mas **corrigir na Etapa 1** |
| D6 | Tipologia, regime e perfil C/N são **camadas GeoJSON separadas desenhadas sobre** a de municípios (polígonos duplicados) | `MapComponent.tsx` (`CnChoroLayer`, `TypologyChoroLayer`) | Transição para esses modos é entre camadas, não entre cores; custo de desenho dobrado nesses modos | Não (crossfade de camada no escopo; unificação depois) |
| D7 | Bolhas e heatmap também são camadas separadas, alternadas por condicional | `MapComponent.tsx` | Troca seca; idem D6 | Não |
| D8 | Voos de câmera ignoram reduced-motion | `MapComponent.tsx` (`flyTo` 0,6 s), `MunicipalityHighlight.tsx` (`flyToBounds` 1,2 s) | Acessibilidade (WCAG 2.3.3) | Corrigir na Etapa 2 |
| D9 | A regra global de reduced-motion zera transições com `!important`, sem espaço para preferência no app | `globals.css` | Impede a configuração "animações completas" | Etapa 2 |
| D10 | `MapComponent.tsx` concentra estado, URL, camadas e painéis | `MapComponent.tsx` | Alto risco de regressão em qualquer mudança | Mitigar com testes de caracterização (Etapa 0) |
| D11 | O export de imagem usa `html2canvas` sobre o mapa | `ExportControl.tsx` | Hoje desligado (`DATA_EXPORT_ENABLED=false`); quando religado, capturaria cores intermediárias se disparado no meio de uma transição | Não; registrar para quando o export voltar |

### O que já está a favor
- O padrão "restyle sem remontar" já existe para a opacidade (`opacityRef`, `fillOverrideRef`).
- Os valores de todos os substratos e cenários vêm no GeoJSON municipal (`useGeospatialData`,
  `fields=map`): **nenhuma troca de substrato ou cenário depende de rede**.
- `reactStrictMode: false`, `MunicipalityHighlight` já tem pane própria, o mock de `matchMedia` já
  existe no Jest, e o Playwright já está configurado com projeto público e projeto autenticado.

---

## 4. Decisões de arquitetura (ADRs curtas)

**ADR-1 · Estratégia por custo medido, não por contagem fixa.**
`restyle(inputs)` mede o `_redraw` do primeiro quadro de cada transição (média móvel por sessão).
Se o p50 recente for ≤ 8 ms: tween por município (OKLab, cascata). Se for maior: crossfade por
snapshot. A escolha é por sessão e dispositivo, então um notebook rápido pode animar o nacional por
município e um lento cai para o crossfade sozinho. Valores iniciais: SP e MG em tween, nacional em
crossfade, até haver medição.

**ADR-2 · Uma única função de estilo.**
`baseStyle(props, inputs)` pura, em `src/lib/map/municipalityStyle.ts`, cobre os quatro casos atuais
(override de análise, beta, sem dado, rampa com contorno SP ou MG). A montagem, o tween, o reset do
hover e o crossfade usam todos essa função. Hover e seleção são **modificadores** compostos por cima
(`withHover(base)`, `withSelection(base)`), nunca estilos escritos à mão. Corrige o D4.

**ADR-3 · Entradas por ref, conteúdo lido na hora.**
Um `inputsRef` (`biomassType`, `selectedResidues`, `displayMetric`, `mapScenario`, `paintBetaData`,
paleta, quebras, override) é lido pelos handlers. A tooltip de fallback mobile passa a ser
`bindTooltip(() => html)` (função avaliada ao abrir), e o popup já é uma fábrica: basta ler o ref.
Assim o `key` fica só com `locale`, `showNationalBeta` e `colorMode` (este último enquanto D6
existir).

**ADR-4 · `style` estável e restyle imperativo.**
A prop `style` da `<GeoJSON>` vira estável (só para a montagem). Todo restyle passa por
`restyle(inputs, { animate })`, inclusive o slider de opacidade. Com `animate: false` (ou movimento
desligado), o resultado é idêntico ao de hoje, só que sem remontagem.

**ADR-5 · Duas flags, rollback trivial.**
Em `src/lib/featureFlags.ts`, seguindo o padrão do arquivo:
- `MAP_INPLACE_RESTYLE`: liga a refatoração da Etapa 1. Desligada, o código volta ao `key` completo
  (caminho atual). Remove-se uma release depois de estável.
- `MAP_MOTION`: liga as transições. Desligada, `restyle` aplica o estado final de uma vez.

**ADR-6 · Sem dependências novas** de animação (OKLab, tween, FLIP e snapshot escritos e testados no
projeto, ~300 linhas).

**ADR-7 · Camadas categóricas e de símbolos: crossfade de pane neste ciclo.**
Transições para tipologia, regime, C/N, bolhas e heatmap animam a opacidade da pane (CSS, custo
quase zero). A montagem classe por classe e as bolhas que crescem do centróide ficam para depois da
unificação das camadas.

**ADR-8 · O que nunca anima.**
Sem dado → valor e valor → sem dado fazem fade (opacidade e cor juntas), nunca uma interpolação de
cor que faça um município sem dado parecer, por alguns quadros, ter um valor baixo. Beta → canônico
segue a mesma regra. Coerente com a decisão da migration 025 de não converter nulo em zero.

---

## 5. Plano em etapas, com gates

Cada etapa é **um PR**, com patch notes e i18n, e só começa quando o gate anterior passa.

### Etapa 0 · Medir e congelar o comportamento atual (sem código de produção)
- Rodar o benchmark com a geometria real (seção 9) e registrar os números neste documento.
- Escrever **testes de caracterização** do que existe hoje:
  - unitários: dado um conjunto de features de amostra (SP com valor, SP sem dado, MG com e sem
    `paintBetaData`, override de análise com cor, nulo e indefinido), o estilo produzido em cada
    combinação de entradas. Viram a especificação da `baseStyle`;
  - e2e (projeto `public`): para cada troca de substrato, cenário e métrica, o tempo até o novo
    estado pintado, com `performance.mark`. É a linha de base da melhoria;
  - registrar o D4 num teste marcado como `test.fail` (comportamento atual conhecido e incorreto).
- **Gate G0:** números reais registrados; testes de caracterização verdes no CI.

### Etapa 1 · Refatoração sem animação (PR 1)
- `baseStyle` pura (ADR-2) + testes (os de caracterização passam contra ela).
- `inputsRef`, tooltip e popup lidos na hora (ADR-3); `style` estável e `restyle` imediato (ADR-4).
- `key` reduzido, atrás de `MAP_INPLACE_RESTYLE` (ADR-5).
- Hover e reset com a mesma função (corrige o D4; o `test.fail` vira `test`).
- `useMemo` em `spDisplayData` e `mgDisplayData`; `React.memo` na `MunicipalityLayer`; estado de
  hover isolado num componente filho ou store, para não re-renderizar o `MapComponent` inteiro (D5).
- **Gate G1:**
  - todos os testes existentes e de caracterização verdes;
  - `layerMounts` não muda ao trocar substrato, cenário ou métrica;
  - troca de substrato no nacional ≤ 1 quadro de redesenho (hoje 225–296 ms em CPU 1×);
  - comparação visual (screenshots) igual à de antes, **exceto** o contorno pós-hover (D4), que
    precisa de aprovação explícita da equipe.

### Etapa 2 · Fundação de movimento (PR 2)
Spec Fase 0, mais:
- `data-motion` no `<html>` e ajuste do `globals.css` (D9);
- `cameraController` respeitando reduced-motion nos dois voos existentes (D8);
- configuração de movimento (completas, reduzidas, desligadas).
- **Gate G2:** testes unitários do motor; nenhuma mudança visual com `MAP_MOTION` desligada.

### Etapa 3 · Coroplético que se reorganiza (PR 3)
- `restyle` com as duas estratégias (ADR-1): tween OKLab com cascata em SP e MG e crossfade por
  snapshot no nacional. O snapshot é cancelado em `movestart` e `zoomstart` (a cópia ficaria
  desalinhada).
- Legenda, números e ranking sincronizados (spec 5.4).
- Crossfade de pane para os modos categóricos e de símbolos (ADR-7).
- Regras do ADR-8.
- **Gate G3**, em build de produção (perfil `perf` do compose):
  - SP, CPU 1×: zero long tasks; ≥ 55 fps durante a transição;
  - SP, CPU 4×: zero long tasks;
  - nacional, CPU 4×: no máximo 2 long tasks por troca;
  - duas trocas em menos de 200 ms não produzem salto de cor;
  - com reduced-motion: estado final em 1 quadro;
  - teste num notebook físico com tela HiDPI (pendência do G0).

### Etapa 4 · Seleção, foco e hover (PR 4)
Spec Fase 2 (holofote, contorno traçado em SVG, câmera com regras) e os itens A da seção 17 da spec
(atraso de intenção, hover sincronizado).
- **Gate G4:** a11y (jest-axe e e2e de teclado); sem regressão de performance do G3.

### Depois
Itens da Parte II da spec (navegação, legenda viva, histórico com Voltar, que exige o spike
26.10), e os Fluxos de Energia.

### Estimativa

| Etapa | Esforço | Acumulado |
|---|---|---|
| 0 | 2–3 dias | 3 dias |
| 1 | 4–5 dias | ~1,5 semana |
| 2 | 2–3 dias | ~2 semanas |
| 3 | 4–5 dias | ~3 semanas |
| 4 | 3 dias | ~3,5 semanas |

---

## 6. Riscos e mitigação

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Regressão em `MapComponent.tsx` (arquivo grande, muito estado) | Alta | Alto | Etapa 0 (caracterização), PRs pequenos, flag de rollback |
| Tooltip ou popup com valor desatualizado após tirar dados do `key` | Média | Alto (número errado na tela) | ADR-3; teste e2e: trocar substrato e abrir o popup do mesmo município, com o valor conferido contra a API |
| Geometria real mais pesada que a do benchmark | Média | Médio | Gate G0; se o redesenho em SP passar de 8 ms em CPU 1×, simplificar mais o `geometry_map` só para o modo de transição, ou mover SP para crossfade |
| Hardware dos usuários mais lento que o 4× emulado | Média | Médio | ADR-1 escolhe a estratégia pelo custo medido no próprio dispositivo |
| Snapshot desalinhado se o usuário arrastar durante o crossfade | Média | Baixo | Cancelar em `movestart`/`zoomstart`, aplicando o estado final |
| Hover durante o tween restaura a cor errada | Média | Médio | `currentStyleRef` e modificadores (ADR-2); teste específico |
| Animação percebida como lenta ou "enfeite" | Baixa | Médio | Durações ≤ 520 ms + cascata ≤ 400 ms; configuração de velocidade; métricas de "pular" (spec 23) |
| Leitura enganosa de dados durante a transição | Baixa | Alto | ADR-8 (sem dado e beta nunca interpolam para a rampa) |
| Unificação futura das camadas (D6) refazer trabalho | Média | Baixo | ADR-7 limita o investimento nessas camadas neste ciclo |

---

## 7. Cuidados de implementação (checklist para cada PR)

- [ ] Nenhum valor numérico novo sem fonte; nada de "sem dado" pintado como zero, nem por um quadro.
- [ ] Modos beta continuam só com sessão; nada de pré-busca sem sessão.
- [ ] Contorno do MG (`MG_DATA_STROKE`) preservado em todos os estados, inclusive após hover.
- [ ] Paletas CVD e temáticas: o estado final é idêntico ao de hoje para todas as paletas.
- [ ] Popups em React root continuam sendo desmontados no `popupclose` (vazamento já tratado hoje).
- [ ] Trocar o idioma ainda remonta a camada (aceitável: é raro e muda os textos).
- [ ] `prefers-reduced-motion` e a configuração do app respeitados em CSS, JS e câmera.
- [ ] Atalhos de teclado seguem a regra da spec 16.4 (sem modificadores, sem campo editável).
- [ ] Strings novas em `messages/en.json` e `messages/pt-BR.json`; patch notes atualizadas.
- [ ] Medições de performance só em build de produção.
- [ ] Mobile (`mobile-chrome`): bottom sheet e mapa sem regressão.

---

## 8. Definição de pronto (para o ciclo inteiro)

- Trocar substrato, cenário, métrica ou paleta **nunca** remonta a camada e mostra uma transição que
  deixa claro quem subiu e quem desceu.
- O escopo nacional não congela a interface em nenhuma troca.
- Hover, seleção e câmera são consistentes e respeitam reduced-motion.
- Todos os gates G0 a G4 registrados neste documento com números reais.

---

## 9. Como reproduzir o benchmark com a geometria real

O script está em `frontend/scripts/perf/restyle-bench/` (a geometria exportada é ignorada pelo git).

```powershell
cd cp2b-workspace\NewLook
docker compose up -d                 # API em localhost:8000 com o banco populado
cd frontend
npm ci                               # node_modules no host (leaflet + playwright)
npx playwright install chromium
node scripts/perf/restyle-bench/run.mjs --export      # baixa ?fields=map&detail=map
node scripts/perf/restyle-bench/run.mjs --cpu=1,4 > scripts/perf/restyle-bench/results-local.jsonl
```

Cada linha do resultado traz `tweenAll`, `tweenViewport` e `remount`, com p50, p95, máximo e long
tasks. Para o Gate G0, colar os números na seção 2.2 com a data e o hardware usado.

---

## 10. Decisões que dependem da equipe

1. **D4 (contorno após hover):** aprovar a mudança visível, em que o contorno volta exatamente ao
   estilo base, como parte da Etapa 1?
2. **Hardware de referência:** qual notebook define "máquina modesta" (o 4× emulado é uma suposição)?
3. **Prioridade do escopo nacional:** se o nacional continua beta por muito tempo, vale aceitar o
   crossfade simples ali e investir o tempo no SP e MG?
4. **Entrega da Etapa 1 sozinha:** publicar a refatoração (ganho de performance, nenhuma animação)
   antes das transições? Recomendo que sim: isola o risco de regressão do risco de design.
