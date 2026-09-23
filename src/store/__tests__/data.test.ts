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

describe('importData', () => {
  const backup = (updatedAt: string) => ({
    exercises: { a: exercise('a', updatedAt) },
    cycles: {},
    sessions: {},
  });

  beforeEach(() => {
    useDataStore.setState({ exercises: {}, cycles: {}, sessions: {}, seeded: false });
  });

  it('merge keeps the most recent record', () => {
    useDataStore.setState({ exercises: { a: exercise('a', '2026-01-05T00:00:00.000Z') } });
    useDataStore.getState().importData(backup('2026-01-01T00:00:00.000Z'), 'merge');

    // La copia es más vieja: el registro local se queda como estaba.
    expect(useDataStore.getState().exercises.a.updatedAt).toBe('2026-01-05T00:00:00.000Z');
  });

  /**
   * Los registros del archivo traen fechas viejas. Sin volver a sellarlos,
   * el cursor de subida los daría por ya sincronizados y nunca llegarían a
   * la nube: una restauración que se pierde en el siguiente arranque.
   */
  it('re-stamps the records it adopts so the sync uploads them', () => {
    const before = new Date().toISOString();
    useDataStore.getState().importData(backup('2020-01-01T00:00:00.000Z'), 'merge');

    expect(useDataStore.getState().exercises.a.updatedAt >= before).toBe(true);
  });

  it('replace soft-deletes what the backup does not contain', () => {
    useDataStore.setState({ exercises: { a: exercise('a', '2026-01-01T00:00:00.000Z') } });
    useDataStore.getState().importData(
      { exercises: { b: exercise('b', '2026-01-01T00:00:00.000Z') }, cycles: {}, sessions: {} },
      'replace',
    );

    const { exercises } = useDataStore.getState();
    // Borrado lógico, no desaparición: es lo único que la nube propaga.
    expect(exercises.a.deleted).toBe(true);
    expect(exercises.b.deleted).toBe(false);
  });

  it('marks the store as seeded so the sample exercises are not re-added', () => {
    useDataStore.getState().importData(backup('2026-01-01T00:00:00.000Z'), 'merge');

    expect(useDataStore.getState().seeded).toBe(true);
    useDataStore.getState().seedDefaults();
    expect(Object.keys(useDataStore.getState().exercises)).toEqual(['a']);
  });
});

describe('exportData', () => {
  it('returns every record, including the soft-deleted ones', () => {
    const deleted = { ...exercise('gone', '2026-01-01T00:00:00.000Z'), deleted: true };
    useDataStore.setState({ exercises: { gone: deleted }, cycles: {}, sessions: {} });

    // Las lápidas viajan en la copia: sin ellas, restaurar resucitaría
    // ejercicios que el usuario ya había borrado.
    expect(Object.keys(useDataStore.getState().exportData().exercises)).toEqual(['gone']);
  });
});

describe('seedDefaults', () => {
  it('always uses the same ids, so two devices do not duplicate the samples', () => {
    useDataStore.setState({ exercises: {}, cycles: {}, sessions: {}, seeded: false });
    useDataStore.getState().seedDefaults();
    const first = Object.keys(useDataStore.getState().exercises).sort();

    // Un segundo dispositivo, sembrando por su cuenta: con ids aleatorios
    // cada uno crearía su propio «Press banca» y al sincronizar la lista
    // saldría repetida. Con ids fijos, el merge los reconoce como el mismo.
    useDataStore.setState({ exercises: {}, cycles: {}, sessions: {}, seeded: false });
    useDataStore.getState().seedDefaults();
    const second = Object.keys(useDataStore.getState().exercises).sort();

    expect(first).toEqual(second);
    expect(first.length).toBe(3);
  });
});
