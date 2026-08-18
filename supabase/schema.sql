-- Schema för "Bäst Fotbollskunskap 2026/27"
-- Körs en gång i Supabase SQL Editor. Ingen RLS – appen använder service role key server-side.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pin_hash text,                      -- null = inget PIN satt
  fpl_entry_id bigint,                -- kopplat FPL-lag (entry-id i ligan)
  created_at timestamptz not null default now()
);

create table if not exists predictions (
  user_id uuid primary key references users(id) on delete cascade,
  table_order jsonb,                  -- array med 20 FPL-lag-id i gissad ordning (index 0 = plats 1)
  first_sacked text,                  -- fritext
  top_scorers jsonb,                  -- array med upp till 3 element-id
  top_assists jsonb,                  -- array med upp till 3 element-id
  submitted_at timestamptz,           -- null = utkast, satt = inskickad och låst
  updated_at timestamptz not null default now()
);

-- En enda rad: senaste snapshoten av all FPL-data
create table if not exists snapshots (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- En enda rad: inställningar som admin styr
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  deadline timestamptz,               -- gissningsdeadline
  sacked_manager text,                -- facit: första sparkade tränaren
  sacked_decided boolean not null default false,
  league_code text not null default 'vyery9',
  league_id bigint,                   -- fallback till env FPL_LEAGUE_ID om null
  updated_at timestamptz not null default now()
);

insert into settings (id) values (1) on conflict (id) do nothing;

-- Beräknade poäng per användare och gameweek (skrivs om vid varje refresh)
create table if not exists scores (
  user_id uuid not null references users(id) on delete cascade,
  gameweek int not null,
  base_points numeric,                -- summa tabellpoäng över 20 lag (max 200), null = ingen tabell än
  bonus_points numeric not null default 0,
  table_points numeric,               -- (base + bonus) * 3
  fpl_points int not null default 0,
  total numeric not null default 0,
  breakdown jsonb,                    -- per-lag-poäng, bonusflaggor, sämsta gissningar
  updated_at timestamptz not null default now(),
  primary key (user_id, gameweek)
);

-- RLS på alla tabeller. Inga policies: appen kör service role server-side och går
-- förbi RLS, medan anon-nyckeln blir helt utelåst (annars är public exponerad).
alter table users enable row level security;
alter table predictions enable row level security;
alter table snapshots enable row level security;
alter table settings enable row level security;
alter table scores enable row level security;
