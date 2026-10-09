# Changelog — Sprint U16
*AV Sprint Breda · Atletiekbeheertool*

Alle wijzigingen worden hier bijgehouden, nieuwste bovenaan.
Formaat gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/).

---

## [oktober 2026 — patch 88] — 2026-10-09

### 📋 Opstelling: voortgangsbalk, ploegkeuze, grote schakelaars, onderbalk en samenvatting bij Delen

<!--RELEASENOTE
versie: Patch 88
titel: 📋 Opstelling: voortgangsbalk, ploegkeuze, grote schakelaars, onderbalk en samenvatting bij Delen
type: feature
tags: opstelling
beschrijving: Bij het maken van een opstelling zie je nu bovenaan in drie stappen hoe ver je bent (beschikbaar, ploegen, opslaan en delen). Het aantal ploegen kies je met drie knoppen, beschikbaarheid zet je aan of uit met grote schakelaars, onderaan verschijnt een balk als er nog niet-opgeslagen wijzigingen zijn, en het venster Delen toont eerst een samenvatting van wat je gaat versturen.
-->

Achttiende stap na het UI-herontwerp: Opstelling deel 1. Het opstellen, het opslaan en het opbouwen van de WhatsApp-tekst zijn niet veranderd; er verandert geen enkele databasevraag. Deel 2 (indeling per stap op mobiel, drie ploegen naast elkaar) en deel 3 (slepen) volgen.

**Voortgangsbalk.** Onder de keuze Jongens/Meisjes staan drie stappen met een korte status: **① Beschikbaar** ("5 van 5 beschikbaar"), **② Ploegen** ("9 van 24 plekken gevuld") en **③ Opslaan & delen** ("Opgeslagen", "Niet opgeslagen" of "Nog niets ingevuld"). Een stap krijgt een vinkje als hij klaar is; een tik scrolt naar dat onderdeel. In alleen-lezen is de balk er niet.

**Keuze 1/2/3 ploegen.** De dropdown is vervangen door drie knoppen naast elkaar. Ze doen hetzelfde als de dropdown en blijven kloppen als je tussen Jongens en Meisjes wisselt (het aantal ploegen wordt per geslacht onthouden).

**Grote schakelaars.** Bij "Beschikbare atleten" staan grote aan/uit-schakelaars; de hele rij is aanklikbaar. Elke wijziging wordt direct opgeslagen, precies zoals voorheen.

**Onderbalk "Niet-opgeslagen wijzigingen".** Zodra de indeling (of de reserves) afwijkt van wat het laatst is geladen of opgeslagen, verschijnt onderaan een balk met een knop Opslaan (dezelfde als de bestaande knop). Draai je een wijziging terug, dan verdwijnt de balk weer. Het aantal ploegen telt bewust niet mee: dat is een algemene instelling, geen onderdeel van de opstelling. Beschikbaarheid ook niet, want die wordt direct opgeslagen.

**Samenvatting bij Delen.** Het venster "Welke teams delen?" toont bovenaan de wedstrijd en datum, per team hoeveel plekken gevuld zijn, het aantal reserves en, als er nog niet-opgeslagen wijzigingen zijn, een waarschuwing dat je deelt wat nu op het scherm staat.

#### Technisch

- Geen databasewijziging. Nieuwe functies: `opstellingToestand()`, `neemOpstellingSnapshot()`, `werkOpstellingStatusBij()`, `scrollNaarOpstellingStap()`, `kiesAantalPloegen()` en `vulDeelSamenvatting()`. Kleine wijzigingen in bestaande functies: `laadProgrammaEnOpstelling()` en `opslaanOpstelling()` roepen elk één regel `neemOpstellingSnapshot()` aan, `deelViaWhatsApp()` roept `vulDeelSamenvatting()` aan, en `renderBeschikbaarheid()` gebruikt klassen in plaats van inline stijlen (de handler `toggleBeschikbaar(...)` is letterlijk gelijk). De generatie- en aanvul-logica, de conflictcontrole, het kiezen van atleten, reserves, opslaan, exporteren, afdrukken en het bouwen van de WhatsApp-tekst zijn ongewijzigd. Alle andere JavaScript is byte-voor-byte gelijk aan patch 87.
- "Niet opgeslagen" wordt bepaald door de huidige `opstellingData` (genormaliseerd: gesorteerde sleutels, lege plekken en lege ploegen weggelaten) te vergelijken met de stand van het laatste laden of opslaan, per wedstrijd en geslacht. Een `setInterval` van 500 ms (eenmalig gestart in `neemOpstellingSnapshot()`) ververst de status zolang stap 2 van Opstelling in beeld is; zo worden alle wijzigingsroutes gevangen zonder de render- of opstelfuncties aan te raken. Alle statuscode zit in `try/catch`: een fout daarin kan het laden of opslaan nooit verstoren.
- De dropdown `#aantal-ploegen-select` blijft in de pagina (`setOpstellingGeslacht()` zet er een waarde in) en is op scherm verborgen; de segmentknoppen volgen `aantalPloegenPerGeslacht[actiefGeslacht]`. In print blijft de dropdown zichtbaar en zijn de nieuwe onderdelen verborgen.
- Nieuwe id's: `opstelling-voortgang`, `opstelling-acties`, `opstelling-onderbalk`, `wa-team-samenvatting`; nieuwe handlers `scrollNaarOpstellingStap` en `kiesAantalPloegen`. Contract-check: 0 id's, handlers of functies verdwenen; 4 id's, 2 handlers en 6 functies nieuw.
- De onderbalk is `position: fixed` (`z-index: 90`, onder alle vensters en de onderbalk van de app): op desktop naast de zijbalk, op mobiel direct boven de onderbalk van de app.
- Gecontroleerd (oud tegen nieuw, nep-backend met een spy op alle schrijfaanroepen, desktop en mobiel): de ploegen- en reserves-HTML, de indeling, de beschikbaarheidsrijen en hun handlers zijn gelijk; 1/2/3 ploegen en wisselen van geslacht geven dezelfde uitkomst; schakelaars en "Alles aan/uit" geven dezelfde `upsert`-aanroepen; Automatisch opstellen geeft dezelfde indeling; Opslaan (via de oude knop of de onderbalk) geeft dezelfde `upsert` van dezelfde rijen en dezelfde melding; Delen geeft dezelfde teamlijst en dezelfde WhatsApp-link; alleen-lezen is gelijk en toont de nieuwe onderdelen niet. De onderbalk verschijnt bij een wijziging, verdwijnt na opslaan en ook als je een wijziging terugdraait, en de aantallen in de voortgangsbalk kloppen met een onafhankelijke telling (5 van 5 beschikbaar; 9 van 24 plekken). Pixelvergelijking van alle andere schermen op 1280, 390 en 360 px, licht en donker, scherm en print: identiek; alleen het Opstelling-detail op het scherm is anders (de print daarvan is identiek).
- Niet getest: een echte telefoon, echt opslaan in Supabase en een echte WhatsApp-verzending (alleen de aanroep en de link zijn vergeleken).

## [oktober 2026 — patch 87] — 2026-10-09

### ⚙️ Admin: tabs per sectie op desktop, een pagina per sectie op mobiel

<!--RELEASENOTE
versie: Patch 87
titel: ⚙️ Admin: tabs per sectie op desktop, een pagina per sectie op mobiel
type: feature
tags: administratie
beschrijving: Het scherm Admin is overzichtelijker: op een computer kies je een sectie met een tab (Uitnodigingen, Gebruikers, Categorieën, Toegang, Back-up), op een telefoon zie je eerst een lijst en tik je een sectie open als eigen pagina met een knop terug. Het inklappen van secties is daarmee vervallen.
-->

Zeventiende stap na het UI-herontwerp: Admin uit de lijst met open mockup-onderdelen. "Laatste back-up: …" is een [data]-onderdeel en volgt in patch 94. Geen databasewijziging en geen SQL.

**Desktop.** Bovenaan staat een tabbalk met vijf tabs; je ziet steeds één sectie. "Uitnodigingen" staat actief bij het openen.

**Mobiel.** Admin opent als een lijst met vijf rijen (icoon, titel, korte uitleg, ›). Een tik opent die sectie als eigen pagina met bovenaan "‹ Admin" om terug te gaan. De gekozen sectie blijft staan zolang de app open is. Wissel je van telefoon- naar computerweergave (of andersom), dan past het scherm zich aan: op desktop staat dan de gekozen tab (of de eerste) open, op mobiel de gekozen pagina.

**Overig.** De melding over releasenote-tags (die alleen soms verschijnt) staat nu boven de tabs en is dus op elke tab zichtbaar. De knoppen in de koppen ("+ Nieuwe uitnodiging", "+ Nieuwe categorie") en alle lijsten werken zoals voorheen. Op een telefoon staan titel en knop in de sectiekop nu naast elkaar (de titel brak eerst over twee regels).

#### Technisch

- Geen databasewijziging, geen SQL. Eén nieuwe functie: `kiesAdminSectie(naam)`; die zet alleen het attribuut `data-actief` op `#view-admin` (en scrolt op mobiel naar boven). **Geen enkele bestaande functie is gewijzigd**; alle lijsten worden nog steeds door `laadAdmin()` geladen, ook als hun sectie verborgen is. Alle andere JavaScript is byte-voor-byte gelijk aan patch 86.
- De zichtbaarheid wordt volledig door CSS bepaald uit `data-actief` (`""` = op desktop de eerste tab, op mobiel de lijst); zo werkt het ook bij het verkleinen of draaien van het venster zonder luisteraar.
- De secties zijn geen `<details>`/`<summary>` meer maar gewone `div`'s met `data-admin-pagina`; de CSS voor het inklappen (patch 80: pijltje, draaien, `details.admin-sectie:not([open])`, `::-webkit-details-marker`) is weggehaald. De hintmelding `#tag-hint-panel` is naar boven verplaatst en is zelf geen sectie.
- Nieuwe elementen: `.admin-tabs` (met `data-admin-tab`), `.admin-menu` met `.admin-menu-rij`, `.admin-terug`. Contract-check: 0 id's, handlers of functies verdwenen; 0 nieuwe id's, 1 nieuwe handler en 1 nieuwe functie (`kiesAdminSectie`).
- Print: alle secties staan onder elkaar, zonder tabs en lijst; het enige verschil met de oude afdruk zijn de ▾-pijltjes in de sectiekoppen (230 pixels in een kolom van 8 px breed).
- Gecontroleerd (oud tegen nieuw, nep-backend, desktop en mobiel): de HTML van alle lijsten is identiek; elke tab/pagina toont alleen zijn eigen sectie; de kop-knoppen openen dezelfde vensters (`uitnodigingModal`, `categorieModal`); de back-upknop roept `backupNaarExcel()` aan; de hintmelding blijft op elke sectie zichtbaar; de gekozen sectie blijft staan na een tabwissel; schalen van mobiel naar desktop en terug. Pixelvergelijking van alle andere schermen op 1280, 390 en 360 px, licht en donker, scherm en print: identiek.
- Niet getest: een echte telefoon en een echte back-up-download (alleen de aanroep).

## [oktober 2026 — patch 86] — 2026-10-09

### 🏃 Atleten: ⋯-menu per rij, ondertitel en compacte doorstroombalk

<!--RELEASENOTE
versie: Patch 86
titel: 🏃 Atleten: ⋯-menu per rij, ondertitel en compacte doorstroombalk
type: feature
tags: atleten
beschrijving: Elke atleet heeft nu een ⋯-knop met Bewerken, Prestaties bekijken en Verwijderen. Onder de titel staat hoeveel jongens en meisjes er zijn, en het paneel Doorstroming is een compacte balk die je openklapt met een tik. Op de telefoon is er extra ruimte onder de lijst, zodat de ronde plusknop de laatste rij niet meer afdekt.
-->

Zestiende stap na het UI-herontwerp: Atleten uit de lijst met open mockup-onderdelen (de [data]-onderdelen "onderdelen per atleet" en de geboortejaar-chip volgen in patch 93). Geen databasewijziging en geen SQL.

**⋯-menu per rij.** Rechts in elke atletenrij staat een ⋯-knop met een menu: **Bewerken** (hetzelfde venster als bij een tik op de rij), **Prestaties bekijken** (het scherm Prestaties met die atleet al gekozen) en **Verwijderen** (precies dezelfde bevestigingsvraag en verwijdering als in het bewerkvenster). Het menu sluit bij een klik ernaast, Escape of scrollen en blijft binnen het scherm. De rij zelf blijft klikbaar. In selectiemodus is er geen ⋯ en staat het pijltje zoals voorheen.

**Ondertitel.** Onder de titel staat bijvoorbeeld "6 jongens · 4 meisjes" (de hele categorie, ook als je filtert).

**Doorstroming als compacte balk.** Het paneel is standaard ingeklapt tot één balk met een korte tekst ("1 atleet staat klaar · 1 geblokkeerd"). Een tik klapt de lijst open; de lijst, de vinkjes en de knop "Doorstromen" werken zoals voorheen. De knop "Bekijk doorstroming" in de melding bovenaan de app klapt het paneel meteen open.

**Extra ruimte onder de lijst (mobiel).** De ronde plusknop rechtsonder lag over de onderste atleet (en over de rechterkant van de onderste wedstrijdkaart op Wedstrijden). Op een telefoon is er nu genoeg ruimte onderaan om de onderste rij vrij boven die knop te scrollen; dit geldt voor Atleten en Wedstrijden.

#### Technisch

- Geen databasewijziging, geen SQL. Nieuwe functies: `toggleAtleetMenu()`, `sluitAtleetMenu()`, `atleetMenuActie()`, `toggleDoorstroomPaneel()` en `werkDoorstroomKopBij()`. Aangepast: `renderAtleten()` (ondertitel, ⋯-knop, klasse `heeft-menu`), `laadDoorstroming()` (één regel die de balktekst vult) en `renderDoorstroomMelding()` (de knop klapt het paneel mee open). Alle andere JavaScript is byte-voor-byte gelijk aan patch 85. Verwijderen hergebruikt `deleteAtleet()` en zet daarvoor `editAtleetId`.
- Nieuwe vaste HTML: `#atleten-sub` in de paginakop, `#atleet-menu` (één los, vast gepositioneerd menu direct voor `#toast`, zodat niets het afkapt), en de klikbare kop `.doorstroom-kop` met `#doorstroom-kop-tekst` in het doorstroompaneel. Contract-check: 0 id's, handlers of functies verdwenen; 3 id's, 3 handlers en 5 functies nieuw.
- Het menu sluit via vier luisteraars die bij het eerste openen eenmalig worden gekoppeld (`click`, `keydown`, `scroll` in de capture-fase en `resize`). Het staat op `z-index: 320`, boven het Meer-menu en de onderbalk.
- CSS: nieuwe klassen `.atleet-menu-knop`, `.atleet-menu`, `.doorstroom-kop`, `.doorstroom-kop-tekst`, `.heeft-menu`, `.atleten-sub`; de ondertitelregels van patch 85 gelden nu ook voor Atleten. Alles op scherm; in print zijn het ⋯, de ondertitel en het menu verborgen, staat het pijltje er nog en is de doorstroomlijst altijd open, zodat de afdruk gelijk blijft. De extra onderruimte op mobiel staat in `@media screen and (max-width: 768px)`.
- Gecontroleerd (oud tegen nieuw, nep-backend, desktop en mobiel): rijen en aantallen gelijk; rij-klik en Bewerken geven hetzelfde venster; Prestaties bekijken geeft dezelfde staat als het filter handmatig zetten; Verwijderen toont dezelfde bevestigingsvraag, annuleren doet niets en bevestigen geeft dezelfde schrijfaanroepen (`atleten: delete > eq(id) > eq(categorie_id)`), dezelfde toast en één rij minder; selectiemodus gelijk; doorstroomlijst, vinkjes en de schrijfaanroepen van "Doorstromen" gelijk; menu opent, sluit, wisselt van rij, blijft binnen beeld (ook bij de onderste rij) en ligt boven de onderbalk. Pixelvergelijking van alle andere schermen op 1280, 390 en 360 px, licht en donker, scherm en print: identiek; alleen Atleten (en op mobiel Wedstrijden, door de extra onderruimte) is op het scherm anders.
- Niet getest: een echte telefoon en echt verwijderen of doorstromen in Supabase (alleen de aanroepen zijn vergeleken).

## [oktober 2026 — patch 85] — 2026-10-09

### 🏆 Wedstrijden: tabs Aankomend/Afgelopen, aftelblokje en snelle knop naar de opstelling

<!--RELEASENOTE
versie: Patch 85
titel: 🏆 Wedstrijden: tabs Aankomend/Afgelopen, aftelblokje en snelle knop naar de opstelling
type: feature
tags: wedstrijden
beschrijving: Op het scherm Wedstrijden kies je nu met twee tabs tussen Aankomend en Afgelopen. Aankomende wedstrijden tonen een blokje met "Vandaag", "Morgen" of "Over 12 d", er is een knop Opstelling op de kaart die direct de opstelling opent, en onder de titel staat hoeveel wedstrijden er aankomend en afgelopen zijn.
-->

Vijftiende stap na het UI-herontwerp: Wedstrijden uit de lijst met open mockup-onderdelen. Geen databasewijziging en geen SQL.

**Tabs.** De twee secties onder elkaar (met een inklapbare lijst Afgelopen) zijn vervangen door twee tabs met het aantal erbij: "Aankomend (2)" en "Afgelopen (1)". Je ziet steeds één lijst; de gekozen tab blijft staan zolang de app open is. De sortering (eerstvolgende bovenaan; afgelopen meest recent bovenaan) en het klikken op een afgelopen kaart voor de alleen-lezen opstelling zijn ongewijzigd.

**Aftelblokje.** Aankomende kaarten tonen naast de datum "Vandaag", "Morgen" of "Over n d". Zonder datum geen blokje; afgelopen kaarten krijgen er geen.

**Knop Opstelling.** Aankomende kaarten hebben een knop "📋 Opstelling" die de opstelling van die wedstrijd opent (hetzelfde als via het tabblad Opstelling). Op een telefoon staan Opstelling en Wedstrijddag naast elkaar op de laatste rij.

**Ondertitel.** Onder de titel staat bijvoorbeeld "2 aankomend · 1 afgelopen".

#### Technisch

- Geen databasewijziging, geen SQL. Nieuwe functies: `kiesWedstrijdenTab()`, `openOpstellingVanWedstrijd()` (net als `bekijkOpstelling()`: `showTab("opstelling")` en dan `openOpstelling(id)`) en `wedstrijdOverTekst()`. Aangepast: `renderWedstrijden()` (tabs, ondertitel) en `wedstrijdKaartHtml()` (blokje en knop). Nieuwe variabele `wedstrijdenTab`. Alle andere JavaScript is byte-voor-byte gelijk aan patch 84.
- **Bewust verdwenen:** `toggleAfgelopen()` (functie en handler), de variabele `afgelopenIngeklapt` en de id's `afgelopen-grid` en `afgelopen-chevron`; ze hoorden bij de inklapbare sectie die door de tab is vervangen. Er verwees niets anders naar. Ook de CSS van `.wedstrijd-sectie-kop` (met `.sectie-count` en `.chevron`) is weg; `.wedstrijd-sectie-leeg` blijft in gebruik. Nieuw: id `wedstrijden-sub`, handlers `kiesWedstrijdenTab` en `openOpstellingVanWedstrijd`.
- CSS: nieuwe klassen `.wedstrijden-sub`, `.wedstrijd-tabs`, `.wedstrijd-over`, `.wedstrijd-over-nu`, `.wedstrijd-opstel-knop`. De mobiele regel die Wedstrijddag over de volle breedte zette is weggehaald zodat de laatste rij twee knoppen naast elkaar toont. In print zijn de tabs, de ondertitel en het blokje verborgen; je print nu alleen de lijst van de gekozen tab.
- Gecontroleerd (oud tegen nieuw, nep-backend, vaste datum 9 oktober 2026, desktop en mobiel): dezelfde wedstrijden in dezelfde volgorde per tab; alle oude knoppen blijven en alleen `openOpstellingVanWedstrijd` komt erbij; de alleen-lezen opstelling bij een afgelopen kaart geeft dezelfde staat; de nieuwe knop geeft dezelfde staat als klikken in het tabblad Opstelling; blokjes Vandaag, Morgen, Over 9 d, Over 30 d en geen blokje zonder datum; lege tab Afgelopen en geen wedstrijden. Pixelvergelijking van alle andere schermen op 1280, 390 en 360 px, licht en donker, scherm en print: identiek.
- Niet getest: een echte telefoon en een echte wedstrijddag.

## [oktober 2026 — patch 84] — 2026-10-09

### 🧮 Punten: resultaatkaart en totaal · 👤 Profiel: avatar, rol en wachtwoordsterkte

<!--RELEASENOTE
versie: Patch 84
titel: 🧮 Punten: resultaatkaart en totaal · 👤 Profiel: avatar, rol en wachtwoordsterkte
type: feature
tags: overig
beschrijving: Bij de Puntenrekentool zie je nu direct een grote kaart met het laatst berekende resultaat en onderaan het totaal van alle punten. Je profiel heeft een avatar met je initialen, een blokje met je rol (Admin of Trainer) en een sterktebalk bij het kiezen van een nieuw wachtwoord. Op de telefoon klapt de kaart "Wachtwoord wijzigen" open met een tik.
-->

Veertiende stap na het UI-herontwerp en de eerste patch met nieuwe JavaScript uit de lijst met open mockup-onderdelen (alleen Punten en Profiel). Geen databasewijziging en geen SQL.

**Punten.** Zodra er resultaten in de vergelijking staan, verschijnt bovenaan een grote kaart met de punten van het laatst toegevoegde resultaat (onderdeel, prestatie, label en "plek 2 van 3"), en onder de lijst een totaalrij met het aantal resultaten en de som van alle punten. De tabel zelf, de sortering, verwijderen en "Wis alles" werken zoals voorheen.

**Profiel.** Bovenaan de accountkaart staat een ronde avatar met je initialen, je naam en een blokje met je rol. Onder het wachtwoordveld staat een balkje (zwak, redelijk of sterk) dat meebeweegt terwijl je typt; het is alleen een indicatie, de regel "minimaal 8 tekens" blijft precies hetzelfde en het wachtwoord wordt nergens naartoe gestuurd. Op een telefoon is de kaart "Wachtwoord wijzigen" ingeklapt en klapt open als je erop tikt; op een computer blijft hij gewoon open.

#### Technisch

- Geen databasewijziging, geen SQL. Nieuwe functies: `werkProfielKopBij()`, `toonWachtwoordSterkte()` en `toggleWachtwoordKaart()`. Aangepast: `renderPuntenTabel()` (kaart en totaalrij erbij; de bestaande rijen zijn onveranderd), `checkAuth()` (één regel die de avatar vult), `slaProfielOp()` (ververst de avatar na opslaan) en `wijzigWachtwoord()` (wist de balk na een gelukte wijziging). Alle andere JavaScript is byte-voor-byte gelijk aan patch 83.
- Nieuwe id's: `profiel-avatar`, `profiel-kop-naam`, `profiel-rol`, `profiel-ww-kaart`, `profiel-ww-sterkte`, `profiel-ww-sterkte-tekst`, `punten-resultaatkaart`, `punten-totaal`; nieuwe handlers `toonWachtwoordSterkte` (oninput op `#profiel-ww`) en `toggleWachtwoordKaart` (onclick op de kop van de wachtwoordkaart). Contract-check: 0 id's, handlers of functies verdwenen; 8 id's, 2 handlers en 3 functies nieuw.
- CSS alleen op scherm en alleen voor de nieuwe klassen; in print zijn de nieuwe onderdelen verborgen zodat de afdruk gelijk blijft (pixel-identiek gemeten).
- Gecontroleerd (oud tegen nieuw, nep-backend): alle bestaande gedragingen zijn gelijk (rijen en sortering, foutmeldingen, verwijderen en wissen, de update naar `profielen`, `updateUser` bij een geldig en een te kort wachtwoord, de toasts). Het getoonde totaal en de kaart kloppen met de som en de laatste rij. Pixelvergelijking van alle schermen op 1280, 390 en 360 px, licht en donker, scherm en print: alleen Profiel en Punten-met-resultaten zijn anders (bedoeld).
- Niet getest: een echte wachtwoordwijziging bij Supabase, het gedrag van wachtwoordmanagers, het toetsenbord op een telefoon en een echte telefoon.

## [oktober 2026 — patch 83] — 2026-10-09

### 🧹 Opruimen: overbodige opmaakregels weggehaald

