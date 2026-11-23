'use client';

/**
 * MapToolsMenu: the map's click tools as ONE button in the top control row.
 *
 * The button opens a short list of the tools on offer (lib/mapTools.ts decides
 * which); picking one opens it, picking the open one closes it. While a tool
 * is open the button is pressed (ink) and carries the tool's name, so the
 * visitor sees which tool will answer the next click on the map.
 *
 * Shown on phones too, as an icon. Who may USE a tool is not decided here: a
 * tool opens for everyone, and its window says what is needed.
 */

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown, CircleDashed, Columns2, Grid3x3, MousePointerClick, Target, Truck, Waypoints } from 'lucide-react';
import type { MapToolId } from '@/lib/mapTools';

const TOOL_ICONS: Record<MapToolId, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  land: CircleDashed,
  compare: Columns2,
  cross: Grid3x3,
  gather: Target,
  similar: Waypoints,
  truck: Truck,
};

interface MapToolsMenuProps {
  /** The tools on offer, in order. */
  tools: MapToolId[];
  active: MapToolId | null;
  /** A tool to open, or null to close the open one. */
  onSelect: (tool: MapToolId | null) => void;
}

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600';

export default function MapToolsMenu({ tools, active, onSelect }: MapToolsMenuProps) {
  const t = useTranslations('Map.mapTools');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Copy exists for the tools on offer only (each step adds its own), and only
  // those reach this menu; the cast names that, once.
  const name = (id: MapToolId) => t(`items.${id as 'land' | 'compare' | 'cross' | 'gather' | 'similar' | 'truck'}.name`);
  const description = (id: MapToolId) => t(`items.${id as 'land' | 'compare' | 'cross' | 'gather' | 'similar' | 'truck'}.description`);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Handled here: the map's own Escape (close the tool) skips it.
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // On open, focus goes to the open tool (or the first), inside the list.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const target =
      list?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ??
      list?.querySelector<HTMLButtonElement>('button');
    target?.focus();
  }, [open]);

  if (tools.length === 0) return null;

  const pressed = active !== null;
  const ActiveIcon = active ? TOOL_ICONS[active] : MousePointerClick;

  return (
    <div ref={rootRef} className="surface-light relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={active ? `${t('menu')}: ${name(active)}` : t('menu')}
        className={`flex min-h-11 min-w-11 max-w-[16rem] items-center justify-center gap-1.5 border px-3 text-sm font-semibold shadow-md transition-colors ${focusRing} ${
          pressed
            ? 'border-ink bg-ink hover:bg-ink/90 active:bg-ink/80'
            : 'border-line bg-paper-raised hover:bg-paper-sunken active:bg-line/60'
        }`}
      >
        <ActiveIcon className={`h-4 w-4 shrink-0 ${pressed ? 'text-paper' : 'text-terra-800'}`} aria-hidden />
        {/* Colour on the label itself: .surface-light sets the text colour after
            the utilities, so text-paper on the button would lose to it. */}
        <span className={`hidden truncate sm:inline ${pressed ? 'text-paper' : 'text-ink'}`}>
          {active ? name(active) : t('menu')}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`hidden h-3.5 w-3.5 shrink-0 transition-transform motion-reduce:transition-none sm:block ${open ? 'rotate-180' : ''} ${pressed ? 'text-paper' : 'text-ink-muted'}`}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="group"
          aria-label={t('menu_aria')}
          className="map-pop absolute left-0 top-full z-20 mt-1 w-72 max-w-[calc(100vw-1.5rem)] border border-line bg-paper-raised py-1 shadow-md"
        >
          {tools.map((id) => {
            const isActive = active === id;
            const Icon = TOOL_ICONS[id];
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                aria-label={name(id)}
                aria-describedby={`map-tool-${id}-desc`}
                onClick={() => {
                  onSelect(isActive ? null : id);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={`flex min-h-11 w-full items-start gap-2.5 border-l-2 px-3 py-2 text-left transition-colors ${focusRing} focus-visible:ring-inset ${
                  isActive ? 'border-terra-600 bg-paper-sunken' : 'border-transparent hover:bg-paper-sunken active:bg-line/60'
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-terra-800" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{name(id)}</span>
                  <span id={`map-tool-${id}-desc`} className="mt-0.5 block text-xs text-ink-muted">
                    {description(id)}
                  </span>
                </span>
                {isActive && <Check className="mt-0.5 h-4 w-4 shrink-0 text-terra-600" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
