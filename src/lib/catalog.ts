import rawCatalog from '@/data/exercise-catalog.json';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import type { Exercise } from '@/types/models';

/**
 * Catálogo de ejercicios con imagen: el dataset gratuito de RepDB
 * (https://github.com/RepDB/exercise-dataset).
 *
 * Su licencia pide una atribución visible —«Exercise data by RepDB
 * (repdb.co)», con enlace— y prohíbe redistribuirlo como dataset: está en el
 * pie del selector y en el README, y el JSON es solo el recorte que usa la app.
 *
 * Los datos viajan dentro de la app —unos 125 KB, generados por
 * scripts/build-exercise-catalog.mjs— y las imágenes se piden al CDN solo
 * cuando se ven, así que la app no engorda con 900 imágenes que casi nadie
 * abrirá.
 */

export type Muscle =
  | 'abductors'
  | 'adductors'
  | 'anterior_deltoid'
  | 'biceps_brachii'
  | 'brachialis'
  | 'brachioradialis'
  | 'erector_spinae'
  | 'forearm_extensors'
  | 'forearm_flexors'
  | 'gastrocnemius'
  | 'gluteus_maximus'
  | 'gluteus_medius'
  | 'hamstrings'
  | 'hip_flexors'
  | 'lateral_deltoid'
  | 'latissimus_dorsi'
  | 'obliques'
  | 'pectoralis_major'
  | 'posterior_deltoid'
  | 'quadratus_lumborum'
  | 'quadriceps'
  | 'rectus_abdominis'
  | 'rhomboids'
  | 'soleus'
  | 'transverse_abdominis'
  | 'trapezius'
  | 'triceps_brachii';

type BodyPart =
  | 'back'
  | 'chest'
  | 'core'
  | 'full_body'
  | 'lower_arms'
  | 'lower_legs'
  | 'shoulders'
  | 'upper_arms'
  | 'upper_legs';

export interface CatalogExercise {
  /** Id de RepDB, un slug estable (`bench-press`). */
  id: string;
  name: { en: string; es: string };
  /** Músculos principales, de más a menos implicado. */
  muscles: Muscle[];
  bodyPart: BodyPart;
  /** Slug del material (`ez_bar`); null en ejercicios sin material. */
  equipment: string | null;
  /**
   * Imágenes, sin ruta ni extensión: inicio y pico, o una sola pose en los
   * ejercicios estáticos. OJO: variantes casi idénticas comparten imagen, así
   * que el nombre del archivo no siempre coincide con el id.
   */
  images: string[];
}

export const CATALOG = rawCatalog as CatalogExercise[];

const BY_ID = new Map(CATALOG.map((entry) => [entry.id, entry]));

export function catalogEntry(id: string | undefined): CatalogExercise | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Nombre en el idioma de la interfaz; el dataset no trae más que es y en. */
export function catalogName(entry: CatalogExercise, language: string | undefined): string {
  return language?.startsWith('es') ? entry.name.es : entry.name.en;
}

// ----------------------------------------------------------------- imágenes

/** El mismo commit que fija el script: las rutas de las imágenes no se mueven. */
const COMMIT = '9ed9357f09c7566ea0256c57ebd6374ebb8b575e';
const MEDIA_BASE = `https://cdn.jsdelivr.net/gh/RepDB/exercise-dataset@${COMMIT}/images/flat`;

/** Miniatura de un ejercicio del catálogo: su primera pose, 512 × 512. */
export function catalogThumbUrl(id: string | undefined): string | undefined {
  const image = catalogEntry(id)?.images[0];
  return image ? `${MEDIA_BASE}/${image}.webp` : undefined;
}

/**
 * Los ejemplos se sembraron antes de que existiera el catálogo y sus registros
 * no llevan `catalogId`: su imagen se resuelve por su id fijo, sin migrar nada.
 */
const SEED_CATALOG_IDS: Record<string, string> = {
  'seed-bench-press': 'bench-press',
  'seed-lat-pulldown': 'lat-pulldown',
  'seed-squat': 'squat',
};

/** Entrada del catálogo de un ejercicio del usuario, si la tiene. */
export function catalogIdOf(exercise: Exercise): string | undefined {
  return exercise.catalogId ?? SEED_CATALOG_IDS[exercise.id];
}

// ------------------------------------------------------------------ grupos

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'fullBody';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'fullBody',
];

/** Las 9 zonas del dataset, en los grupos que se filtran con el pulgar. */
const GROUP_OF: Record<BodyPart, MuscleGroup> = {
  chest: 'chest',
  back: 'back',
  shoulders: 'shoulders',
  upper_arms: 'arms',
  lower_arms: 'arms',
  upper_legs: 'legs',
  lower_legs: 'legs',
  core: 'core',
  full_body: 'fullBody',
};

// -------------------------------------------------------------- etiquetas

/** `pectoralis_major` → `pectoralisMajor`: las claves de i18n van en camelCase. */
const camel = (value: string) =>
  value.replace(/[^a-z]+([a-z])/g, (_, c: string) => c.toUpperCase());

export const muscleLabelKey = (muscle: Muscle) => `catalog.muscles.${camel(muscle)}`;
export const groupLabelKey = (group: MuscleGroup) => `catalog.groups.${group}`;

// -------------------------------------------------------------- búsqueda

/**
 * Lo que más se entrena, en este orden: es lo que se ve antes de escribir
 * nada, y desempata los resultados. Sin esto la lista abriría por orden
 * alfabético, con «Ab Wheel Rollout» y «Archer Pull Ups».
 */
