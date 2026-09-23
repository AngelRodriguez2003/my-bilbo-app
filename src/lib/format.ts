import i18next, { type TFunction } from 'i18next';

import { catalogEntry, catalogName } from '@/lib/catalog';
import type { Exercise } from '@/types/models';

/**
 * Seeded exercises are translated; catalog ones use the catalog's own
 * translation, so they follow the app language; custom ones keep the user's
 * name. A catalog id that no longer exists falls back to the stored name.
 */
export function exerciseName(exercise: Exercise, t: TFunction): string {
  if (exercise.i18nKey) return t(exercise.i18nKey);
  const entry = catalogEntry(exercise.catalogId);
  return entry ? catalogName(entry, i18next.language) : exercise.name;
}

/** Trim trailing zeros: 42.5 → "42.5", 40 → "40". */
export function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

export function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Parse a decimal that may use comma (Spanish keyboards). */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Fecha + hora corta, para "última sincronización". */
export function formatDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
