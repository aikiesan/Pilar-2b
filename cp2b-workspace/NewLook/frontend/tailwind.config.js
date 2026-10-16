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
        // The manual's swatches by name: bg-cp2b-lima, text-cp2b-petroleo …
        cp2b: palette.brand,
        // Sector colours (agrícola, pecuária, urbano) for map, charts and PDFs.
        biomass: palette.sector,
        sector: palette.sector,
      },
      fontFamily: {
        // Neulis Sans is the CP2b typeface (manual 1.13). Its licence (Adobe
        // Fonts) does not allow self-hosting, so the site falls back to Verdana,
        // the system font the manual names (1.14); a visitor who has Neulis Sans
        // installed sees it. Headings use the same family, in heavier weights.
        sans: ['"Neulis Sans"', 'Verdana', 'Geneva', '"DejaVu Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'monospace'],
        display: ['"Neulis Sans"', 'Verdana', 'Geneva', '"DejaVu Sans"', 'sans-serif'],
      },
      // Verdana/Neulis Sans in bold run wider and heavier than the light serif
      // the large sizes were tuned for: one step smaller, a little more leading.
      fontSize: {
        '4xl': ['2rem', { lineHeight: '1.2' }],
        '5xl': ['2.5rem', { lineHeight: '1.15' }],
        '6xl': ['3rem', { lineHeight: '1.12' }],
      },
      // Soft, rounded corners after the manual's curves and leaves. `full`
      // stays for pills, dots and round icon buttons.
      borderRadius: {
        none: '0',
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
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
      // Structure comes from hairlines; shadows stay low, tinted Azul Petróleo. Only xl/2xl
      // lift a surface (popovers, dialogs, the map's floating panels).
      boxShadow: {
        sm: '0 1px 0 rgb(30 62 76 / 0.04)',
        DEFAULT: '0 1px 2px rgb(30 62 76 / 0.06)',
        md: '0 2px 6px -2px rgb(30 62 76 / 0.10)',
        lg: '0 6px 16px -8px rgb(30 62 76 / 0.14)',
        xl: '0 12px 28px -12px rgb(30 62 76 / 0.20)',
        '2xl': '0 20px 40px -16px rgb(30 62 76 / 0.24)',
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
