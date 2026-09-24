import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        primary: {
          DEFAULT: '#8B5CF6',
          hover: '#7C3AED',
        },
        accent: {
          purple: '#9333EA',
          pink: '#EC4899',
          amber: '#F59E0B',
          teal: '#14B8A6',
          indigo: '#6366F1',
        },
        role: {
          from: 'rgb(var(--role-from) / <alpha-value>)',
          to: 'rgb(var(--role-to) / <alpha-value>)',
          accent: 'rgb(var(--role-accent) / <alpha-value>)',
          soft: 'rgb(var(--role-soft) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-diploma)', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(76 29 149 / 0.06), 0 4px 16px rgb(76 29 149 / 0.06)',
        lift: '0 2px 4px rgb(76 29 149 / 0.06), 0 14px 36px rgb(76 29 149 / 0.14)',
        glow: '0 1px 0 rgb(255 255 255 / 0.35) inset, 0 8px 24px rgb(var(--role-accent) / 0.35)',
      },
      zIndex: {
        fx: '0',
        content: '10',
        nav: '40',
        modal: '50',
        toast: '60',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fx-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        blob: 'blob 7s infinite',
        shimmer: 'shimmer 1.6s infinite',
        'fx-in': 'fx-in 1.2s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
