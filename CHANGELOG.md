# Changelog — Sprint U16
*AV Sprint Breda · Atletiekbeheertool*

Alle wijzigingen worden hier bijgehouden, nieuwste bovenaan.
Formaat gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/).

---

## [april 2026 — patch 8] — 2026-04-16

### 🐛 Bugfix: Modal sluit bij tekst selecteren
De prestatiemodal sloot wanneer je tekst probeerde te selecteren in een invoerveld. Opgelost door een `mousedown`-check: de modal sluit nu alleen als de muisknop ook op de achtergrond was ingedrukt (niet als je tekst in een veld selecteert).

### 🐛 Bugfix: Dropdown-atleet niet actief bij "Prestatie invoeren"
De "Prestatie invoeren"-knop in de prestaties-tab opende de modal altijd op de bovenste atleet, ook als je al een atleet had geselecteerd in de dropdown. De knop leest nu de geselecteerde atleet uit de dropdown en geeft die door aan de modal.

### 🔧 Verbetering: Categorieweergave op atletenkaartjes
De categorie op kaartjes werd soms verkeerd berekend (U14, U18, e.d.). De logica is gecorrigeerd: huidig jaar − geboortejaar = leeftijdscategorie. Atleten die niet in U16 thuishoren (geboortejaar ≠ 2011/2012) krijgen een ⚠️-markering op hun kaartje.

### 🔧 Verbetering: Uniform resultatenformaat (World Athletics standaard)
Prestaties worden nu altijd opgeslagen en weergegeven in het internationaal gebruikte formaat:
- Sprintnummers: punt als decimaalteken, bijv. `10.84`
- Lange afstand: `m:ss.hh`, bijv. `2:14.69`
- Veld/werp: punt als decimaalteken, bijv. `1.50`
Invoer mag nog steeds in alle formats (komma, punt, diverse scheidingstekens) — de app normaliseert automatisch.

### 🔧 Verbetering: Eenheid achter prestatie
Achter elke prestatie staat nu de juiste eenheid: `sec` voor sprintnummers, `min` voor lange loopnummers, `m` voor werp- en springnummers.

### 🔧 Verbetering: 15-minuten restrictie vervangen door waarschuwing
De blokkering waarmee atleten niet op twee onderdelen binnen 15 minuten konden worden ingepland, is vervangen. Een atleet kan nu alsnog worden ingepland, maar krijgt een ⚠️-icoon met een tooltip die het conflict uitlegt (welk onderdeel, welke tijd, hoeveel minuten verschil).

### ✨ Nieuw: Alle PR's tegelijk invoeren per atleet
De "Prestatie invoeren"-modal toont nu alle onderdelen voor de geselecteerde atleet in één scherm, gefilterd op geslacht:
- **Jongens:** 100m, 100mh, 150m, 300m, 300mh, 800m, 1500m, hoogspringen, verspringen, speerwerpen, discuswerpen, kogelstoten
- **Meisjes:** 80m, 80mh, 150m, 300m, 300mh, 800m, 1500m, hoogspringen, verspringen, speerwerpen, discuswerpen, kogelstoten
Bestaande PR's zijn alvast ingevuld en overschrijfbaar. Lege velden worden overgeslagen.

### 🔧 Verbetering: Console-snippets voor releasenotes hersteld
Na elke ontwikkeling wordt weer een kant-en-klare snippet meegeleverd die je in de browserconsole van de live app plakt om de releasenote automatisch op te slaan in Supabase.

### ✨ Nieuw: Excel-export van alle PR's
Nieuwe knop "📥 PRs exporteren (.xlsx)" in de prestaties-tab. Exporteert een Excel-bestand met:
- Kolom 1: naam atleet
- Kolommen 2–15: één kolom per onderdeel (vaste volgorde)
- Lege cel als atleet geen PR heeft op dat onderdeel

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
