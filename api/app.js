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

const DEFAULT_SETTINGS = { claude: true, quota: 15, open: true, requests: true };
const CHAP_TITLES = { outils: "Analyse dimensionnelle", maths: "Outils mathématiques", statique: "Statique des fluides", dynamique: "Dynamique des fluides", tension: "Tension superficielle",
  nongalileen: "Référentiels non galiléens", geometrique: "Optique géométrique", optique: "Ondes et optique", relativite: "Relativité",
  nucleaire: "Nucléaire", quantique: "Quantique", solide: "Mécanique du solide", electrostatique: "Champ électrique",
  magnetisme: "Champ magnétique et bobine", particules: "Particules chargées", initiative: "Problèmes à prise d'initiative",
  mecapoint: "Mécanique du point", energie: "Approche énergétique", celeste: "Mécanique céleste", oscillateurs: "Oscillateurs", circuits: "Circuits électriques", thermo: "Thermodynamique et rayonnement" };

/* ------------------------------------------------------------------ outils */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };
const uid = p => p + crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "x");
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeCode() {
  // 4 caractères sans ambiguïté (pas de O/0, I/1, L) ; les codes de 6 caractères donnés avant la version 31 restent valables
  const b = crypto.randomBytes(4);
  let c = "";
  for (let i = 0; i < 4; i++) c += ALPHA[b[i] % ALPHA.length];
  return c;
}
const fmtCode = c => c && c.length === 6 ? c.slice(0, 3) + "-" + c.slice(3) : c || "";
// classes proposées aux élèves qui demandent un code (le professeur peut en saisir d'autres)
const CLASSES = { T: [4, 5, 6, 7, 8, 9].map(n => "Terminale " + n), C: ["MPSI 1", "MPSI 2", "PCSI 1", "PCSI 2", "PCSI 3"] };
const normCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const str = (v, max = 200) => String(v ?? "").slice(0, max);
const clampScore = v => { const x = Number(v); return isFinite(x) ? Math.max(0, Math.min(1, x)) : 0; };
const clientIp = req => str((req.headers["x-forwarded-for"] || "local").split(",")[0].trim(), 80);
// Nom ou prénom saisi par un élève : lettres (accents compris), espaces, tiret, apostrophe ; majuscule initiale
function cleanName(v, what) {
  const x = String(v ?? "").normalize("NFC").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!x) fail(400, `Indiquez votre ${what}.`);
  if (!/^[\p{L}][\p{L}\p{M} '’.-]*$/u.test(x)) fail(400, `Votre ${what} ne doit contenir que des lettres, des espaces, des tirets ou des apostrophes.`);
  // majuscule à chaque mot, sauf les particules (de, du, la, d’…) qui ne sont pas en tête
  const PART = new Set(["de", "du", "des", "la", "le", "d", "van", "von", "der", "den", "di", "da", "dos", "del", "y"]);
  return x.replace(/(^|[\s'’-])([\p{L}\p{M}]+)/gu, (m, sep, w) =>
    sep + (sep !== "" && sep !== "-" && PART.has(w.toLowerCase()) && w === w.toLowerCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)));
}
const nameKey = (p, n) => (String(p) + " " + String(n)).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z]/g, "");
const hashTicket = t => crypto.createHash("sha256").update("ticket|" + String(t || "")).digest("hex");
async function freshCode() {
  for (let k = 0; k < 8; k++) {
    const code = normCode(makeCode());
    if (!(await query("SELECT 1 FROM students WHERE code = $1", [code])).length) return code;
  }
  fail(500, "Impossible de créer un code : réessayez.");
}
async function newStudent(prenom, nom, groupe, niveau) {
  const code = await freshCode(), id = uid("s");
  await query("INSERT INTO students (id, prenom, nom, groupe, niveau, code, created) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [id, str(prenom, 60), str(nom, 80), str(groupe, 60), niveau === "C" ? "C" : "T", code, Date.now()]);
  return { id, prenom, nom, code };
}
const REQ_KEEP = 30 * DAY;   // un code accordé reste lisible 30 jours par le navigateur qui l'a demandé

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
/* Comptes professeurs. Le compte principal se connecte avec ADMIN_PASSWORD (variable Vercel) ; il crée d'autres comptes
   (table admins, mot de passe haché par scrypt, sans distinction de casse). Droits d'un autre compte : résultats des élèves,
   séries d'exercices (les siennes en modification) ; gestion des élèves et des codes seulement si rights contient « eleves ».
   Réglages et comptes professeurs : compte principal seulement. Une session porte pv : changer le mot de passe la révoque. */
async function needAdmin(req, what) {
  const s = need(req);
  if (s.role !== "admin") fail(403, "Réservé aux professeurs.");
  let a;
  if (!s.aid || s.aid === "principal") a = { aid: "principal", principal: true, eleves: true, nom: "" };
  else {
    const r = (await query("SELECT id, nom, rights, pv FROM admins WHERE id = $1", [s.aid]))[0];
    if (!r || r.pv !== s.pv) fail(401, "Ce compte professeur a été supprimé ou son mot de passe a changé : reconnectez-vous.");
    a = { aid: r.id, principal: false, eleves: r.rights.split(",").includes("eleves"), nom: r.nom };
  }
  if (what === "eleves" && !a.eleves) fail(403, "Réservé au professeur principal ou à un compte autorisé à gérer les élèves.");
  if (what === "principal" && !a.principal) fail(403, "Réservé au compte professeur principal.");
  return a;
}
const canEdit = (a, row) => a.principal || (row.author && row.author === a.aid);
const normPwd = p => String(p ?? "").normalize("NFC").trim().toLowerCase();
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
function hashPwd(p) {
  const salt = crypto.randomBytes(16);
  return "s1$" + salt.toString("base64") + "$" + crypto.scryptSync(normPwd(p), salt, 32, SCRYPT).toString("base64");
}
function checkPwd(p, h) {
  const [v, s, k] = String(h || "").split("$");
  if (v !== "s1" || !s || !k) return false;
  const want = Buffer.from(k, "base64");
  return crypto.timingSafeEqual(crypto.scryptSync(normPwd(p), Buffer.from(s, "base64"), want.length, SCRYPT), want);
}
function makePassword() {
  const b = crypto.randomBytes(12);
  let c = "";
  for (let i = 0; i < 12; i++) c += ALPHA[b[i] % ALPHA.length];
  return c.slice(0, 4) + "-" + c.slice(4, 8) + "-" + c.slice(8);
}
async function checkNewPwd(p, selfId) {
  const x = normPwd(p);
  if (x.length < 10) fail(400, "Le mot de passe doit compter au moins 10 caractères.");
  if (x.length > 100) fail(400, "Mot de passe trop long (100 caractères au plus).");
  if (process.env.ADMIN_PASSWORD && normPwd(process.env.ADMIN_PASSWORD) === x) fail(400, "Choisissez un mot de passe différent de celui du compte principal.");
  for (const r of await query("SELECT id, hash FROM admins")) if (r.id !== selfId && checkPwd(x, r.hash)) fail(400, "Ce mot de passe est déjà celui d'un autre compte professeur.");
}
async function needStudent(req) {
  const s = need(req);
  if (s.role !== "eleve") fail(403, "Réservé aux élèves.");
  const r = await query("SELECT id FROM students WHERE id = $1", [s.sid]);
  if (!r.length) fail(401, "Ce compte n'existe plus : reconnectez-vous.");
  return s;
}
const attemptCols = "qid, chap, score, mode, hints, ts, how, answer, dur";
// Détail d'une réponse : comment elle a été évaluée, ce que l'élève a répondu, temps passé à l'écran (s)
const HOWS = ["auto", "vu", "soi", "claude"];
const cleanHow = v => HOWS.includes(v) ? v : null;
const cleanDur = v => { const x = parseInt(v); return isFinite(x) && x >= 0 ? Math.min(3600, x) : null; };
// Une série vise tous les élèves (''), un niveau ('@T', '@C') ou une classe (nom du groupe)
const normG = g => String(g || "").normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
const serieFor = (se, st) => !se.cible || (se.cible === "@T" ? st.niveau !== "C" : se.cible === "@C" ? st.niveau === "C" : normG(se.cible) === normG(st.groupe));
const serieCols = "id, title, cible, qids, note, created, due, archived, author";
// qids : liste JSON stockée en texte
const fixSerie = r => { let q = r.qids; for (let k = 0; k < 2 && typeof q === "string"; k++) { try { q = JSON.parse(q); } catch (e) { q = []; } } return { ...r, qids: Array.isArray(q) ? q : [] }; };
async function ownSerie(A, id) {
  const r = (await query("SELECT author FROM series WHERE id = $1", [str(id, 40)]))[0];
  if (!r) fail(404, "Série introuvable.");
  if (!canEdit(A, r)) fail(403, "Seul l'auteur de cette série, ou le compte principal, peut la modifier.");
}
const listSeries = async (where = "") => (await query(`SELECT ${serieCols} FROM series ${where} ORDER BY archived, coalesce(due, 1e15) DESC, created DESC`)).map(fixSerie);
// Demandes en attente, puis celles traitées depuis 30 jours ; les plus anciennes sont effacées
async function listRequests() {
  await query("DELETE FROM code_requests WHERE (status <> 'pending' AND decided < $1) OR (status = 'pending' AND ts < $2)", [Date.now() - 90 * DAY, Date.now() - 180 * DAY]);
  return query(`SELECT id, prenom, nom, groupe, niveau, ts, status, sid, decided FROM code_requests
    WHERE status = 'pending' OR decided > $1 ORDER BY (status = 'pending') DESC, coalesce(decided, ts) DESC LIMIT 400`, [Date.now() - REQ_KEEP]);
}

/* ------------------------------------------------------------------ actions */
const actions = {
  /* ---- connexion ---- */
  async me(req, res) {
    const settings = await getSettings();
    const hasKey = !!process.env.ANTHROPIC_API_KEY;
    const s = getSession(req);
    const base = { open: !!settings.open, requests: !!settings.requests };
    if (!s) return { ...base, role: null };
    if (s.role === "admin") {
      let a;
      try { a = await needAdmin(req); } catch (e) { if (e.status === 401) { clearSession(res); return { ...base, role: null }; } throw e; }
      if (!a.principal) await query("UPDATE admins SET last = $2 WHERE id = $1", [a.aid, Date.now()]);
      const p = a.eleves ? (await query("SELECT count(*)::int AS n FROM code_requests WHERE status = 'pending'"))[0].n : 0;
      return { ...base, role: "admin", admin: { id: a.aid, nom: a.nom, principal: a.principal, eleves: a.eleves }, pending: p, claude: { enabled: hasKey, quota: null, used: 0 } };
    }
    const me = (await query("SELECT id, prenom, nom, groupe, niveau, code FROM students WHERE id = $1", [s.sid]))[0];
    if (!me) return { ...base, role: null };
    await query("UPDATE students SET last = $2 WHERE id = $1", [s.sid, Date.now()]);
    return { ...base, role: "eleve", me, claude: { enabled: hasKey && !!settings.claude, quota: settings.quota, used: await claudeUsed(s.sid) } };
  },

  async login(req, res, b) {
    const ip = clientIp(req);
    const f = await query("SELECT count(*)::int AS n FROM login_failures WHERE ip = $1 AND ts > $2", [ip, Date.now() - 10 * 60000]);
    if (f[0].n >= 15) fail(429, "Trop d'essais : attendez quelques minutes avant de réessayer.");
    const code = str(b.code, 200).trim();
    if (!code) fail(400, "Entrez votre code.");
    const admin = process.env.ADMIN_PASSWORD;
    if (admin && sameSecret(code, admin)) {
      setSession(res, { role: "admin", aid: "principal" }, 14);
      return { role: "admin" };
    }
    // autres comptes professeurs : mot de passe d'au moins 10 caractères (un code élève en a 4, ou 6 pour les anciens)
    if (normPwd(code).length >= 10) {
      for (const r of await query("SELECT id, hash, pv FROM admins")) {
        if (!checkPwd(code, r.hash)) continue;
        await query("UPDATE admins SET last = $2 WHERE id = $1", [r.id, Date.now()]);
        setSession(res, { role: "admin", aid: r.id, pv: r.pv }, 14);
        return { role: "admin" };
      }
    }
    const st = await query("SELECT id FROM students WHERE code = $1", [normCode(code)]);
    if (!st.length) {
      await query("INSERT INTO login_failures (ip, ts) VALUES ($1, $2)", [ip, Date.now()]);
      await query("DELETE FROM login_failures WHERE ts < $1", [Date.now() - DAY]);
      fail(401, "Code inconnu. Vérifiez qu'il est bien recopié, ou demandez un code ci-dessous.");
    }
    setSession(res, { role: "eleve", sid: st[0].id }, 180);
    return { role: "eleve" };
  },

  async logout(req, res) { clearSession(res); return { ok: true }; },

  /* ---- demande de code par un élève (validée par le professeur) ---- */
  async requestCode(req, res, b) {
    const settings = await getSettings();
    if (!settings.requests) fail(403, "Les demandes de code sont fermées : adressez-vous à votre professeur.");
    const prenom = cleanName(b.prenom, "prénom"), nom = cleanName(b.nom, "nom");
    const niveau = b.niveau === "C" ? "C" : b.niveau === "T" ? "T" : fail(400, "Indiquez si vous êtes en terminale ou en CPGE.");
    const groupe = str(b.groupe, 40).replace(/\s+/g, " ").trim();
    if (!CLASSES[niveau].includes(groupe)) fail(400, niveau === "T" ? "Choisissez votre classe de terminale (de 4 à 9)." : "Choisissez votre classe : MPSI 1 ou 2, PCSI 1, 2 ou 3.");
    const ip = clientIp(req), now = Date.now();
    const recent = await query("SELECT count(*)::int AS n FROM code_requests WHERE ip = $1 AND ts > $2", [ip, now - 3600000]);
    if (recent[0].n >= 6) fail(429, "Trop de demandes depuis cette connexion : réessayez dans une heure.");
    const pending = await query("SELECT count(*)::int AS n FROM code_requests WHERE status = 'pending'");
    if (pending[0].n >= 300) fail(429, "Trop de demandes en attente : adressez-vous directement à votre professeur.");
    const ticket = crypto.randomBytes(24).toString("base64url");
    await query("INSERT INTO code_requests (id, ticket, prenom, nom, groupe, niveau, ip, ts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [uid("r"), hashTicket(ticket), prenom, nom, groupe, niveau, ip, now]);
    return { ticket, status: "pending", prenom, nom, ts: now };
  },

  // Le navigateur qui a fait la demande consulte son état ; une fois la demande validée, il reçoit le code et l'élève est connecté.
  async requestStatus(req, res, b) {
    const r = (await query("SELECT id, prenom, nom, ts, status, sid, decided FROM code_requests WHERE ticket = $1", [hashTicket(str(b.ticket, 100))]))[0];
    if (!r) return { status: "unknown" };
    const out = { status: r.status, prenom: r.prenom, nom: r.nom, ts: r.ts };
    if (r.status !== "approved") return out;
    if (Date.now() - r.decided > REQ_KEEP) return { ...out, status: "expired" };
    const st = (await query("SELECT id, code FROM students WHERE id = $1", [r.sid]))[0];
    if (!st) return { ...out, status: "expired" };
    if (b.login) setSession(res, { role: "eleve", sid: st.id }, 180);
    return { ...out, code: st.code };
  },

  async cancelRequest(req, res, b) {
    await query("DELETE FROM code_requests WHERE ticket = $1 AND status = 'pending'", [hashTicket(str(b.ticket, 100))]);
    return { ok: true };
  },

  /* ---- élève ---- */
  // Une réponse traitée : id choisi par la page (une même question peut être réévaluée : « à revoir » puis « juste »)
  async attempt(req, res, b) {
    const s = getSession(req);
    if (!s || s.role !== "eleve") return { ok: false };      // visiteur ou professeur : rien n'est enregistré
    const q = bank().q[str(b.qid, 120)];
    if (!q) fail(404, "Question inconnue.");
    const id = str(b.id, 60).replace(/[^\w-]/g, "") || uid("a");
    await query(`INSERT INTO attempts (id, sid, qid, chap, score, mode, hints, ts, how, answer, dur) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score, hints = GREATEST(attempts.hints, EXCLUDED.hints), ts = EXCLUDED.ts,
        how = coalesce(EXCLUDED.how, attempts.how), answer = CASE WHEN coalesce(EXCLUDED.answer, '') <> '' THEN EXCLUDED.answer ELSE attempts.answer END,
        dur = GREATEST(coalesce(attempts.dur, 0), coalesce(EXCLUDED.dur, 0)) WHERE attempts.sid = EXCLUDED.sid`,
      [id, s.sid, q.id, q.chap, clampScore(b.score), str(b.mode, 40), Math.max(0, Math.min(9, parseInt(b.hints) || 0)), Date.now(),
       cleanHow(b.how), str(b.answer, 2000), cleanDur(b.dur)]);
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
      await query(`INSERT INTO attempts (id, sid, qid, chap, score, mode, hints, ts, how, answer, dur) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [id.slice(0, 140), s.sid, q.id, q.chap, clampScore(a.score), str(a.mode, 40), Math.max(0, Math.min(9, parseInt(a.hints) || 0)), ts,
         cleanHow(a.how), str(a.answer, 2000), cleanDur(a.dur)]);
      n++;
    }
    return { imported: n };
  },

  async mine(req) {
    const s = await needStudent(req);
    const st = (await query("SELECT groupe, niveau FROM students WHERE id = $1", [s.sid]))[0];
    return {
      series: (await listSeries("WHERE NOT archived")).filter(se => serieFor(se, st)).sort((a, b) => (a.due || 1e15) - (b.due || 1e15)),
      attempts: await query(`SELECT ${attemptCols} FROM attempts WHERE sid = $1 ORDER BY ts`, [s.sid]),
      claude: await query("SELECT qid, ts, verdict, comment FROM claude_log WHERE sid = $1 ORDER BY ts DESC LIMIT 30", [s.sid]),
    };
  },

  /* ---- professeur ---- */
  async overview(req) {
    const A = await needAdmin(req);
    const since = Date.now() - 60 * DAY;
    const out = {
      me: { id: A.aid, nom: A.nom, principal: A.principal, eleves: A.eleves },
      profs: await query("SELECT id, nom FROM admins ORDER BY created"),
      students: await query(`SELECT s.id, s.prenom, s.nom, s.groupe, s.niveau, s.code, s.created, s.last,
          (SELECT count(DISTINCT qid)::int FROM attempts a WHERE a.sid = s.id AND coalesce(a.how, '') <> 'vu') AS done,
          (SELECT coalesce(avg(score), 0)::float FROM attempts a WHERE a.sid = s.id AND coalesce(a.how, '') <> 'vu') AS mean,
          (SELECT max(ts) FROM attempts a WHERE a.sid = s.id) AS lastanswer,
          (SELECT count(*)::int FROM claude_log c WHERE c.sid = s.id AND c.ts > $1) AS claude24
        FROM students s ORDER BY s.groupe, s.nom, s.prenom`, [Date.now() - DAY]),
      // une ligne par élève et par question : dernière note et nombre d'essais
      perq: await query(`SELECT DISTINCT ON (sid, qid) sid, qid, chap, score, ts, how FROM attempts ORDER BY sid, qid, ts DESC`),
      days: await query(`SELECT floor(ts / 86400000)::int AS day, count(*)::int AS n, count(DISTINCT sid)::int AS eleves FROM attempts WHERE ts > $1 GROUP BY 1 ORDER BY 1`, [since]),
      recent: await query(`SELECT sid, ${attemptCols} FROM attempts ORDER BY ts DESC LIMIT 40`),
      series: await listSeries(),
      claude: await query(`SELECT c.sid, c.qid, c.ts, c.verdict FROM claude_log c ORDER BY ts DESC LIMIT 200`),
      requests: A.eleves ? await listRequests() : [],
      settings: await getSettings(),
      config: { hasKey: !!process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", hasDb: true },
    };
    // les codes permettent de se connecter à la place d'un élève : réservés aux comptes qui gèrent les élèves
    if (!A.eleves) out.students.forEach(s => { s.code = ""; });
    return out;
  },

  async student(req, res, b) {
    const A = await needAdmin(req);
    const sid = str(b.sid, 40);
    const me = (await query("SELECT id, prenom, nom, groupe, niveau, code, created, last FROM students WHERE id = $1", [sid]))[0];
    if (!me) fail(404, "Élève introuvable.");
    if (!A.eleves) me.code = "";
    return {
      me,
      attempts: await query(`SELECT ${attemptCols} FROM attempts WHERE sid = $1 ORDER BY ts`, [sid]),
      claude: await query("SELECT qid, ts, answer, verdict, comment FROM claude_log WHERE sid = $1 ORDER BY ts DESC LIMIT 100", [sid]),
    };
  },

  // Toutes les réponses (sans le texte) d'un chapitre ou d'une liste de questions : tableau élèves × questions
  async attemptsFor(req, res, b) {
    await needAdmin(req);
    const cols = "id, sid, qid, chap, score, mode, hints, ts, how, dur";
    if (Array.isArray(b.qids)) return { attempts: await query(`SELECT ${cols} FROM attempts WHERE qid = ANY(string_to_array($1::text, '|')) ORDER BY ts`, [b.qids.slice(0, 400).map(x => str(x, 120).replace(/\|/g, "")).join("|")]) };
    return { attempts: await query(`SELECT ${cols} FROM attempts WHERE chap = $1 ORDER BY ts`, [str(b.chap, 40)]) };
  },

  // Une case du tableau : toutes les réponses d'un élève à une question, et ses corrections par Claude
  async cell(req, res, b) {
    await needAdmin(req);
    const sid = str(b.sid, 40), qid = str(b.qid, 120);
    return {
      attempts: await query(`SELECT ${attemptCols} FROM attempts WHERE sid = $1 AND qid = $2 ORDER BY ts`, [sid, qid]),
      claude: await query("SELECT ts, answer, verdict, comment FROM claude_log WHERE sid = $1 AND qid = $2 ORDER BY ts", [sid, qid]),
    };
  },

  // Une question : les réponses de toute la classe
  async question(req, res, b) {
    await needAdmin(req);
    const qid = str(b.qid, 120);
    return {
      attempts: await query(`SELECT sid, ${attemptCols} FROM attempts WHERE qid = $1 ORDER BY ts`, [qid]),
      claude: await query("SELECT sid, ts, answer, verdict, comment FROM claude_log WHERE qid = $1 ORDER BY ts", [qid]),
    };
  },

  // Export de toutes les réponses, une ligne par réponse (tableur CSV)
  async exportReponses(req, res) {
    await needAdmin(req);
    const rows = await query(`SELECT a.ts, s.nom, s.prenom, s.groupe, s.niveau, a.chap, a.qid, a.score, a.how, left(coalesce(a.answer, ''), 1000) AS answer, a.hints, a.dur, a.mode
      FROM attempts a JOIN students s ON s.id = a.sid ORDER BY a.ts LIMIT 100000`);
    const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const HOWL = { auto: "vérifiée automatiquement", vu: "réponse affichée sans essayer", soi: "auto-évaluée", claude: "corrigée par Claude" };
    const date = ts => new Date(ts).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
    const out = [["Date", "Nom", "Prénom", "Groupe", "Niveau", "Chapitre", "Question", "Résultat", "Score", "Évaluation", "Réponse donnée", "Indices", "Temps (s)", "Page"]];
    for (const r of rows) out.push([date(r.ts), r.nom, r.prenom, r.groupe, r.niveau === "C" ? "CPGE" : "Terminale", CHAP_TITLES[r.chap] || r.chap, r.qid,
      r.how === "vu" ? "corrigé lu sans essayer" : r.score >= 1 ? "juste" : r.score > 0 ? "en partie" : "faux", String(r.score).replace(".", ","), HOWL[r.how] || "",
      r.answer, r.hints, r.dur ?? "", r.mode]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="reponses-olympiades.csv"');
    return { __raw: "\ufeff" + out.map(r => r.map(cell).join(";")).join("\r\n") };
  },

  /* ---- séries d'exercices ---- */
  async saveSerie(req, res, b) {
    const A = await needAdmin(req);
    const Q = bank().q;
    const qids = [...new Set((Array.isArray(b.qids) ? b.qids : []).map(x => str(x, 120)).filter(x => Q[x]))].slice(0, 200);
    const title = str(b.title, 120).trim();
    if (!title) fail(400, "Donnez un titre à la série.");
    if (!qids.length) fail(400, "Choisissez au moins une question.");
    const due = Number(b.due) > 0 ? Number(b.due) : null, cible = str(b.cible, 60).trim(), note = str(b.note, 2000).trim();
    if (b.id) {
      await ownSerie(A, b.id);
      const r = await query("UPDATE series SET title = $2, cible = $3, qids = $4, note = $5, due = $6, archived = $7 WHERE id = $1 RETURNING id",
        [str(b.id, 40), title, cible, JSON.stringify(qids), note, due, !!b.archived]);
      if (!r.length) fail(404, "Série introuvable.");
      return { id: r[0].id };
    }
    const id = uid("se");
    await query("INSERT INTO series (id, title, cible, qids, note, created, due, author) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [id, title, cible, JSON.stringify(qids), note, Date.now(), due, A.aid]);
    return { id };
  },

  async archiveSerie(req, res, b) {
    const A = await needAdmin(req);
    await ownSerie(A, b.id);
    await query("UPDATE series SET archived = $2 WHERE id = $1", [str(b.id, 40), !!b.archived]);
    return { ok: true };
  },

  async deleteSerie(req, res, b) {
    const A = await needAdmin(req);
    await ownSerie(A, b.id);
    await query("DELETE FROM series WHERE id = $1", [str(b.id, 40)]);
    return { ok: true };
  },

  async addStudents(req, res, b) {
    await needAdmin(req, "eleves");
    const lines = str(b.lines, 20000).split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 200);
    if (!lines.length) fail(400, "Une ligne par élève : Prénom Nom.");
    const groupe = str(b.groupe, 60).trim(), niveau = b.niveau === "C" ? "C" : "T";
    const added = [];
    for (const l of lines) {
      const parts = l.split(/[;,\t]/).map(x => x.trim()).filter(Boolean);
      let prenom, nom;
      if (parts.length >= 2) { [prenom, nom] = parts; }
      else { const w = l.split(/\s+/); prenom = w[0]; nom = w.slice(1).join(" "); }
      added.push(await newStudent(prenom, nom, groupe, niveau));
    }
    return { added };
  },

  async updateStudent(req, res, b) {
    await needAdmin(req, "eleves");
    const sid = str(b.sid, 40);
    await query("UPDATE students SET prenom = $2, nom = $3, groupe = $4, niveau = $5 WHERE id = $1",
      [sid, str(b.prenom, 60).trim(), str(b.nom, 80).trim(), str(b.groupe, 60).trim(), b.niveau === "C" ? "C" : "T"]);
    return { ok: true };
  },

  async regenCode(req, res, b) {
    await needAdmin(req, "eleves");
    const code = await freshCode();
    await query("UPDATE students SET code = $2 WHERE id = $1", [str(b.sid, 40), code]);
    return { code };
  },

  async deleteStudent(req, res, b) {
    await needAdmin(req, "eleves");
    const sid = str(b.sid, 40);
    await query("DELETE FROM attempts WHERE sid = $1", [sid]);
    await query("DELETE FROM claude_log WHERE sid = $1", [sid]);
    await query("DELETE FROM students WHERE id = $1", [sid]);
    return { ok: true };
  },

  // Demandes de code : valider (nouveau compte), rattacher à un compte existant (l'élève reçoit son code), refuser
  async decideRequest(req, res, b) {
    await needAdmin(req, "eleves");
    // items : [{id, prenom?, nom?, groupe?, niveau?}] (une ou plusieurs demandes, avec les corrections du professeur)
    const items = (Array.isArray(b.items) ? b.items : [b]).filter(x => x && x.id).slice(0, 300);
    if (!items.length) fail(400, "Aucune demande choisie.");
    const decision = b.decision;
    if (!["approve", "link", "reject"].includes(decision)) fail(400, "Décision inconnue.");
    const done = [];
    for (const it of items) {
      const r = (await query("SELECT * FROM code_requests WHERE id = $1", [str(it.id, 40)]))[0];
      if (!r || r.status !== "pending") continue;
      let sid = null, code = null;
      if (decision === "approve") {
        const st = await newStudent(str(it.prenom, 60).trim() || r.prenom, str(it.nom, 80).trim() || r.nom,
          it.groupe !== undefined ? str(it.groupe, 60).trim() : r.groupe, it.niveau === "C" || it.niveau === "T" ? it.niveau : r.niveau);
        sid = st.id; code = st.code;
      } else if (decision === "link") {
        const st = (await query("SELECT id, code FROM students WHERE id = $1", [str(b.sid, 40)]))[0];
        if (!st) fail(404, "Élève introuvable.");
        sid = st.id; code = st.code;
      }
      await query("UPDATE code_requests SET status = $2, sid = $3, decided = $4 WHERE id = $1",
        [r.id, decision === "reject" ? "rejected" : "approved", sid, Date.now()]);
      done.push({ id: r.id, sid, code, prenom: r.prenom, nom: r.nom });
    }
    return { done };
  },

  async saveSettings(req, res, b) {
    await needAdmin(req, "principal");
    const cur = await getSettings();
    const next = {
      claude: b.claude === undefined ? cur.claude : !!b.claude,
      quota: b.quota === undefined ? cur.quota : Math.max(0, Math.min(200, parseInt(b.quota) || 0)),
      open: b.open === undefined ? cur.open : !!b.open,
      requests: b.requests === undefined ? cur.requests : !!b.requests,
    };
    await query("INSERT INTO settings (key, value) VALUES ('main', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [JSON.stringify(next)]);
    return { settings: next };
  },

  async export(req, res) {
    const A = await needAdmin(req);
    const st = await query("SELECT id, prenom, nom, groupe, niveau, code FROM students ORDER BY groupe, nom, prenom");
    const per = await query(`SELECT sid, chap, count(DISTINCT qid)::int AS n, avg(score)::float AS m FROM attempts GROUP BY sid, chap`);
    const chaps = [...new Set(per.map(r => r.chap))].sort();
    const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Nom", "Prénom", "Groupe", "Niveau", "Code", ...chaps.flatMap(c => [(CHAP_TITLES[c] || c) + " (questions)", (CHAP_TITLES[c] || c) + " (réussite %)"])]];
    for (const s of st) {
      const mine = Object.fromEntries(per.filter(r => r.sid === s.id).map(r => [r.chap, r]));
      rows.push([s.nom, s.prenom, s.groupe, s.niveau === "C" ? "CPGE" : "Terminale", A.eleves ? fmtCode(s.code) : "",
        ...chaps.flatMap(c => mine[c] ? [mine[c].n, Math.round(100 * mine[c].m)] : ["", ""])]);
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="suivi-olympiades.csv"');
    return { __raw: "﻿" + rows.map(r => r.map(cell).join(";")).join("\r\n") };
  },

  /* ---- comptes professeurs (compte principal) ---- */
  async admins(req) {
    await needAdmin(req, "principal");
    return { admins: await query("SELECT id, nom, rights, created, last FROM admins ORDER BY created") };
  },

  // Création ou modification ; sans mot de passe fourni, un mot de passe est tiré au sort (création, ou reset: true).
  async saveAdmin(req, res, b) {
    await needAdmin(req, "principal");
    const nom = str(b.nom, 80).replace(/\s+/g, " ").trim();
    if (!nom) fail(400, "Indiquez le nom du professeur.");
    const rights = b.eleves ? "eleves" : "", id = b.id ? str(b.id, 40) : null;
    let password = String(b.password ?? "").trim() || null;
    if (!password && (!id || b.reset)) password = makePassword();
    if (password) await checkNewPwd(password, id);
    if (id) {
      const r = password
        ? await query("UPDATE admins SET nom = $2, rights = $3, hash = $4, pv = pv + 1 WHERE id = $1 RETURNING id", [id, nom, rights, hashPwd(password)])
        : await query("UPDATE admins SET nom = $2, rights = $3 WHERE id = $1 RETURNING id", [id, nom, rights]);
      if (!r.length) fail(404, "Compte introuvable.");
      return { id, password };
    }
    if ((await query("SELECT count(*)::int AS n FROM admins"))[0].n >= 20) fail(400, "Vingt comptes professeurs au plus.");
    const nid = uid("p");
    await query("INSERT INTO admins (id, nom, hash, rights, created) VALUES ($1,$2,$3,$4,$5)", [nid, nom, hashPwd(password), rights, Date.now()]);
    return { id: nid, password };
  },

  async deleteAdmin(req, res, b) {
    await needAdmin(req, "principal");
    await query("DELETE FROM admins WHERE id = $1", [str(b.id, 40)]);
    return { ok: true };
  },

  // Un professeur (autre que le compte principal) change son propre mot de passe ; ses autres sessions sont fermées.
  async changePassword(req, res, b) {
    const A = await needAdmin(req);
    if (A.principal) fail(400, "Le mot de passe du compte principal se change dans les réglages du projet Vercel (variable ADMIN_PASSWORD).");
    const r = (await query("SELECT hash FROM admins WHERE id = $1", [A.aid]))[0];
    if (!r || !checkPwd(str(b.old, 200), r.hash)) fail(400, "Mot de passe actuel incorrect.");
    await checkNewPwd(b.password, A.aid);
    const u = await query("UPDATE admins SET hash = $2, pv = pv + 1 WHERE id = $1 RETURNING pv", [A.aid, hashPwd(b.password)]);
    setSession(res, { role: "admin", aid: A.aid, pv: u[0].pv }, 14);
    return { ok: true };
  },
};

const GET_OK = new Set(["me", "mine", "overview", "admins", "export", "exportReponses"]);

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
