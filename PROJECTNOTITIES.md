# Sprint U16 — Projectnotities
*AV Sprint Breda · Laatste update: 19 mei 2026 (patch 31)*

---

## 🏗️ Architectuur

| Onderdeel | Keuze | Reden |
|-----------|-------|-------|
| Frontend | Vanilla HTML/JS (één bestand) | Eenvoud, geen build-stap nodig |
| Hosting | GitHub Pages | Gratis, automatisch via push |
| Database | Supabase (PostgreSQL) | Gratis tier, ingebouwde auth + RLS |
| Auth | Supabase Auth + TOTP 2FA | Veilig, verplicht voor alle gebruikers |

**GitHub repo:** `Milanovitch1986/sprint-u16`
**Live URL:** `https://milanovitch1986.github.io/sprint-u16/`
**Supabase project:** `wntxmxvjvnishwkwvkux.supabase.co`
**Admin e-mail:** `milande_maat@hotmail.com`

---

## 📦 Databasetabellen

| Tabel | Doel |
|-------|------|
| `profielen` | Traineraccounts (gebruikersnaam, rol, laatste_login) |
| `categorieen` | U14, U16, U18 etc. (naam, volgorde) |
| `trainer_categorieen` | Koppeling trainer ↔ categorie (many-to-many) |
| `atleten` | Atletengegevens (naam, geslacht, geboortedatum, club, bondsnr) |
| `prestaties` | PR's per atleet per discipline |
| `wedstrijden` | Wedstrijden (naam, datum, locatie) |
| `programma` | Onderdelen per wedstrijd per geslacht |
| `opstelling` | Teamopstelling per wedstrijd per geslacht per ploeg (JSON) |
| `beschikbaarheid` | Beschikbaarheid per atleet per wedstrijd |
| `uitnodigingen` | Invite-only registratie (token, email, categorie_id, vervalt, gebruikt) |

**Belangrijk:** alle datatabellen gebruiken `categorie_id` als toegangssleutel — NIET `eigenaar_id`.
Row Level Security zorgt dat trainers alleen data zien van hun eigen categorieën.

---

## ⚠️ Bekende technische beslissingen

### Gebruikers verwijderen: SECURITY DEFINER RPC (patch 29, mei 2026)
Auth-accounts kunnen alleen worden verwijderd via de Supabase Service Role — die sleutel mag nooit in de frontend. Oplossing: database-functie `verwijder_gebruiker(p_gebruiker_id uuid)` met `SECURITY DEFINER`. De functie controleert zelf of de aanroeper admin is en blokkeert zelfverwijdering. Volgorde van verwijdering: `trainer_categorieen` → `uitnodigingen` → `profielen` → `auth.users`. Data gekoppeld aan categorieën (atleten, wedstrijden, prestaties) blijft bewaard.

### Uitnodiging markeren als gebruikt: SECURITY DEFINER RPC (patch 28, mei 2026)
Direct na `signUp()` heeft de nieuwe gebruiker nog geen actieve Supabase-sessie. Een directe `.update()` op de `uitnodigingen` tabel werd dan geblokkeerd door RLS. Oplossing: database-functie `markeer_uitnodiging_gebruikt(p_token text)` met `SECURITY DEFINER` — die omzeilt RLS en werkt sessie-onafhankelijk. Aanroep via `sb.rpc("markeer_uitnodiging_gebruikt", { p_token: token })`.

### Uitnodigingsbeheer: actief vs. geschiedenis (patch 28, mei 2026)
`laadAdminUitnodigingen()` splitst uitnodigingen in twee groepen:
- **Actief:** `!gebruikt && vervalt >= nu` — getoond in het hoofdblok met Kopiëren/Intrekken knoppen
- **Geschiedenis:** `gebruikt || vervalt < nu` — getoond in een aparte sectie eronder, gedimd, met alleen een Verwijderen-knop voor verlopen-ongebruikte uitnodigingen
De Geschiedenis-wrapper (`#uitnodigingen-geschiedenis-wrapper`) is standaard verborgen en verschijnt automatisch zodra er historische uitnodigingen zijn.

### Welkomstmail via Cloudflare Worker (patch 28, mei 2026)
De Cloudflare Worker `sprint-uitnodiging` ondersteunt nu twee e-mailtypes via het `type`-veld in de POST-body:
- `type: "uitnodiging"` → uitnodigingsmail met registratielink (ongewijzigd)
- `type: "welkom"` → welkomstmail met directe app-link, verstuurd vanuit `index.html` na succesvolle registratie

