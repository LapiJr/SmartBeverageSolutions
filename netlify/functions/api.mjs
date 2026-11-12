// Vienna Konditorei: one small Netlify Function for
//   - the admin portal (login for Ali and Marko, menu, photos, hours, vacancies, texts, form submissions)
//   - the public site data (/api/site), uploaded photos (/api/img/...)
//   - the downloadable menu (/menu.pdf and /nl/menu.pdf)
//
// Data lives in Netlify Blobs. Settings are environment variables in Netlify:
//   ADMIN_PASSWORD_ALI, ADMIN_PASSWORD_MARKO   first passwords for the two accounts
//   NETLIFY_API_TOKEN                          lets the portal read form submissions
import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import defaultMenu from './lib/default-menu.mjs';
import { buildMenuPdf } from './lib/pdf.mjs';

export const config = { path: ['/api/*', '/menu.pdf', '/nl/menu.pdf'] };

const USERS = { ali: 'Ali', marko: 'Marko' }; // the only two accounts
const COOKIE = 'vk_session';
const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const FORM_NAMES = ['contact-en', 'contact-nl', 'application-en', 'application-nl'];

const data = () => getStore({ name: 'vienna', consistency: 'strong' });
const images = () => getStore({ name: 'vienna-images', consistency: 'strong' });

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}
const fail = (status, message) => json({ error: message }, status);

async function readJson(req) {
  try { return await req.json(); } catch { return null; }
}

function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function verifyHash(password, stored) {
  const [, salt, hash] = String(stored).split('$');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 32).toString('hex');
  return safeEqual(test, hash);
}

// ---------------------------------------------------------------------------
// Accounts and sessions
// ---------------------------------------------------------------------------
async function getAuth() {
  const store = data();
  let auth = await store.get('auth', { type: 'json' });
  if (!auth || !auth.secret) {
    auth = { secret: crypto.randomBytes(32).toString('hex'), hashes: {}, pv: {}, fails: {}, ...(auth || {}) };
    auth.secret = auth.secret || crypto.randomBytes(32).toString('hex');
    await store.setJSON('auth', auth);
  }
  auth.hashes ||= {}; auth.pv ||= {}; auth.fails ||= {};
  return auth;
}
const saveAuth = (auth) => data().setJSON('auth', auth);

function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function unsign(token, secret) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (!safeEqual(sig, expected)) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; }
}
function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
function readCookie(req) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}

async function currentUser(req, auth) {
  const session = unsign(readCookie(req), auth.secret);
  if (!session || !USERS[session.u]) return null;
  if (!session.exp || session.exp < Date.now()) return null;
  if ((auth.pv[session.u] || 0) !== (session.pv || 0)) return null; // password was changed
  return session.u;
}

function checkPassword(user, password, auth) {
  if (auth.hashes[user]) return verifyHash(password, auth.hashes[user]);
  const first = process.env['ADMIN_PASSWORD_' + user.toUpperCase()];
  if (!first) return false;
  return safeEqual(password, first);
}

async function login(req) {
  const body = await readJson(req);
  const user = String(body?.user || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!USERS[user] || !password) return fail(401, 'Wrong name or password.');

  const auth = await getAuth();
  const now = Date.now();
  const f = auth.fails[user] || { n: 0, until: 0 };
  if (f.until > now) {
    return fail(429, `Too many attempts. Try again in ${Math.ceil((f.until - now) / 60000)} minutes.`);
  }
  if (!checkPassword(user, password, auth)) {
    f.n += 1;
    if (f.n >= MAX_FAILS) { f.until = now + LOCK_MINUTES * 60000; f.n = 0; }
    auth.fails[user] = f;
    await saveAuth(auth);
    return fail(401, 'Wrong name or password.');
  }
  if (f.n || f.until) { auth.fails[user] = { n: 0, until: 0 }; await saveAuth(auth); }
  const token = sign({ u: user, pv: auth.pv[user] || 0, exp: now + SESSION_DAYS * 86400000 }, auth.secret);
  return json({ user, name: USERS[user] }, 200, { 'Set-Cookie': cookieHeader(token, SESSION_DAYS * 86400) });
}

