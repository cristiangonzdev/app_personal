import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-syne)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: '#060a14',
          surface: '#111827',
          surface2: '#1a2235',
        },
        border: { DEFAULT: '#1e2d45', hi: '#2a3f5f' },
        accent: {
          cyan: '#00d9ff',
          green: '#00ff88',
          violet: '#8b5cf6',
          amber: '#f59e0b',
          red: '#ef4444',
        },
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in .35s cubic-bezier(.4,0,.2,1) forwards',
        'slide-up': 'slide-up .45s cubic-bezier(.4,0,.2,1) forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