<!--RELEASENOTE
versie: Patch 83
titel: 🧹 Opruimen: overbodige opmaakregels weggehaald
type: update
tags: techniek
beschrijving: Een technische opruiming achter de schermen: een aantal opmaakregels uit eerdere stappen van het herontwerp deed niets meer en is weggehaald. Er verandert niets zichtbaars; alles ziet er hetzelfde uit en werkt hetzelfde.
-->

Dertiende stap (opruimen) na het UI-herontwerp, en de eerste van de reeks die de nog openstaande punten oppakt. Alleen CSS en één tekstregel in de projectnotities; geen functie, handler of database is aangepast.

**Opgeruimd.** Patch 82 herstelde de ongeldige kleurregels in de basis-CSS. Daardoor zetten een aantal schermspecifieke regels uit patch 75, 77, 78 en 81 exact dezelfde waarden als de basis. Die zijn nu weg: de randkleur van finale-kaarten en de tint en rand van de finale-badge (Wedstrijden, Wedstrijddag, Opstelling), de tint van de puntenbadge, een conflictslot en de verwijderknop in een ploeg (Opstelling), en de achtergrond van de importwaarschuwingen (PR-import en finale-import). Wat wél afweek van de basis (afmetingen en afrondingen) staat er nog.

#### Technisch

- Geen databasewijziging, geen SQL. Alle inline scripts zijn byte-voor-byte gelijk aan patch 82. Contract-check: 0 id's, handlers of functies verdwenen en geen nieuwe (271 / 140 / 336).
- 15 CSS-regels verwijderd en 3 regels ingekort (alleen de dubbele `background`/`border` eruit; `font-size` en `padding` van `.finale-badge` blijven).
- Gecontroleerd met een pixelvergelijking oud tegen nieuw: alle 9 tabs, het Opstelling-detail (ploegen open, conflictslot, verwijderknop met hover), het Wedstrijddag-detail en beide importwaarschuwingen in hun venster, op scherm en in printmodus, op 1280, 390 en 360 px in lichte en donkere weergave. Resultaat: pixel-identiek.
- `PROJECTNOTITIES.md`: de kopregel "Laatste update" staat nu op patch 83 (stond nog op patch 71).
- Niet getest: een echte telefoon; de echte PR-import met een Excel-bestand.

## [oktober 2026 — patch 82] — 2026-10-08

### 🧹 Opruimen: ontbrekende lijntjes en tinten hersteld

<!--RELEASENOTE
versie: Patch 82
titel: 🧹 Opruimen: ontbrekende lijntjes en tinten hersteld
type: bugfix
tags: techniek
beschrijving: Een opruimactie van kleine kleurfoutjes. Op een paar plekken ontbraken lijntjes of een lichte kleurtint doordat de oude kleurinstelling niet geldig was: de scheidingslijntjes tussen de onderdelen in een ploeg bij Opstelling, de lijntjes in stap 2 van het PR-overzicht importeren, de lichte tint bij het hoveren over de knopjes in de kop van een ploeg, en de lichte rode achtergrond van het ✕-knopje bij een programmarij. Alles werkt hetzelfde als voorheen: alleen het uiterlijk is veranderd.
-->

Twaalfde stap (opruimen) na het UI-herontwerp. Alleen kleuren en lijntjes; geen functie, handler of database is aangepast.

**Hersteld.** Een regel als `background: var(--accent)22` is geen geldige CSS, waardoor de browser de instelling negeert. Dat gold voor 15 plekken. Nu zijn ze geldig gemaakt (`color-mix(...)` voor tinten, de volle lijnkleur voor scheidingslijntjes). Zichtbaar verandert: de lijntjes tussen onderdeel-rijen in een ploeg (Opstelling), de lijntjes in stap 2 van het PR-overzicht, de hover-tint op de knopjes in de ploegkop, de rode tint achter ✕ bij een programmarij en de lijntjes in de overige tabellen. Op de plekken die ik in eerdere patches al per scherm had overschreven (finale-badge en -rand in de lijsten, ploegpunten, conflict-slot, importwaarschuwingen) is het resultaat gelijk gebleven; daar is alleen de basisdefinitie nu ook geldig.

#### Technisch

- Geen databasewijziging, geen SQL. Contract-check: 0 id's, handlers of functies verdwenen en ook geen nieuwe (271 / 140 / 336). In totaal 15 regels gewijzigd (geen toevoegingen van nieuwe regels): 11 CSS-regels, 2 inline stijlen in de vaste HTML (importwaarschuwingen) en 2 sjablonen in `renderPRImportStap2()` en `addProgrammaRijMet()` (alleen de kleurwaarde in de stijl; de `onclick`-handlers zijn letterlijk gelijk, en de JavaScript buiten die twee functies is byte-voor-byte identiek).
- De acht overgebleven treffers van de zoek-regex `var\(--[a-z0-9]+\)[0-9a-f]{2}\b` zijn uitsluitend uitlegtekst in CSS-commentaar van eerdere patches; er staat geen echte ongeldige instelling meer in het bestand.
- Printweergave: de afdrukregels raken `.onderdeel-rij` (print zet zelf `border-bottom: 1px solid #eee`), `.atleet-slot` en `.slot-remove`. De directe afdruk van de Opstelling-pagina is gemeten pixel-identiek (oud tegen nieuw). `printOpstelling()` en `printPloeg()` bouwen een eigen document en zijn onafhankelijk.
- Gecontroleerd (oud tegen nieuw, nep-backend, pixelvergelijking van 13 schermen op 1280 px en 12 op 390 px): alle schermen pixel-identiek, behalve de bedoelde lijntjes (Opstelling-detail is 1 px per onderdeel-rij hoger: 4 px; Punten subtiele tabellijntjes). Op Atleten mobiel zijn 7 pixels anders door anti-aliasing aan de rand van de ronde plusknop (geen echte wijziging). Specifiek: de scheidingslijn op `.onderdeel-rij` (0 px → 1 px), de hover van `.ploeg-actie-btn` (geen tint → oranje tint), de rode tint op de ✕ bij een programmarij (handler ongewijzigd, rij verdwijnt bij klikken), en stap 2 van het PR-overzicht echt gerenderd met voorbeelddata (lijntjes aanwezig, tekst identiek).
- Niet getest: een echte telefoon; de echte PR-import met een Excel-bestand.

## [oktober 2026 — patch 81] — 2026-10-07

### 🪟 Vensters (modals): betere opmaak en twee fouten verholpen

<!--RELEASENOTE
versie: Patch 81
titel: 🪟 Vensters (modals): betere opmaak en twee fouten verholpen
type: bugfix
tags: techniek
beschrijving: De pop-upvensters (atleet, wedstrijd, programma, afronden en alle andere) zijn opgefrist met ronde hoeken en op de computer een zacht vervaagde achtergrond. Twee fouten zijn verholpen: in het Programma-venster op mobiel viel de knop "Annuleren" half buiten beeld, en op een laag computerscherm konden vensters als "Atleet toevoegen" boven of onder buiten beeld vallen zonder dat je kon scrollen. Ook het afronden van een wedstrijd waarbij "Wedstrijd beëindigen" erbij staat past nu op mobiel. Er is verder niets aan de werking veranderd.
-->

Elfde stap van het UI-herontwerp (patch G: de gedeelde vensters). Alleen CSS; **geen enkele regel JavaScript of HTML is gewijzigd**.

**Fouten verholpen.**
1. *Programma-venster op mobiel.* De knoppenrij met drie knoppen (Annuleren, Afdrukken, Opslaan) kon niet omslaan, waardoor "Annuleren" op 390 px 43 px en op 360 px 72 px buiten het venster viel. Nu slaat de rij om en staan Annuleren en Afdrukken naast elkaar met Opslaan eronder. Hetzelfde probleem had het Afrond-venster van Wedstrijddag zodra de knop "Wedstrijd beëindigen" zichtbaar is (drie knoppen): ook die past nu.
2. *Vensters op een laag scherm.* Op desktop hadden vensters geen maximumhoogte (alleen op mobiel). Op een scherm van 500 px hoog vielen "Atleet toevoegen" (492 px) en "Notitie" (491 px) boven en onder buiten beeld. Nu hebben alle vensters een maximumhoogte van 90% van het scherm en scrollen ze binnen het venster.

**Opmaak.** Ronde hoeken (16 px) en op desktop een zachte vervaging van de achtergrond (niet op mobiel, om haperingen op oudere telefoons te voorkomen). De twee waarschuwingsblokken bij de PDF- en Finale-import hebben weer hun rode tint (die ontbrak door een ongeldige kleurwaarde).

#### Technisch

- Geen databasewijziging, geen SQL, geen HTML, geen JavaScript. De inline scripts zijn byte-voor-byte identiek aan patch 80; contract-check: 0 id's, handlers of functies verdwenen en ook geen nieuwe (271 / 140 / 336). Het is een pure toevoeging van een CSS-blok (±16 regels).
- Alles binnen `@media screen`: de printweergave is pixel-identiek (gemeten met een open venster, oud tegen nieuw; de berekende waarden in print zijn gelijk). Inline `max-height`/`overflow` van afzonderlijke vensters (o.a. Programma, Importvensters) blijft winnen.
- Het omslaan van knoppenrijen is bewust beperkt tot rijen met drie of meer *zichtbare* knoppen: `.modal-actions:has(> :not([style*="none"]) ~ :not([style*="none"]) ~ :not([style*="none"]))`. Rijen met twee zichtbare knoppen (waaronder de bevestigingsdialoog en het Afrond-venster in de gewone situatie) zijn daardoor gemeten identiek aan de oude versie (zelfde hoogte en posities op 390 en 360 px). Een eerdere variant die alle rijen liet omslaan, liet de bevestigingsdialoog op 360 px onnodig onder elkaar staan en is daarom niet gekozen.
- Gecontroleerd (oud tegen nieuw): alle 17 vensters (16 + bevestigingsdialoog) op 1280x720, 1280x500, 390x844 en 360x640: geen enkel venster heeft nog inhoud buiten het venster of buiten beeld; verschillen alleen de bedoelde (ronde hoeken, scrollen op laag scherm, Programma- en Afrond-venster). Echte bediening: openen met de echte knoppen, Annuleren, klikken naast het venster sluit, klikken in het venster sluit niet, de bevestigingsdialoog (ja, nee en de meldingsvariant) geeft dezelfde uitkomsten.
- Niet getest: echt opslaan (de nep-backend geeft bij het opslaan van een atleet in zowel de oude als de nieuwe versie dezelfde foutmelding), het toetsenbordgedrag op een echte telefoon bij het invullen in een venster, en de vervaging op een echte telefoon (staat daar uit).
- Bewust niet gebouwd: vensters als "bottom sheet" op mobiel (raakt het toetsenbordgedrag en is niet op een echte telefoon te testen).

## [oktober 2026 — patch 80] — 2026-10-07

### ⚙️ Admin in de nieuwe stijl, met inklapbare secties

<!--RELEASENOTE
versie: Patch 80
titel: ⚙️ Admin in de nieuwe stijl, met inklapbare secties
type: update
tags: administratie
beschrijving: Het Admin-scherm heeft een nieuwe opmaak. Elke sectie (Uitnodigingen, Gebruikers, Categorieën, Toegang per trainer, Releasenote-tags, Back-up) is nu inklapbaar met een pijltje rechts in de kop, handig op mobiel. De statuslabels Actief, Gebruikt en Verlopen hebben weer hun kleurvlak, de rollen Admin en Trainer zijn duidelijker en de verwijderknoppen hebben een zachte rode rand. Alle knoppen en keuzes doen precies hetzelfde als voorheen: alleen het uiterlijk is veranderd.
-->

Tiende stap van het UI-herontwerp (patch F, deel 2: Admin). Alleen uiterlijk; geen functie, handler of database is aangepast.

**Inklapbare secties.** Elke sectie is een native HTML-element `<details>` (zonder JavaScript). Ze staan standaard open; klik op de titel of het pijltje om in of uit te klappen (ook met het toetsenbord: Enter of spatie). De knoppen in de kop ("+ Nieuwe uitnodiging", "+ Nieuwe categorie") klappen de sectie niet in. De gegevens worden ook geladen als een sectie dicht staat.

**Lijsten.** De statuslabels (Actief, Gebruikt, Verlopen) hebben weer een kleurvlak; de rol (Admin in oranje, Trainer in grijs) en de verwijder- en intrekknoppen met een rode rand zijn consequent in alle lijsten. Rondere panelen (16 px).

#### Technisch

- Geen databasewijziging, geen SQL. Contract-check: 0 id's, handlers of functies verdwenen en ook geen nieuwe (271 / 140 / 336).
- De sjablonen van vier functies zijn aangepast: `laadAdminUitnodigingen`, `laadAdminGebruikers`, `laadCategorieBeheer` en `laadTrainerCategorieBeheer` (inline stijlen → klassen: `admin-rij`, `admin-rij-info`, `admin-rij-titel`, `admin-rij-sub`, `status-pil`, `rol-label`, `btn-gevaar`, `admin-trainer`, `admin-vink` e.a.). Alle `onclick`/`onchange`-handlers in die functies zijn letterlijk gelijk (gecontroleerd per functie); de rest van de JavaScript is byte-voor-byte identiek aan patch 79. Er is één commentaarregel (`// patch 80`) toegevoegd.
- De basisklassen hebben dezelfde waarden als de inline stijlen die ze vervangen. De ongeldige `var(--kleur)22/44`-waarden in de statuslabels en knoprand zijn vervangen door `color-mix(...)`.
- HTML-schil: de zes panelen zijn `<details class="detail-panel admin-sectie" open>` met een `<summary class="section-label admin-kop">`; alle id's (`uitnodigingen-lijst`, `gebruikers-lijst`, `categorieen-lijst`, `trainer-categorie-beheer`, `tag-hint-panel`, enz.) en inline `display` van `#tag-hint-panel` (door `laadOverigTagHint()` gezet) werken ongewijzigd.
- Gecontroleerd (oud tegen nieuw, nep-backend): de lijst van 18 handlers in het Admin-scherm en de tekst van alle lijsten zijn identiek; negen knoppen (kopiëren, intrekken, rol wisselen, gebruiker verwijderen, categorie verwijderen, toegang aan/uit, nieuwe uitnodiging, nieuwe categorie, back-up) roepen dezelfde functie aan met dezelfde argumenten. Inklappen en uitklappen met muis en toetsenbord; een knop in de kop klapt niet in; `laadAdmin()` terwijl een sectie dicht staat laadt de data wel; het tag-paneel verschijnt en verdwijnt via `style.display`; lege toestand ("Geen actieve uitnodigingen."). Op 1280, 390 en 360 px geen horizontale overflow; licht thema.
- Niet getest: echt uitnodigen, rol wisselen, gebruiker of categorie verwijderen en toegang wijzigen bij Supabase; de Excel-back-up; inloggen/2FA; een echte telefoon.
- Bewust niet gebouwd: de tabs per sectie (Uitnodigingen/Gebruikers/…) en de pagina-per-sectie op mobiel uit de mockup (JavaScript); de inklapbare secties zijn daar het alternatief voor.

## [oktober 2026 — patch 79] — 2026-10-07

### 🧮 Punten en Profiel in de nieuwe stijl

<!--RELEASENOTE
versie: Patch 79
titel: 🧮 Punten en Profiel in de nieuwe stijl
type: update
tags: overig
beschrijving: De Puntenrekentool en Mijn profiel hebben een nieuwe opmaak. Bij de puntenrekentool is "Geslacht" nu een keuze met pillen (Jongen / Meisje), staan de velden op mobiel onder elkaar met een brede knop, en zijn de uitkomsten op mobiel compacte kaartjes waarbij de punten gewoon in beeld blijven (die vielen eerder buiten het scherm). Mijn profiel heeft twee kaarten naast elkaar: Accountgegevens en Wachtwoord wijzigen. De berekening zelf is niet aangeraakt: alleen het uiterlijk is veranderd.
-->

Negende stap van het UI-herontwerp (patch F, deel 1: Punten en Profiel). Alleen uiterlijk; **geen enkele regel JavaScript is gewijzigd**.

**Punten.** De velden hebben klassen in plaats van inline stijlen en rondere vormen. "Geslacht" is Jongen/Meisje als pillen; het verborgen keuzeveld blijft de bron, dus de berekening gebruikt precies dezelfde waarde als voorheen. Op mobiel staat het formulier in één kolom met een brede knop. De resultaten staan op mobiel als compacte kaartjes (naam en geslacht bovenaan, onderdeel en prestatie eronder, punten met balkje rechts) in plaats van een tabel die breder was dan het scherm waardoor de punten buiten beeld vielen.

**Profiel.** Twee kaarten naast elkaar op de computer (Accountgegevens | Wachtwoord wijzigen), onder elkaar op mobiel. Dezelfde velden en knoppen.

#### Technisch

- Geen databasewijziging, geen SQL, geen JavaScript. **Alle inline scripts zijn byte-voor-byte identiek aan patch 78**; contract-check: 0 id's, handlers of functies verdwenen en ook geen nieuwe (271 / 140 / 336). De enige nieuwe handlers in de HTML zijn twee aanroepen van de bestaande `kiesSegment()` (patch 73). Het dubbele `id="punten-prestatie"`-attribuut op het prestatieveld is opgeruimd.
- Nieuwe basisklassen (`punten-form`, `punten-label`, `punten-invoer`, `punten-acties`, `punten-fout`) hebben exact de waarden van de inline stijlen die ze vervangen. `#punten-fout` houdt zijn inline `display:none` (de JS zet het zichtbaar).
- De puntentabel op mobiel: alleen CSS (`display:grid` op de rijen, cellen met `!important` omdat `renderPuntenTabel()` inline stijlen zet), alleen op schermen <= 768 px; op de computer is de tabel ongewijzigd. `renderPuntenTabel()` zelf is niet aangeraakt.
- Gecontroleerd (oud tegen nieuw, nep-backend): een reeks van 8 berekeningen (beide geslachten, loop-, spring- en werponderdelen, tijden met minuten) geeft in beide versies exact dezelfde tabel; Enter in het prestatieveld rekent; een lege prestatie geeft "Voer een prestatie in."; de placeholder volgt het onderdeel; een rij verwijderen en "Wis alles"; Profiel: opslaan ("Profiel opgeslagen ✓"), een te kort wachtwoord ("Wachtwoord moet minimaal 8 tekens zijn") en een geldig wachtwoord (roept de wachtwoordwijziging aan, veld wordt leeg) gedragen zich identiek aan de oude versie. Op 1280, 390 en 360 px geen horizontale overflow; licht thema.
- Niet getest: echt opslaan van het profiel en het echt wijzigen van een wachtwoord bij Supabase, inloggen/2FA, een echte telefoon.
- Bewust niet gebouwd (nieuwe logica): de totaalrij en de grote resultaatkaart bij Punten; de avatar, het rolblokje en de wachtwoordsterkte-indicator bij Profiel.

## [oktober 2026 — patch 78] — 2026-10-07

### 📋 Opstelling in de nieuwe stijl

<!--RELEASENOTE
versie: Patch 78
titel: 📋 Opstelling in de nieuwe stijl
type: update
tags: opstelling
beschrijving: Het scherm Opstelling heeft een nieuwe opmaak: de keuze Jongens/Meisjes is een pil, de wedstrijdkaarten, de beschikbaarheid, de ploegen en de reserves zijn ronder en de finale-wedstrijd heeft weer een oranje rand (die was wit). De puntenpil per ploeg en de rode markering van een conflict bij een atleet hebben weer hun kleurvlak. Op mobiel staan de knoppen (Automatisch opstellen, Aanvullen, Opslaan, Exporteren, Afdrukken, Delen via WhatsApp) netjes in twee kolommen. Afdrukken, Excel-export en delen via WhatsApp zijn niet aangeraakt: alleen het uiterlijk is veranderd.
-->

Achtste stap van het UI-herontwerp (patch E: Opstelling). Alleen uiterlijk; **geen enkele regel JavaScript is gewijzigd**.

**Wedstrijdkeuze.** Rondere kaarten; een finale-wedstrijd heeft een oranje rand en een oranje finale-pil (de rand werd wit door een ongeldige kleurwaarde).

**Opstelling zelf.** Jongens/Meisjes als pil. De panelen (beschikbare atleten, ploegen, reserves) hebben ronde hoeken (16 px). De puntenpil per ploeg (bijv. "~728 pts") heeft weer een oranje kleurvlak, en een atleet-slot met een conflict heeft weer een rode tint (die tint werkte niet door een ongeldige kleurwaarde).

**Mobiel.** De zes knoppen staan in een raster van twee kolommen: "Ploegen" met het aantal ploegen bovenaan, "Automatisch opstellen" over de volle breedte, daaronder Aanvullen/Opslaan, Exporteren/Afdrukken en "Delen via WhatsApp" over de volle breedte.

#### Technisch

- Geen databasewijziging, geen SQL, geen JavaScript. **Alle inline scripts zijn byte-voor-byte identiek aan patch 77**; contract-check: 0 id's, handlers of functies verdwenen en ook geen nieuwe (271 / 140 / 336).
- Aangepast: een CSS-blok en twee kleine dingen in de vaste HTML-schil: de Jongens/Meisjes-balk en de knoppenrij kregen een klasse (`opstelling-geslacht`, `opstelling-acties`) in plaats van een inline stijl. Beide basisklassen hebben exact dezelfde waarden als de inline stijlen die ze vervangen.
- Alle nieuwe opmaak staat in `@media screen`, zodat een afdruk niet kan veranderen. De printfuncties `printOpstelling()` en `printPloeg()` schrijven bovendien een volledig eigen document met eigen `<style>` in een apart venster en zijn dus onafhankelijk van de CSS van de app.
- Gecontroleerd (oud tegen nieuw, nep-backend): de door `printOpstelling()` (9850 tekens) en `printPloeg('A')` (4108 tekens) gegenereerde printdocumenten zijn identiek; het printbeeld van het Opstelling-scherm is pixel-identiek; opslaan geeft dezelfde melding; het WhatsApp-keuzevenster opent met dezelfde 3 teamvinkjes.
- Gecontroleerd op 1280, 390 en 360 px: de tabs Jongens/Meisjes wisselen en de beschikbaarheid past zich aan; een atleet (de)selecteren en "Alles aan"; een ploeg openklappen; een slot-keuzelijst openen en een atleet kiezen; "Automatisch opstellen" en "Aanvullen"; de reserve-keuzelijst; alleen-lezen modus van een afgelopen wedstrijd (de bewerkknoppen blijven verborgen); licht thema. Geen console-errors, geen horizontale overflow.
- Niet getest: echt opslaan naar Supabase, de Excel-export (bibliotheek wordt van internet geladen), de WhatsApp-deeplink op een telefoon, een echte printdialoog, inloggen/2FA.
- Bewust niet gebouwd (nieuwe interacties met JavaScript): slepen van atleten, de drie kolommen naast elkaar met een zijpaneel, en de stappenbalk of driestaps-flow op mobiel uit de mockup.

## [oktober 2026 — patch 77] — 2026-10-07

### 🏟️ Wedstrijddag: opfrisbeurt van de buitenkant

<!--RELEASENOTE
versie: Patch 77
titel: 🏟️ Wedstrijddag: opfrisbeurt van de buitenkant
type: update
tags: wedstrijddag
beschrijving: De buitenkant van de Wedstrijddag is opgefrist: de keuzes Jongens/Meisjes en Ploeg A/B/C zijn nu pillen, de kaarten en het overzicht zijn ronder, de badges LIVE en "Individuele modus" hebben dezelfde pilvorm en de finale-wedstrijd heeft in het overzicht weer een oranje rand (die was wit). Op mobiel staat het stadion-icoontje niet meer los boven de titel en is "Open wedstrijd toevoegen" een ronde plusknop. Het invullen van resultaten, de rondes en pogingen, de estafettes en het opslaan met de wachtrij zijn niet aangeraakt: alleen het uiterlijk is veranderd.
-->

Zevende stap van het UI-herontwerp (patch D, deel 2: Wedstrijddag, alleen de buitenkant). Alleen uiterlijk; **geen enkele regel JavaScript is gewijzigd**.

**Overzicht.** Rondere kaarten (16 px). De finale-wedstrijd heeft een oranje rand en een oranje finale-pil (de rand was wit door een ongeldige kleurwaarde). Op mobiel is "➕ Open wedstrijd" een ronde plusknop rechtsonder.

**Invoerscherm.** Jongens/Meisjes en Ploeg A/B/C zijn pillen. De badges LIVE, "Individuele modus" en de tellabels hebben een pilvorm; kaarten, scorebalk en de snel-toevoegen-balk hebben rondere hoeken. De kleuren van de sync-badge per toestand (opgeslagen, bezig, offline) zijn ongewijzigd. Op mobiel staat het stadion-icoontje op dezelfde regel als de titel.

