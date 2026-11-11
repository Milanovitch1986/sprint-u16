// Sprint U16 — service worker (patch 107)
//
// Zorgt dat de app ook opent als er geen internet is (bijvoorbeeld op de baan).
// Staat in dezelfde map als app.html, dus alle paden zijn relatief aan /sprint-u16/.
//
//  - Pagina's (app.html, index.html): NETWERK-EERST met een korte wachttijd.
//    Online zie je dus altijd de nieuwste versie; is het netwerk weg of te traag,
//    dan toont hij de laatst bewaarde versie.
//  - Bibliotheken met een vast versienummer (Supabase, pdf.js, xlsx), lettertypen,
//    iconen en manifest: CACHE-EERST (ze veranderen niet).
//  - Supabase-gegevens, inloggen en de mail-Worker: NOOIT bewaard, altijd rechtstreeks.

const VERSIE  = "sprint-u16-v4";  // patch 113: xlsx 0.18.5 → 0.20.3; ophogen als BASIS of EXTERN wijzigt
const WACHT_MS = 4000;                    // zo lang wachten op het netwerk voor een pagina

const BASIS = [
  "./",
  "./index.html",
  "./app.html",
  "./pwa_manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];
// Van andere websites; los geprobeerd zodat één mislukte download de installatie niet stopt
const EXTERN = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0",
  "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js",  // patch 113
];

// Externe adressen die we bewaren als ze een keer zijn gebruikt (vast versienummer of lettertype)
function isBewaarbaarExtern(url) {
  return url.hostname === "cdn.jsdelivr.net"
      || url.hostname === "cdn.sheetjs.com"      // patch 113: xlsx 0.20.3
      || url.hostname === "cdnjs.cloudflare.com"
      || url.hostname === "fonts.googleapis.com"
      || url.hostname === "fonts.gstatic.com";
}

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSIE);
    await c.addAll(BASIS);
    await Promise.all(EXTERN.map(u =>
      c.add(new Request(u, { mode: "cors" })).catch(err => console.warn("Niet bewaard:", u, err))
    ));
  })());
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const sleutels = await caches.keys();
    await Promise.all(sleutels.filter(k => k !== VERSIE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Pagina: netwerk-eerst, met wachttijd; bij succes de bewaarde versie bijwerken
async function pagina(req) {
  const c = await caches.open(VERSIE);
  const url = new URL(req.url);
  // Bewaar per pagina zonder zoekdeel (?uitnodiging=... hoort niet in de sleutel)
  const sleutel = new Request(url.origin + url.pathname);
  const netwerk = fetch(req).then(res => {
    if (res && res.ok) c.put(sleutel, res.clone());
    return res;
  });
  const bewaard = () => c.match(sleutel).then(r => r
    || c.match(new Request(new URL("./index.html", self.registration.scope))));
  try {
    const res = await Promise.race([
      netwerk,
      new Promise((_, nee) => setTimeout(() => nee(new Error("te traag")), WACHT_MS)),
    ]);
    if (res && res.ok) return res;
    return (await bewaard()) || res;
  } catch (_) {
    const r = await bewaard();
    if (r) { netwerk.catch(() => {}); return r; }
    return netwerk;            // niets bewaard: wacht dan toch op het netwerk
  }
}

// Overige bestanden: cache-eerst, anders ophalen en bewaren
async function bestand(req) {
  const c = await caches.open(VERSIE);
  const r = await c.match(req, { ignoreVary: true });
  if (r) return r;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                      // opslaan e.d.: altijd rechtstreeks
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);

  if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname)) {
    const isPagina = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === scope.pathname;
    e.respondWith(isPagina ? pagina(req) : bestand(req));
    return;
  }
  if (isBewaarbaarExtern(url)) {
    // Alleen bestanden met een vast versienummer of lettertypen; '@2' zonder versie niet
    if (url.hostname === "cdn.jsdelivr.net" && !/@\d+\.\d+\.\d+/.test(url.pathname)) return;
    if (url.hostname === "cdn.sheetjs.com" && !/xlsx-\d+\.\d+\.\d+/.test(url.pathname)) return; // patch 113: 'latest' niet bewaren
    e.respondWith(bestand(req));
  }
  // Al het andere (Supabase, de mail-Worker, Brevo): niet aanraken
});
