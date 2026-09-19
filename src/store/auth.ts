import { create } from 'zustand';

import { errorMessage, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useSyncStore } from '@/store/sync';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

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
    const { error } = await supabase.auth.signOut();
    set({ busy: false, error: error ? errorMessage(error) : null });
  },

  clearMessages: () => set({ error: null, notice: null }),
}));
