# Sprint U16 — Projectnotities
*AV Sprint Breda · Laatste update: 7 oktober 2026 (patch 71)*

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
| `resultaten` | Live wedstrijdresultaten per wedstrijd (individueel per atleet, estafette per ploeg via kolom `sleutel`; status `ok`/`dns`) — patch 47 |
| `onderdelen` | Zelf toegevoegde onderdelen (naam, type, geslacht) — categorie-breed (`atleet_id` leeg) of per atleet (`atleet_id` gevuld, patch 41) — patch 40 |
| `wedstrijden` | Wedstrijden (naam, datum, `einddatum`, locatie, notities, `is_finale`, `is_open`) |
| `programma` | Onderdelen per wedstrijd per geslacht |
| `opstelling` | Teamopstelling per wedstrijd per geslacht per ploeg (JSON). Ploeg `A`/`B`/`C` = teams; ploeg `RES` = reservebank met `{ RES_0, RES_1, RES_2 }` — patch 70 |
| `beschikbaarheid` | Beschikbaarheid per atleet per wedstrijd |
| `uitnodigingen` | Invite-only registratie (token, email, categorie_id, vervalt, gebruikt) |
| `releasenotes` | Releasenotes (versie, titel, type, beschrijving, `tags` text[] — patch 68, `gearchiveerd`, `gepubliceerd_op`) |

**Belangrijk:** alle datatabellen gebruiken `categorie_id` als toegangssleutel — NIET `eigenaar_id`.
Row Level Security zorgt dat trainers alleen data zien van hun eigen categorieën.

---

## ⚠️ Bekende technische beslissingen

### UI-herontwerp, patch D2: Wedstrijddag, alleen de buitenkant (patch 77, okt 2026)
Alleen CSS + twee kleine dingen in de vaste HTML-schil; **inline scripts byte-voor-byte identiek aan patch 76**; contract-check 0 verdwenen/0 nieuw. Gecommit direct op `main`; tag `ui-D3` staat op de commit vóór deze patch (patch 76, `49f15bc`). Live gezet op een moment dat Milanovitch bevestigde dat er geen wedstrijddag liep.
- **Regel voor dit scherm:** geen enkele `wd*`-functie en geen enkel sjabloon van resultaatregels aanpassen (live gebruik, offline-outbox). Alleen CSS gescoped op `#view-wedstrijddag` / `#wd-wedstrijd-lijst` en de vaste HTML-schil.
- **Wat is aangepast:** tabs (`.wd-tabs`/`.wd-tab`) als pillen, badges (`.wd-live-badge`, `.wd-modus-badge`, `.wd-open-badge`, `.wd-telregel`) pilvorm, `.wd-kaart`/`.wd-scorebalk`/`.wd-quickadd` 16 px, overzichtskaarten 16 px met oranje finale-rand en -pil, titelrij `wd-titelrij` (emoji niet meer los op mobiel), `+ Open wedstrijd` als `fab-mobiel`.
- **Valkuil:** `toonWdModusUI()` zet `style.display` inline op `#wd-geslacht-tabs`, `#wd-ploeg-tabs`, `#wd-scorebalk` en `#wd-quickadd`. Geef die elementen in CSS dus nooit `display` met `!important`. Een lege tab-balk is verborgen via `.wd-tabs:empty`.
- **Ongeldige CSS:** `.wedstrijd-card.is-finale { border-color: var(--accent)66 }` gaf een witte rand (ongeldige waarde → `currentcolor`); binnen `#wd-wedstrijd-lijst` hersteld. In de Opstelling-lijst staat dezelfde fout nog (patch E).
- **Bewust niet aangeraakt:** `.wd-rij`, `.wd-veld`, `.wd-ronde-*`, `.wd-poging*`, `.wd-dns-btn`, kleuren van `.wd-sync-badge.ok/.offline/.bezig`, `.wd-wacht-label`, de modals (globaal; later).
- **Test-aanpak:** zoals bij 71–76, plus een invoerflow-test: nep-backend met een schakelaar `window.__failWrites` waarmee `upsert/insert/update/delete` een fout teruggeven. De outbox queue't pas bij een *netwerkfout* (`wdIsNetwerkFout`: `navigator.onLine === false`, `TypeError`, of een melding met "fetch", "network" of "timeout"); gebruik dus een melding als `Failed to fetch`. Stap voor stap vergeleken met de oude versie: identiek. `window.dispatchEvent(new Event('online'))` + `wdInitOutbox()` laat de wachtrij verzenden.
- **Niet getest in dit kanaal:** echt opslaan naar Supabase, echte vliegtuigmodus + synchroniseren, inloggen/2FA, echte telefoon (iOS), afronden van een wedstrijd, de modals.
- **Bewust niet gebouwd:** avatars, voortgangsbalk, "Nu bezig", zwevende "Afronden"-knop uit de mockup (nieuwe data/logica).
- **Volgende:** patch E (Opstelling) — hoog risico (veel logica, afdrukken, delen); eigen bouwbrief en akkoord. Daarna patch F (Punten, Profiel, Admin; laag risico) en tot slot de globale modals.

### UI-herontwerp, patch 76: gelijke ruimte boven de titels (okt 2026)
Alleen CSS (14 regels, één blok vóór het print-blok), geen wijziging in HTML of JS; contract-check 0 verdwenen/0 nieuw. Gecommit direct op `main`; tag `ui-D2` staat op de commit vóór deze patch (patch 75, `9461434`).
- **Oorzaak (de "main-eigenaardigheid" uit het werkdocument):** `app.html` heeft één `<main>`-open en twee `</main>`-sluittags; de views Wedstrijden, Wedstrijddag, Opstelling, Punten, Profiel en Admin staan na de eerste `</main>`. Zij begonnen onder de onderruimte van `<main>` (mobiel 88 px, desktop 24 px) en hadden zelf nog een bovenrand (24 / 14 px).
- **Oplossing:** `main { padding-bottom: 0 }`; `#view-home, #view-atleten, #view-prestaties` krijgen die onderruimte zelf (24 px; mobiel `calc(60px + env(safe-area-inset-bottom, 0px) + 28px)`); de zes views buiten `main` krijgen `padding-top: 0`. Het blok staat bewust ná de bestaande `main`-/view-regels (ook die in de mobiele media-query) zodat het zonder `!important` wint.
- **Regel voor de toekomst:** voeg je een nieuw scherm toe, zet het dan in `main` (en geef het de onderruimte-regel) óf erbuiten (dan `padding-top: 0`). Verander de onderruimte van `main` niet meer, die zit nu per scherm.
- **Gemeten:** titel op 24 px (1280) / 14 px (390 en 360) voor alle negen schermen; ruimte onder de laatste inhoud boven de onderbalk op mobiel onveranderd (28 px).
- **Test-aanpak:** eerst een proef met `add_style_tag` in headless Chromium, daarna als vaste CSS gemeten op oud (patch 75) tegen nieuw; testdata met 12 atleten, 36 prestaties en 8 wedstrijden voor lange pagina's.
- **Niet getest in dit kanaal:** echte telefoon (iOS), echte printdialoog.
- **Volgende:** patch 77 (Wedstrijddag, alleen CSS en HTML-schil; geen `wd*`-functie of resultaatregel-sjabloon aanraken). Eigen bouwbrief en eigen akkoord; pas live als er geen wedstrijddag loopt. Tag `ui-D3` komt dan op patch 76.

### UI-herontwerp, patch D1: Wedstrijden (patch 75, okt 2026)
Wedstrijden in de nieuwe stijl. Alleen uiterlijk, geen databasewijziging, geen nieuwe functie; contract-check 0 verdwenen/0 nieuw. Gecommit direct op `main`; tag `ui-D1` staat op de commit vóór deze patch (patch 74, `b7b0d66`).
- **Wat is aangepast:** CSS (alles gescoped op `#wedstrijden-grid`), de knop `+ Wedstrijd toevoegen` (class `fab-mobiel` + `aria-label`) en alleen inline stijlen → klassen in `wedstrijdKaartHtml()`. `renderWedstrijden()` en alle handlers ongewijzigd.
- **Gedeelde klassen niet aangeraakt:** `.wedstrijd-card` wordt ook gebruikt in de Opstelling-lijst en de Wedstrijddag-lijsten (`openOpstelling`, `openWedstrijddag`), `.finale-badge` ook daar. Daarom alles via `#wedstrijden-grid …`; kaarten elders blijven 10 px / badge zonder achtergrond tot hun eigen patch.
- **Ongeldige CSS:** `.wedstrijd-card.is-finale { border-color: var(--accent)66 }` en de `.finale-badge`-kleuren waren ongeldig; binnen `#wedstrijden-grid` hersteld met `color-mix`. De globale regels staan er nog (voor Opstelling/Wedstrijddag, patch 76+).
- **Mobiel:** knoppen in een grid van 2 kolommen, `Wedstrijddag` over de volle breedte (`.wedstrijd-live-knop { grid-column: 1 / -1 }`); `+`-knop via de gedeelde `.fab-mobiel`-CSS.
- **Bewust niet gebouwd:** tabs Aankomend/Afgelopen (JS), badge "Over 12 d" (nieuwe berekening), knop "Opstelling" op de kaart (bestaat niet in de app).
- **Bekende eigenaardigheid (nog open):** de views na de eerste `</main>` krijgen de onderruimte van `<main>` (mobiel ±88 px, desktop 24 px) plus de bovenruimte van `<main>` (24 px) erbij, waardoor hun titel lager staat dan bij Home/Atleten/Prestaties (+48 px desktop, +100 px mobiel). Oplossing zou zijn: `main` zelf geen onderruimte geven en die aan `#view-home`, `#view-atleten` en `#view-prestaties` meegeven. Raakt 6 schermen; alleen met akkoord.
- **Test-aanpak:** zoals bij 71–74 (headless Chromium + nep-Supabase met ~60 ms vertraagde `getSession`; `wedstrijden`-tabel in de stub). Handlers toetsen door de globale functies te vervangen door spies en op elke knop te klikken; isolatie toetsen door op de Opstelling- en Wedstrijddag-tab de computed stijl van `.wedstrijd-card` te lezen.
- **Niet getest in dit kanaal:** inloggen/2FA, echte data, echte telefoon (iOS), opslaan van een wedstrijd, programma, PDF-/Excel-imports.
- **Volgende:** patch 76 (Wedstrijddag, alleen de buitenkant). Hoogste risico: geen enkele `wd*`-functie of sjabloon van resultaatregels aanpassen; alleen CSS en de vaste HTML-schil. Pas live op een moment dat er geen wedstrijddag loopt, na een eigen akkoord.

