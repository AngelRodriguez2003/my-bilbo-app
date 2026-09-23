import rawCatalog from '@/data/exercise-catalog.json';
import type { Exercise } from '@/types/models';

/**
 * Catálogo de ejercicios con foto: Free Exercise DB
 * (https://github.com/yuhonas/free-exercise-db), dominio público (Unlicense).
 *
 * Los datos viajan dentro de la app —unos 80 KB, generados por
 * scripts/build-exercise-catalog.mjs— y las fotos se piden al CDN solo cuando
 * se ven, así que la app no engorda con 1500 imágenes que casi nadie abrirá.
 */

export type Muscle =
  | 'abdominals'
  | 'abductors'
  | 'adductors'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'forearms'
  | 'glutes'
  | 'hamstrings'
  | 'lats'
  | 'lower back'
  | 'middle back'
  | 'neck'
  | 'quadriceps'
  | 'shoulders'
  | 'traps'
  | 'triceps';

export type Equipment =
  | 'bands'
  | 'barbell'
  | 'body only'
  | 'cable'
  | 'dumbbell'
  | 'e-z curl bar'
  | 'exercise ball'
  | 'kettlebells'
  | 'machine'
  | 'medicine ball'
  | 'other';

export interface CatalogExercise {
  /** Id de Free Exercise DB; es también la carpeta de sus fotos. */
  id: string;
  /** Nombre original, en inglés: el dataset no trae traducciones. */
  name: string;
  muscles: Muscle[];
  equipment: Equipment | null;
}

export const CATALOG = rawCatalog as CatalogExercise[];

const BY_ID = new Map(CATALOG.map((entry) => [entry.id, entry]));

export function catalogEntry(id: string | undefined): CatalogExercise | undefined {
  return id ? BY_ID.get(id) : undefined;
}

// ------------------------------------------------------------------- fotos