async function changePassword(req, user, auth) {
  const body = await readJson(req);
  const current = String(body?.current || '');
  const next = String(body?.next || '');
  if (!checkPassword(user, current, auth)) return fail(403, 'Your current password is not right.');
  if (next.length < 10) return fail(400, 'Choose a new password of at least 10 characters.');
  auth.hashes[user] = hashPassword(next);
  auth.pv[user] = (auth.pv[user] || 0) + 1;
  await saveAuth(auth);
  const token = sign({ u: user, pv: auth.pv[user], exp: Date.now() + SESSION_DAYS * 86400000 }, auth.secret);
  return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader(token, SESSION_DAYS * 86400) });
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------
const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
function pair(v, max) {
  if (!v || typeof v !== 'object') return null;
  const en = str(v.en, max);
  const nl = str(v.nl, max);
  if (!en && !nl) return null;
  return { en: en || nl, nl: nl || en };
}
function slug(v) {
  return str(v, 60).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function cleanMenu(input) {
  if (!input || !Array.isArray(input.categories)) return null;
  const used = new Set();
  const categories = [];
  for (const c of input.categories.slice(0, 40)) {
    const title = pair(c?.title, 60);
    if (!title) continue;
    let id = slug(c.id) || slug(title.en) || 'category';
    if (/^\d/.test(id)) id = 'c-' + id;
    let unique = id;
    for (let i = 2; used.has(unique); i++) unique = `${id}-${i}`;
    used.add(unique);
    const groups = [];
    for (const g of (Array.isArray(c.groups) ? c.groups : []).slice(0, 12)) {
      const items = [];
      for (const it of (Array.isArray(g?.items) ? g.items : []).slice(0, 80)) {
        const name = str(it?.name, 80);
        if (!name) continue;
        let price = null;
        if (it.price !== null && it.price !== undefined && it.price !== '') {
          const n = Number(String(it.price).replace(',', '.'));
          if (Number.isFinite(n) && n >= 0 && n < 10000) price = Math.round(n * 100) / 100;
        }
        const item = { name, price, desc: pair(it.desc, 200) };
        if (it.highlight) item.highlight = true;
        items.push(item);
      }
      groups.push({ title: pair(g?.title, 60), note: pair(g?.note, 80), items });
    }
    categories.push({ id: unique, nav: pair(c.nav, 40) || title, title, note: pair(c.note, 80), groups });
  }
  return {
    currency: 'EUR',
    labels: defaultMenu.labels,
    categories,
  };
}

async function currentMenu() {
  return (await data().get('menu', { type: 'json' })) || defaultMenu;
}

// ---------------------------------------------------------------------------
// Settings: opening hours, vacancies, announcement bar and page texts
// ---------------------------------------------------------------------------
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const longText = (v, max) => (typeof v === 'string' ? v.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '');

function cleanTimes(v) {
  const closed = !!v?.closed || !TIME_RE.test(v?.opens) || !TIME_RE.test(v?.closes);
  return closed ? { closed: true, opens: null, closes: null } : { closed: false, opens: v.opens, closes: v.closes };
}

function cleanSettings(input) {
  const out = { hours: null, jobs: null, announcement: null, texts: {} };

  if (Array.isArray(input?.hours?.week) && input.hours.week.length === 7) {
    out.hours = { week: input.hours.week.map(cleanTimes), special: [] };
    for (const d of (Array.isArray(input.hours.special) ? input.hours.special : []).slice(0, 40)) {
      if (!DATE_RE.test(d?.date)) continue;
      out.hours.special.push({ date: d.date, label: pair(d.label, 60), ...cleanTimes(d) });
    }
    out.hours.special.sort((a, b) => a.date.localeCompare(b.date));
  }

  if (Array.isArray(input?.jobs)) {
    out.jobs = [];
    const used = new Set();
    for (const j of input.jobs.slice(0, 12)) {
      const title = pair(j?.title, 60);
      if (!title) continue;
      let id = slug(j.id) || slug(title.en) || 'job';
      if (id === 'open') id = 'job-open';
      let unique = id;
      for (let i = 2; used.has(unique); i++) unique = `${id}-${i}`;
      used.add(unique);
      out.jobs.push({ id: unique, title, hours: pair(j.hours, 100), desc: pair(j.desc, 500), open: j.open !== false });
    }
  }

  if (input?.announcement) {
    const a = input.announcement;
    out.announcement = { enabled: !!a.enabled, text: pair(a.text, 200), until: DATE_RE.test(a.until) ? a.until : '' };
    if (!out.announcement.text) out.announcement.enabled = false;
  }

  if (input?.texts && typeof input.texts === 'object') {
    for (const [key, value] of Object.entries(input.texts).slice(0, 80)) {
      if (!/^[a-z0-9.]{1,40}$/.test(key) || !value) continue;
      const en = longText(value.en, 3000);
      const nl = longText(value.nl, 3000);
      if (en || nl) out.texts[key] = { en, nl };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------
const KEY_RE = /^[a-f0-9]{24}\.(jpg|png|webp)$/;
const SLOT_RE = /^[a-z0-9-]{1,40}\.jpg$/;

function cleanImages(input) {
  const out = { slots: {}, gallery: null };
  if (input?.slots && typeof input.slots === 'object') {
    for (const [slot, key] of Object.entries(input.slots).slice(0, 60)) {
      if (SLOT_RE.test(slot) && KEY_RE.test(String(key))) out.slots[slot] = key;
    }
  }
  if (Array.isArray(input?.gallery)) {
    out.gallery = [];
    for (const g of input.gallery.slice(0, 24)) {
      const src = String(g?.src || '');
      const ok = /^\/images\/[a-z0-9-]{1,40}\.jpg$/.test(src) || (src.startsWith('/api/img/') && KEY_RE.test(src.slice(9)));
      if (!ok) continue;
      out.gallery.push({ src, alt: pair(g.alt, 140) || { en: 'Photo of Vienna Konditorei', nl: 'Foto van Vienna Konditorei' } });
    }
  }
  return out;
}

async function saveImages(req) {
  const clean = cleanImages(await readJson(req));
  await data().setJSON('images', clean);
  // Remove uploaded photos that are no longer used anywhere.
  const keep = new Set(Object.values(clean.slots));
  for (const g of clean.gallery || []) if (g.src.startsWith('/api/img/')) keep.add(g.src.slice(9));
  const store = images();
  const { blobs } = await store.list();
  await Promise.all(blobs.filter((b) => !keep.has(b.key)).map((b) => store.delete(b.key)));
  return json({ ok: true, images: clean });
}

async function uploadImage(req) {
  const type = (req.headers.get('content-type') || '').split(';')[0].trim();
  const ext = IMAGE_TYPES[type];
  if (!ext) return fail(415, 'Please upload a JPG, PNG or WebP photo.');
  const buf = await req.arrayBuffer();
  if (!buf.byteLength) return fail(400, 'The photo is empty.');
  if (buf.byteLength > MAX_IMAGE_BYTES) return fail(413, 'This photo is too large (max 5 MB).');
  const key = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
  await images().set(key, buf, { metadata: { type } });
  return json({ key, src: `/api/img/${key}` });
}

async function serveImage(key) {
  if (!KEY_RE.test(key)) return new Response('Not found', { status: 404 });
  const found = await images().getWithMetadata(key, { type: 'arrayBuffer' });
  if (!found) return new Response('Not found', { status: 404 });
  return new Response(found.data, {
    headers: {
      'Content-Type': found.metadata?.type || 'image/jpeg',
      // Every upload gets a new name, so browsers and the CDN can keep it for a year.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Netlify-CDN-Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

// ---------------------------------------------------------------------------
// Form submissions (job applications and contact messages) via the Netlify API
// ---------------------------------------------------------------------------
const API = () => process.env.NETLIFY_API_URL || 'https://api.netlify.com/api/v1';

async function netlify(path, init = {}) {
  const res = await fetch(API() + path, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.NETLIFY_API_TOKEN}`, ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`Netlify API ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function siteForms(context) {
  const siteId = context?.site?.id || process.env.SITE_ID;
  if (!process.env.NETLIFY_API_TOKEN || !siteId) return null;
  const forms = await netlify(`/sites/${siteId}/forms`);
  return forms.filter((f) => FORM_NAMES.includes(f.name));
}

const HIDDEN_FIELDS = new Set(['bot-field', 'form-name', 'ip', 'user_agent', 'referrer']);

async function listSubmissions(context) {
  const forms = await siteForms(context);
  if (!forms) return json({ configured: false, applications: [], messages: [] });
  const applications = [];
  const messages = [];
  await Promise.all(forms.map(async (form) => {
    const rows = await netlify(`/forms/${form.id}/submissions?per_page=100`);
    for (const row of rows) {
      const fields = {};
      for (const [k, v] of Object.entries(row.data || {})) if (!HIDDEN_FIELDS.has(k)) fields[k] = v;
      const entry = { id: row.id, form: form.name, lang: form.name.endsWith('-nl') ? 'nl' : 'en', created_at: row.created_at, data: fields };
      (form.name.startsWith('application') ? applications : messages).push(entry);
    }
  }));
  const newest = (a, b) => String(b.created_at).localeCompare(String(a.created_at));
  return json({ configured: true, applications: applications.sort(newest), messages: messages.sort(newest) });
}

async function deleteSubmission(id, context) {
  if (!/^[a-f0-9]{8,40}$/i.test(id)) return fail(400, 'Unknown submission.');
  const forms = await siteForms(context);
  if (!forms) return fail(400, 'Form access is not set up yet.');
  const row = await netlify(`/submissions/${id}`);
  if (!forms.some((f) => f.id === row.form_id)) return fail(404, 'Unknown submission.');
  await netlify(`/submissions/${id}`, { method: 'DELETE' });
  return json({ ok: true });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export default async (req, context) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = req.method;

  try {
    // ---- public ----
    if (path === '/menu.pdf' || path === '/nl/menu.pdf') {
      const lang = path.startsWith('/nl/') ? 'nl' : 'en';
      const pdf = await buildMenuPdf(await currentMenu(), lang);
      return new Response(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="vienna-konditorei-menu-${lang}.pdf"`,
          'Cache-Control': 'public, max-age=0, must-revalidate',
          'Netlify-CDN-Cache-Control': 'public, s-maxage=60',
        },
      });
    }

    if (path === '/api/site' && method === 'GET') {
      const store = data();
      const [menu, imgs, settings] = await Promise.all([
        store.get('menu', { type: 'json' }), store.get('images', { type: 'json' }), store.get('settings', { type: 'json' }),
      ]);
      return json({ menu: menu || null, images: imgs || null, settings: settings || null }, 200, {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Netlify-CDN-Cache-Control': 'public, s-maxage=60',
      });
    }

    if (path.startsWith('/api/img/') && method === 'GET') return serveImage(path.slice(9));

    // ---- login ----
    if (path === '/api/login' && method === 'POST') return login(req);
    if (path === '/api/logout' && method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });

    // ---- admin (signed in only) ----
    if (path.startsWith('/api/admin/')) {
      const auth = await getAuth();
      const user = await currentUser(req, auth);
      if (!user) return fail(401, 'Please sign in.');
      // Changes must come from the portal itself (blocks requests made by other websites).
      if (method !== 'GET' && req.headers.get('x-requested-with') !== 'vk-admin') return fail(403, 'Not allowed.');
      const route = path.slice('/api/admin/'.length);

      if (route === 'me' && method === 'GET') return json({ user, name: USERS[user] });
      if (route === 'password' && method === 'POST') return changePassword(req, user, auth);

      if (route === 'site' && method === 'GET') {
        const imgs = (await data().get('images', { type: 'json' })) || { slots: {}, gallery: null };
        const settings = (await data().get('settings', { type: 'json' })) || cleanSettings({});
        return json({ menu: await currentMenu(), images: imgs, settings });
      }
      if (route === 'settings' && method === 'PUT') {
        const settings = cleanSettings(await readJson(req));
        await data().setJSON('settings', settings);
        return json({ ok: true, settings });
      }
      if (route === 'menu' && method === 'PUT') {
        const menu = cleanMenu(await readJson(req));
        if (!menu || !menu.categories.length) return fail(400, 'The menu is empty or not valid.');
        await data().setJSON('menu', menu);
        return json({ ok: true, menu });
      }
      if (route === 'menu' && method === 'DELETE') {
        await data().delete('menu');
        return json({ ok: true, menu: defaultMenu });
      }
      if (route === 'images' && method === 'POST') return uploadImage(req);
      if (route === 'images' && method === 'PUT') return saveImages(req);

      if (route === 'submissions' && method === 'GET') return listSubmissions(context);
      if (route.startsWith('submissions/') && method === 'DELETE') return deleteSubmission(route.slice(12), context);
    }

    return fail(404, 'Not found.');
  } catch (err) {
    console.error(err);
    return fail(500, 'Something went wrong. Please try again.');
  }
};
