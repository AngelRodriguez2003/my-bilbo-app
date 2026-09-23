import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { BackupData, ImportMode } from '@/lib/backup';
import { mergeById } from '@/lib/merge';
import type { Cycle, Exercise, Session, SyncedRecord, Unit } from '@/types/models';

function newId(): string {
  // crypto.randomUUID is available in Hermes / RN 0.86+
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const now = () => new Date().toISOString();

/**
 * Records are normalized by id and soft-deleted (deleted flag + updatedAt)
 * so a per-record cloud sync can be layered on later without migration.
 */
interface DataState {
  exercises: Record<string, Exercise>;
  cycles: Record<string, Cycle>;
  sessions: Record<string, Session>;
  seeded: boolean;

  seedDefaults: () => void;
  /** `catalogId` solo si se eligió del catálogo; escrito a mano no lleva. */
  addExercise: (name: string, catalogId?: string) => Exercise;
  removeExercise: (id: string) => void;

  startCycle: (input: {
    exerciseId: string;
    unit: Unit;
    startWeight: number;
    incrementStep: number;
    oneRepMax?: number;
  }) => Cycle;
  closeCycle: (id: string) => void;

  logSession: (input: { cycleId: string; weight: number; reps: number; notes?: string }) => Session;
  removeSession: (id: string) => void;

  /** Aplica los registros que llegan de la nube (last-write-wins por updatedAt). */
  mergeRemote: (incoming: {
    exercises: Exercise[];
    cycles: Cycle[];
    sessions: Session[];
  }) => void;
  /** Vacía los datos locales: solo al entrar con una cuenta distinta. */
  resetLocal: () => void;

  /** Todo lo que necesita una copia de seguridad local. */
  exportData: () => BackupData;
  /** Restaura una copia: `merge` conserva lo más reciente, `replace` la impone. */
  importData: (data: BackupData, mode: ImportMode) => void;
}

/**
 * Los ejemplos llevan id fijo a propósito: es el mismo ejercicio en todos los
 * dispositivos, así que tiene que ser el mismo REGISTRO. Con ids aleatorios,
 * un dispositivo que ya había entrenado sin cuenta conserva sus ejemplos al
 * iniciar sesión (son trabajo real que no se puede tirar) y la nube baja los
 * suyos: dos «Press banca» distintos para la misma cosa. Con id fijo, el
 * last-write-wins del merge los funde en uno solo.
 */
const SEED_EXERCISES: Array<{ id: string; i18nKey: string; fallbackName: string }> = [
  { id: 'seed-bench-press', i18nKey: 'exercises.benchPress', fallbackName: 'Press banca' },
  { id: 'seed-lat-pulldown', i18nKey: 'exercises.latPulldown', fallbackName: 'Jalón al pecho' },
  { id: 'seed-squat', i18nKey: 'exercises.squat', fallbackName: 'Sentadilla' },
];

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      exercises: {},
      cycles: {},
      sessions: {},
      seeded: false,

      seedDefaults: () => {
        if (get().seeded) return;
        const exercises: Record<string, Exercise> = {};
        for (const seed of SEED_EXERCISES) {
          exercises[seed.id] = {
            id: seed.id,
            name: seed.fallbackName,
            i18nKey: seed.i18nKey,
            isCustom: false,
            createdAt: now(),
            updatedAt: now(),
            deleted: false,
          };
        }
        set({ exercises, seeded: true });
      },

      addExercise: (name, catalogId) => {
        const exercise: Exercise = {
          id: newId(),
          name: name.trim(),
          catalogId,
          // Del catálogo o no, lo ha añadido el usuario: cuenta como suyo
          // (isCustom distingue lo propio de los ejemplos sembrados).
          isCustom: true,
          createdAt: now(),
          updatedAt: now(),
          deleted: false,
        };
        set((s) => ({ exercises: { ...s.exercises, [exercise.id]: exercise } }));
        return exercise;
      },

      removeExercise: (id) => {
        set((s) => {
          const exercise = s.exercises[id];
          if (!exercise) return s;
          const cycles = { ...s.cycles };
          const sessions = { ...s.sessions };
          for (const cycle of Object.values(cycles)) {
            if (cycle.exerciseId !== id) continue;
            cycles[cycle.id] = { ...cycle, deleted: true, updatedAt: now() };
            for (const session of Object.values(sessions)) {
              if (session.cycleId === cycle.id) {
                sessions[session.id] = { ...session, deleted: true, updatedAt: now() };
              }
            }
          }
          return {
            exercises: { ...s.exercises, [id]: { ...exercise, deleted: true, updatedAt: now() } },
            cycles,
            sessions,
          };
        });
      },

      startCycle: ({ exerciseId, unit, startWeight, incrementStep, oneRepMax }) => {
        const cycle: Cycle = {
          id: newId(),
          exerciseId,
          unit,
          oneRepMax,
          startWeight,
          incrementStep,
          status: 'active',
          startDate: now(),
          updatedAt: now(),
          deleted: false,
        };
        set((s) => {
          // Only one active cycle per exercise: close any previous active one.
          const cycles = { ...s.cycles };
          for (const existing of Object.values(cycles)) {
            if (existing.exerciseId === exerciseId && existing.status === 'active' && !existing.deleted) {
              cycles[existing.id] = {
                ...existing,
                status: 'completed',
                endDate: now(),
                updatedAt: now(),
              };
            }
          }
          cycles[cycle.id] = cycle;
          return { cycles };
        });
        return cycle;
      },

      closeCycle: (id) => {
        set((s) => {
          const cycle = s.cycles[id];
          if (!cycle) return s;
          return {
            cycles: {
              ...s.cycles,
              [id]: { ...cycle, status: 'completed', endDate: now(), updatedAt: now() },
            },
          };
        });
      },

      logSession: ({ cycleId, weight, reps, notes }) => {
        const existing = Object.values(get().sessions).filter(
          (s) => s.cycleId === cycleId && !s.deleted,
        );
        const session: Session = {
          id: newId(),
          cycleId,
          index: existing.length + 1,
          weight,
          reps,
          notes: notes?.trim() || undefined,
          date: now(),
          updatedAt: now(),
          deleted: false,
        };
        set((s) => ({ sessions: { ...s.sessions, [session.id]: session } }));
        return session;
      },

      removeSession: (id) => {
        set((s) => {
          const session = s.sessions[id];
          if (!session) return s;
          return {
            sessions: { ...s.sessions, [id]: { ...session, deleted: true, updatedAt: now() } },
          };
        });
      },

      mergeRemote: ({ exercises, cycles, sessions }) => {
        set((s) => {
          const merged = {
            exercises: mergeById(s.exercises, exercises),
            cycles: mergeById(s.cycles, cycles),
            sessions: mergeById(s.sessions, sessions),
            // Si la nube ya trae ejercicios, no hay que sembrar los de por
            // defecto: duplicarían la lista del usuario en este dispositivo.
            seeded: s.seeded || exercises.length > 0,
          };

          // Devolver el mismo estado es la única forma de que zustand NO avise
          // a sus suscriptores. Y hay que hacerlo: la sincronización escucha
          // los cambios del store para programar la siguiente subida, así que
          // un merge que "cambia" sin cambiar nada se realimenta y deja la app
          // pidiendo al backend cada pocos segundos para siempre.
          const unchanged =
            merged.exercises === s.exercises &&
            merged.cycles === s.cycles &&
            merged.sessions === s.sessions &&
            merged.seeded === s.seeded;

          return unchanged ? s : merged;
        });
      },

      resetLocal: () => {
        set({ exercises: {}, cycles: {}, sessions: {}, seeded: false });
      },

      exportData: () => {
        const { exercises, cycles, sessions } = get();
        return { exercises, cycles, sessions };
      },

      importData: (data, mode) => {
        // Sellar con la hora de ahora es lo que hace que una restauración
        // valga también contra la nube: los registros del archivo traen
        // fechas viejas y, sin esto, el last-write-wins del sync los
        // descartaría en cuanto el dispositivo volviera a sincronizar.
        const stamp = now();
        const apply = mode === 'replace' ? restoreRecords : adoptRecords;
        set((s) => ({
          exercises: apply(s.exercises, data.exercises, stamp),
          cycles: apply(s.cycles, data.cycles, stamp),
          sessions: apply(s.sessions, data.sessions, stamp),
          // La copia ya trae los ejercicios: sembrar los de ejemplo encima
          // duplicaría la lista.
          seeded: true,
        }));
      },
    }),
    {
      name: 'bilbo-data',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.seedDefaults();
      },
    },
  ),
);

