// scraping.js — atletiek.nu login + PR-scraping via cheerio
// Onderdeel van de Cloudflare Worker (sprint-u16)

import * as cheerio from 'cheerio';

// ── Discipline-mapping: atletiek.nu naam → app-naam ─────────────────────────
const DISCIPLINE_MAP = {
  // Jongens
  '100 m':            '100m',
  '100 meter':        '100m',
  '100':              '100m',
  '100m':             '100m',
  '100 m horden':     '100m horden',
  '100m horden':      '100m horden',
  '100mh':            '100m horden',
  '150 m':            '150m',
  '150':              '150m',
  '150m':             '150m',
  '300 m':            '300m',
  '300':              '300m',
  '300m':             '300m',
  '300 m horden':     '300m horden',
  '300m horden':      '300m horden',
  '300mh':            '300m horden',
  '800 m':            '800m',
  '800':              '800m',
  '800m':             '800m',
  '1500 m':           '1500m',
  '1500':             '1500m',
  '1500m':            '1500m',
  // Meisjes
  '80 m':             '80m',
  '80m':              '80m',
  '80':               '80m',
  '80 m horden':      '80m horden',
  '80m horden':       '80m horden',
  '80mh':             '80m horden',
  // Technische onderdelen (gedeeld)
  'hoog':             'hoogspringen',
  'hoogspringen':     'hoogspringen',
  'ver':              'verspringen',
  'verspringen':      'verspringen',
  'speer':            'speerwerpen',
  'speerwerpen':      'speerwerpen',
  'discus':           'discuswerpen',
  'discuswerpen':     'discuswerpen',
  'kogel':            'kogelstoten',
  'kogelstoten':      'kogelstoten',
};

// Alle disciplines die we accepteren (superset van jongens + meisjes)
const TOEGESTANE_DISCIPLINES = new Set([
  '100m','100m horden','150m','300m','300m horden',
  '800m','1500m',
  '80m','80m horden',
  'hoogspringen','verspringen','speerwerpen','discuswerpen','kogelstoten',
]);

/**
 * Normaliseer een discipline-naam van atletiek.nu naar app-naam.
 * Geeft null terug als het geen relevant onderdeel is.
 */
