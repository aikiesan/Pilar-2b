'use client';

/**
 * The six tabs of a data product page (Visão geral · Método · Legenda e
 * códigos · Acesso aos dados · Estatísticas · Validação e limitações).
 *
 * ARIA tabs pattern with automatic activation: arrow keys move between tabs,
 * Home/End jump to the ends, and only the active tab is in the tab order. The
 * panels are rendered by the server and passed in; the hidden ones stay in the
 * document, so they are indexed and print. Each tab has a hash (#metodo …), so
 * a tab can be linked to and the back button returns to it.
 */
import { useId, useRef, useSyncExternalStore, type ReactNode } from 'react';

export interface ProductTab {
  /** Stable id, also the URL hash. */
  id: string;
  label: string;
  panel: ReactNode;
}

function subscribeToHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const readHash = () => window.location.hash;

// No element carries a tab's id, so setting the hash does not scroll. Kept out
// of the component: the hash is an external store, written like one.
const writeHash = (id: string) => {
  window.location.hash = id;
};

export default function ProductTabs({ tabs, label }: { tabs: ProductTab[]; label: string }) {
  // The URL hash is the state: a tab can be linked to, and back/forward move
  // between tabs. No hash (or an unknown one) is the first tab.
  const hash = useSyncExternalStore(subscribeToHash, readHash, () => '');
  const found = tabs.findIndex((tab) => `#${tab.id}` === hash);
  const active = found >= 0 ? found : 0;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = useId();

  const select = (index: number, focus: boolean) => {
    writeHash(tabs[index].id);
    if (focus) tabRefs.current[index]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    select(next, true);
  };

  return (
    <div>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label={label} className="flex min-w-max gap-1 border-b border-line">
          {tabs.map((tab, index) => {
            const selected = index === active;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(index, false)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={`-mb-px min-h-[44px] whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terra-600 ${
                  selected
                    ? 'border-terra-600 text-ink dark:border-terra-400'
                    : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={index !== active}
          tabIndex={0}
          className="pt-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
