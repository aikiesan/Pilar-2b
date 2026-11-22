# Chave das análises (Parte 1): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Esconder do público as análises bivariadas, as perguntas da home e o `/explore`, com uma única chave de configuração (`MAP_ANALYSES_ENABLED = false`), para que o PR 1, o #32 e o PR 2 entrem no `main` sem publicar as análises.

**Architecture:** A chave segue o padrão de `METHOD_PAGES_ENABLED` em `src/lib/featureFlags.ts`. O mapa deixa de ler `?a=` e não passa `onAnalysisChange` ao painel, então a seção de análises, a legenda bivariada e o pedido a `/siting-indicators` somem juntos. A home não renderiza a seção das perguntas, e o `/explore` responde 404, como as páginas de método.

**Tech Stack:** Next.js 15 (App Router, next-intl), React, Jest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-22-login-com-aprovacao-design.md`, seção "Parte 1".

## Global Constraints

- O nome da chave é `MAP_ANALYSES_ENABLED`, com valor `false`, em `cp2b-workspace/NewLook/frontend/src/lib/featureFlags.ts`, documentada no mesmo estilo de `METHOD_PAGES_ENABLED`.
- **Nenhum commit durante a execução.** Só o Lucas faz commit, seguindo o guia `A:\Pilar-2b-limpo\COMMITS_2026-11-22.md`, que a Tarefa 4 atualiza.
- As Tarefas 1 e 2 mexem no worktree `A:\Pilar-2b-mapa` (branch `feat/map-polish`, tudo sem commit). A Tarefa 3 mexe no worktree `A:\Pilar-2b-limpo` (branch `feat/explore-entry-points`, PR #32) e só pode rodar depois que o PR 1 entrar no `main`.
- Não mudar o comportamento com a chave ligada: tudo o que funciona hoje com análises continua igual quando `MAP_ANALYSES_ENABLED = true`.
- Não tocar em `next-env.d.ts`.
- Comandos de teste rodam a partir de `cp2b-workspace/NewLook/frontend`.

## Review Focus

1. **Link antigo com outros parâmetros** (`/map?a=siting&m=3509502&scope=31`) com a chave desligada: o mapa abre normal, mantém `m` e `scope` e só tira `a`. O teste vai na Tarefa 1.
2. **O pedido a `/siting-indicators` não pode sair** com a chave desligada, nem com `?a=` na URL. O teste vai na Tarefa 1.
3. **Celular:** a entrada das análises existe só no `DesktopLeftPanel` (o `MobileBottomSheet` e o `ThematicMapMenu` não têm). Se o implementador achar outra entrada, ela também passa pela chave.
4. **A home sem a seção** não pode deixar nenhum link `map?a=` em outro ponto da página. O teste vai na Tarefa 2.
5. **`/explore` fora das rotas do e2e:** com a chave desligada, `e2e/routes.ts` não pode aquecer nem varrer `/en/explore` (daria 404 no a11y e no aquecimento). O teste vai na Tarefa 3.

---

### Task 1: chave e mapa (PR 1, `A:\Pilar-2b-mapa`)

**Files:**
- Modify: `cp2b-workspace/NewLook/frontend/src/lib/featureFlags.ts` (acrescentar a chave no fim)
- Modify: `cp2b-workspace/NewLook/frontend/src/components/map/MapComponent.tsx` (leitura de `?a=` perto da linha 336; prop `onAnalysisChange` do `DesktopLeftPanel` perto da linha 1037)
- Test: `cp2b-workspace/NewLook/frontend/src/components/map/MapComponent.test.tsx`

**Interfaces:**
- Produces: `export const MAP_ANALYSES_ENABLED: boolean` em `@/lib/featureFlags`, usado pelas Tarefas 2 e 3.

- [ ] **Passo 1: preparar os mocks do teste**

Em `MapComponent.test.tsx`:
- Fazer `useSitingIndicators` virar um `jest.fn` que se possa inspecionar: `const mockUseSitingIndicators = jest.fn(() => ({ data: undefined, isError: false }))`, e no mock do hook usar `useSitingIndicators: (enabled: boolean) => mockUseSitingIndicators(enabled)`.
- Fazer a chave controlável por teste: `let mockAnalysesEnabled = false` e `jest.mock('@/lib/featureFlags', () => ({ ...jest.requireActual('@/lib/featureFlags'), get MAP_ANALYSES_ENABLED() { return mockAnalysesEnabled } }))`.
- No mock do `DesktopLeftPanel`, receber também `activeAnalysis` e `onAnalysisChange`, e expor no `div` raiz `data-has-analyses={String(Boolean(onAnalysisChange))}` e `data-active-analysis={activeAnalysis ?? ''}`.
- No `beforeEach`, `mockAnalysesEnabled = false`.

- [ ] **Passo 2: escrever os testes que falham**

Novo `describe('Map analyses flag (MAP_ANALYSES_ENABLED)')`, usando os dados carregados do mesmo jeito que os testes de URL já existentes (linhas ~851–926):

```tsx
it('hides the analyses and drops ?a= when the flag is off', async () => {
  window.history.replaceState(null, '', '/map?a=siting&m=3509502&scope=31');
  render(<MapComponent />);
  const panel = await screen.findByTestId('desktop-left-panel');
  expect(panel).toHaveAttribute('data-has-analyses', 'false');
  expect(panel).toHaveAttribute('data-active-analysis', '');
  await waitFor(() => expect(window.location.search).not.toMatch(/(^|[?&])a=/));
  expect(window.location.search).toContain('m=3509502');
  expect(window.location.search).toContain('scope=31');
  expect(mockUseSitingIndicators).not.toHaveBeenCalledWith(true);
});