Als `type` ontbreekt of onbekend is, valt de Worker terug op de uitnodigingstekst.

### RLS profielen: admin leest alle profielen (patch 28, mei 2026)
De policy `eigen profiel lezen` (SELECT) gaf elke gebruiker alleen zijn eigen rij terug, waardoor de admin-tab de gebruikerslijst niet kon vullen. Nieuwe policy `admin_leest_alle_profielen` (SELECT, `TO authenticated`, `USING (true)`) geeft alle ingelogde gebruikers leestoegang tot alle profielen. Dit is veilig: de tabel bevat geen gevoelige gegevens.

> ⚠️ Let op: een eerdere poging met `EXISTS (SELECT 1 FROM profielen WHERE rol = 'admin')` veroorzaakte een oneindige recursie (infinite recursion detected in policy). De oplossing `USING (true)` met `TO authenticated` vermijdt dit.

### 3-uurs-regel middenafstand (patch 27, mei 2026)
Een atleet op de 800m of 1500m mag nooit automatisch ook worden opgesteld op de 300m of 300m horden (en omgekeerd) als de starttijden minder dan 180 minuten uit elkaar liggen.

**Implementatie:**
- Helper-functie `heeftDrieUurConflict(nieuweDisc, nieuweTijd, ingeplandLijst)` controlecert de combinatie
- `MIDDEN_AFSTANDEN = {800m, 1500m}`, `SPRINT_COMBINATIES = {300m, 300m horden}`
- Elk ingepland item slaat nu ook `discipline` op (naast `idx` en `starttijd`)
- Geldt in zowel `genereerOpstelling()` als `aanvullenOpstelling()`
- De bestaande 15-minuten-blokkade voor alle disciplines blijft ongewijzigd naast deze regel

### Automatische opstelling: sequentieel op punten (patch 15, april 2026)
`genereerOpstelling()` en `aanvullenOpstelling()` vullen ploegen in **volgorde A → B → C**.

**Principe:**
- Kandidaten per onderdeel worden gesorteerd op punten hoog→laag
- De sterkste vrije atleet (nog niet in een andere ploeg) krijgt altijd de eerste slot
- Zodra een atleet aan een ploeg is toegewezen, is hij niet meer beschikbaar voor andere ploegen
- Ploeg A krijgt dus de allerbeste atleten; ploeg B de beste resterende; ploeg C de rest

**Ronde 2 — minimaal 2 onderdelen:**
Na ronde 1 krijgen atleten die al aan een ploeg zijn gekoppeld maar nog maar 1 onderdeel hebben een tweede kans bij onderdelen met vrije slots. Zo doet elke atleet minimaal 2 onderdelen. Als dat toch niet lukt (bijv. door tijdconflicten), verschijnt een waarschuwing.

**Gevolg:** ploeg B en C kunnen bij sommige onderdelen minder dan 3 atleten hebben — dat is bewust en gewenst.

### PDF-import tijdschema: discipline-vertaling (patch 27, mei 2026)
De vertaaltabel `PDF_DISCIPLINE_VERTALING` bevat alle discipline-sleutels die in een wedstrijdprogramma-PDF kunnen voorkomen. Volgorde is belangrijk: de zoekfunctie `zoekDisciplineVertaling()` werkt ook met `startsWith`, dus specifiekere sleutels (bijv. `"300m horden"`) moeten altijd vóór kortere overlappende sleutels (bijv. `"300m"`) staan.

Toegevoegd in patch 27: `"300m horden"`, `"300mh"`, `"300mhorden"`.

### Geboortedatum tijdzonefout bij import (opgelost mei 2026, patches 25 + 26)
Bij de eerste atletenimport in het begin van het project stonden alle geboortedata 1 dag te vroeg opgeslagen. Oorzaak: `formatDatum()` gebruikte `.toISOString()` op een JavaScript `Date` object, wat in Nederland (UTC+1/+2) de datum 1 dag terug converteert naar UTC.

**Hoe opgelost:**
- Database gecorrigeerd via gerichte SQL-query: `UPDATE atleten SET geboortedatum = (geboortedatum::date + INTERVAL '1 day')::text WHERE id IN (...)` — 44 atleten bijgewerkt (patch 25)
- Tijdelijke export-compensatie (`+1 dag` in `isoNaarExcelDatum()`) verwijderd nu de database correct is (patch 25)
- `formatDatum()` gebruikt nu `getFullYear()` / `getMonth()` / `getDate()` (lokale tijd) in plaats van `.toISOString()` — voorkomt herhaling bij toekomstige imports (patch 26)

