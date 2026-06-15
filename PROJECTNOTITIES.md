# Sprint U16 — Projectnotities
*AV Sprint Breda · Laatste update: 15 juni 2026 (patch 44)*

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
| `onderdelen` | Zelf toegevoegde onderdelen (naam, type, geslacht) — categorie-breed (`atleet_id` leeg) of per atleet (`atleet_id` gevuld, patch 41) — patch 40 |
| `wedstrijden` | Wedstrijden (naam, datum, locatie, notities, `is_finale`) |
| `programma` | Onderdelen per wedstrijd per geslacht |
| `opstelling` | Teamopstelling per wedstrijd per geslacht per ploeg (JSON) |
| `beschikbaarheid` | Beschikbaarheid per atleet per wedstrijd |
| `uitnodigingen` | Invite-only registratie (token, email, categorie_id, vervalt, gebruikt) |

**Belangrijk:** alle datatabellen gebruiken `categorie_id` als toegangssleutel — NIET `eigenaar_id`.
Row Level Security zorgt dat trainers alleen data zien van hun eigen categorieën.

---

## ⚠️ Bekende technische beslissingen

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


### Eigen onderdelen per atleet (patch 41, juni 2026)
De tabel `onderdelen` heeft een nullable kolom `atleet_id` (`REFERENCES atleten(id) ON DELETE CASCADE`). Leeg = categorie-breed onderdeel (gedrag van patch 40, gefilterd op `geslacht`); gevuld = onderdeel dat alléén voor die ene atleet geldt. `getPRDisciplinesVoorAtleet()` neemt beide soorten mee: categorie-breed (`atleet_id == null` én geslacht "B"/match) + atleet-eigen (`atleet_id` == deze atleet). Toevoegen/verwijderen gebeurt in het PR-invoerscherm zelf: `bulkExtraOnderdeelHtml()` rendert de toevoeg-sectie, `voegAtleetOnderdeelToe()` doet de insert (met `atleet_id`, geslacht = dat van de atleet) en checkt of het onderdeel al in de lijst van die atleet staat, `verwijderAtleetOnderdeel(idx)` verwijdert de definitie én eventuele PR's van die atleet voor dat onderdeel. Helper `isAtleetEigenOnderdeel(disc, atleetId)` markeert eigen regels (label *eigen* + ✕). Het categorie-brede beheerscherm (`renderOnderdeelLijst()`) en het algemene onderdeel-filter in `renderPrestaties()` filteren op `atleet_id == null`; atleet-eigen onderdelen komen pas in het algemene filter zodra er een PR voor bestaat (via de data). **Lost knelpunt op:** een meisje kon geen 100m krijgen (100m staat in de jongenslijst, niet de meisjeslijst, en "Nieuw onderdeel" gaf "bestaat al" door de gecombineerde standaardcheck). Via dit scherm kan elke atleet nu een onderdeel buiten haar/zijn standaardlijst krijgen.

### Tijden vanaf 60 sec als m:ss.hh (patch 41, juni 2026)
Tijd-in-seconden onderdelen (sprint + eigen onderdelen type `tijd_sec`) worden vanaf 60 sec getoond als `m:ss.hh`, net als de lange loopnummers. Nieuwe helpers: `isTijdSecondenOnderdeel(disc)` (= `isLagerBeter(disc) && !isMinutenFormaat(disc)`, dus geen veld/afstand en geen minuten-onderdeel) en `secondenNaarMinFormaat(secStr)` (string-gebaseerde omzetting, decimalen blijven exact behouden, geen float-afrondingsfout). `normaliserenResultaat()` accepteert nu ook m:ss-invoer voor seconden-onderdelen en slaat platte seconden ≥ 60 op als `m:ss.hh`; `formateerResultaatWeergave()` doet bij weergave dezelfde omzetting (dekt ook oudere, plat opgeslagen tijden). De ruwe PR-weergave in de opstelling, slotkeuze, print/WhatsApp en de opstellingstabel loopt nu ook via `formateerResultaatWeergave()`. **Belangrijk:** sortering en punten blijven ongewijzigd omdat `parseResultaat()` zowel `m:ss.hh` als platte seconden naar hetzelfde aantal seconden omzet. Afstand-/hoogteonderdelen worden nooit omgezet (een worp van 65 m blijft 65, geen 1:05).

