/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spit: {
          maroon: {
            50: '#FDF2F2',
            100: '#FCE7E7',
            200: '#F8D2D2',
            300: '#F0AFAF',
            400: '#E06B6B',
            500: '#C53030',
            600: '#9B1C1C',
            700: '#7B1113', // Deep SPIT Maroon
            800: '#5F0C0E',
            900: '#42080A',
            950: '#250304',
          },
          gold: {
            50: '#FFFBEB',
            100: '#FEF3C7',
            200: '#FDE68A',
            300: '#FCD34D',
            400: '#FBBF24',
            500: '#F59E0B',
            600: '#D97706', // SPIT Warm Gold
            700: '#B45309',
            800: '#92400E',
            900: '#78350F',
          },
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
    },
  },
  plugins: [],
}
