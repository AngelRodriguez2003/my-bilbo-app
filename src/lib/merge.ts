import type { SyncedRecord } from '@/types/models';

/**
 * Fusiona registros remotos sobre los locales con last-write-wins por
 * `updatedAt`. Empate = gana el local: si dos dispositivos escriben en el
 * mismo milisegundo, no merece la pena invalidar la caché por un cambio
 * que ya es idéntico en la práctica.
 *
 * Devuelve el mismo objeto `local` cuando no hay nada que cambiar, para que
 * zustand no dispare un render inútil en cada sincronización vacía.
 */
export function mergeById<T extends SyncedRecord>(
  local: Record<string, T>,
  incoming: T[],
): Record<string, T> {
  let merged: Record<string, T> | null = null;

  for (const record of incoming) {
    const current = local[record.id];
    if (current && current.updatedAt >= record.updatedAt) continue;
    merged ??= { ...local };
    merged[record.id] = record;
  }

  return merged ?? local;
}

/**
 * Registros locales modificados después del cursor, es decir, los que aún no
 * han viajado a la nube. Sin cursor (primera sincronización) van todos.
 */
export function changedSince<T extends SyncedRecord>(
  records: Record<string, T>,
  cursor: string | null,
): T[] {
  const all = Object.values(records);
  return cursor ? all.filter((record) => record.updatedAt > cursor) : all;
}

/** El `updatedAt` más alto de un lote, o `fallback` si el lote está vacío. */
export function maxUpdatedAt(
  records: Array<{ updatedAt: string }>,
  fallback: string | null,
): string | null {
  let max = fallback;
  for (const record of records) {
    if (!max || record.updatedAt > max) max = record.updatedAt;
  }
  return max;
}