### UI-herontwerp, patch C2: Prestaties (patch 74, okt 2026)
Prestaties met tegels. Alleen uiterlijk, geen databasewijziging, geen nieuwe functie; contract-check 0 verdwenen/0 nieuw. Gecommit direct op `main`; tag `ui-C1` staat op de commit vóór deze patch (patch 73, `d06fb34`).
- **Wat is aangepast:** CSS (scoped op `#view-prestaties` en `#prestaties-content`), de ene knop `+ Prestatie invoeren` (class `fab-mobiel` + `aria-label`), de filterbalk-HTML (geslachtsfilter → pillen via de bestaande `kiesSegment()`, het `<select id="prestatie-geslacht-filter" class="segment-select">` blijft de bron) en alleen het sjabloon in `renderPrestatieTable()`.
- **Tegels:** `renderPrestatieTable()` wordt zowel in de accordeon (alle atleten) als in de atleetweergave gebruikt, dus één sjabloonwijziging dekt beide. Klassen: `pr-tegels`, `pr-tegel`, `pr-tegel-kop/-naam/-del/-waarde/-eenheid`, `pr-bewerk`. Handlers (`deletePrestatie`, `openPrestatieModal`) en PR-logica (`prMap`) ongewijzigd.
- **Ranglijst:** `renderOnderdeelRanglijst()` ongemoeid; nu alleen CSS. Rangnummer als rondje via CSS-teller (`tbody {counter-reset}`, `tr {counter-increment}`, `td:first-child {font-size:0}` + `::before {content: counter(rang)}`); de eerste cel van elke tabelrij op dit scherm is een rangcel omdat de PR-tabel niet meer bestaat. Voeg je ooit een andere tabel toe aan `#prestaties-content`, scope die dan apart.
- **Ongeldige CSS:** `.pr-badge` (alleen op dit scherm gebruikt) en de lijntjes tussen tabelrijen gebruikten `var(--kleur)22/44`. Badge globaal hersteld, tabellijntjes alleen binnen `#prestaties-content` (`tbody td` is globaal en wordt elders gebruikt). Nog 22 plekken in de CSS met hetzelfde patroon (telling: regex `var\(--[a-z0-9]+\)[0-9a-f]{2}`; inclusief de globale `tbody td`-regel die hier alleen gescoped is overschreven).
- **Kopknoppen mobiel:** `display:grid !important` omdat het kopblok een inline `display:flex` heeft; 2 kolommen, derde knop over de volle breedte; de ronde plusknop is `position:fixed` en dus geen grid-item.
- **Bewust niet gebouwd:** verbeteringstegels (`▲ −0,2`), "Seizoen", de grafiek en de datumlijst uit de mockup; de tabel `prestaties` bewaart geen datum. Een grafiek zou data uit `resultaten` (wedstrijddag) moeten halen en is dus een functie, geen opmaak.
- **Test-aanpak:** zoals bij 71–73 (headless Chromium + nep-Supabase met ~60 ms vertraagde `getSession`). Keuzelijsten in de test aanpassen via `select.value = …` + `dispatchEvent(new Event('change'))`; modals toetsen via class `open`; `deletePrestatie` met een spy vervangen i.p.v. de `bevestig()`-dialoog te doorlopen.
- **Niet getest in dit kanaal:** inloggen/2FA, echte data, echte telefoon (iOS), echt opslaan/verwijderen van een PR, PR-export en PR-overzicht importeren.
- **Volgende:** patch D (Wedstrijden, Wedstrijddag) — hoogste risico (live gebruik, offline-outbox); aparte bouwbrief met extra voorzichtigheid.

### UI-herontwerp, patch C1: Atleten (patch 73, okt 2026)
Atleten als lijst i.p.v. kaartenraster. Alleen uiterlijk, geen databasewijziging; contract-check 0 verdwenen, 1 nieuwe functie (`kiesSegment`). Gecommit direct op `main`; tag `ui-B` staat op de commit vóór deze patch (patch 72, `13969ab`).
- **Wat is aangepast:** CSS (gescoped op `#atleten-grid`, `#view-atleten`, `#doorstroom-paneel`), de zoekbalk-HTML, de ene knop `+ Atleet toevoegen` (class `fab-mobiel` + `aria-label`) en alleen het sjabloon in `renderAtleten()`.
- **Segment-pillen:** `kiesSegment(knop, selectId, waarde)` (eigen `<script>`-blok onderaan, na het Meer-menu-script) zet de waarde van het verborgen `<select id="atleten-filter-geslacht" class="segment-select">`, markeert de actieve pil en vuurt `change` af; de bestaande `onchange="renderAtleten()"` doet de rest. Het select blijft de bron van waarheid. Hergebruiken voor Prestaties (patch 74) met `#prestatie-geslacht-filter`.
- **Gedeelde klassen niet aangeraakt:** `.card` en `.grid` worden ook gebruikt door Wedstrijden/Opstelling; alleen via `#atleten-grid .atleet-rij` herstijld. De rijen houden `card`, `data-id`, `onclick` en `.card-checkbox`, want `toggleSelectie()` zoekt `.card[data-id]`.
- **Ronde plusknop (mobiel):** CSS-vorm van de bestaande knop (`font-size:0` + `::before "+"`), `position: fixed`, z-index 150 (onder modals 200+ en het Meer-menu 305+), boven de onderbalk. Alleen zichtbaar op het Atleten-scherm omdat de knop in `#view-atleten` staat.
- **Mockup vs. app:** de mockup toont onderdelen en geboortejaar per atleet (voorbeelddata); de app toont de categorie-badge (met ⚠️-waarschuwing) en het aantal prestaties. De app wint qua inhoud, de mockup qua uitstraling. Het `⋯`-menu uit de mockup bestaat niet in de app en is niet gebouwd.
- **Test-aanpak:** zoals bij patch 71/72 (headless Chromium + nep-Supabase met ~60 ms vertraagde `getSession`), nu met 12 voorbeeldatleten en een `atleten`-/`prestaties`-tabel in de stub. Modals openen via class `open` (niet via `display`): zo toetsen.
- **Niet getest in dit kanaal:** inloggen/2FA, echte data, echte telefoon (iOS), opslaan/bewerken/verwijderen van een atleet, Excel-import, het uitvoeren van een doorstroming.
- **Volgende:** patch 74 (Prestaties): PR-tabel als tegels, segment-pillen voor het geslachtsfilter, kaartstijl voor accordeon en ranglijst. De grafiek en de "▲ −0,2"-verbetering uit de mockup vragen data die niet bestaat (geen datum per prestatie) en blijven buiten de patch.

### UI-herontwerp, patch B: Home (patch 72, okt 2026)
Home volgens voorstel 2 (logo + releasenotes). Alleen uiterlijk, geen databasewijziging, geen nieuwe JavaScript; contract-check 0 verdwenen/0 nieuw. Gecommit direct op `main`; tag `ui-A` staat op de commit vóór deze patch (patch 71, `0d3576f`).
- **Wat is aangepast:** CSS van `.home-*`, `.notes-*`, `.note-*`, `.tag-filter-*`; HTML van de releasenotes-kop en de ondertitel; alleen het sjabloon in `renderReleasenotesLijst()` (inline stijlen → klassen). `data-note`, handlers, id's en de filter-/archief-/importlogica zijn ongewijzigd.
- **Inline `display:none` blijft:** de vier beheerknoppen (`btn-archief`, `btn-note-import`, `btn-note-autotag`, `btn-note-toevoegen`) zetten hun zichtbaarheid via `style.display` in `laadReleasenotes()`; die inline stijl dus nooit naar een klasse verplaatsen.
- **Gedeelde klassen:** `.note-kaart`/`.note-kaart-header` worden ook gebruikt in het importvenster (`renderReleasenoteImport()`).
- **Ongeldige CSS-valkuil:** `var(--kleur)22` is geen geldige CSS (variabele en hex-alfa kun je niet plakken). Gebruik `color-mix(in srgb, var(--kleur) 15%, transparent)`. Hersteld voor de Home-onderdelen en `.tag-checkbox-chip.aangevinkt`; ±27 andere plekken in de CSS hebben nog hetzelfde probleem en worden per tab meegenomen.
- **Type-kleuren:** feature = `--success`, bugfix = `--accent2`, update = `--info`, removed = `--muted`.
- **Categorie-wissel mobiel:** `header:has(#categorie-switcher:not(:empty))` wrapt de bovenbalk naar twee rijen (switcher `order:4`, zijwaarts scrollbaar). Zonder tweede categorie blijft de balk 56px. ≤374px (altijd) en ≤380px (bij categorie-rij) is de bovenbalk compacter (logo 17px, kleinere knoppen) omdat een wrappende flexbox niet meer krimpt.
- **Bewust niet gebouwd:** een "Alle"-chip (vraagt JS) en de dashboardkaarten uit de eerste mockup.
- **Test-aanpak:** zoals bij patch 71 (headless Chromium + nep-Supabase met ~60 ms vertraagde `getSession`); de importlijst haalt tijdens de test de echte CHANGELOG van GitHub op.
- **Niet getest in dit kanaal:** inloggen/2FA, echte data, echte telefoon (iOS), bewerken/archiveren/verwijderen van een echte releasenote.

### UI-herontwerp, patch A: navigatie en design tokens (patch 71, okt 2026)
Eerste stap van het UI-herontwerp (zie werkdocument UI/UX-herontwerp). Alleen uiterlijk, geen databasewijziging, geen bestaande functie gewijzigd. Gecommit direct op `main`; terugdraaien kan via de tag `voor-ui-herontwerp-p70` (commit `2213781` = patch 70 + keepalive-workflow van 25 sep; `app.html` is daar identiek aan patch 70, commit `aed5cef`).
- **Fasering:** A navigatie + tokens (klaar, patch 71) → B Home → C Atleten/Prestaties → D Wedstrijden/Wedstrijddag → E Opstelling → F Punten/Profiel/Admin. Eén patch = één commit, alleen UI.
- **Desktop:** de bestaande `<header>` is boven 768 px met CSS een vaste zijbalk (`--sidebar-w: 176px`); `body { padding-left }` schuift alle views op (ook die buiten `<main>`). Print zet `padding-left` op 0.
- **Mobiel:** onderbalk `#mob-nav` met 5 items (Home, Atleten, Wedstr., Dag, Meer), hoogte blijft 60px (+ safe-area) omdat de onderruimte van de views daarop rekent. `#mob-meer` (menu) en `#mob-meer-backdrop` staan bewust BUITEN `#mob-nav` omdat `backdrop-filter` daar een eigen containing block voor `position: fixed` maakt.
- **Ids/handlers:** `mob-tab-prestaties/-opstelling/-punten/-profiel/-admin` zijn verhuisd naar `#mob-meer` met dezelfde id's, zodat `showTab()` (class `active`) en de admin/profiel-zichtbaarheid in `checkAuth()`/`init()` ongewijzigd blijven werken. Nieuw: `toggleMobMeer()`, `sluitMobMeer()`.
- **Valkuil:** de nav-HTML staat NA het hoofdscript; `checkAuth()` zoekt `mob-tab-admin`/`mob-tab-profiel` pas na een `await`. Bij een onrealistisch snelle (nep-)backend wordt het element dan niet gevonden. Volgorde in het bestand dus niet veranderen.
- **Bugfix meegenomen:** de selector `.theme-btn {` ontbrak in de CSS (losse regels werden genegeerd, `.theme-btn:hover` ging mee verloren); hersteld.
- **Test-aanpak:** headless Chromium (Playwright, Python) met een nep-Supabase-stub die `window.supabase.createClient` vervangt; `getSession` moet ~60 ms vertraagd zijn. Tijdelijke lokale server via `python3 -m http.server`.
- **Niet getest in dit kanaal:** inloggen/2FA, echte data, echte telefoon (safe-area), offline-outbox, echte printdialoog.
- **Bekend vóór patch 71:** op mobiel is de admin-knoppenrij op Home te breed en past de categorie-wissel niet bij 2+ categorieën (te regelen in patch B).

