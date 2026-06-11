-- ============================================================================
-- Sprint U16 — Supabase database-setup
-- AV Sprint Breda · Atletiekbeheertool
-- ============================================================================
--
-- Dit script bouwt de volledige database-structuur op voor een NIEUWE, LEGE
-- Supabase-database: tabellen, RLS-policies, functies en de signup-trigger.
--
-- BELANGRIJK:
--   * Bedoeld voor een lege database. Het bevat geen DROP/DELETE en wist dus
--     geen data, maar op een database waar de tabellen al bestaan levert het
--     foutmeldingen op ("relation already exists"). Draai het dus niet op je
--     bestaande, gevulde database.
--   * De beveiliging zit volledig in de RLS-policies (zoals in Supabase
--     gebruikelijk), niet in de table-grants.
--   * Tweestapsverificatie (2FA / TOTP) wordt NIET hier geregeld, maar in de
--     Supabase Auth-instellingen (Authentication > Providers / MFA). Houd daar
--     rekening mee bij het opzetten van een nieuwe omgeving.
--
-- Toegangsmodel: data is gekoppeld aan een categorie (categorie_id). Een
-- trainer ziet alleen categorieën waaraan die via 'trainer_categorieen' is
-- gekoppeld; een admin beheert categorieën en gebruikers.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ============================================================================
-- 1. TABELLEN
-- ============================================================================

-- Categorieën (bv. U16). Uitbreidbaar via het admin-paneel.
create table public.categorieen (
  id          uuid primary key default gen_random_uuid(),
  naam        text not null unique,
  volgorde    integer not null default 0,
  aangemaakt  timestamptz default now()
);

-- Gebruikersprofielen. 'id' verwijst rechtstreeks naar het auth-account.
create table public.profielen (
  id              uuid primary key references auth.users(id) on delete cascade,
  gebruikersnaam  text not null unique,
  email           text not null,
  rol             text not null default 'trainer' check (rol in ('admin', 'trainer')),
  actief          boolean not null default true,
  aangemaakt      timestamptz not null default now(),
  laatste_login   timestamptz
);

-- Koppeling: welke trainer hoort bij welke categorie (toegangsbeheer).
create table public.trainer_categorieen (
  id            uuid primary key default gen_random_uuid(),
  trainer_id    uuid not null references public.profielen(id) on delete cascade,
  categorie_id  uuid not null references public.categorieen(id) on delete cascade,
  unique (trainer_id, categorie_id)
);

-- Atleten.
create table public.atleten (
  id             uuid primary key default gen_random_uuid(),
  naam           text not null,
  geboortedatum  text,
  geslacht       text,
  club           text,
  bondsnr        text,
  blessure       text,
  aangemaakt     timestamptz not null default now(),
  categorie_id   uuid not null references public.categorieen(id)
);

-- Wedstrijden.
create table public.wedstrijden (
  id            uuid primary key default gen_random_uuid(),
  naam          text not null,
  datum         text,
  locatie       text,
  notities      text,
  is_finale     boolean not null default false,
  aangemaakt    timestamptz not null default now(),
  categorie_id  uuid not null references public.categorieen(id)
);

-- Programma / tijdschema per wedstrijd.
create table public.programma (
  id            uuid primary key default gen_random_uuid(),
  wedstrijd_id  uuid not null references public.wedstrijden(id) on delete cascade,
  geslacht      text not null,
  discipline    text not null,
  type          text,
  starttijd     text,
  duur          integer default 30,
  startgroep    text,
  categorie_id  uuid references public.categorieen(id)
);

-- Opstellingen (lineups) per wedstrijd, geslacht en ploeg.
create table public.opstelling (
  id            uuid primary key default gen_random_uuid(),
  wedstrijd_id  uuid not null references public.wedstrijden(id) on delete cascade,
  geslacht      text not null,
  ploeg         text not null,
  data          jsonb default '{}'::jsonb,
  categorie_id  uuid references public.categorieen(id),
  unique (categorie_id, wedstrijd_id, geslacht, ploeg)
);

-- Beschikbaarheid van atleten per wedstrijd.
-- (Geen aparte primaire sleutel; de unieke combinatie fungeert als sleutel.)
create table public.beschikbaarheid (
  wedstrijd_id  uuid not null references public.wedstrijden(id) on delete cascade,
  atleet_id     uuid not null references public.atleten(id) on delete cascade,
  beschikbaar   boolean not null default true,
  categorie_id  uuid references public.categorieen(id),
  unique (categorie_id, wedstrijd_id, atleet_id)
);