### PR-overzicht import (patch 14, april 2026)
Nieuwe importflow voor het brede Excel-formaat (kolom A = naam, rij 1 = disciplines als kolomtitels).

**Tijdlogica:** SheetJS geeft tijdcellen terug als decimaalbreuk (`< 1`) of als gewoon getal (`≥ 1`):
- Waarde `≥ 1` → al in seconden (bijv. `11`, `15.5`, `19.08`)
- Waarde `< 1` → Excel-tijddecimaal → `× 86400 = seconden` → geformatteerd als `ss.hh` of `m:ss.hh`

**Eenheid-logica:** zelfde als handmatig invoeren — `min` voor 800m/1500m/600m, `sec` voor sprints, `m` voor veld.

**Opslaan-strategie:** per discipline een gerichte `DELETE WHERE atleet_id + discipline` vóór de insert. Dit voorkomt duplicaten en is robuuster dan een batch-delete op ID-lijsten (wat Supabase-fouten gaf bij lege of ongeldige ID-arrays).

**Mapping:** `PR_KOLOM_MAP` vertaalt kolomtitels (lowercase) naar interne discipline-namen. Niet-herkende atleten kunnen handmatig gekoppeld worden via dropdown in de importmodal.

### Wedstrijdprogramma volledig in Wedstrijden-tab (patch 7, april 2026)
Het programma-overzicht is verwijderd uit de Opstelling-tab. Beheren én bekijken van het programma gaat uitsluitend via de Wedstrijden-tab ("📋 Programma"-knop op elke wedstrijdkaart). Afdrukken kan via 🖨️ in de programma-modal. `renderProgrammaOverzicht()` heeft een null-check zodat de functie niet crasht zonder het (verwijderde) DOM-element.

### eigenaar_id vs categorie_id
De originele app werkte met `eigenaar_id` (één trainer = één dataset).
In april 2026 gemigreerd naar `categorie_id` voor gedeelde toegang per categorie.
Na de migratie bleek dat `eigenaar_id` nog een NOT NULL constraint had.
Fix uitgevoerd via Supabase SQL Editor:
- `eigenaar_id` DROP NOT NULL op alle datatabellen
- UNIQUE constraints herbouwd op `categorie_id` voor opstelling en beschikbaarheid

### Dubbele `let wedstrijden` declaratie (opgelost april 2026)
Na de categorie-migratie stond `let wedstrijden = []` twee keer in app.html.
Dit veroorzaakte een SyntaxError waardoor de hele app niet laadde.
Opgelost door de tweede declaratie (regel 2151) te verwijderen.

### TOTP 2FA fix (opgelost april 2026)
Bestaande accounts zonder TOTP-factor (bijv. handmatig aangemaakt via Supabase)
werden niet door de 2FA-setup geleid. Fix: login() controleert nu eerst of er een
TOTP-factor bestaat; zo niet, dan wordt automatisch start2FASetup() aangeroepen.

### Supabase admin SQL: eerste keer admin instellen
Na eerste login moet admin-rol handmatig worden ingesteld:
```sql
UPDATE public.profielen SET rol = 'admin' WHERE email = 'milande_maat@hotmail.com';
```

---

## 🔑 Categorieënsysteem

- Categorieën beheerbaar via admin panel (aanmaken, verwijderen, volgorde)
- Trainers krijgen toegang via checkboxes in admin panel → "Toegang per trainer"
- Elke uitnodiging is gekoppeld aan een categorie
- Na registratie krijgt trainer automatisch toegang via database-functie:
  `koppel_trainer_aan_uitnodiging_categorie(trainer_id, token)`
- Admin ziet alle categorieën; trainer ziet alleen eigen categorieën
- Categorie-switcher verschijnt in navbar bij meerdere categorieën
- Logo toont actieve categorie: "⚡ Sprint U16" → "⚡ Sprint U14" etc.

---

## 🛡️ Beveiliging

- **Uitnodiging-only:** token vereist, verloopt na 7 dagen
- **2FA verplicht:** TOTP via Google Authenticator, Authy e.d.
- **RLS:** elke tabel heeft Row Level Security
- **Auth guard:** app.html stuurt door naar index.html zonder geldige sessie
- **SECURITY DEFINER functies:** `markeer_uitnodiging_gebruikt` en `koppel_trainer_aan_uitnodiging_categorie` werken sessie-onafhankelijk voor acties direct na registratie

