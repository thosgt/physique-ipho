// Accès à la base Postgres (Neon en production).
// query(texte, paramètres) renvoie la liste des lignes ; les tables sont créées au premier appel.

let driver = null;      // fonction (text, params) => rows
let ready = null;

function useDriver(fn) { driver = fn; ready = null; }   // utilisé par les tests locaux

function defaultDriver() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw Object.assign(new Error("Base de données non configurée (variable DATABASE_URL absente)."), { status: 500 });
  const postgres = require("postgres");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const sql = postgres(url, { ssl: local ? false : "require", max: 1, prepare: false, idle_timeout: 20, onnotice: () => {} });
  return (text, params = []) => sql.unsafe(text, params);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS students (
  id text PRIMARY KEY, prenom text NOT NULL DEFAULT '', nom text NOT NULL DEFAULT '', groupe text NOT NULL DEFAULT '',
  niveau text NOT NULL DEFAULT 'T', code text UNIQUE NOT NULL, created double precision NOT NULL, last double precision);
CREATE TABLE IF NOT EXISTS attempts (
  id text PRIMARY KEY, sid text NOT NULL, qid text NOT NULL, chap text NOT NULL DEFAULT '',
  score double precision NOT NULL, mode text NOT NULL, hints int NOT NULL DEFAULT 0, ts double precision NOT NULL);
CREATE INDEX IF NOT EXISTS attempts_sid ON attempts(sid);
CREATE INDEX IF NOT EXISTS attempts_qid ON attempts(qid);
CREATE TABLE IF NOT EXISTS claude_log (
  id text PRIMARY KEY, sid text NOT NULL, qid text NOT NULL, ts double precision NOT NULL,
  answer text NOT NULL, verdict text NOT NULL, comment text NOT NULL);
CREATE INDEX IF NOT EXISTS claude_log_sid ON claude_log(sid);
CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS login_failures (ip text NOT NULL, ts double precision NOT NULL);
CREATE TABLE IF NOT EXISTS code_requests (
  id text PRIMARY KEY, ticket text UNIQUE NOT NULL, prenom text NOT NULL, nom text NOT NULL, groupe text NOT NULL DEFAULT '',
  niveau text NOT NULL DEFAULT 'T', ip text NOT NULL DEFAULT '', ts double precision NOT NULL,
  status text NOT NULL DEFAULT 'pending', sid text, decided double precision);
CREATE INDEX IF NOT EXISTS code_requests_status ON code_requests(status);
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS how text;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS answer text;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS dur int;
CREATE INDEX IF NOT EXISTS attempts_qid ON attempts(qid);
CREATE TABLE IF NOT EXISTS series (
  id text PRIMARY KEY, title text NOT NULL, cible text NOT NULL DEFAULT '', qids text NOT NULL, note text NOT NULL DEFAULT '',
  created double precision NOT NULL, due double precision, archived boolean NOT NULL DEFAULT false);
ALTER TABLE series ADD COLUMN IF NOT EXISTS author text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS admins (
  id text PRIMARY KEY, nom text NOT NULL, hash text NOT NULL, rights text NOT NULL DEFAULT '',
  pv int NOT NULL DEFAULT 1, created double precision NOT NULL, last double precision);
`;

async function init() {
  for (const stmt of SCHEMA.split(";").map(s => s.trim()).filter(Boolean)) await driver(stmt);
}

async function query(text, params) {
  if (!driver) driver = defaultDriver();
  if (!ready) ready = init().catch(e => { ready = null; throw e; });
  await ready;
  return driver(text, params);
}

module.exports = { query, useDriver };
