# Release Notes — Sprint U16

## v1.0.1 — Estafette bugfix
*April 2026 · AV Sprint Breda*

---

### 🐛 Bugfix: Estafette opstellingsgeneratie

**Probleem:** Bij automatisch opstellen werd voor alle estafette-onderdelen (4×100m, 4×80m, Zweedse estafette) slechts 1 atleet per ploeg ingevuld. Een estafetteteam bestaat echter uit 4 lopers.

**Oplossing:** Op 5 plekken in de code was `maxSlots` voor estafette ingesteld op `1`. Dit is gecorrigeerd naar `4`:

| Functie | Wat is veranderd |
|---|---|
| `renderPloeg` | Toont nu 4 klikbare lopers-slots bij estafette |
| `checkConflict` | Herkent alle 4 lopers bij tijdconflict-check |
| `telOnderdelenAtleet` | Telt estafette correct als 1 onderdeel (ook al zijn er 4 slots) |
| `genereerOpstelling` | Vult nu de 4 snelste beschikbare atleten in |
| `exporteerOpstelling` | Exporteert alle 4 lopers correct naar Excel |

**Spelregels ongewijzigd:**
- Estafette telt als 1 onderdeel per atleet (niet als 4)
- Max 3 onderdelen per atleet per wedstrijd geldt nog steeds
- Een atleet mag maar in 1 ploeg — ook voor estafette-lopers
- Tijdconflict-detectie (15 minuten) werkt voor alle 4 lopers

**Bestanden gewijzigd:** `app.html`

---

## v1.0.0 â Eerste volledige release
*April 2026 Â· AV Sprint Breda*

---

### Over deze release

Sprint U16 is de officiÃ«le beheertool voor trainers van AV Sprint Breda. Met deze release is de app volledig functioneel en klaar voor gebruik tijdens het interclub-competitieseizoen 2026. De app vervangt losse Excel-bestanden en papieren overzichten door Ã©Ã©n centrale plek waar alle informatie over atleten, persoonlijke records en wedstrijdopstellingen beheerd kan worden.

---

### Nieuwe functies

#### ð¤ Atletenbeheer
- Atleten toevoegen, bewerken en verwijderen
- Gegevens per atleet: naam, geslacht, geboortedatum, club en bondsnummer
- Excel-import voor bulktoevoegen van atleten
- Zoeken en filteren op naam, club of geslacht

#### ð Persoonlijke records (PR's)
- PR's invoeren en bijhouden per atleet per discipline
- Overzicht van alle PR's gefilterd op atleet of discipline
- Resultaten worden automatisch gesorteerd op beste prestatie

#### ðï¸ Wedstrijden
- Wedstrijden aanmaken met naam, datum, locatie en link naar atletiek.nu
- Overzicht van alle geplande wedstrijden

#### ð Programma & opstelling
- Wedstrijdprogramma samenstellen per discipline en geslacht
- Beschikbaarheid per atleet registreren
- Automatische opstellingsgeneratie op basis van PR's en NAU-scoretabellen
- Conflictdetectie: atleten worden niet dubbel ingepland binnen 15 minuten
- Opstelling opslaan en herladen per wedstrijd

#### ð Veilig inloggen
- E-mail + wachtwoord login
- Verplichte tweefactorauthenticatie (2FA / TOTP) via authenticator-app
- Uitnodiging-only registratie: alleen trainers met een geldige uitnodigingscode kunnen een account aanmaken

#### âï¸ Admin panel
- Uitnodigingen aanmaken en beheren per categorie
- Overzicht van geregistreerde gebruikers met rol en laatste login
- CategorieÃ«n aanmaken en verwijderen (U14, U16, U18 etc.)
- Toegangsbeheer: per trainer instellen welke categorieÃ«n zichtbaar zijn

#### ð CategorieÃ«nsysteem
- Data is gekoppeld aan een categorie (bijv. U16), niet aan een individuele trainer
- Meerdere trainers kunnen dezelfde categorie beheren
- Categorie-switcher in de navigatiebalk om snel te wisselen
- Logo en navigator passen zich automatisch aan aan de actieve categorie

---

### Technische details

| | |
|---|---|
| **Hosting** | GitHub Pages (gratis, altijd beschikbaar) |
| **Database** | Supabase (PostgreSQL met Row Level Security) |
| **Authenticatie** | Supabase Auth met TOTP 2FA |
| **Frontend** | Vanilla HTML/CSS/JavaScript |
| **Compatibiliteit** | Desktop en mobiel (Chrome, Firefox, Safari) |

---

### Bekende beperkingen in v1.0

- De Cloudflare Worker voor automatisch ophalen van PR's van atletiek.nu is geblokkeerd door bot-beveiliging. PR's moeten handmatig ingevoerd worden.
- De app is alleen in het Nederlands beschikbaar.
- Excel-import verwacht een specifiek formaat (Achternaam, Initialen tussenvoegsel (Voornaam)).

---

### Testresultaten

Alle 24 functies zijn getest en goedgekeurd vÃ³Ã³r deze release:

| Categorie | Getest | Geslaagd |
|---|---|---|
| Login & authenticatie | 4 | â 4 |
| Atletenbeheer (CRUD) | 4 | â 4 |
| Prestaties | 2 | â 2 |
| Wedstrijden & programma | 3 | â 3 |
| Beschikbaarheid & opstelling | 2 | â 2 |
| Admin panel | 5 | â 5 |
| Categorie-switcher | 4 | â 4 |
| **Totaal** | **24** | **â 24** |

---

### Dankwoord

Deze app is in samenwerking met Claude (Anthropic) ontwikkeld over meerdere sessies, startend als een eenvoudige standalone HTML-tool en uitgegroeid tot een volwaardige multi-user webapplicatie met Supabase-backend, 2FA-beveiliging en een categorieÃ«nsysteem voor meerdere leeftijdsgroepen.

---

*Veel succes met de SPAR Competitie U14/U16 P61 R1 op 11 april 2026! ð*
