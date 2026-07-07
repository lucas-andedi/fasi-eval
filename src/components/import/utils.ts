/** Type MIME d'un classeur .xlsx. */
export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Construit un Blob à partir d'une chaîne base64 et déclenche son téléchargement.
 * `fileBase64` peut être une data-URI (`data:...;base64,xxxx`) : on retire le préfixe
 * avant `atob` le cas échéant.
 */
export function downloadBase64(fileBase64: string, filename: string) {
  const comma = fileBase64.indexOf(',');
  const raw =
    fileBase64.startsWith('data:') && comma !== -1
      ? fileBase64.slice(comma + 1)
      : fileBase64;

  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const blob = new Blob([bytes], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Lit un fichier et renvoie sa représentation data-URL (`data:...;base64,xxxx`).
 * Le backend tolère le préfixe : la chaîne est envoyée telle quelle.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}
