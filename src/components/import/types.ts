/** Entités supportées par les endpoints d'import / export / modèle. */
export type ImportEntity =
  | 'students'
  | 'users'
  | 'sessions'
  | 'criteria'
  | 'session-criteria'
  | 'notes';

/** GET /imports/:entity/template et GET /imports/:entity/export. */
export interface FileResponse {
  filename: string;
  fileBase64: string;
}

/** POST /imports/:entity. */
export interface ImportResult {
  created: number;
  updated?: number;
  skipped: number;
  errors: { row: number; message: string }[];
  tempPasswords?: { username: string; tempPassword: string }[];
}
