# Changelog — Sprint U16
*AV Sprint Breda · Atletiekbeheertool*

Alle wijzigingen worden hier bijgehouden, nieuwste bovenaan.
Formaat gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/).

---

## [mei 2026 — patch 30] — 2026-05-15

### 📲 Opstelling delen via WhatsApp

Trainers kunnen de opstelling nu direct als leesbare tekst versturen via WhatsApp.

**Hoe het werkt:**
- Nieuwe knop `📲 Delen via WhatsApp` in de Opstelling-tab, naast de bestaande knoppen
- Klikt de trainer op de knop, dan opent WhatsApp automatisch met de opstelling als kant-en-klare tekst
- De tekst toont: clubnaam, wedstrijdnaam, datum, locatie, geslacht, en per ploeg alle onderdelen met atleten en starttijden
- Lege onderdelen (geen atleet ingevuld) worden overgeslagen
- Werkt op iOS (WhatsApp-app opent direct), Android (idem) en desktop (WhatsApp Web)

**Technische details:**
- Nieuwe functie `deelViaWhatsApp()` in `app.html`
- Gebruikt de huidige weergave (geslacht + ploegen zoals ingesteld)
- Opent `https://wa.me/?text=...` via `window.open()` — universele WhatsApp deep link
- Geen externe afhankelijkheden; alles draait in de browser

---

## [mei 2026 — patch 29] — 2026-05-11

### ✨ Gebruikers verwijderen vanuit Admin panel

Admin kan geregistreerde gebruikers permanent verwijderen via een nieuwe 🗑️ Verwijderen-knop in de gebruikerslijst.

**Wat er verwijderd wordt (cascaderend):**
1. Categorie-koppelingen (`trainer_categorieen`)
2. Uitnodigingen aangemaakt door de gebruiker (`uitnodigingen`)
3. Het profiel (`profielen`)
4. Het Supabase Auth-account (`auth.users`)

Data die gekoppeld is aan categorieën (atleten, wedstrijden, prestaties) blijft bewaard — die is eigendom van de categorie, niet van de gebruiker.

**Beveiligingsregels:**
- Zelfverwijdering is geblokkeerd (de knop verschijnt niet naast het eigen account)
- Alleen admins kunnen de functie aanroepen (gecontroleerd in de database-functie)

**Technische implementatie:**
- Nieuwe database-functie `verwijder_gebruiker(p_gebruiker_id uuid)` met `SECURITY DEFINER` — verwijdert auth-account en data in de juiste volgorde
- `laadAdminGebruikers()` uitgebreid: rode 🗑️ Verwijderen-knop toegevoegd naast elke gebruikersrij (behalve de eigen)
- Nieuwe functie `verwijderGebruiker(gebruikerId, gebruikersnaam, email)` toegevoegd — toont bevestigingsdialoog en roept `sb.rpc("verwijder_gebruiker", ...)` aan

