-- =====================================================================
-- Project Explosive — esquema de sincronización en la nube (Supabase)
--
-- Ejecuta este archivo COMPLETO en el SQL Editor de tu proyecto Supabase.
-- Es idempotente: puedes volver a ejecutarlo sin romper nada.
--
-- Notas de diseño:
--
--  * Los ids los genera el CLIENTE (crypto.randomUUID, con un fallback que
--    no es un UUID válido), por eso la clave primaria es TEXT y no UUID.
--  * La clave primaria es (user_id, id): dos cuentas distintas nunca se
--    pisan, aunque el generador de ids repitiera un valor.
--  * NO hay claves foráneas entre ejercicios/ciclos/series a propósito. La
--    app es offline-first: los registros llegan en el orden en que la red
--    los deja pasar, y una FK convertiría un push parcial en un error
--    permanente. La integridad la garantiza el cliente, que es el único
--    que crea estas relaciones.
--  * Borrado lógico (deleted + updated_at): una fila borrada en un móvil
--    debe poder viajar al resto de dispositivos. Nunca se hace DELETE.
-- =====================================================================

-- ---------------------------------------------------------------- tablas

create table if not exists public.exercises (
  id          text        not null,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  i18n_key    text,
  is_custom   boolean     not null default true,
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted     boolean     not null default false,
  primary key (user_id, id)
);

create table if not exists public.cycles (
  id             text        not null,
  user_id        uuid        not null references auth.users (id) on delete cascade,
  exercise_id    text        not null,
  unit           text        not null check (unit in ('kg', 'lb')),
  one_rep_max    double precision,
  start_weight   double precision not null,
  increment_step double precision not null,
  status         text        not null check (status in ('active', 'completed')),
  start_date     timestamptz not null,
  end_date       timestamptz,
  updated_at     timestamptz not null,
  deleted        boolean     not null default false,
  primary key (user_id, id)
);

create table if not exists public.sessions (
  id            text        not null,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  cycle_id      text        not null,
  -- "index" es palabra clave en SQL; el cliente la mapea a Session.index.
  session_index integer     not null,
  weight        double precision not null,
  reps          integer     not null,
  notes         text,
  date          timestamptz not null,
  updated_at    timestamptz not null,
  deleted       boolean     not null default false,
  primary key (user_id, id)
);

-- Una única fila de ajustes por usuario (tema, idioma, unidad, incremento).
create table if not exists public.user_settings (
  user_id           uuid        primary key references auth.users (id) on delete cascade,
  theme             text        not null check (theme in ('system', 'dark', 'light')),
  language          text        not null check (language in ('system', 'es', 'en')),
  default_unit      text        not null check (default_unit in ('kg', 'lb')),
  default_increment double precision not null,
  updated_at        timestamptz not null
);

-- --------------------------------------------------------------- índices
-- El pull incremental filtra siempre por (user_id, updated_at).

create index if not exists exercises_user_updated_idx on public.exercises (user_id, updated_at);
create index if not exists cycles_user_updated_idx    on public.cycles    (user_id, updated_at);
create index if not exists sessions_user_updated_idx  on public.sessions  (user_id, updated_at);

-- ------------------------------------------------------------------ RLS
-- Sin estas políticas la app NO funciona y los datos quedan expuestos:
-- la clave que viaja en el cliente es pública por diseño, el aislamiento
-- entre cuentas lo hace la base de datos, no el código de la app.

alter table public.exercises     enable row level security;
alter table public.cycles        enable row level security;
alter table public.sessions      enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "own rows" on public.exercises;
create policy "own rows" on public.exercises
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.cycles;
create policy "own rows" on public.cycles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.sessions;
create policy "own rows" on public.sessions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.user_settings;
create policy "own rows" on public.user_settings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