/**
 * Copia combinada: gana el más reciente por `updatedAt` (igual que la nube) y
 * los que entran se re-sellan con `stamp` para que suban en la próxima pasada.
 */
function adoptRecords<T extends SyncedRecord>(
  local: Record<string, T>,
  incoming: Record<string, T>,
  stamp: string,
): Record<string, T> {
  const merged = mergeById(local, Object.values(incoming));
  if (merged === local) return local;

  for (const [id, record] of Object.entries(incoming)) {
    // Identidad, no igualdad: mergeById deja el objeto entrante tal cual
    // cuando gana, así que esto marca exactamente los que se han adoptado.
    if (merged[id] === record) merged[id] = { ...record, updatedAt: stamp };
  }
  return merged;
}

/**
 * Copia que reemplaza: el dispositivo queda con lo del archivo y nada más.
 * Lo local que no está en la copia se marca como borrado en vez de
 * desaparecer, que es lo único que la nube sabe propagar a otros dispositivos.
 */
function restoreRecords<T extends SyncedRecord>(
  local: Record<string, T>,
  incoming: Record<string, T>,
  stamp: string,
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [id, record] of Object.entries(local)) {
    if (!incoming[id]) out[id] = { ...record, deleted: true, updatedAt: stamp };
  }
  for (const [id, record] of Object.entries(incoming)) {
    out[id] = { ...record, updatedAt: stamp };
  }
  return out;
}

// ---- Selectors (avoid recomputing in components) ----

export function selectVisibleExercises(s: DataState): Exercise[] {
  return Object.values(s.exercises)
    .filter((e) => !e.deleted)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function selectActiveCycle(s: DataState, exerciseId: string): Cycle | undefined {
  return Object.values(s.cycles).find(
    (c) => c.exerciseId === exerciseId && c.status === 'active' && !c.deleted,
  );
}

export function selectCompletedCycles(s: DataState, exerciseId: string): Cycle[] {
  return Object.values(s.cycles)
    .filter((c) => c.exerciseId === exerciseId && c.status === 'completed' && !c.deleted)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function selectCycleSessions(s: DataState, cycleId: string): Session[] {
  return Object.values(s.sessions)
    .filter((x) => x.cycleId === cycleId && !x.deleted)
    .sort((a, b) => a.index - b.index);
}
