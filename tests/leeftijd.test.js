// Leeftijdscategorie: kalenderjaar (de leeftijd die je in dat jaar WORDT), niet de leeftijd op de dag
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { laadApp } = require("./laad-app.js");

test("berekenLeeftijdsCategorie volgens het kalenderjaar", async () => {
  const { w } = await laadApp();
  const jaar = 2026;
  const geval = [
    ["2015-06-01", "U12"],              // wordt 11
    ["2014-01-01", "U14"], ["2013-12-31", "U14"],   // wordt 12 / 13
    ["2012-01-01", "U16"], ["2011-12-31", "U16"],   // wordt 14 / 15
    ["2010-07-15", "U18"], ["2009-03-03", "U18"],   // wordt 16 / 17
    ["2008-05-05", "U20"], ["2007-11-11", "U20"],   // wordt 18 / 19
    ["2006-01-01", "Sen"],
  ];
  for (const [geboren, cat] of geval) assert.equal(w.berekenLeeftijdsCategorie(geboren, jaar), cat, geboren);
});

test("Geboortedatum met tijd (zoals bij een deel van de atleten in de database) werkt ook", async () => {
  const { w } = await laadApp();
  assert.equal(w.berekenLeeftijdsCategorie("2012-11-30 00:00:00", 2026), "U16");
  assert.equal(w.berekenLeeftijdsCategorie("2012-11-30T00:00:00", 2026), "U16");
  assert.equal(w.berekenLeeftijdsCategorie("", 2026), null);
  assert.equal(w.berekenLeeftijdsCategorie("onzin", 2026), null);
});

test("Doorstroming: vervroegd openen schuift het referentiejaar één jaar op", async () => {
  const app = await laadApp();
  const dit = new Date().getFullYear();
  app.zet("doorstroomVervroegdJaar = 0");
  assert.equal(app.w.doorstroomReferentieJaar(), dit);
  assert.equal(app.w.doorstroomVervroegdOpen(), false);
  app.zet(`doorstroomVervroegdJaar = ${dit + 1}`);
  assert.equal(app.w.doorstroomReferentieJaar(), dit + 1);
  assert.equal(app.w.doorstroomVervroegdOpen(), true);
  app.zet("doorstroomVervroegdJaar = 0");
});
