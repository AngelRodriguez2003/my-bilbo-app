export type Unit = 'kg' | 'lb';

export type CycleStatus = 'active' | 'completed';

/** Base fields shared by every synced record (ready for cloud sync in Phase 2). */
export interface SyncedRecord {
  id: string;
  updatedAt: string; // ISO date
  deleted: boolean;
}

export interface Exercise extends SyncedRecord {
  name: string;
  /** i18n key for seeded exercises; custom exercises use `name` directly. */
  i18nKey?: string;
  isCustom: boolean;
  createdAt: string;
}

export interface Cycle extends SyncedRecord {
  exerciseId: string;
  unit: Unit;
  /** Optional: only present when the cycle was started from a 1RM. */
  oneRepMax?: number;
  startWeight: number;
  incrementStep: number;
  status: CycleStatus;
  startDate: string;
  endDate?: string;
}

export interface Session extends SyncedRecord {
  cycleId: string;
  /** 1-based session number within the cycle. */
  index: number;
  weight: number;
  reps: number;
  date: string;
  notes?: string;
}

export type ThemePreference = 'system' | 'dark' | 'light';
export type LanguagePreference = 'system' | 'es' | 'en';

export interface Settings {
  theme: ThemePreference;
  language: LanguagePreference;
  defaultUnit: Unit;
  defaultIncrement: number;
}
