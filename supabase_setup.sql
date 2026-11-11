-- ══════════════════════════════════════════════════════════════════════════
--  Sprint U16 — AV Sprint Breda
--  Supabase-databaseopbouw (gegenereerd op 11 november 2026, patch 110)
-- ══════════════════════════════════════════════════════════════════════════
-- Dit script bouwt de database vanaf nul precies zo op als hij nu is.
-- Gebruik het als naslagwerk of om een lege kopie aan te maken.
-- Voer het NIET uit op de bestaande productiedatabase; dat geeft fouten
-- op al bestaande tabellen en functies.
--
-- Volgorde:
--   1. Extensies
--   2. Tabellen (in volgorde van afhankelijkheid)
--   3. Beginstaat keepalive
--   4. Rechten (GRANT)
--   5. Row-Level Security aanzetten
--   6. Functies (is_admin eerst; wordt gebruikt door triggers en policies)
--   7. Triggers
--   8. RLS-regels (policies)
--
-- Noten bij de huidige stand:
--   • De tabel release_notes (zonder underscore: releasenotes) is de tabel
--     die de app gebruikt. De tabel release_notes (met underscore) is een
--     oud residu en wordt nergens aangeroepen; hij staat hier ter volledigheid.
--   • De kolom eigenaar_id op atleten, beschikbaarheid, opstelling, prestaties,
--     programma en wedstrijden stamt uit een vroeger ontwerp waarbij rijen aan
--     een gebruiker waren gekoppeld. De app werkt al lang via categorie_id;
--     eigenaar_id wordt niet meer gelezen of gevuld, maar de kolom bestaat nog.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Extensies ────────────────────────────────────────────────────────
create extension if not exists pgcrypto;   -- gen_random_bytes, crypt

-- ── 2. Tabellen ──────────────────────────────────────────────────────────

-- Categorieën (U16, U14, U18/U20). Elke categorie heeft een volgorde voor de sortering.
create table if not exists public.categorieen (
  id          uuid        DEFAULT gen_random_uuid() NOT NULL,
  naam        text                                   NOT NULL,
  volgorde    integer     DEFAULT 0                  NOT NULL,
  aangemaakt  timestamptz DEFAULT now(),
  CONSTRAINT categorieen_pkey PRIMARY KEY (id),
  CONSTRAINT categorieen_naam_key UNIQUE (naam)
);

-- Gebruikersprofielen, één rij per auth.users-account. Rol is altijd 'admin' of 'trainer';
-- de bewaker bescherm_profiel_trigger zorgt dat alleen een admin de rol mag wijzigen.
create table if not exists public.profielen (
  id              uuid        NOT NULL,
  gebruikersnaam  text        NOT NULL,
  email           text        NOT NULL,
  rol             text        DEFAULT 'trainer' NOT NULL,
  actief          boolean     DEFAULT true      NOT NULL,
  aangemaakt      timestamptz DEFAULT now()     NOT NULL,
  laatste_login   timestamptz,
  CONSTRAINT profielen_pkey          PRIMARY KEY (id),
  CONSTRAINT profielen_gebruikersnaam_key UNIQUE (gebruikersnaam),
  CONSTRAINT profielen_id_fkey       FOREIGN KEY (id)  REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profielen_rol_check     CHECK (rol IN ('admin', 'trainer'))
);

-- Één rij (id = 1). De GitHub Actions-workflow pikt() schrijft hier elke dag in
-- om te voorkomen dat het gratis Supabase-project na 7 dagen inactiviteit wordt gepauzeerd.
create table if not exists public.keepalive (
  id          integer     NOT NULL,
  last_ping   timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT keepalive_pkey PRIMARY KEY (id)
);

-- Sleutel/waarde-tabel voor app-brede instellingen. Schrijven mag alleen via zet_instelling().
create table if not exists public.instellingen (
  sleutel       text        NOT NULL,
  waarde        text,
  bijgewerkt_op timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT instellingen_pkey PRIMARY KEY (sleutel)
);