it('opens the analysis from ?a= when the flag is on', async () => {
  mockAnalysesEnabled = true;
  window.history.replaceState(null, '', '/map?a=lacuna');
  render(<MapComponent />);
  const panel = await screen.findByTestId('desktop-left-panel');
  expect(panel).toHaveAttribute('data-has-analyses', 'true');
  expect(panel).toHaveAttribute('data-active-analysis', 'lacuna');
});
```

- [ ] **Passo 3: rodar e ver falhar**

Run: `npx jest src/components/map/MapComponent.test.tsx -t "MAP_ANALYSES_ENABLED"`
Expected: FAIL. O primeiro teste falha em `data-has-analyses` (vem `true`) ou na importação da chave, que ainda não existe.

- [ ] **Passo 4: implementar**

- Em `featureFlags.ts`: `export const MAP_ANALYSES_ENABLED = false;` com um comentário no estilo dos outros. O comentário diz:
  - o que a chave segura: as análises bivariadas do mapa e o `?a=`, a seção de perguntas da home e o `/explore`;
  - por quê: as análises vão ficar atrás do login com aprovação (cita o spec);
  - que na Parte 2 a regra passa a ser "chave ligada e sessão aprovada";
  - que, ligando a chave, tudo volta junto.
- Em `MapComponent.tsx`:
  - `const urlAnalysis = MAP_ANALYSES_ENABLED ? readURLParam('a') : null;`
  - um `useEffect` de montagem que, com a chave desligada e `a` presente na URL, faz `params.delete('a')` e `history.replaceState`, mantendo os outros parâmetros;
  - `onAnalysisChange={MAP_ANALYSES_ENABLED ? handleAnalysisChange : undefined}` no `DesktopLeftPanel`.

  Com `activeAnalysis` sempre `null`, a legenda bivariada e `useSitingIndicators(true)` já não acontecem.

- [ ] **Passo 5: rodar e ver passar, depois a suíte inteira**

Run: `npx jest src/components/map/MapComponent.test.tsx`
Expected: PASS, incluindo os testes que já existiam.

Run: `npx jest && npx tsc --noEmit && npx eslint src`
Expected: `Tests: … passed` sem falhas (a referência é 1071 mais os 2 novos), tsc sem saída, eslint sem erros.

---

### Task 2: seção das perguntas na home (PR 2, `A:\Pilar-2b-mapa`)

**Files:**
- Modify: `cp2b-workspace/NewLook/frontend/src/app/[locale]/page.tsx` (seção `home-questions`, linhas ~208–236)
- Test: `cp2b-workspace/NewLook/frontend/e2e/landing.public.spec.ts`

**Interfaces:**
- Consumes: `MAP_ANALYSES_ENABLED` da Tarefa 1.

- [ ] **Passo 1: escrever o teste e2e**

Em `landing.public.spec.ts`, importar `MAP_ANALYSES_ENABLED` de `'../src/lib/featureFlags'` (como `navigation.public.spec.ts` faz com `METHOD_PAGES_ENABLED`) e acrescentar:

```ts
test('the home leaves the map questions out while analyses are held back', async ({ page }) => {
  test.skip(MAP_ANALYSES_ENABLED, 'analyses are public in this build')
  await page.goto('/pt-BR')
  await expect(page.locator('#home-questions')).toHaveCount(0)
  await expect(page.locator('a[href*="map?a="]')).toHaveCount(0)
})
```

- [ ] **Passo 2: implementar**

Envolver a `<section aria-labelledby="home-questions">` inteira em `{MAP_ANALYSES_ENABLED && ( … )}`. Se o import de `ANALYSES`, `ANALYSIS_IDS` ou do helper da linha ~59 ficar sem uso com a chave desligada, mantê-lo: a chave é constante de build e o código volta quando ela liga. Com a chave desligada, as demais faixas que levam ao mapa ("Abrir o mapa" no herói, no header e na faixa final) continuam.

- [ ] **Passo 3: verificar**

Run: `npx tsc --noEmit && npx eslint "src/app/[locale]/page.tsx" && npx jest`
Expected: limpo, e a suíte do jest sem falhas.

Run, com o Docker local `p2b_test` apontando para `A:\Pilar-2b-mapa` (porta 3006, reiniciar o container antes, porque o hot reload não pega): `npx playwright test e2e/landing.public.spec.ts`. Se o ambiente de e2e não estiver de pé, conferir à mão: `curl -s http://localhost:3006/pt-BR | grep -c 'map?a='` deve dar `0`.
Expected: o teste novo passa, ou o `grep` dá `0`.

