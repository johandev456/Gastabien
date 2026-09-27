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
      }
    },
  },
  plugins: [],
}