---

## 🔗 Externe koppelingen

| Service | Details |
|---------|---------|
| Atletiek.nu API | Cloudflare Worker: `atletiek-nu-api-milan.milande-maat.workers.dev` |
| E-mail (uitnodiging + welkom) | Cloudflare Worker: `sprint-uitnodiging.milande-maat.workers.dev` + Brevo. POST-body: `{ email, link, type }` waarbij `type` = `"uitnodiging"` of `"welkom"`. API-sleutel: `sprint-u16-worker`, ingesteld als Secret `BREVO_API_KEY` in Worker |
| World Athletics PR | `worldathletics.nimarion.de` |
| NAU scoretabellen | Ingebouwd (U14/U16, feb. 2022) |

**Let op:** atletiek.nu Worker kan soms worden geblokkeerd door bot-detectie.

---

## 📋 Puntentelling (NAU, feb. 2022)

- **Loop:** `PUNTEN = INT(A / tijd - B)`
- **Veld:** `PUNTEN = INT(A × SQRT(afstand) - B)`
- INT kapt naar beneden af (geen afronding)
- Jongens en meisjes gebruiken dezelfde constanten bij U16

### Telregel per onderdeel (spelregel)

| Type | Max opstellen | Telt mee voor punten |
|------|--------------|----------------------|
| Looponderdelen | 3 atleten | Beste 2 |
| Technische onderdelen | 2 atleten (via Groep A + B) | Beste 1 |
| Estafette | 4 lopers | Alle punten |

De puntentelling in `renderPloeg()` groepeert punten per discipline-naam en past bovenstaande selectie toe vóór het optellen van het ploeg-totaal.

---

## 📥 Importmogelijkheden (overzicht)

| Knop | Locatie | Formaat | Wat het doet |
|------|---------|---------|--------------|
| 📥 Excel importeren | Atleten-tab | `.xlsx` atletenlijst (atletiek.nu formaat) | Importeert atletengegevens |
| 📥 PRs importeren | Prestaties-tab (Atletiek.nu sectie) | Atletiek.nu webresultaten | Haalt PR's op via externe koppeling |
| 📊 PR-overzicht importeren | Prestaties-tab | `.xlsx` breed formaat (naam + disciplines) | Importeert PR-overzicht met tijdomrekening |
| 📄 Tijdschema importeren | Wedstrijden-tab | `.pdf` wedstrijdprogramma | Importeert starttijden per onderdeel/geslacht |

### PR-overzicht Excel formaat (patch 14)
- Kolom A: atletennamen
- Rij 1: discipline-namen als kolomtitels (bijv. `80m`, `hoogspringen`, `1500m`)
- Cellen: waarden — tijden als getal (seconden) of als Excel-tijddecimaal, veld als meters
- Ondersteunde disciplines: 80m, 80m horden, 100m, 100m horden, 150m, 200m, 300m, 300m horden, 600m, 800m, 1500m, Hoogspringen, Verspringen, Speerwerpen, Discuswerpen, Kogelstoten, 4x100m, 4x80m

---

## 📁 Projectbestanden

| Bestand | Doel |
|---------|------|
| `app.html` | Hoofd-app (atleten, prestaties, wedstrijden, opstelling, admin) |
| `index.html` | Login + registratie + 2FA setup |
| `Sprint_U16_Spelregels.pdf` | Spelregels & werking voor trainers |
| `sprint-u16-dashboard.html` | Standalone statusdashboard (Supabase live checks) |

---

## 🗺️ Roadmap (volgend seizoen)

- [ ] Meerdere trainers per categorie uitnodigen en testen
- [ ] Categorieën U14 en U18/U20 activeren
- [ ] Excel-import testen met meerdere trainers
- [ ] Mobiele weergave verbeteren (optioneel)

---

## ✅ Geteste features (mei 2026, patch 28)

Alle 24 features getest en werkend: login, auth guard, atleet CRUD,
prestatie CRUD, wedstrijd CRUD, programma, beschikbaarheid, opstelling,
zoekfunctie, Excel import, atletiek.nu koppeling, admin panel
(uitnodigingen + gebruikers + categorieën + toegang per trainer),
categorie-switcher, categorie-isolatie, uitnodiging met categorie, 2FA setup.

Nieuw getest (patch 28): uitnodiging correct als "gebruikt" gemarkeerd na registratie,
uitnodigingen-geschiedenis sectie, welkomstmail na registratie, gebruikerslijst toont alle trainers.
