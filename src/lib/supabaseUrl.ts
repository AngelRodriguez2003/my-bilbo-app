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

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // Que la URL sea inválida lo dirá supabase-js con su propio mensaje.
    return trimmed;
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
