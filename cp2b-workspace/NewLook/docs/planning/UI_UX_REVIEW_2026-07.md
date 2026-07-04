# PILAR-2b — Frontend UI/UX Review & Improvement Plan

> Grounded review of the live web-map's interaction model, written from the
> actual component code (2026-07-04). Focus areas requested: the floating
> municipality window, the municipality detail sidebar, and mobile usability.
> Companion to `BRAZIL_EXPANSION_ROADMAP.md` — several items here are the
> frontend half of the "single-state assumptions" and "map rendering" limits.

_Reviewer session: 2026-07-04. Owner: Lucas Nakamura Cerejo._

---

## 1. How the map surfaces municipality data today (as-built)

Three distinct surfaces, wired in `MapComponent.tsx` → `MunicipalityLayer.tsx`:

| Surface | Trigger | Component | Dark mode | Notes |
|---|---|---|---|---|
| **Hover tooltip** | mouse hover (desktop) | `EnhancedTooltip.tsx` | ✅ | Glass-morphism, rich, well-designed. Follows cursor. |
| **Detail panel** | click (desktop **and** mobile) | `MunicipalityProfilePanel.tsx` | ✅ | Right slide-in, full-height, modal backdrop. The primary detail view. |
| **In-map popup** | click, *only when no click handler bound* | `dashboard/MunicipalityPopup.tsx` | ❌ | Tiny 9–10 px text. **Effectively dead** — see §2.2. |

Click/hover handlers (`handleMunicipalityClick` / `handleMunicipalityHover`) are
passed to `MunicipalityLayer` **unconditionally** except in clusters mode
(`MapComponent.tsx:546-547`). Because `MunicipalityLayer` only binds the Leaflet
popup/tooltip *when the corresponding handler is absent*
(`MunicipalityLayer.tsx:189, 204`), on both desktop and mobile a tap opens the
**profile panel**, not the popup. `MunicipalityPopup` therefore almost never
renders.

**What's genuinely good and should be kept:**
- The hover→tooltip, click→panel split is the right model for a data map.
- `EnhancedTooltip` and `MunicipalityProfilePanel` both support dark mode, use
  collapsible sections, progress bars for sector composition, and BRL/number
  formatting via `toLocaleString('pt-BR')`.
- Mobile has a purpose-built `MobileBottomSheet` (tab bar → filters/layers) and
  a `QuickFilterBar` — a real mobile layout, not a squished desktop.
- `Escape` closes the panel (`MapComponent.tsx:239`); `prefers-reduced-motion`
  is honored in `globals.css`.

---

## 2. Concrete issues found (with file:line)

### 2.1 Two current single-state bugs in the detail panel

These affect **São Paulo today** and will silently spread at national scale.