const POPULAR = [
  'bench-press',
  'squat',
  'deadlift',
  'ohp',
  'barbell-row',
  'pull-up',
  'lat-pulldown',
  'dips',
  'incline-db-press',
  'romanian-deadlift',
  'hip-thrust',
  'leg-press',
  'seated-cable-row',
  'seated-db-press',
  'lateral-raise',
  'barbell-curl',
  'hammer-curl',
  'tricep-pushdown',
  'skull-crusher',
  'barbell-lunge',
  'leg-curl',
  'leg-extension',
  'standing-calf-raise',
  'face-pull',
  'chin-ups',
  'front-squat',
  'db-bench-press',
  'close-grip-bench-press',
  'hanging-leg-raise',
  'cable-crunch',
  'single-arm-db-row',
  'incline-bench-press',
  'db-fly',
  'cable-fly',
  'goblet-squat',
  'hack-squat',
  'sumo-deadlift',
  'bulgarian-split-squat',
  'arnold-press',
  'dumbbell-reverse-fly',
  'db-shrug',
  'db-lunge',
  'bicep-curl',
  'upright-row',
  'good-morning',
  'push-up',
  'plank',
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

/** Palabras que no distinguen nada: «press DE banca», «jalón AL pecho». */
const STOPWORDS = new Set([
  'a', 'al', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'los', 'para', 'por', 'sobre', 'un',
  'una', 'y', 'the', 'with', 'of', 'on',
]);

interface Haystack {
  /** Nombres en los dos idiomas, con un espacio delante de cada palabra. */
  name: string;
  /** Nombres + músculos y grupo en los dos idiomas + material. */
  all: string;
  group: MuscleGroup;
}

/** Etiqueta de i18n en los dos idiomas: se busca igual con la app en inglés. */
function bothLabels(key: string): string {
  const read = (dict: object) =>
    key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], dict);
  return `${read(es) ?? ''} ${read(en) ?? ''}`;
}

let haystacks: Map<string, Haystack> | null = null;

function haystackOf(entry: CatalogExercise): Haystack {
  haystacks ??= new Map(
    CATALOG.map((item) => {
      const group = GROUP_OF[item.bodyPart];
      const name = ` ${normalize(`${item.name.es} ${item.name.en}`)}`;
      const extra = normalize(
        [
          ...item.muscles.map((muscle) => bothLabels(muscleLabelKey(muscle))),
          bothLabels(groupLabelKey(group)),
          item.equipment ?? '',
        ].join(' '),
      );
      return [item.id, { name, all: `${name} ${extra}`, group }];
    }),
  );
  return haystacks.get(entry.id)!;
}

/**
 * Formas de una palabra buscada: ella misma y, si parece un plural, su
 * singular. Los nombres mezclan «Dominada» y «Dominadas Arquero», y quien
 * escribe «dominadas» espera ver las dos.
 */
function variants(word: string): string[] {
  if (word.length < 5) return [word];
  if (word.endsWith('es')) return [word, word.slice(0, -1), word.slice(0, -2)];
  if (word.endsWith('s')) return [word, word.slice(0, -1)];
  return [word];
}

/**
 * Casa por inicio de palabra, no por subcadena: «remo» encuentra «Remo con
 * barra» pero no «Extremo». Y funciona mientras se escribe: «sentadi» ya
 * encuentra las sentadillas.
 */
const has = (text: string, forms: string[]) => forms.some((form) => text.includes(` ${form}`));

const popularity = (entry: CatalogExercise) => POPULAR_RANK.get(entry.id) ?? POPULAR.length;

/**
 * Busca en el catálogo. Sin texto devuelve el grupo entero, con lo más
 * entrenado primero y el resto por orden alfabético. Con texto exige todas las
 * palabras y ordena poniendo delante lo que las tiene en el nombre, luego lo
 * popular y luego lo corto (el nombre más corto suele ser la variante básica).
 *
 * @param language idioma de la interfaz: decide el orden alfabético y qué
 *   nombre cuenta como «empieza por». Se busca siempre en los dos idiomas.
 */
export function searchCatalog(
  query: string,
  group: MuscleGroup | 'all' = 'all',
  language = 'en',
): CatalogExercise[] {
  const terms = normalize(query)
    .split(' ')
    .filter((word) => word && !STOPWORDS.has(word))
    .map(variants);
  const pool =
    group === 'all' ? CATALOG : CATALOG.filter((entry) => haystackOf(entry).group === group);
  const nameOf = (entry: CatalogExercise) => catalogName(entry, language);

  if (terms.length === 0) {
    return [...pool].sort(
      (a, b) => popularity(a) - popularity(b) || nameOf(a).localeCompare(nameOf(b), language),
    );
  }

  const scored: { entry: CatalogExercise; score: number }[] = [];
  for (const entry of pool) {
    const haystack = haystackOf(entry);
    if (!terms.every((term) => has(haystack.all, term))) continue;
    let score = 0;
    if (terms.every((term) => has(haystack.name, term))) score += 4;
    if (POPULAR_RANK.has(entry.id)) score += 2;
    if (terms[0].some((form) => normalize(nameOf(entry)).startsWith(form))) score += 1;
    scored.push({ entry, score });
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        popularity(a.entry) - popularity(b.entry) ||
        nameOf(a.entry).length - nameOf(b.entry).length,
    )
    .map(({ entry }) => entry);
}
