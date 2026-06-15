# Changelog — Sprint U16
*AV Sprint Breda · Atletiekbeheertool*

Alle wijzigingen worden hier bijgehouden, nieuwste bovenaan.
Formaat gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/).

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
