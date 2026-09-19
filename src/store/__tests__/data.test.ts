import { useDataStore } from '@/store/data';
import type { Exercise } from '@/types/models';

function exercise(id: string, updatedAt: string): Exercise {
  return {
    id,
    name: id,
    isCustom: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    deleted: false,
  };
}

describe('mergeRemote', () => {
  beforeEach(() => {
    useDataStore.setState({ exercises: {}, cycles: {}, sessions: {}, seeded: true });
  });

  it('applies remote records', () => {
    useDataStore.getState().mergeRemote({
      exercises: [exercise('a', '2026-01-02T00:00:00.000Z')],
      cycles: [],
      sessions: [],
    });

    expect(useDataStore.getState().exercises.a.name).toBe('a');
  });

  /**
   * La sincronización se reprograma escuchando este store. Si un merge sin
   * cambios despertara a los suscriptores, cada pasada agendaría la
   * siguiente y la app acabaría pidiendo al backend en bucle.
   */
  it('does not notify subscribers when the merge changes nothing', () => {
    const listener = jest.fn();
    const unsubscribe = useDataStore.subscribe(listener);

    const incoming = {
      exercises: [exercise('a', '2026-01-02T00:00:00.000Z')],
      cycles: [],
      sessions: [],
    };

    useDataStore.getState().mergeRemote(incoming);
    expect(listener).toHaveBeenCalledTimes(1);

    // La misma respuesta del servidor otra vez: nada que aplicar, nadie a quien avisar.
    useDataStore.getState().mergeRemote(incoming);
    useDataStore.getState().mergeRemote(incoming);
    expect(listener).toHaveBeenCalledTimes(1);

    // Y un pull vacío, que es el caso normal, tampoco despierta a nadie.
    useDataStore.getState().mergeRemote({ exercises: [], cycles: [], sessions: [] });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('ignores a remote record older than the local one, without notifying', () => {
    useDataStore.setState({ exercises: { a: exercise('a', '2026-01-05T00:00:00.000Z') } });

    const listener = jest.fn();
    const unsubscribe = useDataStore.subscribe(listener);

    useDataStore.getState().mergeRemote({
      exercises: [exercise('a', '2026-01-04T00:00:00.000Z')],
      cycles: [],
      sessions: [],
    });

    expect(listener).not.toHaveBeenCalled();
    expect(useDataStore.getState().exercises.a.updatedAt).toBe('2026-01-05T00:00:00.000Z');
    unsubscribe();
  });
});
