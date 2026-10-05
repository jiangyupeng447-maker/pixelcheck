/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light premium SaaS dashboard palette
        bg: {
          base: '#F3F4F1', // page background
          surface: '#FFFFFF', // primary surface / cards / panels
          elevated: '#F8F9F7', // secondary surface
          card: '#FFFFFF',
          hover: '#ECEEE9',
        },
        sidebar: {
          DEFAULT: '#202120',
          hover: '#2C2E2C',
        },
        border: {
          subtle: '#EEF0EC',
          DEFAULT: '#E6E8E3',
          strong: '#D7DAD3',
        },
        content: {
          primary: '#171817',
          secondary: '#70736F',
          muted: '#9A9D98',
        },
        // Lime primary accent (paired with dark text), purple as secondary data accent
        brand: {
          DEFAULT: '#DDF45A',
          hover: '#D2EA47',
          soft: 'rgba(221,244,90,0.35)',
          ink: '#171817',
        },
        accent2: '#B9B2F3',
        danger: '#EF4444',
        warning: '#F59E0B',
        success: '#22C55E',
        info: '#8C82E8',
      },
      borderRadius: {
        xl: '20px',
      },
      boxShadow: {
        card: '0 4px 20px rgba(23,24,23,0.05)',
        float: '0 8px 30px rgba(23,24,23,0.10)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['SFMono-Regular', 'ui-monospace', 'Menlo', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}