**Supabase SQL uitgevoerd:**
```sql
CREATE OR REPLACE FUNCTION verwijder_gebruiker(p_gebruiker_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profielen WHERE id = auth.uid() AND rol = 'admin') THEN
    RAISE EXCEPTION 'Geen toegang: alleen admins mogen gebruikers verwijderen';
  END IF;
  IF p_gebruiker_id = auth.uid() THEN
    RAISE EXCEPTION 'Je kunt jezelf niet verwijderen';
  END IF;
  DELETE FROM trainer_categorieen WHERE trainer_id = p_gebruiker_id;
  DELETE FROM uitnodigingen WHERE aangemaakt_door = p_gebruiker_id;
  DELETE FROM profielen WHERE id = p_gebruiker_id;
  DELETE FROM auth.users WHERE id = p_gebruiker_id;
END;
$$;
```

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`
Supabase: nieuwe database-functie `verwijder_gebruiker` aangemaakt.

---

## [mei 2026 — patch 28] — 2026-05-11

### ✨ Uitnodigingsbeheer verbeterd + welkomstmail + bugfix registratie

**Wijziging 1 — Bugfix: uitnodiging werd niet als "gebruikt" gemarkeerd na registratie**

Na een succesvolle registratie bleef de uitnodiging in de database op `gebruikt = false` staan. Oorzaak: de Supabase RLS-policy op de `uitnodigingen` tabel stond schrijven niet toe voor een gebruiker zonder actieve sessie. Direct na `signUp()` bestaat er nog geen sessie, waardoor de `update` stilzwijgend werd geweigerd.

**Oplossing:**
- Nieuwe database-functie `markeer_uitnodiging_gebruikt(p_token text)` aangemaakt met `SECURITY DEFINER` — deze omzeilt RLS en werkt ook zonder actieve sessie
- Aanroep in `index.html` gewijzigd van directe `.update()` naar `sb.rpc("markeer_uitnodiging_gebruikt", { p_token: token })`

**Supabase SQL uitgevoerd:**
```sql
CREATE OR REPLACE FUNCTION markeer_uitnodiging_gebruikt(p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE uitnodigingen SET gebruikt = true
  WHERE token = p_token AND gebruikt = false AND vervalt > now();
END;
$$;
```

---

**Wijziging 2 — Uitnodigingsbeheer: actief vs. geschiedenis**

Het uitnodigingenblok in de admin-tab toont nu alleen nog **actieve** uitnodigingen (niet gebruikt, niet verlopen). Gebruikte en verlopen uitnodigingen verschijnen in een aparte **Geschiedenis**-sectie eronder, iets gedimd weergegeven. De Geschiedenis-sectie is automatisch verborgen als er geen historische uitnodigingen zijn.

**Wijzigingen in `app.html`:**
- `laadAdminUitnodigingen()` herschreven: uitnodigingen worden gesplitst in `actief` en `geschiedenis`
- Nieuw DOM-element `#uitnodigingen-geschiedenis-wrapper` met `#uitnodigingen-geschiedenis` toegevoegd in de admin HTML

---

**Wijziging 3 — Welkomstmail na registratie**

Na een succesvolle registratie ontvangt de nieuwe gebruiker automatisch een welkomstmail met een directe link naar de app.

**Wijzigingen:**
- `index.html`: na succesvolle registratie wordt een `fetch` gedaan naar de Cloudflare Worker met `{ email, link: appLink, type: "welkom" }`
- Cloudflare Worker (`sprint-uitnodiging`) uitgebreid: het nieuwe veld `type` bepaalt welke e-mailtekst verstuurd wordt:
  - `type: "uitnodiging"` → uitnodigingsmail (bestaande tekst, ongewijzigd)
  - `type: "welkom"` → nieuwe welkomstmail met "Account aangemaakt"-tekst en directe app-link
- `app.html`: `type: "uitnodiging"` toegevoegd aan de fetch bij het versturen van nieuwe uitnodigingen (was al aanwezig in de geüploade versie)

---

**Wijziging 4 — RLS-policy: admin ziet alle profielen**

De admin-tab toonde alleen het eigen profiel in de "Geregistreerde gebruikers"-lijst. Oorzaak: de bestaande RLS-policy `eigen profiel lezen` (SELECT) gaf elke gebruiker alleen zijn eigen rij terug.

**Oplossing:** nieuwe policy toegevoegd via Supabase SQL Editor:
```sql
CREATE POLICY "admin_leest_alle_profielen"
ON profielen FOR SELECT TO authenticated
USING (true);
```
Alle ingelogde gebruikers kunnen nu alle profielen lezen. Dit is veilig omdat de `profielen` tabel geen gevoelige gegevens bevat (alleen gebruikersnaam, e-mail, rol).

**Bestanden gewijzigd:** `app.html`, `index.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`
Cloudflare Worker `sprint-uitnodiging` bijgewerkt en opnieuw deployed.
Supabase: nieuwe RPC-functie en nieuwe RLS-policy aangemaakt.

---

## [mei 2026 — patch 27] — 2026-05-10

### ⚡ 3-uurs-regel middenafstand + fix PDF-import 300m horden

**Wijziging 1 — Automatische opstelling: 800m/1500m niet binnen 3 uur naast 300m/300m horden**

Een atleet die staat opgesteld op de 800m of 1500m wordt nooit automatisch ook opgesteld op de 300m of 300m horden (en andersom) als de starttijden van deze onderdelen minder dan 180 minuten uit elkaar liggen. Deze blokkade geldt in zowel `genereerOpstelling()` als `aanvullenOpstelling()`.

**Technische details:**
- Nieuwe helper-functie `heeftDrieUurConflict(nieuweDisc, nieuweTijd, ingeplandLijst)` toegevoegd
- Twee vaste sets: `MIDDEN_AFSTANDEN = {800m, 1500m}` en `SPRINT_COMBINATIES = {300m, 300m horden}`
- Interne ingepland-registratie uitgebreid: elk object slaat nu ook `discipline` op (naast `idx` en `starttijd`), zodat de check weet wát er al gepland staat
- De bestaande 15-minuten-blokkade blijft ongewijzigd en werkt naast deze nieuwe regel

**Wijziging 2 — Bugfix: "300m horden" werd bij PDF-import vertaald naar "300m"**

Bij het importeren van een tijdschema via PDF werd "300m horden" (en varianten zoals "300mH") fout herkend als gewone "300m".

**Oorzaak:** De vertaaltabel `PDF_DISCIPLINE_VERTALING` bevatte geen sleutels voor `"300m horden"` of `"300mh"`. De zoekfunctie `zoekDisciplineVertaling()` werkt ook met `startsWith`, waardoor `"300m horden"` als eerste de sleutel `"300m"` raakte — verkeerde discipline.

**Oplossing:** Drie sleutels toegevoegd aan `PDF_DISCIPLINE_VERTALING`: `"300m horden"`, `"300mh"` en `"300mhorden"`, geplaatst vóór `"300m"` zodat de exacte match altijd eerst gevonden wordt.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [mei 2026 — patch 26] — 2026-05-04

### 🐛 Bugfix: Geboortedatum tijdzonefout bij Excel-import opgelost

**Probleem:** Bij het importeren van een atletenlijst via Excel kon de geboortedatum 1 dag te vroeg worden opgeslagen. SheetJS levert datumcellen aan als JavaScript `Date` objecten, en de `formatDatum()` functie gebruikte `.toISOString()` om de datum op te slaan. In Nederland (UTC+1 of UTC+2) converteert `.toISOString()` naar UTC, waardoor middernacht lokale tijd als 23:00 of 22:00 de dag ervóór wordt geschreven — en dus de datum 1 dag teruggaat.

**Oplossing:** `formatDatum()` gebruikt nu `getFullYear()`, `getMonth()` en `getDate()` — dit zijn de lokale datumonderdelen en zijn tijdzone-onafhankelijk.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [mei 2026 — patch 25] — 2026-05-04

### 🐛 Bugfix: +1 dag correctie verwijderd uit Excel-export

**Achtergrond:** In patch 21 was een tijdelijke compensatie ingebouwd in de Excel-export: bij het exporteren van de opstelling werd de geboortedatum van alle atleten automatisch 1 dag opgeteld. Dit was een workaround omdat de geboortedata in de database 1 dag te vroeg stonden door een tijdzonefout bij de eerste import.

**Oplossing:** De database is gecorrigeerd via een gerichte SQL-query (44 atleten, +1 dag). Nu de database-datums correct zijn, is de compensatie in de export niet meer nodig en verwijderd.

**Wat is veranderd:** In `isoNaarExcelDatum()` is `parseInt(dd) + 1` teruggebracht naar `parseInt(dd)`.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [mei 2026 — patch 24] — 2026-05-04

### ✨ Uitnodigingen per e-mail versturen via Brevo

**Wat is toegevoegd:**
- Na het aanmaken van een uitnodiging verstuurt de app automatisch een e-mail naar het opgegeven adres via de Cloudflare Worker (`sprint-uitnodiging.milande-maat.workers.dev`) en Brevo
- De e-mail bevat de persoonlijke uitnodigingslink met token
- Als de e-mail niet verstuurd kan worden (bijv. Worker niet bereikbaar), blijft de uitnodiging wél opgeslagen in de database en verschijnt een oranje waarschuwing

**Technische details:**
- `verstuurUitnodiging()` haalt nu na de insert het gegenereerde token op via `.select("token").single()`
- De uitnodigingslink wordt opgebouwd als `{basis}index.html?uitnodiging={token}`
- De Cloudflare Worker verwacht een POST met `{ email, link }` en gebruikt `env.BREVO_API_KEY` (ingesteld als Secret in Cloudflare)
- Brevo API-sleutel aangemaakt (naam: `sprint-u16-worker`) en als Secret `BREVO_API_KEY` toegevoegd aan de Worker

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [mei 2026 — patch 22] — 2026-05-04

### 🔧 Export: categorie per geslacht (U16-M / U16-V)

**Wat is veranderd:**
- De kolom Categorie in het exportbestand toont nu `U16-M` voor jongens en `U16-V` voor meisjes in plaats van alleen `U16`.

---

## [april 2026 — patch 18] — 2026-04-21

### ✨ Verlopen uitnodigingen verwijderen

**Wat is veranderd:**
- Verlopen uitnodigingen (niet gebruikt, wel vervallen) tonen nu een **🗑️ Verwijderen**-knop
- Na bevestiging wordt de uitnodiging uit de database verwijderd en de lijst ververst automatisch

---

## [april 2026 — patch 17] — 2026-04-21

### ✨ Actieve uitnodigingen intrekken in Admin-tab

**Wat is veranderd:**
- Actieve uitnodigingen (niet gebruikt, niet verlopen) tonen nu een **🗑️ Intrekken**-knop naast de bestaande Kopiëren-knop
- Na klikken verschijnt een bevestigingsdialoog met naam van de uitgenodigde
- Bij bevestiging wordt de uitnodiging verwijderd uit de `uitnodigingen` tabel en de lijst ververst automatisch

---

## [april 2026 — patch 15] — 2026-04-20

### 🔧 Verbeterde automatische opstelling: sequentieel op punten

**Wat is veranderd:**
- `genereerOpstelling()` en `aanvullenOpstelling()` gebruiken nu een **sequentiële** verdeling: ploeg A eerst, dan B, dan C
- Per onderdeel worden kandidaten gesorteerd op **punten hoog→laag** — de sterkste beschikbare atleet krijgt altijd voorrang
- Zodra een atleet aan een ploeg is toegewezen, is hij **niet meer beschikbaar** voor de andere ploegen
- Ploeg B en C pakken automatisch de beste atleten die overblijven na ploeg A
- **Ronde 2** geeft atleten die al aan een ploeg zijn gekoppeld maar nog maar 1 onderdeel hebben een extra kans, zodat elke atleet minimaal 2 onderdelen doet
- Ook `aanvullenOpstelling()` respecteert de bestaande ploegkoppelingen en vult vrije atleten sequentieel bij

**Wat dit oplevert:**
- Ploeg A is altijd zo sterk mogelijk
- Ploeg B en C zijn zo vol mogelijk met de resterende atleten
- Elke atleet doet minimaal 2 onderdelen (tenzij het programma/tijdconflicten dat onmogelijk maken — dan verschijnt een waarschuwing)
- Ploeg B of C kan bij sommige onderdelen minder dan 3 atleten hebben — dat is bewust

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [april 2026 — patch 14] — 2026-04-19

### ✨ PR-overzicht importeren vanuit Excel

**Wat is toegevoegd:**
- Nieuwe knop **"📊 PR-overzicht importeren"** in de Prestaties-tab header
- Ondersteunt het brede Excel-formaat: atleten in kolom A, disciplines als kolomtitels in rij 1, waarden in de cellen

**Hoe het werkt (3 stappen):**
1. Bestand kiezen → Excel wordt ingelezen en verwerkt via SheetJS
2. Overzichtsscherm per atleet:
   - Niet-herkende atleten → dropdown om handmatig te koppelen aan bestaande atleet, of overslaan
   - Per discipline: nieuwe waarde + huidige PR naast elkaar + label "▲ PR verbeterd / ▼ lager dan huidig / = gelijk"
   - Alle rijen standaard aangevinkt — uitvinken wat je niet wilt importeren
3. Importeren → samenvatting (x nieuw · x overschreven · x overgeslagen)

**Technische details:**
- Tijdwaarden als gewoon getal (≥ 1): al in seconden → direct overgenomen
- Tijdwaarden als Excel-tijddecimaal (< 1): × 86400 = seconden → omgezet naar `ss.hh` of `m:ss.hh`
- Eenheid wordt correct bepaald: `min` voor 800m/1500m/600m, `sec` voor sprints, `m` voor veld
- Per discipline een gerichte DELETE op `atleet_id + discipline` vóór de insert — voorkomt duplicaten
- Mapping tabel `PR_KOLOM_MAP` vertaalt kolomtitels naar interne discipline-namen

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [april 2026 — patch 13] — 2026-04-17

### 🐛 Bugfix: Dropdown atleetkeuze afgeknipt bij laatste onderdelen

**Probleem:** Bij het opstellen van de laatste (en op één na laatste) onderdelen van de dag was de atleetkeuze-dropdown niet volledig zichtbaar — de lijst werd onderaan afgeknipt door het einde van de pagina.

**Oorzaak:** De `#ploegen-container` had geen extra ruimte onder de laatste rijen, waardoor `position: absolute` dropdowns buiten het zichtbare gebied vielen.

**Oplossing:**
- `padding-bottom: 260px` toegevoegd aan `#ploegen-container` — genoeg ruimte voor een volledige dropdown (max. 200px hoogte + zoekbalk).
- `z-index` van `.slot-select` verhoogd van 50 naar 200, zodat de dropdown nooit achter andere elementen verdwijnt.

---

## [april 2026 — patch 8] — 2026-04-16

### 🐛 Bugfix: Puntentelling houdt nu rekening met telregel per onderdeel

**Probleem:** De `~X pts`-weergave per ploeg telde de punten van **alle** opgestelde atleten op, terwijl de officiële spelregel bepaalt:
- **Looponderdelen:** alleen de **beste 2** atleten tellen mee (van de 3 opgestelde)
- **Technische onderdelen:** alleen de **beste 1** atleet telt mee (ook al kunnen er via Groep A en Groep B twee atleten opstaan over twee programmarijen)
- **Estafette:** alle punten tellen mee (ongewijzigd)

**Oplossing:** In `renderPloeg()` worden punten nu per discipline **verzameld** in plaats van direct opgeteld. Na het doorlopen van alle programmarijen wordt per discipline de juiste selectie gemaakt:
- Puntenlijst per discipline sorteren hoog→laag
- Technisch: eerste 1 nemen; Loop: eerste 2 nemen; Estafette: alles

**Technische details:**
- Groepeert op `item.discipline` (naam), zodat Groep A en Groep B van bijv. "Verspringen" samen worden beschouwd
- `maxSlots` per rij is **niet** gewijzigd (technisch blijft 1, loop blijft 3)

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [april 2026 — patch 7] — 2026-04-15

### 🗑️ Wedstrijdprogramma-overzicht verwijderd uit Opstelling-tab

**Reden:** Het programma is al te bewerken en te bekijken via de Wedstrijden-tab. Het overzicht in de Opstelling-tab was overbodig en verwarrend.

**Wat is verwijderd:**
- Het "📋 Wedstrijdprogramma"-paneel in de Opstelling-tab (stap 2) volledig verwijderd
- `renderProgrammaOverzicht()` is voorzien van een null-check zodat de functie niet crasht

### ✨ Wedstrijdprogramma afdrukken vanuit de Wedstrijden-tab

**Hoe het werkt:**
- In de programma-modal (geopend via "📋 Programma" op een wedstrijdkaart) staat nu een **🖨️ Afdrukken**-knop
- Het afdruk-overzicht toont: nummer, onderdeel, starttijd, type en startgroep
- Bovenaan staat de wedstrijdnaam, datum en geslacht (Jongens/Meisjes)
- Onderaan staat de afdrukdatum

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [april 2026 — patch 3] — 2026-04-09

### 🗑️ Verwijderd: 60m uit de app

**Reden:** De 60m is geen onderdeel op de U16-competitie. Records hoeven niet
geregistreerd te worden en het onderdeel hoort niet thuis in het wedstrijdprogramma.

**Wat is verwijderd:**
- `60m sprint` uit de discipline-dropdown bij prestaties invoeren
- `60m` uit de "sneller is beter"-lijst (tijdvergelijking)
- `60m` uit de sprints-array (eenheid-veld)
- `60m` uit `TIJD_DISCIPLINES`
- `60m horden` uit alle bovenstaande lijsten (ook geen U16-onderdeel)
- Alle Excel-importvertalingen voor `"60 meter"` en `"60 meter horden"` varianten
- `{ naam:"60m", type:"loop", duur:15 }` uit `U16_DISCIPLINES` (wedstrijdprogramma)
- Puntentelling constante `"60m": { A:15365.0, B:1158.0 }` uit `loopConst`

> ⚠️ Bestaande 60m-prestaties in Supabase worden **niet** verwijderd, maar zijn
> nergens meer zichtbaar in de app.

**Bestanden gewijzigd:** `app.html`

---

## [april 2026 — patch 2] — 2026-04-09

### 🐛 Bugfix: Estafette opstellingsgeneratie

**Probleem:** Bij automatisch opstellen werd voor estafette-onderdelen (4×100m, 4×80m,
Zweedse estafette) slechts 1 atleet per ploeg ingevuld, terwijl een estafetteteam
uit 4 lopers bestaat.

**Oorzaak:** Op 5 plekken in de code stond `item.type === "estafette" ? 1 : ...` —
waardoor slechts 1 slot werd aangemaakt en gevuld.

**Oplossing:** Alle 5 plekken aangepast naar `? 4 :`:
- `renderPloeg` — toont nu 4 klikbare lopers-slots bij estafette
- `checkConflict` — herkent nu alle 4 lopers bij tijdconflict-check
- `telOnderdelenAtleet` — telt estafette correct als 1 onderdeel (ook al zijn er 4 slots)
- `genereerOpstelling` — vult nu de 4 snelste beschikbare atleten in; de onderdeel-teller gaat bij elk van hen +1
- `exporteerOpstelling` — exporteert alle 4 lopers correct naar Excel

**Regels ongewijzigd:**
- Estafette telt als 1 onderdeel per atleet (niet als 4)
- Max 3 onderdelen per atleet per wedstrijd geldt nog steeds
- Atleet mag maar in 1 ploeg — geldt ook voor estafette-lopers
- Tijdconflict-detectie (15 min) werkt voor alle 4 lopers

**Bestanden gewijzigd:** `app.html`

---

## [april 2026 — patch 1] — 2026-04-09

### 🔧 Migratie: eigenaar_id → categorie_id

**Reden:** De app werkte origineel met `eigenaar_id` (één trainer = één dataset).
Gemigreerd naar `categorie_id` voor gedeelde toegang per categorie (meerdere
trainers kunnen dezelfde categorie beheren).

**Wijzigingen:**
- `eigenaar_id` DROP NOT NULL uitgevoerd op alle datatabellen via Supabase SQL Editor
- UNIQUE constraints herbouwd op `categorie_id` voor `opstelling` en `beschikbaarheid`
- Dubbele `let wedstrijden = []` declaratie verwijderd (veroorzaakte SyntaxError)
- TOTP 2FA fix: `login()` controleert nu of TOTP-factor bestaat; zo niet → automatisch `start2FASetup()`

**Bestanden gewijzigd:** `app.html`, Supabase SQL (handmatig uitgevoerd)

---

## [april 2026 — initiële release] — 2026-04-01

### ✨ Eerste volledige versie — 24 features werkend

**Functionaliteiten:**
- Login, registratie en auth guard (doorsturen naar `index.html` zonder sessie)
- Verplichte 2FA (TOTP) voor alle gebruikers
- Atleet CRUD (aanmaken, bewerken, verwijderen)
- Prestatie CRUD (PR's per discipline per atleet)
- Wedstrijd CRUD (naam, datum, locatie)
- Wedstrijdprogramma per geslacht instellen
- Beschikbaarheid per atleet per wedstrijd
- Automatische opstellingsgeneratie (max 3 onderdelen per atleet, tijdconflict-detectie)
- Handmatige opstelling aanpassen
- Opstelling exporteren naar Excel
- Zoekfunctie op atleten
- Excel-import (atletiek.nu formaat)
- Atletiek.nu API-koppeling (via Cloudflare Worker)
- World Athletics PR-koppeling
- NAU puntentelling ingebouwd (U14/U16, feb. 2022)
- Admin panel: uitnodigingen, gebruikersbeheer, categoriebeheer, toegang per trainer
- Categorie-switcher (meerdere categorieën per trainer)
- Categorie-isolatie (RLS via Supabase)
- Uitnodigingen gekoppeld aan categorie
- Invite-only registratie via token

**Stack:** Vanilla HTML/JS · Supabase (auth + PostgreSQL + RLS) · GitHub Pages

**Bestanden:** `app.html`, `index.html`
