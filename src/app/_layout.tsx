import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import '@/i18n';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useCloudSync } from '@/lib/useCloudSync';
import { useHydrated } from '@/lib/useHydrated';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { useWelcomeStore } from '@/store/welcome';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

void SplashScreen.preventAutoHideAsync();

/**
 * La bienvenida solo se ofrece en el primer arranque: sin entrenamientos, sin
 * sesión y sin haber elegido ya. `ready` espera a que las stores persistidas y
 * la sesión de Supabase estén leídas; si no, un usuario con datos vería la
 * bienvenida un instante y uno nuevo vería las pestañas.
 */
function useWelcomeGate() {
  const welcomeHydrated = useHydrated(useWelcomeStore);
  const dataHydrated = useHydrated(useDataStore);
  const authStatus = useAuthStore((s) => s.status);
  const dismissed = useWelcomeStore((s) => s.dismissed);
  const hasCycles = useDataStore((s) => Object.keys(s.cycles).length > 0);

  const ready = welcomeHydrated && dataHydrated && authStatus !== 'loading';
  const showWelcome =
    ready && isSupabaseConfigured && authStatus === 'signedOut' && !dismissed && !hasCycles;

  return { ready, showWelcome };
}

function RootStack() {
  const { ready, showWelcome } = useWelcomeGate();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

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
        <Stack.Protected guard={showWelcome}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!showWelcome}>
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
        </Stack.Protected>
        <Stack.Screen
          name="account"
          options={{ title: t('account.title'), presentation: 'modal' }}
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

  // Restaura la sesión y mantiene el dispositivo sincronizado con la nube.
  useCloudSync();

  return (
    <ThemeProvider>
      <RootStack />
    </ThemeProvider>
  );
}
