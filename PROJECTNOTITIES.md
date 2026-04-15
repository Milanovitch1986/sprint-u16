# Sprint U16 — Projectnotities
*AV Sprint Breda · Laatste update: april 2026*

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
| `wedstrijden` | Wedstrijden (naam, datum, locatie) |
| `programma` | Onderdelen per wedstrijd per geslacht |
| `opstelling` | Teamopstelling per wedstrijd per geslacht per ploeg (JSON) |
| `beschikbaarheid` | Beschikbaarheid per atleet per wedstrijd |
| `uitnodigingen` | Invite-only registratie (token, email, categorie_id, vervalt) |

**Belangrijk:** alle datatabellen gebruiken `categorie_id` als toegangssleutel — NIET `eigenaar_id`.
Row Level Security zorgt dat trainers alleen data zien van hun eigen categorieën.

---

## ⚠️ Bekende technische beslissingen

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

---

## 🔗 Externe koppelingen

| Service | Details |
|---------|---------|
| Atletiek.nu API | Cloudflare Worker: `atletiek-nu-api-milan.milande-maat.workers.dev` |
| World Athletics PR | `worldathletics.nimarion.de` |
| NAU scoretabellen | Ingebouwd (U14/U16, feb. 2022) |

**Let op:** atletiek.nu Worker kan soms worden geblokkeerd door bot-detectie.

---

## 📋 Puntentelling (NAU, feb. 2022)

- **Loop:** `PUNTEN = INT(A / tijd - B)`
- **Veld:** `PUNTEN = INT(A × SQRT(afstand) - B)`
- INT kapt naar beneden af (geen afronding)
- Jongens en meisjes gebruiken dezelfde constanten bij U16

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

## ✅ Geteste features (april 2026)

Alle 24 features getest en werkend: login, auth guard, atleet CRUD,
prestatie CRUD, wedstrijd CRUD, programma, beschikbaarheid, opstelling,
zoekfunctie, Excel import, atletiek.nu koppeling, admin panel
(uitnodigingen + gebruikers + categorieën + toegang per trainer),
categorie-switcher, categorie-isolatie, uitnodiging met categorie, 2FA setup.
