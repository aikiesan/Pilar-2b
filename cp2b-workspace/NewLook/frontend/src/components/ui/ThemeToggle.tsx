'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ThemeToggleProps {
  variant?: 'light' | 'dark';
}

export function ThemeToggle({ variant = 'dark' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations('common');

  const isDark = resolvedTheme === 'dark';

  const buttonClass = variant === 'light'
    ? 'p-2 rounded-lg transition-all duration-150 text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-cp2b-lime'
    : 'p-2 rounded-lg transition-all duration-150 text-white/80 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white';

  const label = isDark ? t('theme.switch_to_light') : t('theme.switch_to_dark');

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={buttonClass}
      aria-label={label}
      title={label}
    >
      {isDark
        ? <Sun className="h-4 w-4" aria-hidden="true" />
        : <Moon className="h-4 w-4" aria-hidden="true" />
      }
    </button>
  );
}

export default ThemeToggle;
