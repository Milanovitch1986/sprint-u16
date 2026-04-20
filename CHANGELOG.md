# Changelog — Sprint U16
*AV Sprint Breda · Atletiekbeheertool*

Alle wijzigingen worden hier bijgehouden, nieuwste bovenaan.
Formaat gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/).

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