### Eigen onderdelen + onderdeel-ranglijst (patch 40, juni 2026)
De Prestaties-tab kent zelf toegevoegde onderdelen, bewaard in de tabel `onderdelen` (`categorie_id`, `naam`, `type` ∈ `tijd_sec`/`tijd_min`/`afstand`, `geslacht` ∈ `M`/`V`/`B`). Geladen in `syncAll()` (faalt zacht) in `customOnderdelen`; ook los te herladen via `laadOnderdelen()`. Beheer via `openOnderdeelModal()` → `saveOnderdeel()` / `deleteOnderdeel()` / `renderOnderdeelLijst()`. De helpers `vindCustomOnderdeel()`, `isLagerBeter()` en `isMinutenFormaat()` bepalen richting (lager vs hoger = beter) en weergave; `getPREenheid`, `getPRPlaceholder`, `normaliserenResultaat`, `formateerResultaatWeergave`, `bestePrestatie` en de PR-bepaling in `renderPrestatieTable` raadplegen deze. `getPRDisciplinesVoorAtleet()` voegt eigen onderdelen (op geslacht) toe aan het invoerformulier; de bulk-PR-velden gebruiken index-gebaseerde id's. Bij het kiezen van een onderdeel-filter (zonder atleet) toont `renderOnderdeelRanglijst()` de beste PR per atleet, gesorteerd. **Bewust afgebakend tot de Prestaties-tab:** eigen onderdelen komen niet in het wedstrijdprogramma, de opstelling of de puntenrekentool, omdat daar geen Atletiekunie-puntenformule voor bestaat (`berekenPunten` geeft 0 terug voor onbekende onderdelen).

### 60m geen U16-onderdeel (patch 40, juni 2026)
`60m` is uit `U16_DISCIPLINES` verwijderd (verdween daarmee uit het programma-keuzemenu en de PDF-import-keuzelijst). In de Excel-PR-import (`DISC_MAP`) staan `60 meter` en `60 meter horden` (alle varianten) nu op `null` = overslaan; in `PDF_DISCIPLINE_VERTALING` stonden `60m`, `60mh` en `60m horden` al op `null`. Wie 60m toch wil bijhouden, kan het als eigen onderdeel toevoegen.

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

Toegevoegd in patch 27: `"300m horden"`, `"300mh"`, `"300mhorden"`.

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
- Logo toont actieve categorie: "⚡ Sprint U16" → "⚡ Sprint U14" etc.

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
| E-mail (uitnodiging + welkom) | Cloudflare Worker: `sprint-uitnodiging.milande-maat.workers.dev` + Brevo. POST-body: `{ email, link, type }` waarbij `type` = `"uitnodiging"` of `"welkom"`. API-sleutel: `sprint-u16-worker`, ingesteld als Secret `BREVO_API_KEY` in Worker |
| World Athletics PR | `worldathletics.nimarion.de` |
| NAU scoretabellen | Ingebouwd (U14/U16, feb. 2022) |

**Let op:** atletiek.nu Worker kan soms worden geblokkeerd door bot-detectie.

---

## 📋 Puntentelling (NAU, feb. 2022)

- **Loop:** `PUNTEN = INT(A / tijd - B)`
- **Veld:** `PUNTEN = INT(A × SQRT(afstand) - B)`
- INT kapt naar beneden af (geen afronding)
- Jongens en meisjes gebruiken dezelfde constanten bij U16

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
| 📥 PRs importeren | Prestaties-tab (Atletiek.nu sectie) | Atletiek.nu webresultaten | Haalt PR's op via externe koppeling |
| 📊 PR-overzicht importeren | Prestaties-tab | `.xlsx` breed formaat (naam + disciplines) | Importeert PR-overzicht met tijdomrekening |
| 📄 Tijdschema importeren | Wedstrijden-tab | `.pdf` wedstrijdprogramma | Importeert starttijden per onderdeel/geslacht |

### PR-overzicht Excel formaat (patch 14)
- Kolom A: atletennamen
- Rij 1: discipline-namen als kolomtitels (bijv. `80m`, `hoogspringen`, `1500m`)
- Cellen: waarden — tijden als getal (seconden) of als Excel-tijddecimaal, veld als meters
- Ondersteunde disciplines: 80m, 80m horden, 100m, 100m horden, 150m, 200m, 300m, 300m horden, 600m, 800m, 1500m, Hoogspringen, Verspringen, Speerwerpen, Discuswerpen, Kogelstoten, 4x100m, 4x80m

---

## 📁 Projectbestanden

| Bestand | Doel |
|---------|------|
| `app.html` | Hoofd-app (atleten, prestaties, wedstrijden, opstelling, admin) |
| `index.html` | Login + registratie + 2FA setup |
| `Sprint_U16_Spelregels.pdf` | Spelregels & werking voor trainers |
| `sprint-u16-dashboard.html` | Standalone statusdashboard (Supabase live checks) |

---

## 🗺️ Roadmap (volgend seizoen)

- [ ] Meerdere trainers per categorie uitnodigen en testen
- [ ] Categorieën U14 en U18/U20 activeren
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
