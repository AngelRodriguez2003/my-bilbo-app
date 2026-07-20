import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/store/settings';
import { darkColors, lightColors, type ThemeColors } from '@/theme/colors';

interface ThemeContextValue {
  colors: ThemeColors;
  /** Resolved scheme after applying the user preference. */
  scheme: 'dark' | 'light';
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  scheme: 'dark',
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSettingsStore((s) => s.settings.theme);
  const systemScheme = useColorScheme();

  // Dark is the app default: 'system' only yields light when the OS says light.
  const scheme: 'dark' | 'light' =
    preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

  const colors = scheme === 'dark' ? darkColors : lightColors;

  return <ThemeContext.Provider value={{ colors, scheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
