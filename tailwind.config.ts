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
// Les tokens couleur pointent vers des variables CSS (canaux R G B) définies dans
// globals.css. Le format `rgb(var(--x) / <alpha-value>)` préserve les modificateurs
// d'opacité Tailwind (ex. `text-ink/55`) tout en permettant l'inversion clair/sombre.
const c = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
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
        paper: c('--paper'),
        surface: c('--surface'),
        ink: c('--ink'),
        muted: c('--muted'),
        subtle: c('--subtle'),
        line: c('--line'),
        'line-strong': c('--line-strong'),

        // Accent unique de marque — émeraude
        accent: {
          DEFAULT: c('--accent'),
          hover: c('--accent-hover'),
          weak: c('--accent-weak'),
          fg: c('--accent-fg'),
          50: c('--accent-weak'),
          100: c('--accent-100'),
          200: c('--accent-200'),
          600: c('--accent'),
          700: c('--accent-700'),
        },

        // clé `violet` → échelle NEUTRE (zinc chaud)
        violet: {
          50: c('--violet-50'),
          100: c('--violet-100'),
          200: c('--violet-200'),
          300: c('--violet-300'),
          400: c('--violet-400'),
          500: c('--violet-500'),
          600: c('--violet-600'),
          700: c('--violet-700'),
          800: c('--violet-800'),
          900: c('--violet-900'),
          950: c('--violet-950'),
        },
        // clé `teal` → accent (états « actif/ouvert »)
        teal: {
          400: c('--teal-400'),
          500: c('--accent'),
          600: c('--accent-700'),
        },
        // clé `gold` → ambre chaud (sémantique « attention »)
        gold: {
          300: c('--gold-300'),
          400: c('--gold-400'),
          500: c('--gold-500'),
          600: c('--gold-600'),
          700: c('--gold-700'),
        },
        // Palette d'appoint douce (icônes de statistiques, accents) — vivante mais tamisée
        amber: { soft: c('--amber-soft'), ink: c('--amber-ink') },
        sky: { soft: c('--sky-soft'), ink: c('--sky-ink') },
        rose: { soft: c('--rose-soft'), ink: c('--rose-ink') },
        grape: { soft: c('--grape-soft'), ink: c('--grape-ink') },

        // Fonds/filets doux des badges sémantiques (inversibles en sombre)
        'success-soft': c('--success-soft'),
        'success-line': c('--success-line'),
        'warning-soft': c('--warning-soft'),
        'warning-line': c('--warning-line'),
        'danger-soft': c('--danger-soft'),
        'danger-line': c('--danger-line'),
        'info-soft': c('--info-soft'),
        'info-line': c('--info-line'),

        success: c('--success'),
        warning: c('--warning'),
        danger: c('--danger'),
        info: c('--info'),
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
