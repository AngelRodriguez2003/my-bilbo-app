import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface BackupState {
  /** ISO de la última copia exportada; null si no se ha hecho ninguna. */
  lastBackupAt: string | null;
  markBackedUp: (at: string) => void;
}

/**
 * Solo local: cuándo se guardó la última copia es un dato de ESTE dispositivo.
 * Fuera de `Settings` a propósito — esos sí viajan a la nube, y la fila remota
 * sobrescribiría el dato al sincronizar.
 */
export const useBackupStore = create<BackupState>()(
  persist(
    (set) => ({
      lastBackupAt: null,
      markBackedUp: (lastBackupAt) => set({ lastBackupAt }),
    }),
    {
      name: 'bilbo-backup',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
