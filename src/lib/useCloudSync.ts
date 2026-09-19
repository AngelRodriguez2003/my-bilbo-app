import { useEffect } from 'react';
import { AppState } from 'react-native';

import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { useSettingsStore } from '@/store/settings';
import { useSyncStore } from '@/store/sync';

/**
 * Conecta la sincronización a los tres momentos en los que hace falta:
 * al restaurar la sesión, cuando cambian los datos locales y cuando la app
 * vuelve a primer plano (que es cuando se recuperan los cambios hechos en
 * el otro dispositivo). Se monta una sola vez, en el layout raíz.
 */
export function useCloudSync() {
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const stopAuth = useAuthStore.getState().init();

    const schedule = () => useSyncStore.getState().scheduleSync();
    const stopData = useDataStore.subscribe(schedule);
    const stopSettings = useSettingsStore.subscribe(schedule);

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void useSyncStore.getState().syncNow();
    });

    return () => {
      stopAuth();
      stopData();
      stopSettings();
      appState.remove();
    };
  }, []);
}
