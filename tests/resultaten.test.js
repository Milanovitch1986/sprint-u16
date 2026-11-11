// Resultaten lezen en tonen
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { laadApp } = require("./laad-app.js");

test("parseResultaat: tijden en afstanden naar een getal", async () => {
  const { w } = await laadApp();
  const geval = [
    ["8,50", 8.5], ["8.50", 8.5], ["1:02,3", 62.3], ["1:02.3", 62.3], ["2:27,54", 147.54],
    ["1.02.3", 62.3], ["4,45", 4.45], [" 12,88 ", 12.88],
  ];
  for (const [invoer, verwacht] of geval) {
    assert.ok(Math.abs(w.parseResultaat(invoer) - verwacht) < 1e-9, `${invoer} → ${w.parseResultaat(invoer)}`);
  }
  assert.equal(w.parseResultaat(""), null);
  assert.equal(w.parseResultaat(null), null);
  assert.equal(w.parseResultaat("abc"), null);
});

test("parseerExcelTijd: tijdcellen en tekst uit Excel", async () => {
  const { w } = await laadApp();
  const geval = [
    ["0227.4", "2:27.40"], ["0300.0", "3:00.00"], ["0011.5", "11.50"],
    ["3:00,0", "3:00.00"], ["2:14.69", "2:14.69"], ["3:00", "3:00.00"],
    ["11", "11.00"], ["15,5", "15.50"], ["19.08", "19.08"],
  ];
  for (const [invoer, verwacht] of geval) assert.equal(w.parseerExcelTijd(invoer), verwacht, invoer);
  assert.equal(w.parseerExcelTijd(""), null);
  assert.equal(w.parseerExcelTijd("onzin"), null);
});

test("formateerResultaatWeergave: punt als decimaalteken, minuten vanaf 60 s", async () => {
  const { w } = await laadApp();
  assert.equal(w.formateerResultaatWeergave("4,45", "Verspringen"), "4.45");
  assert.equal(w.formateerResultaatWeergave("8,5", "60m"), "8.5");
  assert.equal(w.formateerResultaatWeergave("62.3", "300m"), "1:02.3");
  assert.equal(w.formateerResultaatWeergave("2:27,5", "800m"), "2:27.5");
  assert.equal(w.formateerResultaatWeergave("", "60m"), "");
});
