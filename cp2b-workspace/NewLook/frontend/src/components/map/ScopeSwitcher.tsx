/**
 * ScopeSwitcher — pick the map's geographic scope: São Paulo (default),
 * any single state, or the whole country. Compact button + dropdown; works
 * in the desktop top bar and the mobile top bar alike.
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, MapPin, Check } from 'lucide-react';
import {
  BRAZIL_STATES,
  SAO_PAULO_UF,
  SCOPE_BRAZIL,
  getState,
  type MapScope,
} from '@/data/brazilStates';

interface ScopeSwitcherProps {
  scope: MapScope;
  onScopeChange: (scope: MapScope) => void;
  /** Municipality count currently shown, for the summary line. */
  count?: number;
  className?: string;
}

const REGION_ORDER = ['Sudeste', 'Sul', 'Centro-Oeste', 'Nordeste', 'Norte'] as const;

export default function ScopeSwitcher({ scope, onScopeChange, count, className = '' }: ScopeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label =
    scope === SCOPE_BRAZIL
      ? 'Brasil (todos)'
      : getState(scope)?.nome ?? 'São Paulo';
  const shortLabel =
    scope === SCOPE_BRAZIL ? 'BR' : getState(scope)?.sigla ?? 'SP';

  const pick = (next: MapScope) => {
    onScopeChange(next);
    setOpen(false);
  };

  const grouped = REGION_ORDER.map((regiao) => ({
    regiao,
    states: BRAZIL_STATES.filter((s) => s.regiao === regiao),
  }));

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Alterar abrangência do mapa"
        className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/95 px-3 py-2.5 text-sm font-semibold text-gray-800 shadow-lg ring-1 ring-black/5 backdrop-blur transition-colors hover:bg-white md:min-h-0 md:py-1.5 dark:bg-slate-800/95 dark:text-gray-100"
      >
        <MapPin className="h-4 w-4 text-[#1E5128] dark:text-emerald-400" />
        <span className="max-w-[9rem] truncate">{label}</span>
        <span className="rounded bg-[#1E5128]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#1E5128] dark:bg-emerald-400/15 dark:text-emerald-300">
          {shortLabel}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-[1200] mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-xl bg-white p-1.5 shadow-2xl ring-1 ring-black/10 dark:bg-slate-800"
        >
          {/* Focus scope */}
          <button
            role="option"
            aria-selected={scope === SAO_PAULO_UF}
            onClick={() => pick(SAO_PAULO_UF)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              scope === SAO_PAULO_UF
                ? 'bg-[#1E5128] text-white'
                : 'text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <span>⭐ São Paulo (foco)</span>
            {scope === SAO_PAULO_UF && <Check className="h-4 w-4" />}
          </button>

          <button
            role="option"
            aria-selected={scope === SCOPE_BRAZIL}
            onClick={() => pick(SCOPE_BRAZIL)}
            className={`mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              scope === SCOPE_BRAZIL
                ? 'bg-[#1E5128] text-white'
                : 'text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <span>🇧🇷 Brasil (todos os estados)</span>
            {scope === SCOPE_BRAZIL && <Check className="h-4 w-4" />}
          </button>

          <div className="my-1.5 border-t border-gray-100 dark:border-slate-700" />

          {grouped.map(({ regiao, states }) => (
            <div key={regiao} className="mb-1">
              <p className="px-3 pb-0.5 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                {regiao}
              </p>
              {states.map((s) => {
                const active = scope === s.code;
                return (
                  <button
                    key={s.code}
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(s.code)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? 'bg-[#1E5128] text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-7 text-xs font-bold opacity-60">{s.sigla}</span>
                      <span>{s.nome}</span>
                    </span>
                    {active && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          ))}

          {typeof count === 'number' && (
            <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-slate-700 dark:text-gray-400">
              {count.toLocaleString('pt-BR')} municípios exibidos
            </p>
          )}
        </div>
      )}
    </div>
  );
}
