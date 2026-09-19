import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Variables EXPO_PUBLIC_*: Expo las inlinea en el bundle, así que solo pueden
// contener valores públicos. La clave anon/publishable lo es por diseño; los
// datos los protege RLS (ver supabase/schema.sql). La service key NUNCA va aquí.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** false cuando el .env no está configurado: la app funciona igual, solo en local. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * `expo export --platform web` pre-renderiza cada ruta en Node, donde no
 * existe `window`. supabase-js lee la sesión nada más construirse y eso
 * revienta el build estático, así que en el pase de pre-render no se crea
 * cliente: el navegador lo construye al hidratar, que es cuando hace falta.
 */
const canCreateClient =
  isSupabaseConfigured && (Platform.OS !== 'web' || typeof window !== 'undefined');

export const supabase: SupabaseClient | null = canCreateClient
  ? createClient(url as string, anonKey as string, {
      auth: {
        // La guía de Expo propone el localStorage de expo-sqlite, pero en web
        // eso arrastra un worker de wa-sqlite (wasm + cabeceras COOP/COEP) y
        // rompe el export estático. AsyncStorage ya es dependencia de la app
        // y cubre iOS, Android y web con la misma API.
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        // En nativo no hay URL de la que leer la sesión tras un redirect.
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

// En nativo el refresco automático del token debe pararse con la app en
// segundo plano; si no, supabase-js deja timers vivos que nunca se resuelven.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/**
 * Centinela para "no hay red". La UI lo traduce; el resto de errores se
 * muestran tal cual porque vienen ya redactados desde Supabase.
 */
export const NETWORK_ERROR = '__network__';

/** Mensaje legible para el usuario a partir de un error cualquiera. */
export function errorMessage(error: unknown): string {
  const raw =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  // Cada plataforma redacta el fallo de fetch a su manera.
  return /failed to fetch|network request failed|load failed|fetch failed/i.test(raw)
    ? NETWORK_ERROR
    : raw;
}
