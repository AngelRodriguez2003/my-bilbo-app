import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Cycle, Exercise, Session, Unit } from '@/types/models';

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
  addExercise: (name: string) => Exercise;
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
}

const SEED_EXERCISES: Array<{ i18nKey: string; fallbackName: string }> = [
  { i18nKey: 'exercises.benchPress', fallbackName: 'Press banca' },
  { i18nKey: 'exercises.latPulldown', fallbackName: 'Jalón al pecho' },
  { i18nKey: 'exercises.squat', fallbackName: 'Sentadilla' },
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
          const id = newId();
          exercises[id] = {
            id,
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

      addExercise: (name) => {
        const exercise: Exercise = {
          id: newId(),
          name: name.trim(),
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
