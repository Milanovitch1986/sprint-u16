# Changelog — Sprint U16
*AV Sprint Breda · Atletiekbeheertool*

Alle wijzigingen worden hier bijgehouden, nieuwste bovenaan.
Formaat gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/).

---

## [april 2026 — patch 5] — 2026-04-13

### 🐛 Bugfix: Startgroepen model gecorrigeerd

**Probleem:** De startgroepen-feature (patch 4) werkte niet correct:
1. Twee atleten werden allebei in Groep A geplaatst bij hetzelfde onderdeel
2. De startgroep-dropdown in het tijdschema bleef leeg na opslaan
3. Het startgroeplabel werd ook afgedrukt bij printen (ongewenst)
4. Het Excel-exportlabel had niet het juiste formaat

**Oorzaak:** Het fundamentele model was verkeerd. Het systeem behandelde
technische onderdelen als één rij met 2 slots (A en B), maar het juiste
model is: **elke rij in het tijdschema is één specifieke startgroep op
één specifiek tijdstip**. Je voert dus twee losse rijen in:

| Onderdeel | Starttijd | Startgroep |
|-----------|-----------|------------|
| Speerwerpen | 11:00 | Groep A |
| Speerwerpen | 12:30 | Groep B |

Per rij mag maximaal 1 atleet per ploeg worden opgesteld.

**Wat is gecorrigeerd:**

- `maxSlots` voor technische onderdelen: van `2` naar `1` (op alle 6 plekken in de code)
- Startgroeplabel in de opstelling: komt nu direct uit `programma[idx].startgroep`, niet meer uit `startgroepData`
- `startgroepData` variabele, `wisselStartgroep()` functie en `kiesBestStartgroep()` functie volledig verwijderd — niet meer nodig
- Dropdown tijdschema: waarde wordt nu programmatisch ingesteld (`.value = ...`) in plaats van via `selected` attribuut in innerHTML — dit was de oorzaak van het lege veld
- Startgroeplabel heeft `print-hide` class — wordt dus niet afgedrukt; in plaats daarvan verschijnt het PR bij afdrukken
- Excel exportlabel: correct formaat `U16-M - Groep A` of `U16-V - Groep B` (met streepjes en geslachtscode), direct uit de programmarij

**Bestanden gewijzigd:** `app.html`

---

## [april 2026 — patch 4] — 2026-04-13

### ✨ Nieuw: Startgroepen voor technische onderdelen

> ⚠️ Model gecorrigeerd in patch 5 — zie patch 5 voor de definitieve werking.

Bij atletiekwedstrijden zijn technische onderdelen (springen en werpen) opgesplitst
in twee startgroepen (A en B). Per startgroep mag maximaal 1 atleet per ploeg starten.

**Wat is toegevoegd:**
- Tijdschema: bij technische onderdelen kies je ook Groep A of B per rij
- Opstelling: elke atleetslot toont `U16-M - Groep A` (of V, B)
- Excel export: kolom F = Startgroep, onderdelen schuiven naar rechts

**Bestanden gewijzigd:** `app.html`

---

## [april 2026 — patch 3] — 2026-04-09

### 🗑️ Verwijderd: 60m uit de app

**Reden:** De 60m is geen onderdeel op de U16-competitie.

**Wat is verwijderd:**
- `60m sprint` uit de discipline-dropdown bij prestaties invoeren
- `60m` uit de "sneller is beter"-lijst, sprints-array, `TIJD_DISCIPLINES`
- `60m horden` uit alle bovenstaande lijsten
- Alle Excel-importvertalingen voor `"60 meter"` en `"60 meter horden"` varianten
- `{ naam:"60m", type:"loop", duur:15 }` uit `U16_DISCIPLINES`
- Puntentelling constante `"60m"` uit `loopConst`

> ⚠️ Bestaande 60m-prestaties in Supabase worden **niet** verwijderd.

**Bestanden gewijzigd:** `app.html`

---

## [april 2026 — patch 2] — 2026-04-09

### 🐛 Bugfix: Estafette opstellingsgeneratie

**Probleem:** Estafette-onderdelen kregen slechts 1 atleet in plaats van 4.

**Oplossing:** Alle 5 plekken in de code aangepast van `? 1 :` naar `? 4 :`:
`renderPloeg`, `checkConflict`, `telOnderdelenAtleet`, `genereerOpstelling`, `exporteerOpstelling`.

**Regels ongewijzigd:** estafette telt als 1 onderdeel per atleet, max 3 onderdelen, 1 ploeg per atleet.

**Bestanden gewijzigd:** `app.html`

---

## [april 2026 — patch 1] — 2026-04-09

### 🔧 Migratie: eigenaar_id → categorie_id

**Wijzigingen:**
- `eigenaar_id` DROP NOT NULL op alle datatabellen
- UNIQUE constraints herbouwd op `categorie_id`
- Dubbele `let wedstrijden = []` declaratie verwijderd
- TOTP 2FA fix: automatisch naar `start2FASetup()` als factor ontbreekt

**Bestanden gewijzigd:** `app.html`, Supabase SQL (handmatig uitgevoerd)

---

## [april 2026 — initiële release] — 2026-04-01

### ✨ Eerste volledige versie — 24 features werkend

**Stack:** Vanilla HTML/JS · Supabase (auth + PostgreSQL + RLS) · GitHub Pages

**Bestanden:** `app.html`, `index.html`