#### Technisch

- Geen databasewijziging, geen SQL, geen JavaScript. **Alle inline scripts zijn byte-voor-byte identiek aan patch 76** (gecontroleerd); contract-check: 0 id's, handlers of functies verdwenen en ook geen nieuwe (271 / 140 / 336).
- Aangepast: een CSS-blok (gescoped op `#view-wedstrijddag` en `#wd-wedstrijd-lijst`) en twee dingen in de vaste HTML-schil: de titelrij van het invoerscherm (inline stijl → klasse `wd-titelrij`) en de knop "Open wedstrijd" (class `fab-mobiel` + `aria-label`, dezelfde `onclick`).
- Bewust niet aangeraakt: alle `wd*`-functies en -sjablonen, `.wd-rij`, `.wd-veld`, `.wd-ronde-*`, `.wd-poging*`, `.wd-dns-btn`, de kleuren van `.wd-sync-badge.*`, de modals.
- `toonWdModusUI()` verbergt de tabs met een inline `display:none`; daarom staat er in de nieuwe CSS bewust geen `!important` op `display`, en is een lege tab-balk verborgen via `:empty`.
- Gecontroleerd: `node --check`, contract-check en een headless render (Chromium) op 1280 en 390 px: overzicht, individuele modus (tabs, scorebalk verborgen; snel-toevoegen zichtbaar), competitiemodus (tabs, scorebalk, kaarten, 5 invoervelden), tabs bedienen (Ploeg B, Meisjes), de ronde plusknop opent "Open wedstrijd", licht thema. Invoerflow met een nep-backend, oude tegen nieuwe versie: een resultaat invullen wordt opgeslagen, een mislukte schrijfactie ("Failed to fetch") komt in de wachtrij (badge "⏳ Synchroniseren…" + wacht-label) en na herstel meldt de app "Wachtrij verstuurd ✓"; **elke stap is identiek aan de oude versie**. Geen console-errors, geen horizontale overflow.
- Niet getest: echt opslaan naar Supabase, echte vliegtuigmodus en synchroniseren, inloggen/2FA, een echte telefoon (iOS), het afronden van een wedstrijd en de modals.
- Bewust niet gebouwd (vraagt nieuwe gegevens of logica): avatars, voortgangsbalk, het blokje "Nu bezig" en de zwevende knop "Afronden" uit de mockup.

## [oktober 2026 — patch 76] — 2026-10-07

### 📐 Gelijke ruimte boven de titels

<!--RELEASENOTE
versie: Patch 76
titel: 📐 Gelijke ruimte boven de titels
type: update
tags: techniek
beschrijving: Op Wedstrijden, Wedstrijddag, Opstelling, Punten, Profiel en Admin stond de titel een stuk lager dan op Home, Atleten en Prestaties (72 px op de computer en 116 px op mobiel, tegen 24 en 14 px). Dat is rechtgetrokken: alle schermen beginnen nu op dezelfde hoogte. De ruimte onderaan, boven de onderbalk, is gelijk gebleven. Alleen het uiterlijk is veranderd.
-->

Zesde stap van het UI-herontwerp (afstemming van de schermschil). Alleen uiterlijk; geen HTML, JavaScript, functie of database is aangepast.

**Wat was er aan de hand.** `<main>` had onderruimte voor de onderbalk op mobiel. De zes schermen die na de eerste `</main>` in het bestand staan, begonnen daaronder en hadden daarbovenop nog een eigen bovenrand. Daardoor stond de inhoud 48 px (computer) of 102 px (mobiel) lager dan bij Home, Atleten en Prestaties.

**Wat is er veranderd.** Vier CSS-regels: `main` heeft zelf geen onderruimte meer; Home, Atleten en Prestaties (de schermen in `main`) krijgen die onderruimte zelf (24 px; op mobiel 60 px + safe-area + 28 px, precies zoals voorheen); de zes schermen buiten `main` verliezen hun eigen bovenrand.

#### Technisch

- Alleen een CSS-blok toegevoegd (14 regels, vóór het print-blok); geen bestaande regel gewijzigd. Contract-check: 271 id's, 140 handlers en 336 functies, 0 verdwenen, 0 nieuw.
- Gemeten (afstand titel tot bovenkant): Wedstrijden/Wedstrijddag/Opstelling/Punten/Profiel/Admin 72 → 24 px op 1280 px en 116 → 14 px op 390 en 360 px; Home/Atleten/Prestaties ongewijzigd (24 / 14 px). De ruimte tussen de laatste inhoud en de onderbalk is op mobiel op alle schermen gelijk gebleven (28 px). Geen horizontale overflow, geen console-errors. Printweergave van de opstelling: de zijbalk blijft verborgen en de inhoud begint 24 px hoger.
- De proef is eerst alleen in de browser uitgeprobeerd (stijl-injectie), daarna als vast CSS-blok in `app.html` gezet.
- Niet getest: een echte telefoon (iOS safe-area onderaan), de echte printdialoog.

## [oktober 2026 — patch 75] — 2026-10-07

### 🏆 Wedstrijden in de nieuwe stijl

<!--RELEASENOTE
versie: Patch 75
titel: 🏆 Wedstrijden in de nieuwe stijl
type: update
tags: wedstrijden
beschrijving: Het scherm Wedstrijden heeft een nieuwe opmaak: rondere kaarten met een duidelijke datum en naam, een finale-badge als oranje pil en een oranje rand om finale-wedstrijden. De knoppen op de kaart staan op mobiel in twee kolommen, met "Wedstrijddag" als brede hoofdknop. "+ Wedstrijd toevoegen" is op mobiel een ronde plusknop rechtsonder. Alleen het uiterlijk is veranderd, alle functies werken als eerst.
-->

Vijfde stap van het UI-herontwerp (patch D, deel 1: Wedstrijden). Alleen uiterlijk; geen functie, berekening of database is aangepast.

**Kaarten.** Rondere kaarten (16 px) met datum, naam en locatie. Bij finale-wedstrijden staat de finale-badge als oranje pil en heeft de kaart een oranje rand (die rand werkte voorheen niet door een ongeldige kleurwaarde). De secties "Aankomende wedstrijden" en "Afgelopen wedstrijden" blijven zoals ze zijn, inclusief het in- en uitklappen van de afgelopen wedstrijden.

**Knoppen.** Kleiner en rustiger op desktop. Op mobiel staan Bewerken, Programma, Importeer PDF en Importeer finale in een raster van twee kolommen, met "Wedstrijddag" als brede oranje hoofdknop eronder. "+ Wedstrijd toevoegen" is op mobiel een ronde plusknop rechtsonder, boven de onderbalk.

#### Technisch

- Geen databasewijziging, geen SQL, geen nieuwe functie. Contract-check: 0 id's, handlers of functies verdwenen en ook geen nieuwe (271 / 140 / 336).
- `wedstrijdKaartHtml()`: alleen inline stijlen zijn vervangen door klassen (`wedstrijd-kop`, `wedstrijd-notitie`, `wedstrijd-acties`, `wedstrijd-live-knop`, `wedstrijd-bekijk`). Alle `onclick`-handlers (`openWedstrijdModal`, `openProgrammaVanWedstrijd`, `openPdfImportModal`, `openFinaleImportModal`, `openWedstrijddag`, `bekijkOpstelling`) staan er letterlijk nog in. `renderWedstrijden()` is niet aangeraakt.
- `.wedstrijd-card` en `.finale-badge` worden ook gebruikt door de Opstelling- en Wedstrijddag-schermen. Alle nieuwe opmaak is daarom gescoped op `#wedstrijden-grid`; de kaarten op die andere schermen zijn gecontroleerd en onveranderd (nog 10 px hoeken, finale-badge nog zonder achtergrond).
- De ronde plusknop hergebruikt de CSS van patch 73/74 (`.fab-mobiel`), nu ook voor `#view-wedstrijden`.
- Gecontroleerd: `node --check`, contract-check en een headless render (Chromium) op 1280, 390 en 360 px met 5 wedstrijden (3 aankomend waarvan 1 finale, 2 afgelopen, plus 1 open wedstrijd die niet getoond hoort te worden, en een zeer lange naam). Elke van de vijf knoppen roept de juiste functie aan met het juiste wedstrijd-id; een klik op een afgelopen kaart roept `bekijkOpstelling` aan; het echte bewerkvenster opent met de juiste gegevens; de afgelopen wedstrijden klappen in en uit; de ronde plusknop opent het venster "Wedstrijd toevoegen". Geen console-errors, geen horizontale overflow.
- Niet getest: inloggen/2FA, echte Supabase-data (de render-test gebruikt een nep-Supabase), echte telefoon (iOS), het echt opslaan van een wedstrijd, het programma en de PDF-/Excel-imports.
- Bewust niet gebouwd: de tabs "Aankomend / Afgelopen", de badge "Over 12 d" en de knop "Opstelling" op de kaart uit de mockup (vragen JavaScript of nieuwe logica).
- Bekend, al aanwezig vóór deze patch: schermen die na de eerste `</main>` staan (Wedstrijden, Wedstrijddag, Opstelling, Punten, Profiel, Admin) hebben boven de titel extra lege ruimte (±48 px op desktop, ±100 px op mobiel), omdat de onderruimte van `<main>` ervoor komt te staan. Nog niet aangepast.

## [oktober 2026 — patch 74] — 2026-10-07

### 📈 Prestaties met tegels

<!--RELEASENOTE
versie: Patch 74
titel: 📈 Prestaties met tegels
type: update
tags: prestaties
beschrijving: Het scherm Prestaties heeft een nieuwe opmaak. De PR's van een atleet staan nu als tegels (onderdeel, groot resultaat, PR-badge) in plaats van in een tabel, ook in de lijst met alle atleten. De ranglijst per onderdeel heeft ronde rangnummers en lijntjes tussen de rijen, en het geslachtsfilter bestaat uit pillen (Alle / Jongens / Meisjes). Op mobiel staat "+ Prestatie invoeren" als ronde plusknop rechtsonder en passen de knoppen bovenaan netjes onder elkaar. De PR-badge heeft weer zijn oranje kleur. Alleen het uiterlijk is veranderd, alle functies werken als eerst.
-->

Vierde stap van het UI-herontwerp (patch C, deel 2: Prestaties). Alleen uiterlijk; geen functie, berekening of database is aangepast.

**PR's als tegels.** Per onderdeel een tegel met de naam, het resultaat groot met eenheid, de PR-badge en de 🗑️-knop. Op mobiel staan ze in twee kolommen. Dit geldt voor zowel de weergave van één atleet als de uitklapbare lijst per atleet. De knop "✏️ PR's bewerken" blijft.

**Ranglijst.** Blijft een tabel, maar met ronde rangnummers, lijntjes tussen de rijen en een lichte markering voor nummer 1.

**Filters.** Alle / Jongens / Meisjes zijn pillen (dezelfde als bij Atleten). De keuzelijsten voor atleet en onderdeel staan op mobiel onder elkaar.

**Kop.** Alle knoppen blijven bereikbaar (PR's exporteren, PR-overzicht importeren, Nieuw onderdeel, + Prestatie invoeren). Op mobiel staan ze in twee kolommen en is "+ Prestatie invoeren" een ronde plusknop rechtsonder, boven de onderbalk.

**Bugfix: PR-badge zonder kleur.** `.pr-badge` gebruikte het ongeldige patroon `var(--accent)22`; vervangen door `color-mix(...)`. Daardoor had de badge geen kleurvlak. Ook de lijntjes tussen tabelrijen (`var(--border)44`) bleken ongeldig; op dit scherm hersteld.

#### Technisch

- Geen databasewijziging, geen SQL, geen nieuwe functie. Contract-check: 0 id's, handlers of functies verdwenen en ook geen nieuwe (271 / 140 / 336). Het geslachtsfilter hergebruikt `kiesSegment()` uit patch 73 en blijft het verborgen `<select id="prestatie-geslacht-filter">` aansturen.
- `renderPrestatieTable()`: alleen het HTML-sjabloon is aangepast (tabel → `.pr-tegels` met `.pr-tegel`). Sortering (`DISC_VOLGORDE`), PR-bepaling (`prMap`) en de handlers `deletePrestatie('…')` en `openPrestatieModal(null,'…')` zijn ongewijzigd. `renderOnderdeelRanglijst()` en `renderPrestaties()` zijn niet aangeraakt; de ranglijst is alleen met CSS (gescoped op `#prestaties-content`) herstijld, het rangnummer als rondje via een CSS-teller (`counter(rang)`; de oorspronkelijke tekst in de cel blijft in de DOM).
- De ronde plusknop en de kopknoppen hergebruiken de CSS van patch 73 (`.fab-mobiel`), nu ook voor `#view-prestaties`. De drie secundaire knoppen staan in een grid; daarvoor is `display:grid !important` nodig omdat het kopblok een inline `display:flex` heeft.
- `th`/`td`-stijlen voor tabellen zijn globaal en worden ook door andere schermen gebruikt; de lijnherstel is daarom gescoped op `#prestaties-content`.
- Gecontroleerd: `node --check`, contract-check en een headless render (Chromium) op 1280, 390 en 360 px met 8 atleten en 18 prestaties: accordeon (alle atleten), één atleet (6 tegels, 6 PR-badges), ranglijst (rang 1 t/m 6), geslachtspillen (Meisjes 3, Jongens 4, Alle 7), lege toestand, de verwijderknop roept `deletePrestatie` met het juiste id aan, "PR's bewerken" en de plusknop openen het prestatievenster met de juiste atleet, licht thema. Geen console-errors, geen horizontale overflow.
- Niet getest: inloggen/2FA, echte Supabase-data (de render-test gebruikt een nep-Supabase), echte telefoon (iOS), het echt opslaan of verwijderen van een PR, PR-export en PR-overzicht importeren.
- Bewust niet gebouwd (vraagt data die niet bestaat: geen datum per prestatie): tegels met verbetering ("▲ −0,2") of "Seizoen", de grafiek "Verloop" en de lijst met datums uit de mockup.

## [oktober 2026 — patch 73] — 2026-10-07

### 🏃 Atleten als lijst

<!--RELEASENOTE
versie: Patch 73
titel: 🏃 Atleten als lijst
type: update
tags: atleten
beschrijving: Het scherm Atleten toont de atleten nu als nette lijst in plaats van losse kaarten: avatar met initialen, naam, club, licentienummer en aantal prestaties, met rechts de categorie. Het filter Alle / Jongens / Meisjes bestaat nu uit pillen. De doorstroommelding heeft een oranje rand. Op mobiel staat "+ Atleet toevoegen" als ronde plusknop rechtsonder en passen de knoppen bovenaan op één rij. Alleen het uiterlijk is veranderd, alle functies werken als eerst.
-->

Derde stap van het UI-herontwerp (patch C, deel 1: Atleten). Alleen uiterlijk; geen functie, berekening of database is aangepast.

**Lijst.** Elke atleet is een rij met avatar, naam, "AV Sprint · licentienummer · N prestaties" en rechts de categorie-badge (inclusief de ⚠️ als het geboortejaar niet meer past). Klikken opent het bewerkvenster zoals voorheen. De selectiemodus werkt als voorheen: vinkjes verschijnen in de rijen en geselecteerde rijen krijgen een oranje markering. Op mobiel staat er een pijltje achter elke rij en mag de regel met club en aantal prestaties over twee regels lopen.

**Filter.** Alle / Jongens / Meisjes zijn nu pillen. Het zoekveld werkt zoals voorheen en is te combineren met het filter.

**Doorstroming.** Het paneel heeft een oranje rand en een lichte oranje achtergrond; de inhoud en knoppen zijn ongewijzigd.

**Mobiel.** "+ Atleet toevoegen" is een ronde plusknop rechtsonder, boven de onderbalk (dezelfde knop met dezelfde actie). "Selecteren" en "Excel importeren" delen één rij.

#### Technisch

- Geen databasewijziging, geen SQL. Contract-check: 0 id's, handlers of functies verdwenen; één nieuwe functie.
- Nieuwe functie `kiesSegment(knop, selectId, waarde)` in een eigen `<script>`-blok onderaan: zet de waarde van het bestaande (nu verborgen) `<select id="atleten-filter-geslacht">`, markeert de actieve pil en vuurt een `change`-event af, waarna de bestaande `onchange="renderAtleten()"` het filter uitvoert. Het `<select>` met id en opties blijft dus de enige bron van waarheid; `renderAtleten()` leest het nog steeds uit. Geen enkele andere code zet die waarde (gecontroleerd).
- `renderAtleten()`: alleen het HTML-sjabloon is aangepast. De rijen houden class `card`, `data-id`, de `onclick`-handlers en `.card-checkbox`, zodat `toggleSelectie()` en de selectiemodus ongewijzigd werken. Nieuwe klassen: `atleet-rij`, `atleet-avatar`, `atleet-info`, `atleet-aantal`, `atleet-chevron`.
- CSS is gescoped op `#atleten-grid`/`#view-atleten`: `.card` en `.grid` worden ook door Wedstrijden en Opstelling gebruikt en zijn dus niet aangepast.
- De ronde plusknop is een CSS-vorm van de bestaande knop (`class="fab-mobiel"`, `aria-label` toegevoegd); z-index 150, onder de modals (200+) en de Meer-menu (305+).
- De generieke `.segment`/`.segment-knop`-stijl is bedoeld om ook bij Prestaties te gebruiken (patch 74).
- Gecontroleerd: `node --check`, contract-check en een headless render (Chromium) op 1280, 390 en 360 px met 12 atleten (incl. een zeer lange naam en een doorstroomkandidaat): filters (Jongens 9, Meisjes 3, Alle 12), zoeken, combinatie zoek + filter, lege uitkomst, klik op rij opent het bewerkvenster, selectiemodus (vinkjes, teller), ronde plusknop opent "Atleet toevoegen", licht thema. Geen console-errors, geen horizontale overflow.
- Niet getest: inloggen/2FA, echte Supabase-data (de render-test gebruikt een nep-Supabase met voorbeeldatleten), echte telefoon (iOS safe-area), het echt opslaan, bewerken of verwijderen van een atleet, Excel-import en het uitvoeren van een doorstroming.

## [oktober 2026 — patch 72] — 2026-10-07

### 🏠 Nieuwe Home: releasenotes in kaarten

<!--RELEASENOTE
versie: Patch 72
titel: 🏠 Nieuwe Home: releasenotes in kaarten
type: update
tags: techniek
beschrijving: De beginpagina is opnieuw opgemaakt. Het logo staat compacter bovenaan en de releasenotes staan in nieuwe, ronde kaarten met een gekleurd label per type (feature, bugfix, update). De filterknoppen zijn pillen die je op mobiel zijwaarts kunt schuiven. De knoppen bij de releasenotes breken op mobiel netjes af, zodat niets meer buiten het scherm valt, en de categorie-wissel krijgt op mobiel een eigen rij. Alleen het uiterlijk is veranderd, alle functies werken als eerst.
-->

Tweede stap van het UI-herontwerp (patch B: Home, voorstel 2). Alleen uiterlijk; geen functie, berekening of database is aangepast.

**Logo en ondertitel.** Het SVG-logo is ongewijzigd, maar staat nu zonder de grote lege ruimte eronder (voorheen 45% van het scherm), zodat de releasenotes meteen zichtbaar zijn. Op desktop ±380 px breed, op mobiel ±300 px.

**Releasenotes.** Kop met titel links en de beheerknoppen (Archief, Uit GitHub, Automatisch taggen, + Toevoegen) rechts; die zijn nog steeds alleen voor admins zichtbaar. Op mobiel komen de knoppen onder de titel te staan en breken ze af, waardoor de rij niet meer breder is dan het scherm. De kaarten zijn ronder (16 px) met een type-label als gekleurde pil, titel, versie en datum, beschrijving en tag-pillen. Op mobiel staan versie en datum onder de titel.

**Tag-filter.** De chips zijn pillen; op mobiel vormen ze één rij die je zijwaarts kunt schuiven. Een actieve chip heeft nu weer zichtbaar een oranje achtergrond.

**Categorie-wissel op mobiel.** Bij twee of meer categorieën krijgt de wissel een eigen, zijwaarts scrollbare rij onder de bovenbalk in plaats van buiten het scherm te vallen. Met één categorie is de bovenbalk ongewijzigd (56 px). Op smalle telefoons (≤380 px) is de bovenbalk iets compacter.

**Bugfix: type-labels zonder kleur.** De CSS gebruikte het patroon `var(--kleur)22`, dat geen geldige CSS is; daardoor hadden de type-labels en de actieve tag-chip nooit een kleurvlak. Vervangen door `color-mix(...)`. Dit is hersteld voor de Home-onderdelen en de tag-keuze in het notitievenster.

#### Technisch

- Geen databasewijziging, geen SQL, geen nieuwe JavaScript. Contract-check: 0 id's, handlers of functies verdwenen en ook geen nieuwe (271 / 139 / 335).
- `renderReleasenotesLijst()`: alleen het HTML-sjabloon is aangepast (inline stijlen → klassen `note-titel`, `note-meta`, `note-tekst`, `note-tags`, `note-acties`, `note-verwijder`). `data-note`, de handlers (`bewerkNoteVanuitKnop`, `archiveerNote`, `verwijderNoteVanuitKnop`) en de filter-, archief- en importlogica zijn ongewijzigd.
- De knoppen `btn-archief`, `btn-note-import`, `btn-note-autotag` en `btn-note-toevoegen` houden hun id's en hun inline `display:none` (de JS zet die per rol op zichtbaar). De oranje rand van de importknop zit nu in de klasse `home-btn-accent`.
- `.note-kaart` en `.note-kaart-header` worden ook door de importlijst in het venster "Uit GitHub" gebruikt en zijn daar visueel mee gecontroleerd.
- Er is bewust geen "Alle"-chip toegevoegd (dat vraagt JavaScript). Het filter wissen gaat zoals voorheen door een actieve chip opnieuw aan te tikken.
- Gecontroleerd: `node --check`, contract-check en een headless render (Chromium) op 1280 px en 360/375/380/390/414 px, als admin en als trainer, met 1 en 2 categorieën, in donker en licht thema; tag-filter, archief-knop en het importvenster (met de echte CHANGELOG van GitHub). Geen console-errors, geen horizontale overflow.
- Niet getest: inloggen/2FA, echte Supabase-data (de render-test gebruikt een nep-Supabase met voorbeeldnotities), echte telefoon (iOS), bewerken/archiveren/verwijderen van een echte releasenote.
- Bekend, nog niet aangepakt: in dezelfde CSS staan nog ±27 andere plekken met het ongeldige patroon `var(--kleur)22`/`44` (o.a. badges en meldingen in andere tabs); die worden per tab meegenomen in de volgende patches.

## [oktober 2026 — patch 71] — 2026-10-07

### 🧭 Nieuwe navigatie: zijbalk en onderbalk

<!--RELEASENOTE
versie: Patch 71
titel: 🧭 Nieuwe navigatie: zijbalk en onderbalk
type: update
tags: techniek
beschrijving: De app heeft een nieuwe navigatie. Op de computer staat nu een vaste zijbalk links in plaats van de balk bovenin. Op mobiel heeft de onderbalk vijf knoppen (Home, Atleten, Wedstr., Dag en Meer); onder Meer vind je Prestaties, Opstelling, Punten, Profiel en Admin. De kleuren zijn iets bijgewerkt en de Donker/Licht-knop is weer netjes opgemaakt. Alleen het uiterlijk is veranderd, alle functies werken als eerst.
-->

Eerste stap van het UI-herontwerp (patch A: design tokens en navigatie). Alleen uiterlijk; geen functie, berekening of database is aangepast.

**Computer.** De bovenbalk met tabs is vervangen door een vaste zijbalk links (176 px) met alle schermen onder elkaar. Onderaan staan Vernieuwen, het thema (Donker/Licht/Systeem) en Uitloggen. De categorie-wissel staat onder het logo. De inhoud schuift mee op, ook in de schermen die buiten `<main>` vallen (Punten, Profiel, Admin, Wedstrijddag).

**Mobiel.** De onderbalk heeft nu vijf gelijke knoppen: Home, Atleten, Wedstr., Dag en Meer. De actieve knop is een oranje pil. "Meer" opent een menu met Prestaties, Opstelling, Punten, Profiel en Admin (Admin en Profiel alleen zichtbaar zoals voorheen). "Meer" licht oranje op zolang je in een van die schermen zit.

**Kleuren.** De donkere kleuren zijn iets bijgewerkt naar de nieuwe waarden uit het ontwerp (o.a. accent `#f9a825`). Het lichte thema is ongewijzigd.

**Bugfix: Donker/Licht-knop.** In de CSS ontbrak de selector `.theme-btn {`, waardoor de knop als standaard grijze browserknop werd getoond. Die selector is hersteld.

#### Technisch

- Geen databasewijziging, geen SQL. Geen bestaande functie gewijzigd; alle bestaande id's, handlers en functienamen zijn behouden (contract-check: 0 verdwenen; 268 → 271 id's, 333 → 335 functies).
- Nieuwe design-tokens in `:root`: `--info`, `--radius-sm`, `--radius-lg`, `--sidebar-w`. Dark-waarden aangepast (`--bg #0a0b0f`, `--surface #12141a`, `--surface2 #1a1d26`, `--border #262a36`, `--accent #f9a825`, `--text #f2f4f8`, `--muted #8a91a3`).
- De bestaande `<header>` blijft één element en wordt boven 768 px met CSS een zijbalk (`position: fixed`, `body { padding-left: var(--sidebar-w) }`). Printweergave zet de padding terug op 0. Op mobiel blijft de slanke bovenbalk (logo, categorie-wissel, vernieuwen, thema, uitloggen).
- Nieuwe elementen: `#mob-tab-meer`, `#mob-meer`, `#mob-meer-backdrop` en twee kleine functies `toggleMobMeer()` / `sluitMobMeer()` (alleen openen/sluiten). De knoppen `mob-tab-prestaties/-opstelling/-punten/-profiel/-admin` staan nu in `#mob-meer` met dezelfde id's en roepen `showTab(...)` aan, gevolgd door `sluitMobMeer()`. `showTab()` zelf is ongewijzigd.
- "Meer" oranje bij actief scherm via CSS `body:has(#mob-meer button.active)`; in een oude browser zonder `:has()` is Meer dan alleen niet gemarkeerd.
- Het thema-menu klapt op desktop omhoog (CSS-override met `!important` op het inline-stijl van `#theme-menu`).
- Gecontroleerd: `node --check` op alle inline scripts, contract-check, en een headless render (Chromium) op 1280, 800 en 390 px met een nep-Supabase: alle 9 tabs schakelen, geen console-errors, geen horizontale overflow op desktop/tablet.
- Niet getest: inloggen/2FA, echte Supabase-data, echte telefoon (iOS safe-area), offline-outbox, afdrukken van de opstelling in een echte printdialoog.
- Bekend, al aanwezig vóór deze patch: op mobiel is de rij admin-knoppen op Home breder dan het scherm en de categorie-wissel past niet bij 2+ categorieën. Wordt meegenomen in patch B (Home).