-- Uitnodigingen voor nieuwe trainers. Een uitnodiging is gekoppeld aan een categorie;
-- na registreren wordt gebruikt = true gezet door handle_new_user().
create table if not exists public.uitnodigingen (
  id              uuid        DEFAULT gen_random_uuid()                  NOT NULL,
  email           text                                                   NOT NULL,
  token           text        DEFAULT encode(gen_random_bytes(32), 'hex') NOT NULL,
  aangemaakt_door uuid,
  gebruikt        boolean     DEFAULT false                              NOT NULL,
  aangemaakt      timestamptz DEFAULT now()                              NOT NULL,
  vervalt         timestamptz DEFAULT (now() + interval '7 days')       NOT NULL,
  categorie_id    uuid,
  CONSTRAINT uitnodigingen_pkey             PRIMARY KEY (id),
  CONSTRAINT uitnodigingen_email_key        UNIQUE (email),
  CONSTRAINT uitnodigingen_token_key        UNIQUE (token),
  CONSTRAINT uitnodigingen_aangemaakt_door_fkey FOREIGN KEY (aangemaakt_door) REFERENCES profielen(id),
  CONSTRAINT uitnodigingen_categorie_id_fkey    FOREIGN KEY (categorie_id)    REFERENCES categorieen(id)
);

-- Koppeltabel trainer ↔ categorie. Bepaalt welke atleten en wedstrijden een trainer ziet.
-- Elke trainer heeft toegang tot één of meer categorieën; een admin ziet alle categorieën.
create table if not exists public.trainer_categorieen (
  id            uuid DEFAULT gen_random_uuid() NOT NULL,
  trainer_id    uuid                              NOT NULL,
  categorie_id  uuid                              NOT NULL,
  CONSTRAINT trainer_categorieen_pkey                        PRIMARY KEY (id),
  CONSTRAINT trainer_categorieen_trainer_id_categorie_id_key UNIQUE (trainer_id, categorie_id),
  CONSTRAINT trainer_categorieen_trainer_id_fkey    FOREIGN KEY (trainer_id)   REFERENCES profielen(id)   ON DELETE CASCADE,
  CONSTRAINT trainer_categorieen_categorie_id_fkey  FOREIGN KEY (categorie_id) REFERENCES categorieen(id) ON DELETE CASCADE
);

-- Atleten per categorie. geboortedatum is text (niet date) omdat sommige invoer een tijd bevat;
-- veldDatum() in de app leest altijd alleen het JJJJ-MM-DD-deel.
-- eigenaar_id: historisch, niet meer gebruikt door de app (zie noot bovenaan).
create table if not exists public.atleten (
  id            uuid        DEFAULT gen_random_uuid() NOT NULL,
  eigenaar_id   uuid,
  naam          text                                   NOT NULL,
  geboortedatum text,
  geslacht      text,
  club          text,
  bondsnr       text,
  aangemaakt    timestamptz DEFAULT now()              NOT NULL,
  categorie_id  uuid                                   NOT NULL,
  blessure      text,
  CONSTRAINT atleten_pkey             PRIMARY KEY (id),
  CONSTRAINT atleten_eigenaar_id_fkey FOREIGN KEY (eigenaar_id) REFERENCES profielen(id)   ON DELETE CASCADE,
  CONSTRAINT atleten_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES categorieen(id)
);

