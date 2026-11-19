/* Comptes, suivi et tableaux de bord de « Physique des olympiades » (version hébergée sur Vercel).
   Se branche sur la page par window.HOOKS : correction par Claude côté serveur, enregistrement des réponses,
   routes #suivi (élève) et #admin (professeur). Sans serveur (fichier ouvert seul), la page reste utilisable. */
(() => {
const HOOKS = window.HOOKS = window.HOOKS || {};

/* ------------------------------------------------------------ appels au serveur */
function API(a, body){
  const init = body === undefined ? {credentials: 'same-origin'} : {method: 'POST', credentials: 'same-origin', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)};
  return fetch('/api/app?a=' + a, init).then(async r => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Erreur ' + r.status), {status: r.status, userMessage: j.error || ''});
    return j;
  });
}
let ME = null, LAST = {};
const ready = API('me').then(m => { ME = m; }).catch(() => { ME = {role: null, open: true, offline: true}; })
  .then(async () => { if (ME.role === 'eleve'){ try { const m = await API('mine'); m.attempts.forEach(a => LAST[a.qid] = a); } catch(e){} } });

const E = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const DAYMS = 86400000;
const pct = x => Math.round(100 * x) + ' %';
const fmtCode = c => c ? c.slice(0, 3) + '-' + c.slice(3) : '';
function ago(ts){
  if (!ts) return 'jamais';
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'à l’instant'; if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min';
  if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h'; if (s < 7 * 86400) return 'il y a ' + Math.round(s / 86400) + ' j';
  return new Date(ts).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'});
}
const scoreLabel = s => s >= 1 ? 'juste' : s > 0 ? 'en partie' : 'à revoir';
const scoreCls = s => s >= 1 ? 'ok' : s > 0 ? 'mid' : 'bad';
const mode = () => decodeURIComponent((location.hash || '#accueil').slice(1)).split(/\/|--/)[0] || 'accueil';

/* ------------------------------------------------------------ crochets de la page */
HOOKS.corrector = () => ready.then(() => ME && ME.claude && ME.claude.enabled ? {
  correct: (q, answer) => API('correct', {qid: q.id, answer}).then(r => { if (ME.claude) ME.claude.used++; return r; })
} : null);

HOOKS.done = (q, d) => {
  if (!ME || ME.role !== 'eleve') return;
  if (!d.dataset.aid) d.dataset.aid = q.id.replace(/[^\w-]/g, '').slice(-30) + '-' + Math.random().toString(36).slice(2, 10);
  const a = {id: d.dataset.aid, qid: q.id, score: parseFloat(d.dataset.score || 0), hints: parseInt(d.dataset.hints || 0), mode: mode()};
  LAST[q.id] = {...a, chap: q.chap, ts: Date.now()};
  API('attempt', a).catch(() => {});
};

HOOKS.decorate = (q, d) => {
  const a = LAST[q.id]; if (!a) return;
  const m = d.querySelector('.meta'); if (!m) return;
  const t = document.createElement('span'); t.className = 'tag seen ' + scoreCls(a.score);
  t.title = 'Votre dernière réponse, ' + ago(a.ts); t.textContent = 'déjà faite · ' + scoreLabel(a.score);
  m.prepend(t);
};

