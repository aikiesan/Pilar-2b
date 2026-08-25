/** Public scope switcher: canonical São Paulo plus the Minas Gerais pilot. */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin } from 'lucide-react';
import { getState, type MapScope } from '@/data/brazilStates';

interface ScopeSwitcherProps {
  scope: MapScope;
  onScopeChange: (scope: MapScope) => void;
  count?: number;
  className?: string;
}

const PUBLIC_SCOPES = ['35', '31'] as const;

export default function ScopeSwitcher({ scope, onScopeChange, count, className = '' }: ScopeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const state = getState(scope) ?? getState('35');

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (next: MapScope) => {
    onScopeChange(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Alternar entre São Paulo e Minas Gerais beta"
        className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/95 px-3 py-2.5 text-sm font-semibold text-gray-800 shadow-lg ring-1 ring-black/5 backdrop-blur transition-colors hover:bg-white md:min-h-0 md:py-1.5 dark:bg-slate-800/95 dark:text-gray-100"
      >
        <MapPin className="h-4 w-4 text-[#1E5128] dark:text-emerald-400" />
        <span className="max-w-[9rem] truncate">{state?.nome ?? 'São Paulo'}</span>
        <span className="rounded bg-[#1E5128]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#1E5128] dark:bg-emerald-400/15 dark:text-emerald-300">
          {state?.sigla ?? 'SP'}{scope === '31' ? ' · BETA' : ''}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="listbox" className="absolute left-0 top-full z-[1200] mt-2 w-64 rounded-xl bg-white p-1.5 shadow-2xl ring-1 ring-black/10 dark:bg-slate-800">
          {PUBLIC_SCOPES.map((code) => {
            const active = scope === code;
            return (
              <button
                key={code}
                role="option"
                aria-selected={active}
                onClick={() => pick(code)}
                className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-[#1E5128] text-white'
                    : 'text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>{code === '35' ? '⭐ São Paulo (canônico)' : '🧪 Minas Gerais (piloto beta)'}</span>
                {active && <Check className="h-4 w-4" />}
              </button>
            );
          })}
          {typeof count === 'number' && (
            <p className="mt-1 border-t border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-slate-700 dark:text-gray-400">
              {count.toLocaleString('pt-BR')} municípios exibidos
            </p>
          )}
        </div>
      )}
    </div>
  );
}