-- Wedstrijden per categorie. is_open = individuele modus (geen opstelling); is_finale = finale
-- (voor import uit het Atletiekunie-tijdschema). einddatum is een echte date (nullable)
-- voor meerdaagse wedstrijden. eigenaar_id: historisch (zie noot bovenaan).
create table if not exists public.wedstrijden (
  id            uuid        DEFAULT gen_random_uuid() NOT NULL,
  eigenaar_id   uuid,
  naam          text                                   NOT NULL,
  datum         text,
  locatie       text,
  notities      text,
  aangemaakt    timestamptz DEFAULT now()              NOT NULL,
  categorie_id  uuid                                   NOT NULL,
  is_finale     boolean     DEFAULT false              NOT NULL,
  is_open       boolean     DEFAULT false              NOT NULL,
  einddatum     date,
  CONSTRAINT wedstrijden_pkey              PRIMARY KEY (id),
  CONSTRAINT wedstrijden_eigenaar_id_fkey  FOREIGN KEY (eigenaar_id)  REFERENCES profielen(id)   ON DELETE CASCADE,
  CONSTRAINT wedstrijden_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES categorieen(id)
);

-- Beschikbaarheid van een atleet voor een specifieke wedstrijd. Uniek per categorie + wedstrijd + atleet.
-- eigenaar_id: historisch (zie noot bovenaan).
create table if not exists public.beschikbaarheid (
  eigenaar_id   uuid,
  wedstrijd_id  uuid    NOT NULL,
  atleet_id     uuid    NOT NULL,
  beschikbaar   boolean DEFAULT true NOT NULL,
  categorie_id  uuid,
  CONSTRAINT beschikbaarheid_categorie_wedstrijd_atleet_key UNIQUE (categorie_id, wedstrijd_id, atleet_id),
  CONSTRAINT beschikbaarheid_eigenaar_id_fkey  FOREIGN KEY (eigenaar_id)  REFERENCES profielen(id)   ON DELETE CASCADE,
  CONSTRAINT beschikbaarheid_atleet_id_fkey    FOREIGN KEY (atleet_id)    REFERENCES atleten(id)     ON DELETE CASCADE,
  CONSTRAINT beschikbaarheid_wedstrijd_id_fkey FOREIGN KEY (wedstrijd_id) REFERENCES wedstrijden(id) ON DELETE CASCADE,
  CONSTRAINT beschikbaarheid_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES categorieen(id)
);

