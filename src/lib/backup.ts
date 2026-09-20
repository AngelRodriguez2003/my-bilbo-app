import type { Cycle, Exercise, Session, Settings, SyncedRecord, Unit } from '@/types/models';

/** Marca escrita en cada archivo: sirve para rechazar JSON de otra app. */
export const BACKUP_FORMAT = 'project-explosive-backup';
/** Súbelo al cambiar la forma del archivo: los viejos se siguen importando. */
export const BACKUP_VERSION = 1;

export interface BackupData {
  exercises: Record<string, Exercise>;
  cycles: Record<string, Cycle>;
  sessions: Record<string, Session>;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: BackupData;
  settings: Settings;
}

export type ImportMode = 'merge' | 'replace';

export type BackupErrorCode = 'invalidJson' | 'notABackup' | 'unsupportedVersion' | 'emptyBackup';

export class BackupError extends Error {
  constructor(readonly code: BackupErrorCode) {
    super(code);
    this.name = 'BackupError';
  }
}

export function createBackup(data: BackupData, settings: Settings): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      exercises: data.exercises,
      cycles: data.cycles,
      sessions: data.sessions,
    },
    settings,
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

/** `project-explosive-2026-09-19-18-43.json` — ordenable por nombre. */
export function backupFileName(exportedAt: string): string {
  const stamp = exportedAt.replace(/[:.]/g, '-').slice(0, 16).replace('T', '-');
  return `project-explosive-${stamp}.json`;
}

function isRecordMap(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Se queda solo con las entradas que traen los campos de sincronización. */
function sanitizeRecords<T extends SyncedRecord>(
  raw: unknown,
  isValid: (record: Record<string, unknown>) => boolean,
): Record<string, T> {
  if (!isRecordMap(raw)) return {};
  const out: Record<string, T> = {};
  for (const [id, record] of Object.entries(raw)) {
    if (!isRecordMap(record)) continue;
    if (typeof record.id !== 'string' || record.id !== id) continue;
    if (typeof record.updatedAt !== 'string') continue;
    if (!isValid(record)) continue;
    out[id] = { ...record, deleted: record.deleted === true } as unknown as T;
  }
  return out;
}

const UNITS: Unit[] = ['kg', 'lb'];

function sanitizeSettings(raw: unknown, fallback: Settings): Settings {
  if (!isRecordMap(raw)) return fallback;
  const theme = raw.theme;
  const language = raw.language;
  const unit = raw.defaultUnit;
  const increment = raw.defaultIncrement;
  return {
    theme: theme === 'dark' || theme === 'light' || theme === 'system' ? theme : fallback.theme,
    language:
      language === 'es' || language === 'en' || language === 'system' ? language : fallback.language,
    defaultUnit: UNITS.includes(unit as Unit) ? (unit as Unit) : fallback.defaultUnit,
    defaultIncrement:
      typeof increment === 'number' && Number.isFinite(increment) && increment > 0
        ? increment
        : fallback.defaultIncrement,
    // Se conserva la fecha del archivo; al aplicar la copia, el store de
    // ajustes la vuelve a sellar para que gane también en la nube.
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : fallback.updatedAt,
  };
}

/**
 * Valida y normaliza un archivo de copia.
 *
 * @param currentSettings rellena los ajustes que el archivo no traiga.
 * @throws {BackupError} si el texto no es una copia legible de esta app.
 */
export function parseBackup(raw: string, currentSettings: Settings): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupError('invalidJson');
  }

  if (!isRecordMap(parsed) || parsed.format !== BACKUP_FORMAT) {
    throw new BackupError('notABackup');
  }
  const version = parsed.version;
  if (typeof version !== 'number' || version > BACKUP_VERSION) {
    throw new BackupError('unsupportedVersion');
  }

  const data = isRecordMap(parsed.data) ? parsed.data : {};
  const exercises = sanitizeRecords<Exercise>(
    data.exercises,
    (e) => typeof e.name === 'string' && typeof e.createdAt === 'string',
  );
  const cycles = sanitizeRecords<Cycle>(
    data.cycles,
    (c) =>
      typeof c.exerciseId === 'string' &&
      typeof c.startWeight === 'number' &&
      typeof c.incrementStep === 'number' &&
      (c.status === 'active' || c.status === 'completed'),
  );
  const sessions = sanitizeRecords<Session>(
    data.sessions,
    (s) =>
      typeof s.cycleId === 'string' &&
      typeof s.weight === 'number' &&
      typeof s.reps === 'number' &&
      typeof s.index === 'number',
  );

  if (!Object.keys(exercises).length && !Object.keys(sessions).length) {
    throw new BackupError('emptyBackup');
  }

  return {
    format: BACKUP_FORMAT,
    version,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    data: { exercises, cycles, sessions },
    settings: sanitizeSettings(parsed.settings, currentSettings),
  };
}

/** Alias de tipo (no interfaz) para que encaje en las opciones de i18next. */
export type BackupCounts = {
  exercises: number;
  cycles: number;
  sessions: number;
};

/** Cuenta los registros vivos (sin borrado lógico): lo que el usuario ve. */
export function countBackup(data: BackupData): BackupCounts {
  const live = <T extends SyncedRecord>(records: Record<string, T>) =>
    Object.values(records).filter((r) => !r.deleted).length;
  return {
    exercises: live(data.exercises),
    cycles: live(data.cycles),
    sessions: live(data.sessions),
  };
}
