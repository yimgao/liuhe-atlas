/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Atlas dark palette — premium, signal-heavy
        bg: {
          base: '#0a0e14',        // primary background
          panel: '#10151c',       // card background
          raised: '#161d26',      // elevated card
          overlay: '#1c2530',     // hover/active
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
        // Symbol dimension colors
        wuxing: {
          金: '#fbbf24',  // amber
          木: '#34d399',  // emerald
          水: '#60a5fa',  // blue
          火: '#f87171',  // red
          土: '#d6d3d1',  // stone
        },
        wave: {
          红: '#ef4444',
          蓝: '#3b82f6',
          绿: '#22c55e',
        },
        // Probability heat
        prob: {
          high: '#10b981',
          mid: '#f59e0b',
          low: '#6b7280',
        },
        // Disclaimer
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
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'number-roll': 'numberRoll 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        numberRoll: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'glow-emerald': '0 0 24px -4px rgba(16, 185, 129, 0.4)',
        'glow-amber': '0 0 24px -4px rgba(245, 158, 11, 0.4)',
      },
    },
  },
  plugins: [],
}