function normaliseerDiscipline(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  // Directe match
  if (DISCIPLINE_MAP[lower]) return DISCIPLINE_MAP[lower];
  // Gedeeltelijke match
  for (const [key, val] of Object.entries(DISCIPLINE_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

// ── Cookie-beheer ────────────────────────────────────────────────────────────

/**
 * Parseer Set-Cookie headers uit een Response en bewaar ze als object.
 * Geeft een object terug: { cookienaam: waarde }
 */
function parseerCookies(response, bestaandeCookies = {}) {
  const cookies = { ...bestaandeCookies };
  const setCookieHeader = response.headers.get('set-cookie');
  if (!setCookieHeader) return cookies;
  // Cloudflare Workers geeft alle set-cookie headers gecombineerd terug
  const delen = setCookieHeader.split(/,(?=[^ ])/);
  for (const deel of delen) {
    const kv = deel.trim().split(';')[0];
    const idx = kv.indexOf('=');
    if (idx > -1) {
      const naam = kv.substring(0, idx).trim();
      const waarde = kv.substring(idx + 1).trim();
      cookies[naam] = waarde;
    }
  }
  return cookies;
}

/**
 * Zet een cookie-object om naar een Cookie: header string.
 */
function cookieHeaderString(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

// ── Inloggen op atletiek.nu ──────────────────────────────────────────────────

/**
 * Log in op atletiek.nu met email + wachtwoord.
 * Geeft sessie-cookies terug als object, of gooit een Error.
 */
export async function inloggenAtlNu(email, wachtwoord) {
  const INLOG_URL = 'https://www.atletiek.nu/inloggen/';

  // Stap 1: haal de inlogpagina op om CSRF-token en cookies te krijgen
  const getResp = await fetch(INLOG_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SprintU16Bot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });

  if (!getResp.ok) {
    throw new Error(`Inlogpagina niet bereikbaar (HTTP ${getResp.status})`);
  }

  let cookies = parseerCookies(getResp);
  const html = await getResp.text();

  // Controleer op Cloudflare Turnstile / challenge-pagina
  if (html.includes('cf-turnstile') || html.includes('challenge-form') || html.includes('cf_clearance') && !html.includes('<form')) {
    throw new Error('TURNSTILE_BLOCKED');
  }

  // Stap 2: zoek het CSRF-token (hidden input _token of csrf_token)
  const $ = cheerio.load(html);
  let csrfToken = '';
  $('input[name="_token"], input[name="csrf_token"], input[type="hidden"]').each((_, el) => {
    const naam = $(el).attr('name') || '';
    if (naam.toLowerCase().includes('token') || naam.toLowerCase().includes('csrf')) {
      csrfToken = $(el).val() || '';
    }
  });

  // Stap 3: verstuur loginformulier
  const formData = new URLSearchParams();
  if (csrfToken) formData.append('_token', csrfToken);
  formData.append('email', email);
  formData.append('wachtwoord', wachtwoord);
  formData.append('login', '1');

  const postResp = await fetch(INLOG_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; SprintU16Bot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
      'Referer': INLOG_URL,
      'Cookie': cookieHeaderString(cookies),
    },
    body: formData.toString(),
    redirect: 'manual', // We volgen de redirect zelf om cookies te bewaren
  });

  cookies = parseerCookies(postResp, cookies);

  // Na succesvolle login volgt een redirect (302)
  if (postResp.status === 302 || postResp.status === 301) {
    const locatie = postResp.headers.get('location') || '';
    // Volg redirect om extra cookies op te halen
    if (locatie && !locatie.includes('inloggen')) {
      const redirectResp = await fetch(locatie.startsWith('http') ? locatie : `https://www.atletiek.nu${locatie}`, {
        headers: {
          'Cookie': cookieHeaderString(cookies),
          'User-Agent': 'Mozilla/5.0 (compatible; SprintU16Bot/1.0)',
        },
        redirect: 'follow',
      });
      cookies = parseerCookies(redirectResp, cookies);
    }
    return cookies;
  }

  // Controleer of de pagina een foutmelding bevat
  const postHtml = await postResp.text();
  if (postHtml.includes('inloggen') && postHtml.includes('fout') ||
      postHtml.includes('Ongeldig') || postHtml.includes('incorrect')) {
    throw new Error('Inloggegevens onjuist. Controleer je e-mail en wachtwoord.');
  }

  // Ook 200 OK met redirect-content kan succesvol zijn
  if (Object.keys(cookies).length > 0) {
    return cookies;
  }

  throw new Error('Inloggen mislukt. Controleer je gegevens.');
}

// ── Atleet zoeken op atletiek.nu ─────────────────────────────────────────────

/**
 * Zoek een atleet op naam via de feeder.php zoekfunctie.
 * Geeft het atleet_id (profiel-ID) terug, of null als niet gevonden.
 */
async function zoekAtleetId(naam, cookies) {
  const encoded = encodeURIComponent(naam);
  const url = `https://www.atletiek.nu/feeder.php?page=search&do=athletes&name=${encoded}`;

  const resp = await fetch(url, {
    headers: {
      'Cookie': cookieHeaderString(cookies),
      'User-Agent': 'Mozilla/5.0 (compatible; SprintU16Bot/1.0)',
      'Accept': 'application/json, text/html',
      'Referer': 'https://www.atletiek.nu/',
    },
  });

  if (!resp.ok) return null;

  const contentType = resp.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    const json = await resp.json().catch(() => null);
    if (!json) return null;
    // Zoek de eerste atleet die qua naam overeenkomt
    const atleten = json.athletes || json.data || json.results || [];
    for (const a of atleten) {
      const atleetNaam = (a.name || a.naam || a.fullname || '').toLowerCase();
      if (atleetNaam.includes(naam.toLowerCase().split(' ')[0])) {
        return a.id || a.atleet_id || a.athlete_id || null;
      }
    }
  } else {
    // HTML response
    const html = await resp.text();
    const $ = cheerio.load(html);
    // Zoek links naar atleetpagina's
    let gevondenId = null;
    $('a[href*="atleet_id"], a[href*="/atleet/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const naamTekst = $(el).text().toLowerCase();
      if (naamTekst.includes(naam.toLowerCase().split(' ')[0])) {
        const match = href.match(/atleet_id[=\/](\d+)/) || href.match(/\/atleet\/(\d+)/);
        if (match) {
          gevondenId = match[1];
          return false; // stop loop
        }
      }
    });
    return gevondenId;
  }
  return null;
}

// ── PRs ophalen voor één atleet ──────────────────────────────────────────────

/**
 * Haal PRs op voor een specifiek atleet_id.
 * Geeft array terug van { onderdeel, prestatie }
 */
