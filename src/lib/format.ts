import type { TFunction } from 'i18next';

import type { Exercise } from '@/types/models';

/** Seeded exercises are translated; custom ones keep the user's name. */
export function exerciseName(exercise: Exercise, t: TFunction): string {
  return exercise.i18nKey ? t(exercise.i18nKey) : exercise.name;
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