-- Prestaties / persoonlijke records.
create table public.prestaties (
  id            uuid primary key default gen_random_uuid(),
  atleet_id     uuid not null references public.atleten(id) on delete cascade,
  discipline    text not null,
  resultaat     text not null,
  eenheid       text,
  datum         text,
  locatie       text,
  notities      text,
  aangemaakt    timestamptz not null default now(),
  categorie_id  uuid references public.categorieen(id)
);

-- Uitnodigingen voor nieuwe gebruikers, gekoppeld aan een categorie.
create table public.uitnodigingen (
  id               uuid primary key default gen_random_uuid(),
  email            text not null unique,
  token            text not null unique default encode(gen_random_bytes(32), 'hex'),
  aangemaakt_door  uuid references public.profielen(id),
  gebruikt         boolean not null default false,
  aangemaakt       timestamptz not null default now(),
  vervalt          timestamptz not null default (now() + interval '7 days'),
  categorie_id     uuid references public.categorieen(id)
);

-- Releasenotes (getoond in het admin-paneel / changelog in de app).
create table public.releasenotes (
  id              uuid primary key default gen_random_uuid(),
  versie          text not null,
  titel           text not null,
  type            text not null default 'feature',
  beschrijving    text,
  download_url    text,
  gepubliceerd_op timestamptz not null default now(),
  gearchiveerd    boolean not null default false
);

-- ============================================================================
-- 2. ROW LEVEL SECURITY AANZETTEN
-- ============================================================================

alter table public.categorieen          enable row level security;
alter table public.profielen            enable row level security;
alter table public.trainer_categorieen  enable row level security;
alter table public.atleten              enable row level security;
alter table public.wedstrijden          enable row level security;
alter table public.programma            enable row level security;
alter table public.opstelling           enable row level security;
alter table public.beschikbaarheid      enable row level security;
alter table public.prestaties           enable row level security;
alter table public.uitnodigingen        enable row level security;
alter table public.releasenotes         enable row level security;

-- ============================================================================
-- 3. FUNCTIES
-- ============================================================================

-- Maakt automatisch een profiel aan zodra er een nieuw auth-account ontstaat.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
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

