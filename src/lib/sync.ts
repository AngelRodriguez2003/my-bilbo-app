import { changedSince, maxUpdatedAt } from '@/lib/merge';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/store/data';
import { useSettingsStore } from '@/store/settings';
import type { Cycle, Exercise, Session, Settings } from '@/types/models';

/** PostgREST devuelve como mucho 1000 filas por petición. */
const PAGE_SIZE = 1000;
/** Tamaño de lote del upsert: suficiente para no rozar el límite de payload. */
const CHUNK_SIZE = 500;

/**
 * Postgres serializa `timestamptz` como `2026-09-18T12:00:00+00:00`, mientras
 * que `Date.toISOString()` produce `...Z`. Las dos formas describen el mismo
 * instante pero NO se comparan igual como texto, y toda la resolución de
 * conflictos es una comparación de texto: normalizamos al entrar.
 */
const toIso = (value: string) => new Date(value).toISOString();

// ----------------------------------------------------------- mapeo de filas
// La app usa camelCase; las tablas, snake_case.

interface Row {
  [key: string]: unknown;
}

function exerciseToRow(record: Exercise, userId: string): Row {
  return {
    id: record.id,
    user_id: userId,
    name: record.name,
    i18n_key: record.i18nKey ?? null,
    catalog_id: record.catalogId ?? null,
    is_custom: record.isCustom,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    deleted: record.deleted,
  };
}

function rowToExercise(row: any): Exercise {
  return {
    id: row.id,
    name: row.name,
    i18nKey: row.i18n_key ?? undefined,
    catalogId: row.catalog_id ?? undefined,
    isCustom: row.is_custom,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deleted: row.deleted,
  };
}

function cycleToRow(record: Cycle, userId: string): Row {
  return {
    id: record.id,
    user_id: userId,
    exercise_id: record.exerciseId,
    unit: record.unit,
    one_rep_max: record.oneRepMax ?? null,
    start_weight: record.startWeight,
    increment_step: record.incrementStep,
    status: record.status,
    start_date: record.startDate,
    end_date: record.endDate ?? null,
    updated_at: record.updatedAt,
    deleted: record.deleted,
  };
}

function rowToCycle(row: any): Cycle {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    unit: row.unit,
    oneRepMax: row.one_rep_max ?? undefined,
    startWeight: row.start_weight,
    incrementStep: row.increment_step,
    status: row.status,
    startDate: toIso(row.start_date),
    endDate: row.end_date ? toIso(row.end_date) : undefined,
    updatedAt: toIso(row.updated_at),
    deleted: row.deleted,
  };
}

function sessionToRow(record: Session, userId: string): Row {
  return {
    id: record.id,
    user_id: userId,
    cycle_id: record.cycleId,
    session_index: record.index,
    weight: record.weight,
    reps: record.reps,
    notes: record.notes ?? null,
    date: record.date,
    updated_at: record.updatedAt,
    deleted: record.deleted,
  };
}

function rowToSession(row: any): Session {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    index: row.session_index,
    weight: row.weight,
    reps: row.reps,
    notes: row.notes ?? undefined,
    date: toIso(row.date),
    updatedAt: toIso(row.updated_at),
    deleted: row.deleted,
  };
}

function settingsToRow(settings: Settings, userId: string): Row {
  return {
    user_id: userId,
    theme: settings.theme,
    language: settings.language,
    default_unit: settings.defaultUnit,
    default_increment: settings.defaultIncrement,
    updated_at: settings.updatedAt,
  };
}

function rowToSettings(row: any): Settings {
  return {
    theme: row.theme,
    language: row.language,
    defaultUnit: row.default_unit,
    defaultIncrement: row.default_increment,
    updatedAt: toIso(row.updated_at),
  };
}

// -------------------------------------------------------------- transporte

function client() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

