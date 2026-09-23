import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import {
  CATALOG,
  catalogEntry,
  catalogIdOf,
  catalogImageUrl,
  equipmentLabelKey,
  groupLabelKey,
  MUSCLE_GROUPS,
  muscleLabelKey,
  normalize,
  REFERENCED_IDS,
  searchCatalog,
} from '@/lib/catalog';
import type { Exercise } from '@/types/models';

const firstId = (query: string) => searchCatalog(query)[0]?.id;

function exercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: 'x',
    name: 'x',
    isCustom: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deleted: false,
    ...overrides,
  };
}

describe('catalog data', () => {
  it('contains every id the app refers to by name', () => {
    for (const id of REFERENCED_IDS) expect(catalogEntry(id)).toBeDefined();
  });

  it('has a label in both languages for every muscle, equipment and group', () => {
    const lookup = (dict: object, key: string) =>
      key.split('.').reduce<any>((node, part) => node?.[part], dict);
    const keys = new Set<string>(MUSCLE_GROUPS.map(groupLabelKey));
    for (const entry of CATALOG) {
      for (const muscle of entry.muscles) keys.add(muscleLabelKey(muscle));
      if (entry.equipment) keys.add(equipmentLabelKey(entry.equipment));
    }
    for (const key of keys) {
      expect([key, typeof lookup(es, key)]).toEqual([key, 'string']);
      expect([key, typeof lookup(en, key)]).toEqual([key, 'string']);
    }
  });

  it('builds CDN image urls for both frames', () => {
    const url = new URL(catalogImageUrl('Barbell_Squat'));
    expect(url.host).toBe('cdn.jsdelivr.net');
    expect(url.pathname).toMatch(
      /^\/gh\/yuhonas\/free-exercise-db@[0-9a-f]{40}\/exercises\/Barbell_Squat\/0\.jpg$/,
    );
    expect(catalogImageUrl('Barbell_Squat', 1)).toMatch(/\/Barbell_Squat\/1\.jpg$/);
  });
});

describe('catalogIdOf', () => {
  it('uses the stored catalog id', () => {
    expect(catalogIdOf(exercise({ catalogId: 'Pullups' }))).toBe('Pullups');
  });

  it('resolves seeded examples by their fixed id', () => {
    expect(catalogIdOf(exercise({ id: 'seed-squat' }))).toBe('Barbell_Squat');
  });

  it('has nothing for a typed-in custom exercise', () => {
    expect(catalogIdOf(exercise({ id: 'abc', name: 'Mi ejercicio' }))).toBeUndefined();
  });
});

describe('normalize', () => {
  it('drops accents, case and punctuation', () => {
    expect(normalize('Jalón  al PECHO')).toBe('jalon al pecho');
    expect(normalize('3/4 Sit-Up')).toBe('3 4 sit up');
  });
});

describe('searchCatalog', () => {
  it('opens with the most trained lifts when there is no query', () => {
    expect(searchCatalog('').slice(0, 3).map((entry) => entry.id)).toEqual([
      'Barbell_Bench_Press_-_Medium_Grip',
      'Barbell_Squat',
      'Barbell_Deadlift',
    ]);
    expect(searchCatalog('')).toHaveLength(CATALOG.length);
  });

  it.each([
    ['press banca', 'Barbell_Bench_Press_-_Medium_Grip'],
    ['Press de banca', 'Barbell_Bench_Press_-_Medium_Grip'],
    ['sentadilla', 'Barbell_Squat'],
    ['sentadillas con barra', 'Barbell_Squat'],
    ['peso muerto', 'Barbell_Deadlift'],
    ['peso muerto rumano', 'Romanian_Deadlift'],
    ['dominadas', 'Pullups'],
    ['jalón al pecho', 'Wide-Grip_Lat_Pulldown'],
    ['press militar', 'Standing_Military_Press'],
    ['elevaciones laterales', 'Side_Lateral_Raise'],
    ['curl martillo', 'Hammer_Curls'],
    ['press francés', 'EZ-Bar_Skullcrusher'],
    ['bench press', 'Barbell_Bench_Press_-_Medium_Grip'],
  ])('«%s» → %s', (query, id) => {
    expect(firstId(query)).toBe(id);
  });

  it('finds results while the word is still being typed', () => {
    // «senta» aún podría ser «sentado»; «sentadi» ya solo es sentadilla.
    expect(firstId('sentadi')).toBe('Barbell_Squat');
    expect(firstId('domin')).toBe('Pullups');
  });

  it('matches word starts, not arbitrary substrings', () => {
    const names = searchCatalog('remo').map((entry) => entry.name);
    expect(names.length).toBeGreaterThan(0);
    expect(names.some((name) => /narrow/i.test(name) && !/\brows?\b/i.test(name))).toBe(false);
  });

  it('searches by muscle and equipment in Spanish', () => {
    const chestWithDumbbells = searchCatalog('pecho mancuernas');
    expect(chestWithDumbbells.length).toBeGreaterThan(0);
    for (const entry of chestWithDumbbells) {
      expect(entry.muscles).toContain('chest');
      expect(entry.equipment).toBe('dumbbell');
    }
  });

  it('filters by muscle group', () => {
    const legMuscles = ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'];
    const legs = searchCatalog('', 'legs');
    expect(legs[0].id).toBe('Barbell_Squat');
    expect(legs.every((entry) => entry.muscles.some((m) => legMuscles.includes(m)))).toBe(true);
    expect(searchCatalog('press banca', 'legs')).toHaveLength(0);
  });

  it('returns nothing for gibberish', () => {
    expect(searchCatalog('zzzzqqq')).toHaveLength(0);
  });
});
