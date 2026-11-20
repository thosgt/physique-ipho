// API de « Physique des olympiades » : une seule fonction Vercel, l'action est passée dans ?a=...
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { query } = require("../lib/db");
const { setSession, clearSession, getSession, sameSecret } = require("../lib/auth");
const { correct } = require("../lib/claude");

const DAY = 86400000;
// Photos de copie : 3 au plus, JPEG/PNG/WebP en data URL, 1,2 Mo chacune (réduites par le navigateur avant l'envoi).
function readPhotos(v) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > 3) fail(400, "Trois photos au maximum.");
  return v.map(p => {
    const m = typeof p === "string" && p.length <= 1700000 ? /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(p) : null;
    if (!m) fail(400, "Photo illisible ou trop lourde : reprenez-la, puis réessayez.");
    return { media_type: m[1], data: m[2] };
  });
}

const DEFAULT_SETTINGS = { claude: true, quota: 15, open: true };
const CHAP_TITLES = { outils: "Outils", statique: "Statique des fluides", dynamique: "Dynamique des fluides", tension: "Tension superficielle",
  nongalileen: "Référentiels non galiléens", geometrique: "Optique géométrique", optique: "Ondes et optique", relativite: "Relativité",
  nucleaire: "Nucléaire", quantique: "Quantique", solide: "Mécanique du solide", electrostatique: "Champ électrique",
  magnetisme: "Champ magnétique et bobine", particules: "Particules chargées" };

/* ------------------------------------------------------------------ outils */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };
const uid = p => p + crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "x");
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeCode() {
  // 6 caractères sans ambiguïté (pas de O/0, I/1, L), affichés XXX-XXX
  const b = crypto.randomBytes(6);
  let c = "";
  for (let i = 0; i < 6; i++) c += ALPHA[b[i] % ALPHA.length];
  return c.slice(0, 3) + "-" + c.slice(3);
}
const normCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const str = (v, max = 200) => String(v ?? "").slice(0, max);
const clampScore = v => { const x = Number(v); return isFinite(x) ? Math.max(0, Math.min(1, x)) : 0; };

// Énoncés et corrigés : lus une fois dans data/questions.json (inclus dans la fonction par vercel.json)
let BANK = null;
function bank() {
  if (BANK) return BANK;
  const tries = [path.join(process.cwd(), "data", "questions.json"), path.join(__dirname, "..", "data", "questions.json")];
  const file = tries.find(f => fs.existsSync(f));
  if (!file) fail(500, "Banque de questions introuvable sur le serveur.");
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  const g = {}; d.groups.forEach(x => g[x.id] = x);
  const q = {}; d.questions.forEach(x => { q[x.id] = x; if (!x.chap) x.chap = x.group && g[x.group] ? g[x.group].chap : "statique"; });
  BANK = { q, g };
  return BANK;
}

async function getSettings() {
  const rows = await query("SELECT value FROM settings WHERE key = 'main'");
  return { ...DEFAULT_SETTINGS, ...(rows[0] ? rows[0].value : {}) };
}
async function claudeUsed(sid) {
  const r = await query("SELECT count(*)::int AS n FROM claude_log WHERE sid = $1 AND ts > $2", [sid, Date.now() - DAY]);
  return r[0].n;
}
function need(req) {
  const s = getSession(req);
  if (!s) fail(401, "Connectez-vous d'abord.");
  return s;
}
function needAdmin(req) {
  const s = need(req);
  if (s.role !== "admin") fail(403, "Réservé au professeur.");
  return s;
}
async function needStudent(req) {
  const s = need(req);
  if (s.role !== "eleve") fail(403, "Réservé aux élèves.");
  const r = await query("SELECT id FROM students WHERE id = $1", [s.sid]);
  if (!r.length) fail(401, "Ce compte n'existe plus : reconnectez-vous.");
  return s;
}
const attemptCols = "qid, chap, score, mode, hints, ts";

