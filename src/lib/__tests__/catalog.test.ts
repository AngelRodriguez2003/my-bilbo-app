import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import {
  CATALOG,
  catalogEntry,
  catalogIdOf,
  catalogName,
  catalogThumbUrl,
  groupLabelKey,
  MUSCLE_GROUPS,
  muscleLabelKey,
  normalize,
  REFERENCED_IDS,
  searchCatalog,
} from '@/lib/catalog';
import type { Exercise } from '@/types/models';

const firstId = (query: string, language = 'es') => searchCatalog(query, 'all', language)[0]?.id;

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

  it('has a label in both languages for every muscle and group', () => {
    const lookup = (dict: object, key: string) =>
      key.split('.').reduce<any>((node, part) => node?.[part], dict);
    const keys = new Set<string>(MUSCLE_GROUPS.map(groupLabelKey));
    for (const entry of CATALOG) {
      for (const muscle of entry.muscles) keys.add(muscleLabelKey(muscle));
    }
    for (const key of keys) {
      expect([key, typeof lookup(es, key)]).toEqual([key, 'string']);
      expect([key, typeof lookup(en, key)]).toEqual([key, 'string']);
    }
  });

  it('gives every entry a name in both languages and at least one image', () => {
    for (const entry of CATALOG) {
      expect(entry.name.en).toBeTruthy();
      expect(entry.name.es).toBeTruthy();
      expect(entry.images.length).toBeGreaterThan(0);
    }
  });

  it('builds CDN thumbnail urls from the image, not the id', () => {
    const url = new URL(catalogThumbUrl('bench-press')!);
    expect(url.host).toBe('cdn.jsdelivr.net');
    expect(url.pathname).toMatch(
      /^\/gh\/RepDB\/exercise-dataset@[0-9a-f]{40}\/images\/flat\/bench-press-start\.webp$/,
    );
    // Variante que reutiliza la imagen de otro ejercicio.
    expect(catalogThumbUrl('pause-deadlift')).toMatch(/\/deadlift-start\.webp$/);
  });

  it('has no thumbnail for unknown or missing ids', () => {
    expect(catalogThumbUrl(undefined)).toBeUndefined();
    expect(catalogThumbUrl('Barbell_Squat')).toBeUndefined();
  });

  it('names entries in the interface language', () => {
    const bench = catalogEntry('bench-press')!;
    expect(catalogName(bench, 'es')).toBe('Press de Banca con Barra');
    expect(catalogName(bench, 'en')).toBe('Barbell Bench Press');
  });
});

describe('catalogIdOf', () => {
  it('uses the stored catalog id', () => {
    expect(catalogIdOf(exercise({ catalogId: 'pull-up' }))).toBe('pull-up');
  });

  it('resolves seeded examples by their fixed id', () => {
    expect(catalogIdOf(exercise({ id: 'seed-squat' }))).toBe('squat');
  });

  it('has nothing for a typed-in custom exercise', () => {
    expect(catalogIdOf(exercise({ id: 'abc', name: 'Mi ejercicio' }))).toBeUndefined();
  });
});

describe('normalize', () => {
  it('drops accents, case and punctuation', () => {
    expect(normalize('Jalón  al PECHO')).toBe('jalon al pecho');
    expect(normalize('Pull-Up')).toBe('pull up');
  });
});

describe('searchCatalog', () => {
  it('opens with the most trained lifts when there is no query', () => {
    expect(searchCatalog('').slice(0, 3).map((entry) => entry.id)).toEqual([
      'bench-press',
      'squat',
      'deadlift',
    ]);
    expect(searchCatalog('')).toHaveLength(CATALOG.length);
  });

  it.each([
    ['press banca', 'bench-press'],
    ['Press de banca', 'bench-press'],
    ['sentadilla', 'squat'],
    ['peso muerto', 'deadlift'],
    ['peso muerto rumano', 'romanian-deadlift'],
    ['dominada', 'pull-up'],
    ['dominadas', 'pull-up'],
    ['sentadillas búlgaras', 'bulgarian-split-squat'],
    ['jalón al pecho', 'lat-pulldown'],
    ['press militar', 'ohp'],
    ['elevación lateral', 'lateral-raise'],
    ['curl martillo', 'hammer-curl'],
  ])('«%s» → %s', (query, id) => {
    expect(firstId(query)).toBe(id);
  });

  it('also finds English names, whatever the interface language', () => {
    expect(firstId('bench press', 'es')).toBe('bench-press');
    expect(firstId('press banca', 'en')).toBe('bench-press');
  });

  it('finds results while the word is still being typed', () => {
    expect(firstId('sentadi')).toBe('squat');
    expect(firstId('domin')).toBe('pull-up');
  });

  it('matches word starts, not arbitrary substrings', () => {
    // «remo» no debe colarse por «extREMO» ni similares.
    const names = searchCatalog('remo', 'all', 'es').map((entry) => entry.name.es);
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((name) => /\bremo/i.test(normalize(name)))).toBe(true);
  });

  it('searches by muscle in Spanish', () => {
    const glutes = searchCatalog('glúteo', 'all', 'es');
    expect(glutes.length).toBeGreaterThan(0);
    for (const entry of glutes.filter((e) => !normalize(e.name.es).includes('glute'))) {
      expect(entry.muscles.some((m) => m.startsWith('gluteus'))).toBe(true);
    }
  });

  it('filters by muscle group', () => {
    const legs = searchCatalog('', 'legs');
    expect(legs[0].id).toBe('squat');
    expect(legs.every((entry) => ['upper_legs', 'lower_legs'].includes(entry.bodyPart))).toBe(true);
    expect(searchCatalog('press banca', 'legs')).toHaveLength(0);
  });

  it('returns nothing for gibberish', () => {
    expect(searchCatalog('zzzzqqq')).toHaveLength(0);
  });
});
