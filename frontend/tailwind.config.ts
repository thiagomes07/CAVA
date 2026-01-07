import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        porcelain: '#f6f4f2',
        obsidian: '#0f1115',
        mineral: '#ede9e6',
        'off-white': '#FAFAFA',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        'premium-lg': '0 25px 50px -12px rgba(15,17,21,0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
