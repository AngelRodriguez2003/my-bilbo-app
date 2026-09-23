#!/usr/bin/env node
/**
 * Genera src/data/exercise-catalog.json a partir de Free Exercise DB
 * (https://github.com/yuhonas/free-exercise-db, Unlicense).
 *
 *   node scripts/build-exercise-catalog.mjs
 *
 * El commit va fijado: la app construye las URLs de las imágenes con este
 * mismo SHA (src/lib/catalog.ts), así que un ejercicio renombrado aguas arriba
 * nunca deja una foto rota. Para actualizar, cambia el SHA en los dos sitios
 * y vuelve a ejecutar el script.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = 'a859101d633a01c4a1a920d6a8ce41dabba0705f';
const SOURCE = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/dist/exercises.json`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'exercise-catalog.json');

/**
 * El método Bilbo sube peso sesión a sesión: estiramientos y cardio no tienen
 * carga que progresar, y solo harían ruido en el buscador.
 */
const EXCLUDED_CATEGORIES = new Set(['stretching', 'cardio']);

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`No se pudo descargar el dataset: HTTP ${response.status}`);
const source = await response.json();

const catalog = source
  .filter((exercise) => !EXCLUDED_CATEGORIES.has(exercise.category))
  .filter((exercise) => {
    // La app pide siempre `<id>/0.jpg`: un ejercicio sin foto, o con las
    // fotos en otra ruta, se queda fuera en vez de pintar una imagen rota.
    const [first] = exercise.images;
    if (first === `${exercise.id}/0.jpg`) return true;
    console.warn(`Sin imagen utilizable, se omite: ${exercise.id}`);
    return false;
  })
  .map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    muscles: exercise.primaryMuscles,
    equipment: exercise.equipment ?? null,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

// Un ejercicio por línea: compacto, y al regenerar el diff se lee.
await writeFile(OUT, `[\n${catalog.map((entry) => JSON.stringify(entry)).join(',\n')}\n]\n`);
console.log(`${catalog.length} ejercicios → ${OUT}`);
