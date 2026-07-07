import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from '@/components/providers';

// Polices auto-hébergées (sous-ensemble latin variable) — aucune dépendance réseau.
const display = localFont({
  src: './fonts/SpaceGrotesk.woff2',
  weight: '400 700',
  variable: '--font-display',
  display: 'swap',
});
const sans = localFont({
  src: './fonts/PlusJakartaSans.woff2',
  weight: '400 700',
  variable: '--font-sans',
  display: 'swap',
});
const mono = localFont({
  src: './fonts/JetBrainsMono.woff2',
  weight: '400 700',
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FASI-Eval — Cotation & Évaluation des Projets',
  description:
    "Système de cotation et d'évaluation des projets académiques — Faculté des Sciences Informatiques, UPC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