/* ------------------------------------------------------------ styles */
const css = `
.cpt-box{margin-top:14px;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);font-size:.88rem;line-height:1.35}
.cpt-box .who{font-weight:600;margin-bottom:6px}
.cpt-box .who small{display:block;font-weight:400;color:var(--fg-2);font-size:.75rem;margin-top:2px}
.cpt-box a,.cpt-box button.lk{display:block;padding:4px 0;color:var(--accent);text-decoration:none;font:inherit;background:none;border:0;cursor:pointer;text-align:left}
.cpt-box a:hover,.cpt-box button.lk:hover{text-decoration:underline}
.cpt-box a.active{font-weight:600}
.q .meta .tag.seen.ok{background:color-mix(in srgb,var(--ok) 15%,var(--bg-2));color:var(--ok)}
.q .meta .tag.seen.mid{background:var(--sun-soft);color:var(--sun)}
.q .meta .tag.seen.bad{background:color-mix(in srgb,var(--bad) 13%,var(--bg-2));color:var(--bad)}
.cpt-gate{position:fixed;inset:0;z-index:50;background:var(--bg);display:grid;place-items:center;overflow-y:auto;
  padding-block:max(24px,env(safe-area-inset-top,0px)) 24px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.cpt-card{width:min(420px,100%);background:var(--bg-2);border:1px solid var(--line);border-radius:12px;padding:28px 26px}
.cpt-card .k{font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--sun);font-weight:600;margin:0 0 8px}
.cpt-card h1{font-size:2rem;margin:0 0 6px}
.cpt-card p{color:var(--fg-2);margin:.4em 0 1.1em;font-size:.95rem}
.cpt-card form{display:flex;flex-direction:column;gap:10px}
.cpt-card input{font:inherit;font-family:var(--mono);font-size:1.15rem;letter-spacing:.12em;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);width:100%}
.cpt-card input:focus{outline:2px solid var(--accent);outline-offset:0;border-color:var(--accent)}
.cpt-card .err{color:var(--bad);font-size:.9rem;min-height:1.3em;margin:0}
.cpt-btn{font:inherit;font-size:.92rem;padding:8px 14px;border-radius:7px;border:1px solid var(--accent);background:var(--accent);color:var(--on-accent);cursor:pointer;font-weight:500;text-decoration:none;display:inline-block;line-height:1.3}
.cpt-btn.sec{background:var(--bg-2);color:var(--fg);border-color:var(--line)}
.cpt-btn.dang{background:var(--bg-2);color:var(--bad);border-color:color-mix(in srgb,var(--bad) 45%,var(--line))}
.cpt-btn.sm{font-size:.8rem;padding:4px 9px}
.cpt-btn:disabled{opacity:.55;cursor:default}
.dash .tabs{display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--line);margin:14px 0 4px}
.dash .tabs a{padding:8px 12px;text-decoration:none;color:var(--fg-2);border-bottom:2px solid transparent;margin-bottom:-1px;font-weight:500}
.dash .tabs a.on{color:var(--accent-2);border-color:var(--accent)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:18px 0}
.kpi{background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:12px 14px;min-width:0}
.kpi .v{font-family:var(--display);font-size:2rem;font-weight:500;line-height:1.05;font-variant-numeric:tabular-nums}
.kpi .v small{font-family:var(--body);font-size:.85rem;color:var(--fg-2);font-weight:400}
.kpi .l{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--fg-2);font-weight:600;margin-top:4px}
.kpi .s{font-size:.82rem;color:var(--fg-2);margin-top:2px}
.dash h2{font-size:1.3rem;margin-top:1.8em}
.dash .scroll{overflow-x:auto;margin:0 0 1em}
.dash table{margin:.4em 0}
.dash td.num,.dash th.num{text-align:right;white-space:nowrap}
.bar{height:8px;border-radius:99px;background:var(--bg-3);overflow:hidden;min-width:70px}
.bar>i{display:block;height:100%;background:var(--accent);border-radius:99px}
.bar.ok>i{background:var(--ok)}
.chrow{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr);gap:6px 18px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}
.chrow .t{font-weight:600}
.chrow .t small{display:block;font-weight:400;color:var(--fg-2);font-size:.78rem;letter-spacing:.06em;text-transform:uppercase}
.chrow .m{font-size:.8rem;color:var(--fg-2);margin-bottom:4px;display:flex;justify-content:space-between;gap:8px}
.chrow .nx{grid-column:1/-1;font-size:.88rem;color:var(--fg-2)}
.chrow .nx a{font-weight:500}
@media (max-width:640px){.chrow{grid-template-columns:1fr 1fr}.chrow .t{grid-column:1/-1}}
.heat{display:flex;gap:3px;overflow-x:auto;padding-bottom:4px}
.heat .wk{display:flex;flex-direction:column;gap:3px}
.heat i{width:13px;height:13px;border-radius:3px;background:var(--bg-3);display:block}
.heat i.l1{background:color-mix(in srgb,var(--accent) 30%,var(--bg-3))}
.heat i.l2{background:color-mix(in srgb,var(--accent) 55%,var(--bg-3))}
.heat i.l3{background:color-mix(in srgb,var(--accent) 80%,var(--bg-3))}
.heat i.l4{background:var(--accent)}
.heat i.out{visibility:hidden}
.legend{font-size:.8rem;color:var(--fg-2);margin-top:4px}
.qlist{list-style:none;padding:0;margin:.5em 0}
.qlist li{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--line);min-width:0}
.qlist li>div{min-width:0;flex:1}
.qlist a{text-decoration:none;font-weight:500}
.qlist .sn{color:var(--fg-2);font-size:.86rem;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pill{font-size:.72rem;letter-spacing:.05em;text-transform:uppercase;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap;background:var(--bg-3);color:var(--fg-2)}
.pill.ok{background:color-mix(in srgb,var(--ok) 15%,var(--bg-2));color:var(--ok)}
.pill.mid{background:var(--sun-soft);color:var(--sun)}
.pill.bad{background:color-mix(in srgb,var(--bad) 13%,var(--bg-2));color:var(--bad)}
.cl{border:1px solid var(--line);border-radius:8px;background:var(--bg-2);padding:10px 12px;margin:8px 0;font-size:.92rem}
.cl .h{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px;font-size:.85rem;color:var(--fg-2)}
.cl .ans{white-space:pre-wrap;background:var(--bg);border-radius:6px;padding:6px 8px;margin:6px 0;font-size:.88rem}
.cols2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}
@media (max-width:760px){.cols2{grid-template-columns:1fr}}
.form-row{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin:8px 0}
.form-row label{display:flex;flex-direction:column;gap:4px;font-size:.82rem;color:var(--fg-2);min-width:0}
.dash textarea,.dash input[type=text],.dash input[type=number],.dash select{font:inherit;font-size:.92rem;padding:7px 9px;border:1px solid var(--line);border-radius:6px;background:var(--bg-2);color:var(--fg);max-width:100%}
.dash textarea{width:100%;min-height:120px;resize:vertical}
.code{font-family:var(--mono);letter-spacing:.06em;white-space:nowrap}
.note-ok{color:var(--ok);font-size:.9rem}
.note-bad{color:var(--bad);font-size:.9rem}
.newcodes{background:var(--obj);border-radius:8px;padding:10px 14px;margin:10px 0}
.chart svg{width:100%;height:auto;display:block}
.chart text{font-family:var(--body);fill:var(--fg-2)}
.switch{display:flex;gap:10px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--line)}
.switch input{margin-top:4px;width:18px;height:18px;accent-color:var(--accent)}
.switch b{display:block}
.switch span{color:var(--fg-2);font-size:.9rem}
.muted{color:var(--fg-2)}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

/* ------------------------------------------------------------ écran de connexion */
function gate(){
  if (document.querySelector('.cpt-gate')) return;
  const g = document.createElement('div'); g.className = 'cpt-gate';
  g.innerHTML = `<div class="cpt-card" role="dialog" aria-labelledby="cptT">
    <p class="k">IPhO · Concours général</p><h1 id="cptT">Physique des olympiades</h1>
    <p>Entrez le code personnel donné par votre professeur. Il garde votre progression d’un appareil à l’autre. Professeur : entrez votre mot de passe.</p>
    <form><input id="cptCode" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC-DEF" aria-label="Code personnel">
    <button class="cpt-btn" type="submit">Entrer</button><p class="err" aria-live="polite"></p></form>
    ${ME && ME.open ? '<p style="margin:14px 0 0"><button type="button" class="cpt-btn sec" data-skip>Continuer sans compte</button></p>' : ''}
  </div>`;
  document.body.appendChild(g);
  const inp = g.querySelector('input'), err = g.querySelector('.err'), btn = g.querySelector('button[type=submit]');
  setTimeout(() => inp.focus(), 50);
  g.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = ''; btn.disabled = true;
    try {
      const r = await API('login', {code: inp.value});
      if (r.role === 'admin' && !location.hash.startsWith('#admin')) location.hash = '#admin';
      location.reload();
    } catch(x){ err.textContent = x.userMessage || 'Connexion impossible.'; btn.disabled = false; inp.select(); }
  });
  const sk = g.querySelector('[data-skip]'); if (sk) sk.addEventListener('click', () => { try { sessionStorage.setItem('olymp-sans-compte', '1'); } catch(e){} g.remove(); });
}
async function logout(){ try { await API('logout', {}); } catch(e){} location.hash = '#accueil'; location.reload(); }

function accountBox(){
  const rail = document.getElementById('rail'); if (!rail || rail.querySelector('.cpt-box')) return;
  const b = document.createElement('div'); b.className = 'cpt-box';
  if (ME.role === 'eleve'){
    b.innerHTML = `<div class="who">${E(ME.me.prenom)} ${E(ME.me.nom)}<small>${ME.me.groupe ? E(ME.me.groupe) + ' · ' : ''}${ME.me.niveau === 'C' ? 'CPGE' : 'Terminale'}</small></div>
      <a href="#suivi" data-page="suivi">Mon tableau de bord</a><button type="button" class="lk" data-out>Se déconnecter</button>`;
  } else if (ME.role === 'admin'){
    b.innerHTML = `<div class="who">Espace professeur</div><a href="#admin" data-page="admin">Tableau de bord de la classe</a>
      <a href="#admin/eleves">Élèves et codes</a><button type="button" class="lk" data-out>Se déconnecter</button>`;
  } else {
    b.innerHTML = `<div class="who">Visiteur<small>Votre progression n’est pas enregistrée.</small></div><button type="button" class="lk" data-in>Se connecter</button>`;
  }
  const lvl = rail.querySelector('.level'); (lvl || rail.querySelector('.brand')).after(b);
  b.addEventListener('click', e => { if (e.target.closest('[data-out]')) logout(); if (e.target.closest('[data-in]')) gate(); });
}

ready.then(() => {
  if (ME.offline) return;
  if (ME.role) accountBox();
  else {
    let skipped = false; try { skipped = sessionStorage.getItem('olymp-sans-compte') === '1'; } catch(e){}
    if (ME.open){ accountBox(); if (!skipped) gate(); } else gate();
  }
  // un élève de CPGE arrive en niveau CPGE la première fois
  if (ME.role === 'eleve'){ let lv = null; try { lv = localStorage.getItem('olymp-niveau'); } catch(e){}
    if (!lv && ME.me.niveau === 'C'){ const bt = document.querySelector('.level button[data-lvl="C"]'); if (bt) bt.click(); } }
  const h = mode(); if (h === 'suivi' || h === 'admin') route();
});

/* ------------------------------------------------------------ calculs communs */
const inLevel = (it, lv) => lv === 'C' || (it.level || ['T', 'C']).includes('T');
function lastPerQ(attempts){ const m = {}; attempts.forEach(a => { if (!m[a.qid] || m[a.qid].ts <= a.ts) m[a.qid] = a; }); return m; }
// incontournables d'un chapitre (progression.json) : liste de {label, qids, href}
function stars(prog, data, chap, lv){
  return (prog[chap] || []).filter(e => e.star).map(e => {
    const t = e.ref.slice(0, 1), id = e.ref.slice(2);
    if (t === 'q'){ const q = data.qById[id]; if (!q || !inLevel(q, lv)) return null; return {label: q.sub || q.origin || 'Question', why: e.why, qids: [q.id], href: '#question/' + encodeURIComponent(q.id)}; }
    const g = data.gById[id]; if (!g || !inLevel(g, lv)) return null;
    const qs = (data.byGroup[id] || []).filter(q => inLevel(q, lv)); if (!qs.length) return null;
    return {label: (g.kind === 'cde' ? 'Entraînement ' + g.num + ' · ' : '') + g.title, why: e.why, qids: qs.map(q => q.id), href: '#' + (g.chap || chap) + '--g-' + g.id};
  }).filter(Boolean);
}
function qLabel(q){ if (!q) return 'Question supprimée'; return q.sub || q.origin || (DATA.gById[q.group] || {}).title || 'Question'; }
function qSnippet(q){ return q ? plain(q.statement).slice(0, 140) : ''; }

/* heatmap de l'activité (16 semaines) */
function heat(attempts){
  const per = {}; attempts.forEach(a => { const d = Math.floor((a.ts - new Date().getTimezoneOffset() * 60000) / DAYMS); per[d] = (per[d] || 0) + 1; });
  const today = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / DAYMS);
  const dow = (new Date().getDay() + 6) % 7;            // lundi = 0
  const start = today - dow - 15 * 7;
  let h = '<div class="heat" role="img" aria-label="Activité des seize dernières semaines">';
  for (let w = 0; w < 16; w++){
    h += '<div class="wk">';
    for (let k = 0; k < 7; k++){
      const d = start + w * 7 + k, n = per[d] || 0;
      const lvl = d > today ? 'out' : n === 0 ? '' : n < 4 ? 'l1' : n < 10 ? 'l2' : n < 20 ? 'l3' : 'l4';
      h += `<i class="${lvl}" title="${new Date((d * DAYMS) + new Date().getTimezoneOffset() * 60000).toLocaleDateString('fr-FR', {weekday: 'short', day: 'numeric', month: 'short'})} : ${n} réponse${n > 1 ? 's' : ''}"></i>`;
    }
    h += '</div>';
  }
  return h + '</div><p class="legend">Une case par jour, de la plus ancienne (à gauche) à aujourd’hui ; plus la case est foncée, plus il y a eu de réponses.</p>';
}
function streak(attempts){
  const off = new Date().getTimezoneOffset() * 60000, days = new Set(attempts.map(a => Math.floor((a.ts - off) / DAYMS)));
  let d = Math.floor((Date.now() - off) / DAYMS); if (!days.has(d)) d--; let n = 0; while (days.has(d)){ n++; d--; }
  const active30 = [...days].filter(x => x > Math.floor((Date.now() - off) / DAYMS) - 30).length;
  return {n, active30};
}

/* ------------------------------------------------------------ tableau de bord d'un élève */
async function renderStudentDash(root, attempts, claude, lv, opts = {}){
  const [data, prog] = await Promise.all([loadData(), loadProg()]);
  const last = lastPerQ(attempts), done = Object.values(last);
  const mean = done.length ? done.reduce((s, a) => s + a.score, 0) / done.length : 0;
  const chs = Object.keys(CHAPTERS);
  let starTot = 0, starDone = 0; const rows = [];
  for (const c of chs){
    const all = data.questions.filter(q => q.chap === c && inLevel(q, lv));
    const mine = done.filter(a => (data.qById[a.qid] || {}).chap === c);
    const m = mine.length ? mine.reduce((s, a) => s + a.score, 0) / mine.length : null;
    const st = stars(prog, data, c, lv); const stDone = st.filter(s => s.qids.every(id => last[id]));
    starTot += st.length; starDone += stDone.length;
    const next = st.find(s => !s.qids.every(id => last[id]));
    rows.push({c, all: all.length, n: mine.length, m, st: st.length, stDone: stDone.length, next});
  }
  const sk = streak(attempts);
  const review = done.filter(a => a.score < 1).sort((a, b) => b.ts - a.ts).slice(0, 12);
  let h = `<div class="kpis">
    <div class="kpi"><div class="v">${done.length}</div><div class="l">Questions traitées</div><div class="s">${attempts.length} réponse${attempts.length > 1 ? 's' : ''} en tout</div></div>
    <div class="kpi"><div class="v">${done.length ? pct(mean) : '–'}</div><div class="l">Réussite</div><div class="s">dernière réponse à chaque question</div></div>
    <div class="kpi"><div class="v">${starDone}<small> / ${starTot}</small></div><div class="l">Incontournables faits</div><div class="s">exercices ★ des pages de cours</div></div>
    <div class="kpi"><div class="v">${sk.n}<small> j</small></div><div class="l">Série en cours</div><div class="s">${sk.active30} jour${sk.active30 > 1 ? 's' : ''} actif${sk.active30 > 1 ? 's' : ''} sur 30</div></div>
  </div>`;
  h += `<h2>Par chapitre</h2><div>`;
  for (const r of rows){
    const ch = CHAPTERS[r.c];
    h += `<div class="chrow"><div class="t"><small>${E(ch.label)}</small><a href="#${r.c}">${E(ch.title)}</a></div>
      <div><div class="m"><span>Traitées</span><span>${r.n} / ${r.all}</span></div><div class="bar"><i style="width:${r.all ? Math.min(100, 100 * r.n / r.all) : 0}%"></i></div></div>
      <div><div class="m"><span>Réussite</span><span>${r.m === null ? '–' : pct(r.m)}</span></div><div class="bar ok"><i style="width:${r.m === null ? 0 : 100 * r.m}%"></i></div></div>
      ${r.st ? `<div class="nx">★ ${r.stDone} / ${r.st} incontournables${r.next && !opts.admin ? ` · prochain : <a href="${E(r.next.href)}">${E(r.next.label)}</a>` : r.next ? '' : ' · tous faits'}</div>` : ''}</div>`;
  }
  h += `</div><h2>Activité</h2>${heat(attempts)}`;
  h += `<div class="cols2"><div><h2>À reprendre</h2>`;
  if (!review.length) h += `<p class="muted">${done.length ? 'Aucune question ratée : bravo.' : 'Rien pour l’instant : les questions ratées ou réussies en partie apparaîtront ici.'}</p>`;
  else h += '<ul class="qlist">' + review.map(a => { const q = data.qById[a.qid]; return `<li><span class="pill ${scoreCls(a.score)}">${scoreLabel(a.score)}</span><div><a href="#question/${encodeURIComponent(a.qid)}">${E(qLabel(q))}</a><span class="sn">${E(CHAPTERS[(q || {}).chap] ? CHAPTERS[q.chap].title + ' · ' : '')}${E(ago(a.ts))}${a.hints ? ' · ' + a.hints + ' indice' + (a.hints > 1 ? 's' : '') : ''}</span></div></li>`; }).join('') + '</ul>';
  h += `</div><div><h2>Corrections par Claude</h2>`;
  if (!claude.length) h += '<p class="muted">Aucune pour l’instant. Les questions « réponse à rédiger » proposent le bouton « Faire corriger par Claude ».</p>';
  else h += claude.slice(0, opts.admin ? 100 : 10).map(c => { const q = data.qById[c.qid]; const s = c.verdict === 'juste' ? 1 : c.verdict === 'partiel' ? .5 : 0;
    return `<div class="cl"><div class="h"><span class="pill ${scoreCls(s)}">${c.verdict === 'partiel' ? 'en partie' : c.verdict === 'juste' ? 'juste' : 'à revoir'}</span><a href="#question/${encodeURIComponent(c.qid)}">${E(qLabel(q))}</a><span>${E(ago(c.ts))}</span></div>${c.answer ? `<div class="ans">${E(c.answer)}</div>` : ''}<div class="cm">${E(c.comment)}</div></div>`; }).join('');
  h += '</div></div>';
  root.innerHTML = h; typeset(root);
}

async function showSuivi(){
  view.className = 'page wide dash'; view.dataset.page = '';
  view.innerHTML = '<p class="loading">Chargement…</p>';
  await ready;
  if (!ME || ME.role !== 'eleve'){
    view.innerHTML = ME && ME.role === 'admin' ? '<h1>Tableau de bord</h1><p>Vous êtes connecté comme professeur : votre tableau de bord est <a href="#admin">celui de la classe</a>.</p>'
      : '<h1>Mon tableau de bord</h1><p>Connectez-vous avec votre code pour suivre votre progression.</p><p><button class="cpt-btn" type="button" id="cptIn">Se connecter</button></p>';
    const b = document.getElementById('cptIn'); if (b) b.addEventListener('click', gate); return;
  }
  const m = await API('mine').catch(() => ({attempts: [], claude: []}));
  m.attempts.forEach(a => { if (!LAST[a.qid] || LAST[a.qid].ts <= a.ts) LAST[a.qid] = a; });
  view.innerHTML = `<p class="eyebrow">Mon suivi</p><h1>Bonjour ${E(ME.me.prenom)}</h1>
    <p class="muted">${ME.claude && ME.claude.enabled ? `Corrections par Claude : ${Math.max(0, ME.claude.quota - ME.claude.used)} restantes sur ${ME.claude.quota} par 24 h.` : ''}</p><div id="sd"></div>`;
  await renderStudentDash(view.querySelector('#sd'), m.attempts, m.claude, LEVEL);
  window.scrollTo(0, 0);
}

/* ------------------------------------------------------------ espace professeur */
let OV = null;
async function showAdmin(sub){
  view.className = 'page wide dash'; view.dataset.page = '';
  await ready;
  if (!ME || ME.role !== 'admin'){ view.innerHTML = '<h1>Espace professeur</h1><p>Connectez-vous avec le mot de passe professeur.</p><p><button class="cpt-btn" type="button" id="cptIn">Se connecter</button></p>'; document.getElementById('cptIn').addEventListener('click', gate); return; }
  sub = sub || '';
  const tab = sub.startsWith('eleve-') ? 'eleves' : sub || 'classe';
  view.innerHTML = `<p class="eyebrow">Espace professeur</p><h1>Tableau de bord</h1>
    <nav class="tabs" aria-label="Rubriques"><a href="#admin" class="${tab === 'classe' ? 'on' : ''}">La classe</a><a href="#admin/eleves" class="${tab === 'eleves' ? 'on' : ''}">Élèves et codes</a><a href="#admin/reglages" class="${tab === 'reglages' ? 'on' : ''}">Réglages</a></nav><div id="adm"><p class="loading">Chargement…</p></div>`;
  const root = view.querySelector('#adm');
  try { OV = await API('overview'); } catch(e){ root.innerHTML = `<p class="note-bad">${E(e.userMessage || 'Le serveur ne répond pas.')}</p>`; return; }
  await loadData(); await loadProg();
  if (sub.startsWith('eleve-')) return adminStudent(root, sub.slice(6));
  if (tab === 'eleves') return adminStudents(root);
  if (tab === 'reglages') return adminSettings(root);
  return adminClass(root);
}
const nameOf = sid => { const s = OV.students.find(x => x.id === sid); return s ? (s.prenom + ' ' + s.nom).trim() : 'Élève supprimé'; };

function adminClass(root){
  const now = Date.now(), week = now - 7 * DAYMS;
  const S = OV.students, P = OV.perq;
  const active7 = new Set(P.filter(p => p.ts > week).map(p => p.sid)).size;
  const days = OV.days, n7 = days.filter(d => d.day * DAYMS > week).reduce((s, d) => s + d.n, 0);
  const meanAll = P.length ? P.reduce((s, p) => s + p.score, 0) / P.length : 0;
  const cl24 = OV.claude.filter(c => c.ts > now - DAYMS).length, cl7 = OV.claude.filter(c => c.ts > week).length;
  let h = `<div class="kpis">
    <div class="kpi"><div class="v">${S.length}</div><div class="l">Élèves</div><div class="s">${active7} actif${active7 > 1 ? 's' : ''} cette semaine</div></div>
    <div class="kpi"><div class="v">${n7}</div><div class="l">Réponses sur 7 jours</div><div class="s">${P.length} questions traitées en tout</div></div>
    <div class="kpi"><div class="v">${P.length ? pct(meanAll) : '–'}</div><div class="l">Réussite moyenne</div><div class="s">dernière réponse par élève et question</div></div>
    <div class="kpi"><div class="v">${cl7}</div><div class="l">Corrections Claude, 7 j</div><div class="s">${cl24} sur les dernières 24 h</div></div>
  </div>`;
  if (!S.length) h += `<p class="newcodes">Commencez par <a href="#admin/eleves">créer les comptes des élèves</a> : chacun reçoit un code personnel à six caractères.</p>`;
  // activité sur 60 jours
  const today = Math.floor(now / DAYMS), N = 60, W = 720, H = 140, bw = W / N;
  const per = Object.fromEntries(days.map(d => [d.day, d])); const max = Math.max(1, ...days.map(d => d.n));
  let bars = ''; for (let i = 0; i < N; i++){ const d = today - N + 1 + i, v = per[d] ? per[d].n : 0, bh = (H - 22) * v / max;
    bars += `<rect x="${(i * bw + 1).toFixed(1)}" y="${(H - 18 - bh).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="var(--accent)"><title>${new Date(d * DAYMS).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})} : ${v} réponses${per[d] ? ', ' + per[d].eleves + ' élève(s)' : ''}</title></rect>`; }
  const lab = i => new Date((today - N + 1 + i) * DAYMS).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'});
  h += `<h2>Activité sur 60 jours</h2><div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Réponses par jour"><line x1="0" x2="${W}" y1="${H - 18}" y2="${H - 18}" stroke="var(--line)"/>${bars}
    <text x="0" y="${H - 3}" font-size="11">${lab(0)}</text><text x="${W / 2}" y="${H - 3}" font-size="11" text-anchor="middle">${lab(30)}</text><text x="${W}" y="${H - 3}" font-size="11" text-anchor="end">aujourd’hui</text>
    <text x="0" y="11" font-size="11">max ${max} réponses / jour</text></svg></div>`;
  // chapitres
  h += `<h2>Chapitres</h2><div class="scroll"><table><thead><tr><th>Chapitre</th><th class="num">Élèves</th><th class="num">Questions / élève</th><th>Réussite</th></tr></thead><tbody>`;
  for (const c of Object.keys(CHAPTERS)){
    const rows = P.filter(p => p.chap === c), who = new Set(rows.map(p => p.sid));
    const m = rows.length ? rows.reduce((s, p) => s + p.score, 0) / rows.length : null;
    h += `<tr><td><a href="#${c}">${E(CHAPTERS[c].title)}</a></td><td class="num">${who.size} / ${S.length}</td><td class="num">${who.size ? (rows.length / who.size).toFixed(1).replace('.', ',') : '–'}</td><td>${m === null ? '–' : `<div style="display:flex;gap:8px;align-items:center"><div class="bar ok" style="flex:1"><i style="width:${100 * m}%"></i></div><span style="min-width:3.2em;text-align:right">${pct(m)}</span></div>`}</td></tr>`;
  }
  h += '</tbody></table></div>';
  // questions difficiles
  const byQ = {}; P.forEach(p => (byQ[p.qid] = byQ[p.qid] || []).push(p.score));
  const hard = Object.entries(byQ).filter(([, v]) => v.length >= Math.min(3, Math.max(1, S.length))).map(([qid, v]) => ({qid, n: v.length, m: v.reduce((a, b) => a + b, 0) / v.length}))
    .filter(x => x.m < 0.75).sort((a, b) => a.m - b.m || b.n - a.n).slice(0, 12);
  h += `<div class="cols2"><div><h2>Questions les plus ratées</h2>`;
  h += hard.length ? '<ul class="qlist">' + hard.map(x => { const q = DATA.qById[x.qid]; return `<li><span class="pill ${scoreCls(x.m >= .5 ? .5 : 0)}">${pct(x.m)}</span><div><a href="#question/${encodeURIComponent(x.qid)}">${E(qLabel(q))}</a><span class="sn">${E(q && CHAPTERS[q.chap] ? CHAPTERS[q.chap].title : '')} · ${x.n} élève${x.n > 1 ? 's' : ''}</span></div></li>`; }).join('') + '</ul>'
    : '<p class="muted">Pas encore assez de réponses (il faut au moins trois élèves sur une même question).</p>';
  h += `</div><div><h2>Dernières réponses</h2>`;
  h += OV.recent.length ? '<ul class="qlist">' + OV.recent.slice(0, 15).map(a => { const q = DATA.qById[a.qid]; return `<li><span class="pill ${scoreCls(a.score)}">${scoreLabel(a.score)}</span><div><a href="#admin/eleve-${E(a.sid)}">${E(nameOf(a.sid))}</a> · <a href="#question/${encodeURIComponent(a.qid)}">${E(qLabel(q))}</a><span class="sn">${E(ago(a.ts))}${a.hints ? ' · ' + a.hints + ' indice' + (a.hints > 1 ? 's' : '') : ''}</span></div></li>`; }).join('') + '</ul>'
    : '<p class="muted">Aucune réponse enregistrée pour l’instant.</p>';
  h += '</div></div>';
  root.innerHTML = h;
}

