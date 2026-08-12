/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0e14',
          panel: '#10151c',
          raised: '#161d26',
          overlay: '#1c2530',
        },
        line: {
          subtle: '#1f2937',
          default: '#2d3748',
          strong: '#4a5568',
        },
        ink: {
          primary: '#e6edf3',
          secondary: '#9aa5b1',
          muted: '#6e7681',
          dim: '#484f58',
        },
        prob: {
          high: '#10b981',
          mid: '#f59e0b',
          low: '#6b7280',
        },
        warn: {
          bg: '#1c1410',
          border: '#fb923c',
          text: '#fdba74',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
        sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
