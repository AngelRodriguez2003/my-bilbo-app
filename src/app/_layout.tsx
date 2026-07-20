import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import '@/i18n';
import { useDataStore } from '@/store/data';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

function RootStack() {
  const { colors, scheme } = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
        <Stack.Screen
          name="cycle/new"
          options={{ title: t('cycle.newCycle'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="session/new"
          options={{ title: t('session.logSession'), presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  // Seed default exercises on first launch (idempotent; also covered on rehydrate).
  useEffect(() => {
    useDataStore.getState().seedDefaults();
  }, []);

  return (
    <ThemeProvider>
      <RootStack />
    </ThemeProvider>
  );
}