function adminStudents(root){
  const S = OV.students;
  const groups = [...new Set(S.map(s => s.groupe).filter(Boolean))].sort();
  let h = `<div class="cols2"><div><h2>Ajouter des élèves</h2>
    <p class="muted" style="font-size:.9rem">Une ligne par élève : « Prénom Nom » (ou « Prénom ; Nom »). Chaque élève reçoit un code à six caractères, à lui transmettre.</p>
    <textarea id="adL" placeholder="Camille Martin&#10;Hugo Bernard"></textarea>
    <div class="form-row"><label>Groupe<input type="text" id="adG" placeholder="ex. TS 2026" list="adGl"><datalist id="adGl">${groups.map(g => `<option value="${E(g)}">`).join('')}</datalist></label>
    <label>Niveau<select id="adN"><option value="T">Terminale</option><option value="C">CPGE</option></select></label>
    <button class="cpt-btn" id="adB" type="button">Créer les comptes</button></div><div id="adOut"></div></div>
    <div><h2>Codes</h2><p class="muted" style="font-size:.9rem">Les élèves se connectent avec leur code ; vous, avec le mot de passe professeur. Un nouveau code remplace l’ancien (l’élève garde sa progression).</p>
    <p><a class="cpt-btn sec" href="/api/app?a=export">Exporter le suivi (tableur CSV)</a> <button class="cpt-btn sec" type="button" id="adPrint">Imprimer les codes</button></p></div></div>`;
  h += `<h2>Élèves (${S.length})</h2>`;
  if (groups.length > 1) h += `<div class="form-row"><label>Groupe<select id="adF"><option value="">Tous</option>${groups.map(g => `<option>${E(g)}</option>`).join('')}</select></label></div>`;
  h += `<div class="scroll"><table id="adT"><thead><tr><th>Élève</th><th>Groupe</th><th>Niveau</th><th>Code</th><th class="num">Questions</th><th class="num">Réussite</th><th>Dernière réponse</th><th class="num">Claude 24 h</th><th></th></tr></thead><tbody>`;
  h += S.map(s => `<tr data-sid="${E(s.id)}" data-g="${E(s.groupe)}"><td><a href="#admin/eleve-${E(s.id)}">${E(s.nom)} ${E(s.prenom)}</a></td><td>${E(s.groupe)}</td><td>${s.niveau === 'C' ? 'CPGE' : 'Term.'}</td><td class="code">${E(fmtCode(s.code))}</td>
    <td class="num">${s.done}</td><td class="num">${s.done ? pct(s.mean) : '–'}</td><td>${E(ago(s.lastanswer))}</td><td class="num">${s.claude24}</td>
    <td style="white-space:nowrap"><button class="cpt-btn sec sm" data-regen type="button">Nouveau code</button> <button class="cpt-btn dang sm" data-del type="button">Supprimer</button></td></tr>`).join('');
  h += '</tbody></table></div>';
  if (!S.length) h += '<p class="muted">Aucun élève pour l’instant.</p>';
  root.innerHTML = h;
  const out = root.querySelector('#adOut');
  root.querySelector('#adB').addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true; out.innerHTML = '';
    try {
      const r = await API('addStudents', {lines: root.querySelector('#adL').value, groupe: root.querySelector('#adG').value, niveau: root.querySelector('#adN').value});
      OV = await API('overview'); adminStudents(root);
      root.querySelector('#adOut').innerHTML = `<div class="newcodes"><b>${r.added.length} compte${r.added.length > 1 ? 's' : ''} créé${r.added.length > 1 ? 's' : ''}</b><table>${r.added.map(a => `<tr><td>${E(a.prenom)} ${E(a.nom)}</td><td class="code">${E(fmtCode(a.code))}</td></tr>`).join('')}</table></div>`;
    } catch(x){ out.innerHTML = `<p class="note-bad">${E(x.userMessage || 'Échec.')}</p>`; b.disabled = false; }
  });
  const f = root.querySelector('#adF'); if (f) f.addEventListener('change', () => root.querySelectorAll('#adT tbody tr').forEach(tr => tr.hidden = !!f.value && tr.dataset.g !== f.value));
  root.querySelector('#adPrint').addEventListener('click', () => printCodes(f && f.value));
  root.querySelector('#adT').addEventListener('click', async e => {
    const tr = e.target.closest('tr[data-sid]'); if (!tr) return; const sid = tr.dataset.sid;
    if (e.target.closest('[data-regen]')){ const b = e.target.closest('button'); b.disabled = true;
      try { const r = await API('regenCode', {sid}); tr.querySelector('.code').textContent = fmtCode(r.code); const s = OV.students.find(x => x.id === sid); if (s) s.code = r.code; b.textContent = 'Code changé'; } catch(x){ b.textContent = 'Échec'; } }
    const del = e.target.closest('[data-del]');
    if (del){
      if (!del.dataset.armed){ del.dataset.armed = '1'; del.textContent = 'Confirmer : tout effacer'; setTimeout(() => { if (del.isConnected){ delete del.dataset.armed; del.textContent = 'Supprimer'; } }, 5000); return; }
      del.disabled = true; try { await API('deleteStudent', {sid}); OV.students = OV.students.filter(x => x.id !== sid); tr.remove(); } catch(x){ del.textContent = 'Échec'; }
    }
  });
}
function printCodes(group){
  const S = OV.students.filter(s => !group || s.groupe === group);
  const w = window.open('', '_blank'); if (!w) return;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Codes · Physique des olympiades</title><style>body{font-family:system-ui,sans-serif;margin:24px}div{display:grid;grid-template-columns:1fr 1fr;gap:0}p{border:1px dashed #999;margin:0;padding:14px 16px;break-inside:avoid}b{font-size:1.05rem}code{font-size:1.4rem;letter-spacing:.12em;display:block;margin:6px 0}small{color:#555}</style>
    <div>${S.map(s => `<p><b>${E(s.prenom)} ${E(s.nom)}</b><code>${E(fmtCode(s.code))}</code><small>${E(location.origin)} · votre code personnel</small></p>`).join('')}</div><script>print()<\/script>`);
  w.document.close();
}

async function adminStudent(root, sid){
  let d; try { d = await API('student', {sid}); } catch(e){ root.innerHTML = `<p class="note-bad">${E(e.userMessage || 'Élève introuvable.')}</p>`; return; }
  const s = d.me;
  root.innerHTML = `<p style="margin-top:14px"><a href="#admin/eleves">← Tous les élèves</a></p>
    <h2 style="margin-top:.4em">${E(s.prenom)} ${E(s.nom)}</h2>
    <p class="muted">Code <span class="code">${E(fmtCode(s.code))}</span> · ${s.niveau === 'C' ? 'CPGE' : 'Terminale'}${s.groupe ? ' · ' + E(s.groupe) : ''} · dernière visite ${E(ago(s.last))}</p>
    <details><summary>Modifier la fiche</summary><div class="form-row"><label>Prénom<input type="text" id="esP" value="${E(s.prenom)}"></label><label>Nom<input type="text" id="esN" value="${E(s.nom)}"></label>
    <label>Groupe<input type="text" id="esG" value="${E(s.groupe)}"></label><label>Niveau<select id="esL"><option value="T"${s.niveau !== 'C' ? ' selected' : ''}>Terminale</option><option value="C"${s.niveau === 'C' ? ' selected' : ''}>CPGE</option></select></label>
    <button class="cpt-btn" type="button" id="esB">Enregistrer</button><span id="esO"></span></div></details><div id="esD"></div>`;
  root.querySelector('#esB').addEventListener('click', async () => {
    const o = root.querySelector('#esO');
    try { await API('updateStudent', {sid, prenom: root.querySelector('#esP').value, nom: root.querySelector('#esN').value, groupe: root.querySelector('#esG').value, niveau: root.querySelector('#esL').value}); o.className = 'note-ok'; o.textContent = 'Enregistré.'; }
    catch(e){ o.className = 'note-bad'; o.textContent = e.userMessage || 'Échec.'; }
  });
  await renderStudentDash(root.querySelector('#esD'), d.attempts, d.claude, s.niveau, {admin: true});
}

function adminSettings(root){
  const st = OV.settings, cf = OV.config;
  root.innerHTML = `<h2>Correction par Claude</h2>
    <p class="${cf.hasKey ? 'note-ok' : 'note-bad'}">${cf.hasKey ? `Clé API présente · modèle <span class="code">${E(cf.model)}</span>.` : 'Aucune clé API : ajoutez la variable ANTHROPIC_API_KEY dans les réglages du projet Vercel, puis redéployez.'}</p>
    <label class="switch"><input type="checkbox" id="stC"${st.claude ? ' checked' : ''}><div><b>Proposer la correction par Claude aux élèves</b><span>Bouton « Faire corriger par Claude » sous les questions à rédiger.</span></div></label>
    <div class="form-row"><label>Corrections par élève et par 24 h<input type="number" id="stQ" min="0" max="200" value="${st.quota}" style="width:8em"></label></div>
    <h2>Accès au site</h2>
    <label class="switch"><input type="checkbox" id="stO"${st.open ? ' checked' : ''}><div><b>Accès sans code</b><span>Un visiteur peut lire le cours et faire les exercices sans compte (rien n’est enregistré, pas de correction par Claude). Sinon, le code est demandé à l’entrée.</span></div></label>
    <p class="form-row"><button class="cpt-btn" type="button" id="stB">Enregistrer les réglages</button><span id="stOut"></span></p>`;
  root.querySelector('#stB').addEventListener('click', async () => {
    const o = root.querySelector('#stOut');
    try { const r = await API('saveSettings', {claude: root.querySelector('#stC').checked, quota: root.querySelector('#stQ').value, open: root.querySelector('#stO').checked}); OV.settings = r.settings; o.className = 'note-ok'; o.textContent = 'Réglages enregistrés.'; }
    catch(e){ o.className = 'note-bad'; o.textContent = e.userMessage || 'Échec.'; }
  });
}

HOOKS.routes = Object.assign(HOOKS.routes || {}, {suivi: showSuivi, admin: showAdmin});
})();
