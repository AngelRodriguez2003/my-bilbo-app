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

import { SIGN_OUT_PENDING, useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { useSyncStore } from '@/store/sync';
import { useWelcomeStore } from '@/store/welcome';
import type { Cycle } from '@/types/models';

function cycle(id: string, updatedAt: string): Cycle {
  return {
    id,
    exerciseId: 'e1',
    unit: 'kg',
    startWeight: 40,
    incrementStep: 2.5,
    status: 'active',
    startDate: updatedAt,
    updatedAt,
    deleted: false,
  };
}

describe('signOut', () => {
  beforeEach(() => {
    mockSignOutResult = { error: null };
    useWelcomeStore.setState({ dismissed: true });
    useDataStore.setState({ exercises: {}, cycles: {}, sessions: {}, seeded: true });
    useSyncStore.setState({
      ownerUserId: 'u1',
      sessionUserId: 'u1',
      // Todo subido: sin cambios pendientes.
      lastPushedAt: '2030-01-01T00:00:00.000Z',
      lastPulledAt: '2030-01-01T00:00:00.000Z',
    });
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

describe('signOut y los datos del dispositivo', () => {
  beforeEach(() => {
    mockSignOutResult = { error: null };
    useWelcomeStore.setState({ dismissed: true });
    useDataStore.setState({ exercises: {}, cycles: {}, sessions: {}, seeded: true });
  });

  /**
   * Dejar el historial cargado tras cerrar sesión lo deja a la vista de quien
   * coja el dispositivo después. Los datos siguen en la nube.
   */
  it('wipes the account data off the device', async () => {
    useSyncStore.setState({
      ownerUserId: 'u1',
      sessionUserId: 'u1',
      lastPushedAt: '2030-01-01T00:00:00.000Z',
      lastPulledAt: '2030-01-01T00:00:00.000Z',
    });
    useDataStore.setState({ cycles: { c1: cycle('c1', '2026-01-01T00:00:00.000Z') } });

    await useAuthStore.getState().signOut();

    expect(useDataStore.getState().cycles).toEqual({});
    expect(useSyncStore.getState().ownerUserId).toBeNull();
    expect(useSyncStore.getState().lastPushedAt).toBeNull();
  });

  /**
   * Lo contrario sería borrar series que no están en ningún otro sitio. El
   * caso típico: cerrar sesión sin cobertura justo después de entrenar.
   */
  it('refuses to sign out while changes are still waiting to upload', async () => {
    useSyncStore.setState({
      ownerUserId: 'u1',
      sessionUserId: 'u1',
      lastPushedAt: '2026-01-01T00:00:00.000Z',
      lastPulledAt: '2026-01-01T00:00:00.000Z',
      // Una sincronización que no consigue subir nada (sin conexión).
      syncNow: jest.fn(async () => {}),
    });
    useDataStore.setState({ cycles: { c1: cycle('c1', '2026-06-01T00:00:00.000Z') } });

    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState().error).toBe(SIGN_OUT_PENDING);
    expect(useDataStore.getState().cycles.c1).toBeDefined();
    expect(useWelcomeStore.getState().dismissed).toBe(true);
  });
});
