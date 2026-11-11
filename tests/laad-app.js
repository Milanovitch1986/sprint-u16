// Laadt app.html in een nagebootste browser (jsdom) met een nep-Supabase, zodat de tests
// de functies van de app kunnen aanroepen. Er wordt niets via het netwerk opgehaald en de
// echte database wordt nooit aangeraakt.
"use strict";
// Altijd Nederlandse tijd, zoals bij de gebruikers (ook op de servers van GitHub)
process.env.TZ = "Europe/Amsterdam";
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

// Nep-Supabase: ingelogd als admin met 2FA, lege tabellen, alles lukt.
const NEP_SUPABASE = `
window.supabase = { createClient() {
  const keten = (tabel) => {
    const q = {};
    ["select","eq","neq","gt","gte","lt","lte","in","is","not","or","match","order","limit","range",
     "insert","upsert","update","delete"].forEach(m => q[m] = () => q);
    q.single = async () => ({ data: tabel === "profielen"
      ? { id: "u1", gebruikersnaam: "test", rol: "admin", actief: true } : null, error: null });
    q.maybeSingle = q.single;
    q.then = (ok, fout) => Promise.resolve({ data: tabel === "categorieen"
      ? [{ id: "c16", naam: "U16", volgorde: 1 }] : [], error: null }).then(ok, fout);
    return q;
  };
  return {
    from: keten,
    rpc: async () => ({ data: null, error: null }),
    channel() { return { on() { return this; }, subscribe() { return this; } }; },
    removeChannel() {},
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1", email: "t@x.nl" }, access_token: "x" } }, error: null }),
      getUser: async () => ({ data: { user: { id: "u1" } } }),
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
      signOut: async () => ({ error: null }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal2", nextLevel: "aal2" } }),
        listFactors: async () => ({ data: { totp: [], all: [] } })
      }
    }
  };
} };`;

let _cache = null;

async function laadApp() {
  if (_cache) return _cache;
  let html = fs.readFileSync(path.join(__dirname, "..", "app.html"), "utf8");
  // Externe scripts (Supabase, pdf.js) vervangen door de nep-Supabase
  html = html.replace(/<script[^>]*\bsrc="[^"]*supabase-js[^"]*"[^>]*><\/script>/, `<script>${NEP_SUPABASE}</script>`);
  html = html.replace(/<script[^>]*\bsrc="https?:\/\/[^"]+"[^>]*><\/script>/g, "");

  const fouten = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => fouten.push(String(e && (e.detail || e.message) || e)));
  const dom = new JSDOM(html, {
    url: "https://milanovitch1986.github.io/sprint-u16/app.html",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.scrollTo = () => {};
      w.HTMLElement.prototype.scrollIntoView = function () {};
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    }
  });
  const w = dom.window;
  // Wachten tot het opstarten (init) klaar is
  await new Promise(r => setTimeout(r, 300));
  // Hulpje om globale variabelen van de app (let/const) te lezen of te zetten
  const zet = (code) => w.eval(code);
  // Na de laatste test in dit bestand de nagebootste browser sluiten (anders blijven timers van de app lopen)
  if (process.env.NODE_TEST_CONTEXT) require("node:test").after(() => w.close());
  _cache = { w, zet, fouten };
  return _cache;
}

// Kies de actieve categorie (bepaalt welke puntentabel en regels gelden)
function kiesCategorie(app, naam) {
  app.zet(`actieveCategorie = { id: "c-${naam}", naam: ${JSON.stringify(naam)} };`);
}

module.exports = { laadApp, kiesCategorie };
