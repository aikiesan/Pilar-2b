const palette = require('./src/styles/palette.js')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm neutrals replace Tailwind's cool gray and slate in place, with
        // the same lightness per step (see src/styles/palette.js).
        gray: palette.warmGray,
        slate: palette.warmSlate,
        terra: palette.terra,
        ochre: palette.ochre,
        dusk: palette.dusk,
        // Semantic surfaces and text, from CSS variables that the dark theme
        // swaps (src/app/[locale]/globals.css).
        paper: {
          DEFAULT: 'rgb(var(--paper) / <alpha-value>)',
          raised: 'rgb(var(--paper-raised) / <alpha-value>)',
          sunken: 'rgb(var(--paper-sunken) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          // Inputs and other controls: 3:1 against the page (WCAG 1.4.11).
          strong: 'rgb(var(--line-strong) / <alpha-value>)',
        },
        // Deprecated green-era names, kept pointing at the earth palette so
        // anything not yet migrated still matches. Prefer terra/ochre/paper.
        cp2b: {
          primary: palette.terra[800],
          secondary: palette.ochre[600],
          accent: palette.terra[100],
          dark: palette.warmGray[900],
          light: '#FFFFFF',
          'dark-green': palette.terra[700],
          green: palette.terra[600],
          'green-light': palette.terra[500],
          lime: palette.terra[500],
          'lime-light': palette.terra[100],
          orange: palette.ochre[600],
          'orange-light': palette.ochre[300],
          'gray-50': palette.warmGray[50],
          'gray-100': palette.warmGray[100],
          'gray-200': palette.warmGray[200],
          'gray-600': palette.warmGray[600],
          'gray-900': palette.warmGray[900],
        },
        // Sector colours (agrícola, pecuária, urbano) for map, charts and PDFs.
        biomass: palette.sector,
        sector: palette.sector,
      },
      fontFamily: {
        // "… Variable" is the family name @fontsource-variable registers
        // (loaded in src/app/layout.tsx); the plain names cover a local install.
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'monospace'],
        // Headings (h1, h2 by default; see globals.css). Light serif, after the
        // editorial references; loaded in src/app/layout.tsx.
        display: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
      },
      // Sharp corners: every rounded-* utility tops out at 4px. `full` stays
      // for true circles (dots, avatars, round icon buttons, toggles).
      borderRadius: {
        none: '0',
        sm: '1px',
        DEFAULT: '2px',
        md: '2px',
        lg: '2px',
        xl: '3px',
        '2xl': '4px',
        '3xl': '4px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      // Structure comes from hairlines; shadows stay low and warm. Only xl/2xl
      // lift a surface (popovers, dialogs, the map's floating panels).
      boxShadow: {
        sm: '0 1px 0 rgb(43 38 32 / 0.04)',
        DEFAULT: '0 1px 2px rgb(43 38 32 / 0.06)',
        md: '0 2px 6px -2px rgb(43 38 32 / 0.10)',
        lg: '0 6px 16px -8px rgb(43 38 32 / 0.14)',
        xl: '0 12px 28px -12px rgb(43 38 32 / 0.20)',
        '2xl': '0 20px 40px -16px rgb(43 38 32 / 0.24)',
        // Dark mode shadows
        'dark-sm': '0 1px 0 rgb(0 0 0 / 0.3)',
        'dark-md': '0 2px 6px -2px rgb(0 0 0 / 0.45)',
        'dark-lg': '0 6px 16px -8px rgb(0 0 0 / 0.55)',
      },
      backdropBlur: {
        sm: '4px',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
