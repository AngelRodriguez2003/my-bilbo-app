# Desplegar Bilbo como sitio web de producción

La app se exporta a un sitio **estático** (SSG) con las herramientas de Expo.

## 1. Generar el build de producción

```bash
npm run build:web
```

Esto ejecuta `expo export --platform web` y crea la carpeta `dist/` con el
sitio pre-renderizado (una página HTML por ruta + assets). Es un artefacto de
build y está en `.gitignore`.

Para probarlo localmente como lo haría un hosting:

```bash
npm run serve:web        # sirve dist/ en http://localhost:3000
```

## 2. Publicar con EAS Hosting (recomendado — herramienta oficial de Expo)

Requiere una cuenta de Expo (gratuita). Estos pasos los ejecutas tú, ya que
implican iniciar sesión con tu cuenta:

```bash
npx eas-cli@latest login          # inicia sesión en tu cuenta Expo
npm run build:web                 # genera dist/
npx eas-cli@latest deploy --prod  # publica dist/ a producción
```

- El primer `deploy` te pedirá crear/vincular el proyecto (genera un
  `projectId` en `app.json`).
- Al terminar te da una URL de producción, del tipo
  `https://bilbo-app.expo.app`.
- Atajos ya configurados: `npm run deploy` (preview) y `npm run deploy:prod`
  (producción).

EAS Hosting entiende el enrutado de Expo Router, así que las rutas dinámicas
(`/exercise/[id]`) y la recarga directa de cualquier URL funcionan sin
configuración extra.

## Alternativa: cualquier hosting estático (Netlify, Vercel, Cloudflare Pages…)

Sube el contenido de `dist/`. Como es un export estático, funciona en cualquier
CDN. Para que la recarga directa de rutas dinámicas funcione, configura un
*fallback* SPA a `index.html` (Netlify: `/* /index.html 200`).

## Nota sobre los datos

Esta versión guarda todo en el navegador (localStorage). Cada dominio/origen
tiene su propio almacenamiento; no se sincroniza entre dispositivos todavía
(eso es la Fase 2: login + nube).
