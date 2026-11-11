// Opstelregels: tijdconflict (15 minuten), 3-uursregel, maximaal 3 onderdelen, één ploeg
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { laadApp, kiesCategorie } = require("./laad-app.js");

test("tijdNaarMinuten", async () => {
  const { w } = await laadApp();
  assert.equal(w.tijdNaarMinuten("10:30"), 630);
  assert.equal(w.tijdNaarMinuten("09:05"), 545);
  assert.equal(w.tijdNaarMinuten(""), 0);
});

test("Tijdconflict: binnen 15 minuten in een ander onderdeel wel, daarbuiten niet", async () => {
  const app = await laadApp();
  app.zet(`programma = [
    { discipline: "60m",         type: "sprint",    starttijd: "10:00" },
    { discipline: "Verspringen", type: "technisch", starttijd: "10:15" },
    { discipline: "Kogelstoten", type: "technisch", starttijd: "10:16" } ]`);
  const opst = { A_0_0: "7" };   // atleet 7 loopt de 60m om 10:00
  const prog = app.w.eval("programma");
  assert.equal(app.w.checkConflict("A", opst, 1, "7", prog[1]), true,  "15 minuten later = conflict");
  assert.equal(app.w.checkConflict("A", opst, 2, "7", prog[2]), false, "16 minuten later = geen conflict");
  assert.equal(app.w.checkConflict("A", opst, 1, "8", prog[1]), false, "andere atleet");
});

test("3-uursregel U16: 800m/1500m en 300m/300m horden minder dan 3 uur uit elkaar", async () => {
  const app = await laadApp();
  kiesCategorie(app, "U16");
  const w = app.w;
  assert.equal(w.heeftDrieUurConflict("800m", "12:00", [{ discipline: "300m", starttijd: "10:00" }]), true);
  assert.equal(w.heeftDrieUurConflict("800m", "13:00", [{ discipline: "300m", starttijd: "10:00" }]), false, "precies 3 uur mag");
  assert.equal(w.heeftDrieUurConflict("1500m", "10:30", [{ discipline: "300m horden", starttijd: "10:00" }]), true);
  assert.equal(w.heeftDrieUurConflict("800m", "10:30", [{ discipline: "1500m", starttijd: "10:00" }]), false, "twee middenafstanden");
  assert.equal(w.heeftDrieUurConflict("60m", "10:30", [{ discipline: "800m", starttijd: "10:00" }]), false, "60m valt er niet onder");
});

test("3-uursregel U18/U20: 800m/1500m en 400m/400m horden (keuze Milanovitch)", async () => {
  const app = await laadApp();
  kiesCategorie(app, "U18/U20");
  const w = app.w;
  assert.equal(w.heeftDrieUurConflict("800m", "11:00", [{ discipline: "400m", starttijd: "10:00" }]), true);
  assert.equal(w.heeftDrieUurConflict("1500m", "11:00", [{ discipline: "400m horden", starttijd: "10:00" }]), true);
  assert.equal(w.heeftDrieUurConflict("800m", "11:00", [{ discipline: "300m", starttijd: "10:00" }]), false, "300m telt bij U18/U20 niet");
  kiesCategorie(app, "U16");
});

test("Slepen: niet in meer dan 3 onderdelen, niet in twee ploegen; tijdconflict is een waarschuwing", async () => {
  const app = await laadApp();
  app.zet(`programma = [
    { discipline: "60m",          type: "sprint",    starttijd: "10:00" },
    { discipline: "Verspringen",  type: "technisch", starttijd: "11:00" },
    { discipline: "Kogelstoten",  type: "technisch", starttijd: "12:00" },
    { discipline: "800m",         type: "sprint",    starttijd: "13:00" },
    { discipline: "Hoogspringen", type: "technisch", starttijd: "10:10" } ];
    atleten = [{ id: 7, naam: "Testatleet", geslacht: "M" }, { id: 8, naam: "Tweede", geslacht: "M" }];
    opstellingData = { A: { A_0_0: 7, A_1_0: 7, A_2_0: 7 }, B: { B_0_0: 8 } };`);
  const w = app.w;
  const vierde = w.sleepBeoordeel({ type: "lijst", atleetId: 7 }, { ploeg: "A", sleutel: "A_3_0", idx: 3 });
  assert.equal(vierde.ok, false);
  assert.match(vierde.reden, /meer dan 3 onderdelen/);
  const anderePloeg = w.sleepBeoordeel({ type: "lijst", atleetId: 8 }, { ploeg: "A", sleutel: "A_3_0", idx: 3 });
  assert.equal(anderePloeg.ok, false);
  assert.match(anderePloeg.reden, /andere ploeg/);
  // Atleet 7 uit de 60m (10:00) halen en naar hoogspringen (10:10) verplaatsen: geen conflict meer met zichzelf
  app.zet(`opstellingData = { A: { A_0_0: 7 } }`);
  const conflict = w.sleepBeoordeel({ type: "lijst", atleetId: 7 }, { ploeg: "A", sleutel: "A_4_0", idx: 4 });
  assert.equal(conflict.ok, true);
  assert.equal(conflict.conflict, true, "60m om 10:00 en hoogspringen om 10:10");
  // De proefstand mag de echte opstelling niet veranderen
  assert.deepEqual(JSON.parse(JSON.stringify(w.eval("opstellingData"))), { A: { A_0_0: 7 } });
});
