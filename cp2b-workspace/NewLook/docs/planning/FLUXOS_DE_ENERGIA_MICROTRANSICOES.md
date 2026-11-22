# Fluxos de Energia + Micro-transições — especificação de desenvolvimento

> Documento de trabalho para implementar com Claude Code local e validar em Docker Desktop.
> Escopo: `cp2b-workspace/NewLook/frontend` (Next.js 16 · React 19 · react-leaflet 4) e um
> endpoint novo em `backend/` (FastAPI + PostGIS).
> Status: proposta · Data: 2026-11-22 · Parte I (seções 1–13): micro-transições e Fluxos de Energia · Parte II (seções 14–25): catálogo ampliado de transições e navegação

---

## 0. Como usar este documento com Claude Code

1. Abra o Claude Code na pasta `cp2b-workspace/NewLook`.
2. Cole o prompt da seção 12 ("Prompt inicial").
3. Trabalhe **uma fase por vez** (seções 4 a 9). Cada fase tem critérios de aceite e testes; só
   avance quando `npm run typecheck`, `npm run lint`, `npm test` e o e2e da fase passarem.
4. Valide visualmente no Docker Desktop (seção 10) ao fim de cada fase.

---

## 1. Visão

O mapa deixa de **trocar** de estado e passa a **se reorganizar**. Cada município é sempre o
mesmo objeto visual (chave `cd_mun`). Toda mudança (substrato, cenário, métrica, seleção, escopo)
é interpolada, de modo que o olho acompanha *quem* mudou. Sobre essa base entra uma única
ferramenta de alto impacto, o modo **Fluxos de Energia**: a energia sai das usinas, percorre a
infraestrutura (linhas de transmissão, subestações, gasodutos) e chega a quem consome.

Pergunta central (linha "energia entre escalas"): *quem produz energia renovável, quem consome e
quem fica com os custos e benefícios, no espaço e no tempo?*

### Princípios de movimento

| # | Princípio | Regra prática |
|---|---|---|
| P1 | Constância de objeto | Nada de remontar a camada de municípios por troca de dado; interpolar estilo no lugar. |
| P2 | Movimento codifica dado | Velocidade, densidade e espessura de partículas são proporcionais a magnitudes reais. Nada decorativo. |
| P3 | Interrupção sem salto | Uma nova mudança no meio de uma transição parte do valor *atual*, não do inicial. |
| P4 | Um sistema só | Durações e easing vêm de tokens únicos (`src/lib/motion/tokens.ts`). |
| P5 | Movimento opcional | `prefers-reduced-motion: reduce` → estado final imediato, com uma versão estática equivalente (setas e espessuras no lugar de partículas). |
| P6 | Honestidade | Fluxos que não vêm de um modelo de fluxo de potência ou de rede de gás são rotulados como **"fluxo ilustrativo"**. Equivalências (botijões) são rotuladas como **"equivalência energética, não rota física"**. |
| P7 | Orçamento de quadro | Nenhum long task > 50 ms durante uma transição no escopo SP. Degradação automática no escopo nacional. |

---

## 2. Achados no código atual que condicionam o desenho

Leia antes de codar.

1. **O mapa usa renderer canvas** (`MapComponent.tsx`, `preferCanvas={true}`), escolhido por
   performance com 5.571 polígonos. Consequência: **transições CSS em path SVG não funcionam** para
   o coroplético. A interpolação precisa ser feita em JS, chamando `layer.setStyle()` a cada quadro.
   O renderer canvas do Leaflet agrupa redesenhos num único `requestAnimationFrame`, então N
   chamadas de `setStyle` no mesmo quadro geram um só redesenho.