/* ------------------------------------------------------------------ actions */
const actions = {
  /* ---- connexion ---- */
  async me(req) {
    const settings = await getSettings();
    const hasKey = !!process.env.ANTHROPIC_API_KEY;
    const s = getSession(req);
    const base = { open: !!settings.open };
    if (!s) return { ...base, role: null };
    if (s.role === "admin") return { ...base, role: "admin", claude: { enabled: hasKey, quota: null, used: 0 } };
    const me = (await query("SELECT id, prenom, nom, groupe, niveau FROM students WHERE id = $1", [s.sid]))[0];
    if (!me) return { ...base, role: null };
    await query("UPDATE students SET last = $2 WHERE id = $1", [s.sid, Date.now()]);
    return { ...base, role: "eleve", me, claude: { enabled: hasKey && !!settings.claude, quota: settings.quota, used: await claudeUsed(s.sid) } };
  },

  async login(req, res, b) {
    const ip = str((req.headers["x-forwarded-for"] || "local").split(",")[0].trim(), 80);
    const f = await query("SELECT count(*)::int AS n FROM login_failures WHERE ip = $1 AND ts > $2", [ip, Date.now() - 10 * 60000]);
    if (f[0].n >= 15) fail(429, "Trop d'essais : attendez quelques minutes avant de réessayer.");
    const code = str(b.code, 200).trim();
    if (!code) fail(400, "Entrez votre code.");
    const admin = process.env.ADMIN_PASSWORD;
    if (admin && sameSecret(code, admin)) {
      setSession(res, { role: "admin" }, 14);
      return { role: "admin" };
    }
    const st = await query("SELECT id FROM students WHERE code = $1", [normCode(code)]);
    if (!st.length) {
      await query("INSERT INTO login_failures (ip, ts) VALUES ($1, $2)", [ip, Date.now()]);
      await query("DELETE FROM login_failures WHERE ts < $1", [Date.now() - DAY]);
      fail(401, "Code inconnu. Vérifiez qu'il est bien recopié.");
    }
    setSession(res, { role: "eleve", sid: st[0].id }, 180);
    return { role: "eleve" };
  },

  async logout(req, res) { clearSession(res); return { ok: true }; },

  /* ---- élève ---- */
  // Une réponse traitée : id choisi par la page (une même question peut être réévaluée : « à revoir » puis « juste »)
  async attempt(req, res, b) {
    const s = getSession(req);
    if (!s || s.role !== "eleve") return { ok: false };      // visiteur ou professeur : rien n'est enregistré
    const q = bank().q[str(b.qid, 120)];
    if (!q) fail(404, "Question inconnue.");
    const id = str(b.id, 60).replace(/[^\w-]/g, "") || uid("a");
    await query(`INSERT INTO attempts (id, sid, qid, chap, score, mode, hints, ts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score, hints = GREATEST(attempts.hints, EXCLUDED.hints), ts = EXCLUDED.ts WHERE attempts.sid = EXCLUDED.sid`,
      [id, s.sid, q.id, q.chap, clampScore(b.score), str(b.mode, 40), Math.max(0, Math.min(9, parseInt(b.hints) || 0)), Date.now()]);
    return { ok: true };
  },

  async correct(req, res, b) {
    const s = need(req);
    const settings = await getSettings();
    let sid = "admin";
    if (s.role === "eleve") {
      sid = (await needStudent(req)).sid;
      if (!settings.claude) fail(403, "La correction par Claude est désactivée par le professeur.");
      if (await claudeUsed(sid) >= settings.quota) fail(429, `Limite atteinte : ${settings.quota} correction${settings.quota > 1 ? "s" : ""} par Claude par 24 h. Comparez avec le corrigé.`);
    }
    const { q: Q, g: G } = bank();
    const q = Q[str(b.qid, 120)];
    if (!q || q.type !== "open") fail(404, "Question introuvable.");
    const answer = str(b.answer, 3000).trim();
    const photos = readPhotos(b.photos);
    if (answer.length < 3 && !photos.length) fail(400, "Écrivez d'abord votre réponse, même inachevée, ou joignez une photo de votre copie.");
    const mode = b.mode === "aide" ? "aide" : "";
    const out = await correct(q, q.group ? G[q.group] : null, answer, photos, mode);
    // Les photos ne sont pas conservées : on garde ce que Claude y a lu.
    const kept = photos.length ? `[${photos.length} photo${photos.length > 1 ? "s" : ""}] Lu : ${out.lu || "?"}${answer ? " | " + answer : ""}`.slice(0, 3000) : answer;
    await query("INSERT INTO claude_log (id, sid, qid, ts, answer, verdict, comment) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [uid("c"), sid, q.id, Date.now(), kept, out.verdict, out.commentaire]);
    return out;
  },

  // Réponses faites sans compte dans ce navigateur, versées dans le compte à la connexion
  async importLocal(req, res, b) {
    const s = await needStudent(req);
    const list = Array.isArray(b.attempts) ? b.attempts.slice(-5000) : [];
    const Q = bank().q, now = Date.now();
    let n = 0;
    for (const a of list) {
      const q = Q[str(a && a.qid, 120)]; if (!q) continue;
      const id = "l" + str(a.id, 60).replace(/[^\w-]/g, "") + "-" + s.sid;
      const ts = Math.min(now, Math.max(now - 730 * DAY, Number(a.ts) || now));
      await query(`INSERT INTO attempts (id, sid, qid, chap, score, mode, hints, ts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [id.slice(0, 140), s.sid, q.id, q.chap, clampScore(a.score), str(a.mode, 40), Math.max(0, Math.min(9, parseInt(a.hints) || 0)), ts]);
      n++;
    }
    return { imported: n };
  },

  async mine(req) {
    const s = await needStudent(req);
    return {
      attempts: await query(`SELECT ${attemptCols} FROM attempts WHERE sid = $1 ORDER BY ts`, [s.sid]),
      claude: await query("SELECT qid, ts, verdict, comment FROM claude_log WHERE sid = $1 ORDER BY ts DESC LIMIT 30", [s.sid]),
    };
  },

  /* ---- professeur ---- */
  async overview(req) {
    needAdmin(req);
    const since = Date.now() - 60 * DAY;
    return {
      students: await query(`SELECT s.id, s.prenom, s.nom, s.groupe, s.niveau, s.code, s.created, s.last,
          (SELECT count(DISTINCT qid)::int FROM attempts a WHERE a.sid = s.id) AS done,
          (SELECT coalesce(avg(score), 0)::float FROM attempts a WHERE a.sid = s.id) AS mean,
          (SELECT max(ts) FROM attempts a WHERE a.sid = s.id) AS lastanswer,
          (SELECT count(*)::int FROM claude_log c WHERE c.sid = s.id AND c.ts > $1) AS claude24
        FROM students s ORDER BY s.groupe, s.nom, s.prenom`, [Date.now() - DAY]),
      // une ligne par élève et par question : dernière note et nombre d'essais
      perq: await query(`SELECT DISTINCT ON (sid, qid) sid, qid, chap, score, ts FROM attempts ORDER BY sid, qid, ts DESC`),
      days: await query(`SELECT floor(ts / 86400000)::int AS day, count(*)::int AS n, count(DISTINCT sid)::int AS eleves FROM attempts WHERE ts > $1 GROUP BY 1 ORDER BY 1`, [since]),
      recent: await query(`SELECT sid, ${attemptCols} FROM attempts ORDER BY ts DESC LIMIT 40`),
      claude: await query(`SELECT c.sid, c.qid, c.ts, c.verdict FROM claude_log c ORDER BY ts DESC LIMIT 200`),
      settings: await getSettings(),
      config: { hasKey: !!process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", hasDb: true },
    };
  },

  async student(req, res, b) {
    needAdmin(req);
    const sid = str(b.sid, 40);
    const me = (await query("SELECT id, prenom, nom, groupe, niveau, code, created, last FROM students WHERE id = $1", [sid]))[0];
    if (!me) fail(404, "Élève introuvable.");
    return {
      me,
      attempts: await query(`SELECT ${attemptCols} FROM attempts WHERE sid = $1 ORDER BY ts`, [sid]),
      claude: await query("SELECT qid, ts, answer, verdict, comment FROM claude_log WHERE sid = $1 ORDER BY ts DESC LIMIT 100", [sid]),
    };
  },

  async addStudents(req, res, b) {
    needAdmin(req);
    const lines = str(b.lines, 20000).split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 200);
    if (!lines.length) fail(400, "Une ligne par élève : Prénom Nom.");
    const groupe = str(b.groupe, 60).trim(), niveau = b.niveau === "C" ? "C" : "T";
    const added = [];
    for (const l of lines) {
      const parts = l.split(/[;,\t]/).map(x => x.trim()).filter(Boolean);
      let prenom, nom;
      if (parts.length >= 2) { [prenom, nom] = parts; }
      else { const w = l.split(/\s+/); prenom = w[0]; nom = w.slice(1).join(" "); }
      let code, ok = false;
      for (let k = 0; k < 8 && !ok; k++) {
        code = normCode(makeCode());
        ok = !(await query("SELECT 1 FROM students WHERE code = $1", [code])).length;
      }
      const id = uid("s");
      await query("INSERT INTO students (id, prenom, nom, groupe, niveau, code, created) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [id, str(prenom, 60), str(nom, 80), groupe, niveau, code, Date.now()]);
      added.push({ id, prenom, nom, code });
    }
    return { added };
  },

  async updateStudent(req, res, b) {
    needAdmin(req);
    const sid = str(b.sid, 40);
    await query("UPDATE students SET prenom = $2, nom = $3, groupe = $4, niveau = $5 WHERE id = $1",
      [sid, str(b.prenom, 60).trim(), str(b.nom, 80).trim(), str(b.groupe, 60).trim(), b.niveau === "C" ? "C" : "T"]);
    return { ok: true };
  },

  async regenCode(req, res, b) {
    needAdmin(req);
    let code, ok = false;
    for (let k = 0; k < 8 && !ok; k++) { code = normCode(makeCode()); ok = !(await query("SELECT 1 FROM students WHERE code = $1", [code])).length; }
    await query("UPDATE students SET code = $2 WHERE id = $1", [str(b.sid, 40), code]);
    return { code };
  },

  async deleteStudent(req, res, b) {
    needAdmin(req);
    const sid = str(b.sid, 40);
    await query("DELETE FROM attempts WHERE sid = $1", [sid]);
    await query("DELETE FROM claude_log WHERE sid = $1", [sid]);
    await query("DELETE FROM students WHERE id = $1", [sid]);
    return { ok: true };
  },

  async saveSettings(req, res, b) {
    needAdmin(req);
    const cur = await getSettings();
    const next = {
      claude: b.claude === undefined ? cur.claude : !!b.claude,
      quota: b.quota === undefined ? cur.quota : Math.max(0, Math.min(200, parseInt(b.quota) || 0)),
      open: b.open === undefined ? cur.open : !!b.open,
    };
    await query("INSERT INTO settings (key, value) VALUES ('main', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [JSON.stringify(next)]);
    return { settings: next };
  },

  async export(req, res) {
    needAdmin(req);
    const st = await query("SELECT id, prenom, nom, groupe, niveau, code FROM students ORDER BY groupe, nom, prenom");
    const per = await query(`SELECT sid, chap, count(DISTINCT qid)::int AS n, avg(score)::float AS m FROM attempts GROUP BY sid, chap`);
    const chaps = [...new Set(per.map(r => r.chap))].sort();
    const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Nom", "Prénom", "Groupe", "Niveau", "Code", ...chaps.flatMap(c => [(CHAP_TITLES[c] || c) + " (questions)", (CHAP_TITLES[c] || c) + " (réussite %)"])]];
    for (const s of st) {
      const mine = Object.fromEntries(per.filter(r => r.sid === s.id).map(r => [r.chap, r]));
      rows.push([s.nom, s.prenom, s.groupe, s.niveau === "C" ? "CPGE" : "Terminale", s.code.slice(0, 3) + "-" + s.code.slice(3),
        ...chaps.flatMap(c => mine[c] ? [mine[c].n, Math.round(100 * mine[c].m)] : ["", ""])]);
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="suivi-olympiades.csv"');
    return { __raw: "﻿" + rows.map(r => r.map(cell).join(";")).join("\r\n") };
  },
};

const GET_OK = new Set(["me", "mine", "overview", "export"]);

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const a = new URL(req.url, "http://local").searchParams.get("a");
  const fn = Object.prototype.hasOwnProperty.call(actions, a) ? actions[a] : null;
  try {
    if (!fn) fail(404, "Action inconnue.");
    if (req.method !== "POST" && !GET_OK.has(a)) fail(405, "Méthode non autorisée.");
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const out = await fn(req, res, body || {});
    res.statusCode = 200;
    res.end(out && out.__raw !== undefined ? out.__raw : JSON.stringify(out));
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(a, e);
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: status >= 500 && !e.status ? "Erreur du serveur." : e.message }));
  }
};
module.exports.config = { maxDuration: 60 };
