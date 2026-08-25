# e-MAG ↔ WCAG 2.1 alignment — PILAR-2b / CP2B Maps

> Shows how the platform aligns with the Brazilian Government Electronic
> Accessibility Model (**e-MAG 3.1**) and WCAG 2.1, supporting the Lei Brasileira
> de Inclusão (Lei 13.146/2015, art. 63) and UNICAMP institutional guidelines.
> e-MAG is based on WCAG, so its recommendations map closely. Status as of
> 2026-06-25.

## Conformance target
WCAG 2.1 **Level A** (current target, largely met) → **Level AA** in progress.
e-MAG conformance is assessed by the same POUR principles.

## Mapping by e-MAG section

| e-MAG section | Related WCAG SC | Status | Evidence / note |
|---|---|---|---|
| 1. Marcação (semantic markup) | 1.3.1, 4.1.1, 4.1.2 | ✅ Met | Semantic HTML; 262 ARIA attributes; valid DOM. |
| 2. Comportamento (DOM/scripts) | 2.1.1, 3.2.x | ◐ Partial | UI keyboard-operable; **map** keyboard support is the open gap (data-table alternative provided). |
| 3. Conteúdo / informação | 1.1.1, 1.3.x, 2.4.x | ◐ Partial | Skip-link site-wide; headings/labels; **gap:** expand `alt`/chart text summaries. |
| 4. Apresentação / design | 1.4.1, 1.4.3, 1.4.11 | ◐ Partial | Colour paired with text; primary contrast high; **AA non-text contrast** verification pending. |
| 5. Multimídia | 1.2.x | ✅ N/A | No audio/video content. |
| 6. Formulário | 1.3.1, 3.3.1, 3.3.2, 4.1.2 | ✅ Met | Labels associated (`htmlFor`); `aria-invalid` + `role=alert`; required fields marked. |

## Key e-MAG recommendations — checklist

| Recommendation | Status |
|---|---|
| Provide a “skip to content” link | ✅ Site-wide (in the shared layout) |
| Declare the page language | ✅ `<html lang>` per locale (pt-BR/en) |
| Visible keyboard focus | ✅ Focus styles throughout |
| Respect reduced-motion preference | ✅ `prefers-reduced-motion` honoured |
| Alternative text for images/charts | ◐ Expand coverage (open) |
| Keyboard-operable interactive components | ◐ Map alternative provided; native map keyboard support open |
| Sufficient colour contrast | ◐ Primary met; AA full pass pending |

## Open accessibility backlog (to reach full A + AA)
1. Alt text / aria-labels on all images, icon-only buttons, and chart summaries (WCAG 1.1.1).
2. Map keyboard operability + keep the data-table/ranking alternative documented (WCAG 2.1.1).
3. AA verification: non-text contrast (1.4.11), reflow at 320px/200% (1.4.10/1.4.4), target sizes (2.5.5/2.5.8), status-message coverage (4.1.3).

## Evaluation method
Automated checks in CI (jest-axe, eslint-plugin-jsx-a11y, @axe-core/react) plus
manual keyboard and screen-reader review (NVDA / VoiceOver). See
`docs/qa/ACCESSIBILITY.md` for developer guidelines.
