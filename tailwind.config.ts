import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-syne)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        surface: '#111827',
        surface2: '#1a2235',
        border: '#1e2d45',
        cyan: '#00d9ff',
        green: '#00ff88',
      },
    },
  },
  plugins: [],
}

export default config
