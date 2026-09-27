# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# Project Explosive

App para entrenar con el método Bilbo (una serie explosiva por ejercicio,
subiendo un incremento fijo de peso cada sesión). Un solo código para Android,
iOS y web. Visión general en [README.md](README.md).

## Stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript estricto.
- Expo Router con rutas tipadas (`src/app/`). React Compiler activado.
- Estado: Zustand con `persist` sobre AsyncStorage (`src/store/`).
- Sincronización opcional con Supabase ([SYNC.md](SYNC.md)).
- i18n con i18next: `src/i18n/locales/es.json` y `en.json`.
- Tests con Jest (`jest-expo`).

## Comandos

```bash
npx tsc --noEmit     # tipos
npm test             # tests
npm run lint         # ESLint
npm run build:web    # export estático: detecta código que rompe en el pre-render
```

Son los mismos pasos que corre la CI en cada PR. Pásalos antes de dar un
cambio por terminado. Para ver la app, usa la configuración
`project-explosive-web` de `.claude/launch.json`.

## Estructura

- `src/app/`: pantallas. `(tabs)/` tiene Ejercicios, Progreso y Ajustes; los
  formularios (`cycle/new`, `session/new`, `exercise/new`) son modales.
- `src/lib/`: lógica pura y testeable, sin React (`bilbo.ts`, `merge.ts`,
  `sync.ts`, `backup.ts`, `catalog.ts`). La lógica nueva va aquí, con su test en
  `src/lib/__tests__/`.
- `src/store/`: stores de Zustand. Tests en `src/store/__tests__/`.
- `src/types/models.ts`: modelos de datos.
- Alias de imports: `@/` apunta a `src/`.

## Reglas que no hay que romper

- **Nada de `window` ni APIs del navegador al importar un módulo.** El export
  web pre-renderiza cada ruta en Node; si algo toca `window` al cargarse, el
  deploy falla. Protege ese acceso (ver `src/lib/supabase.ts`) o usa
  archivos por plataforma (`*.web.ts`, como `backupIO.web.ts`).
- **Borrado lógico siempre.** Todo registro sincronizado (`SyncedRecord`)
  lleva `id`, `updatedAt` y `deleted`. Nunca se elimina de verdad: se marca
  `deleted: true` y se actualiza `updatedAt`. Cualquier cambio en un registro
  tiene que actualizar `updatedAt`, o no se sincronizará.
- **Cambios de esquema**: si añades un campo sincronizado, actualiza también
  `supabase/schema.sql` (idempotente), el mapeo de `src/lib/sync.ts` y, si
  cambia la forma del archivo, `BACKUP_VERSION` en `src/lib/backup.ts`. Los
  backups antiguos se tienen que poder seguir importando.
- **Textos visibles siempre por i18n**, en `es.json` y `en.json` a la vez.
- **Variables `EXPO_PUBLIC_*`**: se inlinean en el bundle y son públicas. Nunca
  metas ahí la clave `service_role` ni ningún secreto.
- **Catálogo RepDB**: su licencia exige la atribución visible («Exercise data by
  RepDB (repdb.co)») y prohíbe redistribuir el dataset. No quites el crédito ni
  expongas el JSON aparte. `src/data/exercise-catalog.json` es generado: no se
  edita a mano, se regenera con `node scripts/build-exercise-catalog.mjs`. El
  SHA del commit de RepDB está en ese script y en `src/lib/catalog.ts`, y los
  dos tienen que coincidir.

## Convenciones

- Comentarios y documentación en español. Los comentarios explican el *porqué*,
  no el *qué*.
- Commits en español con Conventional Commits (`feat:`, `fix:`, `ci:`,
  `build:`, `chore:`…).
- Se trabaja en ramas (`feat/...`, `fix/...`) y se abre un PR contra `main`.
  Mergear en `main` despliega la web en producción, así que no se hace push
  directo a `main`.
