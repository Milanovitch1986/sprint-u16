# Sprint U16 — Projectnotities
*AV Sprint Breda · Laatste update: 10 oktober 2026 (patch 95)*

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

### Patch 95: Wedstrijddag deel 1 (patch 95, okt 2026)
Eerste patch op het live-kritieke scherm Wedstrijddag (de buitenkant); deel 2 (voortgangskaart en "Nu bezig") volgt apart en moet eerst op bestaande gegevens worden onderzocht. Tag `ui-U` staat op de commit vóór deze patch (patch 94, `a4c54ef`). Afspraak voor dit scherm: eerst bouwen en testen, dan wachten op "commit nu" en eerst vragen of er een wedstrijd loopt. Open daarna: Wedstrijddag deel 2 en slepen met een vinger.
- **Keuze:** na twee mockups (Visualizer) koos Milanovitch voor beide soorten chips: statuschips per atleet (klaar, wacht, DNS) én een chip "niet verstuurd" voor een resultaat in de offline-wachtrij (de tekst "wacht op verbinding" is bewust vervangen, omdat "wacht" en "wacht op verbinding" verwarren).
- **Opbouw:** `wdAtleetCelHtml(naam, discipline, sleutel)` bouwt de eerste cel van `.wd-rij` (avatar, naam, chips) en vervangt in `renderWdLijst()` en `wdIndivRijHtml()` de oude tekst; de cel blijft het eerste kind van `.wd-rij`, dus het grid en de overige kinderen (velden, PR, punten, knop) zijn niet veranderd. Het estafetterij ("Teamtijd Ploeg X") krijgt alleen de sync-chip. De status volgt uit `wdResultaten`, `wdEffectief()` en `wdResKey()`; een rij wordt na elke invoer opnieuw getekend (`wdHerteken()` of `renderWdLijst()`), dus de chip kan niet verouderen. `wdWachtLabelHtml()` levert `.wd-chip-sync` met `data-wacht=<resKey>`; `wdVerversWachtChips()` (aangeroepen vanuit `wdRenderSyncBadge()`) haalt na het synchroniseren alleen de chips weg waarvan de sleutel niet meer in `wdWachtSet` staat. **Nooit opnieuw tekenen vanuit de synchronisatie:** dat zou het typen in een invoerveld verstoren.
- **Bevinding over het oude gedrag:** het label "wacht op verbinding" bleef na het synchroniseren staan tot de lijst opnieuw werd getekend (de oude versie deed dat ook). Met een chip naast "✓ klaar" was dat misleidend; daarom `wdVerversWachtChips()`.
- **Indeling:** twee kolommen pas vanaf 1240 px (een eerste versie begon bij 1100 px; daar werd de naam 9 px breed). Onder 1240 px blijft de rij van 5 kolommen. In de tweekolomsmodus is de rij een grid met drie kolommen en twee regels (naam over kolom 1–2 en PR rechts; invoer, punten, knop eronder), uitgedrukt met `nth-child` omdat de volgorde van de kinderen vast is (1 naam, 2 velden, 3 PR, 4 punten, 5 knop). `#view-wedstrijddag` hoort bij de views buiten `<main>` met `max-width: 1100px`; vanaf 1560 px alleen 1500 px als `#wd-detail` zichtbaar is.
- **Zwevende knop:** `.wd-afrond-actie` is `position: sticky` met `bottom: 16px` (mobiel `calc(60px + env(safe-area-inset-bottom) + 12px)`, boven de onderbalk); tijdens het typen (`#wd-detail input:focus, select:focus`, via `:has()`) is hij `static`, zodat hij een veld of het toetsenbord nooit afdekt. Op een telefoon een compacte pil: de HTML van de knop heeft twee spans (`.wd-afrond-lang` en `.wd-afrond-kort`) en een `title`.
- **Testmethode (nieuw geleerd):** (1) vergelijk oud en nieuw stap voor stap op de data (rijen, `id`'s, `wdResultaten`, `wdPogingen`, scorebalk, melding, schrijfaanroepen), niet op de HTML, en laat bewust nieuwe elementen weg; normaliseer tijdstempels in schrijfaanroepen (`ingevoerd_op`) en kloktijden in meldingen. (2) Laat de test een verbetering expliciet toestaan en formuleer wat dan mag (hier: de nieuwe versie mag nergens een extra chip hebben en mag een verouderde chip missen). (3) Meet bij een layout ook de leesbaarheid, niet alleen dat er geen overloop is: een naam van 9 px breed haalde alle andere controles. (4) Een bewust opgewekte netwerkfout (`__failWrites`) en daarna `synchroniseerWachtrij()` test de wachtrij zonder echt netwerk. (5) Neem bij een zwevend element altijd het typen en het toetsenbord mee. (6) De bedieningselementen in de DOM verschillen per onderdeel: voor loopnummers vervangt een ronde het losse veld op dezelfde regel (geen `.wd-ronde-blok`).
- **Terugdraaien:** Revert op de commit van patch 95, of terug naar tag `ui-U`.

### Patch 94: Admin, laatste back-up (patch 94, okt 2026)
Derde [data]-onderdeel, opnieuw zonder databasewijziging. Tag `ui-T` staat op de commit vóór deze patch (patch 93, `63dcb54`). Admin is niet live-kritiek: direct na de tests gecommit. Open: Wedstrijddag (deel 1 en voortgang/"Nu bezig") en slepen met een vinger.
- **Achtergrond:** `backupNaarExcel()` maakt een Excel-bestand met `XLSX.writeFile` (een download op het apparaat); de app legde nergens vast wanneer. `categorieen` wordt in de app alleen aangemaakt en verwijderd, nooit gewijzigd, dus een kolom daar zou ook de rechten (RLS) voor een update vragen. Milanovitch koos daarom optie A: het moment in de browser bewaren (`localStorage`, zoals het thema). Optie B (een kolom in de database, dezelfde stand op elk apparaat) kan later erbovenop; dat vraagt één SQL-regel en een controle van de update-rechten.
- **Opslag:** sleutel `sprint_laatste_backup_<categorie-id>`, waarde JSON `{ tijd, atleten, prs, wedstrijden }`. `bewaarBackupMoment()` wordt in `backupNaarExcel()` pas ná `XLSX.writeFile` aangeroepen, dus een mislukte download bewaart niets; een fout bij het bewaren zelf (privé-venster, `Storage` die faalt) wordt genegeerd. `toonLaatsteBackup()` leest de waarde met een eigen `try/catch` en vult `#backup-laatste` (onder de knop) en `#admin-menu-backup-sub` (mobiele lijst); aangeroepen vanuit `laadAdmin()`, `kiesAdminSectie()` en `bewaarBackupMoment()`.
- **Tekst:** "Laatste back-up: <datum>, <tijd> (<vandaag|gisteren|n dagen geleden>) · <aantallen>"; vanaf 30 dagen oranje met "Maak een nieuwe back-up."; zonder moment "Nog geen back-up gemaakt op dit apparaat." (mobiele lijst: "Laatste: …" of "Nog geen back-up op dit apparaat"). Dagen = verschil in kalenderdagen via lokale middernacht (`Math.round` over 86400000 ms, tegen zomertijd), nooit negatief.
- **Testmethode (nieuw geleerd):** (1) vervang `window.XLSX` door een nagebootste versie (`utils.book_new`, `aoa_to_sheet`, `book_append_sheet`, `writeFile`) zodat de back-up draait zonder de CDN en je bestandsnaam en tabbladen kunt controleren. (2) Zet met een init-script een vaste datum en schrijf oudere momenten rechtstreeks in `localStorage`; test de grenzen (29 en 30 dagen, middernacht, de toekomst). (3) Een bewust opgewekte fout (`writeFile` die gooit) geeft een `pageerror` in het testlog; dat is verwacht en geen fout van de app. (4) Een globale variabele bestaat soms onder een andere naam dan je denkt (`categorieen` bestaat niet); zet in een test de actieve categorie rechtstreeks. (5) `Storage.prototype.setItem` overschrijven simuleert een browser die niets kan bewaren.
- **Terugdraaien:** Revert op de commit van patch 94, of terug naar tag `ui-T`.

### Patch 93: Atleten, geboortejaar en onderdelen (patch 93, okt 2026)
Tweede van de [data]-onderdelen, opnieuw zonder databasewijziging. Tag `ui-S` staat op de commit vóór deze patch (patch 92, `ac958f6`). Atleten is niet live-kritiek: direct na de tests gecommit. Open: de [data]-patch Admin ("Laatste back-up"), Wedstrijddag (deel 1 en voortgang/"Nu bezig") en slepen met een vinger.
- **Keuze en achtergrond:** "onderdelen per atleet" kon twee dingen betekenen: afgeleid uit de PR's (gekozen, geen SQL) of zelf per atleet in te stellen (nieuw veld en een keuze in het bewerkvenster, één SQL-regel). Milanovitch koos na een mockup van beide voor het eerste. Het tweede kan erbovenop. De `geboortedatum` bestond al (`<input type="date">`, tekst `YYYY-MM-DD` of `null`), dus de geboortejaar-chip vroeg nooit om SQL.
- **Opbouw:** `renderAtleten()` zet onder `.card-meta` in `.atleet-info` het resultaat van `atleetChipsHtml(a.id, a.geboortedatum)`: een `div.atleet-chips` met een jaar-chip, maximaal 4 onderdeel-chips en een `+N`-chip (`title` met de rest), of een lege tekst als er niets te tonen is. Onderdelen komen uit de globale array `prestaties` (`atleetId`, `discipline`), ontdubbeld op naam in kleine letters. De volgorde is `onderdeelVolgorde()`: rang 0 loopnummers (sprint en zelf toegevoegd van type `tijd_sec`), 1 middellang (en `tijd_min`), 2 estafette (`^\d+\s*x`), 3 springen, 4 werpen en stoten (en `afstand`), 5 de rest; daarbinnen het getal (voor estafettes het getal na de x) en dan de naam (`localeCompare(..., "nl")`).
- **Het jaar:** altijd uit de tekst van de geboortedatum, nooit uit een `Date` (die kan in een andere tijdzone een dag of jaar opschuiven).
- **Testmethode (nieuw geleerd):** (1) een mockup van twee opties (via de Visualizer, zonder emoji en in zinsvorm) maakt een keuze voor een beginner veel makkelijker dan een beschrijving. (2) Controleer de verwachting zelf bij een afwijking: hier telde mijn test 8 chipregels, maar twee atleten hadden geen jaar en geen PR's en dus terecht geen regel; bereken zulke aantallen uit de gegevens in plaats van ze te raden. (3) Zet bewust lastige invoer in de testdata (ontbrekende en ongeldige datum, 31 december, dubbele en hoofdletter-afwijkende PR-rijen, acht onderdelen, een zelf toegevoegd onderdeel).
- **Terugdraaien:** Revert op de commit van patch 93, of terug naar tag `ui-S`.

### Patch 92: Prestaties, verloop uit de wedstrijdresultaten (patch 92, okt 2026)
Eerste van de [data]-onderdelen, maar zonder databasewijziging. Tag `ui-R` staat op de commit vóór deze patch (patch 91, `1d6dd98`). Prestaties is niet live-kritiek: direct na de tests gecommit. Open [data]-patches: Atleten (onderdelen per atleet, geboortejaar-chip), Admin ("Laatste back-up"), Wedstrijddag deel 2 (voortgang, "Nu bezig").
- **Correctie op het plan:** het plan ging uit van een nieuwe kolom `datum` op `prestaties` (SQL door Milanovitch). Dat klopt niet: de kolom bestaat al (`datum`, `locatie`, `notities`; de code vult hem bij elke nieuwe PR, maar de UI toont hem nergens). Het echte gat is dat `prestaties` **één rij per atleet en onderdeel** is: bij een nieuwe PR (venster, Excel-import, wedstrijd afronden) wordt de oude PR verwijderd, dus er is geen geschiedenis. En de `datum` van een handmatig ingevoerde PR is de invoerdatum (`vandaag`), niet de loopdatum; daarom wordt de PR-datum niet gebruikt.
- **Bron van het verloop:** de tabel `resultaten` (wedstrijdresultaten; kolommen `atleet_id`, `discipline`, `sleutel`, `resultaat`, `status`, `ronde`, `poging_nr`, `wedstrijd_id`, `categorie_id`) plus de datum en naam uit `wedstrijden`. Individuele resultaten hebben `sleutel = atleet-id`; estafetteploegen `ploeg-X` met `atleet_id` leeg en tellen niet mee. Het Prestaties-scherm laadde `resultaten` nog niet; nu per gekozen atleet één leesvraag (alleen lezen) met een minuut geheugenkopie. Optie 2 (PR-geschiedenis gaan bewaren, oude PR's niet meer verwijderen) is bewust niet gedaan: die wijzigt de zes plaatsen waar PR's worden opgeslagen en alles wat uitgaat van één PR per onderdeel.
- **Rekenregels:** één punt per wedstrijd = het beste geldige resultaat over snelle invoer, pogingen en rondes (zoals `wdBesteResultaat()`: status `ok`, ingevuld, `parseResultaat() > 0`, `isLagerBeter()` bepaalt wat beter is); op datum gesorteerd; "nieuw beste" = strikt beter dan het beste tot dan toe; "Laatste ▲" = de laatste zo'n verbetering; Seizoen = beste punt van het huidige kalenderjaar; "= PR" bij een niet-verbeterend resultaat gelijk aan de PR. Het verschil wordt als `−0,2 s` (tijden, ook voor minutenonderdelen) of `+0,15 m` (afstanden) getoond.
- **Opbouw:** `renderPrestaties()` roept bovenaan `werkVerloopBij()` aan; dat leest zelf de filters (`#prestatie-atleet-filter`, `#prestatie-disc-filter`) en schrijft in het aparte blok `#prestaties-verloop` (buiten `#prestaties-content`, dus de bestaande `innerHTML`-vervangingen raken het niet). Een atleet gekozen = blok zichtbaar; geen atleet = blok leeg (`:empty` verbergt het).
- **Testmethode (nieuw geleerd):** (1) controleer een berekening met een **onafhankelijke** implementatie in de test (hier Python) en lastige gegevens in plaats van de code naar zichzelf te laten kijken. (2) Zet met een init-script een vaste datum zodat "dit jaar" voorspelbaar is. (3) Een trage leesvraag nabootsen: herdefinieer de globale functie (`laadVerloopRijen = async ...`) in `page.evaluate` met een vertraging voor één atleet; dat bewijst dat een laat antwoord een nieuwere keuze niet overschrijft. (4) Tel leesvragen met een teller in diezelfde herdefinitie. (5) Een verwachting in de test kan door een terechte ontwerpwijziging verouderen (een laat antwoord wordt nu wel gecachet); pas dan de verwachting aan en leg uit waarom. (6) Een grafiek met één punt is nutteloos en neemt veel ruimte in: tonen vanaf twee punten.
- **Terugdraaien:** Revert op de commit van patch 92, of terug naar tag `ui-R`.

### Patch 91: Opstelling deel 4, atleten slepen (patch 91, okt 2026)
Vierde patch op het live-kritieke scherm Opstelling (reeks patch 83–97, zonder Home). Geen databasewijziging. Tag `ui-Q` staat op de commit vóór deze patch (patch 90, `27c217f`). Afspraak voor dit scherm: eerst bouwen en testen, dan wachten op "commit nu". Daarna: slepen met een vinger (aanraking, lang indrukken; apart voorgesteld), Wedstrijddag en de [data]-patches.
- **Bewust beperkt:** alleen muis en pen; `pointerType === "touch"` keert direct terug uit `sleepStart()`, dus scrollen en tikken op telefoon en tablet zijn onveranderd. Reserves doen niet mee (eigen regels: alleen atleten die in geen team staan). Geen automatisch scrollen tijdens het slepen.
- **Delegatie:** `onpointerdown="sleepStart(event)"` op `#ploegen-container` en `#beschikbaarheid-grid`; de containers blijven bestaan terwijl hun inhoud met `innerHTML` wordt vervangen. Een slot wordt herkend aan het id `slot_<ploeg>_<idx>_<nr>` (regex `^slot_([ABC])_(\d+)_(\d+)$`; reserveslots heten `slot_RES_n` en doen dus niet mee); een lijstrij aan `.beschik-rij[data-atleet]` met een `.sleep-greep`. Niet-gevulde slots, `.slot-remove`, een open `.slot-select` en alleen-lezen starten niets.
- **Levenscyclus:** `sleepStart` zet `window.__sleep` en koppelt `pointermove`/`pointerup`/`pointercancel`/`keydown`/`blur`; `sleepBeweeg` start de sleepactie na 5 px (label `.sleep-spook`, `body.sleept`, bron `.sleep-bron`), zoekt met `elementFromPoint` het slot onder de muis en zet `.sleep-ok|conflict|nee`; `sleepLos` voert uit en onderdrukt de volgende klik (capture, eenmalig, opgeruimd na 0 ms); `sleepAnnuleer` (Escape, blur, `pointercancel`, `buttons === 0`) onderdrukt de klik 800 ms; `sleepOpruimen` haalt alles weg.
- **Regels:** `sleepBeoordeel(bron, doel)` geeft `{ok, conflict, reden, naam, wissel, wijz, doel}` of `null` (zelfde slot, of dezelfde atleet op het slot). Volgorde van de redenen zoals in de keuzelijst: andere startgroep (alleen technisch) → andere ploeg → meer dan 3 onderdelen; `checkConflict` alleen als waarschuwing. De proefstand rekent op een **kopie** van de betrokken ploegobjecten (`Object.assign({}, orig)`) en zet de originelen terug; de eerste versie wiste en zette sleutels terug, waardoor de volgorde van de sleutels veranderde (de test vergeleek de JSON-string en zag dat). Cross-ploeg-verplaatsing valt vanzelf goed uit: na het weghalen uit de bron kijkt `zitInAnderePloeg` of de atleet nog in de bronploeg staat. Een wissel valideert beide plaatsingen. Uitvoeren: lijst naar slot via `kiesAtleet()` (zelfde route als de keuzelijst, inclusief `verwijderVanReservebank`), slot naar slot direct in `opstellingData` plus één `renderPloegen()`.
- **Testmethode (nieuw geleerd):** (1) simuleer echte muisacties met `page.mouse.move/down/move(steps)/up`; lees tijdens het slepen met een `evaluate` de klasse van het doel en de tekst van het label voordat je loslaat. (2) Vergelijk niet alleen de uitkomst maar ook de JSON-string van de gegevens voor en na het hoveren; zo viel de sleutelvolgorde op. (3) Een systematische vergelijking met de bestaande route (voor elke atleet en elk leeg slot het oordeel van het slepen tegenover de gedimde of klikbare items van `openSlotKeuze`) bewijst dat de regels gelijk zijn; maak daarvoor een scenario met veel varianten (vijf onderdelen, twee startgroepen, tijdconflicten). (4) Een aanraking test je met een gesimuleerd `PointerEvent` met `pointerType: "touch"`. (5) Test het zijpaneel op 1920 px; het greepje is er pas vanaf 1560 px.
- **Terugdraaien:** Revert op de commit van patch 91, of terug naar tag `ui-Q`.

### Patch 90: Opstelling deel 3, indeling op desktop (patch 90, okt 2026)
Derde patch op het live-kritieke scherm Opstelling (reeks patch 83–96, zonder Home). Alleen CSS, geen JavaScript of HTML, geen databasewijziging. Tag `ui-P` staat op de commit vóór deze patch (patch 89, `8df58eb`). Afspraak voor dit scherm: eerst bouwen en testen, dan wachten op "commit nu", en eerst vragen of er een wedstrijd loopt of iemand een opstelling maakt. Daarna: patch 91 = slepen van atleten, daarna Wedstrijddag en de [data]-patches.
- **Maten die hierbij bleken te gelden:** `main` en de views buiten `<main>` (waaronder `#view-opstelling`) hebben `max-width: 1100px` met `padding: 24px`; de bruikbare breedte is dus 1052 px, óók op een scherm van 1920 px. Drie ploegen van ± 340 px passen daar precies in; een zijpaneel past er niet náást. Daarom wordt alleen `#view-opstelling` vanaf 1560 px maximaal 1500 px breed (met `:has(> #opstelling-stap2:not([style*="none"]))`, zodat de wedstrijdlijst van stap 1 niet meebreedt).
- **Rijen:** `.onderdeel-rij` is een grid `140px 1fr 1fr auto`, maar `renderPloeg()` maakt maar twee gevulde kinderen (onderdeel + atleten) en twee lege plaatshouders; daardoor stonden de atleten tot nu toe in één derde van de breedte. Bij de kolomindeling: `96px minmax(0, 1fr)` en de plaatshouders verborgen (`> div:nth-child(n+3)`). De reservekaart gebruikt dezelfde klasse maar zit in `#reserves-container` en heeft een inline `grid-template-columns:1fr`, dus de regels (die op `#ploegen-container` zijn afgebakend) raken haar niet.
- **Ploegen:** `#ploegen-container` is op ≥ 1100 px een grid `repeat(auto-fit, minmax(320px, 1fr))`; alle `.ploeg-body` zijn zichtbaar (de `open`-klasse blijft bestaan en wisselt nog mee via `togglePloeg`, maar heeft op desktop geen effect), het pijltje is verborgen en de naam krijgt `flex-basis: 100%` zodat de kopjes in elke ploeg gelijk zijn.
- **Zijpaneel:** `#opstelling-stap2` wordt op ≥ 1560 px een grid met kolommen `minmax(0, 1fr) 300px`; elk kind spant standaard beide kolommen; `#beschikbaarheid-sectie` staat in kolom 2 vanaf rij 4 en is sticky; de actierij, ploegen en reserves staan in kolom 1. Auto-plaatsing zet de eerste drie kinderen (kop, geslachtstabs, voortgangsbalk) in rij 1–3. Alleen-lezen verbergt de beschikbaarheid inline (`style="display:none"`) en krijgt via `:has(> #beschikbaarheid-sectie[style*="none"])` één kolom.
- **Testmethode (nieuw geleerd):** (1) meet de layout eerst met een snel prototype via `page.add_style_tag()` voordat je het in `app.html` zet; zo bleek dat de maximale breedte het zijpaneel beperkte. (2) Meet per breedte de posities (`getBoundingClientRect`) van de ploegen, het zijpaneel en de view, en controleer `scrollWidth > innerWidth` voor horizontaal scrollen. (3) Test een sticky paneel door de pagina scrollbaar te maken (`documentElement.style.minHeight`) en na `scrollTo` de `top` te meten. (4) Een open `.slot-select` controleer je met `elementFromPoint` op zijn middelpunt (niet afgedekt) en met `left >= 0 && right <= innerWidth` (binnen beeld). (5) Bij oud-nieuw-vergelijkingen van HTML kan de `class`-attribuutwaarde van een dichtgeklapte ploeg `"ploeg-header "` (met spatie) zijn; normaliseer dat.
- **Terugdraaien:** Revert op de commit van patch 90, of terug naar tag `ui-P`.

### Patch 89: Opstelling deel 2 (patch 89, okt 2026)
Tweede patch op het live-kritieke scherm Opstelling (reeks patch 83–96, zonder Home). Geen databasewijziging. Tag `ui-O` staat op de commit vóór deze patch (patch 88, `202cabd`). Afspraak voor dit scherm: eerst bouwen en testen, dan wachten op "commit nu", en eerst vragen of er een wedstrijd loopt of iemand een opstelling maakt. Bijgestelde planning: patch 90 = drie ploegen naast elkaar met zijpaneel op desktop (alleen CSS), patch 91 = slepen van atleten, daarna Wedstrijddag en de [data]-patches.
- **Waarschuwing:** `opstellingHeeftOnopgeslagen()` (in beeld én bewerkbaar én snapshot-sleutel gelijk én tekst anders; alles in `try/catch`) is de enige bron. `vraagOpstellingVerlaten()` geeft een Promise met "opslaan" | "verwerp" | "blijf"; `opstellingVerlaatKeuze(keuze)` hoort bij de drie knoppen van `#opstellingVerlaatModal` (bij "opslaan" wordt `opslaanOpstelling()` afgewacht en geldt: nog niet-opgeslagen = "blijf", zodat een mislukte opslag niets weggooit). De vraag bewaart zijn oplosser in `window.__opstellingVerlaatOplossen`; is het venster zonder knop gesloten, dan wordt de oude vraag bij de volgende poging als "blijf" afgehandeld (nooit een blokkade). Guards: `showTab` (alleen als het doel niet `opstelling` is), `terug_naar_wedstrijden`, `setOpstellingGeslacht` (ook bij dezelfde knop: laadt opnieuw) en `wisselCategorie` (vóór de wissel; dat gooide al zonder waarschuwing weg). De drie synchrone functies stellen de actie uit en roepen zichzelf opnieuw aan met de vlag `window.__opstellingVerlaatBevestigd`. `beforeunload` wordt eenmalig in `neemOpstellingSnapshot()` gekoppeld. Programmatische `showTab`-aanroepen (categorie wisselen vanuit Wedstrijddag, openen van wedstrijden, init) zijn gecontroleerd: die gebeuren niet vanuit een zichtbare, niet-opgeslagen opstelling.
- **Stappen op mobiel:** `data-stap` op `#opstelling-stap2` (1, 2, 3) + CSS in `@media screen and (max-width: 768px)`; de onderdelen van `.opstelling-acties` hebben `data-stap="2"` (titel, 1/2/3-segment, Automatisch, Aanvullen) of `"3"` (Opslaan, Exporteren, Afdrukken, Delen). `kiesOpstellingStap(n|"vorige"|"volgende")` zet het attribuut en scrolt naar boven; `zetOpstellingStartStap()` kiest na het laden stap 2 (er is iets ingevuld) of stap 1, alleen als er nog geen stap is en niet in alleen-lezen; `openOpstelling()` wist het attribuut bij elke opening (anders kon een stap uit een eerdere opening, na een tabwissel, een alleen-lezen opstelling verbergen). Zonder attribuut blijft alles zoals het was. Stap 3 toont `#opstelling-samenvatting` (gevuld door `vulStapSamenvatting()` via de 500 ms-statuslus, alleen bij verandering) en `#opstelling-stapnav` (Vorige/Volgende) staat onderaan. `bouwSamenvattingHtml("delen"|"stap")` is gedeeld met het Delen-venster (uitvoer daar ongewijzigd). Op desktop zijn samenvatting en Vorige/Volgende verborgen en blijft alles zichtbaar.
- **Testmethode (nieuw geleerd):** (1) laat bij vergelijkingen van schrijflogs de Home-opruiming van `releasenotes` (met tijdstempel, schrijft bij het openen van Home) buiten beschouwing; gebruik op desktop een tab zonder schrijfacties (Punten). (2) Gebruik per combinatie van actie en keuze een verse pagina; dat is robuuster dan resetten. (3) Een mislukte opslag simuleer je met `window.__failWrites = true` in de nep-backend. (4) Een onbedoelde stand van een eerdere opening vind je door na een tabwissel (niet via Terug) een andere opening te testen, vooral alleen-lezen. (5) De voortgangsbalk ververst elke 500 ms; wacht ≥ 800 ms voordat je haar uitleest. (6) Selectors die op een nieuw attribuut leunen bestaan in de oude versie niet; sluit zulke onderdelen uit van oud-nieuw-vergelijkingen.
- **Terugdraaien:** Revert op de commit van patch 89, of terug naar tag `ui-O`.

### Patch 88: Opstelling deel 1 (patch 88, okt 2026)
Eerste patch op het live-kritieke scherm Opstelling uit de open mockup-onderdelen (reeks patch 83–95, zonder Home). Geen databasewijziging. Tag `ui-N` staat op de commit vóór deze patch (patch 87, `b4a4302`). Afspraak voor dit scherm: eerst bouwen en testen, dan wachten op "commit nu", en eerst vragen of er een wedstrijd loopt of iemand een opstelling maakt. Deel 2 (stap voor stap op mobiel, drie ploegen naast elkaar met zijpaneel) en deel 3 (slepen) volgen.
- **Ontwerp:** de opstel-, aanvul-, conflict- en opslaanlogica is niet aangeraakt. Nieuw: een voortgangsbalk (`#opstelling-voortgang`, drie `.voortgang-stap`), segmentknoppen `.aantal-ploegen-segment`, een onderbalk `#opstelling-onderbalk` en een samenvattingsvak `#wa-team-samenvatting`. Bestaande functies kregen elk een kleine, afgebakende wijziging: `laadProgrammaEnOpstelling()` en `opslaanOpstelling()` roepen na het laden/opslaan `neemOpstellingSnapshot()` aan; `deelViaWhatsApp()` roept `vulDeelSamenvatting()` aan; `renderBeschikbaarheid()` gebruikt klassen (`.beschik-rij`, `.schakelaar-input`, `.schakelaar`) in plaats van inline stijlen, met een identieke `onchange`-handler. De hele wijziging aan bestaande functies is vastgelegd in `commit_sjabloon.py` (`JS_FUNCTIES`, `JS_NIEUW`).
- **Niet opgeslagen:** `opstellingToestand()` normaliseert `opstellingData` (gesorteerde sleutels, lege plekken/ploegen weg, waarden als tekst; inclusief `RES`) en geeft `{sleutel: wedstrijd|geslacht, tekst}`. `neemOpstellingSnapshot()` bewaart dat in `window.__opstellingSnapshot` (na laden en na opslaan) en start eenmalig een `setInterval` van 500 ms voor `werkOpstellingStatusBij()`. Die doet niets als `#opstelling-stap2` niet zichtbaar is, verbergt alles in alleen-lezen, en vergelijkt anders de sleutel (andere wedstrijd of geslacht = nog aan het laden, dus niet "gewijzigd") en de tekst. Het aantal ploegen en de beschikbaarheid tellen bewust niet mee: het eerste is een algemene instelling (zie de opmerking in `renderPloegen()`), het tweede wordt direct opgeslagen. Polling in plaats van haken in `renderPloegen()`: alle wijzigingsroutes (kiesAtleet, clearSlot, kiesReserve, clearReserve, genereer, aanvullen) komen zo vanzelf mee, zonder de render- of opstelfuncties te wijzigen. Alle statuscode zit in `try/catch` (een fout daarin mag laden/opslaan nooit verstoren).
- **Aantal ploegen:** `#aantal-ploegen-select` blijft bestaan (`setOpstellingGeslacht()` schrijft er een waarde in) en is op scherm verborgen (`@media screen`); in print blijft hij zichtbaar. `kiesAantalPloegen(n)` zet de dropdown en roept `setAantalPloegen(n)` aan; `werkOpstellingStatusBij()` markeert het actieve segment vanuit `aantalPloegenPerGeslacht[actiefGeslacht]` (daardoor kloppen de knoppen ook na een geslachtswissel, zodra het laden klaar is). Op mobiel krijgen de titel "Ploegen" en de segmentknoppen elk een eigen rij in het grid van `.opstelling-acties`.
- **Stappen:** ① n van m beschikbaar (klaar bij ≥ 1), ② gevulde plekken van totaal (totaal = plekken per ploeg × aantal ploegen; per onderdeel 1 voor technisch, 4 voor estafette, anders 3, dezelfde tellingen als de opschoning in `laadProgrammaEnOpstelling()`), ③ Opgeslagen / Niet opgeslagen / Nog niets ingevuld (klaar alleen als er iets is ingevuld én opgeslagen). `scrollNaarOpstellingStap(n)` scrolt naar `#beschikbaarheid-sectie`, `#ploegen-container` of `#opstelling-acties`.
- **Onderbalk:** `position: fixed; z-index: 90` (onder de vensters op 200, boven de gewone inhoud); op desktop `left: var(--sidebar-w)`, op mobiel `bottom: calc(60px + veilige zone)` direct boven `#mob-nav`; stap 2 krijgt extra `padding-bottom` zolang de balk zichtbaar is (`:has(...)`). In print zijn voortgangsbalk, segmentknoppen en onderbalk verborgen.
- **Delen:** `vulDeelSamenvatting()` toont wedstrijd en datum, per team "n van m plekken gevuld", reserves en, als de tekst van de snapshot afwijkt, een waarschuwing (je deelt de opstelling zoals die nu op het scherm staat). Bewust géén voorbeeld van de volledige WhatsApp-tekst: daarvoor moet het bouwen van die tekst uit `deelGekozenTeamsViaWhatsApp()` worden losgemaakt, wat te riskant is voor dit scherm; kan eventueel in een latere patch.
- **Testmethode (nieuw geleerd):** (1) laat de spy op `sb.from` ook `window.open` vervangen; zo vergelijk je de WhatsApp-link tussen oud en nieuw zonder een venster te openen. (2) Controleer een afgeleide status (zoals "niet opgeslagen") niet met dezelfde code als de app, maar met een onafhankelijke normalisatie in de test (`norm_py`). (3) Compare bij nieuwe velden alleen de oorspronkelijke velden met `[:n]`; anders lijken extra velden een verschil. (4) De schakelaars staan achter een verborgen `input`; klik in tests op het `label`, niet op de input. (5) Het automatisch opstellen gebruikt geen `Math.random`, dus de uitkomst is vergelijkbaar tussen oud en nieuw.
- **Terugdraaien:** Revert op de commit van patch 88, of terug naar tag `ui-N`.

### Patch 87: Admin (patch 87, okt 2026)
Vierde patch met nieuwe JavaScript uit de open mockup-onderdelen (reeks patch 83–95, zonder Home), maar met maar één nieuwe functie en geen gewijzigde bestaande functie. Geen databasewijziging. Tag `ui-M` staat op de commit vóór deze patch (patch 86, `0ba5e9b`). Direct na de tests gecommit (Admin is geen live-kritiek scherm). "Laatste back-up: …" ([data]) volgt in patch 94.
- **Ontwerp:** één attribuut `data-actief` op `#view-admin` bepaalt welke sectie zichtbaar is; `kiesAdminSectie(naam)` zet alleen dat attribuut (en scrolt op mobiel naar boven). Alle regels staan in CSS: `#view-admin [data-admin-pagina] { display: none }` en per sectie een regel `#view-admin[data-actief="x"] [data-admin-pagina="x"] { display: block }`. `data-actief=""` = op desktop de eerste tab (`@media (min-width: 769px)`), op mobiel de lijst `.admin-menu`. Daardoor werkt het ook bij het verkleinen of draaien van het venster, zonder resize-luisteraar of staat in JavaScript. De actieve tab (desktop) krijgt zijn kleur via dezelfde attributen, niet via een klasse.
- **Secties:** de zes `<details>`/`<summary>` zijn gewone `div`'s geworden (het inklappen is vervallen); `data-admin-pagina` = uitnodigingen, gebruikers, categorieen, toegang, backup. De hintmelding `#tag-hint-panel` (inline `display:none`, door `laadOverigTagHint` getoond) is geen sectie meer en staat boven de tabs; de inline stijl blijft dus winnen. `laadAdmin()` laadt alle lijsten ongewijzigd, ook voor verborgen secties. Verwijderd uit de CSS van patch 80: het pijltje, het draaien, `details.admin-sectie:not([open])`, `::-webkit-details-marker`, `cursor`/`user-select`/`list-style` op `.admin-kop`.
- **Mobiel:** de lijst en de terugknop staan in `@media screen and (max-width: 768px)` (niet in print); de tabbalk is daar verborgen. De kopknop (inline `margin: 8px 16px`) krijgt op mobiel `margin: 8px 0 !important` en de titel `white-space: nowrap`, anders brak de titel over twee regels (`!important` is nodig tegen de inline stijl; zelfde reden als in patch 79).
- **Print:** `@media print` toont alle secties (`display: block`) en verbergt tabs, lijst en terugknop; het enige verschil met de oude afdruk zijn de ▾-pijltjes (230 pixels in een kolom van 8 px).
- **Testmethode (nieuw geleerd):** het HTML-bestand heeft twee `</main>`; neem voor een bereik rond `#view-admin` het eerste `</main>` ná `id="view-admin"` (`n.index('</main>', a)`), anders is het bereik leeg en lijkt een telling "0 gevonden" te slagen. Meet printverschillen met een bounding box en het aantal afwijkende pixels om te bewijzen dat alleen de verwachte plek verschilt. Test "schalen" met `page.set_viewport_size()` zonder de pagina te herladen.
- **Terugdraaien:** Revert op de commit van patch 87, of terug naar tag `ui-M`.

### Patch 86: Atleten (patch 86, okt 2026)
Derde patch met nieuwe JavaScript uit de open mockup-onderdelen (reeks patch 83–95, zonder Home). Geen databasewijziging. Tag `ui-L` staat op de commit vóór deze patch (patch 85, `bc47ded`). Direct na de tests gecommit (Atleten is geen live-kritiek scherm). De [data]-onderdelen van Atleten (onderdelen per atleet, geboortejaar-chip) volgen in patch 93.
- **⋯-menu:** `renderAtleten()` zet per rij een `.atleet-menu-knop` (niet in selectiemodus; dan blijft het pijltje) en de rijklasse `heeft-menu`. Eén los menu `#atleet-menu` staat direct voor `#toast` (vast gepositioneerd, `z-index: 320`; zo knipt `overflow: hidden` van de lijst of een transform van de view het niet af). `toggleAtleetMenu(id, event)` vult en positioneert het menu (onder de knop, rechts uitgelijnd, bij gebrek aan ruimte erboven, altijd binnen het scherm); `atleetMenuActie(actie, id)` sluit het menu en voert uit: `openAtleetModal(id)`, of `showTab("prestaties")` + filter `#prestatie-atleet-filter` zetten + `renderPrestaties()`, of `editAtleetId = id` + `deleteAtleet()` (zelfde bevestigingsvraag en verwijdering als in het bewerkvenster). De luisteraars (`click`, `keydown`, `scroll` capture, `resize`) worden bij het eerste openen eenmalig gekoppeld (vlag `window.__atleetMenuLuisteraars`); een scroll sluit het menu bewust.
- **Ondertitel:** `#atleten-sub` in de paginakop, gevuld in `renderAtleten()` met het aantal jongens en meisjes van de hele categorie (niet van de gefilterde lijst); op mobiel via `order` direct onder de titel.
- **Doorstroming:** het paneel `#doorstroom-paneel` is ingeklapt tot een balk (`.doorstroom-kop`); de klasse `open` op het paneel toont `#doorstroom-lijst` (alleen met CSS verborgen, dus de vinkjes `doorstroom-chk-n` en `startDoorstroming()` werken ongewijzigd). `werkDoorstroomKopBij()` (aangeroepen vanuit `laadDoorstroming()`) vult `#doorstroom-kop-tekst`; de knop in de melding bovenaan (`renderDoorstroomMelding()`) voegt de klasse `open` toe.
- **Zwevende plusknop (belangrijk):** op mobiel zweeft de ronde `.fab-mobiel` rechtsonder (`bottom: 60px + veilige zone + 16px`, 52 px hoog, dus tot ± 140 px boven de onderkant). De onderruimte van de schermen was kleiner (88 px), waardoor de onderste atleet-rij (nu met aanklikbare ⋯-knop) en de rechterkant van de onderste wedstrijdkaart eronder lagen. Nu `padding-bottom: calc(60px + veilige zone + 16px + 52px + 12px)` op `#view-atleten` en `#view-wedstrijden`, alleen op scherm en op mobiel. `#view-prestaties` en `#view-wedstrijddag` hebben dezelfde zwevende knop en zijn bewust niet aangepast; bij een volgende patch met aanklikbare elementen onderaan daar opnieuw meten.
- **Print:** het ⋯, de ondertitel en het menu zijn in print verborgen; het pijltje blijft (de regel die het op scherm verbergt staat in `@media screen`); de doorstroomlijst is in print altijd zichtbaar.
- **Testmethode (nieuw geleerd):** (1) meet bij elke nieuwe aanklikbare knop op mobiel of de zwevende plusknop of de onderbalk erover ligt: scroll naar de onderkant en vergelijk `getBoundingClientRect()`; Playwright meldt dit als "intercepts pointer events". (2) Een scroll sluit het menu; Playwright scrolt een knop bij `click()` zelf in beeld, dus gebruik voor "menu wisselt van rij" een directe `element.click()` via `evaluate`. (3) Een open menu bedekt de ⋯ van de volgende rijen; test wisselen met een rij die niet bedekt wordt. (4) Een spy op `sb.from` met een Proxy die per keten alle aanroepen verzamelt en pas bij `then` logt (alleen als er een schrijfmethode in zat) geeft vergelijkbare schrijflogs (`atleten: delete() > eq("id","a0") > eq("categorie_id","c1")`) tussen oude en nieuwe route. (5) `contract.py` gebruikt: nieuwe functies in `JS_NIEUW` van `commit_sjabloon.py`, bewust gewijzigde handlers in `HANDLERS_VRIJ`.
- **Terugdraaien:** Revert op de commit van patch 86, of terug naar tag `ui-L`.

### Patch 85: Wedstrijden (patch 85, okt 2026)
Tweede patch met nieuwe JavaScript uit de open mockup-onderdelen (reeks patch 83–95, zonder Home). Geen databasewijziging. Tag `ui-K` staat op de commit vóór deze patch (patch 84, `d7aa662`). Direct na de tests gecommit (Wedstrijden is geen live-kritiek scherm; de knoppen naar Opstelling en Wedstrijddag roepen de bestaande functies aan).
- **Tabs:** `renderWedstrijden()` toont één lijst per tab, gestuurd door de variabele `wedstrijdenTab` ("aankomend" of "afgelopen", standaard aankomend, blijft staan tot de pagina herlaadt). `kiesWedstrijdenTab(tab)` zet de variabele en rendert opnieuw. De tabs gebruiken de bestaande `.segment`/`.segment-knop`-stijl; op mobiel over de volle breedte via `.wedstrijd-tabs`.
- **Ondertitel:** vast element `#wedstrijden-sub` in de paginakop (eigen regel via `flex: 1 1 100%`), gevuld door `renderWedstrijden()`; leeg wanneer er geen wedstrijden zijn.
- **Aftelblokje:** `wedstrijdOverTekst(datum)` geeft "Vandaag", "Morgen", "Over n d" of leeg (geen datum of in het verleden); alleen op aankomende kaarten. Rekent met lokale middernacht, net als `isWedstrijdAfgelopen()`.
- **Knop Opstelling:** `openOpstellingVanWedstrijd(id)` = `showTab("opstelling")` + `openOpstelling(id)` (zelfde patroon als `bekijkOpstelling`, maar bewerkbaar). Klasse `.wedstrijd-opstel-knop` heeft dezelfde accentkleur als `.wedstrijd-live-knop`.
- **Verwijderd (bewust):** `toggleAfgelopen()`, `afgelopenIngeklapt`, de id's `afgelopen-grid` en `afgelopen-chevron` en de CSS van `.wedstrijd-sectie-kop` (+ `.sectie-count`, `.chevron`). `contract.py` meldt deze als verdwenen; dat is verwacht. `.wedstrijd-sectie-leeg` blijft.
- **Print:** tabs, ondertitel en blokje zijn in print verborgen; de afdruk toont alleen de lijst van de gekozen tab (vroeger beide secties).
- **Testmethode (nieuw geleerd):** zet een vaste "vandaag" met een init-script dat `Date` vervangt (`new Date()` zonder argumenten en `Date.now()` geven een vaste tijd) en laad de pagina daarna opnieuw (`add_init_script` + `reload`); dan zijn de aftelteksten voorspelbaar. Voor de oude versie die een bewerkbare opstelling opent: roep `openOpstelling('id')` aan zoals de kaart in de Opstelling-lijst doet (na een alleen-lezen opstelling is stap 1, de lijst, verborgen). `commit_sjabloon.py` kent nu `JS_NIEUW` (nieuwe functies), `JS_VERVANG` (letterlijke vervangingen van oude code) en `HANDLERS_VRIJ` (functies waarvan de handlers bewust wijzigen).
- **Terugdraaien:** Revert op de commit van patch 85, of terug naar tag `ui-K`.

### Patch 84: Punten en Profiel (patch 84, okt 2026)
Eerste patch met nieuwe JavaScript uit de open mockup-onderdelen (reeks patch 83–95, zonder Home). Geen databasewijziging. Tag `ui-J` staat op de commit vóór deze patch (patch 83, `a7e8f24`). Direct na de tests gecommit (afgesproken: Punten en Profiel zijn niet live-kritiek).
- **Punten:** `renderPuntenTabel()` vult twee nieuwe vaste elementen: `#punten-resultaatkaart` (laatst toegevoegde rij = hoogste `id`, met "plek n van m" in de op punten gesorteerde lijst) en `#punten-totaal` (aantal resultaten en som van de punten). De bestaande rij-sjablonen zijn niet aangeraakt (de mobiele kaartjes-CSS leunt op 7 cellen per rij).
- **Profiel:** `werkProfielKopBij()` zet initialen (eerste letter van het eerste en laatste woord; één woord = één letter), naam en rolblokje (`huidigeProfiel.rol`, `data-rol`); aangeroepen vanuit `checkAuth()` (bij het laden) en `slaProfielOp()` (na opslaan). `toonWachtwoordSterkte()` (oninput op `#profiel-ww`) toont alleen een indicatie via `data-niveau` (zwak/redelijk/sterk; korter dan 8 tekens is altijd zwak); de regel in `wijzigWachtwoord()` is niet veranderd, die wist alleen de balk na een gelukte wijziging. `toggleWachtwoordKaart()` klapt op mobiel (≤ 768 px) de kaart open/dicht via de klasse `open`; op desktop doet de functie niets en is de kaart altijd open.
- **Print:** de nieuwe elementen zijn in print verborgen (`@media print`), anders verschenen ze ongestyled in de afdruk (dat bleek bij de pixelvergelijking in printmodus).
- **Testmethode (nieuw geleerd):** zet in pixeltests de muis vóór elke screenshot op een vaste plek (`page.mouse.move(1, 1)`); een andere muispositie geeft een hover-markering op een andere lijstrij en dus schijnbare verschillen. Zet animaties uit met een `<style>` die `animation`/`transition` op `none` zet. Een gedragstest met een Proxy om `sb.from` kan `update`-aanroepen opvangen als spy.
- **Terugdraaien:** Revert op de commit van patch 84, of terug naar tag `ui-J`.

### Opruimpatch I: overbodige schermspecifieke CSS (patch 83, okt 2026)
Alleen CSS (15 regels weg, 3 ingekort) plus de kopregel van dit bestand; scripts byte-voor-byte identiek, contract-check 0 verdwenen/0 nieuw. Tag `ui-I` staat op de commit vóór deze patch (patch 82, `8adaf43`). Eerste patch van de reeks die de open punten uit de werkinstructie (§9) oppakt, met afspraak: eerst bouwen en testen, dan wachten op "commit nu" (de regels raken Wedstrijddag en Opstelling).
- **Waarom weg:** sinds patch 82 hebben de basisregels (`.finale-badge`, `.wedstrijd-card.is-finale`, `.ploeg-punten`, `.atleet-slot.conflict`, `.slot-remove:hover`) zelf geldige `color-mix`-waarden; de overschrijvingen per scherm uit patch 75/77/78 en de `!important`-regel voor de importwaarschuwingen (patch 81, inline stijl is sinds patch 82 gelijk) zetten dezelfde waarde.
- **Wat blijft:** `font-size` en `padding` van `.finale-badge` per scherm, en alle afmetingen/afrondingen (`border-radius`, `padding`) in patch 75/77/78: die wijken wél af van de basis.
- **Methode:** pixelvergelijking oud/nieuw met `test83.py`-achtige opzet: 9 tabs plus Opstelling-detail (ploegen open, conflictslot, hover op verwijderknop), Wedstrijddag-detail en beide waarschuwingen in hun venster; scherm én print; 1280, 390 en 360 px; licht en donker. Print navigeer je met `showTab()` (de navigatie is bij print verborgen, klikken faalt).
- **Terugdraaien:** Revert op de commit van patch 83, of terug naar tag `ui-I`.

### Opruimpatch H: ongeldige var(--kleur)NN-waarden (patch 82, okt 2026)
15 regels gewijzigd, geen nieuwe regels, geen nieuwe functies; contract-check 0 verdwenen/0 nieuw. Tag `ui-H` staat op de commit vóór deze patch (patch 81, `2ce08a2`). Direct na de tests gecommit (afgesproken: alleen kleuren en lijntjes).
- **Het probleem:** `var(--accent)22` (een variabele met een hex-alfa erachter geplakt) is geen geldige CSS. De declaratie is "invalid at computed-value time" en wordt `unset`: een `background` wordt transparant, een `border-bottom: 1px solid <ongeldig>` verdwijnt helemaal, een `border-color` valt terug op `currentcolor` (daarom waren finale-randen wit). Gebruik altijd `color-mix(in srgb, var(--kleur) 15%, transparent)`; hex-alfa → procent: `22`≈13%, `44`≈27%, `66`≈40%, `11`≈7%, `18`≈9%.
- **Gekozen waarden:** tinten 15% (hover 10%, conflict 8%), randen 35–40%; scheidingslijntjes de volle `var(--border)` (zoals bij Prestaties/Admin, de 27% uit het origineel was vrijwel onzichtbaar).
- **Controle op regressies:** zoek opnieuw met de regex `var\(--[a-z0-9]+\)[0-9a-f]{2}\b`; sinds patch 82 zijn er 8 treffers, allemaal uitlegtekst in CSS-commentaar. Elk nieuw treffer buiten commentaar is een fout.
- **Print:** `.onderdeel-rij` krijgt in print zelf `border-bottom: 1px solid #eee` (blok bij regel ±959); de directe afdruk van de Opstelling-pagina is pixel-identiek gemeten. De overschrijvingen per scherm uit patch 75/77/78/81 staan er nog; ze zijn overbodig maar onschadelijk (weggehaald is alleen extra wijziging).
- **Pixelvergelijking als methode:** screenshot van 13 schermen (desktop) en 12 (mobiel) oud tegen nieuw met `PIL.ImageChops.difference`; wacht ≥ 5,8 s na het laden zodat de toast weg is, anders krijg je ruis. Anti-aliasing aan de rand van ronde knoppen geeft enkele pixels verschil zonder betekenis.
- **Niet getest in dit kanaal:** echte telefoon, echte PR-import met een Excel-bestand.
- **Status UI-herontwerp:** afgerond (patch 71–81) plus deze opruimpatch. Alleen nog optioneel: de bewust overgeslagen mockup-onderdelen die JavaScript of nieuwe data vragen.

### UI-herontwerp, patch G: gedeelde vensters/modals (patch 81, okt 2026)
Alleen een CSS-blok (±16 regels); **geen HTML, geen JS**; inline scripts byte-voor-byte identiek aan patch 80; contract-check 0 verdwenen/0 nieuw. Tag `ui-G` staat op de commit vóór deze patch (patch 80, `9cd96a5`). Live gezet nadat Milanovitch "commit nu" zei.
- **Structuur van de vensters:** 16 `.modal-overlay`'s in de vaste HTML (`atleetModal`, `prestatieModal`, `waTeamModal`, `onderdeelModal`, `wdAfrondModal`, `wdAtleetOnderdelenModal`, `uitnodigingModal`, `categorieModal`, `wedstrijdModal`, `programmaModal`, `pdfImportModal`, `finaleImportModal`, `prOverzichtModal`, `noteModal`, `releasenoteImportModal`, `nieuweOpenWedstrijdModal`) plus de aparte `confirmOverlay` (class `confirm-overlay`/`confirm-box`, geopend door `bevestig()`). Open/dicht = class `open` op de overlay (`openModal`/`closeModal`); `display` is altijd `flex`, test dus op de class.
- **Fouten verholpen:** (1) `.modal-actions` kon niet omslaan → Programma-venster op mobiel (3 knoppen) en Afrond-venster met zichtbare `wd-afrond-beeindig-btn` liepen over. (2) `.modal` had alleen op mobiel `max-height: 90vh; overflow-y: auto`; nu overal (inline `max-height`/`overflow` van afzonderlijke vensters wint nog steeds).
- **Waarom het omslaan alleen bij 3+ zichtbare knoppen:** de bevestigingsdialoog en de meeste vensters hebben 2 knoppen die op 360 px *net* passen doordat ze krimpen; met `flex-wrap: wrap` voor alle rijen zouden ze onder elkaar komen. Selector: `.modal-actions:has(> :not([style*="none"]) ~ :not([style*="none"]) ~ :not([style*="none"]))` (3 zichtbare kinderen; het Afrond-venster heeft een door de JS verborgen knop met inline `display:none` als tweede kind, dus `:nth-child(3)` werkt niet).
- **Blur:** `backdrop-filter: blur(4px)` alleen ≥ 769 px (zware effecten op oudere telefoons vermijden). Alles in `@media screen`, zodat print niet verandert (pixel-identiek gemeten met een open venster; wacht in zo'n test tot de toast weg is, anders krijg je ruis).
- **Ongeldige inline CSS:** `#pdf-import-waarschuwing` en `#finale-import-waarschuwing` hebben inline `background:var(--accent2)22`; hersteld met een regel met `!important`, omdat een ongeldige inline waarde de cascade wint en dan "unset" wordt.
- **Test-aanpak:** zoals bij 71–80; vensters openen door `classList.add('open')` voor de maatscan en met de echte knoppen voor de bediening. Valkuilen: een `page.evaluate("… .then(…)")` dat een Promise teruggeeft wacht eindeloos (sluit af met `; 0`), en `pkill -f "<patroon>"` doodt de eigen shell als het patroon in het commando staat (gebruik `kill $PID`). De nep-backend geeft bij het opslaan van een atleet een fout ("Cannot read properties of null (reading 'id')"), identiek in oud en nieuw.
- **Niet getest in dit kanaal:** echt opslaan, toetsenbordgedrag op een echte telefoon, vervaging op een echte telefoon.
- **Bewust niet gebouwd:** bottom sheet op mobiel.
- **UI-herontwerp:** hiermee zijn alle schermen en de gedeelde vensters in de nieuwe stijl. Mogelijke vervolgstappen (nu niet gepland): de resterende `var(--kleur)22/44`-patronen in de CSS en in sjablonen (nog 23 plekken per patch 81; tel opnieuw met de regex `var\(--[a-z0-9]+\)[0-9a-f]{2}\b`), en de bewust overgeslagen mockup-onderdelen die JavaScript of nieuwe data vragen (grafiek, drag & drop, Alle-chip, tabs bij Admin, stappenbalk bij Opstelling).

### UI-herontwerp, patch F2: Admin (patch 80, okt 2026)
Admin met inklapbare secties. Geen databasewijziging; contract-check 0 verdwenen/0 nieuw. Gecommit direct op `main`; tag `ui-F2` staat op de commit vóór deze patch (patch 79, `8bdb0eb`). Niet-live-kritiek scherm: gecommit direct na de tests (afgesproken in de bouwbrief).
- **JS-wijziging, bewust klein:** alleen de sjablonen van `laadAdminUitnodigingen`, `laadAdminGebruikers`, `laadCategorieBeheer` en `laadTrainerCategorieBeheer` (inline stijlen → klassen). Alle `onclick`/`onchange`-handlers per functie gecontroleerd letterlijk gelijk; de rest van het JS is byte-voor-byte identiek aan patch 79 (check: JS zonder deze 4 functies vergelijken).
- **Inklapbaar:** elk paneel is `<details class="detail-panel admin-sectie" open>` + `<summary class="section-label admin-kop">`. Pijltje via `.admin-kop::after`; gedraaid als `details:not([open])`. `<details>` verbergt de inhoud met `content-visibility`: `offsetHeight`/`innerText` zijn dan niet betrouwbaar; meet met `checkVisibility()` en `textContent`. Knoppen in een `<summary>` (bijv. "+ Nieuwe uitnodiging") laten de sectie dicht/open staan; een klik in het midden van een kop raakt op mobiel de knop, klik in tests op de titel (`position`).
- **`#tag-hint-panel`:** `laadOverigTagHint()` zet `style.display = "" | "none"`; dat werkt ook op `<details>` (display:block). Geef het paneel in CSS geen `display` met `!important`.
- **Nieuwe klassen:** `admin-rij` (+ `-nowrap`, `-oud`, `-info`, `-titel`, `-sub`, `-status`), `status-pil` (+ `status-actief|gebruikt|verlopen`), `rol-label`/`rol-admin`, `btn-gevaar`, `admin-trainer*`, `admin-vink*`. Basiswaarden gelijk aan de vervangen inline stijlen; `var(--kleur)22/44` vervangen door `color-mix`.
- **Test-aanpak:** zoals bij 71–79, met een stub die `profielen`, `uitnodigingen`, `trainer_categorieen` en 6 releasenotes kent. Voor Admin: functies vervangen door spies (afsluiten met `;0` zodat Playwright de functie niet uitvoert) en op de echte knoppen klikken; handlers- en tekstvergelijking oud tegen nieuw.
- **Niet getest in dit kanaal:** echt uitnodigen/rol wisselen/verwijderen/toegang wijzigen bij Supabase, Excel-back-up, inloggen/2FA, echte telefoon.
- **Bewust niet gebouwd:** tabs per sectie en pagina-per-sectie op mobiel (JS).
- **Volgende:** de globale modals (`.modal`, `.modal-overlay`, gedeeld door alle schermen: atleet, prestatie, wedstrijd, programma, WhatsApp-keuze, afronden, enz.). Eigen bouwbrief en akkoord; voorgesteld: alleen CSS, scoped per modal-id waar nodig, pas live op een rustig moment.

### UI-herontwerp, patch F1: Punten en Profiel (patch 79, okt 2026)
Alleen vaste HTML + CSS; **inline scripts byte-voor-byte identiek aan patch 78**; contract-check 0 verdwenen/0 nieuw. Gecommit direct op `main`; tag `ui-F1` staat op de commit vóór deze patch (patch 78, `62a675a`). Niet-live-kritiek scherm: gecommit direct na de tests (afgesproken in de bouwbrief).
- **Punten:** `<select id="punten-geslacht" class="segment-select">` blijft de bron (alleen `berekenEnVoegToe()` leest het); de pillen zijn `kiesSegment(this,'punten-geslacht','M'|'V')`. Inline stijlen van labels/velden/knoprij → klassen (`punten-*`); `#punten-fout` houdt zijn inline `display:none` (JS toggelt dat).
- **Mobiele resultaten:** `renderPuntenTabel()` zet inline stijlen op elke cel en de tabel was op 360–390 px ± 518 px breed (kolom Punten buiten beeld, ook zonder mijn patch). Opgelost met alleen CSS in `@media (max-width: 768px)`: `thead` verborgen, `tr` als grid (kolommen `34px 1fr auto auto 36px`), cellen met `nth-child`-posities en `!important` op padding/border. Cellen: 1 rang, 2 label, 3 geslacht, 4 onderdeel, 5 prestatie, 6 punten, 7 verwijderknop. Wijzig je die kolomvolgorde in `renderPuntenTabel()`, pas dan ook deze CSS aan.
- **Profiel:** het ene paneel is twee panelen in `.profiel-kaarten` (2 kolommen op desktop, 1 op mobiel); ids en handlers (`profiel-naam`, `profiel-email`, `profiel-ww`, `slaProfielOp()`, `wijzigWachtwoord()`) ongewijzigd.
- **Test-aanpak:** zoals bij 71–78. Puntenreeks oud tegen nieuw vergeleken (8 gevallen). Voor Profiel moet de nep-backend `auth.getUser` en `auth.updateUser` kennen, anders geeft `slaProfielOp()` een TypeError. Valkuil in tests: `page.evaluate("window.f = function(){…}")` voert de teruggegeven functie uit; geef een expressie die geen functie teruggeeft (bijv. eindig met `;0`).
- **Niet getest in dit kanaal:** echt opslaan/wachtwoord wijzigen bij Supabase, inloggen/2FA, echte telefoon.
- **Bewust niet gebouwd:** totaalrij en resultaatkaart (Punten); avatar, rolblokje, wachtwoordsterkte (Profiel).
- **Volgende:** patch 80 (Admin): CSS plus de sjablonen van `laadAdminUitnodigingen`, `laadAdminGebruikers`, `laadCategorieBeheer` en `laadTrainerCategorieBeheer` (inline stijlen → klassen, herstel van de ongeldige `var(--kleur)22/44` in de statuspillen), eventueel inklapbare secties met `<details>`. Eigen kort akkoord; tag `ui-F2` komt op patch 79. Daarna de globale modals.

### UI-herontwerp, patch E: Opstelling (patch 78, okt 2026)
Alleen CSS + twee kleine dingen in de vaste HTML-schil; **inline scripts byte-voor-byte identiek aan patch 77**; contract-check 0 verdwenen/0 nieuw. Gecommit direct op `main`; tag `ui-E` staat op de commit vóór deze patch (patch 77, `f251c67`).
- **Wat is aangepast:** Jongens/Meisjes-balk (klasse `opstelling-geslacht`; `setOpstellingGeslacht()` wisselt `btn-primary`/`btn-ghost` op `#opstelling-tab-M/V`, de pilstijl hangt daaraan), de knoppenrij (klasse `opstelling-acties`; mobiel grid van 2 kolommen), rondere panelen/ploegen/reserves, wedstrijdlijst (stap 1) met oranje finale-rand.
- **Print-veiligheid:** alle nieuwe opmaak staat in `@media screen`. De twee basisklassen buiten `@media screen` hebben exact de waarden van de vervangen inline stijlen. `printOpstelling()` en `printPloeg()` bouwen een compleet eigen HTML-document (met eigen `<style>`) in `window.open(...)`; ze zijn dus onafhankelijk van de app-CSS. `#print-view` (met `printProgramma`) is een ander mechanisme.
- **Ongeldige CSS binnen dit scherm hersteld:** `.ploeg-punten` (pil), `.atleet-slot.conflict` (tint) en `.slot-remove:hover`; en de witte finale-rand in de wedstrijdlijst. De globale regels zelf (`var(--accent)22` enz.) staan er nog; ze worden alleen binnen `#view-opstelling` overschreven.
- **Test-aanpak:** zoals bij 71–77. Voor de print: `window.open` vervangen door een stub die het geschreven document opvangt, en oud tegen nieuw vergelijken. Knoppen in een test selecteren op hun `onclick` (bijv. `button[onclick="opslaanOpstelling()"]`), niet op tekst: "Opslaan" komt ook in verborgen modals voor.
- **Niet getest in dit kanaal:** echt opslaan naar Supabase, de Excel-export (SheetJS komt van een CDN), de WhatsApp-deeplink op een telefoon, een echte printdialoog, inloggen/2FA.
- **Bewust niet gebouwd:** slepen van atleten, drie kolommen met zijpaneel, stappenbalk/driestaps-flow op mobiel (nieuwe interacties met JS; het werkdocument noemt de stappenbalk "puur visueel").
- **Volgende:** patch F (Punten, Profiel, Admin; laag risico) en tot slot de globale modals (`.modal`, `.modal-overlay`, gedeeld door alle schermen). Eigen bouwbrief en akkoord per patch.

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