2. **A `<GeoJSON>` de `MunicipalityLayer.tsx` remonta a cada troca de dado.** O `key` inclui
   `biomassType`, `displayMetric`, `colorMode`, `mapScenario` e `selectedResidues`. Remontar destrói
   a constância de objeto. **Essa é a refatoração central da Fase 1.** O próprio arquivo já faz isso
   para a opacidade (comentário "Opacity changes … restyle the existing layer via setStyle instead
   of remounting"), então o padrão já existe e deve ser generalizado.
3. **O hover lê a cor recalculada** (`resetColor = getMetricColor(...)` em `onEachFeature`). Com
   tween, o reset do hover precisa ler a **cor corrente interpolada** de um `Map<cd_mun, string>` em
   ref. Senão o mouse "pula" o município para a cor final no meio da animação.
4. **Não há d3, framer-motion nem MapLibre** no `package.json`. A migração para MapLibre está no
   roadmap (`docs/planning/ESTRATEGIA_2027_LIDERANCA_BIOECONOMIA.md`), mas não começou. Esta spec
   **não adiciona dependências de animação**: OKLab, tween e FLIP são escritos à mão (~200 linhas,
   testadas). O motor de partículas é isolado atrás de uma interface para ser portado para
   `deck.gl TripsLayer` quando a migração acontecer.
5. A infraestrutura já está servida: `GET /api/v1/infrastructure/{pipelines,substations,transmission-lines,biogas-plants}/geojson`.
   Os vetores grandes são carregados pelo perfil `infrastructure` do compose (seção 10).
6. **Não existe dado social de acesso a gás** (CadÚnico, Auxílio Gás / Gás do Povo) no banco. É
   preciso criar um loader (Fase 6).
7. CI do frontend: paridade i18n (`messages/en.json` e `messages/pt-BR.json`), checagem de strings
   fixas no código, `src/data/patch-notes.json`, a11y com jest-axe. Toda string nova vai para os dois
   arquivos de mensagens.

---

## 3. Arquitetura proposta

```
src/lib/motion/
  tokens.ts            durações, easings, limites de performance
  easing.ts            funções de easing puras
  oklab.ts             hex <-> OKLab, interpolação perceptual
  tween.ts             motor rAF: animate(), retarget, cancel, injeção de clock para testes
  reducedMotion.ts     matchMedia + override manual (configurações)
  frameBudget.ts       medidor de fps/tempo de quadro com degradação adaptativa
  debug.ts             window.__pilarMotion (somente dev/test): contadores para e2e
src/hooks/
  usePrefersReducedMotion.ts
  useAnimatedNumber.ts
  useFlip.ts           reordenação de listas (FLIP com Web Animations API)
src/components/map/
  MunicipalityLayer.tsx          (refatorado: restyle animado no lugar)
  choroplethTransition.ts        orquestra o tween de cores por cd_mun
  MunicipalityHighlight.tsx      (contorno "traçado" com renderer SVG próprio)
  flows/
    FlowParticleLayer.ts         L.Layer com canvas próprio (pane 'flowPane')
    flowGeometry.ts              comprimentos acumulados, posição em s, snapping
    flowModel.ts                 tipos FlowPath, Carrier, normalização de magnitudes
    EnergyFlowsMode.tsx          UI do modo (toggle, legenda, rótulos de honestidade)
    DayCycleClock.tsx            relógio 24 h (modo elétrico)
    StaticFlowFallback.tsx       setas/espessuras para reduced-motion
backend/app/api/v1/endpoints/energy_flows.py
backend/app/services/energy_flows_service.py
backend/scripts/build_energy_flow_paths.py      (offline: grafo + caminhos)
backend/scripts/load_social_energy_indicators.py
data/canonical_parameters/equivalences.yaml     (constantes com fonte)
```

---

## 4. Fase 0 — Fundação de movimento

### 4.1 Tokens (`src/lib/motion/tokens.ts`)

```ts
export const DURATION = { micro: 180, short: 320, medium: 520, long: 800, narrative: 1600 } as const;
export const EASING = {
  standard: [0.2, 0.8, 0.2, 1],   // cubic-bezier, entradas e trocas de cor
  exit: [0.4, 0, 1, 1],
  emphasized: [0.3, 0, 0, 1],     // câmera e holofote
} as const;
export const STAGGER = { maxTotalMs: 400 } as const;          // cascata nunca passa disso
export const BUDGET = { frameMs: 16.7, degradeAfterSlowFrames: 6, maxParticles: 3000 } as const;
```

Expor os mesmos valores como CSS custom properties (`--motion-short` etc.) em `globals.css` para
painéis, legenda e botões.

### 4.2 OKLab (`oklab.ts`)
- `hexToOklab`, `oklabToHex`, `mixOklab(a, b, t)`. Interpolação em OKLab evita o "cinza sujo" no meio
  da transição entre cores saturadas da paleta.
- Paletas CVD (`useCvdPalette`) continuam valendo: interpola-se entre cores *já* resolvidas.

### 4.3 Motor de tween (`tween.ts`)
```ts
type Clock = { now(): number; raf(cb: FrameRequestCallback): number; caf(id: number): void };
animate<T>(opts: { from: T; to: T; duration: number; easing: Easing;
  interpolate: (a: T, b: T, t: number) => T; onUpdate(v: T): void; onDone?(): void;
  clock?: Clock }): { cancel(): void; retarget(to: T): void; current(): T };
```
- `retarget` implementa P3: novo `from = current()`, reinicia o tempo.
- `clock` injetável → testes determinísticos com relógio falso.
- Com reduced-motion: `onUpdate(to)` síncrono e `onDone()`.

### 4.4 Hooks
- `usePrefersReducedMotion()`: `matchMedia` + override em configurações (respeitar a preferência já
  declarada na página de acessibilidade).
- `useAnimatedNumber(value, { duration, format })`: tween do valor **anterior** ao novo (nunca de 0,
  exceto na primeira montagem).
- `useFlip(keys)`: registra `getBoundingClientRect` antes e depois do commit e anima com
  `element.animate()`. Usar no ranking do painel e na lista de comparação.

### 4.5 Debug hook (`debug.ts`)
Somente quando `process.env.NODE_ENV !== 'production'`:
```ts
window.__pilarMotion = { activeTweens, completedTransitions, lastTransitionMs,
  slowFrames, degraded, particles, layerMounts };
```
`layerMounts` conta montagens da `<GeoJSON>` de municípios; é a forma robusta de o e2e provar P1.

### Critérios de aceite (Fase 0)
- [ ] Testes unitários: OKLab ida e volta (erro ≤ 1 por canal em 1.000 cores aleatórias),
      `mixOklab(a, b, 0) === a`, `mixOklab(a, b, 1) === b`.
- [ ] Tween com relógio falso: valor em t = 50% bate com o easing; `retarget` no meio não salta
      (|Δ| no quadro da troca < 2% do intervalo).
- [ ] Reduced-motion → `onUpdate` chamado uma vez com o valor final.
- [ ] Nenhuma dependência nova em `package.json`.

---

## 5. Fase 1 — Coroplético que se reorganiza (núcleo)

### 5.1 Refatoração do `key`
- Manter no `key` só o que muda **o conjunto de features** (escopo/beta: `showNationalBeta`,
  `paintBetaData`) e `locale` (tooltips).
- Remover do `key`: `biomassType`, `displayMetric`, `colorMode`, `mapScenario`, `selectedResidues`.
- Guardar as layers por `cd_mun` num `Map` em ref (preenchido em `onEachFeature`).

### 5.2 `choroplethTransition.ts`
```
onInputsChange(newInputs):
  target = Map<cd_mun, {fillColor, fillOpacity}>   // getMetricColor(...) / NO_DATA / BETA
  from   = currentStyleRef (cores correntes, já interpoladas se houver tween em curso)
  start a single tween t: 0→1 (DURATION.medium, EASING.standard)
    onUpdate(t): for each cd_mun: tt = staggered(t, delay[cd_mun])
                 style = mix(from, target, tt); layer.setStyle(style); currentStyleRef.set(...)
```
- **Um único tween global** com atraso por feature (cascata) é muito mais barato que 5.571 tweens.
- Cascata (`delay`), selecionável por contexto:
  - `rank`: municípios de maior valor chegam primeiro (troca de métrica/substrato);
  - `distance`: em ondas a partir do município selecionado ou do clique (ver Fase 2);
  - `none`: tudo junto (escopo nacional, ou quando o medidor de quadros degradou).
  - Soma dos atrasos limitada a `STAGGER.maxTotalMs`.
- Transição de/para NO_DATA: interpolar `fillOpacity` e cor juntos (fade), não trocar a cor do nada.
- Hover: `mouseout` usa `currentStyleRef.get(cd_mun)` em vez de recalcular `getMetricColor`.
  Se um tween estiver ativo, o hover sobrepõe só `weight` e `color`, sem tocar no `fillColor`.

### 5.3 Degradação adaptativa (`frameBudget.ts`)
- Medir a duração de cada quadro durante o tween. Após `degradeAfterSlowFrames` quadros > 24 ms:
  passar para **passos discretos** (8 passos em vez de contínuo) e desligar a cascata.
- Escopo nacional (> 2.000 features): começar já em `none` e atualizar só as features **no
  viewport** a cada quadro; as fora do viewport recebem o estilo final de uma vez no início.

### 5.4 Legenda e painel sincronizados
- A rampa da legenda interpola com o mesmo `t`. Os rótulos de quebra usam `useAnimatedNumber`.
- Marcador do município selecionado desliza na rampa até a nova posição.
- Totais e KPIs: `useAnimatedNumber`. Ranking: `useFlip`.
- Gráficos (Recharts/Chart.js): chaves estáveis por substrato, para que as barras cresçam a partir
  do valor anterior. Troca de unidade (GWh ↔ m³ ↔ famílias) faz *morph* do eixo, sem remontar.

### Critérios de aceite (Fase 1)
- [ ] Trocar substrato, cenário ou métrica **não** incrementa `__pilarMotion.layerMounts`.
- [ ] Escopo SP: transição completa em ≤ `DURATION.medium + STAGGER.maxTotalMs` + 100 ms; zero long
      tasks > 50 ms (PerformanceObserver `longtask`).
- [ ] Trocar duas vezes em sequência rápida (< 200 ms) não produz salto de cor (P3).
- [ ] Hover durante a transição não leva o município à cor final antes da hora.
- [ ] Reduced-motion: estilo final imediato, `completedTransitions` incrementa sem quadros
      intermediários.
- [ ] Paletas daltônicas continuam corretas no estado final (teste existente de `useCvdPalette` +
      um novo).

---

## 6. Fase 2 — Seleção, foco e câmera

| Interação | Comportamento | Implementação |
|---|---|---|
| Holofote | Ao selecionar, o resto do mapa esmaece (`fillOpacity` → 0,25) em `DURATION.short` | Mesmo motor da Fase 1, só o canal de opacidade |
| Contorno traçado | O contorno do selecionado é "desenhado" (stroke-dashoffset) em `DURATION.medium` | `MunicipalityHighlight` com **renderer SVG próprio** (`L.svg({ pane: 'highlightPane' })`): é um único path, então CSS funciona mesmo com o mapa em canvas |
| Câmera | `flyToBounds` com `duration: 0.8`, `easeLinearity: 0.25`; sem voo se o município já está visível (só pulso no contorno) | Leaflet nativo |
| Ondas de vizinhança | Clique longo ou atalho: vizinhos de 1ª, 2ª e 3ª ordem acendem em ondas (cascata `distance` topológica) | Matriz de contiguidade pré-calculada (queen) servida pelo backend ou gerada no build |
| Comparação | Ao escolher o 2º município, uma linha se desenha entre os dois e os valores fazem *morph* para o modo comparativo | SVG renderer na pane de destaque + `useAnimatedNumber` |
| Painel | Entra deslizando (`transform`, nunca `width`); conteúdo em cascata de 40 ms | CSS com tokens |

### Critérios de aceite (Fase 2)
- [ ] Contorno traçado visível no canvas do mapa (screenshot e2e no fim da animação).
- [ ] Teclado: Tab até o município pela busca, Enter seleciona, Esc limpa o holofote com transição
      inversa.
- [ ] jest-axe sem violações nos painéis novos.

---

## 7. Fase 3 — Motor de partículas (`flows/`)

### 7.1 Modelo
```ts
type Carrier = 'electric' | 'biomethane' | 'solar' | 'cylinder';
interface FlowPath {
  id: string;
  carrier: Carrier;
  coords: [number, number][];       // [lat, lng] ao longo da infraestrutura
  magnitude: number;                // MW, m³/dia ou botijões/mês (unidade por carrier)
  unit: 'MW' | 'm3_day' | 'cylinders_month';
  kind: 'network' | 'connection';   // connection = trecho usina→rede (tracejado, sem rede real)
  illustrative: boolean;            // P6: rotular na UI
  source: string;                   // proveniência
}
```

### 7.2 `FlowParticleLayer` (L.Layer)
- Canvas próprio numa pane `flowPane` (zIndex acima dos overlays, `pointer-events: none`).
- Pré-processamento por path: projetar para pixels na zoom atual e calcular comprimentos acumulados.
  Recalcular em `zoomend` e `viewreset`; esconder durante `zoomanim` e reexibir no fim.
- Partícula = `{ pathIdx, s, speed }`. A cada quadro: `s += speed · dt`; a posição sai de uma busca
  binária nos comprimentos acumulados. Desenho: círculo + cauda curta (3 a 5 segmentos com alpha
  decrescente). **Não** usar o truque de "limpar com alpha", que borra ao arrastar o mapa.
- **P2:** nº de partículas no path = `clamp(round(k · magnitude), 1, 60)`; velocidade constante por
  carrier (comparabilidade). A magnitude se lê pela densidade, não pela velocidade.
- Orçamento: teto global `BUDGET.maxParticles`; se o `frameBudget` degradar, reduzir pela metade.
- Pausar com `document.hidden`, fora do viewport e quando o modo está desligado.
- Reduced-motion → `StaticFlowFallback`: polylines com espessura ∝ magnitude e setas de direção.
- Interface `FlowRenderer` (start/stop/setPaths/setCarrierVisibility) para trocar por
  `deck.gl TripsLayer` na migração MapLibre sem mexer na UI.

### Critérios de aceite (Fase 3)
- [ ] Teste unitário de geometria: posição em `s = 0`, no meio e no fim de uma polyline conhecida;
      path de comprimento zero não quebra.
- [ ] 3.000 partículas no escopo SP a ≥ 50 fps num notebook de referência (medir com o debug hook).
- [ ] Pan e zoom sem rastros nem partículas fora do lugar.
- [ ] Com o modo desligado, nenhum `requestAnimationFrame` ativo (`__pilarMotion.particles === 0`).

---

## 8. Fase 4 — Modo Elétrico: onde gerar e por onde escoar

### 8.1 Dados e caminhos (backend, offline)
`backend/scripts/build_energy_flow_paths.py`:
1. Ler `transmission-lines` e `substations` do PostGIS e montar um grafo (networkx). Nós =
   extremidades das linhas, snapping de 50 m; subestações ligadas ao nó mais próximo (≤ 2 km).
2. Para cada usina de biogás existente e para cada município com potencial acima do limiar: trecho
   `connection` (linha reta até a subestação mais próxima, `kind='connection'`), seguido de caminhos
   `network` da subestação até as 1–3 subestações vizinhas no grafo (profundidade ≤ 3), com a
   magnitude dividida igualmente. **É uma heurística ilustrativa, não um fluxo de potência:**
   `illustrative = true`.
3. Gravar em `energy_flow_paths` (migration nova): `id, carrier, kind, magnitude, unit, geom
   (LineString 4326), illustrative, source, scope, scenario`.

Endpoint: `GET /api/v1/energy-flows?carrier=electric&scope=sp&scenario=real` → GeoJSON
FeatureCollection, cache HTTP longo e ETag.

### 8.2 Visual
- Partículas verdes (biogás) da usina até a subestação e pela rede.
- **Gargalos:** se houver dado de capacidade de conexão, subestações sem folga pulsam em vermelho e
  as partículas desaceleram e se acumulam ali; com folga, brilho verde. **Sem esse dado, não pulsar
  nada**: mostrar só o fluxo e um aviso "capacidade de conexão não disponível" (P6).
- Camada de oportunidade: cruzamento *potencial alto × subestação com folga* recolore os municípios
  com o motor da Fase 1.

### 8.3 Relógio de 24 h (`DayCycleClock`)
- Loop de 24 h em ~20 s (com play/pause/arrastar). Partículas amarelas (solar) seguem um perfil
  normalizado de irradiância (sino ao meio-dia); partículas verdes (biogás) são constantes, ou seja,
  energia firme. No fim da tarde a solar some e o biogás sustenta a rampa noturna.
- Perfil solar e curva de demanda: **perfis-tipo normalizados e rotulados como ilustrativos**, com
  fonte em `equivalences.yaml`. Não são medições.

### Critérios de aceite (Fase 4)
- [ ] Teste de integração do endpoint (pytest) com fixture pequena de linhas e subestações.
- [ ] Rótulo "fluxo ilustrativo" visível sempre que algum path tem `illustrative = true`.
- [ ] Relógio acessível: slider com `aria-valuetext="14:00"`; espaço = play/pause.

---

## 9. Fase 5/6 — Modo Gás e Equidade

### 9.1 Ressalva de domínio (vai na UI)
Famílias de baixa renda usam majoritariamente **GLP em botijão**, não gás natural encanado, e a
rede de distribuição raramente chega às periferias. Por isso há três canais, visualmente distintos:

| Canal | O que mostra | Natureza | Fase |
|---|---|---|---|
| 1. Rede encanada | Biometano injetado e partículas pelo gasoduto até os setores atendidos, coloridos por renda | Rota física (depende da geometria da rede de distribuição) | futura |
| 2. Equivalência em botijões | Potencial municipal convertido em botijões P13 contra famílias do auxílio gás | **Equivalência energética, não rota física** | **5 (MVP)** |
| 3. Biodigestores rurais | Biogás direto para cocção onde há dejetos e população rural de baixa renda | Potencial descentralizado | futura |

### 9.2 Constantes (`data/canonical_parameters/equivalences.yaml`)
Seguir o padrão de fonte única de `feedstocks.yaml` (valor, unidade, fonte, DOI/URL, data):
```yaml
glp_pci_mj_per_kg: { value: 46.0, unit: MJ/kg, source: "a definir: ANP / literatura" }
botijao_p13_kg:    { value: 13,   unit: kg,    source: "ABNT NBR 8460" }
biomethane_pci_mj_per_nm3: { value: 35.8, unit: MJ/Nm3, source: "a definir: ANP Res. 886/2022 (≥ 90% CH4)" }
family_cylinders_per_month: { value: null, unit: P13/mes, source: "VALIDAR: IBGE POF / ANP; não usar valor sem fonte" }
```
Derivado: 1 P13 ≈ 13 × 46,0 = 598 MJ ≈ **16,7 Nm³ de biometano**. `family_cylinders_per_month` fica
`null` até ter fonte; enquanto for `null`, a UI mostra "botijões/ano" e esconde "famílias atendidas".

### 9.3 Dado social (Fase 6)
`backend/scripts/load_social_energy_indicators.py` → tabela `social_energy_indicators`:
`cd_mun, ref_month, familias_auxilio_gas, familias_cadunico_baixa_renda, source_url, loaded_at`.
Fonte: MDS (VIS DATA / dados abertos do CadÚnico e do programa de auxílio gás vigente). Registrar a
URL e o mês de referência. **Fixtures sintéticas só em `tests/fixtures/`**, nunca carregadas no banco
de desenvolvimento por padrão, para que número inventado não vá parar em tela.

### 9.4 Visual (canal 2)
1. Usina ou município com potencial: ícones de botijão (carrier `cylinder`) partem para os
   municípios da **bacia de suprimento**. Reutilizar a isócrona de 60 min já planejada pela equipe;
   enquanto não existir, usar o raio de 50 km da análise de proximidade.
2. Cada município tem uma barra de cobertura que se preenche com `useAnimatedNumber`.
3. Estado final: o coroplético faz a transição (Fase 1) para **cobertura = botijões equivalentes ÷
   (famílias × consumo mensal × 12)**, em paleta divergente centrada em 100%.

### Critérios de aceite (Fases 5/6)
- [ ] Teste unitário da conversão (598 MJ → 16,7 Nm³ com as constantes do YAML).
- [ ] Com `family_cylinders_per_month = null`, nenhuma tela mostra "famílias atendidas".
- [ ] Rótulo de equivalência visível no modo; tooltip cita fonte e mês de referência do dado social.

---

## 10. Validação local em Docker Desktop

### 10.1 Subir o ambiente
PowerShell, na pasta `cp2b-workspace\NewLook`:
```powershell
Copy-Item .env.docker.example .env.docker   # só na primeira vez
docker compose up --build -d
docker compose logs -f db-migrations        # aguardar "completed"
# Vetores de infraestrutura (linhas, subestações, dutos) — uma vez:
$env:MAPBIOMAS_ARCHIVE_DIR="A:\caminho\shapefiles_infraestrutura_mapbiomas"
docker compose --profile infrastructure run --rm infrastructure-loader
```
App: http://localhost:3006/pt-BR/map · API: http://localhost:8000/docs

> Se o hot-reload não detectar mudanças pelo bind-mount do Windows, adicione
> `WATCHPACK_POLLING: "true"` ao `environment` do serviço `frontend` no
> `docker-compose.override.yml` (não no compose principal).

### 10.2 Checagens rápidas da API
```powershell
curl http://localhost:8000/api/v1/infrastructure/health
curl "http://localhost:8000/api/v1/infrastructure/substations/geojson" -o $null -w "%{http_code} %{size_download}`n"
curl "http://localhost:8000/api/v1/energy-flows?carrier=electric&scope=sp"   # após a Fase 4
```

### 10.3 Testes
```powershell
# Dentro do container (mesmo Node da imagem):
docker compose exec frontend npm run typecheck
docker compose exec frontend npm run lint
docker compose exec frontend npm test -- motion flows MunicipalityLayer
docker compose exec frontend npm run i18n:check
docker compose exec backend pytest tests -k energy_flows

# E2E a partir do host, contra o container:
cd frontend
$env:PLAYWRIGHT_BASE_URL="http://localhost:3006"
npx playwright test e2e/motion.spec.ts --project=chromium --trace off
```

### 10.4 E2E a escrever (`frontend/e2e/motion.spec.ts`)
1. **Constância de objeto:** abrir o mapa, ler `__pilarMotion.layerMounts`, trocar o substrato 3
   vezes e afirmar que o valor não mudou.
2. **Transição termina:** após a troca, `waitForFunction(() => __pilarMotion.activeTweens === 0)`
   em ≤ 1,5 s; `completedTransitions` incrementou.
3. **Orçamento de quadro:** instalar `PerformanceObserver({ type: 'longtask' })` antes da troca;
   afirmar zero entradas > 50 ms no escopo SP.
4. **Reduced-motion:** `test.use({ reducedMotion: 'reduce' })`; a troca termina no mesmo quadro
   (`lastTransitionMs < 20`).
5. **Partículas:** ligar o modo Fluxos e verificar `particles > 0`; desligar e verificar `=== 0`;
   com reduced-motion, verificar o fallback estático visível e `particles === 0`.
6. **Visual:** screenshot do estado final (deviceScaleFactor 1) para comparação manual; sem
   snapshot de pixel no CI (tiles de basemap variam).

### 10.5 Checklist visual manual (Docker Desktop)
- [ ] Trocar o substrato: municípios mudam de cor em cascata, sem piscar e sem quadro em branco.
- [ ] Trocar rápido duas vezes: sem salto.
- [ ] Passar o mouse durante a transição: sem "pulo" de cor.
- [ ] Selecionar um município: holofote, contorno traçado, câmera suave, números contando.
- [ ] Ranking do painel reordena deslizando.
- [ ] Modo Fluxos elétrico: partículas seguindo as linhas, rótulo "ilustrativo" visível.
- [ ] Relógio 24 h: solar ao meio-dia, biogás sustentando a noite.
- [ ] Modo Gás e Equidade: botijões, barras de cobertura, rótulo de equivalência.
- [ ] Windows: Configurações → Acessibilidade → Efeitos visuais → "Efeitos de animação" desligado
      → recarregar: tudo estático e funcional.
- [ ] Escopo nacional (beta): sem travar; degradação para passos discretos aceitável.

---

## 11. Fora de escopo e riscos

| Item | Decisão |
|---|---|
| Fluxo de potência real (AC/DC) | Fora. Fluxos elétricos são heurísticos e rotulados. Parceria natural: CEPIL. |
| Geometria da rede de gás de distribuição | Fora do MVP (canal 1 futuro). Verificar disponibilidade com a concessionária. |
| Capacidade de conexão de subestações | Usar só se houver dado público por distribuidora; senão, não simular gargalo. |
| Migração MapLibre | Fora. O motor de partículas fica atrás de `FlowRenderer` para facilitar a migração. |
| Novas dependências | Nenhuma de animação. Backend: o script offline precisa de `networkx`, que **não** está em `backend/requirements*.txt`; adicionar só a um `requirements-scripts.txt` (fora da imagem da API), ou usar pgRouting no PostGIS. |
| Dados sociais | Fonte oficial com mês de referência; nada sintético fora de `tests/fixtures`. |

Risco principal: **performance do canvas no escopo nacional** durante o tween de cores. A mitigação
está na seção 5.3 (só o viewport, passos discretos). Medir antes de otimizar.

---

## 12. Prompt inicial para Claude Code (colar no terminal local)

```
Leia docs/planning/FLUXOS_DE_ENERGIA_MICROTRANSICOES.md inteiro e os arquivos citados na seção 2
(MunicipalityLayer.tsx, MapComponent.tsx, MunicipalityHighlight.tsx, InfrastructureLayer.tsx,
src/lib/featureFlags.ts, messages/*.json).

Implemente apenas a Fase 0 agora. Regras:
- sem dependências novas de animação;
- testes unitários antes do código de cada módulo (src/lib/motion/__tests__);
- todo texto visível em messages/en.json e messages/pt-BR.json;
- respeite prefers-reduced-motion desde o primeiro commit;
- ao terminar, rode typecheck, lint, test e i18n:check dentro do container
  (docker compose exec frontend ...) e me mostre a saída;
- não comite; me mostre o diff e um resumo do que validar no navegador.

Depois que eu aprovar, seguimos para a Fase 1 com o mesmo processo.
```

---

## 13. Sequência e estimativa grosseira

| Fase | Entrega | Depende de | Esforço |
|---|---|---|---|
| 0 | Fundação de movimento | — | 1–2 dias |
| 1 | Coroplético que se reorganiza | 0 | 3–4 dias |
| 2 | Seleção, foco, câmera, ondas | 1 | 2–3 dias |
| 3 | Motor de partículas | 0 | 3 dias |
| 4 | Modo Elétrico + relógio 24 h | 3, script de caminhos | 4–5 dias |
| 5 | Gás e Equidade (canal 2) com constantes | 3, `equivalences.yaml` | 2–3 dias |
| 6 | Loader de dado social | fonte MDS confirmada | 2 dias |

As Fases 0 a 2 sozinhas já entregam a sensação de "mapa que respira", sem nenhum dado novo.

---

# Parte II — Catálogo ampliado de transições e navegação

> As seções 14 a 24 ampliam a Parte I. Reaproveitam o mesmo motor (Fase 0), o mesmo
> `choroplethTransition` (Fase 1) e o mesmo `FlowParticleLayer` (Fase 3). Nenhuma exige
> dependência nova. Cada item tem uma prioridade: **A** (alto impacto, baixo custo), **B** e **C**.

Princípio adicional para esta parte:

| # | Princípio | Regra prática |
|---|---|---|
| P8 | A transição explica a mudança | Quando o usuário troca de modo, a animação deve mostrar *o que* o novo modo representa (de onde veio cada cor, cada bolha, cada classe), não só suavizar a troca. |

---

## 14. Transições entre modos de visualização

Hoje o mapa tem coroplético de biogás, tipologia, regime, perfil C/N, bivariado, bolhas e heatmap
(`ColorModeSelector.tsx`, `BubbleChartLayer.tsx`, `HeatmapLayer.tsx`, `TypologyChoroLayer.tsx`,
`CnChoroLayer.tsx`). Trocar entre eles é hoje um corte seco. Matriz proposta:

| De → Para | Transição | Prioridade |
|---|---|---|
| Contínuo → contínuo (troca de métrica/substrato) | Interpolação OKLab com cascata por ranking (Fase 1) | A |
| Contínuo → categórico (tipologia, regime) | Não interpolar cores de significado diferente. Primeiro esmaecer para o neutro (`DURATION.short`), depois **acender classe por classe**, sincronizado com o item da legenda que se destaca naquele momento. O usuário aprende a legenda enquanto ela é aplicada. | A |
| Categórico → categórico | Municípios que **mudam de classe** fazem a transição; os que ficam na mesma classe permanecem parados e recebem um leve pulso. Revela a estabilidade entre as duas classificações. | B |
| Univariado → bivariado | **Montagem em três tempos**: (1) só a variável A na rampa horizontal; (2) só a variável B na rampa vertical; (3) as duas se combinam na matriz 3×3 e a legenda bivariada se monta junto. Resolve a principal dificuldade do bivariado, que é a leitura da legenda. | A |
| Coroplético → bolhas | O preenchimento esmaece até um tom de contexto enquanto as bolhas **crescem a partir do centróide** (raio de 0 ao valor, cascata por valor). Inverso: as bolhas encolhem para o centróide enquanto o preenchimento volta. | A |
| Coroplético → heatmap | Crossfade de opacidade; o raio do kernel do heatmap cresce de 0 ao valor final. | B |
| Coroplético → cartograma de Dorling (modo novo) | (1) polígonos esmaecem e um círculo surge em cada centróide; (2) os círculos crescem até a área ∝ valor; (3) uma relaxação de colisão os afasta até não se sobreporem. Inverso no caminho de volta. Posições finais calculadas no cliente para SP e MG (≤ 900 círculos, relaxação simples em ~60 iterações) e pré-calculadas no backend para o escopo nacional. | B |
| Troca de escopo (SP → MG → nacional) | (1) a câmera recua até enquadrar os dois escopos; (2) o escopo antigo esmaece para o cinza de contexto; (3) o novo acende em onda a partir da fronteira comum; (4) a câmera enquadra o novo. | A |
| Troca de cenário (teórico → acessível) | Cascata por **perda relativa**: os municípios que mais perdem potencial mudam primeiro. Um contador de "potencial perdido no estado" desce junto. (Liga ao funil de níveis discutido no plano.) | A |

Nota: tipologia, perfil C/N e regime são modos beta, visíveis só com sessão (commit 3fe4072); os
dados respondem 401 sem login. As transições para esses modos só existem para usuários logados, e
o orquestrador não deve pré-buscar esses dados sem sessão.

Implementação: um `ModeTransitionOrchestrator` que recebe `(fromMode, toMode)` e devolve uma
sequência de passos (`fade`, `stagger-by`, `grow-from-centroid`, `relax`, `camera`), executados pelo
motor da Fase 0. Cada passo pode ser pulado (reduced-motion ou clique do usuário durante a
sequência, que vai direto ao estado final).

---

## 15. Legenda como controle (não só como chave)

| Ideia | Comportamento | Prioridade |
|---|---|---|
| Legenda que destaca | Hover sobre uma classe da legenda: os municípios daquela classe ficam em destaque e o resto esmaece (canal de opacidade da Fase 1). Clique fixa o filtro. | A |
| Legenda-histograma | Abaixo da rampa, um histograma com o número de municípios por classe. Ao trocar de métrica, as barras se reorganizam (FLIP) e as quebras deslizam para as novas posições. Mostra a distribuição, não só as cores. | A |
| Quebras animadas | Alternar entre quantis, quebras naturais (Jenks) e intervalos iguais: as quebras se movem na rampa e o mapa se recolore em cascata. Ótimo para ensinar que a classificação muda a leitura. | B |
| Marcador do selecionado | Um triângulo na rampa indica o valor do município selecionado e desliza quando a métrica muda. | A |
| Faixa de filtro | Arrastar duas alças na rampa define um intervalo; municípios fora dele esmaecem em tempo real. | B |

---

## 16. Navegação e câmera

### 16.1 Histórico do navegador
Hoje o estado vai para a URL com `history.replaceState` (`MapComponent.tsx`, várias chamadas). Isso
permite compartilhar o link, mas o botão **Voltar** sai do mapa em vez de desfazer o último passo.
- Usar `pushState` para passos **discretos e significativos** (selecionar município, abrir
  comparação, trocar de modo ou escopo) e manter `replaceState` para ajustes contínuos (opacidade,
  pan e zoom).
- No `popstate`, aplicar o estado anterior **com a transição inversa** (o holofote se desfaz, a
  câmera volta). Voltar passa a funcionar como "desfazer animado". **A**

### 16.2 Regras de câmera
Centralizar num `cameraController.ts`:
- se o alvo já está inteiro no viewport: **não mover**, só pulsar o contorno;
- se está perto (< 1 viewport de distância): `panTo` curto;
- se está longe: `flyToBounds` com duração proporcional à distância, limitada entre 0,6 s e 1,4 s
  (hoje: 0,6 s em `MapComponent.tsx` e 1,2 s em `MunicipalityHighlight.tsx`, sem regra comum);
- sempre descontar o painel lateral e a bottom sheet do enquadramento (estender o `fitPadding`
  existente);
- uma interação do usuário (arrastar, roda do mouse) cancela o voo imediatamente. **A**

### 16.3 Zoom semântico
- Em zoom baixo, mostrar as **regiões intermediárias** agregadas (a camada já existe); ao aproximar,
  cada região "se abre" em municípios com um fade em cascata a partir do centro da região. Ao
  afastar, os municípios se fundem de volta. Reduz a poluição visual no escopo nacional. **B**
- Rótulos progressivos: em cada nível de zoom, só os N municípios de maior valor ganham rótulo
  (com valor), com fade de entrada e saída e prevenção de colisão. **B**

### 16.4 Navegação espacial por teclado
- Com um município selecionado, as **setas** levam ao vizinho naquela direção (vizinho contíguo
  cujo azimute de centróide mais se aproxima da direção da seta). A câmera acompanha com `panTo`.
- `aria-live="polite"` anuncia "Campinas, 412 GWh/ano, 3º no estado".
- Atalhos: `/` foca a busca, `Esc` limpa a seleção, `[` e `]` trocam de substrato. Documentar no
  tour e numa folha de atalhos (`?`).
- **Regra para todo atalho** (lição do commit 3fe4072, que removeu o `C` porque Ctrl+C abria a
  comparação): só disparar com o foco no mapa ou no painel do mapa; ignorar se houver qualquer
  modificador (`ctrlKey`, `metaKey`, `altKey`) ou se o alvo for editável (`input`, `textarea`,
  `contenteditable`). **Não reintroduzir o atalho de comparação** por letra única; o botão
  Comparar continua sendo o caminho. Cobrir com o mesmo padrão de teste de `MapComponent.test.tsx`
  (`describe('Keyboard')`).
- Isso é acessibilidade e também uma forma rápida de explorar para usuários avançados. **A**

### 16.5 Busca com pré-visualização
Enquanto o usuário digita, os municípios que casam com o texto pulsam no mapa (sem mover a câmera).
Setas no menu de resultados destacam o município correspondente; Enter voa até ele. **A**

### 16.6 Mapa de localização (inset)
Um mini-mapa do estado no canto, com o retângulo do viewport atual. Clicar ou arrastar o retângulo
move a câmera. Útil em zoom alto e no mobile. **C**

---

## 17. Hover e tooltip

| Ideia | Comportamento | Prioridade |
|---|---|---|
| Intenção antes do hover | Atraso de 60–80 ms antes de destacar, para não piscar ao varrer o mapa com o mouse. | A |
| Tooltip com mola | A tooltip segue o cursor com leve atraso (mola criticamente amortecida), sem saltar de município em município; o conteúdo faz crossfade. | B |
| Hover em dois níveis | Passagem rápida: nome e valor. Pausa de 300 ms: tooltip rica com posição no ranking, mini-barra dos 3 principais substratos e a comparação com a mediana do estado. | A |
| Contexto de vizinhança | Durante o hover, os vizinhos contíguos ganham um contorno leve: mostra o contexto local sem clicar. | C |
| Hover sincronizado | Hover numa linha da tabela, do ranking ou de um gráfico destaca o município no mapa, e vice-versa (um único `hoveredCdMunStore`). | A |

---

## 18. Carregamento, vazios e erros

- **Carregamento como transição:** primeiro as fronteiras chegam em cinza de contexto; quando os
  valores chegam, as cores "entram" em cascata por ranking. O tempo de espera vira parte da
  animação. Combinar com o `MapLoadingSkeleton` existente. **A**
- **Pré-busca na intenção:** ao passar o mouse sobre um item do menu de substrato ou de modo, chamar
  `queryClient.prefetchQuery` (react-query já está no projeto). Quando o clique acontece, a
  transição começa sem espera. **A**
- **Transição otimista:** ao clicar, iniciar imediatamente a fase de esmaecimento ou a câmera
  enquanto os dados chegam; se a resposta demorar mais que a animação, manter um pulso sutil de
  "carregando" na legenda, não um spinner sobre o mapa. **B**
- **Sem dado ≠ zero:** municípios sem dado com contorno tracejado e preenchimento mais claro (o
  canvas do Leaflet não faz hachura nativa; uma hachura exigiria uma camada de padrão separada).
  Tooltip explica o motivo ("PPM não informa", "fora do escopo"). **B**
- **Erro de rede:** manter o último estado visível, esmaecido, com uma faixa "não foi possível
  atualizar · tentar de novo". Nunca deixar o mapa em branco. **A**

---

## 19. Painéis, layout e mobile

- **Bottom sheet com pontos de encaixe** (`MobileBottomSheet.tsx`): física de mola entre recolhida,
  meia altura e cheia. A câmera **recentraliza o selecionado** na área visível do mapa quando a sheet
  muda de altura. **A**
- **Painel que não empurra o mapa:** o painel lateral entra por `transform` sobre o mapa e a câmera
  compensa o deslocamento, em vez de redimensionar o container (redimensionar força
  `invalidateSize` e um redesenho completo do canvas). **B**
- **Resumo fixo:** ao rolar o perfil do município, um cabeçalho compacto (nome, valor, ranking)
  permanece visível, com transição de tamanho. **B**
- **Comparação com cortina (swipe):** arrastar uma divisória vertical revela o município A com uma
  métrica e o B com outra, ou o mesmo território em dois cenários. Requer duas camadas e
  `clip-path` no canvas de cada uma. **C**

---

## 20. Leitura visual e hierarquia

- **Profundidade sutil:** sombra suave abaixo do município selecionado (desenho extra no canvas com
  `shadowBlur`), que o "eleva" acima do resto. **B**
- **Contraste no holofote:** ao esmaecer o resto do mapa, manter as fronteiras visíveis (opacidade
  da linha ≥ 0,4) para não perder a referência espacial. Verificar o contraste em modo escuro e nas
  paletas CVD. **A**
- **Infraestrutura em camadas de importância:** em zoom baixo, só gasodutos troncais e linhas de alta
  tensão; os demais entram com fade conforme o zoom. **B**
- **Destaque de infraestrutura próxima:** ao selecionar um município, a subestação, o trecho de
  gasoduto e a usina mais próximos acendem, e uma linha tracejada se desenha até cada um, com a
  distância. Conecta a seleção com a pergunta "e como a energia sai daqui?". **A**

---

## 21. Narrativa e compartilhamento

- **Gravar uma sequência:** o usuário navega (seleciona, troca de cenário, compara) e o mapa grava os
  estados da URL; depois, "reproduzir" refaz a sequência com as transições. Vira apresentação para
  banca, reunião ou aula sem slides. Reutiliza o histórico da seção 16.1. **B**
- **Tour guiado com transições** (`MapTour.tsx` com react-joyride): cada passo do tour dispara a
  transição correspondente em vez de só apontar para um botão. **B**
- **Link com estado de animação:** `?play=scenario` abre o mapa e executa a transição de cenário
  uma vez, útil para links em notícias e no site do CP2b. **C**
- **Exportação de imagem/GIF:** fica atrás do `DATA_EXPORT_ENABLED`, que está `false` durante o beta.
  Não reabrir por esta spec. **—**

---

## 22. Configuração de movimento pelo usuário

Um controle em Configurações e no menu do mapa:
- **Animações:** completas · reduzidas (só fades curtos, sem partículas nem câmera longa) ·
  desligadas.
- **Velocidade:** 0,5× · 1× · 1,5× (multiplicador sobre os tokens de duração).
- O padrão segue `prefers-reduced-motion`; a escolha manual tem prioridade e é guardada localmente
  (com `try/catch`, pois o armazenamento pode falhar). **A**

---

## 23. Medir se ajudou

Usar `src/lib/analytics.ts` (já existe, respeitando `consent.ts`), apenas com eventos agregados e
sem dado pessoal:
- tempo até a primeira seleção de município;
- número de trocas de modo por sessão e quais pares de modos são usados;
- uso de teclado e de "Voltar" no mapa;
- proporção de sessões com animações reduzidas ou desligadas;
- abandono durante transições longas (clique de pular).

Critério de sucesso sugerido: mais trocas de modo por sessão **sem** aumento do tempo até a primeira
seleção. Se uma transição for pulada em mais de 30% das vezes, ela está longa demais.

---

## 24. Testes adicionais (somar à seção 10.4)

7. **Voltar desfaz:** selecionar município → `page.goBack()` → seleção limpa, sem sair da rota do
   mapa, `completedTransitions` incrementou.
8. **Teclado:** com um município selecionado, `ArrowRight` seleciona um vizinho contíguo; a região
   `aria-live` anuncia o nome.
9. **Legenda que destaca:** hover num item da legenda reduz a opacidade dos municípios de outras
   classes (ler pelo debug hook: `dimmedCount > 0`).
10. **Pré-busca:** hover no item de substrato dispara uma requisição antes do clique
    (`page.waitForRequest`).
11. **Erro de rede:** `page.route` falhando a API de valores → o mapa mantém o último estado e mostra
    a faixa de erro.
12. **Configuração de movimento:** "desligadas" → nenhuma transição com quadros intermediários,
    mesmo sem `prefers-reduced-motion`.
13. **Mobile** (`mobile-chrome`): expandir a bottom sheet mantém o município selecionado visível no
    mapa (bounding box do selecionado dentro da área livre).

---

## 25. Sequência atualizada

| Fase | Entrega | Itens | Depende de |
|---|---|---|---|
| 0–2 | Fundação, coroplético, seleção | Parte I | — |
| 7 | Navegação essencial | 16.1 histórico, 16.2 câmera, 16.4 teclado, 16.5 busca, 22 configuração | 0 |
| 8 | Legenda viva e hover | 15 (A), 17 (A), 20 contraste e infraestrutura próxima | 1 |
| 9 | Transições entre modos | 14 (A): categórico, bivariado em três tempos, bolhas, escopo, cenário | 1 |
| 10 | Carregamento e mobile | 18 (A), 19 bottom sheet | 0, 7 |
| 3–6 | Fluxos de Energia | Parte I | 0 |
| 11 | Itens B e C | Dorling, zoom semântico, swipe, gravação de sequência, inset | 9, 10 |

Ordem recomendada: **0 → 1 → 2 → 7 → 8 → 9 → 10**, e só então o motor de partículas (3) e os modos
de energia (4–6). As fases 7 a 10 entregam a maior parte da melhoria de navegação percebida, com
dados que já existem.
