// Maakt tests/punten-vastgelegd.json: de huidige uitkomsten van berekenPunten voor veel
// prestaties per onderdeel, per categorie en geslacht. ALLEEN opnieuw draaien als een
// wijziging aan de punten bewust is (bijv. een nieuwe Atletiekunie-tabel):
//   node tests/maak-vastgelegde-punten.js
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { laadApp, kiesCategorie } = require("./laad-app.js");

(async () => {
  const app = await laadApp();
  const w = app.w;
  const uit = { gemaakt: new Date().toISOString().slice(0, 10), categorieen: {} };
  for (const cat of ["U14", "U16", "U18/U20"]) {
    kiesCategorie(app, cat);
    uit.categorieen[cat] = {};
    const onderdelen = Array.from(w.getDisciplines ? w.getDisciplines() : []);
    for (const geslacht of ["M", "V"]) {
      const rij = {};
      for (const d of onderdelen) {
        const naam = typeof d === "string" ? d : (d && (d.naam || d.discipline));
        if (!naam) continue;
        // Zoek de prestatie die ongeveer 500 punten geeft en neem 25 waarden rondom
        const tijd = w.isLagerBeter(naam);
        let basis = null;
        for (let v = 0.5; v < 1500 && basis === null; v *= 1.002) {
          const p = w.berekenPunten(naam, v.toFixed(2), geslacht);
          if (p > 0 && (tijd ? p <= 500 : p >= 500)) basis = v;
        }
        if (basis === null) continue;           // onderdeel zonder punten (bijv. 200m bij U16)
        const lijst = [];
        for (let i = 0; i < 25; i++) {
          const f = tijd ? 0.88 + i * 0.012 : 0.55 + i * 0.04;   // tijden 88–117 %, afstanden 55–151 %
          const prestatie = (basis * f).toFixed(2);
          lijst.push([prestatie, w.berekenPunten(naam, prestatie, geslacht)]);
        }
        rij[naam] = lijst;
      }
      uit.categorieen[cat][geslacht] = rij;
    }
  }
  fs.writeFileSync(path.join(__dirname, "punten-vastgelegd.json"), JSON.stringify(uit, null, 1));
  console.log("punten-vastgelegd.json gemaakt");
  w.close();
})();
