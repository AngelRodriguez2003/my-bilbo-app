// jest exige el prefijo `mock` para poder usarla dentro de la factoría.
let mockSignOutResult: { error: { message: string } | null } = { error: null };

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  NETWORK_ERROR: '__network__',
  errorMessage: (error: unknown) => String(error),
  supabase: {
    auth: {
      signOut: jest.fn(async () => mockSignOutResult),
      getSession: jest.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

import { useAuthStore } from '@/store/auth';
import { useWelcomeStore } from '@/store/welcome';

describe('signOut', () => {
  beforeEach(() => {
    mockSignOutResult = { error: null };
    useWelcomeStore.setState({ dismissed: true });
  });

  /**
   * Cerrar sesión deshace la elección que hizo desaparecer la bienvenida, así
   * que hay que devolver al usuario a ese mismo punto de entrada. Si no, se
   * queda en las pestañas sin forma evidente de volver a entrar.
   */
  it('reopens the welcome screen', async () => {
    await useAuthStore.getState().signOut();

    expect(useWelcomeStore.getState().dismissed).toBe(false);
  });

  it('leaves it dismissed when signing out fails', async () => {
    mockSignOutResult = { error: { message: 'sin conexión' } };

    await useAuthStore.getState().signOut();

    expect(useWelcomeStore.getState().dismissed).toBe(true);
    expect(useAuthStore.getState().error).toBeTruthy();
  });
});
