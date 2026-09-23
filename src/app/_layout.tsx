import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { Stack, useRouter } from 'expo-router';
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
import { Type } from '@/theme/typography';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

void SplashScreen.preventAutoHideAsync();

/**
 * La bienvenida se ofrece mientras no haya sesión y el usuario no haya
 * elegido ya: en el primer arranque, y otra vez al cerrar sesión, porque
 * salir de la cuenta reabre exactamente la pregunta que esta pantalla hace.
 *
 * `ready` espera a que las stores persistidas, la sesión de Supabase y la
 * tipografía estén listas; si no, un usuario con sesión vería la bienvenida un
 * instante, o la app arrancaría un fotograma con la fuente del sistema.
 */
function useWelcomeGate(fontsReady: boolean) {
  const welcomeHydrated = useHydrated(useWelcomeStore);
  const dataHydrated = useHydrated(useDataStore);
  const authStatus = useAuthStore((s) => s.status);
  const dismissed = useWelcomeStore((s) => s.dismissed);

  const ready = welcomeHydrated && dataHydrated && authStatus !== 'loading' && fontsReady;
  const showWelcome = ready && isSupabaseConfigured && authStatus === 'signedOut' && !dismissed;

  return { ready, showWelcome };
}

function RootStack({ fontsReady }: { fontsReady: boolean }) {
  const { ready, showWelcome } = useWelcomeGate(fontsReady);
  const router = useRouter();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Sin sesión, la bienvenida es la vista de entrada. Si el gate se abre
  // estando en otra pantalla —cerrar sesión desde Cuenta— hay que llevar allí
  // a mano: Cuenta vive fuera de los grupos protegidos, así que abrir el gate
  // no la quita de encima.
  //
  // Y este efecto tiene que vivir AQUÍ, no en la pantalla de Cuenta: React
  // ejecuta los efectos de los hijos antes que los del padre, así que desde
  // Cuenta la ruta /welcome todavía no está registrada en el navegador y el
  // replace se pierde sin dar ningún error.
  useEffect(() => {
    if (showWelcome) router.replace('/welcome');
  }, [showWelcome, router]);

  const { colors, scheme } = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerTitleStyle: { ...Type.heading, color: colors.text },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Protected guard={showWelcome}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!showWelcome}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
          <Stack.Screen
            name="exercise/new"
            options={{ title: t('exercises.addExercise'), presentation: 'modal' }}
          />
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
  // Archivo carga antes del primer fotograma: toda la interfaz la usa, así que
  // arrancar con la fuente del sistema y cambiarla después reflowea la app
  // entera a la vista. Si falla la carga, seguimos igualmente — mejor la
  // tipografía del sistema que una pantalla de arranque eterna.
  const [fontsLoaded, fontError] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
  });

  // Seed default exercises on first launch (idempotent; also covered on rehydrate).
  useEffect(() => {
    useDataStore.getState().seedDefaults();
  }, []);

  // Restaura la sesión y mantiene el dispositivo sincronizado con la nube.
  useCloudSync();

  return (
    <ThemeProvider>
      <RootStack fontsReady={fontsLoaded || !!fontError} />
    </ThemeProvider>
  );
}