/** El mismo commit que fija el script: las rutas de las fotos no se mueven. */
const COMMIT = 'a859101d633a01c4a1a920d6a8ce41dabba0705f';
const MEDIA_BASE = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${COMMIT}/exercises`;

/** Cada ejercicio trae dos fotos: posición inicial (0) y final (1). */
export function catalogImageUrl(id: string, frame: 0 | 1 = 0): string {
  return `${MEDIA_BASE}/${encodeURIComponent(id)}/${frame}.jpg`;
}

/**
 * Los ejemplos se sembraron antes de que existiera el catálogo y sus registros
 * no llevan `catalogId`: su foto se resuelve por su id fijo, sin migrar nada.
 */
const SEED_CATALOG_IDS: Record<string, string> = {
  'seed-bench-press': 'Barbell_Bench_Press_-_Medium_Grip',
  'seed-lat-pulldown': 'Wide-Grip_Lat_Pulldown',
  'seed-squat': 'Barbell_Squat',
};

/** Entrada del catálogo de un ejercicio del usuario, si la tiene. */
export function catalogIdOf(exercise: Exercise): string | undefined {
  return exercise.catalogId ?? SEED_CATALOG_IDS[exercise.id];
}

// ------------------------------------------------------------------ grupos

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';

/** 17 músculos son demasiados para filtrar con el pulgar: se agrupan en 6. */
const GROUP_MUSCLES: Record<MuscleGroup, Muscle[]> = {
  chest: ['chest'],
  back: ['lats', 'middle back', 'lower back', 'traps'],
  shoulders: ['shoulders', 'neck'],
  arms: ['biceps', 'triceps', 'forearms'],
  legs: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
  core: ['abdominals'],
};

export const MUSCLE_GROUPS = Object.keys(GROUP_MUSCLES) as MuscleGroup[];

function groupsOf(entry: CatalogExercise): MuscleGroup[] {
  return MUSCLE_GROUPS.filter((group) =>
    entry.muscles.some((muscle) => GROUP_MUSCLES[group].includes(muscle)),
  );
}

// -------------------------------------------------------------- etiquetas

/** `lower back` → `lowerBack`: las claves de i18n no llevan espacios. */
const camel = (value: string) =>
  value.replace(/[^a-z]+([a-z])/g, (_, c: string) => c.toUpperCase());

export const muscleLabelKey = (muscle: Muscle) => `catalog.muscles.${camel(muscle)}`;
export const equipmentLabelKey = (equipment: Equipment) => `catalog.equipment.${camel(equipment)}`;
export const groupLabelKey = (group: MuscleGroup) => `catalog.groups.${group}`;

// -------------------------------------------------------------- búsqueda

/**
 * Lo que más se entrena, en este orden: es lo que se ve antes de escribir
 * nada, y desempata los resultados. Sin esto la lista abriría por
 * «3/4 Sit-Up» y «Ab Crunch Machine».
 */
const POPULAR = [
  'Barbell_Bench_Press_-_Medium_Grip',
  'Barbell_Squat',
  'Barbell_Deadlift',
  'Standing_Military_Press',
  'Bent_Over_Barbell_Row',
  'Pullups',
  'Wide-Grip_Lat_Pulldown',
  'Dips_-_Triceps_Version',
  'Incline_Dumbbell_Press',
  'Romanian_Deadlift',
  'Barbell_Hip_Thrust',
  'Leg_Press',
  'Seated_Cable_Rows',
  'Seated_Dumbbell_Press',
  'Side_Lateral_Raise',
  'Barbell_Curl',
  'Hammer_Curls',
  'Triceps_Pushdown',
  'EZ-Bar_Skullcrusher',
  'Barbell_Lunge',
  'Lying_Leg_Curls',
  'Leg_Extensions',
  'Standing_Calf_Raises',
  'Face_Pull',
  'Chin-Up',
  'Front_Barbell_Squat',
  'Dumbbell_Bench_Press',
  'Close-Grip_Barbell_Bench_Press',
  'Hanging_Leg_Raise',
  'Cable_Crunch',
  'One-Arm_Dumbbell_Row',
  'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Dumbbell_Flyes',
  'Cable_Crossover',
  'Goblet_Squat',
  'Hack_Squat',
  'Sumo_Deadlift',
  'Arnold_Dumbbell_Press',
  'Reverse_Flyes',
  'Barbell_Shrug',
  'Dumbbell_Lunges',
  'Dumbbell_Alternate_Bicep_Curl',
  'Upright_Barbell_Row',
  'Good_Morning',
  'Pushups',
  'Plank',
];

const POPULAR_RANK = new Map(POPULAR.map((id, rank) => [id, rank]));

/** Para las pruebas: ids que la app da por hecho que existen. */
export const REFERENCED_IDS = [...POPULAR, ...Object.values(SEED_CATALOG_IDS)];

const ACCENTS: Record<string, string> = {
  á: 'a', à: 'a', ä: 'a', é: 'e', è: 'e', ë: 'e', í: 'i', ï: 'i',
  ó: 'o', ö: 'o', ú: 'u', ü: 'u', ñ: 'n', ç: 'c',
};

/** Minúsculas, sin tildes y solo letras y cifras: «Jalón» y «jalon» son lo mismo. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áàäéèëíïóöúüñç]/g, (c) => ACCENTS[c])
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Los nombres del catálogo están en inglés y la app se usa sobre todo en
 * español. En vez de traducir 736 nombres, se traduce la búsqueda: cada
 * término español se convierte en los términos ingleses que lo nombran.
 *
 * Todo va normalizado (sin tildes) y en singular: los plurales se resuelven
 * solos (`dominadas` → `dominada`).
 */
const PHRASES: [string, string[]][] = [
  ['jalon al pecho', ['pulldown']],
  ['remo al menton', ['upright']],
  ['press frances', ['skullcrusher', 'lying triceps', 'french']],
  ['buenos dias', ['good morning']],
  ['barra z', ['e z', 'ez']],
  ['pesa rusa', ['kettlebell']],
];

const WORDS: Record<string, string[]> = {
  sentadilla: ['squat'],
  banca: ['bench'],
  banco: ['bench'],
  muerto: ['deadlift'],
  rumano: ['romanian'],
  dominada: ['pullup', 'pull up', 'chin up', 'chinup'],
  jalon: ['pulldown'],
  remo: ['row'],
  militar: ['military', 'overhead', 'shoulder press'],
  elevacion: ['raise'],
  lateral: ['lateral'],
  frontal: ['front'],
  frente: ['front'],
  fondo: ['dip'],
  zancada: ['lunge'],
  estocada: ['lunge'],
  flexion: ['push up', 'pushup'],
  plancha: ['plank'],
  abdominal: ['abdominal', 'crunch', 'sit up'],
  abdomen: ['abdominal', 'core'],
  femoral: ['leg curl', 'hamstring'],
  cuadriceps: ['quadriceps'],
  gemelo: ['calf', 'calves'],
  pantorrilla: ['calf', 'calves'],
  pecho: ['chest'],
  pectoral: ['chest'],
  espalda: ['back', 'lats'],
  dorsal: ['lats'],
  hombro: ['shoulder'],
  biceps: ['biceps', 'curl'],
  triceps: ['triceps'],
  antebrazo: ['forearm', 'wrist'],
  gluteo: ['glute'],
  trapecio: ['traps', 'shrug'],
  encogimiento: ['shrug'],
  lumbar: ['lower back', 'hyperextension'],
  hiperextension: ['hyperextension'],
  cuello: ['neck'],
  aductor: ['adductor'],
  abductor: ['abductor'],
  pierna: ['leg'],
  brazo: ['arm'],
  barra: ['barbell', 'bar'],
  mancuerna: ['dumbbell'],
  polea: ['cable'],
  maquina: ['machine', 'lever', 'smith'],
  multipower: ['smith'],
  banda: ['band'],
  goma: ['band'],
  elastico: ['band'],
  corporal: ['body only', 'bodyweight'],
  balon: ['ball'],
  medicinal: ['medicine'],
  fitball: ['exercise ball', 'stability ball'],
  prensa: ['leg press'],
  extension: ['extension'],
  martillo: ['hammer'],
  inclinado: ['incline'],
  inclinada: ['incline'],
  declinado: ['decline'],
  declinada: ['decline'],
  sentado: ['seated', 'sitting'],
  sentada: ['seated', 'sitting'],
  tumbado: ['lying'],
  tumbada: ['lying'],
  acostado: ['lying'],
  pie: ['standing'],
  agarre: ['grip'],
  cerrado: ['close', 'narrow'],
  estrecho: ['close', 'narrow'],
  abierto: ['wide'],
  ancho: ['wide'],
  invertido: ['reverse'],
  inverso: ['reverse'],
  trasero: ['rear'],
  posterior: ['rear', 'reverse'],
  alterno: ['alternate', 'alternating'],
  alternado: ['alternate', 'alternating'],
  apertura: ['fly'],
  cruce: ['crossover'],
  pajaro: ['reverse fly', 'rear delt'],
  patada: ['kickback'],
  rompecraneo: ['skullcrusher'],
  puente: ['bridge'],
  arrancada: ['snatch'],
  cargada: ['clean'],
  envion: ['jerk'],
  salto: ['jump'],
  caja: ['box'],
};

/** «peso» sobra: todo aquí es con peso, y dejarlo exigiría la palabra en inglés. */
const STOPWORDS = new Set([
  'a', 'al', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'los', 'para', 'peso', 'por', 'sobre',
  'un', 'una', 'y',
]);

/**
 * Alternativas de una palabra: ella misma, su traducción y —si ya lleva tres
 * letras— la de las palabras que empiezan por ella, para que la lista
 * responda mientras se escribe («sentadi» ya encuentra sentadillas).
 */
function expandWord(word: string): string[] {
  const alternatives = new Set([word]);
  for (const [term, english] of Object.entries(WORDS)) {
    const matches =
      term === word ||
      word === `${term}s` ||
      word === `${term}es` ||
      (word.length >= 3 && term.startsWith(word));
    if (matches) for (const alternative of english) alternatives.add(alternative);
  }
  return [...alternatives];
}

/** Una búsqueda es una lista de términos; cada término, sus alternativas. */
function parseQuery(query: string): string[][] {
  let rest = ` ${normalize(query)} `;
  const terms: string[][] = [];
  for (const [phrase, english] of PHRASES) {
    const needle = ` ${phrase} `;
    if (!rest.includes(needle)) continue;
    rest = rest.replace(needle, ' ');
    terms.push(english);
  }
  for (const word of rest.split(' ')) {
    if (!word || STOPWORDS.has(word)) continue;
    terms.push(expandWord(word));
  }
  return terms;
}

interface Haystack {
  /** Nombre normalizado, con un espacio delante para casar inicios de palabra. */
  name: string;
  /** Nombre + músculos + material + grupo. */
  all: string;
  groups: MuscleGroup[];
}

let haystacks: Map<string, Haystack> | null = null;

function haystackOf(entry: CatalogExercise): Haystack {
  haystacks ??= new Map(
    CATALOG.map((item) => {
      const groups = groupsOf(item);
      const name = ` ${normalize(item.name)}`;
      const extra = normalize([...item.muscles, item.equipment ?? '', ...groups].join(' '));
      return [item.id, { name, all: `${name} ${extra}`, groups }];
    }),
  );
  return haystacks.get(entry.id)!;
}

/**
 * Casa por inicio de palabra, no por subcadena: «row» encuentra «Seated
 * Cable Rows» pero no «Narrow Stance Squats».
 */
const has = (text: string, alternatives: string[]) =>
  alternatives.some((alternative) => text.includes(` ${alternative}`));

const popularity = (entry: CatalogExercise) => POPULAR_RANK.get(entry.id) ?? POPULAR.length;

/**
 * Busca en el catálogo. Sin texto devuelve el grupo entero, con lo más
 * entrenado primero. Con texto exige todos los términos y ordena poniendo
 * delante lo que los tiene en el nombre, luego lo popular y luego lo corto
 * (el nombre más corto suele ser la variante básica).
 */
export function searchCatalog(
  query: string,
  group: MuscleGroup | 'all' = 'all',
): CatalogExercise[] {
  const terms = parseQuery(query);
  const pool =
    group === 'all' ? CATALOG : CATALOG.filter((entry) => haystackOf(entry).groups.includes(group));

  if (terms.length === 0) {
    return [...pool].sort((a, b) => popularity(a) - popularity(b));
  }

  const scored: { entry: CatalogExercise; score: number }[] = [];
  for (const entry of pool) {
    const haystack = haystackOf(entry);
    if (!terms.every((alternatives) => has(haystack.all, alternatives))) continue;
    let score = 0;
    if (terms.every((alternatives) => has(haystack.name, alternatives))) score += 4;
    if (POPULAR_RANK.has(entry.id)) score += 2;
    if (terms[0].some((alternative) => haystack.name.startsWith(` ${alternative}`))) score += 1;
    scored.push({ entry, score });
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        popularity(a.entry) - popularity(b.entry) ||
        a.entry.name.length - b.entry.name.length,
    )
    .map(({ entry }) => entry);
}