### Reserves opstellen en delen (patch 70, sep 2026)
Max 3 reserves per geslacht in een aparte reservebank onder de teams in de opstellingstab.
- **Geen databasewijziging.** Reserves worden opgeslagen als een extra rij in de bestaande `opstelling`-tabel met `ploeg = "RES"` en `data = { RES_0, RES_1, RES_2 }`. Past binnen de unieke sleutel `(categorie_id, wedstrijd_id, geslacht, ploeg)`; jongens- en meisjesreserves zijn aparte RES-rijen (verschillend `geslacht`).
- State: reserves leven in `opstellingData["RES"]`. Constante `MAX_RESERVES = 3`.
- Nieuwe functies: `renderReserves()` (kaart met 3 slots, respecteert `opstellingAlleenLezen`), `openReserveKeuze()` / `kiesReserve()` / `clearReserve()` (eigen keuzelijst, géén PR/conflict-logica want reserves horen bij geen onderdeel), `reservesLijst()`, `reservesGevuld()`, `verwijderVanReservebank()`, `zitInEenTeam()`.
- **Reserve-keuzelijst** toont alleen atleten van `actiefGeslacht` die beschikbaar zijn, nog niet in team A/B/C staan (`zitInEenTeam`) en nog niet reserve zijn.
- **Inzetten (bewust simpel gehouden):** een reserve zet je in door hem in een gewoon onderdeel-vakje te kiezen. `kiesAtleet()` en `kiesAtleetMetConflict()` roepen dan `verwijderVanReservebank()` aan → de reserve verdwijnt automatisch van de bank en erft de starttijd van het onderdeel (die zit aan het `programma`, niet aan de atleet).
- **Laden:** in `laadProgrammaEnOpstelling()` wordt de `RES`-rij apart afgehandeld (`if (o.ploeg === "RES")`), buiten de programma-opschoonlus, anders zou die de reservedata wissen.
- **Opslaan:** `opslaanOpstelling()` pusht een extra `RES`-rij in de upsert.
- **Rendering:** `renderPloegen()` roept aan het eind `renderReserves()` aan; bij leeg programma wordt de reserves-container geleegd. Alle bestaande `opstellingData[ploeg]`-toegang gebruikt expliciete sleutels (A/B/C uit `["A","B","C"].slice(...)` of "RES"), dus geen enkele bestaande functie behandelt "RES" per ongeluk als team.
- **Automatisch opstellen:** `genereerOpstelling()` bewaart de reservebank bij het wissen (`opstellingData = {}`) en voegt reserve-ids toe aan `geblokkeerdeAtleten`; `aanvullenOpstelling()` blokkeert reserves ook. Reserves worden dus nooit ongevraagd in een team getrokken.
- **WhatsApp delen:** apart vinkje `#wa-res-cb` in `deelViaWhatsApp()` (alleen ingeschakeld als er reserves zijn); `deelGekozenTeamsViaWhatsApp()` voegt een los reserve-blok onderaan toe (zonder starttijd) en accepteert nu ook "alleen reserves" (validatie verruimd). De per-team knop `deelPloegViaWhatsApp()` is ongewijzigd (reserves zijn geslacht-breed, niet teamgebonden).
- **Buiten scope (bewust):** reserves staan niet in de Excel-export (`exporteerOpstelling`) of afdruk (`printOpstelling`); die gebruiken hardcoded A/B/C.
- **Niet getest in dit kanaal:** echte Supabase opslag/lees van de `RES`-rij, WhatsApp deep-link op mobiel, gedrag met echte atleetdata.

