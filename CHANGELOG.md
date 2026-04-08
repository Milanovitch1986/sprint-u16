# Release Notes — Sprint U16
## v1.0.0 — Eerste volledige release
*April 2026 · AV Sprint Breda*

---

### Over deze release

Sprint U16 is de officiële beheertool voor trainers van AV Sprint Breda. Met deze release is de app volledig functioneel en klaar voor gebruik tijdens het interclub-competitieseizoen 2026. De app vervangt losse Excel-bestanden en papieren overzichten door één centrale plek waar alle informatie over atleten, persoonlijke records en wedstrijdopstellingen beheerd kan worden.

---

### Nieuwe functies

#### 👤 Atletenbeheer
- Atleten toevoegen, bewerken en verwijderen
- Gegevens per atleet: naam, geslacht, geboortedatum, club en bondsnummer
- Excel-import voor bulktoevoegen van atleten
- Zoeken en filteren op naam, club of geslacht

#### 🏅 Persoonlijke records (PR's)
- PR's invoeren en bijhouden per atleet per discipline
- Overzicht van alle PR's gefilterd op atleet of discipline
- Resultaten worden automatisch gesorteerd op beste prestatie

#### 🏟️ Wedstrijden
- Wedstrijden aanmaken met naam, datum, locatie en link naar atletiek.nu
- Overzicht van alle geplande wedstrijden

#### 📋 Programma & opstelling
- Wedstrijdprogramma samenstellen per discipline en geslacht
- Beschikbaarheid per atleet registreren
- Automatische opstellingsgeneratie op basis van PR's en NAU-scoretabellen
- Conflictdetectie: atleten worden niet dubbel ingepland binnen 15 minuten
- Opstelling opslaan en herladen per wedstrijd

#### 🔐 Veilig inloggen
- E-mail + wachtwoord login
- Verplichte tweefactorauthenticatie (2FA / TOTP) via authenticator-app
- Uitnodiging-only registratie: alleen trainers met een geldige uitnodigingscode kunnen een account aanmaken

#### ⚙️ Admin panel
- Uitnodigingen aanmaken en beheren per categorie
- Overzicht van geregistreerde gebruikers met rol en laatste login
- Categorieën aanmaken en verwijderen (U14, U16, U18 etc.)
- Toegangsbeheer: per trainer instellen welke categorieën zichtbaar zijn

#### 🔄 Categorieënsysteem
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

Alle 24 functies zijn getest en goedgekeurd vóór deze release:

| Categorie | Getest | Geslaagd |
|---|---|---|
| Login & authenticatie | 4 | ✅ 4 |
| Atletenbeheer (CRUD) | 4 | ✅ 4 |
| Prestaties | 2 | ✅ 2 |
| Wedstrijden & programma | 3 | ✅ 3 |
| Beschikbaarheid & opstelling | 2 | ✅ 2 |
| Admin panel | 5 | ✅ 5 |
| Categorie-switcher | 4 | ✅ 4 |
| **Totaal** | **24** | **✅ 24** |

---

### Dankwoord

Deze app is in samenwerking met Claude (Anthropic) ontwikkeld over meerdere sessies, startend als een eenvoudige standalone HTML-tool en uitgegroeid tot een volwaardige multi-user webapplicatie met Supabase-backend, 2FA-beveiliging en een categorieënsysteem voor meerdere leeftijdsgroepen.

---

*Veel succes met de SPAR Competitie U14/U16 P61 R1 op 11 april 2026! 🏃*
