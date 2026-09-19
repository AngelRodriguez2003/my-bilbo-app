import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n, { resolveLanguage } from '@/i18n';
import type { LanguagePreference, Settings, ThemePreference, Unit } from '@/types/models';

interface SettingsState {
  settings: Settings;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: LanguagePreference) => void;
  setDefaultUnit: (unit: Unit) => void;
  setDefaultIncrement: (increment: number) => void;
  /** Aplica los ajustes que llegan de la nube (solo si son más recientes). */
  applyRemoteSettings: (remote: Settings) => void;
}

/** Ajustes que nunca se han tocado: cualquier versión en la nube les gana. */
const EPOCH = new Date(0).toISOString();

const defaultSettings: Settings = {
  theme: 'system',
  language: 'system',
  defaultUnit: 'kg',
  defaultIncrement: 2.5,
  updatedAt: EPOCH,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => {
      // Cada cambio se sella con la hora local: es lo que arbitra el
      // last-write-wins contra la copia de la nube.
      const patch = (changes: Partial<Settings>) => (s: SettingsState) => ({
        settings: { ...s.settings, ...changes, updatedAt: new Date().toISOString() },
      });

      return {
        settings: defaultSettings,
        setTheme: (theme) => set(patch({ theme })),
        setLanguage: (language) => {
          i18n.changeLanguage(resolveLanguage(language));
          set(patch({ language }));
        },
        setDefaultUnit: (defaultUnit) => set(patch({ defaultUnit })),
        setDefaultIncrement: (defaultIncrement) => set(patch({ defaultIncrement })),

        applyRemoteSettings: (remote) =>
          set((s) => {
            if (remote.updatedAt <= s.settings.updatedAt) return s;
            i18n.changeLanguage(resolveLanguage(remote.language));
            return { settings: remote };
          }),
      };
    },
    {
      name: 'bilbo-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Instalaciones anteriores a la sincronización no tienen updatedAt.
        if (!state.settings.updatedAt) state.settings.updatedAt = EPOCH;
        // Aplica el idioma guardado una vez cargados los ajustes.
        i18n.changeLanguage(resolveLanguage(state.settings.language));
      },
    },
  ),
);
