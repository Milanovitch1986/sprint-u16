# Sprint U16 — Competitietool

Webapplicatie voor trainers van **AV Sprint Breda** om de U16-competitie te beheren.

## Functies

- Atletenbeheer (inschrijvingen, persoonsgegevens)
- Wedstrijdopstelling per onderdeel
- Wedstrijdbeheer en programma
- PWA — werkt offline en is installeerbaar op telefoon

## Techniek

- Vanilla HTML/CSS/JavaScript (geen build-tool)
- [Supabase](https://supabase.com) als backend (auth + database)
- Gehost als statische pagina

## Database opzetten

Plak `supabase_setup.sql` in de Supabase SQL Editor en klik **Run** om de database opnieuw op te zetten.

## Bestanden

| Bestand | Omschrijving |
|---|---|
| `index.html` | Inlogpagina |
| `app.html` | Hoofdapplicatie |
| `atletiek_iphone.html` | Mobiele weergave |
| `pwa_manifest.json` | PWA-configuratie |
| `pwa_sw.js` | Service worker (offline) |
| `supabase_setup.sql` | Database setup script |
