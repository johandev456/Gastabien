/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        arcade: {
          bg: '#0a0a1a',
          surface: '#111132',
          surfaceDark: '#080816',
          border: '#3b3b77',
          gold: '#ffd700',
          cyan: '#00ffff',
          pink: '#ff2a85',
          red: '#ff3344',
          green: '#39ff14',
          purple: '#b347eb',
          blue: '#0088ff'
        },
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        banco: {
          popular: '#003882',
          bhd: '#008752',
          promerica: '#00965E',
          qik: '#6C2BD9'
        }
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        vt: ['"VT323"', 'monospace'],
        silk: ['"Silkscreen"', 'monospace']
      }
    },
  },
  plugins: [],
}
