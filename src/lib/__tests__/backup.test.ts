import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupError,
  backupFileName,
  countBackup,
  createBackup,
  parseBackup,
  serializeBackup,
  type BackupData,
} from '@/lib/backup';
import type { Settings } from '@/types/models';

const settings: Settings = {
  theme: 'dark',
  language: 'es',
  defaultUnit: 'kg',
  defaultIncrement: 2.5,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeData(): BackupData {
  return {
    exercises: {
      e1: {
        id: 'e1',
        name: 'Press banca',
        isCustom: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        deleted: false,
      },
    },
    cycles: {
      c1: {
        id: 'c1',
        exerciseId: 'e1',
        unit: 'kg',
        startWeight: 40,
        incrementStep: 2.5,
        status: 'active',
        startDate: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        deleted: false,
      },
    },
    sessions: {
      s1: {
        id: 's1',
        cycleId: 'c1',
        index: 1,
        weight: 40,
        reps: 8,
        date: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
        deleted: false,
      },
    },
  };
}

describe('createBackup / parseBackup round trip', () => {
  it('restores the same records and settings', () => {
    const data = makeData();
    const parsed = parseBackup(serializeBackup(createBackup(data, settings)), settings);

    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.data).toEqual(data);
    expect(parsed.settings).toEqual(settings);
  });
});

describe('parseBackup validation', () => {
  it('rejects text that is not JSON', () => {
    expect(() => parseBackup('not json', settings)).toThrow(
      expect.objectContaining({ code: 'invalidJson' }),
    );
  });

  it('rejects JSON from another app', () => {
    expect(() => parseBackup(JSON.stringify({ hello: 'world' }), settings)).toThrow(
      expect.objectContaining({ code: 'notABackup' }),
    );
  });

  it('rejects a backup from a newer app version', () => {
    const backup = { ...createBackup(makeData(), settings), version: BACKUP_VERSION + 1 };
    expect(() => parseBackup(JSON.stringify(backup), settings)).toThrow(
      expect.objectContaining({ code: 'unsupportedVersion' }),
    );
  });

  it('rejects a backup with no training data', () => {
    const backup = createBackup({ exercises: {}, cycles: {}, sessions: {} }, settings);
    expect(() => parseBackup(serializeBackup(backup), settings)).toThrow(BackupError);
  });

  it('drops malformed records instead of failing', () => {
    const backup = createBackup(makeData(), settings) as unknown as Record<string, any>;
    backup.data.exercises.broken = { id: 'mismatch', name: 'X' };
    backup.data.sessions.s2 = { id: 's2', updatedAt: '2026-01-04T00:00:00.000Z' };

    const parsed = parseBackup(JSON.stringify(backup), settings);
    expect(Object.keys(parsed.data.exercises)).toEqual(['e1']);
    expect(Object.keys(parsed.data.sessions)).toEqual(['s1']);
  });

  it('falls back to the current settings when the file has invalid ones', () => {
    const backup = createBackup(makeData(), settings) as unknown as Record<string, any>;
    backup.settings = { theme: 'neon', defaultIncrement: -1 };

    const parsed = parseBackup(JSON.stringify(backup), settings);
    expect(parsed.settings).toEqual(settings);
  });
});

describe('countBackup', () => {
  it('ignores soft-deleted records', () => {
    const data = makeData();
    data.cycles.c1 = { ...data.cycles.c1, deleted: true };
    expect(countBackup(data)).toEqual({ exercises: 1, cycles: 0, sessions: 1 });
  });
});

describe('backupFileName', () => {
  it('builds a sortable name from the export timestamp', () => {
    expect(backupFileName('2026-09-19T18:43:12.345Z')).toBe(
      'project-explosive-2026-09-19-18-43.json',
    );
  });
});
