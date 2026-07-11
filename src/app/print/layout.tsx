'use client';

/**
 * Layout minimal pour les vues imprimables (PDF via le navigateur).
 *
 * Objectifs :
 *  - Forcer un rendu clair (fond blanc, texte noir) indépendamment du thème de
 *    l'application (RG design : sobre/éditorial, sans ombres ni coins arrondis).
 *  - Fournir une barre d'outils `no-print` avec un bouton d'impression.
 *  - Ne PAS redéclarer <html>/<body> (fait par le layout racine).
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="print-root">
      <div className="no-print print-toolbar">
        <button type="button" className="print-btn" onClick={() => window.print()}>
          Imprimer / Enregistrer en PDF
        </button>
      </div>

      <main className="print-sheet">{children}</main>

      <style
        // Styles globaux « en dur » : le rendu imprimable doit rester clair même
        // si l'application est en mode sombre. On n'utilise donc aucun token de thème.
        dangerouslySetInnerHTML={{
          __html: `
            .print-root {
              background: #ffffff;
              color: #1a1a17;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              font-family: var(--font-sans), system-ui, -apple-system, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-toolbar {
              width: 100%;
              max-width: 800px;
              display: flex;
              justify-content: flex-end;
              padding: 16px;
              box-sizing: border-box;
            }
            .print-btn {
              background: #0d9268;
              color: #ffffff;
              border: none;
              padding: 9px 18px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              border-radius: 2px;
              font-family: inherit;
            }
            .print-btn:hover { background: #0a7a56; }
            .print-sheet {
              width: 100%;
              max-width: 800px;
              background: #ffffff;
              color: #1a1a17;
              padding: 0 24px 48px;
              box-sizing: border-box;
              line-height: 1.5;
            }

            /* — Composants réutilisés par les feuilles imprimables — */
            .print-sheet h1, .print-sheet h2, .print-sheet h3 { margin: 0; font-weight: 700; }
            .print-header { margin-bottom: 24px; }
            .print-eyebrow {
              font-size: 11px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #55554e;
              margin: 0 0 6px;
            }
            .print-title {
              font-size: 22px;
              font-family: var(--font-display), var(--font-sans), sans-serif;
              padding-bottom: 8px;
              border-bottom: 2px solid #0d9268;
              margin-bottom: 10px;
            }
            .print-meta { font-size: 13px; color: #3f3f3a; }
            .print-meta div { margin-top: 2px; }
            .print-section-title {
              font-size: 12px;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              color: #0d9268;
              font-weight: 700;
              margin: 28px 0 8px;
            }
            .print-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }
            .print-table th, .print-table td {
              border: 1px solid #e5e5e5;
              padding: 7px 10px;
              text-align: left;
              vertical-align: top;
            }
            .print-table th {
              background: #f5f5f4;
              font-weight: 600;
              font-size: 12px;
            }
            .print-table td.num, .print-table th.num { text-align: right; white-space: nowrap; }
            .print-subhead td {
              background: #fafafa;
              font-weight: 600;
              font-size: 11px;
              letter-spacing: 0.04em;
              text-transform: uppercase;
              color: #55554e;
            }
            .print-note {
              font-size: 12px;
              color: #55554e;
              margin-top: 8px;
            }

            @page { size: A4; margin: 16mm; }

            @media print {
              .no-print { display: none !important; }
              .print-root { min-height: 0; display: block; }
              .print-sheet { max-width: none; padding: 0; }
              html, body { background: #ffffff !important; }
              .print-table { font-size: 11pt; }
            }
          `,
        }}
      />
    </div>
  );
}
