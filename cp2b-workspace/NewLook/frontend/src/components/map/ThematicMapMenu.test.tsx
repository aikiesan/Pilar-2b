/**
 * The thematic maps as one button (desktop): the panel opens with focus inside,
 * picking a map applies it and closes, and Escape closes the panel WITHOUT
 * reaching the map, whose own Escape clears the selected municipality.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import ThematicMapMenu from './ThematicMapMenu';
import { THEMATIC_PRESETS } from '@/data/thematicPresets';

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));

function setup(activePresetId: string | null = null) {
  const onApplyPreset = jest.fn();
  const utils = render(<ThematicMapMenu activePresetId={activePresetId} onApplyPreset={onApplyPreset} />);
  const trigger = utils.container.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!;
  return { ...utils, onApplyPreset, trigger };
}

describe('ThematicMapMenu', () => {
  it('opens a dialog with focus inside it', () => {
    const { trigger } = setup();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('focuses the active map when it opens', () => {
    const active = THEMATIC_PRESETS[1];
    const { trigger } = setup(active.id);
    fireEvent.click(trigger);
    expect(document.activeElement).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies the picked map and closes', () => {
    const { trigger, onApplyPreset } = setup();
    fireEvent.click(trigger);
    const first = screen.getByRole('dialog').querySelector<HTMLButtonElement>('button:not(:disabled)')!;
    fireEvent.click(first);

    expect(onApplyPreset).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on Escape and marks the key handled, so the map keeps its selection', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);

    // The map listens on window (MapComponent) and skips a handled Escape.
    let mapSawUnhandledEscape = false;
    const mapListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) mapSawUnhandledEscape = true;
    };
    window.addEventListener('keydown', mapListener);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    window.removeEventListener('keydown', mapListener);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mapSawUnhandledEscape).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on a click outside', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('every map in the panel is a 44 px target', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    const items = screen.getByRole('dialog').querySelectorAll('button');
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => expect(item.className).toContain('min-h-11'));
  });

  it('has no axe violations when open', async () => {
    const { trigger, container } = setup();
    fireEvent.click(trigger);
    expect(await axe(container)).toHaveNoViolations();
  });
});
