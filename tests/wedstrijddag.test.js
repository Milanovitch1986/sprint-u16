// Wedstrijddag: beste resultaat, telregels, offline-wachtrij en verbindingsfouten
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { laadApp } = require("./laad-app.js");

test("Beste resultaat over snelle invoer, rondes en pogingen (ongeldig en DNS tellen niet)", async () => {
  const app = await laadApp();
  const w = app.w;
  app.zet("wdResultaten = {}; wdPogingen = {};");
  const zet = (r) => w.wdZetLokaal(Object.assign({ atleetId: 7, sleutel: "7", status: "ok", ronde: "", poging: 1 }, r));
  // Verspringen: hoger is beter
  zet({ discipline: "Verspringen", resultaat: "4,10" });
  zet({ discipline: "Verspringen", resultaat: "4,35", ronde: "Finale", poging: 1 });
  zet({ discipline: "Verspringen", resultaat: "4,90", ronde: "Finale", poging: 2, status: "x" });
  assert.equal(w.wdBesteResultaat("Verspringen", "7").resultaat, "4,35");
  // 60m: lager is beter
  zet({ discipline: "60m", resultaat: "9,10" });
  zet({ discipline: "60m", resultaat: "8,95", ronde: "Serie", poging: 1 });
  assert.equal(w.wdBesteResultaat("60m", "7").resultaat, "8,95");
  assert.equal(w.wdEffectief("60m", "7").resultaat, "8,95");
  // DNS blijft DNS
  zet({ discipline: "Kogelstoten", resultaat: "", status: "dns" });
  assert.equal(w.wdEffectief("Kogelstoten", "7").status, "dns");
  app.zet("wdResultaten = {}; wdPogingen = {};");
});

test("Telregels per soort onderdeel", async () => {
  const { w } = await laadApp();
  assert.match(w.wdTelregelLabel("technisch"), /beste 1 telt/);
  assert.match(w.wdTelregelLabel("estafette"), /alles telt/);
  assert.match(w.wdTelregelLabel("sprint"), /beste 2 tellen/);
});

test("Offline-wachtrij: bewaren en verwijderen toepassen op de bewaarde resultaten (patch 108)", async () => {
  const { w } = await laadApp();
  const rij = (d, s, res, ronde = "", p = 1) => ({ discipline: d, sleutel: s, resultaat: res, ronde, poging_nr: p, wedstrijd_id: 1 });
  let rijen = [rij("60m", "7", "9,10")];
  rijen = w.wdPasItemToe(rijen, { type: "bewaar", payload: rij("60m", "7", "8,95") });
  assert.equal(rijen.length, 1, "zelfde sleutel overschrijft");
  assert.equal(rijen[0].resultaat, "8,95");
  rijen = w.wdPasItemToe(rijen, { type: "bewaar", payload: rij("60m", "7", "8,80", "Finale", 1) });
  rijen = w.wdPasItemToe(rijen, { type: "bewaar", payload: rij("60m", "8", "9,30") });
  assert.equal(rijen.length, 3);
  rijen = w.wdPasItemToe(rijen, { type: "verwijderRonde", sleutels: { discipline: "60m", sleutel: "7", ronde: "Finale" } });
  assert.equal(rijen.length, 2);
  rijen = w.wdPasItemToe(rijen, { type: "verwijderAlles", sleutels: { discipline: "60m", sleutel: "7" } });
  assert.deepEqual(Array.from(rijen, r => r.sleutel), ["8"]);
});

test("Verbindingsfouten herkennen, ook die van de iPhone (patch 109)", async () => {
  const { w } = await laadApp();
  for (const t of ["TypeError: Load failed", "The Internet connection appears to be offline.",
                   "The network connection was lost.", "TypeError: Failed to fetch",
                   "NetworkError when attempting to fetch resource."]) {
    assert.equal(w.isVerbindingsTekst(t), true, t);
    assert.equal(w.wdIsNetwerkFout({ message: t }), true, t);
  }
  assert.equal(w.isVerbindingsTekst("new row violates row-level security policy"), false);
  assert.equal(w.wdIsNetwerkFout({ message: "new row violates row-level security policy" }), false,
    "een echte serverfout is geen verbindingsfout (gaat niet in de wachtrij)");
  assert.equal(w.wdIsAuthFout({ code: "42501" }), true);
  assert.equal(w.wdIsAuthFout({ message: "JWT expired" }), true);
  assert.equal(w.wdIsAuthFout({ code: "23505" }), false);
});
