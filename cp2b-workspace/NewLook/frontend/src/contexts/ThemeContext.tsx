'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Light (cream paper) is the platform's standard look for every visitor,
 * whatever their system preference; dark is there for those who pick it.
 * Only an explicit "dark" in localStorage turns it on. The pre-paint script
 * in src/app/layout.tsx applies the same rule before hydration.
 */
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Load the visitor's choice on mount ("system", left by earlier versions, reads as light)
  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem('pilar2b-theme') === 'dark') {
      setTheme('dark');
    }
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    localStorage.setItem('pilar2b-theme', theme);
    localStorage.setItem('pilar2b-resolved-theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme: theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
