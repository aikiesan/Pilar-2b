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
        // Primary Tailwind colors (blue-based defaults)
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // PILAR-2b Brand Colors - New Extended Palette
        cp2b: {
          // Legacy colors (kept for backward compatibility)
          primary: '#1E5128',
          secondary: '#4E9F3D',
          accent: '#D8E9A8',
          dark: '#191A19',
          light: '#FFFFFF',
          // New specification colors
          'dark-green': '#1B5E20',
          green: '#2F7D32',
          'green-light': '#4CAF50',
          lime: '#9CCC65',
          'lime-light': '#C5E1A5',
          orange: '#FF9800',
          'orange-light': '#FFB74D',
          // Neutral palette
          'gray-50': '#F8F9FA',
          'gray-100': '#F1F3F4',
          'gray-200': '#E8EAED',
          'gray-600': '#5F6368',
          'gray-900': '#202124',
          // Semantic colors
          success: '#34A853',
          warning: '#FBBC04',
          error: '#EA4335',
        },
        // Biomass category colors
        biomass: {
          agricola: '#4CAF50',
          pecuaria: '#FF9800',
          urbano: '#2196F3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
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
      boxShadow: {
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        // Dark mode shadows
        'dark-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
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
