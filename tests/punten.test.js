// Punten volgens de Atletiekunie-tabellen (functie berekenPunten in app.html)
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { laadApp, kiesCategorie } = require("./laad-app.js");

// Echte uitslagen, aangeleverd door Milanovitch (november 2026): U18 jongens, competitie.
// Deze waarden komen uit de officiële uitslag en zijn dus de maatstaf.
const U18_OFFICIEEL = [
  ["800m",         "2:34,48", 285],
  ["Discuswerpen", "34,82",   580],
  ["Discuswerpen", "18,09",   168],
  ["Kogelstoten",  "11,31",   553],
  ["Kogelstoten",  "6,65",    190],
  ["Verspringen",  "6,06",    618],
  ["Verspringen",  "5,58",    509],
  ["Verspringen",  "5,39",    465],
  ["Verspringen",  "5,31",    446],
];

test("U18/U20: punten gelijk aan de officiële uitslag", async () => {
  const app = await laadApp();
  kiesCategorie(app, "U18/U20");
  for (const [onderdeel, prestatie, punten] of U18_OFFICIEEL) {
    assert.equal(app.w.berekenPunten(onderdeel, prestatie, "M"), punten, `${onderdeel} ${prestatie}`);
  }
});

// U16: de uitkomsten op 11 november 2026 vastgelegd. Ze zijn (nog) niet met een officiële
// U16-competitie-uitslag vergeleken; deze test laat zien wanneer er iets aan de berekening verandert.
// Komt er een officiële U16-uitslag, dan komen die waarden in een eigen lijst zoals hierboven.
const U16_VASTGELEGD = [
  ["60m","8,50",649], ["80m","10,90",635], ["100m","12,88",686], ["150m","19,80",637],
  ["300m","42,50",638], ["600m","1:39,00",709], ["800m","2:27,54",583], ["1000m","3:05,10",657],
  ["1500m","4:55,00",654], ["80m horden","13,20",566], ["100m horden","15,90",644],
  ["300m horden","48,30",593], ["60m horden","9,80",638], ["4x80m","42,50",651], ["4x100m","50,10",709],
  ["Kogelstoten","9,92",519], ["Discuswerpen","29,10",461], ["Speerwerpen","30,00",495],
  ["Verspringen","4,45",508], ["Verspringen","4,20",458], ["Hoogspringen","1,50",623], ["Hoogspringen","1,20",389],
];

test("U16: punten gelijk aan de vastgelegde uitkomsten", async () => {
  const app = await laadApp();
  kiesCategorie(app, "U16");
  for (const [onderdeel, prestatie, punten] of U16_VASTGELEGD) {
    assert.equal(app.w.berekenPunten(onderdeel, prestatie, "M"), punten, `${onderdeel} ${prestatie}`);
  }
});

// Ruim 3.000 vastgelegde uitkomsten (U14, U16, U18/U20; jongens en meisjes; alle onderdelen met punten).
// Maken of bijwerken: node tests/maak-vastgelegde-punten.js — alleen bij een bewuste wijziging aan de punten.
const VASTGELEGD = require("./punten-vastgelegd.json");

test("Alle onderdelen: punten gelijk aan de vastgelegde uitkomsten", async () => {
  const app = await laadApp();
  const verschillen = [];
  let aantal = 0;
  for (const [cat, perGeslacht] of Object.entries(VASTGELEGD.categorieen)) {
    kiesCategorie(app, cat);
    for (const [geslacht, perOnderdeel] of Object.entries(perGeslacht)) {
      for (const [onderdeel, lijst] of Object.entries(perOnderdeel)) {
        for (const [prestatie, punten] of lijst) {
          aantal++;
          const nu = app.w.berekenPunten(onderdeel, prestatie, geslacht);
          if (nu !== punten) verschillen.push(`${cat} ${geslacht} ${onderdeel} ${prestatie}: was ${punten}, nu ${nu}`);
        }
      }
    }
  }
  assert.ok(aantal > 3000, `te weinig vastgelegde waarden (${aantal})`);
  assert.deepEqual(verschillen, [], `${verschillen.length} van ${aantal} uitkomsten veranderd:\n` + verschillen.slice(0, 15).join("\n"));
});

test("Komma en punt geven dezelfde punten; leeg of nul geeft 0", async () => {
  const app = await laadApp();
  for (const cat of ["U16", "U18/U20"]) {
    kiesCategorie(app, cat);
    assert.equal(app.w.berekenPunten("Verspringen", "4,45", "M"), app.w.berekenPunten("Verspringen", "4.45", "M"), cat);
    assert.equal(app.w.berekenPunten("800m", "2:27,54", "M"), app.w.berekenPunten("800m", "2:27.54", "M"), cat);
    assert.equal(app.w.berekenPunten("Verspringen", "", "M"), 0, cat);
    assert.equal(app.w.berekenPunten("Verspringen", "0", "M"), 0, cat);
    assert.equal(app.w.berekenPunten("Onbekend onderdeel", "5,00", "M"), 0, cat);
  }
});

test("Sneller lopen of verder springen/werpen levert nooit minder punten op", async () => {
  const app = await laadApp();
  kiesCategorie(app, "U16");
  const loop = [["60m", 7.5, 11], ["800m", 130, 220], ["100m", 11, 17]];
  for (const [d, van, tot] of loop) {
    let vorige = Infinity;
    for (let t = van; t <= tot; t += 0.01) {
      const p = app.w.berekenPunten(d, t.toFixed(2), "M");
      assert.ok(p <= vorige, `${d}: ${t.toFixed(2)} geeft ${p}, sneller gaf ${vorige}`);
      vorige = p;
    }
  }
  // Verspringen en hoogspringen hebben onder een drempel een andere formule; de overgang mag geen sprong terug geven
  const veld = [["Verspringen", 3.0, 6.5], ["Hoogspringen", 1.0, 1.9], ["Kogelstoten", 5, 15]];
  for (const [d, van, tot] of veld) {
    let vorige = -1;
    for (let m = van; m <= tot + 1e-9; m += 0.01) {
      const p = app.w.berekenPunten(d, m.toFixed(2), "M");
      assert.ok(p >= vorige, `${d}: ${m.toFixed(2)} geeft ${p}, korter gaf ${vorige}`);
      vorige = p;
    }
  }
});