### Prestaties filteren op geslacht (patch 69, sep 2026)
Derde filter in de Prestaties-tab naast atleet en onderdeel: geslacht (Alle / Jongens / Meisjes).
- Nieuwe dropdown `#prestatie-geslacht-filter`; geen databasewijziging, filtert op het bestaande `geslacht`-veld van de atleet ("M"/"V").
- `renderPrestaties()` herzien: hulpfunctie `geslachtVanAtleet(id)`; de onderdeel-dropdown wordt eerst geslacht-bewust herbouwd (alleen onderdelen waar dat geslacht PR's op heeft, plus categorie-brede eigen onderdelen), pas dáárna wordt `disc` opnieuw uit de dropdown gelezen. Volgorde is bewust omgedraaid t.o.v. de oude functie, anders filtert de code op een onderdeel dat net uit de lijst is verdwenen.
- Staat er een onderdeel gekozen dat niet bij het nieuwe geslacht past, dan valt de keuze terug op "Alle onderdelen" (`allDiscs.includes(curDisc) ? curDisc : ""`).
- Filter werkt op alle weergaves: ranglijst per onderdeel én groepering per atleet.
- **Niet getest in dit kanaal:** gedrag tegen echte Supabase-PR-data; atleten met een leeg/afwijkend `geslacht` vallen buiten het filter.

### Opstelling delen via WhatsApp: teamkeuze met checkboxes (patch 69, sep 2026)
`deelViaWhatsApp()` deelt niet meer meteen alle teams, maar opent een keuzescherm.
- Nieuwe modal `#waTeamModal`; checkboxes (`.wa-team-cb`) worden dynamisch gevuld op basis van `actiefGeslacht` en `aantalPloegenPerGeslacht`. Gevulde teams voorgevinkt, lege teams uitgevinkt met label "(leeg)".
- Tekstopbouw verhuisd van `deelViaWhatsApp()` naar `deelGekozenTeamsViaWhatsApp()` — verwerkt alleen de aangevinkte teams; geen keuze → toast "Selecteer minstens één team".
- Hulpfuncties: `wdIsPloegGevuld(ploeg)` (checkt of er ≥1 atleet is ingedeeld), `waTeamToggleAlle()` ("Alle teams" → alles aan/uit), `waTeamSyncAlle()` (losse checkbox → "Alle teams" bijwerken).
- De losse per-team 📲-knoppen (`deelPloegViaWhatsApp`) zijn ongewijzigd gelaten.
- Geen databasewijziging.
- **Niet getest in dit kanaal:** de WhatsApp deep-link op mobiel, en de checkbox-weergave bij 1/2/3 ingestelde ploegen.

### Tags op releasenotes + filteren op thema (patch 68, sep 2026)
Vaste tag-lijst (bewust géén vrije tekst, voor betrouwbaar filteren), meerdere tags per note toegestaan, filter met OR-logica.
- Nieuwe kolom `releasenotes.tags` (`text[]`, default `'{}'`) — **migratie moet Milanovitch zelf draaien** in de Supabase SQL-editor: `ALTER TABLE public.releasenotes ADD COLUMN tags text[] DEFAULT '{}';`
- 9 vaste tags in `RELEASE_TAGS`: Wedstrijddag, Atleten, Prestaties & PR's, Wedstrijden & Programma, Opstelling, Excel & Import, Techniek & PWA, Administratie, Overig (vangnet).
- `suggereerReleaseTags()`: lokale trefwoorden-match (geen AI, geen externe call) — stelt tags voor terwijl de admin typt in het note-modal; vlag `noteTagsHandmatigGewijzigd` voorkomt dat suggesties een bewuste handmatige keuze overschrijven.
- Filterchips boven de releasenotes-lijst op het beginscherm; `laatsteReleasenotes` cachet de laatst opgehaalde data zodat filteren geen extra Supabase-call kost.
- `autoTagReleasenotes()`: eenmalige bulkactie (knop "🏷️ Automatisch taggen", alleen admin) om de 67 bestaande notes van vóór patch 68 te taggen; niets gevonden → vangnet "Overig".
- `laadOverigTagHint()` in het Admin-tabblad: signaleert (niet automatisch) zodra "Overig" de laatste 2 maanden ≥5 keer is gebruikt — mogelijk tijd voor een nieuwe vaste tag. Query gebruikt `.contains("tags", ["overig"])`.
- GitHub-import (`parseChangelogReleasenotes`) ondersteunt nu ook een optionele `tags:`-regel in de `<!--RELEASENOTE-->`-marker (komma-gescheiden tag-keys); onbekende namen worden genegeerd.
- **Niet getest in dit kanaal:** de Supabase-migratie zelf, de `.contains()`-query, en de bulk-update-flow van `autoTagReleasenotes()` tegen de echte database.

### Estafette pas zichtbaar na toevoegen, niet meer standaard (patch 67, sep 2026)
Bijstelling op patch 65: niet elke open wedstrijd heeft een estafette, dus de kaart moet niet standaard op het scherm staan. Type update, geen databasewijziging.
- `vulWdQuickAdd()`: estafettes weer terug in de `#wd-qa-disc`-dropdown (patch 65 filterde ze er juist uit), gelabeld met `(estafette)`-suffix.
- Nieuwe `wdQaDiscWissel()` (via `onchange` op de dropdown + na elke herbouw van de balk): schakelt atleet-select, zoekveld en resultaatveld uit zodra een estafette gekozen is; past placeholder aan.
- `wdQuickAdd()`: checkt eerst het gekozen onderdeel; is het een estafette, dan wordt de atleet-eis overgeslagen en direct `wdIndivEstafetteVoegPloegToe()` aangeroepen (dezelfde functie als de ＋ ploeg toevoegen-knop op de kaart).
- `renderWdIndividueel()`: estafette-kaart alleen opgebouwd als `wdIndivEstafettePloegen(naam).length > 0` — zelfde patroon als de andere onderdelen (die ook pas een kaart krijgen bij de eerste rij).
- De helpers uit patch 65 (`wdIndivEstafettePloegen/VoegPloegToe/Verwijder`) zijn ongewijzigd; alleen wanneer/hoe de kaart verschijnt is aangepast.
- **Niet getest in dit kanaal:** de echte browser-flow (dropdown → veld-toggle → eerste ploeg toevoegen). JS-syntax wel `node --check`.

### Regressiefix: View Transitions brak showTab-vervolgcode (patch 66, sep 2026)
Bug (regressie uit patch 63): op de wedstrijddag opende een wedstrijd niet meer — klik op "live resultaten invoeren" bracht je meteen terug naar het overzicht. Trof álle wedstrijden (open + competitie), niet alleen open.
- **Oorzaak:** `document.startViewTransition(callback)` roept zijn callback ASYNCHROON aan (volgende frame). Patch 63 zette de héle body van `showTab` in die callback, inclusief de `if (tab === …)`-laadaanroepen. Gevolg: in `openWedstrijddag()` draaide de synchrone `toonWdDetail()` (detail zichtbaar) vóór de async callback met `renderWedstrijddagLijst(); toonWdOverzicht();` — die het overzicht wéér zichtbaar maakte en het detail verborg. Overzicht won → wedstrijd opende niet.
- **Fix:** alleen de display/class-toggle blijft in de `wisselMetOvergang()`-callback (de cross-fade). De tab-specifieke laadaanroepen draaien nu weer SYNCHROON ná `wisselMetOvergang()`, zodat vervolgcode van de aanroeper (zoals `toonWdDetail`) op de juiste staat rekent. Cross-fade blijft werken.
- **Les:** code die na `showTab()` op de nieuwe view-staat rekent, mag niet afhankelijk zijn van bijwerkingen die in de View-Transition-callback zitten (die draait async). Houd zulke bijwerkingen synchroon.
- Node --check geldig; echte browser-flow niet testbaar in dit kanaal.

### Estafettes in de individuele modus (patch 65, sep 2026)
Open wedstrijden (individuele modus) ondersteunen nu ook estafettetijden. Type feature, geen databasewijziging. KEUZE Milanovitch: meerdere ploegen (A/B/C…) per estafette-onderdeel, niet één vaste teamtijd.
- Sleutel per ploeg = `ploeg-A/B/C…`, atleet_id = null. Dit is exact hetzelfde patroon als de competitiemodus. De DB-unieke sleutel is `categorie_id,wedstrijd_id,discipline,sleutel,ronde,poging_nr` (géén geslacht); omdat elke wedstrijd een eigen `wedstrijd_id` heeft en open wedstrijden alleen in de individuele modus draaien, botsen deze `ploeg-*`-sleutels met niets.
- `wdIndivDisciplines()`: estafette-filter verwijderd. `vulWdQuickAdd()`: estafettes juist wél uit de snelinvoer-dropdown gefilterd (die koppelt een atleet aan een onderdeel).
- `renderWdIndividueel()`: estafette-onderdelen via `wdIndivEstafetteKaartHtml(discipline)`. **Bijgewerkt in patch 67:** kaart wordt alleen nog getoond zodra er al een ploeg is toegevoegd (net als de andere onderdelen), niet meer standaard bij elk estafette-onderdeel — zie patch 67 hieronder voor de reden en de nieuwe toevoegflow via de dropdown.
- Nieuwe helpers: `wdIndivEstafettePloegen()` (verzamelt `ploeg-*`-sleutels uit `wdResultaten` + `wdPogingen`, atleetId leeg), `wdIndivEstafetteVoegPloegToe()` (eerstvolgende vrije letter A→Z, lege rij via `wdBewaarResultaat(disc,"ploeg-X",null,null,"ok")`), `wdIndivEstafetteVerwijder()` (bevestiging bij invoer → `wdVerwijderAlles`).
- Invoer/opslag/sync lopen via de bestaande offline-veilige functies (patch 62). `wdArgs` gaf `atleetId=null` al correct door als letterlijke `null`.
- **Nooit PR:** `openWdAfronden()` neemt alleen rijen mét atleet mee als PR-kandidaat (`onthou`-filter op `!r.atleetId`), dus estafette-teamtijden worden automatisch overgeslagen. Geen wijziging aan de afrond-flow nodig.
- Puntenkolom bewust leeg (`—`/lege span) voor estafette-indiv: zonder ploeg-/geslacht-context geen betekenisvolle puntenberekening; alleen de teamtijd + beste-over-rondes worden getoond.
- **Niet getest in dit kanaal:** echte browser-invoer, Supabase upsert/delete van estafette-rijen, echte offline↔online-overgang. JS-syntax wel `node --check`.

### Eén-klik back-up naar Excel (patch 64, sep 2026)
Knop 📥 Back-up naar Excel in de Admin-tab (vijfde `detail-panel` in `#view-admin`, onder "Toegang per trainer"). Exporteert de actieve categorie naar één `.xlsx` met drie tabbladen. Type feature, alleen-lezen, geen databasewijziging.
- Functie `backupNaarExcel()`, direct na `exporteerPRsExcel()`. Hergebruikt hetzelfde SheetJS-patroon: `if (!window.XLSX)` → script on-demand van CDN (cdnjs 0.18.5) laden, met try/catch en nette toast bij faalende load.
- Tabbladen: **Atleten** (naam/geslacht/geboortedatum/bondsnr uit `atleten`), **PR's** (matrix atleet × `getDisciplines()`, beste via `bestePrestatie(a.id, disc)` + `formateerResultaatWeergave`), **Wedstrijden** (naam/datum/einddatum/locatie/finale/open/notities uit `wedstrijden`).
- Bestandsnaam `sprint-<catNaam()>-backup-YYYY-MM-DD.xlsx` (niet-alfanumeriek in categorienaam → `-`). Melding via `toast`.
- Keuze: tabblad 2 bevat **alleen de PR's** (beste per onderdeel), niet de volledige prestatiehistorie — bewust gekozen door Milanovitch.
- Knoptekst bewust zónder categorienaam (statische DOM) zodat er nooit een verouderd label blijft hangen; categorie zit wel in bestandsnaam + toast.
- **Niet getest in dit kanaal:** de echte Excel-download en CDN-load van SheetJS (browser). JS-syntax wel `node --check`.
- Let op datamapping: `prestaties` krijgt bij het laden een extra veld `atleetId` (spiegel van `atleet_id`); `bestePrestatie` matcht op `p.atleetId`. `atleten` en `wedstrijden` blijven ruwe snake_case DB-velden.

### Soepele schermovergangen via View Transitions (patch 63, sep 2026)
Bij een tabwissel vervaagt het oude scherm nu zacht in het nieuwe (cross-fade, 180 ms) in plaats van een harde sprong. Puur cosmetisch, geen databasewijziging.
- Hulpfunctie `wisselMetOvergang(doeHet)` met feature-check op `document.startViewTransition`; ontbreekt de API (oudere browser), dan wordt `doeHet()` direct aangeroepen — identiek aan het oude gedrag.
- `showTab()` draait zijn hele wissel-logica binnen die wrapper. Bewust **de body** van `showTab` aangepast en niet de ~25 aanroepplekken — kleiner risico.
- De async laadfuncties in `showTab` (`renderWedstrijden`, `laadReleasenotes`, …) worden net als voorheen **niet** afgewacht; de transitie animeert dus alleen de schermwissel, data laadt daarna gewoon in. Geen "bevroren" scherm.
- CSS in het hoofd-`<style>`-blok (bij `@keyframes spin`): `::view-transition-old(root)`/`::view-transition-new(root)` op 180 ms + een `prefers-reduced-motion: reduce`-regel die de animatie uitzet.
- **Niet getest in dit kanaal:** het echte cross-fade-effect (vereist een browser). JS-syntax wel gevalideerd met `node --check`.

### Offline-first wedstrijddag via IndexedDB-outbox (patch 62, sep 2026)
Het lek: op de baan viel de verbinding weg, de Supabase-call in de opslag-functies mislukte, `if (error) throw error` stopte de functie, en de lokale staat werd niet eens bijgewerkt → de ingevoerde tijd raakte kwijt. Opgelost met een **outbox** (uitgaande wachtrij) op **IndexedDB** — geen externe bibliotheek, de app blijft één bestand.
- **Volgorde omgedraaid in álle vier de schrijffuncties naar `resultaten`:** `wdBewaarResultaat`, `wdVerwijderResultaat`, `wdVerwijderRonde`, `wdVerwijderAlles`. Nu **eerst** de lokale staat (`wdZetLokaal` of directe `delete` uit `wdResultaten`/`wdPogingen`), **dan** de Supabase-call. De laatste twee stonden niet in de oorspronkelijke bouwbrief maar hadden hetzelfde lek — daarom meegenomen (ze horen bij hetzelfde invoerscherm).
- **Outbox-laag:** DB `sprintu16-outbox`, store `wachtrij` (auto-increment `id` = invoervolgorde). Helpers `outboxOpen/Add/Alle/Verwijder/Aantal`. Item = `{ type, payload|sleutels, resKey, ts }`, met `type` ∈ `bewaar` (upsert-payload) / `verwijder` (sleutels incl. `ronde`+`poging_nr`) / `verwijderRonde` (sleutels incl. `ronde`) / `verwijderAlles` (alleen basis-sleutels). De sync-loop bouwt de `delete`-query op door alleen de aanwezige sleutels als `.eq()` toe te voegen.
- **`wdVerstuurOfWacht(doeCall, item)`:** voert de call uit; bij `error` óf exception die een netwerk-/offlinefout is → `wdWachtrijToevoegen`; bij een echte serverfout (RLS/constraint) → `toast`. Detectie via `wdIsNetwerkFout` (`!navigator.onLine`, `TypeError`, of "fetch/network/timeout" in de message).
- **`synchroniseerWachtrij()`:** speelt de wachtrij op volgorde af, **stopt** bij het eerste netwerkprobleem (rest blijft wachten), **slaat een geweigerd item over** met `console.warn` (anders blokkeert één rot item alles — bewuste keuze, past bij "laatste schrijver wint"). Vlag `wdSyncBezig` tegen dubbeldraaien.
- **Synchrone spiegels voor de UI:** `wdOutboxAantal` (teller) en `wdWachtSet` (Set van wachtende `resKey`'s), herbouwd na elke sync via `wdHerlaadOutboxStatus()`. Badge `#wd-sync-badge` (`wdRenderSyncBadge`) in de header van `#wd-detail`: groen `ok` / oranje `offline` / grijs `bezig`. Per-regel label via `wdWachtLabelHtml()` in de drie render-paden (competitie-rij, estafette-rij, `wdIndivRijHtml`).
- **Triggers:** `window`-events `online`/`offline` (één keer geregistreerd op top-level in het script), `wdInitOutbox()` bij `openWedstrijddag`, `await synchroniseerWachtrij()` aan het begin van `vernieuwWedstrijddag`, en een 30 s-herhaaltimer (`wdStartSyncTimer`/`wdStopSyncTimer`) zolang er iets wacht.
- **Afrond-waarschuwing:** `openWdAfronden()` toont bovenin de modal een oranje kader met teller als `wdOutboxAantal > 0`. Doorgaan mag; PR-opslag wordt niet geblokkeerd.
- **Bewust buiten scope:** `beeindigWedstrijddagZonderPr()` (wist álle resultaten van de wedstrijd) blijft online-only met een gewone foutmelding — offline queuen van een "wis alles" is riskant en dit is een bewuste, definitieve afsluit-actie. `verwerkWdAfronden()` schrijft naar `prestaties` (PR's), niet naar `resultaten`, en valt daarmee buiten de outbox.
- **Geen databasewijziging.** Tabel `resultaten` en kolommen ongewijzigd.

### Rondes in het hoofdscherm (patch 61, aug 2026)
De popup uit patch 60 is weg; rondes worden nu ingevoerd op de regel zelf. **Loop/estafette:** per ronde een veld met de rondenaam erboven, plus een `＋ ronde`-keuzelijst en een ✕ per ronde. **Techniek:** op de regel een alleen-lezen veld *Beste*, daaronder uitklapbare blokken per ronde met 6 pogingen + X-knop (`wdPogingenDicht` houdt bij wat is ingeklapt).
- Bouwstenen: `wdVeldenHtml()` (invoercel van een regel), `wdVeldHtml()` (één veld met titel), `wdRondeAddHtml()`, `wdRondeBlokkenHtml()`, `wdArgs()` (handler-argumenten). Handlers: `wdLosInvoer`, `wdRondeInvoer`, `wdPogingOngeldig`, `wdRondeErbij`, `wdRondeWeg`, `wdTogglePogingen`, met `wdHerteken()` als gedeelde hertekening.
- **Variant A (bewuste keuze van de gebruiker):** staat er een los resultaat en voeg je de eerste ronde toe, dan verhuist die waarde naar die ronde en blijft de losse rij leeg achter (de rij zelf blijft bestaan, anders verdwijnt de atleet uit de lijst). Een los resultaat dat door oudere data naast rondes staat, wordt nog wél getoond als veld "Resultaat".
- Vervallen: `#wdRondesModal`, `openWdRondes`, `renderWdRondes`, `wdRondeKnopHtml`, `wdNaRondes`, `wdRondeCtx`, en de oude invoerhandlers `wdInvoer`, `wdInvoerEstafette`, `wdIndivInvoer`, `wdUpdateRegel`. Er wordt na elke invoer volledig hertekend — dat houdt "beste", punten en teamscore kloppend; focusverlies valt weg omdat `onchange` toch pas bij blur vuurt.

### Rondes en pogingen op de wedstrijddag (patch 60, aug 2026)
Per atleet per onderdeel kon maar één resultaat bestaan. Nu geldt **onderdeel → ronde → poging**. Loop en estafette: rondes uit `Serie / Halve finale / Finale`, 1 tijd per ronde. Techniek: `Kwalificatie / Finale`, maximaal 6 pogingen per ronde, status `x` = ongeldige poging. Het aantal rondes is vrij: dezelfde naam nog eens toevoegen geeft "Serie 2" (sortering via `wdRondeSorteer()`).
- **Schemawijziging:** `resultaten` heeft `ronde text not null default ''` en `poging_nr int not null default 1`; status-check `('ok','dns','x')`; unique-constraint `resultaten_uniek (categorie_id, wedstrijd_id, discipline, sleutel, ronde, poging_nr)` **vervangt** de oude 4-koloms constraint. Ronde `''` + poging 1 = de snelle invoer, dus oudere rijen blijven werken.
- **Belangrijk gevolg:** een oude app-versie (bijv. uit de browsercache) doet nog een upsert op de oude 4-koloms constraint en krijgt dan `there is no unique or exclusion constraint matching the ON CONFLICT specification`. Diagnose bij die melding: eerst controleren welke app-versie de browser draait (📋-knop aanwezig?), niet de database.
- **Twee stores:** `wdResultaten` = alleen de snelle invoer, `wdPogingen` = rijen mét ronde. `wdZetLokaal()` splitst.
- **Kern:** `wdBesteResultaat()` bepaalt de beste geldige prestatie over snelle invoer + alle pogingen (X en DNS tellen niet mee); `wdEffectief()` verpakt die als een `wdResultaten`-achtige rij. **Bij volgende wijzigingen: reken met `wdEffectief()`, en gebruik `wdResultaten` alleen voor het snelle-invoerveld.**
- **Opslaan:** `wdBewaarResultaat(..., ronde = "", poging = 1)` / `wdVerwijderResultaat(..., ronde = "", poging = 1)`, plus `wdVerwijderRonde()` en `wdVerwijderAlles()`.
- **Rondescherm:** `#wdRondesModal`, geopend via de 📋-knop (`wdRondeKnopHtml()`). Een ronde toevoegen slaat een lege poging 1 op die de ronde vasthoudt.
- **Type-bepaling:** `wdOnderdeelType(discipline, hint)` — hint uit `item.type`/onderdelenlijst, anders afgeleid met `isLagerBeter()`. Bepaalt zowel het rondelijstje als het aantal pogingvelden.

### ⚠️ Les: twee sessies in hetzelfde bestand (aug 2026)
`app.html` is één bestand van ~430 kB waarin alles staat. Toen patch 59 (meerdaagse open wedstrijd) werd gecommit vanuit een kopie die de net gepushte rondes-wijziging (`7c83fdd`) niet bevatte, verdween die wijziging volledig uit main — zonder merge-conflict, want het hele bestand werd overschreven. Patch 60 heeft het teruggezet. **Werkwijze:** vóór elke wijziging `git pull` (of opnieuw klonen) en na een push niet verder werken in een oudere kopie; werk niet in twee sessies tegelijk in `app.html`.

### Meerdaagse open wedstrijd (patch 59, augustus 2026)
**Databasewijziging (eenmalig):** kolom `wedstrijden.einddatum date` (nullable) toegevoegd via `ALTER TABLE public.wedstrijden ADD COLUMN einddatum date;`. `NULL` = eendaags; RLS/rechten op `wedstrijden` ongewijzigd (bestaande categorie-policies gelden ook voor deze kolom). Een open wedstrijd kan nu meerdere dagen beslaan (bijv. NK). In `#nieuweOpenWedstrijdModal` staat onder "Datum" de checkbox `#open-wedstrijd-meerdaags`; aanvinken toont `#open-wedstrijd-einddatum-veld` via `toggleOpenWedstrijdEinddatum()`, die de einddatum standaard vult met start + 1 dag (lokale datum, geen UTC-rollback). `openNieuweOpenWedstrijd()` reset checkbox + einddatum bij elke keer openen. `maakOpenWedstrijd()` stuurt `einddatum` mee (`null` bij eendaags) en eist bij meerdaags dat eind ná start ligt. Nieuwe helper `formatDatumBereik(startISO, eindISO)` maakt de weergave: zelfde maand → "13 – 14 juni 2026", zelfde jaar andere maand → "30 juni – 2 juli 2026", ander jaar → beide datums volledig. `datumTekst()` in `renderWedstrijddagLijst()` gebruikt deze helper, dus zowel open- als competitiekaarten tonen automatisch een bereik als er een einddatum is (competitiewedstrijden hebben die niet → gedragen zich als voorheen). **De einddatum-optie zit alleen bij open wedstrijden** — de Wedstrijden-tab (competitie) is niet aangepast. De datum ín het geopende wedstrijddag-scherm zelf toont nog de startdatum (bewust buiten scope gehouden). Foutmelding-hint in `maakOpenWedstrijd()` uitgebreid: bij een ontbrekende kolom `einddatum` wordt naar de SQL verwezen.

### Wedstrijddag individuele modus: zoeken, meerdere onderdelen, afronden zonder PR (patch 58, aug 2026)
Drie verbeteringen uit de wedstrijddag-test, alle in de individuele modus (open wedstrijden). **Geen schemawijziging.**
- **Zoeken op atleet:** zoekveld `#wd-qa-zoek` boven de atleet-dropdown. Twee nieuwe helpers doen het werk: `wdAtletenGefilterd(zoek)` (alfabetisch gesorteerd + filter op naamdeel, hoofdletterongevoelig) en `vulWdAtleetSelect(selectId, zoekId, leegLabel)` (vult een dropdown, houdt de bestaande keuze vast zolang die in de gefilterde lijst staat, kiest bij precies één treffer automatisch, meldt "Geen atleet gevonden" bij nul treffers). Beide worden hergebruikt door de nieuwe modal — één plek voor de zoeklogica.
- **Atleet bij meerdere onderdelen:** modal `#wdAtleetOnderdelenModal` (`openWdAtleetOnderdelen`, `filterWdAoAtleten`, `renderWdAoOnderdelen`, `wdAoToevoegen`). Eén atleet + aanvinklijst van `wdIndivDisciplines()`. Reeds toegevoegde onderdelen staan `checked disabled` (dubbel toevoegen onmogelijk). Toevoegen loopt via de bestaande `wdBewaarResultaat(..., null, "ok")`, dus een rij in `resultaten` zonder resultaatwaarde. **De oude route (per onderdeel een atleet toevoegen) blijft bestaan** — bewust, op verzoek: beide manieren zijn bruikbaar.
- **Afronden zonder PR's:** `openWdAfronden()` toont bij nul kandidaten de knop `#wd-afrond-beeindig-btn` (via `zetWdBeeindigBtn()`) in plaats van alleen "Annuleren". `beeindigWedstrijddagZonderPr()` vraagt bevestiging, doet `delete` op `resultaten` (`categorie_id` + `wedstrijd_id`) en sluit de wedstrijddag. **Bewuste keuze:** zonder PR's hoeven de resultaten niet bewaard te blijven — ze zijn daarna niet meer terug te zien. Daarom altijd eerst de bevestigingsdialoog.

**Nog open (volgende patch):** meerdere pogingen per technisch onderdeel (max 6, `X` = ongeldig) en meerdere rondes per onderdeel (vrij aantal, naam uit vast lijstje: kwalificatie/serie/halve finale/finale), met automatisch de beste prestatie over alle rondes en pogingen als eindresultaat. Dat vraagt een uitbreiding van de tabel `resultaten` (bijv. kolommen `ronde` + `poging_nr` en een aangepaste unique-constraint).

### Release notes: nieuwste bovenaan, ook zonder patchnummer (patch 57, augustus 2026)
`laadReleasenotes()` sorteerde de notes puur op het patchnummer uit "… patch N …" en zette notes ZONDER patchnummer bewust onderaan (`if (na !== null) return -1`). Daardoor belandde de eerste infra-/onderhoudsnote (versie "Onderhoud augustus 2026", 24 aug.) onderaan i.p.v. bovenaan. Opgelost door de sortering te wijzigen naar: **primair op importdag** (`dagKey = floor(gepubliceerd_op / 86400000)`, nieuwste dag eerst) → **binnen dezelfde dag op patchnummer** (hoogste eerst) → ongenummerde notes tellen binnen hun dag als nieuwste → resterende gelijkspelen op exacte publicatietijd. Bewust op dag-granulariteit i.p.v. exacte tijd, omdat een bulk-import (alle oude patches tegelijk toegevoegd) bijna-gelijke tijdstempels geeft; op patchnummer blijven die dan correct geordend, terwijl latere losse imports (andere dag) vanzelf bovenaan komen. Alleen JS in `laadReleasenotes()` — geen HTML/CSS/database. **Let op voor de toekomst:** infra-notes krijgen geen patchnummer; ze slotten nu vanzelf op datum. Voeg je op dezelfde dag zowel een genummerde patch als een infra-note toe, dan staat de infra-note bovenaan die dag (edge case; normaal komen ze op verschillende dagen binnen).

### Brevo API-sleutel keep-alive via Cloudflare Cron (augustus 2026)
Brevo zet API-sleutels na 90 dagen zonder gebruik automatisch op inactief (met een waarschuwingsmail 7 dagen vooraf; inactief ≠ verwijderd, een inactieve sleutel is via het Brevo-dashboard weer te activeren). De sleutel `sprint-u16-worker` (Secret `BREVO_API_KEY` in de Worker `sprint-uitnodiging`) liep hiertegen aan omdat er in de zomer geen uitnodigingen waren verstuurd. Opgelost door aan de Worker een `scheduled`-handler toe te voegen die via een Cron Trigger `0 6 1,15 * *` (1e + 15e van de maand, 06:00 UTC) 2× per maand `GET https://api.brevo.com/v3/account` aanroept met de bestaande sleutel. Dat registreert als "gebruik" → de 90-dagen-teller reset; er wordt **géén** mail verstuurd. Bewust gekozen voor een Cloudflare Cron (i.p.v. GitHub Actions zoals de Supabase keep-alive) omdat de sleutel dan binnen Cloudflare blijft en nergens gedupliceerd hoeft te worden. **Kanttekening:** of een puur-lezende aanroep bij Brevo als "gebruik" telt is niet 100% gedocumenteerd — te verifiëren via de kolom "Last used on" onder *Settings → SMTP & API → API keys & MCP* na de eerste geplande run. Zo niet, plan B: 1× per maand een klein self-mailtje sturen (telt gegarandeerd als gebruik). Een handmatige test-uitnodiging op 24 aug. 2026 kwam aan, dus de Worker komt langs de instelling "block unauthorized IPs voor API-sleutels" heen.

### Marges buiten-main views (patch 54, juli 2026)
De views `#view-wedstrijden`, `#view-wedstrijddag` en `#view-opstelling` staan door de HTML-structuur BUITEN `<main>` (er is 1× `<main>` maar 2× `</main>`; de eerste sluit al na view-prestaties). Daardoor kregen ze niet de marge/max-breedte van `main` en plakte de inhoud op mobiel tegen de schermranden. Opgelost met een CSS-regel die diezelfde drie id's dezelfde `padding`/`max-width`/`margin:0 auto` geeft als `main` (24px desktop, 14px mobiel incl. onderruimte voor de floating nav). De losse `padding-bottom` op `.wd-afrond-actie` (mobiel) is verwijderd omdat de view die onderruimte nu al levert. Alleen CSS, geen functionele wijziging. (Structureel netter zou zijn de views ín `<main>` te zetten, maar dat is bewust niet gedaan om risico te vermijden.)

**Aanvulling patch 55 (6 juli 2026):** dezelfde fix bleek nog nodig voor `#view-punten`, `#view-profiel` en `#view-admin` — óók buiten-main views die bij patch 54 waren gemist en op mobiel tegen de schermranden plakten. Deze drie id's zijn toegevoegd aan dezelfde twee CSS-regels (desktop + mobiele media query). Daarmee hebben nu álle zes buiten-main views (wedstrijden/wedstrijddag/opstelling/punten/profiel/admin) dezelfde marges als `main`. Alleen CSS, geen functionele wijziging.

### Wedstrijddag-lijst: sectiekoppen boven de kaarten (patch 56, augustus 2026)
De overzichtslijst in de Wedstrijddag-tab (`#wd-wedstrijd-lijst`, gevuld door `renderWedstrijddagLijst()`) had zelf `class="grid"`, waardoor de sectiekoppen (`.wd-lijst-sectie`) als losse rasterkolom náást de kaarten belandden i.p.v. erboven. De `grid`-class is van de container verwijderd; per sectie zitten de kaarten nu in een eigen `<div class="grid">` onder de kop. Volgorde omgedraaid: **Competitiewedstrijden eerst, Open wedstrijden eronder** (voorheen Open eerst). De kop "Competitiewedstrijden" wordt nu altijd getoond (ook als leeg, met uitlegtekst eronder). Alleen HTML/JS-opmaak — geen CSS-, functionele of databasewijziging.

### Open wedstrijden + opgeschoonde Wedstrijddag-lijst (patch 53, juli 2026)
**Databasewijziging (eenmalig):** kolom `wedstrijden.is_open boolean NOT NULL DEFAULT false` toegevoegd via SQL — `ALTER TABLE public.wedstrijden ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT false;`. RLS/rechten op `wedstrijden` ongewijzigd (bestaande categorie-policies gelden ook voor open wedstrijden). Open wedstrijden = losse, niet-competitiewedstrijden (`is_open=true`), aangemaakt vanuit de Wedstrijddag-tab (knop ➕ Open wedstrijd → `openNieuweOpenWedstrijd`/`maakOpenWedstrijd`, insert met `is_open:true` + meteen `openWedstrijddag()`). Ze blijven in de globale `wedstrijden`-array (zodat `.find()`-lookups werken), maar `renderWedstrijden()` en `renderOpstellingWedstrijden()` filteren `!w.is_open`, dus ze verschijnen NIET in de Wedstrijden-/Opstelling-tab. `verwijderOpenWedstrijd(id)` wist eerst de `resultaten` van die wedstrijd, dan de `wedstrijden`-rij (voorkomt verweesde rijen). Modal `#nieuweOpenWedstrijdModal`. Datum via `getFullYear/getMonth/getDate` (lokale tijd, geen UTC-rollback). Open wedstrijd heeft geen opstelling → automatisch individuele modus (patch 51-logica).

`renderWedstrijddagLijst()` splitst nu in twee secties: "Open wedstrijden" (met groen OPEN-label + verwijderknop) en "Competitiewedstrijden" (`!is_open && !isWedstrijdAfgelopen`, eerstvolgende bovenaan). **Afgelopen competitiewedstrijden worden bewust NIET meer in de Wedstrijddag-lijst getoond** (blijven wel in de Wedstrijden-tab). 

**Release notes sorteerfix:** `laadReleasenotes()` sorteert client-side op het nummer uit "… patch N …" (regex `/patch\s*(\d+)/i`, aflopend), met `gepubliceerd_op` als terugval. Reden: bij importeren via de 'Uit GitHub'-knop kregen notes bijna gelijke tijdstempels, waardoor een later toegevoegde lagere patch bovenaan kwam.

### Releasenotes importeren uit GitHub (patch 52, juli 2026)
Release notes hoeven niet meer met de hand ingevoerd te worden (kopiëren/plakken van 4 velden was lastig op mobiel). In de Releasenotes-sectie staat naast **+ Toevoegen** de admin-only knop **📥 Uit GitHub** (`#btn-note-import`, zichtbaar gemaakt in `laadReleasenotes()`). `openReleasenoteImport()` fetcht de rauwe `CHANGELOG.md` van `raw.githubusercontent.com/Milanovitch1986/sprint-u16/main/CHANGELOG.md` (met cache-buster `?t=`), `parseChangelogReleasenotes()` haalt met regex alle `<!--RELEASENOTE …-->`-blokken eruit (per regel `sleutel: waarde`: versie/titel/type/beschrijving; type genormaliseerd naar feature/bugfix/update/removed). De versies worden vergeleken met bestaande `releasenotes.versie` (query zonder gearchiveerd-filter, trim+lowercase) en **alleen de nieuwe** worden getoond in modal `#releasenoteImportModal`, elk met een ➕-knop (`voegImportNoteToe`) plus een knop "voeg alle nieuwe toe" (`voegAlleImportNotesToe`). Insert via de bestaande `releasenotes`-tabel (`gepubliceerd_op` defaultt in de DB). **Vanaf patch 52 bevat elke changelog-entry een onzichtbaar `<!--RELEASENOTE …-->`-blokje** (ook toegevoegd voor patch 51) — Claude vult dit standaard in bij elke nieuwe patch. HTML-comments renderen niet in de changelog-weergave, dus ze zijn onzichtbaar voor lezers. **Werkt vanaf de browser** omdat de repo publiek is en raw.githubusercontent.com CORS toestaat. Geen schemawijziging. LET OP: het `type`-veld gebruikt interne codes (feature/bugfix/update/removed), niet het emoji-label — zet in het blokje dus de code.

### Wedstrijddag als aparte tab + individuele modus (patch 51, juli 2026)
De wedstrijddag-modus is nu een eigen tab (`showTab("wedstrijddag")`, desktop-knop `#tab-wedstrijddag` + mobiel `#mob-tab-wedstrijddag` met ⏱️-icoon). De view `#view-wedstrijddag` is opgesplitst in `#wd-overzicht` (lijst van wedstrijden, `renderWedstrijddagLijst()`, aankomende bovenaan) en `#wd-detail` (het invoerscherm). `showTab("wedstrijddag")` toont de lijst; `openWedstrijddag(id)` (ook nog via het 🏟️-knopje op de wedstrijdkaart) schakelt door naar het detail via `toonWdDetail()`. `sluitWedstrijddag()` gaat terug naar de lijst (niet meer naar de Wedstrijden-tab).

**Twee modi via `wdModus`** (`"competitie"` / `"individueel"`), bepaald in `laadWedstrijddag()`: er wordt eerst gekeken of er een gevulde `opstelling` bestaat voor de wedstrijd (query over álle geslachten, `some(o => o.data && Object.keys(o.data).length)`). Wél opstelling → competitiemodus (ongewijzigd: programma + opstelling + teamscore). Géén opstelling → individuele modus. `toonWdModusUI()` verbergt in individuele modus de geslacht-/ploeg-tabs en `#wd-scorebalk` en toont `#wd-quickadd`; het `#wd-modus-badge` toont "👤 Individuele modus".

**Individuele modus** hergebruikt de tabel `resultaten` (sleutel = atleet-id, `atleet_id` gevuld) en dezelfde afrond-modal (`openWdAfronden`/`verwerkWdAfronden` verwerkt álle individuele resultaten en slaat PR's op). `wdIndivDisciplines()` = alle categorie-onderdelen behalve estafettes + categorie-brede eigen onderdelen (`customOnderdelen` met `atleet_id` leeg). `renderWdIndividueel()` toont alleen onderdelen waar iemand aan meedoet; toevoegen gaat via de snelinvoer-balk (`wdQuickAdd` → `wdIndivVoegToe`) of per sectie (`wdIndivAddPrompt` zet het onderdeel klaar in de balk). Punten worden berekend met het **geslacht van de atleet zelf** (niet dat van het onderdeel), zodat gemengd invoeren klopt. Leegmaken van een invoerveld (`wdIndivInvoer`) wist alleen het resultaat (rij blijft, `resultaat=null`), verwijderen doet `wdIndivVerwijder` (bevestiging als er al een resultaat staat). **Estafettes zitten niet in de individuele modus** (een estafette is een teamtijd, geen individueel PR) — later eventueel toe te voegen. Geen schemawijziging.

### Doorstroming voor alle trainers + release notes bewerken (patch 50, juli 2026)
Het doorstroom-scherm is verplaatst van `view-admin` naar `view-atleten` (`#doorstroom-paneel`, alleen zichtbaar bij kandidaten) en is nu voor álle trainers beschikbaar; de banner is niet langer admin-only. `laadDoorstroming()` draait bij opstarten (iedereen) en bij openen van de Atleten-tab. Om "doel bestaat niet" van "doel bestaat maar geen toegang" te onderscheiden laadt `bepaalDoorstroomKandidaten()` nu ook `alleCategorieNamen` (id+naam van álle categorieën; de categorieen-tabel is leesbaar voor iedere ingelogde gebruiker) en zet per kandidaat `doelBestaatGeenToegang`. Een trainer kan door de RLS alleen verplaatsen naar categorieën waartoe hij toegang heeft; kandidaten met een ontoegankelijke doelcategorie zijn niet-selecteerbaar en `startDoorstroming()` toont daarvoor een eenmalige melding ("neem contact op met de beheerder") via de nieuwe `bevestig(titel, bericht, { alleenOk:true })`-modus (verbergt de annuleerknop, label wordt "OK", herstelt zichzelf na sluiten). Release notes: `noteModal` heeft nu een verborgen `note-id`; `slaaNoteOp()` doet update-bij-id anders insert; verwijderen/bewerken via `data-note`-attribuut op de knop (veilig voor titels met aanhalingstekens). Geen schemawijziging.

### Doorstroming naar volgende categorie (patch 49, juli 2026)
Admin-scherm + banner die atleten signaleert wier geboortejaar niet meer bij hun categorie past. Leeftijdslogica staat nu in twee herbruikbare helpers: `berekenLeeftijdsCategorie(geboortedatum)` (kalenderjaar-systeem: de leeftijd die je dit jaar WORDT; U14=12/13, U16=14/15, U18=16/17, U20=18/19, Sen=20+) en `categorieNaamDekt(catNaam, catBerekend)` die samengestelde namen herkent ("U18/U20" dekt U18 én U20; "Senioren" dekt "Sen") via tokenisatie. `bepaalCategorieBadge()` hergebruikt deze helpers. **Doorstromen verhuist alleen de atleet + zijn PR's** (`prestaties.categorie_id` en `atleten.categorie_id` → doelcategorie); wedstrijdresultaten (patch 47, `resultaten`), opstellingen en beschikbaarheid blijven bewust bij de oude wedstrijden staan omdat die wedstrijd-gebonden zijn en in de oude categorie blijven. `bepaalDoorstroomKandidaten()` laadt atleten van álle toegankelijke categorieën (`in("categorie_id", beschikbareCategorieen)`). Bestaat de doelcategorie niet (bv. nog geen "U18/U20" aangemaakt), dan is de rij zichtbaar maar niet-selecteerbaar met een hint. Volledig automatisch op 1 januari kan niet (geen server; app draait in de browser) — daarom melding + handmatige bevestiging. Geen schemawijziging.

### Mobiele floating nav: ondoorzichtig + onderruimte (patch 48, juli 2026)
De floating bottom nav (`#mob-nav`, alleen op mobiel, `position: fixed; bottom: 0`) had twee problemen: (1) een `background: transparent` waardoor content er tijdens scrollen doorheen scheen én de balk "leek te zweven", en (2) te weinig onderruimte in de content, waardoor de knop `✅ Wedstrijd afronden` uit patch 47 achter de balk viel en niet aantikbaar was. Opgelost met puur CSS: ondoorzichtige `var(--surface)`-achtergrond met een `@supports (backdrop-filter)`-regel voor het glas-effect (semi-transparant via `color-mix`); `main` `padding-bottom` verhoogd naar balkhoogte + safe-area + 28px; en een aparte container `.wd-afrond-actie` met eigen mobiele `padding-bottom` als vangnet. `position: fixed; bottom: 0` bewust behouden (correcte moderne aanpak; geen dvh-/JS-truc). Horizontaal scrollen door de 8 knoppen blijft bewust behouden. **Let op (bestaande HTML-eigenaardigheid):** het document heeft 1× `<main>` maar 2× `</main>`; de views wedstrijden/wedstrijddag/opstelling/punten/admin staan daardoor feitelijk buiten `<main>`. Browsers herstellen dit, maar reken er niet op dat `main`-padding die schermen raakt — vandaar het vangnet op `.wd-afrond-actie` zelf. Niet aangeraakt in patch 48 (buiten scope, risicovol om te herstructureren).

### Wedstrijddag-modus: live resultaten (patch 47, juli 2026)
Nieuwe tabel `resultaten` met sleutelkolom `sleutel` (individueel = atleet-id als tekst, estafette = `ploeg-A/B/C`) en UNIQUE op `(categorie_id, wedstrijd_id, discipline, sleutel)`. Elke invoer wordt per veld direct ge-upsert (`onConflict` op die vier kolommen) — daardoor kunnen meerdere trainers tegelijk invoeren (laatste schrijver wint per veld); `🔄 Vernieuwen` (`vernieuwWedstrijddag()`) haalt alleen de resultaten opnieuw op. `atleet_id` is nullable (leeg bij estafette-teamtijden) met `ON DELETE CASCADE`. Status `dns` = niet gestart (invoerveld geblokkeerd, telt als afgehandeld, geen PR-kandidaat). **Estafettetijden zijn teamresultaten en worden bij het afronden bewust nooit als PR overgenomen.** De afrond-flow (`openWdAfronden()`/`verwerkWdAfronden()`) kijkt over *alle* geladen resultaten van de wedstrijd (beide geslachten) en volgt de PR-import-aanpak: gerichte DELETE per atleet+discipline vóór de insert; PR-datum = wedstrijddatum. `wdUpdateRegel()` werkt na invoer alleen de punten/badge/rand van die ene rij bij (geen volledige re-render), zodat de tab-volgorde intact blijft. `verwijderCategorie()` bevat `resultaten` in tel- én verwijderlijst; `wisselCategorie()` verlaat een geopende wedstrijddag. **RLS:** zelfde `trainer_categorie_…`-patroon als `prestaties`. **Let op:** de tabel moet eenmalig handmatig worden aangemaakt (SQL in changelog/chat); zonder tabel toont het scherm een duidelijke foutmelding.

### Categorie verwijderen = app-side cascade (patch 46, juni 2026)
Een categorie heeft foreign-key-relaties vanuit tien tabellen (`atleten`, `wedstrijden`, `prestaties`, `resultaten` (sinds patch 47), `opstelling`, `programma`, `beschikbaarheid`, `onderdelen`, `uitnodigingen`, `trainer_categorieen`). De databank weigert daarom een `DELETE` op `categorieen` zolang er nog gekoppelde rijen zijn (`wedstrijden_categorie_id_fkey` e.d.). Bewust gekozen voor opruimen in de **app** i.p.v. `ON DELETE CASCADE` in de databank: geen SQL-migratie nodig en de gebruiker ziet expliciet wat er weggaat. `verwijderCategorie()` telt eerst per tabel (`count: "exact", head: true`), toont de aantallen in de bevestiging en verwijdert daarna in FK-veilige volgorde: eerst `opstelling`/`programma`/`beschikbaarheid`/`prestaties`, dan `wedstrijden`/`atleten`/`onderdelen`/`uitnodigingen`/`trainer_categorieen`, als laatste de categorie. **Let op voor de toekomst:** voeg je ooit een nieuwe tabel met `categorie_id` toe, neem die dan op in zowel de tel- als de verwijderlijst van `verwijderCategorie()`, anders blokkeert de FK het verwijderen weer.

### Categoriewissel verlaat geopende opstelling (patch 46, juni 2026)
De Opstelling-tab heeft twee stappen: stap 1 = wedstrijdkeuze, stap 2 = het opstellingsscherm van een gekozen wedstrijd (onthouden in `actiefWedstrijdId`). `wisselCategorie()` herlaadt wel de data maar reset stap 2 niet, waardoor je in een wedstrijd van de vorige categorie bleef hangen. Opgelost: bij wisselen wordt `actiefWedstrijdId`/`opstellingAlleenLezen` gewist en stap 1 weer getoond, vóór `syncAll()`.

### Categorie-afhankelijke onderdelen + branding; U14 actief (patch 45, juni 2026)
De onderdelenlijst, de branding en (deels) de puntenberekening zijn nu categorie-afhankelijk in plaats van vast op U16.
- **Centrale config:** `CATEGORIE_CONFIG` bevat per categorie een onderdelenlijst (`DISC_U16`, `DISC_U14`). `U16_DISCIPLINES` bestaat niet meer als losse lijst; overal in de code wordt nu `getDisciplines()` gebruikt, die de lijst van `actieveCategorie.naam` teruggeeft en bij een onbekende categorie terugvalt op `DISC_U16`. Helper `catNaam()` geeft de categorienaam voor labels (fallback "U16").
- **U14-onderdelen:** jongens 80m/80mH/4x80m, meisjes 60m/60mH/4x60m; beide 600m, 1000m, hoog, ver, kogel, discus, speer. (Géén 150m/300m/800m/1500m — die staan niet op het U14-programma.) Het verschil M/V is niet hard gesplitst in de code; net als bij U16 is het één gecombineerde lijst waaruit de trainer per atleet kiest.
- **Punten gedeeld U14/U16:** het NAU-document hanteert één gezamenlijke "U14 én U16"-telling, dus `berekenPunten` gebruikt dezelfde constanten voor beide. Toegevoegd in patch 45: `4x60m` (A=59225, B=1130) en `60m horden` (A=14050, B=795,5 — 76,2 cm / 6 horden). **Let op voor de toekomst:** U18/U20 heeft een *eigen* NAU-tabel; bij het activeren daarvan moeten de constanten zélf categorie-afhankelijk worden gemaakt (nu zijn ze nog gedeeld).
- **Branding dynamisch:** `renderCategorieSwitcher()` werkt logo, ondertitel (`#home-subtitle-cat`), `document.title` en de PDF-labels (`#pdf-cat-m`/`#pdf-cat-v`) bij; teamnamen en de "Gedeeld via Sprint …"-teksten gebruiken `catNaam()`.
- **Import categorie-bewust:** de PDF-schema-import zocht hard naar `U16-M`/`U16-V`; dat is nu een regex op `catNaam()`. In `PDF_DISCIPLINE_VERTALING`, `FINALE_DISC_MAP` en `DISC_MAP` (PR-import) zijn de U14-onderdelen (60m, 60m horden 76,2 cm, 4x60m) van `null` naar echte waarden gezet; `1000m` toegevoegd aan de PDF-map. De 83,8 cm-hordevariant blijft op `null` (U14-meisjes lopen 76,2 cm).
- **Hoogspringen-correctie:** de drempelformule onder 1,35 m gebruikte `+0,5`; dat is `+0,7` volgens het NAU-document. Opgelost via een per-onderdeel `drempelPlus` in `veldConst` (verspringen 0,5, hoogspringen 0,7).
- **Activeren:** een categorie verschijnt pas in de switcher als hij in de Admin-tab is aangemaakt met **exact** de juiste naam (bijv. `U14`) én de trainer er toegang toe heeft. Zonder eigen config in `CATEGORIE_CONFIG` valt een categorie terug op de U16-onderdelenlijst. Geen schemawijziging nodig.

### Service worker: netwerk-eerst voor de app (patch 44, juni 2026)
`pwa_sw.js` was cache-first en bewaarde `app.html` permanent in cache `sprint-u16-v1` (naam veranderde nooit) → nieuwe patches kwamen niet door in de browser. Opgelost: **netwerk-eerst** voor HTML/navigatie (`app.html`/`index.html`/`/`), cache alleen als offline-terugval; statische assets blijven cache-eerst. Cachenaam verhoogd naar `sprint-u16-v2` zodat de oude cache bij `activate` wordt opgeruimd. **Eenmalig bij uitrol:** de oude service worker moet nog vervangen worden — de browser pikt de nieuwe `pwa_sw.js` op bij een volgende navigatie (kan 1–2 keer verversen vergen), of forceer via incognito / "sitegegevens wissen" / PWA opnieuw openen. Daarna ziet elke gebruiker na een patch automatisch de nieuwste versie zodra online. **Les:** bij in-browser testen van een net-gepushte patch kan een cache-first SW een oude versie tonen — verifieer desnoods in een incognitovenster.


### Finale-tijdschema import uit Excel (patch 42, juni 2026)
Naast de PDF-import kan een vast finale-tijdschema (`.xls`/`.xlsx`) worden geïmporteerd via de knop **📊 Importeer finale (Excel)** op de aankomende-wedstrijdkaart (`openFinaleImportModal()`). Formaat van het bestand: twee blokken naast elkaar — links jongens (kolommen Meld/Tijd/Onderdeel/Series), rechts meisjes (idem). Kernpunten:
- **Categorie-filter op naam:** `ontleedFinaleCel()` zoekt `U\d{2}` in de celtekst en vergelijkt met `actieveCategorie.naam`. Andere categorieën (bijv. U14 wanneer U16 actief is) worden overgeslagen — toekomstbestendig voor U14/U18.
- **"Tijd" = starttijd** (niet "Meld"); uitgelezen via de geformatteerde celtekst `.w` in `leesFinaleTijd()`, met fallback op de dag-fractie.
- **Kolom-/blokdetectie** in `parseerFinaleSchema()`: kop-rij = eerste rij met cel "Onderdeel"; per onderdeel-kolom wordt de "Tijd"-kolom links ervan gezocht; jongens/meisjes-blok wordt bepaald via de labels "Jongens"/"Meisjes" in het blad (fallback: links = M, rechts = V).
- **Opschoning:** "groep A/B" → startgroep; losstaande cijfers (baan-/matnummer, bijv. "Hoogspringen 1") worden verwijderd; "X atleten" eruit; niet-wedstrijdregels (vergaderingen, vlaggenparade, overlopen estafettes, prijsuitreiking) hebben geen `U\d\d` en vallen vanzelf weg. Namen via `FINALE_DISC_MAP` (`100mH`→100m horden, `4x80`→4x80m, enz.); niet-herkende namen gaan naar een vraagscherm.
- **Geslachtskeuze:** de gebruiker kiest jongens / meisjes / beide (`finaleKeuze`). `slaFinaleImportOp()` doet delete+insert op `programma` **alléén voor het/de gekozen geslacht(en)** — het andere geslacht blijft ongemoeid. Zo kunnen jongens en meisjes uit verschillende finale-bestanden geïmporteerd worden zonder elkaar te overschrijven.
- Geen schemawijziging — gebruikt de bestaande tabel `programma`.
- *Patch 45:* `FINALE_DISC_MAP` herkent nu ook 60m, 60m horden en 4x60m (waren `null`), zodat een U14-finale volledig binnenkomt.


### Eigen onderdelen per atleet (patch 41, juni 2026)
De tabel `onderdelen` heeft een nullable kolom `atleet_id` (`REFERENCES atleten(id) ON DELETE CASCADE`). Leeg = categorie-breed onderdeel (gedrag van patch 40, gefilterd op `geslacht`); gevuld = onderdeel dat alléén voor die ene atleet geldt. `getPRDisciplinesVoorAtleet()` neemt beide soorten mee: categorie-breed (`atleet_id == null` én geslacht "B"/match) + atleet-eigen (`atleet_id` == deze atleet). Toevoegen/verwijderen gebeurt in het PR-invoerscherm zelf: `bulkExtraOnderdeelHtml()` rendert de toevoeg-sectie, `voegAtleetOnderdeelToe()` doet de insert (met `atleet_id`, geslacht = dat van de atleet) en checkt of het onderdeel al in de lijst van die atleet staat, `verwijderAtleetOnderdeel(idx)` verwijdert de definitie én eventuele PR's van die atleet voor dat onderdeel. Helper `isAtleetEigenOnderdeel(disc, atleetId)` markeert eigen regels (label *eigen* + ✕). Het categorie-brede beheerscherm (`renderOnderdeelLijst()`) en het algemene onderdeel-filter in `renderPrestaties()` filteren op `atleet_id == null`; atleet-eigen onderdelen komen pas in het algemene filter zodra er een PR voor bestaat (via de data). **Lost knelpunt op:** een meisje kon geen 100m krijgen (100m staat in de jongenslijst, niet de meisjeslijst, en "Nieuw onderdeel" gaf "bestaat al" door de gecombineerde standaardcheck). Via dit scherm kan elke atleet nu een onderdeel buiten haar/zijn standaardlijst krijgen.

### Tijden vanaf 60 sec als m:ss.hh (patch 41, juni 2026)
Tijd-in-seconden onderdelen (sprint + eigen onderdelen type `tijd_sec`) worden vanaf 60 sec getoond als `m:ss.hh`, net als de lange loopnummers. Nieuwe helpers: `isTijdSecondenOnderdeel(disc)` (= `isLagerBeter(disc) && !isMinutenFormaat(disc)`, dus geen veld/afstand en geen minuten-onderdeel) en `secondenNaarMinFormaat(secStr)` (string-gebaseerde omzetting, decimalen blijven exact behouden, geen float-afrondingsfout). `normaliserenResultaat()` accepteert nu ook m:ss-invoer voor seconden-onderdelen en slaat platte seconden ≥ 60 op als `m:ss.hh`; `formateerResultaatWeergave()` doet bij weergave dezelfde omzetting (dekt ook oudere, plat opgeslagen tijden). De ruwe PR-weergave in de opstelling, slotkeuze, print/WhatsApp en de opstellingstabel loopt nu ook via `formateerResultaatWeergave()`. **Belangrijk:** sortering en punten blijven ongewijzigd omdat `parseResultaat()` zowel `m:ss.hh` als platte seconden naar hetzelfde aantal seconden omzet. Afstand-/hoogteonderdelen worden nooit omgezet (een worp van 65 m blijft 65, geen 1:05).

### Eigen onderdelen + onderdeel-ranglijst (patch 40, juni 2026)
De Prestaties-tab kent zelf toegevoegde onderdelen, bewaard in de tabel `onderdelen` (`categorie_id`, `naam`, `type` ∈ `tijd_sec`/`tijd_min`/`afstand`, `geslacht` ∈ `M`/`V`/`B`). Geladen in `syncAll()` (faalt zacht) in `customOnderdelen`; ook los te herladen via `laadOnderdelen()`. Beheer via `openOnderdeelModal()` → `saveOnderdeel()` / `deleteOnderdeel()` / `renderOnderdeelLijst()`. De helpers `vindCustomOnderdeel()`, `isLagerBeter()` en `isMinutenFormaat()` bepalen richting (lager vs hoger = beter) en weergave; `getPREenheid`, `getPRPlaceholder`, `normaliserenResultaat`, `formateerResultaatWeergave`, `bestePrestatie` en de PR-bepaling in `renderPrestatieTable` raadplegen deze. `getPRDisciplinesVoorAtleet()` voegt eigen onderdelen (op geslacht) toe aan het invoerformulier; de bulk-PR-velden gebruiken index-gebaseerde id's. Bij het kiezen van een onderdeel-filter (zonder atleet) toont `renderOnderdeelRanglijst()` de beste PR per atleet, gesorteerd. **Bewust afgebakend tot de Prestaties-tab:** eigen onderdelen komen niet in het wedstrijdprogramma, de opstelling of de puntenrekentool, omdat daar geen Atletiekunie-puntenformule voor bestaat (`berekenPunten` geeft 0 terug voor onbekende onderdelen).

### 60m geen U16-onderdeel — wél U14 (patch 40 + 45, juni 2026)
`60m` is in patch 40 uit `U16_DISCIPLINES` verwijderd (verdween daarmee uit het programma-keuzemenu en de PDF-import-keuzelijst voor U16). **Patch 45:** 60m, 60m horden (76,2 cm) en 4x60m zijn weer beschikbaar, maar uitsluitend binnen de **U14**-onderdelenlijst (`DISC_U14`). In `DISC_MAP` (Excel-PR-import) zijn `60 meter` en `60 meter horden 76,2 cm` (varianten) van `null` naar `60m` / `60m horden` gezet; de 83,8 cm-variant blijft op `null`. In `PDF_DISCIPLINE_VERTALING` en `FINALE_DISC_MAP` idem. Wie 60m bij U16 toch wil bijhouden, kan het als eigen onderdeel toevoegen.

### Afgelopen opstelling raadplegen: alleen-lezen-modus (patch 37–38, juni 2026)
Een afgelopen-wedstrijdkaart in de Wedstrijden-tab is volledig klikbaar (`bekijkOpstelling()`) en opent de opstelling read-only. De vlag `opstellingAlleenLezen` (default `false`) stuurt dit aan: `openOpstelling(wedstrijdId, alleenLezen)` zet de vlag, `pasOpstellingModusToe()` verbergt bewerk-elementen (class `bewerk-actie`) + de beschikbaarheid-sectie en toont een 🔒-badge, en `renderPloeg()`-slots renderen zonder klik/✕. **Belangrijk:** in alleen-lezen-modus leidt `renderPloegen()` de te tonen ploegen af uit de opgeslagen `opstellingData` (niet uit de algemene instelling `aantalPloegenPerGeslacht`), zodat alle destijds gevulde ploegen zichtbaar zijn. Op afgelopen kaarten zijn de losse knoppen (✏️/📋/📄) weggelaten (patch 38); de hele kaart is de klikzone, met een hint "👁️ Bekijk opstelling". Aankomende kaarten houden hun knoppen. Geen schemawijziging — gebruikt bestaande tabel `opstelling`.

### Sterkst mogelijke opstelling bij finales (patch 39, juni 2026)
Voor wedstrijden met `is_finale = true` werken `genereerOpstelling()` en `aanvullenOpstelling()` (beide nu `async`) anders: ze maximaliseren de teamsterkte. Concreet vervallen bij finales (1) de "minstens 2 onderdelen"-stap (ronde 2) + de min-2-waarschuwing, en (2) de 15-minutenregel — beide in `if (!isFinale)` gezet. **Blijft gelden bij finales:** max 3 onderdelen, de 3-uursregel (800m/1500m vs 300m/300mh), techniek 1 startgroep per discipline, en één ploeg per atleet. **Cross-finale exclusiviteit:** `laadAndereFinaleAtleten(wedstrijdId, datum, geslacht)` haalt uit de `opstelling`-tabel de atleet-id's op die al in een OPGESLAGEN opstelling van een andere finale op dezelfde datum staan (zelfde categorie + geslacht); die worden uit `beschikbareAtleten` gefilterd. Werkt dus op opgeslagen opstellingen → de volgorde van opslaan bepaalt de verdeling. Bij Aanvullen blijft een handmatige dubbele keuze staan, met waarschuwing. Niet-finales: logica volledig ongewijzigd. Geen schemawijziging.


### Finale-markering + aankomende/afgelopen wedstrijden (patch 36, juni 2026)
Een wedstrijd kan als finale worden gemarkeerd via de boolean-kolom `is_finale` (default `false`) op `wedstrijden`. Een 🏆 FINALE-badge verschijnt op de wedstrijdkaart, in de opstelling-keuzelijst en in de kop van de gekozen opstelling. De Wedstrijden-tab splitst op datum in "Aankomende" en "Afgelopen" (afgelopen = datum vóór vandaag; geen datum = aankomend). De afgelopen-lijst is inklapbaar (`afgelopenIngeklapt`, default open). **Toegang is bewust niet aangepast:** de splitsing werkt over de al-gefilterde lijst van de actieve categorie, dus RLS + categorie-filter blijven leidend — geen samenvoegende query over categorieën. Kernfuncties: `isWedstrijdAfgelopen()`, `wedstrijdKaartHtml()`, `toggleAfgelopen()`.


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

### Afdrukken opstelling: paginaformaat en marges (patch 35, mei 2026)
Het printdocument gebruikt nu `@page { size: A4 landscape; margin: 12mm 14mm; }` om het paginaformaat en de marges correct in te stellen. De eerdere `body padding: 20mm 18mm` zorgde ervoor dat de tabel slechts een klein deel van de pagina vulde — dat is verwijderd. Landscape is standaard omdat de tabel vijf kolommen heeft en in portrait te smal wordt. De `@page` regel werkt in alle moderne browsers en overschrijft de browser-standaardmarges correct.

### Afdrukken opstelling: paginaopmaak (patch 34, mei 2026)
`printOpstelling()` gebruikt nu vaste kolombreedtes via `<colgroup>` zodat alle teams dezelfde tabelindeling hebben. Volledig lege teams worden overgeslagen via de helper `isPloegLeeg()` — een team is leeg als geen enkel slot (alle disciplines × alle slots) een atleet-id bevat. Elk ingevuld team begint op een nieuwe pagina via `page-break-before: always`. Het document-kopje (wedstrijdnaam, datum, locatie, printdatum) wordt één keer bovenaan het allereerste team geplaatst.

### Aantal ploegen per geslacht (patch 33, mei 2026)
`aantalPloegen` is vervangen door `aantalPloegenPerGeslacht = { M: 3, V: 3 }`. Het aantal ploegen wordt per geslacht opgeslagen en de dropdown synchroniseert automatisch bij het wisselen van de geslacht-tab (Jongens/Meisjes).

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

Toegevoegd in patch 27: `"300m horden"`, `"300mh"`, `"300mhorden"`. Toegevoegd/geactiveerd in patch 45: `"60m"`, `"60mh"`/`"60m horden"`, `"4x60m"` en `"1000m"` (waren `null` of ontbraken) voor U14.

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
- **Onderdelen, punten en branding zijn categorie-afhankelijk (patch 45):** de onderdelenlijst komt uit `CATEGORIE_CONFIG` via `getDisciplines()`; logo, ondertitel, tabbladtitel, PDF-labels, teamnamen en share-teksten tonen de actieve categorie via `catNaam()`. Een categorie zonder eigen config valt terug op de U16-onderdelenlijst. De categorienaam in de Admin-tab moet exact kloppen (bijv. `U14`) om de juiste config te activeren.

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
| Atletiek.nu API | ~~Cloudflare Worker: `atletiek-nu-api-milan.milande-maat.workers.dev`~~ — **Verwijderd (patch 32)**, werkt niet door Cloudflare-beperkingen |
| E-mail (uitnodiging + welkom) | Cloudflare Worker: `sprint-uitnodiging.milande-maat.workers.dev` + Brevo. POST-body: `{ email, link, type }` waarbij `type` = `"uitnodiging"` of `"welkom"`. API-sleutel: `sprint-u16-worker`, ingesteld als Secret `BREVO_API_KEY` in Worker. **Keep-alive:** `scheduled`-handler + Cron Trigger `0 6 1,15 * *` roept 2×/maand `GET /v3/account` aan zodat de sleutel niet na 90 dagen inactief wordt (aug. 2026) |
| World Athletics PR | `worldathletics.nimarion.de` |
| NAU scoretabellen | Ingebouwd (gezamenlijke U14/U16-telling, NAU-document dec. 2025) |

**Let op:** atletiek.nu Worker kan soms worden geblokkeerd door bot-detectie.

---

## 📋 Puntentelling (NAU, dec. 2025)

- **Loop:** `PUNTEN = INT(A / tijd - B)`
- **Veld:** `PUNTEN = INT(A × SQRT(afstand) - B)`
- INT kapt naar beneden af (geen afronding)
- Jongens en meisjes gebruiken dezelfde constanten; **U14 en U16 delen één gezamenlijke NAU-tabel** (zelfde constanten)
- Drempelformules onder de grens: verspringen ≤ 4,41 m → `INT((afstand - 1,91) × 200 + 0,5)`; hoogspringen ≤ 1,35 m → `INT((afstand - 0,67) × 733,33333 + 0,7)` (de `+0,7` is gecorrigeerd in patch 45; was `+0,5`). In `veldConst` geregeld via `drempelPlus` per onderdeel.

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
| 📊 PR-overzicht importeren | Prestaties-tab | `.xlsx` breed formaat (naam + disciplines) | Importeert PR-overzicht met tijdomrekening |
| 📄 Tijdschema importeren | Wedstrijden-tab | `.pdf` wedstrijdprogramma | Importeert starttijden per onderdeel/geslacht |
| 📊 Importeer finale (Excel) | Wedstrijden-tab (aankomende kaart) | `.xls`/`.xlsx` finale-tijdschema | Importeert finaleprogramma per geslacht (patch 42) |

> Alle drie de import-paden zijn sinds patch 45 categorie-bewust: ze herkennen de regels en onderdelen van de actieve categorie (incl. U14: 60m, 60m horden, 4x60m, 1000m).

### PR-overzicht Excel formaat (patch 14)
- Kolom A: atletennamen
- Rij 1: discipline-namen als kolomtitels (bijv. `80m`, `hoogspringen`, `1500m`)
- Cellen: waarden — tijden als getal (seconden) of als Excel-tijddecimaal, veld als meters
- Ondersteunde disciplines: 60m, 80m, 60m horden, 80m horden, 100m, 100m horden, 150m, 200m, 300m, 300m horden, 600m, 800m, 1000m, 1500m, Hoogspringen, Verspringen, Speerwerpen, Discuswerpen, Kogelstoten, 4x60m, 4x80m, 4x100m

---

## 📁 Projectbestanden

| Bestand | Doel |
|---------|------|
| `app.html` | Hoofd-app (atleten, prestaties, wedstrijden, opstelling, admin) |
| `index.html` | Login + registratie + 2FA setup |
| `pwa_sw.js` | Service worker (netwerk-eerst voor HTML, patch 44) |
| `Sprint_U16_Spelregels.pdf` | Spelregels & werking voor trainers |
| `sprint-u16-dashboard.html` | Standalone statusdashboard (Supabase live checks) |

---

## 🗺️ Roadmap (volgend seizoen)

- [ ] Meerdere trainers per categorie uitnodigen en testen
- [x] Categorie U14 activeren (patch 45) — onderdelen, punten, branding en import categorie-bewust
- [ ] Categorie U18/U20 activeren — let op: eigen NAU-puntentabel (constanten moeten dan categorie-afhankelijk worden) + gecombineerde categorie per geslacht
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