/** Descarga una tabla entera paginando: PostgREST corta en 1000 filas. */
async function fetchPage(table: string, userId: string, since: string | null, from: number) {
  let query = client()
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (since) query = query.gt('updated_at', since);

  const { data, error } = await query;
  if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`);
  return data ?? [];
}

async function pullTable<T>(
  table: string,
  userId: string,
  since: string | null,
  map: (row: any) => T,
): Promise<T[]> {
  const records: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await fetchPage(table, userId, since, from);
    records.push(...page.map(map));
    if (page.length < PAGE_SIZE) break;
  }
  return records;
}

async function pushRows(table: string, rows: Row[]) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const { error } = await client()
      .from(table)
      .upsert(rows.slice(i, i + CHUNK_SIZE), { onConflict: 'user_id,id' });
    if (error) throw new Error(`No se pudo guardar ${table}: ${error.message}`);
  }
}

// ------------------------------------------------------------ ciclo de sync

export interface SyncCursors {
  /** Reloj LOCAL: hasta dónde se ha subido. */
  lastPushedAt: string | null;
  /** Reloj del SERVIDOR: hasta dónde se ha bajado. */
  lastPulledAt: string | null;
}

export interface SyncResult extends SyncCursors {
  pushed: number;
  pulled: number;
}

/** Los registros de esos ids que siguen existiendo en el store. */
function pick<T>(records: Record<string, T>, ids: string[]): T[] {
  return ids.map((id) => records[id]).filter(Boolean);
}

async function fetchRemoteSettings(userId: string): Promise<Settings | null> {
  const { data, error } = await client()
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`No se pudieron leer los ajustes: ${error.message}`);
  return data ? rowToSettings(data) : null;
}

/**
 * Una pasada completa de sincronización.
 *
 * El orden es bajar y DESPUÉS subir, no al revés: el upsert sobrescribe la
 * fila sin mirar su fecha, así que subiendo primero un cambio local viejo
 * borraría uno remoto más nuevo. Bajando primero, ese caso lo resuelve el
 * merge por `updatedAt` y lo que se sube ya es la versión ganadora.
 *
 * Los dos cursores viven en relojes distintos y por eso se guardan por
 * separado — mezclarlos es la forma clásica de perder registros cuando los
 * relojes de dos dispositivos no coinciden. El peor caso de un cursor
 * desfasado es repetir trabajo: el upsert y el merge son idempotentes.
 */
export async function runSync(userId: string, cursors: SyncCursors): Promise<SyncResult> {
  // El corte se toma ANTES de leer nada: lo que se escriba mientras dura la
  // sincronización queda por encima del cursor y entra en la siguiente pasada.
  const snapshot = new Date().toISOString();

  // 1. Qué está pendiente de subir, antes de que el merge lo toque.
  const before = useDataStore.getState();
  const pending = {
    exercises: changedSince(before.exercises, cursors.lastPushedAt).map((r) => r.id),
    cycles: changedSince(before.cycles, cursors.lastPushedAt).map((r) => r.id),
    sessions: changedSince(before.sessions, cursors.lastPushedAt).map((r) => r.id),
  };
  const settingsPending =
    !cursors.lastPushedAt ||
    useSettingsStore.getState().settings.updatedAt > cursors.lastPushedAt;

  // 2. Bajada.
  const since = cursors.lastPulledAt;
  const [exercises, cycles, sessions] = await Promise.all([
    pullTable('exercises', userId, since, rowToExercise),
    pullTable('cycles', userId, since, rowToCycle),
    pullTable('sessions', userId, since, rowToSession),
  ]);
  const remoteSettings = await fetchRemoteSettings(userId);

  useDataStore.getState().mergeRemote({ exercises, cycles, sessions });
  if (remoteSettings) useSettingsStore.getState().applyRemoteSettings(remoteSettings);
  // Si la cuenta no traía ejercicios, siembra los de por defecto. Quedan por
  // encima del corte, así que los sube la pasada siguiente.
  useDataStore.getState().seedDefaults();

  // 3. Subida de la versión ya fusionada de lo que estaba pendiente.
  const after = useDataStore.getState();
  const outgoingExercises = pick(after.exercises, pending.exercises);
  const outgoingCycles = pick(after.cycles, pending.cycles);
  const outgoingSessions = pick(after.sessions, pending.sessions);

  await pushRows('exercises', outgoingExercises.map((r) => exerciseToRow(r, userId)));
  await pushRows('cycles', outgoingCycles.map((r) => cycleToRow(r, userId)));
  await pushRows('sessions', outgoingSessions.map((r) => sessionToRow(r, userId)));

  // Los ajustes son una única fila: solo se suben si los locales le ganan a
  // los de la nube, porque aquí el upsert no tiene merge que lo proteja.
  const localSettings = useSettingsStore.getState().settings;
  const pushSettings =
    settingsPending && (!remoteSettings || localSettings.updatedAt > remoteSettings.updatedAt);

  if (pushSettings) {
    const { error } = await client()
      .from('user_settings')
      .upsert(settingsToRow(localSettings, userId), { onConflict: 'user_id' });
    if (error) throw new Error(`No se pudieron guardar los ajustes: ${error.message}`);
  }

  return {
    pushed:
      outgoingExercises.length +
      outgoingCycles.length +
      outgoingSessions.length +
      (pushSettings ? 1 : 0),
    pulled: exercises.length + cycles.length + sessions.length,
    // Todo lo que existía en local al tomar el corte ya está arriba.
    lastPushedAt: snapshot,
    lastPulledAt: maxUpdatedAt([...exercises, ...cycles, ...sessions], cursors.lastPulledAt),
  };
}
