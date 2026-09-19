import { changedSince, maxUpdatedAt, mergeById } from '@/lib/merge';
import type { Exercise } from '@/types/models';

function exercise(id: string, updatedAt: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    id,
    name: id,
    isCustom: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    deleted: false,
    ...overrides,
  };
}

describe('mergeById', () => {
  it('adds records that do not exist locally', () => {
    const local = { a: exercise('a', '2026-01-02T00:00:00.000Z') };
    const merged = mergeById(local, [exercise('b', '2026-01-03T00:00:00.000Z')]);

    expect(Object.keys(merged).sort()).toEqual(['a', 'b']);
  });

  it('keeps the newest version of a record', () => {
    const local = { a: exercise('a', '2026-01-05T00:00:00.000Z', { name: 'local' }) };

    const older = mergeById(local, [exercise('a', '2026-01-04T00:00:00.000Z', { name: 'remote' })]);
    expect(older.a.name).toBe('local');

    const newer = mergeById(local, [exercise('a', '2026-01-06T00:00:00.000Z', { name: 'remote' })]);
    expect(newer.a.name).toBe('remote');
  });

  it('keeps the local copy on a tie', () => {
    const at = '2026-01-05T00:00:00.000Z';
    const local = { a: exercise('a', at, { name: 'local' }) };

    expect(mergeById(local, [exercise('a', at, { name: 'remote' })]).a.name).toBe('local');
  });

  it('propagates a remote soft delete', () => {
    const local = { a: exercise('a', '2026-01-01T00:00:00.000Z') };
    const merged = mergeById(local, [
      exercise('a', '2026-01-02T00:00:00.000Z', { deleted: true }),
    ]);

    expect(merged.a.deleted).toBe(true);
  });

  it('returns the same object when nothing changes, to avoid a needless render', () => {
    const local = { a: exercise('a', '2026-01-05T00:00:00.000Z') };

    expect(mergeById(local, [])).toBe(local);
    expect(mergeById(local, [exercise('a', '2026-01-04T00:00:00.000Z')])).toBe(local);
  });
});

describe('changedSince', () => {
  const records = {
    a: exercise('a', '2026-01-01T00:00:00.000Z'),
    b: exercise('b', '2026-01-05T00:00:00.000Z'),
  };

  it('returns everything on the first sync (no cursor)', () => {
    expect(changedSince(records, null)).toHaveLength(2);
  });

  it('returns only what changed strictly after the cursor', () => {
    expect(changedSince(records, '2026-01-01T00:00:00.000Z').map((r) => r.id)).toEqual(['b']);
    expect(changedSince(records, '2026-01-05T00:00:00.000Z')).toEqual([]);
  });
});

describe('maxUpdatedAt', () => {
  it('returns the highest timestamp of the batch', () => {
    const batch = [
      exercise('a', '2026-01-01T00:00:00.000Z'),
      exercise('b', '2026-01-09T00:00:00.000Z'),
      exercise('c', '2026-01-05T00:00:00.000Z'),
    ];

    expect(maxUpdatedAt(batch, null)).toBe('2026-01-09T00:00:00.000Z');
  });

  it('never moves the cursor backwards', () => {
    const batch = [exercise('a', '2026-01-01T00:00:00.000Z')];

    expect(maxUpdatedAt(batch, '2026-02-01T00:00:00.000Z')).toBe('2026-02-01T00:00:00.000Z');
    expect(maxUpdatedAt([], '2026-02-01T00:00:00.000Z')).toBe('2026-02-01T00:00:00.000Z');
  });
});
