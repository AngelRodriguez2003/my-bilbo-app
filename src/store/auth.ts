import { create } from 'zustand';

import { errorMessage, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { countPendingChanges, useSyncStore } from '@/store/sync';
import { useWelcomeStore } from '@/store/welcome';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

/**
 * Centinela: no se pudo cerrar sesión porque quedan cambios sin subir.
 * La UI lo traduce con el número de cambios pendientes.
 */
export const SIGN_OUT_PENDING = '__signOutPending__';

interface AuthState {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  /** Una operación de auth en curso (bloquea el formulario). */
  busy: boolean;
  error: string | null;
  /** Aviso informativo, p. ej. "confirma tu correo". */
  notice: string | null;

  /** Arranca la sesión guardada y escucha cambios. Devuelve el limpiador. */
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearMessages: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: isSupabaseConfigured ? 'loading' : 'signedOut',
  userId: null,
  email: null,
  busy: false,
  error: null,
  notice: null,

  init: () => {
    if (!supabase) return () => {};

    const apply = (session: { user: { id: string; email?: string } } | null) => {
      const previous = get().userId;
      const userId = session?.user.id ?? null;

      set({
        status: userId ? 'signedIn' : 'signedOut',
        userId,
        email: session?.user.email ?? null,
      });

      // onAuthStateChange también dispara en cada refresco de token; sin esta
      // guarda relanzaríamos una sincronización completa cada hora.
      if (userId !== previous) void useSyncStore.getState().setUser(userId);
    };

    void supabase.auth.getSession().then(({ data }) => apply(data.session));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => data.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    if (!supabase) return;
    set({ busy: true, error: null, notice: null });
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    // El cambio de estado lo aplica onAuthStateChange, no hace falta set aquí.
    set({ busy: false, error: error ? errorMessage(error) : null });
  },

  signUp: async (email, password) => {
    if (!supabase) return;
    set({ busy: true, error: null, notice: null });
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });

    set({
      busy: false,
      error: error ? errorMessage(error) : null,
      // Sin sesión inmediata = el proyecto exige confirmar el correo.
      notice: !error && !data.session ? 'confirmEmail' : null,
    });
  },

  signOut: async () => {
    if (!supabase) return;
    set({ busy: true, error: null, notice: null });

    // Subir lo pendiente ANTES de cerrar: después no habrá sesión con la que
    // hablar con la nube y los datos locales se van a borrar. El orden es lo
    // único que separa "cerrar sesión" de "perder las series de hoy".
    if (countPendingChanges() > 0) {
      await useSyncStore.getState().syncNow();

      if (countPendingChanges() > 0) {
        // Sin conexión, normalmente. Cerrar ahora borraría cambios que no
        // están en ningún otro sitio, así que no se cierra nada.
        set({ busy: false, error: SIGN_OUT_PENDING });
        return;
      }
    }

    const { error } = await supabase.auth.signOut();

    if (!error) {
      // Solo al cerrar sesión a propósito, no cuando caduca el token: a nadie
      // hay que sacarlo de sus datos porque se le haya vencido una sesión.
      useSyncStore.getState().forgetDevice();
      useWelcomeStore.getState().reopen();
    }

    set({ busy: false, error: error ? errorMessage(error) : null });
  },

  clearMessages: () => set({ error: null, notice: null }),
}));
