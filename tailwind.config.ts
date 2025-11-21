import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5200ff',
          50: '#F4F1FF',
          100: '#E0D7FF',
          200: '#C1A6FF',
          300: '#9E83FF',
          400: '#7F5BFF',
          500: '#5200ff',
          600: '#4a00e6',
          700: '#3a00c6',
          800: '#2c00a9',
          900: '#170077',
        },
        accent: {
          DEFAULT: '#ffd600',
          50: '#fffaf0',
          100: '#fff2c0',
          200: '#fedb57',
          300: '#fbd72b',
          400: '#f6c800',
          500: '#ffd600',
          600: '#e6b400',
          700: '#cc9a00',
          800: '#a67600',
          900: '#6f4800',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