async function haalPRsOp(atleetId, cookies) {
  const url = `https://www.atletiek.nu/feeder.php?page=atleet&do=records&atleet_id=${atleetId}`;

  const resp = await fetch(url, {
    headers: {
      'Cookie': cookieHeaderString(cookies),
      'User-Agent': 'Mozilla/5.0 (compatible; SprintU16Bot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
      'Referer': `https://www.atletiek.nu/atleet/main/${atleetId}/`,
    },
  });

  if (!resp.ok) return [];

  const html = await resp.text();
  const $ = cheerio.load(html);
  const prs = [];

  // Zoek tabel met headers "Onderdeel" en "Record" of "Prestatie"
  $('table').each((_, tabel) => {
    const headers = [];
    $(tabel).find('th').each((_, th) => {
      headers.push($(th).text().trim().toLowerCase());
    });

    const heeftOnderdeel = headers.some(h => h.includes('onderdeel') || h.includes('discipline') || h.includes('event'));
    const heeftRecord    = headers.some(h => h.includes('record') || h.includes('prestatie') || h.includes('result'));

    if (!heeftOnderdeel && !heeftRecord && headers.length < 2) return;

    // Bepaal kolomindexen
    let onderdeelIdx = headers.findIndex(h => h.includes('onderdeel') || h.includes('discipline') || h.includes('event'));
    let recordIdx    = headers.findIndex(h => h.includes('record') || h.includes('prestatie') || h.includes('result'));

    if (onderdeelIdx === -1) onderdeelIdx = 0;
    if (recordIdx === -1)    recordIdx    = 1;

    $(tabel).find('tr').each((_, rij) => {
      const cellen = $(rij).find('td');
      if (cellen.length < 2) return;
      const onderdeel  = $(cellen[onderdeelIdx]).text().trim();
      const prestatie  = $(cellen[recordIdx]).text().trim();
      if (onderdeel && prestatie && !/^[-–]$/.test(prestatie)) {
        prs.push({ onderdeel, prestatie });
      }
    });
  });

  // Als tabel niet gevonden, probeer lijst-structuur
  if (prs.length === 0) {
    $('[class*="record"], [class*="prestatie"], [class*="pr-"]').each((_, el) => {
      const tekst = $(el).text().trim();
      const delen = tekst.split(/\s{2,}|\t/);
      if (delen.length >= 2) {
        prs.push({ onderdeel: delen[0], prestatie: delen[1] });
      }
    });
  }

  return prs;
}

// ── Hoofdfunctie: haal alle PRs op voor een lijst atleten ────────────────────

/**
 * Hoofd-export: haal PRs op voor alle opgegeven atleten.
 * @param {object} cookies - sessie-cookies (van inloggenAtlNu of manueel)
 * @param {Array}  atleten - array van { id, naam, geslacht }
 * @param {Function} voortgangCallback - wordt aangeroepen met (naam, index, totaal)
 * @returns {Array} - array van { atleet_naam, atleet_id, discipline, prestatie }
 */
export async function haalAllePRsOp(cookies, atleten, voortgangCallback = null) {
  const resultaten = [];

  for (let i = 0; i < atleten.length; i++) {
    const atleet = atleten[i];
    if (voortgangCallback) voortgangCallback(atleet.naam, i + 1, atleten.length);

    // Zoek atleet-ID op atletiek.nu
    const atlNuId = await zoekAtleetId(atleet.naam, cookies).catch(() => null);
    if (!atlNuId) {
      console.log(`[scraping] Atleet niet gevonden op atletiek.nu: ${atleet.naam}`);
      continue;
    }

    // Haal PRs op
    const prs = await haalPRsOp(atlNuId, cookies).catch(() => []);

    // Filter op relevante disciplines
    for (const pr of prs) {
      const appDiscipline = normaliseerDiscipline(pr.onderdeel);
      if (!appDiscipline) continue;
      if (!TOEGESTANE_DISCIPLINES.has(appDiscipline)) continue;

      resultaten.push({
        atleet_naam: atleet.naam,
        atleet_id:   atleet.id,
        discipline:  appDiscipline,
        prestatie:   pr.prestatie.replace(',', '.').trim(),
      });
    }

    // Kleine pauze om niet te snel te stoken
    await new Promise(r => setTimeout(r, 300));
  }

  return resultaten;
}

/**
 * Parseer een manueel ingevoerde cookie-string (uit DevTools) naar een cookies-object.
 * Input: "PHPSESSID=abc123; andere_cookie=xyz"
 */
export function parseerHandmatigeCookieString(cookieString) {
  const cookies = {};
  for (const deel of cookieString.split(';')) {
    const idx = deel.indexOf('=');
    if (idx > -1) {
      const naam = deel.substring(0, idx).trim();
      const waarde = deel.substring(idx + 1).trim();
      if (naam) cookies[naam] = waarde;
    }
  }
  return cookies;
}