-- Koppelt een nieuwe trainer aan de categorie uit zijn uitnodiging.
create or replace function public.koppel_trainer_aan_uitnodiging_categorie(p_trainer_id uuid, p_token text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_categorie_id uuid;
begin
  -- Zoek categorie_id op uit de (gebruikte) uitnodiging
  select categorie_id into v_categorie_id
  from public.uitnodigingen
  where token = p_token
  limit 1;

  -- Koppel als categorie gevonden
  if v_categorie_id is not null then
    insert into public.trainer_categorieen (trainer_id, categorie_id)
    values (p_trainer_id, v_categorie_id)
    on conflict do nothing;
  end if;
end;
$$;

-- Markeert een uitnodiging als gebruikt (alleen als die nog geldig is).
create or replace function public.markeer_uitnodiging_gebruikt(p_token text)
returns void
language plpgsql
security definer
as $$
begin
  update uitnodigingen
  set gebruikt = true
  where token = p_token
    and gebruikt = false
    and vervalt > now();
end;
$$;

-- Verwijdert een gebruiker volledig (alleen aan te roepen door een admin).
create or replace function public.verwijder_gebruiker(p_gebruiker_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Alleen een admin mag dit aanroepen
  if not exists (
    select 1 from profielen
    where id = auth.uid() and rol = 'admin'
  ) then
    raise exception 'Geen toegang: alleen admins mogen gebruikers verwijderen';
  end if;

  -- Blokkeer zelfverwijdering
  if p_gebruiker_id = auth.uid() then
    raise exception 'Je kunt jezelf niet verwijderen';
  end if;

  -- 1. Verwijder categorie-koppelingen
  delete from trainer_categorieen where trainer_id = p_gebruiker_id;

  -- 2. Verwijder uitnodigingen aangemaakt door deze gebruiker
  delete from uitnodigingen where aangemaakt_door = p_gebruiker_id;

  -- 3. Verwijder profiel
  delete from profielen where id = p_gebruiker_id;

  -- 4. Verwijder auth-account (vereist SECURITY DEFINER + service role rechten)
  delete from auth.users where id = p_gebruiker_id;
end;
$$;

-- ============================================================================
-- 4. TRIGGER
-- ============================================================================

-- Voert handle_new_user() uit na het aanmaken van een nieuw auth-account.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 5. RLS-POLICIES
-- ============================================================================

-- --- categorieen ---
create policy "iedereen_leest_categorieen" on public.categorieen
  for select using (true);

create policy "admin_beheert_categorieen" on public.categorieen
  for all using (
    exists (select 1 from profielen where profielen.id = auth.uid() and profielen.rol = 'admin')
  );

-- --- profielen ---
-- (Let op: deze policies verwijzen naar de EIGEN profiel-id, niet naar een
--  eigenaar-kolom. Bewust geen 'exists ... from profielen' om RLS-recursie te
--  voorkomen.)
create policy "eigen profiel lezen" on public.profielen
  for select using (auth.uid() = id);

create policy "eigen profiel aanmaken" on public.profielen
  for insert with check (auth.uid() = id);

create policy "eigen profiel schrijven" on public.profielen
  for update using (auth.uid() = id);

create policy "admin_leest_alle_profielen" on public.profielen
  for select to authenticated using (true);

-- --- trainer_categorieen ---
create policy "trainer_eigen_koppelingen" on public.trainer_categorieen
  for select using (trainer_id = auth.uid());

create policy "admin_alle_koppelingen" on public.trainer_categorieen
  for all using (
    exists (select 1 from profielen where profielen.id = auth.uid() and profielen.rol = 'admin')
  );

-- --- atleten ---
create policy "trainer_categorie_atleten" on public.atleten
  for all using (
    categorie_id in (
      select trainer_categorieen.categorie_id from trainer_categorieen
      where trainer_categorieen.trainer_id = auth.uid()
    )
  );

-- --- wedstrijden ---
create policy "trainer_categorie_wedstrijden" on public.wedstrijden
  for all using (
    categorie_id in (
      select trainer_categorieen.categorie_id from trainer_categorieen
      where trainer_categorieen.trainer_id = auth.uid()
    )
  );

-- --- programma ---
create policy "trainer_categorie_programma" on public.programma
  for all using (
    categorie_id in (
      select trainer_categorieen.categorie_id from trainer_categorieen
      where trainer_categorieen.trainer_id = auth.uid()
    )
  );

-- --- opstelling ---
create policy "trainer_categorie_opstelling" on public.opstelling
  for all using (
    categorie_id in (
      select trainer_categorieen.categorie_id from trainer_categorieen
      where trainer_categorieen.trainer_id = auth.uid()
    )
  );

-- --- beschikbaarheid ---
create policy "trainer_categorie_beschikbaarheid" on public.beschikbaarheid
  for all using (
    categorie_id in (
      select trainer_categorieen.categorie_id from trainer_categorieen
      where trainer_categorieen.trainer_id = auth.uid()
    )
  );

-- --- prestaties ---
create policy "trainer_categorie_prestaties" on public.prestaties
  for all using (
    categorie_id in (
      select trainer_categorieen.categorie_id from trainer_categorieen
      where trainer_categorieen.trainer_id = auth.uid()
    )
  );

-- --- uitnodigingen ---
-- SELECT met true is nodig zodat de inlogpagina vóór login een uitnodiging
-- op token kan opzoeken.
create policy "token ophalen" on public.uitnodigingen
  for select using (true);

create policy "admin_beheert_uitnodigingen" on public.uitnodigingen
  for all using (
    exists (select 1 from profielen where profielen.id = auth.uid() and profielen.rol = 'admin')
  );

-- --- releasenotes ---
create policy "Lezen voor ingelogde gebruikers" on public.releasenotes
  for select using (auth.role() = 'authenticated');

create policy "Schrijven alleen voor admin" on public.releasenotes
  for all using (
    exists (select 1 from profielen where profielen.id = auth.uid() and profielen.rol = 'admin')
  );

-- ============================================================================
-- 6. RECHTEN (GRANTS)
-- ============================================================================
-- In Supabase krijgen de standaardrollen volledige rechten; de daadwerkelijke
-- afscherming gebeurt via de RLS-policies hierboven.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- ============================================================================
-- Einde setup
-- ============================================================================