---

### Task 3: `/explore` responde 404 (PR #32, `A:\Pilar-2b-limpo`, depois que o PR 1 entrar)

**Files:**
- Create: `cp2b-workspace/NewLook/frontend/src/components/explore/requireMapAnalyses.ts`
- Modify: `cp2b-workspace/NewLook/frontend/src/app/[locale]/explore/page.tsx`
- Modify: `cp2b-workspace/NewLook/frontend/e2e/routes.ts` (a linha `'/en/explore'`, que o #32 acrescentou)
- Test: `cp2b-workspace/NewLook/frontend/e2e/navigation.public.spec.ts`

**Interfaces:**
- Consumes: `MAP_ANALYSES_ENABLED` da Tarefa 1, já no `main`.
- Produces: `requireMapAnalyses(): void`, que chama `notFound()` com a chave desligada. É o mesmo formato de `src/components/method/requireMethodPages.ts`.

- [ ] **Passo 1: trazer o `main` para o branch** (o Lucas roda; o PR 1 já está no `main`)

```bash
cd /a/Pilar-2b-limpo
git fetch origin
git rebase origin/main
```

Esperado: se houver conflito, ele aparece em `messages/en.json` e `messages/pt-BR.json`, no fim do arquivo, onde o #32 acrescenta o bloco `explore`. A resolução é manter os dois lados: o conteúdo do `main` mais o bloco `explore`, que deve continuar sendo um JSON válido. Depois, `git add` nos dois arquivos e `git rebase --continue`.

- [ ] **Passo 2: escrever o teste e2e**

Em `navigation.public.spec.ts`, importar `MAP_ANALYSES_ENABLED` e acrescentar:

```ts
test.describe('/explore held back (MAP_ANALYSES_ENABLED off)', () => {
  test.skip(MAP_ANALYSES_ENABLED, 'analyses are public in this build')
  test('/explore answers 404 in either language', async ({ request }) => {
    for (const locale of ['pt-BR', 'en']) {
      expect((await request.get(`/${locale}/explore`)).status()).toBe(404)
    }
  })
})
```

- [ ] **Passo 3: implementar**

- Criar `requireMapAnalyses()` no arquivo novo, espelhando `requireMethodPages`.
- Em `explore/page.tsx`, chamar `requireMapAnalyses()` no início de `generateMetadata` e de `ExplorePage`, como faz `analysis/layout.tsx`.
- Em `e2e/routes.ts`, trocar `'/en/explore',` por `...(MAP_ANALYSES_ENABLED ? ['/en/explore'] : []),`, importando a chave.

- [ ] **Passo 4: verificar**

Run: `npx tsc --noEmit && npx eslint "src/app/[locale]/explore/page.tsx" src/components/explore e2e && npx jest`
Expected: limpo, e a suíte do jest sem falhas.

Run, com o `p2b_test` apontando para `A:\Pilar-2b-limpo`: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3006/pt-BR/explore`
Expected: `404`.

---

### Task 4: atualizar o guia de commits e as descrições dos PRs

**Files:**
- Modify: `A:\Pilar-2b-limpo\COMMITS_2026-11-22.md`
- Modify: `A:\Pilar-2b-limpo\pr1-body.md`, `pr2-body.md`, `pr32-body.md`

- [ ] **Passo 1: guia**

- **PR 1, commit 2:** acrescentar `$F/src/lib/featureFlags.ts` ao `git add`. A mensagem do commit ganha uma frase: "The analyses ship behind MAP_ANALYSES_ENABLED (off) until sign-in with approval exists."
- **PR 2:** nenhum arquivo novo, porque `page.tsx` e `landing.public.spec.ts` já entram nele. Acrescentar `$F/e2e/landing.public.spec.ts` ao `git add`. A mensagem do commit ganha: "The map questions section stays behind MAP_ANALYSES_ENABLED."
- **Seção nova "#32: rebase e chave",** depois do merge do PR 1. Ela traz:
  - os comandos do Passo 1 da Tarefa 3;
  - o `git add` de `page.tsx`, `requireMapAnalyses.ts`, `routes.ts` e `navigation.public.spec.ts`;
  - o commit `feat(explore): hold the page back with the map analyses flag`;
  - `git push --force-with-lease`, necessário depois do rebase.
- Atualizar a contagem de testes citada no guia para o número real da Tarefa 1.

- [ ] **Passo 2: descrições**

- **`pr1-body.md`:** um item no Summary: "**Held back.** The four analyses ship behind `MAP_ANALYSES_ENABLED` (off): `?a=` is ignored and dropped from the URL, the panel shows no analyses section and `/siting-indicators` is never requested. They return when sign-in with approval is ready (spec `docs/superpowers/specs/2026-11-22-login-com-aprovacao-design.md`)."
- **`pr2-body.md`:** no item "Sections", dizer que as quatro perguntas ficam atrás da mesma chave e não aparecem em produção.
- **`pr32-body.md`:** dizer que `/explore` responde 404 enquanto a chave estiver desligada, e ajustar o checklist de testes.
- Os números de testes citados nas três descrições devem ser os reais das Tarefas 1 a 3.

- [ ] **Passo 3: conferir**

Run: `grep -n "featureFlags\|MAP_ANALYSES_ENABLED\|force-with-lease" /a/Pilar-2b-limpo/COMMITS_2026-11-22.md /a/Pilar-2b-limpo/pr*-body.md`
Expected: aparece no commit 2 do PR 1, na seção do #32 e nas três descrições.
