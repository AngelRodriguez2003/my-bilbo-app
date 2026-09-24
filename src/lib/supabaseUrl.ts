/**
 * La URL del proyecto tiene que ser solo el origen
 * (`https://<ref>.supabase.co`), sin ruta.
 *
 * En el panel de Supabase es fácil copiar el endpoint REST
 * (`https://<ref>.supabase.co/rest/v1`) en su lugar. Con esa URL,
 * supabase-js construye el alta contra `.../rest/v1/auth/v1/signup`: la
 * petición acaba en PostgREST, que contesta un `PGRST125 - Invalid path
 * specified in request URL` sin decir en ningún momento que el problema
 * está en la configuración. Normalizamos y avisamos en consola.
 */
export function normalizeProjectUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;

  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return undefined;

  // Sin esquema (`<ref>.supabase.co`) `new URL` falla, y es un despiste
  // frecuente al copiar la variable a mano en el panel de EAS.
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (withScheme !== trimmed) {
    console.warn(
      `[supabase] EXPO_PUBLIC_SUPABASE_URL no lleva esquema; se asume "https://".`,
    );
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(withScheme);
  } catch {
    // Se trata abajo igual que un esquema no soportado.
  }

  // supabase-js lanza en `createClient` con una URL inválida y eso pasa al
  // importar el módulo: en un build de release la app se cierra al abrir. Es
  // mejor quedarse sin sincronización (modo local) que no arrancar.
  if (!parsed || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
    console.warn(
      `[supabase] EXPO_PUBLIC_SUPABASE_URL no es una URL válida; la sincronización queda desactivada.`,
    );
    return undefined;
  }

  if (parsed.pathname && parsed.pathname !== '/') {
    console.warn(
      `[supabase] EXPO_PUBLIC_SUPABASE_URL incluye la ruta "${parsed.pathname}". ` +
        `Debe ser solo "${parsed.origin}" — se ignora la ruta. ` +
        `Copia el "Project URL" de Project Settings → API, no el endpoint REST.`,
    );
  }

  return parsed.origin;
}
