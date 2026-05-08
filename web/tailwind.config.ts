import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F75FE',
          50: '#EBF2FF',
          100: '#D6E6FF',
          200: '#ADCCFF',
          300: '#85B3FF',
          400: '#5C99FF',
          500: '#1F75FE',
          600: '#0A5FE8',
          700: '#084BC4',
          800: '#063799',
          900: '#04236E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
