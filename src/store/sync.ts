import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { changedSince } from '@/lib/merge';
import { errorMessage } from '@/lib/supabase';
import { runSync } from '@/lib/sync';
import { useDataStore } from '@/store/data';
import { useSettingsStore } from '@/store/settings';

export type SyncStatus = 'idle' | 'syncing' | 'error';

/** Espera tras un cambio local antes de subirlo: agrupa ráfagas de edición. */
const DEBOUNCE_MS = 2500;

interface SyncState {
  status: SyncStatus;
  error: string | null;
  /** Última sincronización correcta (para mostrar en Ajustes). */
  lastSyncedAt: string | null;
  /** Cursor de subida, en el reloj de ESTE dispositivo. */
  lastPushedAt: string | null;
  /** Cursor de bajada, en el reloj del servidor. */
  lastPulledAt: string | null;
  /** Cuenta a la que pertenecen los datos guardados en este dispositivo. */
  ownerUserId: string | null;
  /** Usuario de la sesión actual; null si no hay sesión iniciada. */
  sessionUserId: string | null;

  setUser: (userId: string | null) => Promise<void>;
  syncNow: (options?: { full?: boolean }) => Promise<void>;
  scheduleSync: () => void;
  /** Borra del dispositivo los datos de la cuenta. Solo al cerrar sesión. */
  forgetDevice: () => void;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
/** Evita que dos disparadores (foreground + cambio local) sincronicen a la vez. */
let inFlight: Promise<void> | null = null;

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      error: null,
      lastSyncedAt: null,
      lastPushedAt: null,
      lastPulledAt: null,
      ownerUserId: null,
      sessionUserId: null,

      setUser: async (userId) => {
        if (!userId) {
          // Aquí NO se borra nada: esto también se dispara cuando caduca el
          // token, y nadie debería perder sus datos porque se le haya vencido
          // una sesión en segundo plano. El borrado al cerrar sesión a
          // propósito lo hace forgetDevice(), desde signOut().
          set({ sessionUserId: null, status: 'idle', error: null });
          return;
        }

        const { ownerUserId } = get();

        if (ownerUserId !== userId) {
          // Otra cuenta en el mismo dispositivo: sin esto, el historial del
          // usuario anterior se subiría a la cuenta nueva y la contaminaría.
          // Y en un dispositivo recién instalado (ownerUserId null) sobran
          // los ejercicios de ejemplo: se duplicarían con los que ya tiene la
          // cuenta en la nube. Lo que sí se conserva es el trabajo real hecho
          // sin cuenta — ese se adopta y sube entero.
          if (ownerUserId || isUntouched()) {
            useDataStore.getState().resetLocal();
            set({ lastPushedAt: null, lastPulledAt: null, lastSyncedAt: null });
          }
        }

        set({ ownerUserId: userId, sessionUserId: userId, error: null });
        await get().syncNow();
      },

      syncNow: async ({ full = false } = {}) => {
        const { sessionUserId } = get();
        if (!sessionUserId) return;
        if (inFlight) return inFlight;

        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }

        set({ status: 'syncing', error: null });

        inFlight = (async () => {
          try {
            const { lastPushedAt, lastPulledAt } = get();
            const result = await runSync(sessionUserId, {
              lastPushedAt: full ? null : lastPushedAt,
              lastPulledAt: full ? null : lastPulledAt,
            });
            set({
              status: 'idle',
              error: null,
              lastSyncedAt: new Date().toISOString(),
              lastPushedAt: result.lastPushedAt,
              lastPulledAt: result.lastPulledAt,
            });
          } catch (error) {
            // Los cursores no se tocan: la próxima pasada reintenta lo mismo.
            set({ status: 'error', error: errorMessage(error) });
          } finally {
            inFlight = null;
          }
        })();

        return inFlight;
      },

      forgetDevice: () => {
        // Los datos se quedan en la nube; signOut() se asegura de que no haya
        // nada sin subir antes de llamar aquí. Dejarlos en el dispositivo los
        // expondría a quien coja el móvil después de cerrar sesión.
        useDataStore.getState().resetLocal();
        // Deja la app como recién instalada, no con la lista vacía.
        useDataStore.getState().seedDefaults();
        set({
          ownerUserId: null,
          sessionUserId: null,
          lastPushedAt: null,
          lastPulledAt: null,
          lastSyncedAt: null,
          status: 'idle',
          error: null,
        });
      },

      scheduleSync: () => {
        if (!get().sessionUserId) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          void get().syncNow();
        }, DEBOUNCE_MS);
      },
    }),
    {
      name: 'bilbo-sync',
      storage: createJSONStorage(() => AsyncStorage),
      // `status` y `sessionUserId` se rehacen en cada arranque a partir de la
      // sesión real de Supabase; persistirlos solo daría estados fantasma.
      partialize: (state) => ({
        lastSyncedAt: state.lastSyncedAt,
        lastPushedAt: state.lastPushedAt,
        lastPulledAt: state.lastPulledAt,
        ownerUserId: state.ownerUserId,
      }),
    },
  ),
);

/**
 * true cuando en este dispositivo no hay nada que merezca la pena conservar:
 * solo los ejercicios sembrados al instalar, sin ciclos ni series.
 */
function isUntouched(): boolean {
  const { exercises, cycles, sessions } = useDataStore.getState();
  return (
    Object.keys(cycles).length === 0 &&
    Object.keys(sessions).length === 0 &&
    Object.values(exercises).every((exercise) => !exercise.isCustom)
  );
}

/** Cambios locales que aún no han subido; se muestra en Ajustes. */
export function countPendingChanges(): number {
  const cursor = useSyncStore.getState().lastPushedAt;
  const data = useDataStore.getState();
  const settings = useSettingsStore.getState().settings;

  return (
    changedSince(data.exercises, cursor).length +
    changedSince(data.cycles, cursor).length +
    changedSince(data.sessions, cursor).length +
    (!cursor || settings.updatedAt > cursor ? 1 : 0)
  );
}
