#!/usr/bin/env node
/**
 * Genera src/data/exercise-catalog.json a partir del dataset gratuito de RepDB
 * (https://github.com/RepDB/exercise-dataset).
 *
 *   node scripts/build-exercise-catalog.mjs
 *
 * Licencia (LICENSE-DATA.md del repo): uso gratuito, también comercial, DENTRO
 * de la app, con dos condiciones que no se pueden saltar:
 *  - Atribución visible: «Exercise data by RepDB (repdb.co)» con enlace. Está
 *    en el pie del selector de ejercicios y en el README.
 *  - Nada de redistribuirlo como dataset: este JSON es un recorte para la app,
 *    no se publica ni se sirve aparte como API.
 *
 * El commit va fijado: la app construye las URLs de las imágenes con este
 * mismo SHA (src/lib/catalog.ts), así que un cambio aguas arriba nunca deja
 * una imagen rota. Para actualizar, cambia el SHA en los dos sitios y vuelve
 * a ejecutar el script.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = '9ed9357f09c7566ea0256c57ebd6374ebb8b575e';
const SOURCE = `https://raw.githubusercontent.com/RepDB/exercise-dataset/${COMMIT}/exercises.json`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'exercise-catalog.json');

/**
 * El método Bilbo sube peso sesión a sesión: estiramientos y cardio no tienen
 * carga que progresar, y solo harían ruido en el buscador.
 */
const EXCLUDED_CATEGORIES = new Set(['stretching', 'cardio']);

/** `images/flat/bench-press-start.webp` → `bench-press-start`. */
const IMAGE_PATH = /^images\/flat\/([a-z0-9-]+)\.webp$/;

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`No se pudo descargar el dataset: HTTP ${response.status}`);
const { exercises } = await response.json();

const catalog = exercises
  .filter((exercise) => !EXCLUDED_CATEGORIES.has(exercise.category))
  .map((exercise) => {
    // Dos poses (inicio y pico) o una sola (`main`) en ejercicios estáticos.
    // La primera es la miniatura. Varios ejercicios casi idénticos comparten
    // imagen, así que el nombre del archivo NO siempre es el id.
    const { start, peak, main } = exercise.images.flat;
    const images = (start ? [start, peak] : [main]).filter(Boolean).map((path) => {
      const match = IMAGE_PATH.exec(path);
      if (!match) throw new Error(`Ruta de imagen inesperada en ${exercise.id}: ${path}`);
      return match[1];
    });

    return {
      id: exercise.id,
      name: { en: exercise.name_en, es: exercise.name_es },
      muscles: exercise.primary_muscles,
      bodyPart: exercise.body_part,
      equipment: exercise.equipment ?? null,
      images,
    };
  })
  .sort((a, b) => a.name.en.localeCompare(b.name.en, 'en'));

// Un ejercicio por línea: compacto, y al regenerar el diff se lee.
await writeFile(OUT, `[\n${catalog.map((entry) => JSON.stringify(entry)).join(',\n')}\n]\n`);
console.log(`${catalog.length} ejercicios → ${OUT}`);
