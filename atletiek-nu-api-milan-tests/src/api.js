// api.js — Cloudflare Worker voor Sprint U16
// Endpoints: /feeder (proxy), /importeer-prs (nieuw)

import { inloggenAtlNu, haalAllePRsOp, parseerHandmatigeCookieString } from './scraping.js';

// ── CORS headers ─────────────────────────────────────────────────────────────
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResp(data, status = 200, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// ── Worker entry point ────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // ── Bestaande feeder-proxy ──────────────────────────────────────────────
    if (url.pathname === '/feeder' || url.pathname.startsWith('/feeder/')) {
      return handleFeeder(request, url, origin);
    }

    // ── Nieuw: PRs importeren via inloggen ──────────────────────────────────
    if (url.pathname === '/importeer-prs' && request.method === 'POST') {
      return handleImporteerPrs(request, origin);
    }

    return new Response('Not found', { status: 404 });
  },
};

// ── /feeder proxy (ongewijzigd) ───────────────────────────────────────────────
async function handleFeeder(request, url, origin) {
  const params  = url.searchParams.toString();
  const target  = `https://www.atletiek.nu/feeder.php${params ? '?' + params : ''}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; SprintU16Bot/1.0)',
    'Accept': 'application/json, text/html',
    'Referer': 'https://www.atletiek.nu/',
  };

  const resp = await fetch(target, { headers });
  const body = await resp.text();
  return new Response(body, {
    status: resp.status,
    headers: {
      'Content-Type': resp.headers.get('content-type') || 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// ── /importeer-prs ────────────────────────────────────────────────────────────
/**
 * Verwachte request body (JSON):
 * {
 *   modus: "login" | "cookie",
 *
 *   // Bij modus "login":
 *   email: "trainer@voorbeeld.nl",
 *   wachtwoord: "geheim",
 *
 *   // Bij modus "cookie":
 *   cookie_string: "PHPSESSID=abc123; ...",
 *
 *   // Altijd:
 *   atleten: [ { id: "uuid", naam: "Voornaam Achternaam", geslacht: "M" | "V" }, ... ]
 * }
 */
async function handleImporteerPrs(request, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResp({ fout: 'Ongeldige JSON in request body' }, 400, origin);
  }

  const { modus, email, wachtwoord, cookie_string, atleten } = body;

  // Valideer atleten-lijst
  if (!Array.isArray(atleten) || atleten.length === 0) {
    return jsonResp({ fout: 'Geen atleten opgegeven' }, 400, origin);
  }

  // Credentials worden NOOIT opgeslagen — alleen gebruikt voor deze request
  let cookies;

  if (modus === 'cookie') {
    // Manuele cookie-string (fallback voor Turnstile-blokkering)
    if (!cookie_string || typeof cookie_string !== 'string') {
      return jsonResp({ fout: 'Geen cookie_string opgegeven' }, 400, origin);
    }
    cookies = parseerHandmatigeCookieString(cookie_string);
    if (Object.keys(cookies).length === 0) {
      return jsonResp({ fout: 'Cookie-string is leeg of ongeldig' }, 400, origin);
    }
  } else {
    // Modus "login" (standaard)
    if (!email || !wachtwoord) {
      return jsonResp({ fout: 'E-mail en wachtwoord zijn verplicht' }, 400, origin);
    }

    try {
      cookies = await inloggenAtlNu(email, wachtwoord);
    } catch (err) {
      if (err.message === 'TURNSTILE_BLOCKED') {
        // Geef een speciale foutcode terug zodat de app kan omschakelen naar cookie-modus
        return jsonResp({
          fout: 'TURNSTILE_BLOCKED',
          bericht: 'Atletiek.nu blokkeert automatisch inloggen. Gebruik de cookie-methode als fallback.',
        }, 503, origin);
      }
      return jsonResp({ fout: err.message }, 401, origin);
    }
  }

  // Haal PRs op voor alle atleten
  let resultaten;
  try {
    resultaten = await haalAllePRsOp(cookies, atleten);
  } catch (err) {
    return jsonResp({ fout: 'Fout bij ophalen PRs: ' + err.message }, 500, origin);
  }

  // Credentials worden hier NIET teruggegeven — alleen de PRs
  return jsonResp({ prs: resultaten, totaal: resultaten.length }, 200, origin);
}
