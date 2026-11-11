// Kleine hulpfuncties en het laden van de app
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { laadApp } = require("./laad-app.js");

test("De app laadt zonder JavaScript-fouten", async () => {
  const app = await laadApp();
  assert.deepEqual(app.fouten, []);
  for (const f of ["berekenPunten", "parseResultaat", "checkConflict", "sleepBeoordeel", "laadWedstrijddag", "synchroniseerWachtrij"]) {
    assert.equal(typeof app.w[f], "function", f);
  }
});

test("esc maakt tekst veilig voor HTML", async () => {
  const { w } = await laadApp();
  assert.equal(w.esc(`<b>"Jan" & Piet</b>`), "&lt;b&gt;&quot;Jan&quot; &amp; Piet&lt;/b&gt;");
  assert.equal(w.esc(42), "42");
});

test("esc vangt ook een apostrof af (patch 112)", async () => {
  const { w } = await laadApp();
  assert.ok(!w.esc("Kogel 3 kg 'oud'").includes("'"));
});

test("veldDatum en backupDatum: alleen JJJJ-MM-DD (patch 97/98)", async () => {
  const { w } = await laadApp();
  for (const f of ["veldDatum", "backupDatum"]) {
    assert.equal(w[f]("2012-11-30"), "2012-11-30", f);
    assert.equal(w[f]("2012-11-30 00:00:00"), "2012-11-30", f);
    assert.equal(w[f]("2012-11-30T00:00:00"), "2012-11-30", f);
  }
  assert.equal(w.veldDatum(null), "");
  assert.equal(w.veldDatum("onzin"), "");
  assert.equal(w.backupDatum("onzin"), "onzin", "backupDatum laat iets anders ongewijzigd");
});

test("formatDatumBereik voor meerdaagse wedstrijden", async () => {
  const { w } = await laadApp();
  assert.equal(w.formatDatumBereik("2026-06-13"), "13 juni 2026");
  assert.equal(w.formatDatumBereik("2026-06-13", "2026-06-14"), "13 – 14 juni 2026");
  assert.equal(w.formatDatumBereik("2026-06-30", "2026-07-01"), "30 juni – 1 juli 2026");
  assert.equal(w.formatDatumBereik("2026-12-31", "2027-01-01"), "31 december 2026 – 1 januari 2027");
  assert.equal(w.formatDatumBereik(""), "Geen datum");
});