1. **Broken IBGE link for most municipalities** —
   `MunicipalityProfilePanel.tsx:338`
   ```ts
   href={`https://cidades.ibge.gov.br/brasil/sp/${props.name.toLowerCase()}/panorama`}
   ```
   IBGE slugs are deburred + hyphenated. `"Ribeirão Preto".toLowerCase()`
   yields `ribeirão preto` (accent + space) → **404**. Correct slug is
   `ribeirao-preto`. Breaks for every name with an accent or space (i.e. most
   of them). Fix: a `slugify()` that strips diacritics
   (`normalize('NFD').replace(/[̀-ͯ]/g,'')`) and replaces spaces with
   `-`. The `/sp/` segment must also become `props.uf` once the state dimension
   lands (roadmap migration 021).

2. **Hardcoded state label** — `MunicipalityProfilePanel.tsx:119`
   `"Município de São Paulo"` is a literal string. At national scale every
   municipality will read "São Paulo". Should render the state from
   `props.uf` / `props.state_name`. *(Add these two to the roadmap's §1
   "single-state assumptions" table — they aren't listed there yet.)*

### 2.2 The floating popup is redundant, tiny, and un-themed

`MunicipalityPopup.tsx` uses `text-[9px]`/`text-[10px]` throughout (18 files in
the codebase use this micro-type) and has **no dark-mode variants**. It is also
the odd one out — the panel and tooltip already cover click and hover. Because
it rarely binds (§1), it's maintenance debt that will drift from the other two.
**Decision needed:** either (a) retire it, or (b) repurpose it as the mobile
"peek" card (§3). Micro-typography below ~12 px also fails the readability bar
the project's own `docs/qa/ACCESSIBILITY.md` sets.

### 2.3 The detail panel is a modal that hides the map

`MunicipalityProfilePanel.tsx:106-112` renders a full-screen
`bg-black/30 backdrop-blur-sm` backdrop, so opening a municipality **blurs and
covers the entire map**. For a geospatial tool the map *is* the context —
you want to read Piracicaba's numbers while still seeing its neighbours. On
desktop this should be a **non-modal dockable panel** (map stays interactive,
no backdrop). Keep the full-cover treatment for mobile only.

### 2.4 Accessibility gaps in the primary panel

The panel has **no `role="dialog"`, `aria-modal`, `aria-label`, or focus
management** (confirmed: no matches in the file). Yet `CookieConsent.tsx`,
`VideoModal.tsx`, and `FloatingFilterPanel.tsx` already do this correctly — so
the main data surface is *behind* the rest of the app on a11y. Missing:
focus trap while open, focus return to the polygon/trigger on close, and the
dialog role screen-readers need. This undercuts the WCAG-AA claim in
`docs/qa/ACCESSIBILITY.md`.

### 2.5 No shared breakpoint hook — mobile logic is ad-hoc

There is **no `useMediaQuery`/`useIsMobile` hook** (grep: none). Mobile behavior
is split between Tailwind `md:` classes and inline `window.innerWidth < 768`
reads (`MunicipalityLayer.tsx:186`) that **don't react to resize/rotation** and
run at feature-bind time. A single reactive `useIsMobile()` would make "which
surface opens", popup width, and panel mode consistent and rotation-safe.

### 2.6 Tooltip has no edge-collision handling

`EnhancedTooltip.tsx:46` positions with a fixed `left:x+15 / top:y-10` and
`translateY(-100%)`, no flip near viewport edges — a 320–400 px card near the
right or top edge overflows. Add simple boundary flipping (place left/below when
near an edge).

---

## 3. Mobile usability — the biggest opportunity

Today, tapping a municipality on mobile throws up the **full-screen** profile
panel (`w-full`), which completely replaces the map. There is no lightweight way
to glance at a value and keep exploring — every tap is a full context switch,
and the "Ver Perfil Completo" CTA is far below the fold.

**Recommended: a snap-point bottom sheet for municipality data.**
- Peek (~25 vh): name + headline potential + category chip + sector mini-bars.
- Half (~55 vh): the current "Visão Geral" + "Disponibilidade de Biomassa".
- Full: everything, same content as the desktop panel.
- Drag handle + swipe-to-dismiss; the map stays visible above the peek.

The project already has `MobileBottomSheet.tsx` (for filters/layers) as a
pattern to copy — this is a *sibling* sheet for municipality detail, not a
rewrite. This also gives `MunicipalityPopup`'s compact layout a real home
(§2.2b). Other mobile items: `MobileBottomSheet` is fixed `h-[60vh]` with no
snap/drag and no dark mode; add a drag handle and snap points there too for
consistency.

---

## 4. Cross-cutting UX enhancements (as the platform expands)

Framed against the national expansion (5,570 municipalities, more layers):

1. **Desktop dockable detail + "pin to compare".** Convert the modal (§2.3) to
   a docked right panel; add a pin so 2–4 municipalities can be compared
   side-by-side from the panel itself (feeds the existing `ComparisonPanel`).
2. **Location breadcrumb in the panel header:** `Estado ▸ Região intermediária
   ▸ Município`. Trivial now (region is already shown), essential at national
   scale for orientation, and it naturally consumes the new `uf` field.
3. **First-class "find my municipality".** At 645 the search is a convenience;
   at 5,570 it's the primary entry point. Promote search, add
   geolocation ("municipalities near me"), and recent/favorites.
4. **Honest empty/zero states.** Many fields render `N/A`. Distinguish
   "genuinely zero" from "not yet ingested" (the roadmap's staged ingest means
   many municipalities will be pre-data for months) with a small "sem dados —
   fonte pendente" affordance rather than a bare `N/A`.
5. **"What am I looking at?" affordance.** As layers multiply (MapBiomas,
   restricted areas, infrastructure), a persistent legend + one-line
   layer-purpose helper prevents the map from becoming inscrutable.
6. **Unify the three surfaces.** One number-format util and one set of design
   tokens (spacing, type scale, sector colors) shared by tooltip, panel, and
   the mobile sheet — right now each re-implements `formatTons`/percent bars
   with slightly different rules.
7. **Panel loading skeletons.** Once per-municipality detail is API-fetched
   (not baked into the choropleth GeoJSON — the roadmap's tile migration), the
   panel needs a skeleton state; add it when that fetch is introduced.

---

## 5. Prioritized backlog

**P0 — current bugs / quick wins (hours each, no data dependency):**
- [ ] Fix the IBGE slug (`slugify` + diacritics strip) — §2.1.1. *Live bug.*
- [ ] Add `role="dialog"` + `aria-modal` + focus trap/return to the profile
      panel (copy the pattern from `VideoModal.tsx`) — §2.4.
- [ ] Add viewport edge-flipping to `EnhancedTooltip` — §2.6.
- [ ] Introduce `useIsMobile()` and replace inline `innerWidth` reads — §2.5.
- [ ] Decide the fate of `MunicipalityPopup` (retire vs. mobile peek) — §2.2.

**P1 — structural UX (fits Sep "rendering" / MapLibre work):**
- [ ] Desktop: modal → non-modal dockable panel (map stays visible) — §2.3.
- [ ] Mobile: snap-point municipality bottom sheet — §3.
- [ ] Location breadcrumb + de-hardcode the state label (needs `uf`) — §2.1.2.

**P2 — expansion-facing (Aug–Oct, as `uf`/national data lands):**
- [ ] Pin-to-compare from the panel — §4.1.
- [ ] Empty/"pending-source" states — §4.4.
- [ ] Promote search + geolocation entry point — §4.3.
- [ ] Shared format/token module across the three surfaces — §4.6.

**Sequencing note:** P0 is safe to do now against SP data. P1's dockable-panel
and mobile-sheet work is best landed *just before* the September MapLibre
migration so the detail surfaces are rebuilt once, on the new map, not twice.
