# Changelog — Sprint U16
*AV Sprint Breda · Atletiekbeheertool*

Alle wijzigingen worden hier bijgehouden, nieuwste bovenaan.
Formaat gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/).

---

## [april 2026 — patch 6b] — 2026-04-15

### 🔧 Verbetering: PDF-import — locatienamen en vraagscherm

**Twee verbeteringen op de PDF-import van patch 6:**

**1. Locatienamen en "X atleten" worden correct genegeerd**
Het tijdschema bevat per onderdeel soms een locatienaam (bijv. "Hoog 1", "Hoog 2") en het aantal ingeschreven atleten (bijv. "0 atleten"). Deze stonden na de discipline in de PDF-tekst en werden soms als onderdeel herkend. De parser slaat deze nu bewust over: na categorie en startgroep wordt alleen het eerste token als discipline gebruikt; alles daarna (locatie, atleten) wordt genegeerd.

**2. Vraagscherm voor niet-herkende onderdelen**
Als de parser een onderdeel niet kan herkennen, wordt niet langer stilzwijgend overgeslagen. In plaats daarvan verschijnt een vraagscherm (stap 3) met per niet-herkend item een dropdown: je kiest welk onderdeel bedoeld wordt, of kiest "Overslaan". Daarna verschijnt de normale preview om alles te controleren vóór het opslaan.

**Stroom:**
PDF kiezen → (vraagscherm bij onduidelijkheden) → preview → importeren

**Bestanden gewijzigd:** `app.html`

---

## [april 2026 — patch 6] — 2026-04-15

### ✨ Nieuw: PDF-import voor wedstrijdprogramma

Het is nu mogelijk om een tijdschema-PDF (SPAR Competitie / atletiek.nu formaat)
direct te importeren als wedstrijdprogramma, zonder handmatig invoeren.

**Hoe werkt het:**
- Op de Wedstrijden-pagina staat naast "📋 Programma" een nieuwe knop: "📄 Importeer PDF"
- Na het kiezen van een PDF wordt de tekst automatisch uitgelezen
- De app filtert alleen U16-M (jongens) en U16-V (meisjes) rijen
- Onderdelen, starttijden én startgroepen (A/B) worden automatisch herkend
- Een preview toont wat gevonden is voor beide geslachten, vóór het opslaan
- Als er al een programma bestaat: waarschuwing dat het wordt overschreven
- Bij bevestigen worden jongens én meisjes in één keer opgeslagen

**Technische details:**
- PDF.js (v3.11.174, Mozilla) gebruikt voor tekst-extractie in de browser
- Vertaaltabel `PDF_DISCIPLINE_VERTALING` vertaalt PDF-namen naar app-namen
  (bijv. "Hoog" → "Hoogspringen", "Kogel" → "Kogelstoten")
- Niet-U16 onderdelen (60m, 4x60m, 60mH, U14-onderdelen) worden automatisch overgeslagen
- Niet-herkende regels worden getoond in de preview maar niet geïmporteerd
- State: `pdfImportWedstrijdId`, `pdfImportResultaatM`, `pdfImportResultaatV`
- Nieuwe functies: `openPdfImportModal()`, `verwerkPdfBestand()`, `parseerTijdschema()`,
  `zoekDisciplineVertaling()`, `toonImportPreview()`, `maakPreviewTabel()`,
  `controleerBestaandeData()`, `slaImportOp()`, `sluitPdfImportModal()`

**Bestanden gewijzigd:** `app.html`

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