## [september 2026 — patch 70] — 2026-09-15

### 🔁 Reserves opstellen en delen

<!--RELEASENOTE
versie: Patch 70
titel: 🔁 Reserves opstellen en delen
type: feature
tags: opstelling
beschrijving: In de opstellingstab kun je nu per geslacht maximaal 3 reserves opstellen, in een aparte reservebank onder de teams. Reserves horen bij geen onderdeel en hebben dus geen starttijd. Zet je een reserve later in een echt onderdeel, dan verdwijnt hij automatisch van de bank en krijgt hij de starttijd van dat onderdeel. Bij "Delen via WhatsApp" staat een apart vinkje "🔁 Reserves" waarmee je de reserves als los blok meestuurt.
-->

Naast de teams A/B/C kun je nu ook reserves klaarzetten die nog geen vast onderdeel hebben.

**Reservebank onder de teams.** Onderaan de opstelling staat een kaart "🔁 Reserves" met plek voor maximaal 3 atleten per geslacht (dus 3 bij de jongens en 3 bij de meisjes). Je kiest een reserve net als bij een team: klik op "+ Reserve kiezen". In de lijst verschijnen alleen beschikbare atleten van het juiste geslacht die nog niet in een team staan en nog niet reserve zijn.

**Geen starttijd — tot je ze inzet.** Reserves horen bij geen enkel onderdeel, dus ze hebben geen starttijd. Wil je een reserve inzetten? Zet hem gewoon in een onderdeel-vakje bij een team. Hij verdwijnt dan automatisch van de reservebank en krijgt vanzelf de starttijd van dat onderdeel.

**Delen via WhatsApp.** In het keuzescherm van "📲 Delen via WhatsApp" staat onder de teams een apart vinkje "🔁 Reserves". Staat het aan (standaard als er reserves zijn), dan komt onderaan het bericht een los blok met de reserves — zonder starttijd. Je kunt het vinkje uitzetten als je de reserves een keer niet wilt meesturen.

**Automatisch opstellen laat reserves met rust.** "⚡ Automatisch opstellen" en "🧩 Aanvullen" plaatsen reserves niet ongevraagd in een team; ze blijven op de bank staan.

#### Technisch

- Geen databasewijziging. Reserves worden opgeslagen als een extra rij in de bestaande `opstelling`-tabel met `ploeg = "RES"` en `data = { RES_0, RES_1, RES_2 }`. Dit past binnen de bestaande unieke sleutel `(categorie_id, wedstrijd_id, geslacht, ploeg)`.
- Nieuwe constante `MAX_RESERVES` (3) en nieuwe functies: `renderReserves()`, `openReserveKeuze()`, `kiesReserve()`, `clearReserve()`, `reservesLijst()`, `reservesGevuld()`, `verwijderVanReservebank()`, `zitInEenTeam()`.
- `laadProgrammaEnOpstelling()` leest de `RES`-rij apart uit (buiten de programma-opschoonlus). `opslaanOpstelling()` stuurt een extra `RES`-rij mee. `renderPloegen()` roept `renderReserves()` aan.
- `kiesAtleet()` en `kiesAtleetMetConflict()` halen een ingezette reserve automatisch van de bank (`verwijderVanReservebank`).
- `genereerOpstelling()` behoudt de reservebank bij het opnieuw genereren en blokkeert reserves; `aanvullenOpstelling()` blokkeert reserves eveneens.
- WhatsApp: `deelViaWhatsApp()` toont een extra vinkje `#wa-res-cb`; `deelGekozenTeamsViaWhatsApp()` voegt een los reserve-blok toe. De losse per-team knopjes (`deelPloegViaWhatsApp`) zijn ongewijzigd — reserves zijn geslacht-breed, niet teamgebonden. Reserves staan (bewust) niet in de Excel-export of afdruk.
- Niet getest: de echte Supabase opslag/lees van de `RES`-rij, de WhatsApp deep-link op mobiel, en het gedrag met echte atleetdata.

## [september 2026 — patch 69] — 2026-09-14

### 🏆 Prestaties filteren op geslacht

<!--RELEASENOTE
versie: Patch 69
titel: 🏆 Prestaties filteren op geslacht
type: feature
tags: prestaties
beschrijving: In de Prestaties-tab staat naast "atleet" en "onderdeel" nu een derde filter: geslacht (Alle / Jongens / Meisjes). Zo krijg je bijvoorbeeld een ranglijst van alleen de jongens op de 1500m. De onderdeel-lijst past zich aan het gekozen geslacht aan, zodat je geen lege lijsten of niet-passende onderdelen meer ziet.
-->

Bij een ranglijst per onderdeel (geen atleet gekozen, wél een onderdeel) werden jongens en meisjes door elkaar getoond. Dat is nu op te splitsen.

**Extra dropdown.** Naast de bestaande filters "atleet" en "onderdeel" staat nu een derde keuzemenu: Alle / Jongens / Meisjes. Het filter werkt overal: op de ranglijst per onderdeel én op de groepering per atleet.

**Onderdeel-lijst wordt geslacht-bewust.** Kies je "Jongens", dan verschijnen in de onderdeel-dropdown alleen onderdelen waar jongens PR's op hebben (dus geen 80m bijvoorbeeld). Stond er een onderdeel gekozen dat niet bij het nieuwe geslacht past, dan valt de keuze netjes terug op "Alle onderdelen".

#### Technisch

- Nieuwe dropdown `#prestatie-geslacht-filter` in de filterbalk.
- `renderPrestaties()` uitgebreid: hulpfunctie `geslachtVanAtleet(id)`, de onderdeel-dropdown wordt eerst herbouwd op basis van het geslacht en pas daarna wordt `disc` uitgelezen, en de lijst wordt gefilterd op atleet + geslacht + onderdeel.
- Geen databasewijziging — filtert puur op het bestaande `geslacht`-veld van de atleet.

### 👥 Opstelling delen via WhatsApp: kies zelf welke teams

<!--RELEASENOTE
versie: Patch 69
titel: 👥 Kies welke teams je via WhatsApp deelt
type: update
tags: opstelling
beschrijving: Bij "Delen via WhatsApp" verschijnt nu eerst een keuzescherm waarin je met vinkjes aangeeft welke teams je wilt delen (alle teams, of losse teams). Gevulde teams staan al aangevinkt, lege teams staan uitgevinkt met het label "(leeg)". Zo deel je niet langer per ongeluk lege teams mee.
-->

Voorheen deelde de knop altijd álle teams tegelijk — ook teams zonder ingedeelde atleten. Nu kies je zelf.

**Keuzescherm met vinkjes.** De knop "📲 Delen via WhatsApp" opent eerst een klein venster met een vinkje per team plus een "Alle teams"-vinkje dat in één klik alles aan- of uitzet. Gevulde teams staan standaard aangevinkt, lege teams staan uitgevinkt met het label "(leeg)" erachter, zodat je meteen ziet welke teams nog leeg zijn. Vink je niks aan, dan krijg je de melding "Selecteer minstens één team".

**Per-team knopjes blijven.** De losse 📲-knopjes naast elk team blijven gewoon werken zoals je gewend bent.

#### Technisch

- Nieuwe modal `#waTeamModal` met dynamisch gevulde checkboxes (`.wa-team-cb`) op basis van het actieve geslacht en het ingestelde aantal ploegen.
- `deelViaWhatsApp()` opent nu de modal; de tekstopbouw is verplaatst naar `deelGekozenTeamsViaWhatsApp()`, die alleen de aangevinkte teams verwerkt.
- Hulpfuncties `wdIsPloegGevuld(ploeg)`, `waTeamToggleAlle()` en `waTeamSyncAlle()`.
- Geen databasewijziging.

---

## [september 2026 — patch 68] — 2026-09-08

### 🏷️ Tags op releasenotes + filteren op thema

