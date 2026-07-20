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
}

const defaultSettings: Settings = {
  theme: 'system',
  language: 'system',
  defaultUnit: 'kg',
  defaultIncrement: 2.5,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
      setLanguage: (language) => {
        i18n.changeLanguage(resolveLanguage(language));
        set((s) => ({ settings: { ...s.settings, language } }));
      },
      setDefaultUnit: (defaultUnit) => set((s) => ({ settings: { ...s.settings, defaultUnit } })),
      setDefaultIncrement: (defaultIncrement) =>
        set((s) => ({ settings: { ...s.settings, defaultIncrement } })),
    }),
    {
      name: 'bilbo-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Apply the persisted language override once settings are loaded.
        if (state) i18n.changeLanguage(resolveLanguage(state.settings.language));
      },
    },
  ),
);
