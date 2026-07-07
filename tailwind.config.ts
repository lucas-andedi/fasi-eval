import type { Config } from 'tailwindcss';

/**
 * Système de design « studio » — sobre, éditorial, neutre.
 * Fond blanc, neutres zinc, UNE seule couleur d'accent (vert) utilisée avec parcimonie.
 * Tokens = source unique ici (miroir en variables CSS dans globals.css).
 *
 * NB : la clé `violet` a été remappée sur l'échelle NEUTRE (zinc) et `teal` sur l'accent,
 * afin de re-skinner toute l'application sans renommer chaque classe existante.
 * → tout devient neutre par défaut ; l'accent n'est appliqué qu'aux endroits choisis.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Neutres de base (légèrement chauds pour plus de vie)
        paper: '#ffffff',
        surface: '#f5f5f4',
        ink: '#1a1a17',
        muted: '#55554e',
        subtle: '#9a9a90',
        line: '#e9e7e1',
        'line-strong': '#dcd9d1',

        // Accent unique de marque — émeraude plus vif
        accent: {
          DEFAULT: '#0d9268',
          hover: '#0a7a56',
          weak: '#e7f7f0',
          fg: '#ffffff',
          50: '#e7f7f0',
          100: '#c9edde',
          200: '#98ddc4',
          600: '#0d9268',
          700: '#0a7a56',
        },

        // clé `violet` → échelle NEUTRE (zinc chaud)
        violet: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e9e7e1',
          300: '#d6d3ca',
          400: '#a8a49a',
          500: '#78756c',
          600: '#55554e',
          700: '#3f3f3a',
          800: '#292927',
          900: '#1a1a17',
          950: '#111110',
        },
        // clé `teal` → accent (états « actif/ouvert »)
        teal: {
          400: '#2fb891',
          500: '#0d9268',
          600: '#0a7a56',
        },
        // clé `gold` → ambre chaud (sémantique « attention »)
        gold: {
          300: '#f2d59a',
          400: '#e6b455',
          500: '#c98a1e',
          600: '#a06a15',
          700: '#7d5314',
        },
        // Palette d'appoint douce (icônes de statistiques, accents) — vivante mais tamisée
        amber: { soft: '#fdf4e3', ink: '#b5730f' },
        sky: { soft: '#e9f2fb', ink: '#2b6cb0' },
        rose: { soft: '#fdecef', ink: '#c1436a' },
        grape: { soft: '#f1edfb', ink: '#7355c4' },

        success: '#0f9d63',
        warning: '#c98a1e',
        danger: '#d1524f',
        info: '#2b6cb0',
      },
      borderRadius: {
        lg: '9px',
        xl: '10px',
        '2xl': '14px',
        '3xl': '18px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(24,24,27,0.06)',
        card: '0 1px 3px rgba(24,24,27,0.07), 0 1px 2px rgba(24,24,27,0.04)',
        glow: '0 1px 2px rgba(24,24,27,0.06)',
        gold: '0 1px 2px rgba(24,24,27,0.06)',
      },
      backgroundImage: {
        // Décoratifs neutralisés
        'brand-gradient': 'linear-gradient(0deg, #18181b, #18181b)',
        'gold-gradient': 'linear-gradient(0deg, #a67c2b, #a67c2b)',
        aurora: 'none',
        'mesh-dark': 'none',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
        'aurora-shift': { '0%,100%': { opacity: '1' }, '50%': { opacity: '1' } },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(180,68,59,0.4)' },
          '70%': { boxShadow: '0 0 0 8px rgba(180,68,59,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(180,68,59,0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 1.8s infinite',
        float: 'float 6s ease-in-out infinite',
        aurora: 'aurora-shift 16s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.66,0,0,1) infinite',
      },
    },
  },
  plugins: [],
};
export default config;
