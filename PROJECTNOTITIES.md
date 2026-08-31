# Sprint U16 — Projectnotities
*AV Sprint Breda · Laatste update: 31 augustus 2026 (patch 59)*

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
| `opstelling` | Teamopstelling per wedstrijd per geslacht per ploeg (JSON) |
| `beschikbaarheid` | Beschikbaarheid per atleet per wedstrijd |
| `uitnodigingen` | Invite-only registratie (token, email, categorie_id, vervalt, gebruikt) |

**Belangrijk:** alle datatabellen gebruiken `categorie_id` als toegangssleutel — NIET `eigenaar_id`.
Row Level Security zorgt dat trainers alleen data zien van hun eigen categorieën.

---

## ⚠️ Bekende technische beslissingen

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
