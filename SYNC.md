# Sincronización en la nube (Supabase)

El progreso se guarda **siempre en el dispositivo** y, si hay sesión iniciada,
se replica en Supabase para que el móvil y el ordenador vean lo mismo. Sin
cuenta la app funciona igual que antes: solo local.

---

## 1. Crear el proyecto en Supabase

Estos pasos los haces tú, porque implican crear una cuenta:

1. Entra en <https://supabase.com> y crea una cuenta (plan gratuito).
2. **New project**. Elige la región más cercana (Europa: `eu-west-*`) y guarda
   la contraseña de la base de datos en tu gestor de contraseñas — la app no la
   necesita, pero Supabase no te la vuelve a enseñar.
3. Espera a que el proyecto termine de aprovisionarse (1-2 minutos).

## 2. Crear las tablas

1. En el panel del proyecto, abre **SQL Editor → New query**.
2. Pega el contenido completo de [`supabase/schema.sql`](supabase/schema.sql)
   y pulsa **Run**.
3. Comprueba en **Table Editor** que aparecen `exercises`, `cycles`,
   `sessions` y `user_settings`, las cuatro con el candado de *RLS enabled*.

El script es idempotente: puedes volver a ejecutarlo cuando cambie el esquema.

## 3. Configurar la app

1. Copia `.env.example` a `.env`.
2. En Supabase, **Project Settings → API**, copia:
   - *Project URL* → `EXPO_PUBLIC_SUPABASE_URL`
   - la clave *anon* / *publishable* → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Reinicia el servidor de desarrollo. Las variables `EXPO_PUBLIC_*` se
   inlinean en el bundle al arrancar, así que un cambio en `.env` no se aplica
   en caliente.

> **Nunca** pongas aquí la clave `service_role`. Todo lo que empieza por
> `EXPO_PUBLIC_` viaja dentro de la app y cualquiera puede leerlo. Quien
> protege los datos son las políticas RLS del paso 2, no el secreto de la clave.

### Correo de confirmación

Por defecto Supabase exige confirmar el correo antes del primer inicio de
sesión. Para una app personal suele estorbar: **Authentication → Providers →
Email** y desactiva *Confirm email*. Si lo dejas activado, al crear la cuenta
la app te avisa de que revises el correo.

## 4. Desplegar la web con sincronización

El workflow de producción ya pasa las dos variables al build. Añádelas como
*secrets* del repositorio (**Settings → Secrets and variables → Actions**):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Sin esos secrets la web se despliega con la sincronización desactivada, y la
pantalla de Cuenta lo dice explícitamente.

## 5. Evitar que el proyecto se pause

El plan gratuito pausa un proyecto tras **7 días sin actividad**. El workflow
[`supabase-keepalive.yml`](.github/workflows/supabase-keepalive.yml) hace una
lectura trivial lunes y jueves para reiniciar ese contador; usa los mismos dos
secrets del paso anterior. Si el proyecto llega a pausarse no se pierde nada:
se restaura desde el panel (hasta un año después).

---

## Cómo funciona

### Qué se sincroniza

Ejercicios, ciclos, series y los ajustes (tema, idioma, unidad, incremento).
Una fila por registro, con `user_id`, `updated_at` y borrado lógico.

### Resolución de conflictos

**Last-write-wins por registro**, no por dispositivo: gana la copia con el
`updatedAt` más alto. Como la unidad es el registro, editar un ejercicio en el
móvil y otro distinto en el PC no provoca ningún conflicto — solo lo haría
tocar *el mismo* registro en los dos sitios antes de que sincronicen, y ahí
gana el cambio más reciente.

Nada se borra de verdad: un borrado es `deleted: true` con su `updatedAt`, para
que pueda viajar al resto de dispositivos. Un `DELETE` real sería
indistinguible de "este registro todavía no ha llegado".

Cada pasada **baja primero y sube después**. El `upsert` sobrescribe la fila sin
mirar su fecha, así que subir primero haría que un cambio local viejo borrase
uno remoto más nuevo. Bajando antes, ese caso lo resuelve el merge y lo que se
sube ya es la versión ganadora.

### Los dos cursores

`src/store/sync.ts` guarda dos marcas de tiempo que **no** se pueden mezclar:

- `lastPushedAt` vive en el reloj de **este dispositivo** y dice hasta dónde se
  ha subido.
- `lastPulledAt` vive en el reloj del **servidor** y dice hasta dónde se ha
  bajado.

Usar una sola es la forma clásica de perder registros cuando los relojes de dos
dispositivos no coinciden. El peor caso de un cursor desfasado es reenviar o
volver a recibir algo que ya estaba: el upsert y el merge son idempotentes.

Si algo se descuadra, **Sincronización completa** en la pantalla de Cuenta
ignora los dos cursores y vuelve a comparar todo.

### Cuándo sincroniza

- Al restaurar la sesión, en el arranque.
- 2,5 s después de cualquier cambio local (agrupa ráfagas de edición).
- Al volver la app a primer plano — que es cuando llegan los cambios hechos en
  el otro dispositivo.
- A mano, desde el botón de la pantalla de Cuenta.

Sin conexión no pasa nada: los cambios se quedan en el dispositivo y suben en
la siguiente pasada. Los cursores solo avanzan cuando la pasada entera termina
bien.

### Qué pasa con los datos locales al iniciar sesión

- **Dispositivo recién instalado** (solo los ejercicios de ejemplo, sin ciclos
  ni series): se descartan y se traen los de la cuenta. Si no, tendrías el
  "Press banca" de ejemplo y el "Press banca" de tu cuenta, duplicados.
- **Habías entrenado sin cuenta**: ese historial se adopta tal cual y sube
  entero en la primera pasada. No se pierde nada.
- **Entras con una cuenta distinta a la de los datos de ese dispositivo**: los
  locales se sustituyen por los de la cuenta nueva. La alternativa sería subir
  el historial de una persona a la cuenta de otra, que es peor y además
  contamina la nube.

### Qué NO hace

- No hay tiempo real: los cambios llegan en la siguiente sincronización, no al
  instante. Supabase Realtime se podría añadir encima sin tocar el resto.
- No hay reintento con espera progresiva: el siguiente disparador reintenta.