<!--RELEASENOTE
versie: Patch 68
titel: 🏷️ Tags op releasenotes
type: feature
beschrijving: Releasenotes kunnen nu getagd worden op thema (Wedstrijddag, Atleten, Prestaties & PR's, Wedstrijden & Programma, Opstelling, Excel & Import, Techniek & PWA, Administratie, Overig). Boven de lijst op het beginscherm staan klikbare filterchips waarmee je op één of meerdere tags kunt filteren. Bij het toevoegen of bewerken van een releasenote stelt de app zelf tags voor op basis van de tekst — je kunt die suggesties altijd aanpassen voor je opslaat. Alle bestaande releasenotes kun je in één keer laten voorzien van een gok via de nieuwe knop "🏷️ Automatisch taggen".
-->

Elke releasenote had al een type (Feature/Bugfix/Update/Verwijderd), maar geen manier om op onderwerp te filteren. Dat kan nu met tags.

**Vaste tag-lijst.** Er is bewust gekozen voor een vaste set van 9 tags in plaats van vrije tekst, zodat filteren betrouwbaar blijft: 🏃 Wedstrijddag, 👤 Atleten, 🏆 Prestaties & PR's, 📅 Wedstrijden & Programma, 👥 Opstelling, 📥 Excel & Import, ⚙️ Techniek & PWA, 🔐 Administratie en 🐣 Overig als vangnet. Een releasenote mag meerdere tags tegelijk hebben.

**Filteren met chips.** Boven de releasenotes-lijst op het beginscherm staat een rij klikbare chips, één per tag. Klik op een of meerdere tags om te filteren — een releasenote is zichtbaar zodra hij minstens één van de aangevinkte tags heeft (OR-logica). Klik nogmaals om een filter uit te zetten.

**Automatische suggesties.** Zodra je in het toevoeg- of bewerkscherm een titel of beschrijving typt, scant de app de tekst op trefwoorden en vinkt de bijpassende tags alvast aan als suggestie. Je kunt elke suggestie zelf aan- of uitzetten voor je opslaat; zodra je zelf een vinkje aanraakt, past de app de suggesties niet meer automatisch aan.

**Bestaande notes in één keer taggen.** Via de nieuwe knop "🏷️ Automatisch taggen" (alleen zichtbaar voor de admin) doorloopt de app alle releasenotes zonder tags en past hetzelfde trefwoorden-systeem toe. Notes waar niets bij past, krijgen de vangnet-tag "Overig" — corrigeer dat gerust achteraf via ✏️ Bewerken.

**Signaal bij veel "Overig".** In het Admin-tabblad verschijnt automatisch een hintje zodra "Overig" de laatste 2 maanden 5 keer of vaker is gebruikt — een seintje dat een nieuwe vaste tag misschien handig is. De app kiest niet zelf een nieuwe tag; dat blijft aan de admin.

**GitHub-import uitgebreid.** De onzichtbare `<!--RELEASENOTE-->`-marker in de changelog ondersteunt nu ook een `tags:`-regel (komma-gescheiden), zodat een geïmporteerde note meteen de juiste tags meekrijgt.

#### Technisch

- Nieuwe kolom `releasenotes.tags` (`text[]`, default `'{}'`) — migratie hieronder, geen bestaande data raakt kwijt.
- Constante `RELEASE_TAGS` (key/label/keywords) + `RELEASE_TAG_MAP` als opzoektabel.
- `suggereerReleaseTags(titel, beschrijving)`: eenvoudige trefwoorden-match, geeft een array van tag-keys terug. Geen AI, geen externe call — puur lokale tekstmatch.
- `renderTagFilterChips()` / `toggleTagFilter()` / `renderReleasenotesLijst()`: filterlogica los van het ophalen van data (`laatsteReleasenotes` cachet de laatst opgehaalde set, zodat filteren geen nieuwe Supabase-call kost).
- `renderNoteTagCheckboxes()` / `opNoteTagCheckboxGeklikt()` / `onNoteTekstGewijzigd()`: checkboxes in het note-modal, met een `noteTagsHandmatigGewijzigd`-vlag zodat automatische suggesties een bewuste keuze van de gebruiker niet overschrijven.
- `autoTagReleasenotes()`: bulk-update voor bestaande notes zonder tags, met bevestigingsdialoog.
- `laadOverigTagHint()`: query met `.contains("tags", ["overig"])` en `.gte("gepubliceerd_op", …)`, drempel 5 binnen 2 maanden.
- `parseChangelogReleasenotes()` leest nu ook een optioneel `tags:`-veld uit de marker; onbekende tag-namen worden genegeerd.

**Migratie (eenmalig zelf uitvoeren in Supabase SQL-editor):**
```sql
ALTER TABLE public.releasenotes ADD COLUMN tags text[] DEFAULT '{}';
```

**Niet getest (buiten mijn bereik):** de daadwerkelijke Supabase-query's (`.contains()`, de bulk-update in `autoTagReleasenotes`), en of de migratie zonder fouten draait op de bestaande 67 releasenotes.

---

## [september 2026 — patch 67] — 2026-09-04

### 🏃 Estafette-kaart pas zichtbaar na toevoegen, niet meer standaard

<!--RELEASENOTE
versie: Patch 67
titel: 🏃 Estafette pas zichtbaar na toevoegen
type: update
beschrijving: In de individuele modus stond een estafette-kaart eerder altijd op het scherm, ook bij open wedstrijden zonder estafette. Dat is aangepast: een estafette staat nu gewoon tussen de andere onderdelen in de snelinvoer-dropdown bovenaan (herkenbaar met "(estafette)"). Kies je hem, dan verandert de balk naar "ploeg toevoegen" — er is immers geen atleet nodig. Pas als je de eerste ploeg hebt toegevoegd, verschijnt de kaart.
-->

Bij patch 65 kreeg elk estafette-onderdeel automatisch een eigen kaart op de wedstrijddag, ook als er nog geen ploeg was ingevuld. Voor wedstrijden zonder estafette gaf dat onnodige, lege kaarten op het scherm. Dat is nu opgelost: een estafette-kaart verschijnt pas zodra je er zelf een ploeg aan toevoegt — precies zoals de andere onderdelen al werkten.

**Toevoegen via de dropdown.** Een estafette staat gewoon tussen de andere onderdelen in de dropdown van de snelinvoer-balk bovenaan, herkenbaar met het label "(estafette)". Kies je hem, dan schakelt de balk automatisch om: het atleet-veld en het zoekveld worden uitgeschakeld (een estafette heeft geen individuele atleet) en de knop **＋ Toevoegen** voegt meteen de eerste ploeg toe. Vanaf dat moment staat de kaart op het scherm, met de gewone **＋ ploeg toevoegen**-knop erop voor een tweede of derde ploeg.

**Geen databasewijziging.**

#### Technisch

- `vulWdQuickAdd()` laat estafettes weer meedoen in de `#wd-qa-disc`-dropdown (label met `(estafette)`-suffix); de eerdere uitsluiting uit patch 65 is teruggedraaid.
- Nieuwe functie `wdQaDiscWissel()` (aangeroepen via `onchange` op de dropdown, en na elke herbouw van de balk): schakelt het atleet-veld, het zoekveld en het resultaatveld uit zodra een estafette gekozen is, en past de placeholder aan.
- `wdQuickAdd()`: controleert eerst het gekozen onderdeel; is het een estafette, dan wordt de atleet-eis overgeslagen en `wdIndivEstafetteVoegPloegToe()` direct aangeroepen — dezelfde functie die de ＋ ploeg toevoegen-knop op de kaart gebruikt.
- `renderWdIndividueel()`: de estafette-kaart wordt alleen nog opgebouwd als `wdIndivEstafettePloegen()` al minstens één ploeg teruggeeft, net als bij de andere onderdelen (die ook pas een kaart krijgen zodra er een rij is).

---

## [september 2026 — patch 66] — 2026-09-04

### 🐛 Wedstrijddag opende niet meer na het klikken op "live resultaten invoeren"

<!--RELEASENOTE
versie: Patch 66
titel: 🐛 Wedstrijddag opent weer correct
type: bugfix
beschrijving: Na de soepele schermovergangen (patch 63) opende een wedstrijd op de wedstrijddag niet meer: je klikte op "live resultaten invoeren" en belandde meteen weer op het overzicht. Dat is verholpen. De zachte overgang tussen tabbladen blijft gewoon werken.
-->

Sinds de soepele schermovergangen (patch 63) opende een wedstrijd op de wedstrijddag niet meer. Je klikte op **🏟️ Live resultaten invoeren**, maar in plaats van het invoerscherm kwam je meteen weer op het overzicht terecht.

**De oorzaak.** De overgangs-animatie voert zijn schermwissel iets later uit (op de volgende beeldschermverversing). In patch 63 zat daar per ongeluk óók de stap "toon het overzicht" in. Daardoor draaide "toon het overzicht" *ná* "toon het invoerscherm", en won het overzicht — je zag de wedstrijd dus niet opengaan.

**De oplossing.** Alleen de zichtbare schermwissel zit nog in de animatie; alle vervolgstappen draaien weer meteen, in de juiste volgorde. Wedstrijden (open én competitie) openen weer normaal, en de zachte overgang tussen tabbladen blijft behouden.

**Geen databasewijziging.**

#### Technisch

- Regressie uit patch 63: `showTab()` had zijn volledige body in de `document.startViewTransition()`-callback, die asynchroon draait. Daardoor liepen de tab-specifieke laadaanroepen (waaronder `toonWdOverzicht()` voor de wedstrijddag) ná code die de aanroeper direct na `showTab()` uitvoert (`openWedstrijddag()` → `toonWdDetail()`), zodat het detailscherm meteen weer door het overzicht werd overschreven.
- Fix: alleen de display/class-toggle blijft in de View-Transition-callback; de `if (tab === …)`-laadaanroepen draaien nu synchroon ná `wisselMetOvergang()`. De cross-fade werkt onveranderd.

---

## [september 2026 — patch 65] — 2026-09-04

### 🏃 Estafettes invoeren in de individuele modus

<!--RELEASENOTE
versie: Patch 65
titel: 🏃 Estafettetijden bij open wedstrijden
type: feature
beschrijving: Bij open wedstrijden (individuele modus) kun je nu ook estafettetijden invoeren. Elk estafette-onderdeel toont één of meer ploegen (A, B, C…) met een eigen teamtijd; met "＋ ploeg toevoegen" zet je er een bij. Een estafette is een teamtijd, geen individueel PR, dus deze tijden worden bij het afronden nooit als persoonlijk record overgenomen.
-->

Tot nu toe kon je op de wedstrijddag in de **individuele modus** (open wedstrijden) alle onderdelen invoeren behalve estafettes. Die waren bewust weggelaten omdat een estafette een teamtijd is en geen atleet heeft. Vanaf nu kun je ze wél kwijt.

**Eén of meer ploegen per onderdeel.** Elk estafette-onderdeel (bijvoorbeeld 4x80m) krijgt een eigen kaart. Met de knop **＋ ploeg toevoegen** zet je een ploeg neer — Ploeg A, dan Ploeg B, dan Ploeg C, enzovoort. Elke ploeg heeft een eigen teamtijd-veld, en je kunt er ook rondes bij zetten net als bij de andere loop-onderdelen. Een ploeg die je niet meer nodig hebt, verwijder je met het kruisje.

**Nooit een PR.** Een estafette is een teamprestatie, geen individueel record. Deze tijden worden bij het afronden van de wedstrijd dan ook **nooit** als persoonlijk record voorgesteld of overgenomen — precies zoals dat in de competitiemodus al ging.

**Snelinvoer-balk ongemoeid.** De snelinvoer-balk bovenaan (atleet + onderdeel) blijft voor individuele onderdelen; estafettes staan daar niet tussen, want die koppel je niet aan één atleet.

**Geen databasewijziging.** De teamtijden worden opgeslagen in de bestaande tabel `resultaten` met de sleutel `ploeg-A/B/C` en zonder atleet — hetzelfde patroon dat de competitiemodus al gebruikt.

#### Technisch

- `wdIndivDisciplines()` filtert estafettes niet langer weg; `vulWdQuickAdd()` laat ze wél uit de snelinvoer-dropdown (die vereist een atleet).
- `renderWdIndividueel()` rendert estafette-onderdelen via de nieuwe `wdIndivEstafetteKaartHtml()`: een rij per ploeg met `wdVeldenHtml(discipline, "ploeg-X", null, "estafette", false)`, plus een "＋ ploeg toevoegen"-knop; estafette-kaarten worden altijd getoond zodat je een eerste ploeg kunt aanmaken.
- Nieuwe helpers: `wdIndivEstafettePloegen()` (verzamelt bestaande `ploeg-*`-sleutels uit `wdResultaten` + `wdPogingen`), `wdIndivEstafetteVoegPloegToe()` (eerstvolgende vrije letter → lege rij via `wdBewaarResultaat`), `wdIndivEstafetteVerwijder()` (met bevestiging → `wdVerwijderAlles`).
- Opslaan/verwijderen/synchroniseren lopen via de bestaande offline-veilige functies (patch 62); `wdArgs`/`wdLosInvoer` ondersteunden `atleetId = null` al.
- De afrond-flow (`openWdAfronden`) neemt alleen rijen mét een atleet mee als PR-kandidaat, dus estafette-teamtijden worden automatisch overgeslagen — geen wijziging nodig.

---

## [september 2026 — patch 64] — 2026-09-04

### 💾 Eén-klik back-up van je categorie naar Excel

<!--RELEASENOTE
versie: Patch 64
titel: 💾 Back-up naar Excel met één klik
type: feature
beschrijving: In de Admin-tab staat nu een knop "Back-up naar Excel". Die downloadt in één klik alle gegevens van de actieve categorie als één Excel-bestand met drie tabbladen (Atleten, PR's en Wedstrijden). Handig als vangnet om lokaal te bewaren. Er wordt niets in de database gewijzigd — puur lezen en downloaden.
-->

Onderaan de **Admin**-tab staat een nieuw paneel **💾 Back-up & export** met de knop **📥 Back-up naar Excel**. Eén klik en je krijgt een Excel-bestand met alle gegevens van de op dat moment actieve categorie — een vangnet dat je lokaal kunt bewaren of doorsturen.

**Drie tabbladen in het bestand:**
- **Atleten** — naam, geslacht, geboortedatum en bondsnummer
- **PR's** — per atleet de beste prestatie op elk onderdeel van de categorie (dezelfde onderdelen die de app ook elders gebruikt)
- **Wedstrijden** — naam, datum, einddatum, locatie, of het een finale/open wedstrijd is, en de notities

**Bestandsnaam** bevat de categorie en de datum, bijvoorbeeld `sprint-U16-backup-2026-09-04.xlsx`, zodat back-ups van verschillende dagen en categorieën niet door elkaar lopen.

**Alleen lezen.** De knop leest uitsluitend de al ingeladen gegevens en downloadt die; er verandert niets in Supabase. Bij succes zie je een korte bevestiging.

**Geen databasewijziging.**

#### Technisch

- Nieuwe functie `backupNaarExcel()` (naast de bestaande `exporteerPRsExcel()`), die hetzelfde SheetJS-patroon hergebruikt: SheetJS wordt bij een klik on-demand van de CDN geladen als `window.XLSX` nog niet bestaat, met een nette foutmelding als dat mislukt.
- Bouwt een workbook met `XLSX.utils.book_new()` / `aoa_to_sheet` / `book_append_sheet` en schrijft weg met `XLSX.writeFile`.
- Data uit de globale arrays `atleten`, `prestaties` (PR's via `bestePrestatie()` + `formateerResultaatWeergave()`) en `wedstrijden`; onderdelen categorie-afhankelijk via `getDisciplines()`; bestandsnaam en melding via `catNaam()`.
- Knop toegevoegd als vijfde `detail-panel` in `#view-admin`, onder "Toegang per trainer".

---

## [september 2026 — patch 63] — 2026-09-04

### ✨ Soepele schermovergangen bij het wisselen van tab

<!--RELEASENOTE
versie: Patch 63
titel: ✨ Soepele overgang bij het wisselen van tab
type: update
beschrijving: Wissel je tussen tabbladen (Home, Atleten, Wedstrijden…), dan vervaagt het oude scherm nu zacht in het nieuwe in plaats van er hard naartoe te springen. Puur cosmetisch — er verandert niets aan je gegevens. Op oudere browsers die dit niet ondersteunen werkt alles gewoon zoals voorheen.
-->

Tot nu toe sprong de app bij een tabwissel meteen naar het nieuwe scherm. Dat werkt prima, maar voelt wat schokkerig. Vanaf nu vervaagt het oude scherm in ongeveer een vijfde van een seconde zacht in het nieuwe — een subtiele **cross-fade**. Het effect is bewust kort (180 ms) gehouden zodat het nooit in de weg zit, ook niet als je snel achter elkaar tabt.

**Terugval voor oudere browsers.** De overgang gebruikt de moderne View Transitions API. Kent de browser die niet, dan wordt gewoon direct gewisseld — precies zoals vroeger. Niemand krijgt een kapot scherm.

**Respecteert systeeminstellingen.** Heb je in je besturingssysteem "verminderde beweging" aangezet (bijvoorbeeld vanwege bewegingsgevoeligheid), dan wordt de fade automatisch uitgeschakeld.

**Geen databasewijziging.** Deze patch raakt alleen de weergave; er verandert niets in Supabase.

#### Technisch

- Nieuwe hulpfunctie `wisselMetOvergang(doeHet)` met feature-check op `document.startViewTransition`; bij afwezigheid valt hij terug op een directe aanroep.
- `showTab()` draait zijn bestaande wissel-logica nu binnen die wrapper. De 25 aanroepplekken van `showTab` blijven ongewijzigd — alleen de body is aangepast, wat het risico klein houdt.
- De async laadfuncties (`renderWedstrijden`, `laadReleasenotes`, …) worden net als voorheen niet afgewacht, dus de overgang animeert enkel de schermwissel en de data laadt daarna gewoon in.
- CSS: `::view-transition-old(root)`/`::view-transition-new(root)` met `animation-duration: 180ms`, plus een `prefers-reduced-motion`-regel die de animatie uitzet.

---

## [september 2026 — patch 62] — 2026-09-03

### 📴 Offline-first wedstrijddag — niets raakt meer kwijt bij slechte ontvangst

<!--RELEASENOTE
versie: Patch 62
titel: 📴 Wedstrijddag werkt nu ook offline
type: update
beschrijving: Op de baan is de ontvangst vaak slecht. Ingevoerde tijden worden nu eerst op je scherm bewaard en daarna pas verstuurd. Lukt versturen niet, dan komt de wijziging in een lokale wachtrij en wordt hij automatisch nagestuurd zodra je weer verbinding hebt. Rechtsboven zie je een statusbadge en per regel of iets nog op verbinding wacht.
-->

Op een atletiekbaan valt de verbinding regelmatig weg. Tot nu toe ging elke invoer op de wedstrijddag **eerst** naar Supabase en werd het scherm **daarna** pas bijgewerkt. Was je offline, dan mislukte de verzending, stopte de functie met een fout en werd zelfs het scherm niet bijgewerkt — de ingevoerde tijd raakte kwijt. Dat lek is nu gedicht.

**Scherm eerst, versturen daarna.** Elke invoer (en verwijdering) werkt nu meteen je scherm bij. Pas daarna wordt geprobeerd te versturen. Lukt dat niet door de verbinding, dan gaat die ene wijziging in een **lokale wachtrij** in plaats van verloren te gaan. Zodra er weer verbinding is, wordt de wachtrij **op volgorde** alsnog verstuurd — automatisch, en ook wanneer je op 🔄 Vernieuwen drukt.

**Statusbadge rechtsboven.** Naast de knop 🔄 Vernieuwen staat een badge met drie standen: groen **● Alles opgeslagen**, oranje **📴 Offline · N wachten**, of grijs **⏳ Synchroniseren…** terwijl de wachtrij wordt weggewerkt. Per regel verschijnt bovendien een klein oranje label **⏳ wacht op verbinding** zolang die regel nog niet verstuurd is.

**Waarschuwing bij afronden.** Rond je een wedstrijd af terwijl er nog wijzigingen in de wachtrij staan, dan zie je vóór het opslaan van de PR's een oranje waarschuwing met een teller. Doorgaan mag gewoon; de wachtende wijzigingen worden alsnog nagestuurd.

**Geen databasewijziging.** Deze patch raakt alleen het opslaan; de tabel `resultaten` en de kolommen blijven ongewijzigd. Je hoeft dus niets in Supabase aan te passen.

#### Technisch
- Nieuw outbox-laagje op **IndexedDB** (database `sprintu16-outbox`, store `wachtrij` met auto-increment id) — geen externe bibliotheek, de app blijft één bestand zonder build-stap. Helpers: `outboxOpen`, `outboxAdd`, `outboxAlle` (gesorteerd op id = invoervolgorde), `outboxVerwijder`, `outboxAantal`.
- De vier schrijffuncties naar `resultaten` zijn omgedraaid: **eerst** de lokale staat (`wdZetLokaal` / directe `delete` uit `wdResultaten`/`wdPogingen`), **dan** de Supabase-call in een `try/catch`. Bij een netwerk-/offlinefout gaat de wijziging via `wdVerstuurOfWacht` de wachtrij in; een echte serverfout (RLS/constraint) wordt gemeld. Naast `wdBewaarResultaat` en `wdVerwijderResultaat` zijn óók `wdVerwijderRonde` en `wdVerwijderAlles` meegenomen — die hadden hetzelfde lek.
- `synchroniseerWachtrij()` speelt de wachtrij op volgorde af (upsert voor `bewaar`, `delete` voor de drie verwijdertypes), stopt bij het eerste netwerkprobleem en slaat een door de server geweigerd item over (met een `console.warn`) zodat één rot item de rest niet blokkeert. Een vlag `wdSyncBezig` voorkomt dubbel-tegelijk draaien.
- Triggers: `window`-events `online` (badge + sync) en `offline` (badge), synchroniseren bij het openen van de wedstrijddag (`wdInitOutbox`) en aan het begin van `vernieuwWedstrijddag()`, plus een herhaal-timer van 30 s zolang er iets wacht.
- Statusbadge `#wd-sync-badge` in de `.page-header` van `#wd-detail` via `wdRenderSyncBadge()` (leest `navigator.onLine` + een synchrone teller `wdOutboxAantal`). Per-regel label via `wdWachtLabelHtml()` en een `Set` `wdWachtSet` van wachtende `resKey`'s, getoond in de drie render-paden (competitie, estafette, individuele modus). Nieuwe CSS: `.wd-sync-badge` (+ `.ok`/`.offline`/`.bezig`), `.wd-wacht-label`, `.wd-afrond-waarschuwing`.
- `openWdAfronden()` toont bovenin de modal een oranje waarschuwing met teller als `wdOutboxAantal > 0`.

#### Wat niet getest kon worden
De echte offline↔online-overgang (DevTools → Network → Offline), de echte Supabase-synchronisatie en het browsergedrag — die moeten in de browser worden getest. Wel los getest (Node): het toevoegen aan en op volgorde legen van de wachtrij, "laatste telt" bij twee wijzigingen op hetzelfde veld, verwijder-dan-opnieuw-toevoegen (en omgekeerd), stoppen bij een netwerkfout met behoud van de resterende volgorde, het overslaan van een geweigerd item, en de netwerk-vs-serverfout-detectie; plus de drie badge-toestanden.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [augustus 2026 — patch 61] — 2026-08-31

### 📋 Rondes in het hoofdscherm in plaats van een popup

<!--RELEASENOTE
versie: Patch 61
titel: 📋 Rondes direct op de regel
type: update
beschrijving: De rondes staan nu op de regel van de atleet zelf, met de naam van de ronde boven het invoerveld — geen apart schermpje meer. Bij technische onderdelen staat op de regel de beste prestatie en klappen de rondes met hun zes pogingen daaronder open.
-->

Patch 60 zette de rondes achter een knopje 📋 dat een popup opende. Dat werkt, maar op de wedstrijddag wil je alles in één blik zien en zo min mogelijk klikken. De rondes staan nu in het hoofdscherm zelf.

**Loopnummers en estafettes.** Op de regel staat per ronde een invoerveld met de rondenaam erboven: *Serie*, *Halve finale*, *Finale*. Met de keuzelijst **＋ ronde** achter de velden voeg je er een toe; het ✕ achter een rondenaam haalt die ronde weg (met bevestiging als er iets is ingevuld). Het veld met de groene rand is de beste prestatie — die telt voor de punten en de PR's.

**Technische onderdelen.** Zes pogingen × twee rondes passen niet op één regel. Daarom staat op de regel het veld **Beste** (alleen-lezen) en klappen de rondes daaronder open, elk met zes pogingvelden en een X-knop per poging. Met **▾ pogingen** klap je ze in of uit; ook dit blijft in het hoofdscherm.

**Nog geen rondes?** Dan staat er gewoon één veld **Resultaat**, precies zoals je gewend was. Voeg je daarna een ronde toe, dan **verhuist die ingevulde tijd mee naar die ronde** (variant A uit de mockup), zodat elk veld bij één ronde hoort en je nooit een losse tijd overhoudt waarvan je niet meer weet in welke ronde hij gelopen is.

#### Technisch
- Het rondescherm (`#wdRondesModal`) en alles wat daarbij hoorde (`openWdRondes`, `renderWdRondes`, `wdRondeKnopHtml`, `wdNaRondes`, `wdRondeCtx`) is verwijderd en vervangen door invoer in de lijst zelf: `wdVeldenHtml()` bouwt de invoercel van een regel, `wdVeldHtml()` één veld met titel, `wdRondeAddHtml()` de ＋ ronde-keuze en `wdRondeBlokkenHtml()` de uitklapbare pogingblokken onder een technische regel. `wdArgs()` maakt de handler-argumenten.
- Handlers werken nu met expliciete parameters in plaats van een modal-context: `wdLosInvoer()`, `wdRondeInvoer()`, `wdPogingOngeldig()`, `wdRondeErbij()`, `wdRondeWeg()`, `wdTogglePogingen()`. Na elke wijziging tekent `wdHerteken()` de lijst opnieuw (individuele modus of competitie + score).
- **Variant A** zit in `wdRondeErbij()`: is er nog geen ronde en staat er een los resultaat, dan wordt dat resultaat opgeslagen als poging 1 van de nieuwe ronde en wordt de losse rij leeggemaakt (de rij blijft bestaan zodat de atleet in de lijst blijft staan). Een los resultaat dat door oudere data tóch naast rondes staat, wordt nog gewoon getoond als veld "Resultaat" — het verdwijnt dus nergens stilletjes.
- `wdInvoer()`, `wdInvoerEstafette()`, `wdIndivInvoer()` en `wdUpdateRegel()` zijn vervallen; alle invoervelden lopen nu via `wdLosInvoer()` / `wdRondeInvoer()` met een volledige hertekening (dat houdt "beste", de punten en de teamscore kloppend).
- `.wd-rij` heeft een flexibele tweede kolom gekregen (de invoercel) en lijnt onderaan uit, zodat de titels boven de velden passen; onder 640 px staat alles onder elkaar. Nieuwe CSS: `.wd-velden`, `.wd-veld`, `.wd-ronde-add`, `.wd-pog-toggle`.
- Geen databasewijziging — de opslag uit patch 60 (`ronde`, `poging_nr`, status `x`) is ongewijzigd.

#### Wat niet getest kon worden
De echte Supabase-calls en het gedrag in de browser. Wel los getest (34 tests): de opbouw van de invoercel bij loop en techniek, titels en volgorde van de rondes, de groene "beste"-rand op het juiste veld, uitgeschakelde velden bij DNS, de pogingblokken (12 velden + X-knoppen), in-/uitklappen, en het verhuizen van een los resultaat naar de eerste ronde inclusief de "Serie 2"-nummering.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [augustus 2026 — patch 60] — 2026-08-31

### 🔁 Wedstrijddag: rondes en pogingen per onderdeel

<!--RELEASENOTE
versie: Patch 60
titel: 🔁 Rondes en pogingen op de wedstrijddag
type: update
beschrijving: Je kunt nu meerdere rondes per onderdeel invoeren — serie, halve finale en finale bij de loopnummers, kwalificatie en finale bij de technische onderdelen. Bij een technisch onderdeel kun je per ronde tot zes pogingen invullen, met een X voor een ongeldige poging. De app pakt automatisch de beste prestatie voor de punten en de PR's.
-->

Per atleet per onderdeel kon maar één resultaat worden ingevoerd. Nu kan een onderdeel meerdere rondes hebben, en een technische ronde meerdere pogingen. Opbouw: **onderdeel → ronde → poging(en)**.

| Type onderdeel | Rondes (vast lijstje) | Pogingen per ronde |
|---|---|---|
| Looponderdelen (en estafette) | Serie · Halve finale · Finale | 1 |
| Technische onderdelen | Kwalificatie · Finale | maximaal 6, met **X** voor ongeldig |

**Hoe het werkt.** Het invoerveld in de lijst blijft de snelle invoer: is er niets bijzonders, dan typ je daar één resultaat, precies zoals voorheen. Achter elke rij staat een knop **📋** (met het aantal rondes erin) die het rondescherm opent. Daar voeg je rondes toe met **＋ ronde toevoegen** en kies je de naam uit het lijstje dat bij het type onderdeel hoort. Bij een loopnummer krijgt elke ronde één tijdveld, bij een technisch onderdeel zes pogingvelden met een X-knop per poging. Met 🗑️ verwijder je een ronde (met bevestiging als er al iets is ingevuld).

**Het aantal rondes is vrij.** Dezelfde ronde nog een keer toevoegen geeft "Serie 2"; in de lijst staan rondes in de volgorde van het vaste lijstje, met de genummerde variant direct achter zijn basis.

**De beste prestatie telt.** Punten, de ▲ PR!-badge, de teamscore en het bijwerken van PR's bij het afronden gebruiken automatisch de beste geldige prestatie over de snelle invoer én alle rondes en pogingen heen — snelste tijd bij loop, verste of hoogste bij techniek. Een X telt nooit mee, DNS blijft DNS. In de lijst staat onder het PR-regeltje waar die beste prestatie vandaan komt ("beste: 4.55 · Finale"), en in de afrond-lijst staat de ronde tussen haakjes achter het onderdeel.

#### Databasewijziging (eenmalig)
```sql
alter table public.resultaten add column if not exists ronde     text not null default '';
alter table public.resultaten add column if not exists poging_nr int  not null default 1;

alter table public.resultaten drop constraint if exists resultaten_status_check;
alter table public.resultaten
  add constraint resultaten_status_check check (status in ('ok', 'dns', 'x'));

alter table public.resultaten drop constraint if exists resultaten_uniek;
alter table public.resultaten
  add constraint resultaten_uniek
  unique (categorie_id, wedstrijd_id, discipline, sleutel, ronde, poging_nr);

notify pgrst, 'reload schema';
```
Bestaande rijen krijgen `ronde = ''` en `poging_nr = 1` en blijven dus de snelle invoer. **Let op:** deze SQL vervangt de oude 4-koloms unique-constraint. Draai je de SQL wél en de nieuwe app-versie níet (of nog een oude versie uit de browsercache), dan geeft het opslaan `there is no unique or exclusion constraint matching the ON CONFLICT specification` — dan is de code te oud, niet de database.

#### Technisch
- **Nieuwe state:** `wdPogingen` (resKey → rijen mét ronde) naast `wdResultaten` (alleen de snelle invoer), plus `wdRondeCtx` voor het geopende rondescherm. Splitsen gebeurt in `wdZetLokaal()`, die `wdVerwerkResultaten()` per rij aanroept.
- **Nieuwe helpers:** `wdRondeNamen()`, `wdAantalPogingen()`, `wdOnderdeelType()` (hint uit programma/onderdelenlijst, anders afgeleid via `isLagerBeter`), `wdPogingLijst()`, `wdRondesVan()` + `wdRondeSorteer()`, `wdBesteResultaat()` en `wdEffectief()`. Die laatste levert een object in dezelfde vorm als een `wdResultaten`-rij, waardoor `renderWdLijst()`, `renderWdScore()`, `wdUpdateRegel()`, `wdIndivRijHtml()` en `openWdAfronden()` grotendeels ongewijzigd konden blijven: zij vragen punten/PR aan `wdEffectief()`, terwijl het invoerveld nog steeds de snelle invoer toont.
- **Opslaan:** `wdBewaarResultaat(..., ronde = "", poging = 1)` en `wdVerwijderResultaat(..., ronde = "", poging = 1)` — de standaardwaarden houden alle bestaande aanroepen werkend; de upsert gebruikt de nieuwe `onConflict`. Nieuw: `wdVerwijderRonde()` en `wdVerwijderAlles()` (die laatste gebruikt `wdIndivVerwijder`, zodat een atleet verwijderen ook zijn rondes opruimt).
- **Rondescherm:** modal `#wdRondesModal` met `openWdRondes()`, `renderWdRondes()`, `wdRondeToevoegen()`, `wdRondeVerwijderen()`, `wdPogingInvoer()`, `wdPogingOngeldig()` en `wdNaRondes()`. Elke invoer wordt direct opgeslagen. Een ronde toevoegen slaat een lege poging 1 op; die rij houdt de ronde vast tot er een resultaat in staat.
- **Klein meegenomen:** eigen (categorie-brede) onderdelen in de individuele modus kregen altijd type "technisch"; dat wordt nu afgeleid, zodat een eigen tijdonderdeel als loopnummer geldt.
- Nieuwe CSS: `.wd-ronde-btn`, `.wd-ronde-blok`, `.wd-poging*`, `.wd-ronde-toevoegen`, `.wd-beste`; `.wd-rij` heeft een kolom extra (ook mobiel).

> **Historie:** deze wijziging is eerder gepusht als commit `7c83fdd` ("Patch 59: rondes en pogingen"), maar raakte kwijt doordat patch 59 (meerdaagse open wedstrijd) vanuit een oudere kopie van `app.html` werd gecommit. Patch 60 zet hem terug bovenop de meerdaagse-wedstrijdfunctie; beide zitten er nu in.

#### Wat niet getest kon worden
De echte Supabase-calls en het gedrag in de browser. Wel los getest (26 + 14 tests): het splitsen van rijen, de beste prestatie bij tijd- én afstandsonderdelen, X en DNS die niet meetellen, de rondevolgorde inclusief genummerde varianten, de PR-vergelijking, en de opbouw van het rondescherm. JS-syntax gecontroleerd.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md` (`supabase_setup.sql` was al bijgewerkt)

---

## [augustus 2026 — patch 59] — 2026-08-31

### 📅 Open wedstrijd kan nu meerdere dagen duren

<!--RELEASENOTE
versie: Patch 59
titel: 📅 Meerdaagse open wedstrijd
type: feature
beschrijving: Bij het aanmaken van een open wedstrijd in de Wedstrijddag-tab kun je nu aangeven dat de wedstrijd meerdere dagen duurt (bijvoorbeeld een NK). Vink "Meerdaagse wedstrijd" aan en kies een einddatum; de kaart toont dan het hele datumbereik, bijvoorbeeld "13 – 14 juni 2026". Eendaagse wedstrijden blijven precies zoals ze waren.
-->

Sommige open wedstrijden, zoals een nationaal kampioenschap, duren meer dan één dag. Bij het aanmaken van een open wedstrijd (Wedstrijddag-tab → ➕ Open wedstrijd) staat nu onder "Datum" een vinkje **Meerdaagse wedstrijd (bijv. NK)**. Vink je dat aan, dan verschijnt een veld **Einddatum** (standaard de dag ná de startdatum). De kaart in de Wedstrijddag-lijst toont vervolgens het datumbereik, bijv. "13 – 14 juni 2026". Vink je niets aan, dan verandert er niets: eendaagse wedstrijden tonen één datum, precies zoals voorheen.

#### Databasewijziging (eenmalig)
Er is één nieuwe kolom nodig op de tabel `wedstrijden`. Draai deze SQL eenmalig in de Supabase SQL-editor:

```sql
ALTER TABLE public.wedstrijden ADD COLUMN einddatum date;
```

Bestaande wedstrijden houden `einddatum = NULL` (eendaags). Rechten/RLS op `wedstrijden` blijven ongewijzigd — de bestaande categorie-policies gelden ook voor deze kolom. Zolang de kolom nog niet bestaat, geeft het aanmaken van een open wedstrijd een nette foutmelding die naar deze SQL verwijst.

#### Technisch
- Formulier `#nieuweOpenWedstrijdModal`: nieuwe checkbox `#open-wedstrijd-meerdaags` (`onchange="toggleOpenWedstrijdEinddatum()"`) en veld `#open-wedstrijd-einddatum-veld` (standaard verborgen).
- `toggleOpenWedstrijdEinddatum()` toont/verbergt het einddatum-veld en vult bij aanvinken de einddatum standaard met startdatum + 1 dag (lokale datum via `getFullYear/getMonth/getDate`, geen UTC-rollback).
- `openNieuweOpenWedstrijd()` reset de checkbox + einddatum bij elke keer openen.
- `maakOpenWedstrijd()` neemt `einddatum` mee in de insert (`null` bij eendaags) en valideert bij meerdaags dat de einddatum ná de startdatum ligt. Foutmelding-hint uitgebreid voor een ontbrekende `einddatum`-kolom.
- Nieuwe helper `formatDatumBereik(startISO, eindISO)` toont een enkele datum of een net datumbereik (zelfde maand → "13 – 14 juni 2026"; zelfde jaar, andere maand → "30 juni – 2 juli 2026"; ander jaar → beide datums volledig). `datumTekst` in `renderWedstrijddagLijst()` gebruikt nu deze helper, dus de kaarten tonen automatisch het bereik.

**Geen wijziging aan de Wedstrijden-tab (competitiewedstrijden)** — de einddatum-optie zit alleen bij open wedstrijden.

#### Wat niet getest kon worden
De echte Supabase-call (of `einddatum` correct wordt opgeslagen en teruggelezen) en het gedrag in de browser zelf. De datum-bereiklogica en de validatie zijn los getest, en het JS is op syntax gecontroleerd.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [augustus 2026 — patch 58] — 2026-08-31

### 🏟️ Wedstrijddag: zoeken op atleet, atleet bij meerdere onderdelen, afronden zonder PR's

<!--RELEASENOTE
versie: Patch 58
titel: 🏟️ Wedstrijddag makkelijker invoeren
type: update
beschrijving: Drie verbeteringen in de Wedstrijddag-tab. Je kunt nu zoeken op naam bij het toevoegen van een atleet, je kunt één atleet in één keer bij meerdere onderdelen zetten, en als niemand een PR heeft gehaald kun je de wedstrijd netjes beëindigen in plaats van alleen annuleren.
-->

Drie punten uit de wedstrijddag-test van 29/30 augustus, alle drie in de **individuele modus** (open wedstrijden) van de Wedstrijddag-tab.

**1. Zoeken op atletennaam.**
De snelinvoer-balk heeft een zoekveld 🔍 vóór de atleet-keuze. Typen filtert de dropdown live (op elk deel van de naam, hoofdletterongevoelig); bij precies één treffer wordt die atleet meteen gekozen. De lijst staat nu ook alfabetisch. Bij ＋ Toevoegen wordt de zoekterm gewist zodat de volledige lijst weer klaarstaat. Zijn er geen treffers, dan meldt de dropdown "Geen atleet gevonden".

**2. Atleet bij meerdere onderdelen tegelijk.**
Nieuwe knop **👤 Atleet bij meerdere onderdelen…** onder de snelinvoer-balk. Je kiest één atleet (ook hier met zoekveld) en vinkt in één scherm alle onderdelen aan waaraan hij of zij meedoet. Onderdelen waar de atleet al bij staat, staan vast aangevinkt en zijn niet aan te vinken, zodat dubbel toevoegen niet kan. De bestaande route (per onderdeel een atleet toevoegen) blijft ongewijzigd bestaan.

**3. Afronden als niemand een PR heeft gehaald.**
Voorheen bleef in de afrond-modal alleen **Annuleren** over als geen enkel resultaat beter was dan het PR — er was dan geen nette manier om af te sluiten. Nu verschijnt de tekst "Geen nieuwe PR's deze wedstrijd" plus de knop **🏁 Wedstrijd beëindigen**. Die vraagt eerst om bevestiging, wist daarna de ingevoerde resultaten van deze wedstrijd en sluit de wedstrijddag. Zijn er wél PR-kandidaten, dan is het scherm ongewijzigd (PR's bijwerken).

#### Technisch
- Nieuwe helpers `wdAtletenGefilterd(zoek)` (alfabetisch + filter op naam) en `vulWdAtleetSelect(selectId, zoekId, leegLabel)` (vult één atleet-dropdown, houdt de bestaande keuze vast, kiest bij één treffer automatisch). `vulWdQuickAdd()` gebruikt deze helper en bewaart nu ook de gekozen onderdeel-waarde bij een herrender; `filterWdQaAtleten()` hangt aan het nieuwe zoekveld `#wd-qa-zoek`.
- Nieuwe modal `#wdAtleetOnderdelenModal` met `openWdAtleetOnderdelen()`, `filterWdAoAtleten()`, `renderWdAoOnderdelen()` en `wdAoToevoegen()`. Toevoegen gaat via de bestaande `wdBewaarResultaat(discipline, sleutel, atleetId, null, "ok")` — dus per onderdeel één rij in `resultaten` zonder resultaatwaarde, precies zoals de snelinvoer dat al deed.
- `openWdAfronden()` zet bij nul kandidaten de nieuwe knop `#wd-afrond-beeindig-btn` aan via `zetWdBeeindigBtn()`; `beeindigWedstrijddagZonderPr()` doet de bevestiging, de `delete` op `resultaten` (op `categorie_id` + `wedstrijd_id`) en `sluitWedstrijddag()`.
- `wdIndivAddPrompt()` zet de focus op het zoekveld in plaats van op de dropdown.
- Nieuwe CSS: `.wd-ao-grid` (aanvinkraster in de modal).

**Geen databasewijziging** — patch 58 gebruikt de bestaande tabel `resultaten`.

#### Wat niet getest kon worden
De echte Supabase-calls (het wissen van de resultaten bij beëindigen, en het toevoegen van meerdere onderdelen achter elkaar) en het gedrag in de browser zelf. De pure logica (zoekfilter, automatische keuze bij één treffer, behouden van de onderdeelkeuze, vergrendelen van al toegevoegde onderdelen) is los getest, en het JS is op syntax gecontroleerd.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

**Nog open uit dezelfde test (volgende patch):** meerdere pogingen per technisch onderdeel (max 6, met X voor ongeldig) en meerdere rondes per onderdeel (kwalificatie/serie/halve finale/finale, vrij aantal, naam uit een vast lijstje), met automatisch de beste prestatie als eindresultaat. Dat vraagt wél een aanpassing aan de tabel `resultaten`.

---

## [augustus 2026 — patch 57] — 2026-08-24

### 🔀 Nieuwste release notes bovenaan (ook infra-notes)

<!--RELEASENOTE
versie: Patch 57
titel: 🔀 Nieuwste release notes bovenaan
type: bugfix
beschrijving: De nieuwste release notes staan nu altijd bovenaan de lijst. Notes zonder patchnummer (zoals onderhouds-/infra-updates) belandden voorheen onderaan; die verschijnen nu op datum op de juiste plek.
-->

De release-notes-lijst sorteerde puur op patchnummer, waarbij notes **zonder** patchnummer (zoals de infra-/onderhoudsnote van 24 augustus) bewust onderaan werden gezet. Daardoor stond de nieuwste note onderaan in plaats van bovenaan.

- De sortering in `laadReleasenotes()` is aangepast: primair op **importdag** (`gepubliceerd_op`, nieuwste eerst), zodat ook notes zonder patchnummer op datum op de juiste plek komen.
- Binnen dezelfde dag wordt nog steeds op **patchnummer** (hoogste eerst) gesorteerd, zodat een bulk-import van oude patches — die allemaal op dezelfde dag binnenkomen — correct geordend blijft.
- Een note zonder patchnummer telt binnen zijn eigen dag als nieuwste; twee zulke notes op dezelfde dag vallen terug op de exacte publicatietijd.

Alleen een JS-wijziging in de sorteerfunctie — geen HTML-, CSS- of databasewijziging.

---

## [augustus 2026 — infra] — 2026-08-24

### 📧 Brevo API-sleutel automatisch actief gehouden

<!--RELEASENOTE
versie: Onderhoud augustus 2026
titel: 📧 Betrouwbare e-mailverzending (onderhoud)
type: update
beschrijving: Achter de schermen zorgen we ervoor dat het versturen van uitnodigings- en welkomstmails betrouwbaar blijft werken. Voor de gebruiker verandert er niets.
-->

De Brevo API-sleutel `sprint-u16-worker` (waarmee de Cloudflare Worker uitnodigings- en welkomstmails verstuurt) werd door Brevo na 90 dagen zonder gebruik automatisch op inactief gezet. Om dat te voorkomen is aan de Worker een geplande taak (`scheduled`-handler) toegevoegd die 2× per maand een lichte, lezende aanroep naar Brevo doet.

- **Cron Trigger:** `0 6 1,15 * *` (1e en 15e van de maand, 06:00 UTC).
- De keep-alive roept `GET https://api.brevo.com/v3/account` aan met de bestaande sleutel; er wordt **géén e-mail verstuurd** — het is puur een levensteken zodat de sleutel als "gebruikt" geregistreerd blijft.
- De sleutel blijft veilig als Secret `BREVO_API_KEY` binnen Cloudflare en is nergens gedupliceerd (daarom via Cloudflare Cron i.p.v. GitHub Actions, anders dan de Supabase keep-alive).

Alleen infrastructuur (Cloudflare Worker) — geen wijziging aan `app.html` of de database. Het app-patchnummer blijft daarom **56**.

---

## [augustus 2026 — patch 56] — 2026-08-19

### 🏟️ Wedstrijddag-tab: sectiekoppen boven de kaarten

<!--RELEASENOTE
versie: Patch 56
titel: 🏟️ Nettere indeling van de Wedstrijddag-lijst
type: bugfix
beschrijving: In de Wedstrijddag-tab stond de sectiekop (zoals "Competitiewedstrijden") links naast de wedstrijdkaarten in plaats van erboven. De kop staat nu netjes boven de kaarten en elke soort wedstrijd krijgt een eigen sectie: Competitiewedstrijden bovenaan, Open wedstrijden eronder.
-->

In de Wedstrijddag-tab stond de sectiekop ("Competitiewedstrijden", en bij open wedstrijden "Open wedstrijden") door de opmaak links **naast** de eerste wedstrijdkaart in plaats van erboven.

- De lijstcontainer `#wd-wedstrijd-lijst` was zelf een raster (`class="grid"`), waardoor zowel de koppen als de kaarten als losse rasterkolommen naast elkaar werden geplaatst. De `grid`-class is van de container gehaald; de kaarten van elke sectie zitten nu in hun **eigen** raster (`<div class="grid">`) onder de bijbehorende kop.
- De volgorde is aangepast: **Competitiewedstrijden** bovenaan, **Open wedstrijden** in een eigen sectie eronder (voorheen andersom).
- De kop "Competitiewedstrijden" wordt nu altijd getoond; als er geen aankomende competitiewedstrijden zijn, staat de uitleg netjes onder die kop.

Alleen een opmaak-/weergavewijziging — geen functionele of databasewijziging.

---

## [juli 2026 — patch 55] — 2026-07-06

### 📱 Marges hersteld op de Punten-, Profiel- en Admin-tab

<!--RELEASENOTE
versie: Patch 55
titel: 📱 Marges op de Punten-, Profiel- en Admin-tab hersteld
type: bugfix
beschrijving: Op de telefoon plakte de inhoud van de tabbladen Punten, Profiel en Admin tegen de schermranden. Net als bij patch 54 vielen deze tabbladen door de HTML-structuur buiten het gedeelte dat normaal de marges verzorgt; ze krijgen nu dezelfde nette marge links en rechts als de rest van de app.
-->

Op de telefoon plakte de inhoud van de tabbladen **Punten**, **Profiel** en **Admin** tegen de linker- en rechterrand van het scherm. Dit is hetzelfde probleem dat patch 54 al oploste voor de Wedstrijden-, Wedstrijddag- en Opstelling-tab: die views vallen door de HTML-structuur buiten het `main`-element, dat normaal de marges verzorgt. Bij patch 54 waren de tabbladen Punten, Profiel en Admin nog niet meegenomen.

- De views `#view-punten`, `#view-profiel` en `#view-admin` krijgen nu dezelfde `padding` en `max-width` als `main` (24px desktop, 14px mobiel), zodat de inhoud netjes marge houdt en op grote schermen gecentreerd blijft.
- Deze views zijn toegevoegd aan dezelfde twee CSS-regels die patch 54 introduceerde (desktop + mobiele media query), inclusief de onderruimte voor de floating nav op mobiel.

Alleen een opmaakwijziging (CSS) — geen functionele of databasewijziging.

---

## [juli 2026 — patch 54] — 2026-07-04

### 📱 Marges hersteld op de Wedstrijden-, Wedstrijddag- en Opstelling-tab

<!--RELEASENOTE
versie: Patch 54
titel: 📱 Marges op de Wedstrijddag-tab hersteld
type: bugfix
beschrijving: De inhoud van de tabbladen Wedstrijddag, Wedstrijden en Opstelling plakte op de telefoon tegen de schermranden. Die tabbladen vielen door de HTML-structuur buiten het gedeelte dat normaal de marges geeft; ze krijgen nu dezelfde nette marge links en rechts als de rest van de app.
-->

Op de telefoon plakte de inhoud van de Wedstrijddag-tab (en ook de Wedstrijden- en Opstelling-tab) tegen de linker- en rechterrand van het scherm. Die drie views vielen door de HTML-structuur buiten het `main`-element, dat normaal de marges verzorgt.

- De views `#view-wedstrijden`, `#view-wedstrijddag` en `#view-opstelling` krijgen nu dezelfde `padding` en `max-width` als `main` (24px desktop, 14px mobiel), zodat de inhoud netjes marge houdt en op grote schermen gecentreerd blijft.
- De mobiele onderruimte voor de floating nav zit nu op de view zelf; de losse `padding-bottom` op `.wd-afrond-actie` is daardoor overbodig geworden en verwijderd (voorkomt dubbele witruimte onderaan).

Alleen een opmaakwijziging (CSS) — geen functionele of databasewijziging.

---

## [juli 2026 — patch 53] — 2026-07-04

### 🏟️ Open wedstrijden + opgeschoonde Wedstrijddag-lijst

<!--RELEASENOTE
versie: Patch 53
titel: 🏟️ Open wedstrijden + opgeschoonde lijst
type: feature
beschrijving: Je kunt nu een "open wedstrijd" (losse, niet-competitiewedstrijd) rechtstreeks vanuit de Wedstrijddag-tab aanmaken met de knop ➕ Open wedstrijd — meteen in de individuele modus, zonder dat die in de Wedstrijden-tab komt. De Wedstrijddag-lijst toont bij competitiewedstrijden alleen nog wat vandaag of later is (afgelopen wedstrijden verdwijnen daar). En de release notes staan weer op patchnummer gesorteerd, nieuwste bovenaan.
-->

> ⚠️ **Databasewijziging nodig (eenmalig).** Draai vóór gebruik in de Supabase SQL-editor:
> ```sql
> ALTER TABLE public.wedstrijden
>   ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT false;
> ```

**Open wedstrijden**

- Nieuwe knop **➕ Open wedstrijd** bovenaan de Wedstrijddag-tab. Je geeft een naam + datum op en komt meteen in de individuele modus (zelf atleten per onderdeel toevoegen, PR's bijwerken).
- Een open wedstrijd verschijnt **alleen in de Wedstrijddag-tab** (sectie "Open wedstrijden" met een groen **OPEN**-label), niet in de Wedstrijden- of Opstelling-tab. Je kunt 'm daar ook weer **verwijderen** (inclusief de ingevoerde resultaten).

**Opgeschoonde Wedstrijddag-lijst**

- Bij competitiewedstrijden worden **alleen vandaag + toekomstige** wedstrijden getoond; afgelopen wedstrijden staan niet meer in de Wedstrijddag-lijst (die blijven wel gewoon in de Wedstrijden-tab).

**Release notes sortering (fix)**

- De releasenotes worden weer op **patchnummer** gesorteerd (hoogste bovenaan). Voorheen werd op publicatietijd gesorteerd, waardoor een later geïmporteerde oudere patch bovenaan kon komen.

#### Technisch
- Nieuwe kolom `wedstrijden.is_open` (boolean, default false). `renderWedstrijden()` en `renderOpstellingWedstrijden()` filteren `!w.is_open`; open wedstrijden blijven wel in de globale `wedstrijden`-array (voor lookups). `renderWedstrijddagLijst()` splitst in open (met verwijderknop) en competitie (`!is_open && !isWedstrijdAfgelopen`, eerstvolgende bovenaan). Nieuwe functies `openNieuweOpenWedstrijd`, `maakOpenWedstrijd` (insert `is_open:true`, opent meteen de individuele modus), `verwijderOpenWedstrijd` (wist eerst de resultaten, dan de wedstrijd). Modal `#nieuweOpenWedstrijdModal`.
- `laadReleasenotes()` sorteert de opgehaalde notes nu client-side op het nummer uit "… patch N …" (aflopend), met de publicatiedatum als terugval.

---

## [juli 2026 — patch 52] — 2026-07-03

### 📥 Release notes importeren uit GitHub

<!--RELEASENOTE
versie: Patch 52
titel: 📥 Release notes importeren uit GitHub
type: feature
beschrijving: Nieuwe knop "📥 Uit GitHub" in de releasenotes-sectie haalt de nieuwste releasenotes op en voegt ze met één tik toe — geen velden meer overtypen. Toont alleen versies die nog niet in de app staan, per stuk of allemaal tegelijk.
-->

Release notes hoefden niet langer met de hand ingevoerd te worden. In de **Releasenotes-sectie** (zichtbaar voor admins) staat nu naast **+ Toevoegen** de knop **📥 Uit GitHub**.

- De knop haalt de `CHANGELOG.md` van GitHub op en leest daaruit de release notes die bij elke patch in een onzichtbaar blokje staan.
- Getoond worden **alleen de versies die nog niet in de app staan** (vergelijking op `versie`).
- Je voegt ze toe **per stuk** (➕ Toevoegen) of **allemaal tegelijk** (✅ Voeg alle nieuwe toe). Eén tik = direct opgeslagen; corrigeren kan daarna met de bewerkknop (patch 50).

Vanaf deze patch bevat elke changelog-entry een onzichtbaar `<!--RELEASENOTE …-->`-blokje (versie/titel/type/beschrijving) dat de app uitleest. Deze blokjes zijn niet zichtbaar wanneer je de changelog leest.

#### Technisch
- Nieuwe knop `#btn-note-import` (admin-only, zichtbaar gemaakt in `laadReleasenotes()`) en modal `#releasenoteImportModal`.
- `openReleasenoteImport()` fetcht de rauwe `CHANGELOG.md` (`raw.githubusercontent.com`, cache-buster), `parseChangelogReleasenotes()` haalt alle `<!--RELEASENOTE …-->`-blokken eruit (per regel `sleutel: waarde`), en de versies worden vergeleken met bestaande `releasenotes.versie` in Supabase. `voegImportNoteToe(i)` / `voegAlleImportNotesToe()` inserten via de bestaande `releasenotes`-tabel. Geen schemawijziging.

---

## [juli 2026 — patch 51] — 2026-07-03

### 🏟️ Wedstrijddag als aparte tab + individuele modus voor gewone wedstrijden

<!--RELEASENOTE
versie: Patch 51
titel: 🏟️ Wedstrijddag-tab + individuele modus
type: feature
beschrijving: Wedstrijddag is nu een eigen tab met een lijst van je wedstrijden. Bij een wedstrijd zonder opstelling verschijnt de nieuwe individuele modus: voeg zelf atleten toe per onderdeel (iedereen kan overal meedoen), zie meteen punten en PR-vergelijking, en werk bij "Afronden" de verbeterde PR's bij. Bij een competitie (met opstelling) blijft de teamscore gewoon werken.
-->

De wedstrijddag-modus was alleen bereikbaar via een knopje op de wedstrijdkaart en ging altijd uit van een opstelling met teamscore (competitie). Vanaf nu is er een **aparte tab "🏟️ Wedstrijddag"** en werkt live invoeren óók voor gewone wedstrijden.

**Nieuwe Wedstrijddag-tab**

- Naast de bestaande tabs staat nu **🏟️ Wedstrijddag** (ook in de mobiele balk, met ⏱️-icoon). De tab toont een lijst van je wedstrijden (aankomende bovenaan); je tikt er één aan om live resultaten in te voeren.
- Het bestaande 🏟️-knopje op de wedstrijdkaart blijft bestaan als snelkoppeling — het opent hetzelfde scherm.

**Twee modi, automatisch herkend**

De app kijkt of een wedstrijd een opgeslagen opstelling heeft:

- **Competitie (mét opstelling)** → het vertrouwde scherm met opstelling, ploegen en live teamscore (telregels). Ongewijzigd.
- **Gewone wedstrijd (zónder opstelling)** → de nieuwe **individuele modus**: geen teamscore, iedereen kan op elk onderdeel meedoen.

**Individuele modus**

- Een **snelinvoer-balk** bovenaan: kies een atleet, een onderdeel en (optioneel) meteen een resultaat, en tik **＋ Toevoegen**. De atleet verschijnt onder het juiste onderdeel.
- Per onderdeel zie je de toegevoegde atleten met naam, huidig PR, invoerveld en direct berekende punten (op basis van het geslacht van de atleet). Een **▲ PR!**-badge verschijnt zodra een resultaat beter is dan het huidige PR.
- Met **＋ atleet toevoegen bij [onderdeel]** zet je datzelfde onderdeel klaar in de snelinvoer-balk.
- **✕** verwijdert een atleet bij een onderdeel (met bevestiging als er al een resultaat staat).
- **✅ Afronden & nieuwe PR's opslaan** toont het bekende vinkjes-overzicht en slaat de verbeterde resultaten op als nieuw PR (met de wedstrijddatum).

**Geen database-wijziging nodig** — de individuele modus hergebruikt de bestaande tabel `resultaten` (individuele invoer met de atleet-id als sleutel) en de bestaande afrond-/PR-logica.

#### Technisch
- `showTab("wedstrijddag")` toont voortaan de overzichtslijst; `openWedstrijddag()` schakelt door naar het detailscherm. De view is opgesplitst in `#wd-overzicht` (lijst) en `#wd-detail` (invoer).
- Nieuwe statusvariabele `wdModus` (`"competitie"` / `"individueel"`), bepaald in `laadWedstrijddag()` door te kijken of er een gevulde `opstelling` bestaat voor de wedstrijd (welk geslacht dan ook). `toonWdModusUI()` verbergt in individuele modus de geslacht-/ploeg-tabs en de scorebalk en toont de snelinvoer-balk.
- Nieuwe functies: `renderWedstrijddagLijst`, `toonWdOverzicht`/`toonWdDetail`, `renderWdIndividueel`, `wdIndivDisciplines` (alle categorie-onderdelen behalve estafettes + categorie-brede eigen onderdelen), `wdIndivRijHtml`, `vulWdQuickAdd`, `wdQuickAdd`, `wdIndivVoegToe`, `wdIndivInvoer`, `wdIndivVerwijder`, `wdIndivAddPrompt`. `vernieuwWedstrijddag()` vertakt nu per modus.

---

## [juli 2026 — patch 50] — 2026-07-03

### 🔀 Doorstroming voor alle trainers + ✏️ release notes bewerken

**Doorstroming verhuisd naar de Atleten-tab en beschikbaar voor iedereen**

De doorstroming zat in de Admin-tab en was daardoor alleen voor beheerders. Vanaf nu staat het scherm in de **Atleten-tab** en kan elke trainer het gebruiken. De meldingsbanner bovenaan ("X atleten staan klaar voor doorstroming") verschijnt nu ook voor gewone trainers en verwijst naar de Atleten-tab.

Nieuw: een trainer kan alleen atleten doorstromen naar categorieën waar hij zélf toegang toe heeft (de database bewaakt dit ook). Er zijn nu drie situaties zichtbaar per atleet:
- **Doelcategorie bestaat + je hebt toegang** → gewoon selecteerbaar en doorstroombaar.
- **Doelcategorie bestaat, maar je hebt er geen toegang toe** → de atleet is zichtbaar met "geen toegang 🔒" en niet-selecteerbaar. Klik je op Doorstromen terwijl zulke atleten klaarstaan, dan verschijnt één nette melding met het advies contact op te nemen met de beheerder.
- **Doelcategorie bestaat helemaal niet** → "bestaat niet ✗" met de tip om de categorie eerst aan te maken.

Om "geen toegang" van "bestaat niet" te kunnen onderscheiden, haalt de app nu de namen van álle categorieën op (alleen namen, geen data — die lijst was al leesbaar voor ingelogde gebruikers).

**Release notes bewerken en verwijderen (admin)**

Bij elke release note staan nu (voor admins) knoppen **✏️ Bewerken** en **🗑️ Verwijderen**. Bewerken opent dezelfde popup als toevoegen, maar met de bestaande tekst ingevuld — handig om een typo of kopieerfout te herstellen. Verwijderen vraagt eerst om bevestiging.

#### Technisch
- Doorstroom-HTML verplaatst van `view-admin` naar `view-atleten` (paneel `#doorstroom-paneel`, alleen zichtbaar als er kandidaten zijn). `laadDoorstroming()` wordt nu aangeroepen bij het openen van de Atleten-tab en bij het opstarten (voor iedereen). `renderDoorstroomMelding()` is niet langer admin-only.
- `bepaalDoorstroomKandidaten()` laadt naast de toegankelijke categorieën nu ook `alleCategorieNamen` (id + naam van alle categorieën) en zet per kandidaat een vlag `doelBestaatGeenToegang`. `startDoorstroming()` toont bij aanwezigheid daarvan een eenmalige melding via de nieuwe `bevestig(..., { alleenOk: true })`-modus (verbergt de annuleerknop).
- Release notes: `noteModal` kreeg een verborgen `note-id` en dynamische titel; `slaaNoteOp()` doet nu een `update` bij een id en anders een `insert`; nieuwe `openNoteBewerken()`, `verwijderNote()` en de veilige `bewerkNoteVanuitKnop()` / `verwijderNoteVanuitKnop()` (lezen de note uit een `data-note`-attribuut, zodat titels met aanhalingstekens geen probleem geven).

#### Wat niet getest kon worden
- De echte Supabase-updates/deletes en RLS (of een trainer inderdaad geblokkeerd wordt op een ontoegankelijke doelcategorie, en of een admin release notes mag wijzigen/verwijderen), plus de browserweergave. De classificatielogica (verplaatsbaar / geen toegang / bestaat niet) is met 7 losse unit-asserties gecontroleerd, bovenop de bestaande leeftijdstests; JavaScript-syntax gevalideerd met `node --check`.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`
Geen Supabase-wijziging.

---

## [juli 2026 — patch 49] — 2026-07-03

### 🔀 Doorstroming: atleten naar een volgende categorie verplaatsen

Aan het begin van een nieuw kalenderjaar groeit een deel van de atleten uit hun categorie. Er is nu een admin-scherm dat dit signaleert en het verplaatsen met één klik regelt.

**Wat je krijgt:**
- **Melding bovenaan de app** (alleen voor admins) zodra er atleten klaarstaan: bijvoorbeeld *"3 atleten staan klaar voor doorstroming"*, met een knop die je naar het scherm brengt.
- **Nieuwe sectie "🔀 Doorstroming"** in de Admin-tab. Per atleet zie je het geboortejaar, de huidige categorie (met ⚠️) en de doelcategorie. Je vinkt aan wie je wilt doorstromen en klikt op **Doorstromen**.
- **PR's verhuizen mee.** Bij doorstroming verplaatsen de atleet én al zijn persoonlijke records naar de nieuwe categorie. Wedstrijdresultaten (patch 47), opstellingen en beschikbaarheid blijven bewust bij de oude wedstrijden staan — die horen bij die specifieke wedstrijd in de oude categorie.
- **Bestaat de doelcategorie nog niet** (bijvoorbeeld U18/U20), dan is die atleet zichtbaar maar niet-selecteerbaar, met de melding *"categorie … bestaat niet ✗"* en een tip om die categorie eerst aan te maken.
- **Bevestiging vooraf:** vóór het verplaatsen zie je precies welke atleten naar welke categorie gaan, inclusief het aantal PR's dat meeverhuist.

De categorie-indeling volgt het kalenderjaar-systeem (de leeftijd die je dit jaar wórdt): U14 = 12/13, U16 = 14/15, U18/U20 = 16 t/m 19. Een gecombineerde categorienaam als "U18/U20" wordt correct herkend als doel voor zowel 16/17- als 18/19-jarigen.

#### Technisch
- Leeftijdslogica uit `bepaalCategorieBadge()` geëxtraheerd naar twee herbruikbare helpers: `berekenLeeftijdsCategorie(geboortedatum)` (geeft U12…U20/Sen op basis van geboortejaar) en `categorieNaamDekt(catNaam, catBerekend)` (herkent samengestelde namen: "U18/U20" dekt zowel U18 als U20, "Senioren" dekt "Sen"). `bepaalCategorieBadge()` gebruikt nu deze helpers — de ⚠️-badge blijft functioneel identiek.
- `bepaalDoorstroomKandidaten()` laadt atleten van álle categorieën waartoe de gebruiker toegang heeft (`in("categorie_id", …)`) en markeert wie niet meer in zijn categorie past; `laadDoorstroming()`, `renderDoorstroomLijst()`, `renderDoorstroomMelding()`, `startDoorstroming()`.
- Doorstromen = `UPDATE prestaties SET categorie_id = doel WHERE categorie_id = oud AND atleet_id = …`, gevolgd door `UPDATE atleten SET categorie_id = doel`. Na afloop `laadDoorstroming()` + `syncAll()`.
- Banner wordt bij het opstarten (voor admins) en bij het openen van de Admin-tab ververst. Geen schemawijziging.

#### Wat niet getest kon worden
- De echte Supabase-updates en RLS (of een admin de categorie-overstijgende `UPDATE` mag doen), en de browserweergave. De kernlogica (leeftijdsberekening kalenderjaar-systeem, dekking van samengestelde categorienamen, doorstroom-detectie U14→U16 en U16→U18/U20, en dat 15-jarigen in U16 blijven) is gecontroleerd met 25 losse unit-asserties; JavaScript-syntax gevalideerd met `node --check`.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`
Geen Supabase-wijziging.

---

## [juli 2026 — patch 48] — 2026-07-03

### 🐛 Mobiele navigatiebalk: twee fixes

Twee problemen met de floating navigatiebalk onderaan het scherm op de telefoon zijn opgelost.

- **De afrondknop van de wedstrijddag was niet bruikbaar.** De knop **✅ Wedstrijd afronden — PR's bijwerken** (patch 47) viel precies achter de navigatiebalk, waardoor je hem niet kon aantikken. De balk had bovendien een volledig doorzichtige achtergrond, waardoor de content er tijdens het scrollen doorheen scheen — dat versterkte het "zwevende" gevoel. Nu heeft de balk een ondoorzichtige achtergrond (met glas-effect waar de telefoon dat ondersteunt) en krijgt de afrondknop genoeg onderruimte, zodat hij altijd volledig boven de balk uitkomt.
- **De balk leek mee te schuiven tijdens het scrollen.** Dit kwam deels door diezelfde doorzichtige achtergrond en doordat de onderste content te weinig ruimte had. De content reserveert nu meer ruimte onderaan, zodat er niets meer achter de balk verdwijnt.

Het **horizontaal scrollen** door de menuknoppen blijft behouden — dat is bewust zo, zodat alle acht knoppen bereikbaar zijn zonder ze kleiner te maken.

#### Technisch
- `#mob-nav`: `background: transparent` vervangen door een ondoorzichtige `var(--surface)`, met een `@supports`-regel die alleen waar `backdrop-filter` wordt ondersteund een semi-transparant glas-effect toepast (`color-mix`). Zo schijnt content nooit door de balk op toestellen zonder `backdrop-filter`.
- `main` `padding-bottom` verhoogd van `+12px` naar `+28px` bovenop de balkhoogte + safe-area.
- De afrondknop staat nu in een container `.wd-afrond-actie` die op mobiel een eigen `padding-bottom` van `60px + safe-area + 20px` krijgt — een vangnet zodat de knop gegarandeerd boven de balk uitkomt, ook los van de `main`-padding.
- `position: fixed; bottom: 0` bewust behouden: dat is in moderne mobiele browsers de correcte manier om een balk op de zichtbare onderrand te houden (conform de huidige aanbeveling met sv/dvh-viewporteenheden). Er is geen fragiele JavaScript- of `dvh`-truc toegevoegd.

#### Wat niet getest kon worden
- Het echte gedrag op je telefoon (iOS Safari / Android Chrome) tijdens het in-/uitschuiven van de browserbalk. Het meebewegen van een `fixed` balk met de browser-UI is toestel- en browserafhankelijk en met CSS niet altijd 100% te elimineren; deze fix pakt de aanwijsbare oorzaken (doorzichtige achtergrond + te weinig onderruimte) aan. De JavaScript-syntax is gevalideerd met `node --check`; de wijziging is puur CSS/HTML.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`
Geen Supabase-wijziging.

---

## [juli 2026 — patch 47] — 2026-07-03

### 🏟️ Wedstrijddag-modus: live resultaten invoeren

Een nieuwe modus voor op de wedstrijddag zelf. Vanaf de wedstrijdkaart open je met de knop **🏟️ Wedstrijddag** een invoerscherm dat het programma en de opgeslagen opstelling combineert: per onderdeel zie je de opgestelde atleten met een invoerveld, het huidige PR, direct berekende NAU-punten en een **▲ PR!**-badge zodra een resultaat beter is dan het PR.

**Wat je kunt doen:**
- **Resultaten live invoeren** per atleet per onderdeel. Elke invoer wordt direct opgeslagen — geen aparte opslaan-knop. Invoer accepteert komma's en m:ss-notatie; alles wordt genormaliseerd naar het World Athletics-formaat (tijden ≥ 60 sec als `m:ss.hh`).
- **Live teamscore** bovenin: het puntentotaal van de gekozen ploeg volgens de officiële telregels (loop: beste 2, technisch: beste 1, estafette: alles), plus tellers voor "ingevoerd" en "nieuwe PR's".
- **Estafette als teamtijd:** één invoerveld per ploeg per estafette-onderdeel (een estafettetijd is een teamresultaat, geen persoonlijk PR).
- **DNS-knop** per atleet voor wie niet gestart is; het invoerveld wordt dan geblokkeerd en het onderdeel telt als "afgehandeld" in de voortgangsteller.
- **Meerdere trainers tegelijk:** doordat elke invoer per veld wordt opgeslagen, kunnen collega-trainers op hun eigen telefoon andere onderdelen invoeren. Met **🔄 Vernieuwen** haal je hun invoer op.
- **✅ Wedstrijd afronden:** een overzicht van alle resultaten (beide geslachten, alle ploegen) die beter zijn dan het huidige PR — met vinkjes, in dezelfde stijl als de Excel-import. Eén klik werkt de PR's bij in de Prestaties-tab, met de wedstrijddatum als PR-datum.

Wissel je tussen Jongens/Meisjes of tussen ploegen, dan laadt het scherm de bijbehorende opstelling. Zonder opgeslagen opstelling toont het scherm een duidelijke melding.

#### Technisch
- Nieuwe Supabase-tabel **`resultaten`**: `categorie_id`, `wedstrijd_id`, `atleet_id` (nullable — leeg bij estafette), `discipline`, `sleutel` (individueel = atleet-id, estafette = `ploeg-A/B/C`), `resultaat`, `status` (`ok`/`dns`), `ingevoerd_op`. UNIQUE op `(categorie_id, wedstrijd_id, discipline, sleutel)` zodat invoer per veld via `upsert` (met `onConflict`) altijd de laatste waarde bewaart — dit maakt gelijktijdig invoeren door meerdere trainers mogelijk (laatste schrijver wint per veld).
- Nieuwe view `view-wedstrijddag` (opgenomen in de `showTab()`-lijst) + modal `wdAfrondModal`. Kernfuncties: `openWedstrijddag()`, `laadWedstrijddag()`, `renderWedstrijddag()`, `wdInvoer()`, `wdInvoerEstafette()`, `wdToggleDNS()`, `wdUpdateRegel()` (gerichte DOM-update zodat de focus/tab-volgorde intact blijft), `renderWdScore()`, `vernieuwWedstrijddag()`, `openWdAfronden()`, `verwerkWdAfronden()`.
- Hergebruik van bestaande logica: `normaliserenResultaat()`, `formateerResultaatWeergave()`, `parseResultaat()`, `berekenPunten()`, `bestePrestatie()`, `getPREenheid()`, `getPRPlaceholder()`; de opstelling wordt met dezelfde opschoning geladen als in de Opstelling-tab (technisch max 1 slot).
- PR-bijwerking bij afronden volgt de PR-import-aanpak: gerichte DELETE op bestaande prestaties van die atleet + discipline vóór de insert (voorkomt duplicaten). Alleen individuele resultaten met status `ok` die **strikt beter** zijn dan het PR (of een eerste PR) komen in het overzicht.
- `verwijderCategorie()` uitgebreid met `resultaten` in zowel de tel- als verwijderlijst (afspraak uit patch 46).
- `wisselCategorie()` verlaat nu ook een geopende wedstrijddag, net zoals sinds patch 46 een geopende opstelling.

**Supabase SQL (eenmalig zelf uitvoeren vóór gebruik):** zie de release-instructies in de chat — nieuwe tabel `resultaten` met RLS-policy volgens het bestaande `trainer_categorie_…`-patroon.

#### Wat niet getest kon worden
- De echte Supabase-queries (upsert/delete op `resultaten`, RLS), het gelijktijdig invoeren door twee trainers, en de browserweergave. De kernlogica (PR-vergelijking lager/hoger = beter, normalisatie incl. m:ss.hh, NAU-punten incl. hoogspringen-drempel, telregel-labels, resultaat-sleutels) is gecontroleerd met 21 losse unit-asserties; JavaScript-syntax is gevalideerd met `node --check`.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`
Supabase: nieuwe tabel `resultaten` aangemaakt (handmatig via SQL Editor).

---

## [juni 2026 — patch 46] — 2026-06-16

### 🐛 Categorie verwijderen werkt nu + opstelling reset bij categoriewissel

Twee dingen die opvielen bij het testen van een tweede categorie (U14) zijn opgelost.

- **Categorie verwijderen lukt nu écht.** Voorheen weigerde de databank een categorie te verwijderen zodra er nog een wedstrijd (of atleet, prestatie, opstelling, …) aan hing — je kreeg dan de fout *"violates foreign key constraint wedstrijden_categorie_id_fkey"*. De bevestigingstekst beloofde al dat alles meeging, maar de code ruimde die gekoppelde gegevens niet op. Vanaf nu verwijdert de app eerst alle gekoppelde rijen en daarna pas de categorie zelf.
- **Veiliger bevestigingsvenster.** Vóór het verwijderen toont de app nu hoeveel gegevens eraan hangen, bijvoorbeeld *"Dit verwijdert ook: 3 atleten, 1 wedstrijd, 5 prestaties"*. Zo trek je nooit per ongeluk een volle categorie leeg. Verwijder je de categorie waarin je op dat moment werkt, dan schakelt de app netjes over naar een andere beschikbare categorie.
- **Opstelling blijft niet hangen bij categoriewissel.** Als je in de Opstelling-tab een wedstrijd open had en bovenin naar een andere categorie wisselde, bleef je in die (oude) wedstrijd hangen. Nu keer je bij het wisselen automatisch terug naar de wedstrijdkeuze van de nieuwe categorie.

#### Technisch
- `verwijderCategorie()` telt nu eerst per gekoppelde tabel (`atleten`, `wedstrijden`, `prestaties`, `opstelling`, `programma`, `beschikbaarheid`, `onderdelen`, `uitnodigingen`, `trainer_categorieen`) via `select("*", { count: "exact", head: true })`, toont de aantallen in de bevestiging, en verwijdert vervolgens in een FK-veilige volgorde (eerst de tabellen die naar wedstrijden/atleten verwijzen, dan wedstrijden/atleten, als laatste de categorie). Was de verwijderde categorie de actieve, dan wordt `actieveCategorie` gereset en de data herladen.
- `wisselCategorie()` zet `actiefWedstrijdId` en `opstellingAlleenLezen` terug en toont weer stap 1 (`#opstelling-stap1`) i.p.v. stap 2 voordat `syncAll()` de data van de nieuwe categorie laadt.
- Geen nieuwe Supabase-tabel; geen SQL-migratie nodig.

#### Wat niet getest kon worden
- De werkelijke Supabase-verwijdering en RLS-rechten, en de echte browserweergave van het bevestigingsvenster. De logica (telvolgorde, verwijdervolgorde, reset bij categoriewissel) is wel doorgelopen; JavaScript-syntax is gevalideerd met `node --check`.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [juni 2026 — patch 45] — 2026-06-15

### 🏃 U14 als tweede categorie + puntencorrectie hoogspringen

De app is nu echt meerdere-categorieën-proof. Maak je in de **Admin-tab** een categorie met de naam **`U14`** aan (en geef jezelf toegang), dan past de hele app zich automatisch aan zodra je bovenin naar U14 wisselt:

- **Onderdelenlijst per categorie.** Voor U14 verschijnen de juiste onderdelen: 60m, 80m, 600m, 1000m, 60m horden, 80m horden, 4x60m, 4x80m, hoogspringen, verspringen, kogelstoten, discuswerpen en speerwerpen. (Jongens lopen 80m/80mH/4x80m, meisjes 60m/60mH/4x60m.) Bij U16 blijft de lijst exact zoals hij was.
- **Punten.** U14 gebruikt dezelfde officiële Atletiekunie-telling als U16 (één gezamenlijke tabel volgens het NAU-document). De ontbrekende onderdelen **4x60m** (A=59225, B=1130) en **60m horden 76,2 cm / 6 horden** (A=14050, B=795,5) zijn aan de puntenberekening toegevoegd.
- **Branding.** Logo, ondertitel, tabbladtitel, PDF-labels (jongens/meisjes), teamnamen en de "Gedeeld via Sprint …"-teksten tonen voortaan de actieve categorie in plaats van een vast "U16".
- **Import.** Het importeren van een tijdschema (PDF), een finale-tijdschema (Excel) en een PR-/uitslagenbestand herkent nu ook U14-regels en -onderdelen, in plaats van ze over te slaan.

### 🐛 Correctie hoogspringen-punten
De puntenformule voor hoogspringen onder de 1,35 m gebruikte `+0,5` waar het NAU-document `+0,7` voorschrijft. Dit is gecorrigeerd (verspringen onder 4,41 m blijft terecht `+0,5`). Effect is hooguit 1 punt en alleen bij lage hoogtes.

#### Technisch
- Nieuwe centrale `CATEGORIE_CONFIG` met `DISC_U16` en `DISC_U14`. `U16_DISCIPLINES` is vervangen door `getDisciplines()` (geeft de onderdelenlijst van de actieve categorie, valt terug op U16). Nieuwe helper `catNaam()` voor labels/branding.
- `berekenPunten`: loop-constanten `4x60m` (A=59225, B=1130) en `60m horden` (A=14050, B=795,5 — 76,2 cm / 6 horden) toegevoegd; de drempel-additieve waarde is nu per onderdeel instelbaar (`drempelPlus`: verspringen 0,5, hoogspringen 0,7).
- `renderCategorieSwitcher()` werkt nu ook de ondertitel (`#home-subtitle-cat`), `document.title` en de PDF-labels (`#pdf-cat-m`/`#pdf-cat-v`) bij; teamnamen en share-teksten gebruiken `catNaam()`.
- PDF-schema-import: de `U16-M`/`U16-V`-herkenning is vervangen door een regex op de naam van de actieve categorie. In `PDF_DISCIPLINE_VERTALING`, `FINALE_DISC_MAP` en `DISC_MAP` (PR-import) zijn de U14-onderdelen (60m, 60m horden 76,2 cm, 4x60m) van `null` naar echte waarden gezet; `1000m` toegevoegd aan de PDF-map.
- Geen nieuwe Supabase-tabel; geen SQL-migratie nodig.

#### Wat niet getest kon worden
- De Supabase-kant en auth, de werkelijke PDF-/printweergave, en een echte import-/exportronde met atletiek.nu voor een U14-schema. De pure logica (onderdelen per categorie, nieuwe constanten, hoogspringen-correctie, branding-omschakeling, import-mapping) is wel los gecontroleerd; JavaScript-syntax is gevalideerd met `node --check`.

> ℹ️ U14 verschijnt pas in de categorie-switcher als de categorie met **exact** de naam `U14` is aangemaakt in de Admin-tab én de trainer er toegang toe heeft. Een categorie zonder eigen config valt terug op de U16-onderdelenlijst.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [juni 2026 — patch 44] — 2026-06-15

### 🐛 Bugfix: app bleef hangen op oude versie (service worker cachte te agressief)

Na een nieuwe patch zag je soms nog de **oude versie** van de app, ook na verversen. Voorbeeld: de finale-import-fix van patch 43 werkte wel volgens de broncode, maar in de browser deed "Volgende" bij de meisjes niets — omdat de browser een oude, gecachte `app.html` bleef tonen.

**Oorzaak:** `pwa_sw.js` gebruikte een **cache-first** strategie en bewaarde `app.html` permanent in de cache (`sprint-u16-v1`, naam veranderde nooit). Eenmaal gecachet werd `app.html` nooit meer ververst tegen het netwerk, dus nieuwe patches kwamen niet door.

**Oplossing:** de service worker is nu **netwerk-eerst** voor HTML/navigatie (`app.html`, `index.html`, `/`): online wordt altijd de nieuwste versie opgehaald, met de cache alleen als terugval wanneer je offline bent. Statische bestanden (iconen, manifest) blijven cache-eerst voor snelheid. De cachenaam is verhoogd naar `sprint-u16-v2`, zodat de oude (stale) cache bij activatie automatisch wordt opgeruimd.

**Gevolg:** vanaf nu zie je na elke patch automatisch de nieuwste versie zodra je online bent (mogelijk na één keer extra verversen terwijl de nieuwe service worker zich installeert). De eerste keer moet de oude service worker nog vervangen worden — zie de eenmalige instructie in de chat/PROJECTNOTITIES.

**Bestanden gewijzigd:** `pwa_sw.js`, `CHANGELOG.md`, `PROJECTNOTITIES.md` (geen wijziging in `app.html` — de app-logica van patch 43 was al correct).

---

## [juni 2026 — patch 43] — 2026-06-15

### 🐛 Bugfix: keuze jongens/meisjes bij finale-import bleef niet staan

In de finale-Excel-import (patch 42) deed klikken op **Alleen jongens** of **Alleen meisjes** niets — de knop werd niet geselecteerd en de keuze sprong terug naar "Allebei".

**Oorzaak:** `toonFinaleKeuze()` bepaalde de standaardkeuze bij élke herteken. Na een klik riep `kiesFinaleGeslacht()` opnieuw `toonFinaleKeuze()` aan, waardoor de net gemaakte keuze meteen werd overschreven met de standaard ("Allebei" wanneer beide geslachten gevuld zijn).

**Oplossing:** de standaardkeuze wordt nu alléén bij de eerste weergave bepaald (`finaleKeuze` start op `null` in `openFinaleImportModal()` en wordt alleen gezet als die nog `null` is). Bij een herteken na een klik blijft de keuze van de gebruiker staan.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [juni 2026 — patch 42] — 2026-06-15

### 📊 Finale-tijdschema importeren uit Excel

Naast de bestaande PDF-import kun je nu het **vaste finale-tijdschema** uit een Excel-bestand (`.xls` of `.xlsx`) importeren. Op elke aankomende wedstrijdkaart staat hiervoor een nieuwe knop **📊 Importeer finale (Excel)** (naast 📄 Importeer PDF).

**Hoe het werkt:**
1. Je kiest het Excel-bestand. De app vindt automatisch het tabblad met het tijdschema (bij voorkeur een blad met "tijdschema" in de naam, anders het blad met een kop-rij "Onderdeel").
2. De app leest het schema: de **jongens** staan links (kolommen Meld/Tijd/Onderdeel/Series) en de **meisjes** rechts (idem). De kolom **"Tijd"** wordt de starttijd (niet "Meld").
3. Er wordt gefilterd op de **naam van de actieve categorie**. Sta je in U16, dan komen alléén de U16-regels binnen; regels van andere categorieën (bijv. U14) worden overgeslagen. Activeer je later een U14-categorie, dan pakt dezelfde knop automatisch de U14-regels.
4. **Nieuwe keuzestap:** je kiest of je het **jongens-**, het **meisjes-** of **beide** schema's importeert (handig wanneer de jongens en de meisjes naar verschillende finales gaan). Per optie zie je hoeveel regels erin zitten; een leeg geslacht is niet aanklikbaar.
5. Preview van het gekozen geslacht, plus — net als bij de PDF-import — een vraagscherm voor onderdelen die niet automatisch herkend zijn (zelf koppelen of overslaan).
6. Importeren. **Alleen het/de gekozen geslacht(en) wordt/worden overschreven**: kies je "Alleen jongens", dan blijft een eerder geïmporteerd meisjes-programma gewoon staan (en andersom).

**Slimme details bij het inlezen:**
- "groep A" / "groep B" wordt de **startgroep** van een technisch onderdeel.
- Baan-/matnummers zoals "Hoogspringen **1**" / "Hoogspringen **2**" worden eruit gefilterd (de naam wordt "Hoogspringen").
- Niet-wedstrijdregels (juryvergadering, ploegleidersvergadering, vlaggenparade, overlopen estafettes, prijsuitreiking) worden genegeerd, omdat ze geen categorie-aanduiding bevatten.
- Onderdeelnamen worden vertaald naar de app-namen (`100mH` → 100m horden, `4x80` → 4x80m, enz.).

#### Technisch
- Nieuwe knop in `wedstrijdKaartHtml()` (alleen op aankomende kaarten): `openFinaleImportModal()`.
- Nieuwe modal `finaleImportModal` met drie stappen: bestand kiezen → geslacht kiezen → preview/vraagscherm.
- Nieuwe state: `finaleImportWedstrijdId`, `finaleParsedM`, `finaleParsedV`, `finaleOnbekend`, `finaleKeuze`.
- Nieuwe functies: `openFinaleImportModal()`, `verwerkFinaleBestand()` (SheetJS lazy-load + tabblad detecteren), `parseerFinaleSchema()` (kop-rij + onderdeel-/tijd-kolommen + jongens/meisjes-blok detecteren), `ontleedFinaleCel()` (categorie-filter, groep, baannummer eruit, naam-mapping), `leesFinaleTijd()` / `leesFinaleTekst()` (cel-uitlezing via `.w`), `toonFinaleKeuze()` / `kiesFinaleGeslacht()`, `naarFinalePreview()` / `finalePreviewKolom()`, `controleerFinaleBestaandeData()`, `slaFinaleImportOp()` (delete + insert **per gekozen geslacht**).
- Nieuwe mapping `FINALE_DISC_MAP`. De jongens-/meisjes-blokken worden bepaald via de labels "Jongens"/"Meisjes" in het blad; valt terug op links = jongens, rechts = meisjes.

#### Wat niet getest kon worden
- De echte Supabase insert/delete van het geïmporteerde programma in jouw project (RLS). De parser-logica (kolomdetectie, categorie-filter op U16, groep/baannummer, "Tijd"-kolom, namen-mapping) is wel los getest tegen het echte bestand `U16-U14-Finale-1.xls`: 12 jongens · 12 meisjes · 0 onbekend, alle U14-regels overgeslagen.

**Geen Supabase-wijziging nodig** — gebruikt de bestaande tabel `programma`.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [juni 2026 — patch 41] — 2026-06-15

### 🎯 Eigen onderdelen per atleet + tijden boven de minuut als m:ss

Twee wijzigingen, beide in de Prestaties-tab.

**1. Onderdeel toevoegen voor één specifieke atleet.**
In het scherm **+ Prestatie invoeren** (per atleet) staat nu onderaan een sectie **➕ Onderdeel toevoegen voor deze atleet**. Je geeft een naam (bijv. 100m) en een type (tijd in seconden, tijd in minuten, of afstand/hoogte) op; het onderdeel verschijnt meteen als extra regel in de lijst van die atleet en je vult er direct een PR in. Zo'n eigen onderdeel geldt **alléén voor die ene atleet** en is herkenbaar met het label *eigen* en een ✕ om het weer te verwijderen (een eventueel ingevoerde tijd wordt dan ook verwijderd; standaardonderdelen kun je niet verwijderen).

Dit lost ook een eerder knelpunt op: een meisje kon geen 100m krijgen, omdat 100m wel in de jongenslijst staat maar niet in de meisjeslijst, én de categorie-brede knop "Nieuw onderdeel" meldde "bestaat al". Via dit nieuwe scherm kan een meisje nu gewoon een 100m (of elk ander onderdeel) krijgen, los van de standaardlijst voor haar geslacht.

De bestaande knop **➕ Nieuw onderdeel** (voor de hele categorie) blijft ongewijzigd. Atleet-eigen onderdelen verschijnen niet in dat beheerscherm en pas in het algemene onderdeel-filter zodra er een PR voor is ingevoerd.

**2. Tijden vanaf 60 seconden worden als m:ss.hh getoond.**
Tijd-in-seconden onderdelen (sprintnummers en eigen onderdelen van het type "seconden") worden vanaf 60 seconden weergegeven als minuten:seconden, net als de lange loopnummers. Voorbeeld: een 300m van 64,32 sec verschijnt nu als `1:04.32`; onder de minuut blijft het gewoon in seconden (`14.20`). Dit geldt voor de weergave overal — overzicht, ranglijst, opstelling, invoerveld, print/WhatsApp en Excel — en óók voor PR's die je eerder al in seconden had ingevoerd. Afstand-/hoogteonderdelen (bijv. 65,00 m kogel) blijven uiteraard in meters. Bij het invoeren mag je voortaan zowel `64.32` als `1:04.32` typen.

#### Technisch
- **Database:** kolom `atleet_id` toegevoegd aan tabel `onderdelen` (nullable, `REFERENCES atleten(id) ON DELETE CASCADE`). Leeg = categorie-breed onderdeel (zoals voorheen); gevuld = onderdeel alleen voor die atleet.
- `getPRDisciplinesVoorAtleet()` neemt nu zowel categorie-brede eigen onderdelen (voor het juiste geslacht of "beide") als atleet-eigen onderdelen (`atleet_id` == deze atleet) mee. Nieuwe helper `isAtleetEigenOnderdeel()`.
- Nieuwe functies `voegAtleetOnderdeelToe()` en `verwijderAtleetOnderdeel(idx)`; `herlaadBulkPRForm()` toont de toevoeg-sectie en markeert eigen onderdelen. `renderOnderdeelLijst()` en het algemene onderdeel-filter filteren op `atleet_id == null`.
- Nieuwe helpers `isTijdSecondenOnderdeel()` en `secondenNaarMinFormaat()`. `normaliserenResultaat()` accepteert nu ook m:ss-invoer voor seconden-onderdelen en slaat ≥ 60 sec op als `m:ss.hh`; `formateerResultaatWeergave()` doet dezelfde omzetting bij weergave (ook voor oudere, plat opgeslagen tijden). De ruwe PR-weergave in de opstelling/slotkeuze/print/tabel loopt nu ook via `formateerResultaatWeergave()`.
- Sortering en puntenberekening blijven ongewijzigd: `parseResultaat()` zet zowel `m:ss.hh` als platte seconden naar hetzelfde aantal seconden om.

#### Wat niet getest kon worden
- De echte Supabase-queries (insert/delete van een atleet-eigen onderdeel via de nieuwe kolom, en of de bestaande RLS-policy de nieuwe rijen correct afdekt) en het opnieuw importeren van een geëxporteerd Excel-PR-overzicht waarin een 300m als `m:ss.hh` staat. De pure logica (weergave-omzetting vanaf 60 sec, m:ss-invoer normaliseren, onderdelenlijst per atleet, sortering blijft gelijk) is wel los getest.

---

## [juni 2026 — patch 40] — 2026-06-14

### 🏅 Onderdeel-filter met ranglijst + eigen onderdelen + 60m verwijderd

Drie wijzigingen in de Prestaties-tab.

**1. Filteren op onderdeel = ranglijst.**
Kies je in de Prestaties-tab een onderdeel (zonder een specifieke atleet), dan zie je nu één ranglijst met de beste PR per atleet, beste bovenaan. Voor loop-/tijdonderdelen geldt sneller = beter, voor veld-/afstandonderdelen verder of hoger = beter. De atleet-filter werkt ongewijzigd; kies je géén filter, dan zie je nog steeds de gegroepeerde lijst per atleet.

**2. Eigen onderdelen toevoegen (knop ➕ Nieuw onderdeel).**
Staat een onderdeel niet in de standaardlijst, dan kun je het zelf toevoegen via een nieuw beheerscherm. Je kiest een naam, een type (tijd in seconden, tijd in minuten, of afstand/hoogte in meters) en voor wie het geldt (jongens, meisjes of beide). Een toegevoegd onderdeel verschijnt daarna automatisch bij het invoeren van PR's en in het onderdeel-filter, en kan ook weer verwijderd worden (reeds ingevoerde prestaties blijven dan bestaan). Onderdelen worden per categorie in de database bewaard (nieuwe tabel `onderdelen`).

*Afbakening:* eigen onderdelen werken alléén in de Prestaties-tab (PR's vastleggen + filteren/ranglijst). Ze komen bewust niet in het wedstrijdprogramma, de opstelling of de puntenrekentool, omdat daar geen officiële Atletiekunie-puntenformule voor bestaat. Voor eigen onderdelen worden dus geen punten berekend.

**3. 60m (en 60m horden / 60mh) verwijderd.**
`60m` is uit de centrale lijst `U16_DISCIPLINES` gehaald, waardoor het verdwijnt uit het wedstrijdprogramma-keuzemenu én de keuzelijst bij PDF-import. In de Excel-PR-import worden `60 meter` en `60 meter horden` (alle varianten) nu overgeslagen in plaats van geïmporteerd. `60mh` / `60m horden` stonden al op overslaan bij de PDF-import; dat blijft zo.

**Technische details:**
- Nieuwe tabel `onderdelen` (`categorie_id`, `naam`, `type`, `geslacht`, `aangemaakt`), geladen in `syncAll()` (faalt zacht als de tabel ontbreekt). Globale state `customOnderdelen`.
- Nieuwe helpers `vindCustomOnderdeel()`, `isLagerBeter()` en `isMinutenFormaat()`; `getPREenheid`, `getPRPlaceholder`, `normaliserenResultaat`, `formateerResultaatWeergave`, `bestePrestatie` en de PR-bepaling in `renderPrestatieTable` zijn custom-bewust gemaakt.
- `getPRDisciplinesVoorAtleet()` plakt eigen onderdelen (op geslacht) achter de standaardlijst; de bulk-PR-velden gebruiken nu index-gebaseerde id's (veilig bij speciale tekens in namen).
- `renderPrestaties()` vult het filter met onderdelen-met-data + eigen onderdelen en roept bij een gekozen onderdeel de nieuwe `renderOnderdeelRanglijst()` aan.
- Beheerscherm: `openOnderdeelModal()`, `renderOnderdeelLijst()`, `saveOnderdeel()`, `deleteOnderdeel()`, `laadOnderdelen()`.

**Niet kunnen testen door mij (handmatig te controleren in de browser):**
- De echte Supabase-queries en of de RLS-policy van de nieuwe tabel in jouw project precies zo werkt; het opslaan/verwijderen/laden van een eigen onderdeel. De pure logica (ranglijst-sortering, lager/hoger = beter, eenheid per type, 60m eruit) is wel los getest.

**Supabase-wijziging nodig** — eenmalig de nieuwe tabel `onderdelen` aanmaken met `GRANT` + RLS (zie chat / `supabase_setup.sql`).

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [juni 2026 — patch 39] — 2026-06-11

### 🏆 Sterkst mogelijke opstelling bij finales

Voor wedstrijden met de finale-markering werken **⚡ Automatisch opstellen** en **🧩 Aanvullen** anders: ze stellen het sterkst mogelijke team samen. Bij alle niet-finale wedstrijden verandert er niets aan de opstellingslogica.

**Nieuw gedrag bij finales:**
- **Puur de sterkste atleet per onderdeel.** De "iedereen minstens 2 onderdelen"-stap (ronde 2) vervalt, net als de bijbehorende oranje waarschuwing. Een atleet mag dus 1 onderdeel doen als dat tot het beste team leidt.
- **De 15-minutenregel vervalt** bij finales, zodat een atleet ook voor twee kort op elkaar volgende onderdelen kan worden ingezet.
- **Geen dubbele inzet over finales op dezelfde dag.** Een atleet die al in een *opgeslagen* opstelling van een andere finale op dezelfde datum staat (zelfde categorie + geslacht), wordt niet automatisch ingedeeld. Bij Aanvullen blijft een eventuele handmatige keuze staan, met een waarschuwing.

**Blijft ook bij finales gelden:** maximaal 3 onderdelen per atleet, de 800m/1500m-vs-300m 3-uursregel, technische onderdelen in één startgroep, en een atleet zit in maar één ploeg.

**Belangrijk over de volgorde:** omdat de uitsluiting op *opgeslagen* opstellingen werkt, bepaalt de volgorde van opslaan wie waar terechtkomt. Stel finale A op en sla op, daarna finale B → B laat A's atleten weg. Genereer je A daarna opnieuw, dan vallen B's atleten weg.

**Technische details:**
- Nieuwe helper `laadAndereFinaleAtleten(wedstrijdId, datum, geslacht)` haalt via de `opstelling`-tabel de atleet-id's op uit andere finale-opstellingen op dezelfde datum.
- `genereerOpstelling()` en `aanvullenOpstelling()` zijn nu `async`; ze bepalen `isFinale` en sluiten de geblokkeerde atleten uit `beschikbareAtleten` uit. De 15-minutencheck en ronde 2 zijn in `if (!isFinale)` gezet.

**Niet kunnen testen door mij (handmatig te controleren in de browser):**
- Het effect op een echte finale met opgeslagen opstellingen, en de uitsluiting tussen twee finales op dezelfde dag (vereist Supabase-data). De kernlogica (finale-detectie, datum-filter, atleten verzamelen, 15-min/ronde 2 overslaan) is wel los getest.

**Geen Supabase-wijziging nodig** — gebruikt de bestaande tabellen `wedstrijden` (kolom `is_finale`) en `opstelling`.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [juni 2026 — patch 38] — 2026-06-09

### 🧹 Afgelopen-wedstrijdkaarten: knoppen verwijderd

Verfijning van patch 37. Op de kaarten onder "Afgelopen wedstrijden" zijn de losse knoppen verwijderd; de kaart zelf is de enige interactie.

**Gewijzigd:**
- De knoppen ✏️ Bewerken, 📋 Programma en 📄 Importeer PDF zijn **weggelaten** op afgelopen-wedstrijdkaarten. De volledige kaart blijft klikbaar en opent de opstelling in alleen-lezen-modus (patch 37).
- Onderaan de kaart staat nu een hint **👁️ Bekijk opstelling**.
- **Aankomende** wedstrijden houden hun knoppen ongewijzigd.

**Technische details:**
- `wedstrijdKaartHtml()`: de onderkant van de kaart is afhankelijk van `afgelopen` — bij afgelopen een hint-tekst i.p.v. de knoppenrij.

**Geen Supabase-wijziging nodig.**

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [juni 2026 — patch 37] — 2026-06-09

### 🔒 Opstelling van afgelopen wedstrijd raadplegen (alleen lezen)

Een afgelopen wedstrijd kun je nu aanklikken om de bijbehorende opstelling te bekijken, zonder dat je hem per ongeluk wijzigt.

**Nieuw:**
- In de Wedstrijden-tab is een kaart onder "Afgelopen wedstrijden" nu **volledig klikbaar** en heeft die **geen losse knoppen** meer (✏️ / 📋 / 📄 zijn weggelaten). Klikken op de kaart opent de opgeslagen opstelling in de Opstelling-tab in **alleen-lezen-modus**. Een hint "👁️ Bekijk opstelling" maakt duidelijk dat de kaart aanklikbaar is. (Aankomende wedstrijden houden hun knoppen.)
- In alleen-lezen-modus zijn alle bewerkacties **uitgeschakeld**: slots zijn niet aanklikbaar, er is geen ✕ om iemand te verwijderen, en de knoppen ⚡ Automatisch opstellen, 🧩 Aanvullen, 💾 Opslaan, het aantal-ploegen-keuzemenu en de beschikbaarheid-sectie zijn verborgen.
- Wél beschikbaar blijven: ploegen in-/uitklappen, wisselen tussen 👦 Jongens / 👧 Meisjes, en 📥 Exporteren, 🖨️ Afdrukken en 📲 Delen via WhatsApp (handelingen die niets wijzigen).
- Bovenaan verschijnt een **🔒 Alleen lezen — afgelopen wedstrijd**-badge.
- De getoonde ploegen worden afgeleid uit de daadwerkelijk opgeslagen opstelling, zodat je exact ziet wat er destijds stond (ongeacht de algemene instelling voor het aantal ploegen). Is er voor dat geslacht niets opgeslagen, dan verschijnt de melding "Geen opstelling opgeslagen voor …".

**Toegang:** ongewijzigd. Het raadplegen werkt op dezelfde, al-gefilterde data van de actieve categorie (RLS + categorie-filter). Een trainer kan dus alleen opstellingen van zijn eigen categorie(ën) inzien.

**Technische details:**
- Nieuwe statevariabele `opstellingAlleenLezen` (default `false`).
- Nieuwe functies `bekijkOpstelling(wedstrijdId)` (opent vanuit de Wedstrijden-tab) en `pasOpstellingModusToe()` (toont/verbergt bewerk-elementen).
- `openOpstelling()` kreeg een tweede parameter `alleenLezen` (default `false`); `terug_naar_wedstrijden()` reset de vlag.
- `renderPloegen()` leidt in alleen-lezen-modus de ploegen af uit `opstellingData`; `renderPloeg()`-slots renderen zonder klik/✕.
- `wedstrijdKaartHtml()`: afgelopen kaarten zijn klikbaar en tonen geen knoppen; aankomende kaarten houden hun knoppen.
- Bewerk-elementen gemarkeerd met class `bewerk-actie`; nieuwe CSS: `.readonly-badge`, `.atleet-slot.readonly`.

**Niet kunnen testen door mij (handmatig te controleren in de browser):**
- Het openen van een afgelopen opstelling, het correct verbergen van de bewerkknoppen en het wisselen van geslacht in alleen-lezen-modus (vereist Supabase-data van een eerder opgeslagen opstelling).

**Geen Supabase-wijziging nodig** — deze patch gebruikt de bestaande tabel `opstelling`.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`

---

## [juni 2026 — patch 36] — 2026-06-09

### 🏆 Finale-markering + scheiding aankomende/afgelopen wedstrijden

Een wedstrijd kan nu als **finale** worden gemarkeerd, en de Wedstrijden-tab maakt onderscheid tussen aankomende en afgelopen wedstrijden.

**Nieuw:**
- **Finale-schakelaar** in de wedstrijd-modal (tussen Locatie en Notities). Aan/uit per wedstrijd, opgeslagen in de nieuwe kolom `is_finale` op de tabel `wedstrijden`.
- Wedstrijden die als finale zijn gemarkeerd krijgen een gouden **🏆 FINALE**-badge en een subtiele oranje rand. De badge verschijnt op:
  - de wedstrijdkaart in de Wedstrijden-tab
  - de wedstrijd-keuzelijst in de Opstelling-tab (stap 1)
  - de kop van de gekozen wedstrijd in de Opstelling-tab (stap 2)
- **Scheiding aankomende/afgelopen**: de Wedstrijden-tab toont twee secties — "📅 Aankomende wedstrijden" en "✅ Afgelopen wedstrijden". Een wedstrijd telt als afgelopen wanneer de datum vóór vandaag ligt; wedstrijden zonder datum staan bij aankomend.
  - Aankomend gesorteerd op eerstvolgende bovenaan, afgelopen op meest recente bovenaan.
  - De afgelopen-lijst is **inklapbaar** (chevron ▾/▸ in de kop), maar standaard **opengeklapt**.
  - De afgelopen-kaarten worden iets gedimd weergegeven (vol contrast bij hover).

**Toegang (ongewijzigd, bewust):** de scheiding werkt over de al-gefilterde lijst van de actieve categorie. Een trainer ziet dus alleen afgelopen wedstrijden van categorieën waarvoor hij rechten heeft; een admin kan via de categorie-switcher bij alle categorieën. Er is geen nieuwe query toegevoegd die categorieën samenvoegt — RLS en het bestaande categorie-filter blijven leidend.

**Technische details:**
- Nieuwe helperfuncties `isWedstrijdAfgelopen(w)` en `wedstrijdKaartHtml(w, afgelopen)`; `renderWedstrijden()` herschreven met twee secties.
- Nieuwe statevariabele `afgelopenIngeklapt` (standaard `false`) + functie `toggleAfgelopen()`.
- `openWedstrijdModal()` laadt `is_finale` in de checkbox `#w-finale`; `saveWedstrijd()` slaat `is_finale` mee op.
- `openOpstelling()` en `renderOpstellingWedstrijden()` tonen de finale-badge.
- Nieuwe CSS-klassen: `.finale-badge`, `.wedstrijd-card.is-finale`, `.wedstrijd-card.afgelopen`, `.wedstrijd-sectie-kop`, `.toggle-switch`/`.toggle-slider`. De buitenste `#wedstrijden-grid` is geen CSS-grid meer; de twee secties hebben elk een eigen `.grid`.

**Niet kunnen testen door mij (handmatig te controleren in de browser):**
- De Supabase-update/insert met de nieuwe kolom `is_finale` (vereist dat de SQL hieronder is uitgevoerd).
- Het in/uitklappen van de afgelopen-lijst en de weergave van de badges in de live app.

**Supabase SQL (zelf uitvoeren vóór gebruik):**
```sql
ALTER TABLE public.wedstrijden
  ADD COLUMN IF NOT EXISTS is_finale boolean NOT NULL DEFAULT false;
```
> `wedstrijden` is een bestaande tabel, dus er zijn geen extra `GRANT`- of RLS-regels nodig.

**Bestanden gewijzigd:** `app.html`, `CHANGELOG.md`, `PROJECTNOTITIES.md`
Supabase: kolom `is_finale` toegevoegd aan tabel `wedstrijden`.

---

## [mei 2026 — patch 35] — 2026-05-25

### 🖨️ Afdrukken opstelling: leesbare paginagrootte

De afdruk vulde voorheen slechts een deel van de pagina omdat de body grote vaste marges had (`20mm 18mm`) die de bruikbare breedte sterk beperkten.

**Gewijzigd:**
- Paginaformaat vastgezet op **A4 liggend (landscape)** via `@page { size: A4 landscape; }` — de tabel heeft nu altijd maximale breedte
- Marges beheerd via `@page { margin: 12mm 14mm; }` in plaats van `body padding` — dit is de correcte manier voor printdocumenten
- `body padding` verwijderd (veroorzaakte de kleine afdruk)
- Aparte `@media print` blok verwijderd en samengevoegd met de `@page` regel
- Lettertypes iets vergroot: tabelinhoud van 11px naar 12px, kolomkoppen van 9px naar 10px

---



### 🖨️ Afdrukken opstelling: verbeterde paginaopmaak

Drie verbeteringen in de "Opstelling afdrukken" functie (`printOpstelling`):

**Gewijzigd:**
- Vaste kolombreedtes via `<colgroup>` in elke tabel (Onderdeel 22%, Starttijd 12%, Startgroep 14%, Atleet 38%, PR 14%) — alle teams hebben nu dezelfde uitlijning ongeacht het aantal atleten
- Volledig lege teams worden niet meer afgedrukt — een team telt als leeg wanneer geen enkel slot een atleet bevat
- Elk team begint op een nieuwe pagina (`page-break-before: always`) — het document-kopje (wedstrijdnaam, datum, locatie) staat boven het eerste ingevulde team
- Overbodige hulpfunctie `bouwGeslachtHtml` verwijderd en vervangen door de nieuwe `bouwAlleTeams` + `isPloegLeeg`

---



### ✨ Aantal ploegen per geslacht instelbaar

Het aantal ploegen (1, 2 of 3) is nu **per geslacht apart** in te stellen. Voorheen gold één instelling voor zowel jongens als meisjes tegelijk.

**Gewijzigd:**
- Variabele `aantalPloegen` vervangen door `aantalPloegenPerGeslacht` (object met sleutels `M` en `V`, standaard beide 3)
- `setAantalPloegen()` slaat het gekozen aantal nu op voor het actieve geslacht
- `setOpstellingGeslacht()` synchroniseert de dropdown bij het wisselen van geslacht-tab
- Alle functies die `ploegNamen` opbouwen gebruiken nu `aantalPloegenPerGeslacht[actiefGeslacht]`

---

## [mei 2026 — patch 32] — 2026-05-19

### 🧹 Atletiek.nu API-koppeling verwijderd

Alle functionaliteit die via de Cloudflare Worker (`atletiek-nu-api-milan.milande-maat.workers.dev`) communiceerde met atletiek.nu is verwijderd, omdat deze door Cloudflare-beperkingen structureel niet werkt.

**Verwijderd:**
- Knop "🌐 PRs ophalen van atletiek.nu" in de Prestaties-tab
- Modal "Zoek op Atletiek.nu" (atleet + wedstrijd zoeken, PR's importeren per atleet)
- Modal "PRs ophalen van atletiek.nu" (bulk PR-import via login of cookie-methode)
- Constante `ATL_API` en alle bijbehorende JS-functies en variabelen

**Bewaard (geen API-call):**
- PDF-import van tijdschema (werkt lokaal via PDF.js, geen externe koppeling)
- Opstelling exporteren in atletiek.nu-format (lokale Excel-export, geen API)

---

## [mei 2026 — patch 31] — 2026-05-19

### 🖨️📲 Afdrukken en delen per team

Trainers kunnen nu de opstelling van één specifiek team afdrukken of via WhatsApp delen, los van de bestaande knoppen die de volledige opstelling verwerken.

**Hoe het werkt:**
- In de header van elk team (Team 1, Team 2, Team 3) staan twee nieuwe icoonknoppen: `🖨️` en `📲`
- `🖨️` opent een printvenster met alleen de onderdelen en atleten van dat ene team
- `📲` opent WhatsApp met een kant-en-klare tekst voor dat ene team
- De knoppen zijn alleen zichtbaar op scherm (verborgen bij afdrukken van de volledige opstelling)
- Klikken op de knoppen opent/sluit het teamblok **niet** — ze werken onafhankelijk van de collapse-toggle

**Technische details:**
- Nieuwe functies `printPloeg(ploeg)` en `deelPloegViaWhatsApp(ploeg)` in `app.html`
- `event.stopPropagation()` zorgt dat de collapsible header niet toggled bij klik op de knoppen
- `printPloeg()` bouwt een zelfstandig HTML-document (zelfde stijl als de volledige print) voor één team
- Lege onderdelen (geen atleet ingevuld) worden overgeslagen in zowel print als WhatsApp-tekst
- CSS-klasse `.ploeg-acties` en `.ploeg-actie-btn` voor subtiele stijl passend bij de header

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

> ℹ️ Update (patch 45): 60m, 60m horden en 4x60m zijn weer beschikbaar — maar uitsluitend binnen de **U14**-categorie. De puntenconstante voor 60m is in patch 45 ook hersteld.

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
