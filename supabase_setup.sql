-- ============================================================
-- SPRINT U16 — Supabase Database Setup
-- Plak dit in de SQL Editor en klik Run
-- ============================================================

-- ── 1. Profielen (gekoppeld aan auth.users) ──────────────────
create table public.profielen (
  id          uuid references auth.users(id) on delete cascade primary key,
  gebruikersnaam text not null unique,
  email       text not null,
  rol         text not null default 'trainer' check (rol in ('admin','trainer')),
  actief      boolean not null default true,
  aangemaakt  timestamptz not null default now(),
  laatste_login timestamptz
);

-- ── 2. Atleten ───────────────────────────────────────────────
create table public.atleten (
  id            uuid primary key default gen_random_uuid(),
  eigenaar_id   uuid references public.profielen(id) on delete cascade not null,
  naam          text not null,
  geboortedatum text,
  geslacht      text,
  club          text,
  bondsnr       text,
  aangemaakt    timestamptz not null default now()
);

-- ── 3. Prestaties ────────────────────────────────────────────
create table public.prestaties (
  id          uuid primary key default gen_random_uuid(),
  eigenaar_id uuid references public.profielen(id) on delete cascade not null,
  atleet_id   uuid references public.atleten(id) on delete cascade not null,
  discipline  text not null,
  resultaat   text not null,
  eenheid     text,
  datum       text,
  locatie     text,
  notities    text,
  aangemaakt  timestamptz not null default now()
);

-- ── 4. Wedstrijden ───────────────────────────────────────────
create table public.wedstrijden (
  id          uuid primary key default gen_random_uuid(),
  eigenaar_id uuid references public.profielen(id) on delete cascade not null,
  naam        text not null,
  datum       text,
  locatie     text,
  notities    text,
  aangemaakt  timestamptz not null default now()
);

-- ── 5. Programma (tijdschema per wedstrijd) ──────────────────
create table public.programma (
  id            uuid primary key default gen_random_uuid(),
  eigenaar_id   uuid references public.profielen(id) on delete cascade not null,
  wedstrijd_id  uuid references public.wedstrijden(id) on delete cascade not null,
  geslacht      text not null,
  discipline    text not null,
  type          text,
  starttijd     text,
  duur          integer default 30
);

-- ── 6. Opstelling ────────────────────────────────────────────
create table public.opstelling (
  id            uuid primary key default gen_random_uuid(),
  eigenaar_id   uuid references public.profielen(id) on delete cascade not null,
  wedstrijd_id  uuid references public.wedstrijden(id) on delete cascade not null,
  geslacht      text not null,
  ploeg         text not null,
  data          jsonb default '{}',
  unique (eigenaar_id, wedstrijd_id, geslacht, ploeg)
);

-- ── 7. Beschikbaarheid ───────────────────────────────────────
create table public.beschikbaarheid (
  eigenaar_id   uuid references public.profielen(id) on delete cascade not null,
  wedstrijd_id  uuid references public.wedstrijden(id) on delete cascade not null,
  atleet_id     uuid references public.atleten(id) on delete cascade not null,
  beschikbaar   boolean not null default true,
  primary key (eigenaar_id, wedstrijd_id, atleet_id)
);

-- ── 8. Uitnodigingen ─────────────────────────────────────────
create table public.uitnodigingen (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  aangemaakt_door uuid references public.profielen(id),
  gebruikt    boolean not null default false,
  aangemaakt  timestamptz not null default now(),
  vervalt     timestamptz not null default (now() + interval '7 days')
);

-- ── 9. Row Level Security (RLS) ──────────────────────────────
-- Elke trainer ziet alleen zijn eigen data

alter table public.profielen      enable row level security;
alter table public.atleten         enable row level security;
alter table public.prestaties      enable row level security;
alter table public.wedstrijden     enable row level security;
alter table public.programma       enable row level security;
alter table public.opstelling      enable row level security;
alter table public.beschikbaarheid enable row level security;
alter table public.uitnodigingen   enable row level security;

-- Profielen: eigen profiel inzien en bewerken
create policy "eigen profiel" on public.profielen
  for all using (auth.uid() = id);

-- Admin kan alle profielen zien
create policy "admin alle profielen" on public.profielen
  for select using (
    exists (select 1 from public.profielen where id = auth.uid() and rol = 'admin')
  );

-- Atleten: eigen data
create policy "eigen atleten" on public.atleten
  for all using (eigenaar_id = auth.uid());

-- Prestaties: eigen data
create policy "eigen prestaties" on public.prestaties
  for all using (eigenaar_id = auth.uid());

-- Wedstrijden: eigen data
create policy "eigen wedstrijden" on public.wedstrijden
  for all using (eigenaar_id = auth.uid());

-- Programma: eigen data
create policy "eigen programma" on public.programma
  for all using (eigenaar_id = auth.uid());

-- Opstelling: eigen data
create policy "eigen opstelling" on public.opstelling
  for all using (eigenaar_id = auth.uid());

-- Beschikbaarheid: eigen data
create policy "eigen beschikbaarheid" on public.beschikbaarheid
  for all using (eigenaar_id = auth.uid());

-- Uitnodigingen: admin beheert, iedereen kan token ophalen
create policy "admin uitnodigingen" on public.uitnodigingen
  for all using (
    exists (select 1 from public.profielen where id = auth.uid() and rol = 'admin')
  );
create policy "token ophalen" on public.uitnodigingen
  for select using (true);

-- ── 10. Trigger: profiel aanmaken bij registratie ────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profielen (id, gebruikersnaam, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'gebruikersnaam', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'rol', 'trainer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 11. Jouw admin account instellen ────────────────────────
-- Dit wordt automatisch gedaan zodra je inlogt.
-- Voer dit uit NA je eerste login om jezelf admin te maken:
-- update public.profielen set rol = 'admin' where email = 'milande_maat@hotmail.com';
