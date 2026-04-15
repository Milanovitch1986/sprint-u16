# Changelog — Sprint U16
*AV Sprint Breda · Atletiekbeheertool*

Alle wijzigingen worden hier bijgehouden, nieuwste bovenaan.
Formaat gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/).

---

## [april 2026 — patch 6] — 2026-04-15

### 🔧 Wedstrijdprogramma verplaatst naar Wedstrijden-tab

**Reden:** Het wedstrijdprogramma (tijdschema per onderdeel) hoort logisch bij de wedstrijd zelf, niet bij de opstelling.

**Wat is gewijzigd:**
- Wedstrijdkaarten in de Wedstrijden-tab hebben nu twee knoppen: **✏️ Bewerken** (wedstrijdgegevens) en **📋 Programma** (tijdschema)
- De "✏️ Bewerken"-knop voor het programma is verwijderd uit de Opstelling-tab; het overzicht aldaar is alleen nog leesbaar
- Programma-modal toont nu geslacht-tabs (👦 Jongens / 👧 Meisjes) zodat je per geslacht het programma kunt beheren vanuit de Wedstrijden-tab

### 🗑️ Duur-kolom verwijderd uit programma-overzicht

**Reden:** De tijdsduur per onderdeel is niet relevant voor de gebruiker; de 15-minuten conflictregel werkt intern.

### ✨ Tijdconflict overschrijfbaar als uitzondering

**Reden:** In uitzonderlijke gevallen kan het nodig zijn een atleet in twee onderdelen te zetten die minder dan 15 minuten uit elkaar liggen.

**Hoe het werkt:**
- Atleten met een tijdconflict verschijnen nog steeds grijs gemarkeerd met "(⚠️ tijdconflict)"
- Klikken op zo'n atleet toont een bevestigingsdialoog: "Weet je het zeker? Dit is een uitzondering."
- Na bevestiging wordt de atleet toch ingepland (override)
- Harde blokkades (andere startgroep, andere ploeg, max 3 onderdelen) zijn **niet** overschrijfbaar

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
