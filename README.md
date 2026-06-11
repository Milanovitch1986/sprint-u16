# Sprint U16 — Competitietool

Webapplicatie voor trainers van **AV Sprint Breda** om de jeugdcompetitie te beheren.
Op dit moment is de categorie **U16** actief; nieuwe categorieën zijn via het
admin-paneel toe te voegen.

🔗 **Live:** https://milanovitch1986.github.io/sprint-u16/

## Functies

- **Atletenbeheer** — inschrijvingen, persoonsgegevens en persoonlijke records (PR's)
- **Wedstrijdbeheer** — wedstrijden, programma en tijdschema; finales zijn als zodanig te markeren
- **Opstellingen per onderdeel** — automatisch opstellen en aanvullen; bij finales wordt het sterkst mogelijke team samengesteld
- **Beschikbaarheid** — bijhouden welke atleten beschikbaar zijn per wedstrijd
- **Categorieën** — U16 actief, uitbreidbaar via het admin-paneel
- **Uitnodigingen** — per categorie, met e-mailuitnodiging voor nieuwe gebruikers
- **Admin-paneel** — beheer van categorieën, gebruikers en releasenotes
- **Tweestapsverificatie (2FA / TOTP)** — verplicht voor alle gebruikers
- **PWA** — werkt offline en is installeerbaar op de telefoon

## Techniek

- Vanilla HTML/CSS/JavaScript (geen build-tool); de hoofdapplicatie is één bestand: `app.html`
- [Supabase](https://supabase.com) als backend:
  - **Auth** met verplichte 2FA (TOTP)
  - **PostgreSQL**-database met **Row Level Security (RLS)**
  - Toegang tot data verloopt via `categorie_id`
- E-mailuitnodigingen via een externe Cloudflare Worker (Brevo)
- Gehost als statische pagina op **GitHub Pages**

## Database

Het bestand `supabase_setup.sql` bevat de **basisstructuur** (tabellen en RLS-policies)
om een lege Supabase-database mee op te zetten.

> ⚠️ **Let op:**
> - Dit script bevat alleen `CREATE TABLE`- en policy-commando's; het **wist geen
>   bestaande data**. Op een database waar de tabellen al bestaan levert het juist
>   foutmeldingen op ("table already exists"). Het is dus géén reset-script.
> - Het script geeft de **beginstructuur** weer en bevat niet automatisch alle latere
>   wijzigingen (bijvoorbeeld kolommen of tabellen die in latere patches zijn toegevoegd).
>   Gebruik het alleen voor een **nieuwe, lege** database.

Een nieuwe database opzetten: plak de inhoud van `supabase_setup.sql` in de Supabase
SQL Editor en klik **Run**.

## Bestanden

| Bestand | Omschrijving |
|---|---|
| `index.html` | Inlogpagina (met 2FA) |
| `app.html` | Hoofdapplicatie |
| `atletiek_iphone.html` | Mobiele weergave |
| `logo.svg` | Logo |
| `pwa_manifest.json` | PWA-configuratie |
| `pwa_sw.js` | Service worker (offline) |
| `supabase_setup.sql` | Database-setupscript (beginstructuur) |
| `CHANGELOG.md` | Overzicht van alle wijzigingen per patch |
| `PROJECTNOTITIES.md` | Technische notities en achtergrond |
| `Sprint_U16_Spelregels.pdf` | Spelregels van de U16-competitie |