-- Persoonlijke records (PR's) per atleet en onderdeel. Er is altijd maximaal één rij
-- per atleet + discipline; de app vervangt de rij bij een verbetering.
-- eigenaar_id: historisch (zie noot bovenaan).
create table if not exists public.prestaties (
  id            uuid        DEFAULT gen_random_uuid() NOT NULL,
  eigenaar_id   uuid,
  atleet_id     uuid                                   NOT NULL,
  discipline    text                                   NOT NULL,
  resultaat     text                                   NOT NULL,
  eenheid       text,
  datum         text,
  locatie       text,
  notities      text,
  aangemaakt    timestamptz DEFAULT now()              NOT NULL,
  categorie_id  uuid,
  CONSTRAINT prestaties_pkey             PRIMARY KEY (id),
  CONSTRAINT prestaties_eigenaar_id_fkey FOREIGN KEY (eigenaar_id) REFERENCES profielen(id) ON DELETE CASCADE,
  CONSTRAINT prestaties_atleet_id_fkey   FOREIGN KEY (atleet_id)   REFERENCES atleten(id)   ON DELETE CASCADE,
  CONSTRAINT prestaties_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES categorieen(id)
);

-- Wedstrijdprogramma per geslacht: volgorde van onderdelen met starttijden.
-- startgroep is voor technische onderdelen met meerdere startgroepen.
-- eigenaar_id: historisch (zie noot bovenaan).
create table if not exists public.programma (
  id            uuid        DEFAULT gen_random_uuid() NOT NULL,
  eigenaar_id   uuid,
  wedstrijd_id  uuid                                   NOT NULL,
  geslacht      text                                   NOT NULL,
  discipline    text                                   NOT NULL,
  type          text,
  starttijd     text,
  duur          integer     DEFAULT 30,
  categorie_id  uuid,
  startgroep    text,
  CONSTRAINT programma_pkey              PRIMARY KEY (id),
  CONSTRAINT programma_eigenaar_id_fkey  FOREIGN KEY (eigenaar_id)  REFERENCES profielen(id)   ON DELETE CASCADE,
  CONSTRAINT programma_wedstrijd_id_fkey FOREIGN KEY (wedstrijd_id) REFERENCES wedstrijden(id) ON DELETE CASCADE,
  CONSTRAINT programma_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES categorieen(id)
);

-- Opgestelde ploegen per wedstrijd, geslacht en ploeg (A/B/C/RES).
-- data is een JSONB-object met sleutels als 'A_0_0' (ploeg_onderdeel_slot).
-- eigenaar_id: historisch (zie noot bovenaan).
create table if not exists public.opstelling (
  id            uuid        DEFAULT gen_random_uuid() NOT NULL,
  eigenaar_id   uuid,
  wedstrijd_id  uuid                                   NOT NULL,
  geslacht      text                                   NOT NULL,
  ploeg         text                                   NOT NULL,
  data          jsonb       DEFAULT '{}'::jsonb,
  categorie_id  uuid,
  CONSTRAINT opstelling_pkey                              PRIMARY KEY (id),
  CONSTRAINT opstelling_categorie_wedstrijd_geslacht_ploeg_key UNIQUE (categorie_id, wedstrijd_id, geslacht, ploeg),
  CONSTRAINT opstelling_eigenaar_id_fkey  FOREIGN KEY (eigenaar_id)  REFERENCES profielen(id)   ON DELETE CASCADE,
  CONSTRAINT opstelling_wedstrijd_id_fkey FOREIGN KEY (wedstrijd_id) REFERENCES wedstrijden(id) ON DELETE CASCADE,
  CONSTRAINT opstelling_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES categorieen(id)
);

-- Wedstrijdresultaten per discipline, atleet (of ploeg bij estafette), ronde en poging.
-- sleutel = atleet_id als tekst, of 'ploeg-A' voor estafette-teamtijden.
-- De unique-constraint voorkomt duplicaten bij upsert (patch 62, offline wachtrij).
-- status: 'ok', 'dns' (Did Not Start) of 'x' (ongeldig poging).
create table if not exists public.resultaten (
  id            uuid        DEFAULT gen_random_uuid() NOT NULL,
  categorie_id  uuid                                   NOT NULL,
  wedstrijd_id  uuid                                   NOT NULL,
  atleet_id     uuid,
  discipline    text                                   NOT NULL,
  sleutel       text                                   NOT NULL,
  resultaat     text,
  status        text        DEFAULT 'ok'               NOT NULL,
  ingevoerd_op  timestamptz DEFAULT now()              NOT NULL,
  ronde         text        DEFAULT ''                 NOT NULL,
  poging_nr     integer     DEFAULT 1                  NOT NULL,
  CONSTRAINT resultaten_pkey        PRIMARY KEY (id),
  CONSTRAINT resultaten_uniek       UNIQUE (categorie_id, wedstrijd_id, discipline, sleutel, ronde, poging_nr),
  CONSTRAINT resultaten_status_check CHECK (status IN ('ok', 'dns', 'x')),
  CONSTRAINT resultaten_atleet_id_fkey    FOREIGN KEY (atleet_id)    REFERENCES atleten(id)     ON DELETE CASCADE,
  CONSTRAINT resultaten_wedstrijd_id_fkey FOREIGN KEY (wedstrijd_id) REFERENCES wedstrijden(id) ON DELETE CASCADE,
  CONSTRAINT resultaten_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES categorieen(id)
);

-- Eigen (aangepaste) onderdelen per categorie, optioneel per atleet.
-- type: 'tijd_sec', 'tijd_min' of 'afstand'. geslacht: 'M', 'V' of 'B' (beide).
create table if not exists public.onderdelen (
  id            uuid        DEFAULT gen_random_uuid() NOT NULL,
  categorie_id  uuid                                   NOT NULL,
  naam          text                                   NOT NULL,
  type          text        DEFAULT 'tijd_sec'         NOT NULL,
  geslacht      text        DEFAULT 'B'                NOT NULL,
  aangemaakt    timestamptz DEFAULT now()              NOT NULL,
  atleet_id     uuid,
  CONSTRAINT onderdelen_pkey             PRIMARY KEY (id),
  CONSTRAINT onderdelen_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES categorieen(id) ON DELETE CASCADE,
  CONSTRAINT onderdelen_atleet_id_fkey   FOREIGN KEY (atleet_id)    REFERENCES atleten(id)     ON DELETE CASCADE
);

-- Release-opmerkingen die in de app zichtbaar zijn. De app leest deze tabel en importeert
-- ze via de knop 'Uit GitHub' vanuit CHANGELOG.md. tags is een text-array (patch 68).
create table if not exists public.releasenotes (
  id              uuid        DEFAULT gen_random_uuid() NOT NULL,
  versie          text                                   NOT NULL,
  titel           text                                   NOT NULL,
  type            text        DEFAULT 'feature'          NOT NULL,
  beschrijving    text,
  download_url    text,
  gepubliceerd_op timestamptz DEFAULT now()              NOT NULL,
  gearchiveerd    boolean     DEFAULT false              NOT NULL,
  tags            text[]      DEFAULT '{}'::text[],
  CONSTRAINT releasenotes_pkey PRIMARY KEY (id)
);

-- Oud residu, niet meer gebruikt door de app. Ter volledigheid opgenomen.
create table if not exists public.release_notes (
  id              uuid        DEFAULT gen_random_uuid() NOT NULL,
  versie          text                                   NOT NULL,
  titel           text                                   NOT NULL,
  type            text                                   NOT NULL,
  beschrijving    text,
  categorie_id    uuid,
  aangemaakt_op   timestamptz DEFAULT now(),
  CONSTRAINT release_notes_pkey          PRIMARY KEY (id),
  CONSTRAINT release_notes_type_check    CHECK (type IN ('feature', 'bugfix', 'update', 'removed')),
  CONSTRAINT release_notes_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES categorieen(id) ON DELETE SET NULL
);

-- ── 3. Beginstaat ────────────────────────────────────────────────────────
-- De keepalive-tabel heeft precies één rij. De ping()-functie werkt die bij.
insert into public.keepalive (id, last_ping)
values (1, now())
on conflict (id) do nothing;

-- ── 4. Rechten ───────────────────────────────────────────────────────────
-- Alle tabellen zijn toegankelijk voor anon en authenticated. De RLS-regels
-- (zie sectie 8) bepalen wat er daadwerkelijk leesbaar of schrijfbaar is.
-- Functies krijgen hun rechten apart (revoke/grant per functie, sectie 6).
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

-- ── 5. Row-Level Security aanzetten ──────────────────────────────────────
alter table public.categorieen enable row level security;
alter table public.profielen enable row level security;
alter table public.keepalive enable row level security;
alter table public.instellingen enable row level security;
alter table public.uitnodigingen enable row level security;
alter table public.trainer_categorieen enable row level security;
alter table public.atleten enable row level security;
alter table public.wedstrijden enable row level security;
alter table public.beschikbaarheid enable row level security;
alter table public.prestaties enable row level security;
alter table public.programma enable row level security;
alter table public.opstelling enable row level security;
alter table public.resultaten enable row level security;
alter table public.onderdelen enable row level security;
alter table public.releasenotes enable row level security;
alter table public.release_notes enable row level security;

-- ── 6. Functies ──────────────────────────────────────────────────────────
-- is_admin() staat als eerste: de andere functies en policies gebruiken hem.

-- is_admin(): geeft true als de huidige sessie een actieve admin IS met 2FA (aal2).
-- SECURITY DEFINER zodat de functie profielen mag lezen zonder een recursieve policy.
-- Rechten: alleen authenticated (anon heeft hier niets te zoeken).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (
       select 1 from public.profielen
       where id = auth.uid() and rol = 'admin' and actief
     );
$$;

revoke all on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

-- bescherm_profiel(): bewaker vóór insert of update op profielen.
-- Voorkomt dat een niet-admin zijn eigen rol of actief-status wijzigt.
-- Voorkomt ook dat de laatste actieve admin zichzelf degradeert.
-- Valt buiten de bewaker: de SQL-editor (postgres-rol) en handle_new_user.
create or replace function public.bescherm_profiel()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;

  if not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.rol <> 'trainer' or new.actief is not true then
        raise exception 'Alleen een admin mag de rol of de status van een gebruiker instellen';
      end if;
    elsif new.rol is distinct from old.rol
       or new.actief is distinct from old.actief
       or new.id is distinct from old.id then
      raise exception 'Alleen een admin mag de rol of de status van een gebruiker wijzigen';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.rol = 'admin' and old.actief
     and (new.rol <> 'admin' or new.actief is not true)
     and not exists (
       select 1 from public.profielen
       where id <> old.id and rol = 'admin' and actief
     ) then
    raise exception 'Dit is de laatste admin; maak eerst een andere gebruiker admin';
  end if;

  return new;
end;
$$;

-- handle_new_user(): trigger-functie na insert op auth.users (registratie).
-- Vereist een geldig uitnodigingstoken voor het e-mailadres; zet de uitnodiging
-- op gebruikt en koppelt de trainer aan de categorie van die uitnodiging.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_token        text := nullif(trim(new.raw_user_meta_data->>'uitnodiging_token'), '');
  v_categorie_id uuid;
begin
  if v_token is null then
    raise exception 'Registreren kan alleen met een uitnodiging';
  end if;

  update public.uitnodigingen
     set gebruikt = true
   where token = v_token
     and gebruikt = false
     and vervalt > now()
     and lower(trim(email)) = lower(trim(new.email))
  returning categorie_id into v_categorie_id;

  if not found then
    raise exception 'Geen geldige uitnodiging voor dit e-mailadres';
  end if;

  insert into public.profielen (id, gebruikersnaam, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'gebruikersnaam', split_part(new.email, '@', 1)),
    new.email,
    'trainer'
  );

  if v_categorie_id is not null then
    insert into public.trainer_categorieen (trainer_id, categorie_id)
    values (new.id, v_categorie_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- controleer_uitnodiging(p_token, p_email): controleert vóór de registratie of een token
-- geldig, ongebruikt en voor dit e-mailadres is. Retourneert 'ok', 'ander_email' of 'ongeldig'.
-- Leesbaar voor anon (vóór inloggen aanroepen vanuit de inlogpagina).
create or replace function public.controleer_uitnodiging(p_token text, p_email text)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_email text;
begin
  select email into v_email
  from public.uitnodigingen
  where token = p_token
    and gebruikt = false
    and vervalt > now();

  if not found then
    return 'ongeldig';
  end if;

  if lower(trim(v_email)) <> lower(trim(coalesce(p_email, ''))) then
    return 'ander_email';
  end if;

  return 'ok';
end;
$$;

revoke all on function public.controleer_uitnodiging(text, text) from public;
grant  execute on function public.controleer_uitnodiging(text, text) to anon, authenticated;

-- ping(): schrijft de huidige tijdstempel in keepalive.last_ping.
-- Aangeroepen door de GitHub Actions-workflow (dagelijks via cron).
-- Leesbaar voor anon zodat de workflow geen inlogbewijs nodig heeft.
create or replace function public.ping()
returns timestamptz
language sql
security definer
set search_path to 'public'
as $$
  update public.keepalive
     set last_ping = now()
   where id = 1
  returning last_ping;
$$;

-- zet_instelling(p_sleutel, p_waarde): schrijft in de tabel instellingen.
-- Alleen een admin (met 2FA) mag dit aanroepen; gebruikt is_admin().
create or replace function public.zet_instelling(p_sleutel text, p_waarde text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Alleen een admin mag instellingen wijzigen';
  end if;

  insert into public.instellingen (sleutel, waarde, bijgewerkt_op)
  values (p_sleutel, p_waarde, now())
  on conflict (sleutel) do update
    set waarde = excluded.waarde, bijgewerkt_op = now();
end;
$$;

revoke all on function public.zet_instelling(text, text) from public, anon;
grant  execute on function public.zet_instelling(text, text) to authenticated;

-- verwijder_gebruiker(p_gebruiker_id): verwijdert een account volledig.
-- Alleen een admin (met 2FA). Blokkeert zelfverwijdering.
create or replace function public.verwijder_gebruiker(p_gebruiker_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Geen toegang: alleen admins mogen gebruikers verwijderen';
  end if;

  if p_gebruiker_id = auth.uid() then
    raise exception 'Je kunt jezelf niet verwijderen';
  end if;

  delete from public.trainer_categorieen where trainer_id    = p_gebruiker_id;
  delete from public.uitnodigingen        where aangemaakt_door = p_gebruiker_id;
  delete from public.profielen            where id           = p_gebruiker_id;
  delete from auth.users                  where id           = p_gebruiker_id;
end;
$$;

-- ── 7. Triggers ──────────────────────────────────────────────────────────

-- Bij elke nieuwe registratie (insert op auth.users): profiel aanmaken en
-- de uitnodiging verwerken. Dit is een after-trigger; als de functie een
-- exception gooit, wordt de insert op auth.users teruggedraaid.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Vóór elke insert of update op profielen: rollen bewaken.
drop trigger if exists bescherm_profiel_trigger on public.profielen;
create trigger bescherm_profiel_trigger
  before insert or update on public.profielen
  for each row execute function public.bescherm_profiel();

-- ── 8. RLS-regels (policies) ─────────────────────────────────────────────
-- Patroon: elke tabel heeft twee soorten regels:
--   a. Een PERMISSIVE-regel die de inhoudelijke toegang bepaalt
--      (bijv. "alleen rijen van je eigen categorie").
--   b. Een RESTRICTIVE regel "vereist_2fa" die eist dat de sessie
--      de tweede stap (TOTP) heeft voltooid (aal2). Dit zit bovenop (a):
--      zelfs al geeft (a) toestemming, dan nog moet (b) ook akkoord gaan.
-- Functies die buiten de app om worden aangeroepen (ping, controleer_uitnodiging)
-- vallen buiten RLS omdat ze geen tabel direct raadplegen of SECURITY DEFINER zijn.
-- Vuistregel bij nieuwe tabellen:
--   • GRANT SELECT, INSERT, UPDATE, DELETE ON public.<tabel> TO authenticated;
--   • ALTER TABLE public.<tabel> ENABLE ROW LEVEL SECURITY;
--   • Voeg de inhoudelijke policy en "vereist_2fa" toe.

create policy "trainer_categorie_atleten" on public.atleten using ((categorie_id IN (SELECT trainer_categorieen.categorie_id FROM trainer_categorieen WHERE trainer_categorieen.trainer_id = auth.uid())));
create policy "vereist_2fa" on public.atleten as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "trainer_categorie_beschikbaarheid" on public.beschikbaarheid using ((categorie_id IN (SELECT trainer_categorieen.categorie_id FROM trainer_categorieen WHERE trainer_categorieen.trainer_id = auth.uid())));
create policy "vereist_2fa" on public.beschikbaarheid as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "ingelogd_leest_categorieen" on public.categorieen for select to authenticated using (true);
create policy "admin_beheert_categorieen" on public.categorieen using ((EXISTS (SELECT 1 FROM profielen WHERE profielen.id = auth.uid() AND profielen.rol = 'admin')));
create policy "vereist_2fa" on public.categorieen as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "instellingen_lezen" on public.instellingen for select to authenticated using (true);
create policy "vereist_2fa" on public.instellingen as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "onderdelen_categorie_toegang" on public.onderdelen to authenticated using ((is_admin() OR EXISTS (SELECT 1 FROM trainer_categorieen tc WHERE tc.categorie_id = onderdelen.categorie_id AND tc.trainer_id = auth.uid()))) with check ((is_admin() OR EXISTS (SELECT 1 FROM trainer_categorieen tc WHERE tc.categorie_id = onderdelen.categorie_id AND tc.trainer_id = auth.uid())));
create policy "vereist_2fa" on public.onderdelen as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "trainer_categorie_opstelling" on public.opstelling using ((categorie_id IN (SELECT trainer_categorieen.categorie_id FROM trainer_categorieen WHERE trainer_categorieen.trainer_id = auth.uid())));
create policy "vereist_2fa" on public.opstelling as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "trainer_categorie_prestaties" on public.prestaties using ((categorie_id IN (SELECT trainer_categorieen.categorie_id FROM trainer_categorieen WHERE trainer_categorieen.trainer_id = auth.uid())));
create policy "vereist_2fa" on public.prestaties as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "eigen profiel lezen" on public.profielen for select using ((auth.uid() = id));
create policy "eigen profiel aanmaken" on public.profielen for insert with check ((auth.uid() = id));
create policy "eigen profiel schrijven" on public.profielen for update using ((auth.uid() = id));
create policy "admin_leest_alle_profielen" on public.profielen for select to authenticated using (true);
create policy "admin wijzigt profielen" on public.profielen for update to authenticated using (is_admin()) with check (is_admin());
create policy "vereist_2fa" on public.profielen as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "trainer_categorie_programma" on public.programma using ((categorie_id IN (SELECT trainer_categorieen.categorie_id FROM trainer_categorieen WHERE trainer_categorieen.trainer_id = auth.uid())));
create policy "vereist_2fa" on public.programma as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "release_notes leesbaar voor ingelogde gebruikers" on public.release_notes for select to authenticated using (true);
create policy "release_notes schrijfbaar voor admins" on public.release_notes for insert to authenticated with check ((EXISTS (SELECT 1 FROM profielen WHERE profielen.id = auth.uid() AND profielen.rol = 'admin')));
create policy "vereist_2fa" on public.release_notes as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "Lezen voor ingelogde gebruikers" on public.releasenotes for select using ((auth.role() = 'authenticated'));
create policy "Schrijven alleen voor admin" on public.releasenotes using ((EXISTS (SELECT 1 FROM profielen WHERE profielen.id = auth.uid() AND profielen.rol = 'admin')));
create policy "vereist_2fa" on public.releasenotes as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "trainer_categorie_resultaten" on public.resultaten using ((categorie_id IN (SELECT trainer_categorieen.categorie_id FROM trainer_categorieen WHERE trainer_categorieen.trainer_id = auth.uid())));
create policy "vereist_2fa" on public.resultaten as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "trainer_eigen_koppelingen" on public.trainer_categorieen for select using ((trainer_id = auth.uid()));
create policy "admin_alle_koppelingen" on public.trainer_categorieen using ((EXISTS (SELECT 1 FROM profielen WHERE profielen.id = auth.uid() AND profielen.rol = 'admin')));
create policy "vereist_2fa" on public.trainer_categorieen as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "admin_beheert_uitnodigingen" on public.uitnodigingen using ((EXISTS (SELECT 1 FROM profielen WHERE profielen.id = auth.uid() AND profielen.rol = 'admin')));
create policy "vereist_2fa" on public.uitnodigingen as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

create policy "trainer_categorie_wedstrijden" on public.wedstrijden using ((categorie_id IN (SELECT trainer_categorieen.categorie_id FROM trainer_categorieen WHERE trainer_categorieen.trainer_id = auth.uid())));
create policy "vereist_2fa" on public.wedstrijden as restrictive to authenticated using (((SELECT auth.jwt() ->> 'aal') = 'aal2')) with check (((SELECT auth.jwt() ->> 'aal') = 'aal2'));

