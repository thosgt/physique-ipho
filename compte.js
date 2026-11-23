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
/* visiteur sans compte : réponses gardées dans ce navigateur (versées dans le compte à la connexion) */
const LKEY = 'olymp-suivi';
function localAll(){ try { const a = JSON.parse(localStorage.getItem(LKEY) || '[]'); return Array.isArray(a) ? a : []; } catch(e){ return []; } }
function localSave(a){ try { const all = localAll().filter(x => x.id !== a.id); all.push(a); localStorage.setItem(LKEY, JSON.stringify(all.slice(-5000))); } catch(e){} }
function localClear(){ try { localStorage.removeItem(LKEY); } catch(e){} }
const isVisitor = () => !ME || !ME.role;
const ready = API('me').then(m => { ME = m; }).catch(() => { ME = {role: null, open: true, offline: true}; })
  .then(async () => {
    if (ME.role === 'eleve'){ try { const m = await API('mine'); m.attempts.forEach(a => LAST[a.qid] = a); SERIES = m.series || []; } catch(e){} }
    else if (!ME.role) localAll().forEach(a => { if (!LAST[a.qid] || LAST[a.qid].ts <= a.ts) LAST[a.qid] = a; });
  });

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
  photos: true,
  correct: async (q, answer, photos, mode) => {
    const urls = await Promise.all((photos || []).map(b => new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = ko; fr.readAsDataURL(b); })));
    const body = {qid: q.id, answer}; if (urls.length) body.photos = urls; if (mode) body.mode = mode;
    const r = await API('correct', body);
    if (ME.claude) ME.claude.used++;
    return r;
  }
} : null);

/* Temps passé sur chaque question : secondes pendant lesquelles elle est au moins à moitié visible, l'onglet actif,
   sans inactivité de plus de 10 minutes (un élève peut chercher sur papier). Plafonné à une heure. */
const TIMERS = new Map(); let lastInput = Date.now();
['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(ev => addEventListener(ev, () => { lastInput = Date.now(); }, {passive: true, capture: true}));
const IO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { const t = TIMERS.get(en.target); if (t) t.vis = en.isIntersecting && en.intersectionRect.height >= Math.min(en.boundingClientRect.height * 0.5, innerHeight * 0.35); }), {threshold: [0, .1, .25, .5, .75, 1]}) : null;
setInterval(() => {
  if (document.hidden || Date.now() - lastInput > 600000) return;
  for (const [el, t] of TIMERS){ if (!el.isConnected){ TIMERS.delete(el); continue; } if (t.vis && !el.classList.contains('done')) t.s = Math.min(3600, t.s + 2); }
}, 2000);
function watch(d){ if (!IO || TIMERS.has(d)) return; TIMERS.set(d, {s: 0, vis: false}); IO.observe(d); }
// ce que l'élève a répondu
function answerOf(q, d){
  if (q.type === 'qcm') return [...d.querySelectorAll('.opts input:checked')].map(i => i.value).join(',');
  if (q.type === 'num'){ const i = d.querySelector('.numin input'); return i ? i.value.trim().slice(0, 60) : ''; }
  const ta = d.querySelector('.redac textarea'), np = d.querySelectorAll('.redac .photos .ph').length;
  return ((ta ? ta.value.trim() : '') + (np ? ` [${np} photo${np > 1 ? 's' : ''} de la copie]` : '')).trim().slice(0, 2000);
}
function record(q, d, extra){
  if (ME && ME.role === 'admin') return;
  if (!d.dataset.aid) d.dataset.aid = q.id.replace(/[^\w-]/g, '').slice(-30) + '-' + Math.random().toString(36).slice(2, 10);
  const t = TIMERS.get(d);
  const a = {id: d.dataset.aid, qid: q.id, score: parseFloat(d.dataset.score || 0), hints: parseInt(d.dataset.hints || 0), mode: mode(),
    how: d.dataset.how || null, answer: answerOf(q, d), dur: t ? t.s : null, ...extra};
  LAST[q.id] = {...a, chap: q.chap, ts: Date.now()};
  if (isVisitor()) localSave(LAST[q.id]); else API('attempt', a).catch(() => {});
  document.dispatchEvent(new CustomEvent('olymp:done', {detail: q.id}));
}
HOOKS.done = (q, d) => record(q, d);
// corrigé d'une question à rédiger affiché sans rien avoir écrit : « réponse vue sans essayer »
HOOKS.seen = (q, d) => { if (!d.dataset.aid) d.dataset.aid = q.id.replace(/[^\w-]/g, '').slice(-30) + '-' + Math.random().toString(36).slice(2, 10);
  if (!answerOf(q, d) && d.dataset.score === undefined){ d.dataset.how = 'vu'; d.dataset.score = 0; record(q, d, {id: (d.dataset.aid || '').slice(0, 52) + '-vu'}); delete d.dataset.score; } };

HOOKS.decorate = (q, d) => {
  watch(d);
  const a = LAST[q.id]; if (!a) return;
  const m = d.querySelector('.meta'); if (!m || m.querySelector('.tag.seen')) return;
  const t = document.createElement('span'); t.className = 'tag seen ' + scoreCls(a.score);
  t.title = 'Votre dernière réponse, ' + ago(a.ts); t.textContent = a.how === 'vu' ? 'corrigé déjà lu' : 'déjà faite · ' + scoreLabel(a.score);
  if (a.how === 'vu') t.className = 'tag seen';
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
.cpt-card label.f{display:flex;flex-direction:column;gap:4px;font-size:.86rem;color:var(--fg-2)}
.cpt-card label.f small{font-size:.78rem}
.cpt-card input.nm{font-family:var(--body);font-size:1rem;letter-spacing:0;padding:9px 11px}
.cpt-card fieldset{border:0;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.92rem}
.cpt-card fieldset legend{font-size:.86rem;color:var(--fg-2);padding:0;margin-bottom:4px;width:100%}
.cpt-card fieldset label{display:flex;align-items:center;gap:6px;cursor:pointer}
.cpt-card fieldset input{width:auto;accent-color:var(--accent)}
.cpt-card .lk{font:inherit;font-size:.92rem;background:none;border:0;padding:0;color:var(--accent);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.cpt-card .alt{border-top:1px solid var(--line);padding-top:14px;margin:18px 0 0}
.cpt-card .status{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin:0 0 14px;color:var(--fg);font-size:.95rem}
.cpt-card .status.wait::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--sun);margin-right:8px;animation:cptPulse 1.6s ease-in-out infinite}
@keyframes cptPulse{50%{opacity:.25}}
.cpt-card .bigcode{font-family:var(--mono);font-size:2rem;letter-spacing:.14em;text-align:center;background:var(--bg);border:2px dashed var(--accent);border-radius:10px;padding:12px;margin:6px 0 12px;color:var(--fg)}
.cpt-card .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.cpt-box .badge,.tabs .badge{display:inline-block;min-width:1.5em;text-align:center;font-size:.72rem;font-weight:600;padding:1px 6px;border-radius:99px;background:var(--sun);color:#fff;margin-left:4px;vertical-align:1px}
.reqs td{vertical-align:top}
.reqs td small{display:block;color:var(--fg-2);font-size:.8rem}
.reqs .flag{display:block;font-size:.8rem;color:var(--sun);margin-top:3px}
.reqs input[type=text]{width:8.5em}
.reqs .acts{white-space:nowrap;display:flex;gap:6px;flex-wrap:wrap}
.cpt-btn{font:inherit;font-size:.92rem;padding:8px 14px;border-radius:7px;border:1px solid var(--accent);background:var(--accent);color:var(--on-accent);cursor:pointer;font-weight:500;text-decoration:none;display:inline-block;line-height:1.3}
.cpt-btn.sec{background:var(--bg-2);color:var(--fg);border-color:var(--line)}
.cpt-btn.dang{background:var(--bg-2);color:var(--bad);border-color:color-mix(in srgb,var(--bad) 45%,var(--line))}
.cpt-btn.sm{font-size:.8rem;padding:4px 9px}
.cpt-btn:disabled{opacity:.55;cursor:default}
.dash .tabs{display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--line);margin:14px 0 4px}
.dash .tabs a{padding:8px 12px;text-decoration:none;color:var(--fg-2);border-bottom:2px solid transparent;margin-bottom:-1px;font-weight:500}
.dash .tabs a.on{color:var(--accent-2);border-color:var(--accent)}
.dash .tabs .admref{margin:0 0 6px auto;align-self:center}
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
@media (max-width:760px){.cols2{grid-template-columns:minmax(0,1fr)}}
.cols2>div{min-width:0}
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
.pill.vu{background:var(--bg-3);color:var(--fg-2)}
.gridwrap{max-height:75vh;overflow:auto;border:1px solid var(--line);border-radius:8px}
table.grid{border-collapse:separate;border-spacing:0;margin:0;font-size:.82rem;width:auto}
table.grid th,table.grid td{padding:0;border:0;background:var(--bg-2)}
table.grid thead th{position:sticky;top:0;z-index:2;background:var(--bg-2);border-bottom:1px solid var(--line)}
table.grid th.nm{position:sticky;left:0;z-index:1;text-align:left;padding:2px 10px 2px 8px;white-space:nowrap;font-weight:500;border-right:1px solid var(--line)}
table.grid thead th.nm{z-index:3}
table.grid td.num,table.grid th.num{padding:2px 6px;font-size:.78rem;color:var(--fg-2)}
table.grid th.qh{min-width:22px;text-align:center;font-weight:500;font-size:.68rem;padding:4px 0}
table.grid th.qh a{text-decoration:none;color:var(--fg-2);display:block}
table.grid th.qh a:hover{color:var(--accent)}
table.grid td.c{width:22px;height:22px;min-width:22px;cursor:default;position:relative;box-shadow:inset 0 0 0 2px var(--bg-2);background:var(--bg-3)}
table.grid td.c[data-s]{cursor:pointer}
table.grid .gs{border-left:2px solid var(--line)}
table.grid tfoot td.pc{font-size:.62rem;color:var(--fg-2);text-align:center;padding:3px 0;border-top:1px solid var(--line)}
table.grid tfoot th{border-top:1px solid var(--line);font-size:.78rem}
td.c.ok,i.c.ok{background:var(--ok)!important}
td.c.mid,i.c.mid{background:var(--sun)!important}
td.c.bad,i.c.bad{background:var(--bad)!important}
td.c.vu,i.c.vu{background:repeating-linear-gradient(135deg,var(--fg-2) 0 2px,var(--bg-3) 2px 5px)!important}
td.c.multi::after,i.c.multi::after{content:"";position:absolute;right:4px;top:4px;width:5px;height:5px;border-radius:50%;background:#fff}
td.c.late::before,i.c.late::before{content:"";position:absolute;left:2px;bottom:2px;border-left:7px solid #111;border-top:7px solid transparent;opacity:.55}
td.c.sel{outline:2px solid var(--accent);outline-offset:-2px}
td.c:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.gridleg{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center}
.gridleg i.c{display:inline-block;width:16px;height:16px;border-radius:3px;background:var(--bg-3);vertical-align:-3px;margin-right:4px;position:relative}
.celld{border:1px solid var(--accent);border-radius:10px;padding:12px 14px;margin:14px 0;background:var(--bg-2)}
.celld .hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.celld .hd button{margin-left:auto}
table.att td{vertical-align:top;font-size:.9rem}
.opt{display:inline-block;font-family:var(--mono);font-weight:600;padding:0 6px;border-radius:4px}
.dash .g{color:var(--ok)} .dash .r{color:var(--bad)}
.opt.g{background:color-mix(in srgb,var(--ok) 15%,var(--bg-2))}
.opt.r{background:color-mix(in srgb,var(--bad) 13%,var(--bg-2))}
.ans.sm{font-size:.84rem;max-height:7.5em;overflow:auto;margin:2px 0}
.optbars{display:grid;gap:6px;margin:10px 0}
.ob{display:grid;grid-template-columns:3.2em minmax(0,2fr) minmax(80px,1fr) 2.5em;gap:10px;align-items:center;font-size:.9rem}
.ob .k{font-family:var(--mono);font-weight:600}
.ob.g .k{color:var(--ok)}
.ob .tx{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fg-2)}
.ob .n{text-align:right;font-variant-numeric:tabular-nums}
.bar.bad>i{background:var(--bad)}
details.qst{border:1px solid var(--line);border-radius:8px;padding:8px 12px;margin:8px 0;background:var(--bg-2)}
details.qst summary{cursor:pointer;font-weight:500}
.optl li.g{color:var(--ok)}
label.chk{flex-direction:row!important;align-items:center;gap:6px!important;font-size:.88rem!important;color:var(--fg)!important}
.stack{display:flex;height:8px;border-radius:99px;background:var(--bg-3);overflow:hidden;margin:3px 0}
.stack i{display:block;height:100%}
.stack i.ok{background:var(--ok)} .stack i.mid{background:var(--sun)}
table.series td{vertical-align:top}
.picker h3{font-size:1.05rem;margin:.8em 0 .3em}
.pklist{max-height:60vh;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:4px 8px;background:var(--bg-2)}
.pklist label.pk{display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--line);cursor:pointer;font-size:.9rem}
.pklist label.pk.in{padding-left:14px}
.pklist label.pk small{display:block;color:var(--fg-2);font-size:.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.pklist label.pk>span{min-width:0;flex:1}
.pklist .pkg{display:flex;justify-content:space-between;gap:8px;padding:8px 0 2px;font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2);font-weight:600}
.pklist .pkg .lk{text-transform:none;letter-spacing:0;font-weight:500}
.pklist .star{color:var(--sun)}
.sellist{padding-left:1.4em;margin:.3em 0}
.sellist li{padding:5px 0;border-bottom:1px solid var(--line)}
.sellist li{display:list-item}
.sellist .t{display:inline-block;max-width:calc(100% - 90px);vertical-align:top}
.sellist .t small{display:block;color:var(--fg-2);font-size:.8rem}
.sellist .b{float:right;display:flex;gap:6px}
.dash .lk{font:inherit;background:none;border:0;padding:0;color:var(--accent);cursor:pointer}
.dash .lk:disabled{color:var(--fg-3,#aaa);cursor:default}
.sprog{margin:12px 0 18px;max-width:520px}
.sprog .m{font-size:.9rem;color:var(--fg-2);margin-bottom:4px}
section.sq{margin:1.6em 0}
section.sq h2 small{font-family:var(--body);font-size:.8rem;color:var(--fg-2);font-weight:400;margin-left:8px}
.esx h2:first-child{margin-top:1.2em}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

/* ------------------------------------------------------------ écran de connexion et demande de code */
// Demande de code en cours dans ce navigateur : {ticket, prenom, nom, ts}. Le ticket seul permet de lire la réponse du professeur.
const RKEY = 'olymp-demande';
function reqGet(){ try { const r = JSON.parse(localStorage.getItem(RKEY) || 'null'); return r && r.ticket ? r : null; } catch(e){ return null; } }
function reqSet(o){ try { if (o) localStorage.setItem(RKEY, JSON.stringify(o)); else localStorage.removeItem(RKEY); } catch(e){} }
let pollT = null;
function gate(pane){
  let g = document.querySelector('.cpt-gate');
  if (!g){ g = document.createElement('div'); g.className = 'cpt-gate'; document.body.appendChild(g); }
  clearTimeout(pollT);
  pane = pane || (reqGet() ? 'attente' : 'code');
  const open = ME && ME.open, canReq = ME && ME.requests !== false;
  const skipBtn = label => open ? `<p style="margin:14px 0 0"><button type="button" class="cpt-btn sec" data-skip>${label || 'Continuer sans compte'}</button><br><small style="color:var(--fg-2)">Votre progression restera alors dans ce navigateur.</small></p>` : '';
  const head = '<p class="k">IPhO · Concours général</p>';
  const card = h => { g.innerHTML = `<div class="cpt-card" role="dialog" aria-labelledby="cptT">${head}${h}</div>`; const sk = g.querySelector('[data-skip]'); if (sk) sk.addEventListener('click', () => { try { sessionStorage.setItem('olymp-sans-compte', '1'); } catch(e){} clearTimeout(pollT); g.remove(); });
    g.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => gate(b.dataset.go))); };
  const enter = async () => {
    const loc = localAll();
    if (loc.length){ try { await API('importLocal', {attempts: loc}); localClear(); } catch(x){} }
    reqSet(null); location.reload();
  };

  if (pane === 'code'){
    const r = reqGet();
    card(`<h1 id="cptT">Physique des olympiades</h1>
      <p>Entrez le code personnel donné par votre professeur. Il garde votre progression d’un appareil à l’autre. Professeur : entrez votre mot de passe.</p>
      <form><input id="cptCode" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC-DEF" aria-label="Code personnel">
      <button class="cpt-btn" type="submit">Entrer</button><p class="err" aria-live="polite"></p></form>
      ${r ? `<p class="alt"><button type="button" class="lk" data-go="attente">Voir ma demande de code en attente</button></p>`
        : canReq ? `<p class="alt">Pas encore de code ? <button type="button" class="lk" data-go="demande">Demandez-en un</button> : votre professeur validera votre demande.</p>` : ''}
      ${skipBtn()}`);
    const inp = g.querySelector('input'), err = g.querySelector('.err'), btn = g.querySelector('button[type=submit]');
    setTimeout(() => inp.focus(), 50);
    g.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = ''; btn.disabled = true;
      try {
        const r = await API('login', {code: inp.value});
        if (r.role === 'admin'){ if (!location.hash.startsWith('#admin')) location.hash = '#admin'; location.reload(); return; }
        await enter();
      } catch(x){ err.textContent = x.userMessage || 'Connexion impossible.'; btn.disabled = false; inp.select(); }
    });
    return;
  }

  if (pane === 'demande'){
    card(`<h1 id="cptT">Demander un code</h1>
      <p>Indiquez votre nom tel que votre professeur le connaît. Dès qu’il aura validé la demande, votre code s’affichera <strong>sur cet appareil</strong> : revenez sur ce site avec le même navigateur.</p>
      <form novalidate>
        <label class="f">Prénom<input class="nm" name="prenom" autocomplete="given-name" maxlength="60" required></label>
        <label class="f">Nom<input class="nm" name="nom" autocomplete="family-name" maxlength="60" required></label>
        <fieldset><legend>Vous êtes en</legend><label><input type="radio" name="niveau" value="T"> Terminale</label><label><input type="radio" name="niveau" value="C"> CPGE (MPSI, PCSI…)</label></fieldset>
        <label class="f">Classe <small>(facultatif : PCSI 1, TG 3…)</small><input class="nm" name="groupe" maxlength="40" autocomplete="off"></label>
        <button class="cpt-btn" type="submit">Envoyer la demande</button><p class="err" aria-live="polite"></p>
      </form>
      <p class="alt"><button type="button" class="lk" data-go="code">J’ai déjà un code</button></p>${skipBtn()}`);
    const f = g.querySelector('form'), err = f.querySelector('.err'), btn = f.querySelector('button[type=submit]');
    setTimeout(() => f.prenom.focus(), 50);
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = '';
      const niv = f.querySelector('input[name=niveau]:checked');
      if (!f.prenom.value.trim() || !f.nom.value.trim()){ err.textContent = 'Indiquez votre prénom et votre nom.'; return; }
      if (!niv){ err.textContent = 'Indiquez si vous êtes en terminale ou en CPGE.'; return; }
      btn.disabled = true;
      try {
        const r = await API('requestCode', {prenom: f.prenom.value, nom: f.nom.value, niveau: niv.value, groupe: f.groupe.value});
        reqSet({ticket: r.ticket, prenom: r.prenom, nom: r.nom, ts: r.ts}); gate('attente');
      } catch(x){ err.textContent = x.userMessage || 'La demande n’a pas pu être envoyée.'; btn.disabled = false; }
    });
    return;
  }

  // pane 'attente' : état de la demande, vérifié toutes les 20 s tant que l'écran est ouvert
  const r = reqGet(); if (!r) return gate('code');
  const waitHTML = `<h1 id="cptT">Demande envoyée</h1>
    <p class="status wait">Demande de <strong>${E(r.prenom)} ${E(r.nom)}</strong>, envoyée ${E(ago(r.ts))} : en attente de validation par votre professeur.</p>
    <p>Votre code s’affichera ici dès qu’elle sera acceptée. Vous pouvez fermer cette page et revenir plus tard sur ce site, avec ce même navigateur.</p>
    <div class="row"><button type="button" class="cpt-btn" data-check>Vérifier maintenant</button><button type="button" class="cpt-btn dang" data-cancel>Annuler la demande</button></div>
    <p class="err" aria-live="polite"></p>
    <p class="alt"><button type="button" class="lk" data-go="code">J’ai déjà un code</button></p>${skipBtn('Continuer sans compte en attendant')}`;
  card(waitHTML);
  const check = async manual => {
    const err = g.querySelector('.err'); if (err) err.textContent = '';
    let st; try { st = await API('requestStatus', {ticket: r.ticket, login: true}); }
    catch(x){ if (manual && err) err.textContent = x.userMessage || 'Le serveur ne répond pas.'; if (g.isConnected) pollT = setTimeout(check, 20000); return; }
    if (st.status === 'approved'){
      card(`<h1 id="cptT">Bienvenue, ${E(st.prenom)} !</h1>
        <p>Votre professeur a validé votre demande. Voici votre <strong>code personnel</strong> :</p>
        <div class="bigcode">${E(fmtCode(st.code))}</div>
        <p>Notez-le : il vous servira à vous connecter depuis un autre appareil (téléphone, ordinateur du lycée). Vous le retrouverez aussi sous votre nom, dans le menu.</p>
        <button type="button" class="cpt-btn" data-enter>Entrer sur le site</button>`);
      g.querySelector('[data-enter]').addEventListener('click', e => { e.currentTarget.disabled = true; enter(); });
      return;
    }
    if (st.status === 'rejected'){
      reqSet(null);
      card(`<h1 id="cptT">Demande non acceptée</h1><p class="status">Votre professeur n’a pas validé la demande au nom de <strong>${E(st.prenom)} ${E(st.nom)}</strong>. S’il s’agit d’une erreur (nom mal orthographié, par exemple), parlez-lui-en ou faites une nouvelle demande.</p>
        <div class="row"><button type="button" class="cpt-btn" data-go="demande">Nouvelle demande</button><button type="button" class="cpt-btn sec" data-go="code">J’ai un code</button></div>${skipBtn()}`);
      return;
    }
    if (st.status !== 'pending'){
      reqSet(null);
      card(`<h1 id="cptT">Demande introuvable</h1><p class="status">Cette demande n’existe plus (annulée, trop ancienne ou compte supprimé). Faites une nouvelle demande ou entrez votre code.</p>
        <div class="row"><button type="button" class="cpt-btn" data-go="demande">Nouvelle demande</button><button type="button" class="cpt-btn sec" data-go="code">J’ai un code</button></div>${skipBtn()}`);
      return;
    }
    if (manual && err) err.textContent = 'Pas encore validée.';
    if (g.isConnected) pollT = setTimeout(() => { if (g.isConnected && g.querySelector('[data-check]')) check(); }, 20000);
  };
  g.querySelector('[data-check]').addEventListener('click', () => check(true));
  g.querySelector('[data-cancel]').addEventListener('click', async e => {
    const b = e.currentTarget;
    if (!b.dataset.armed){ b.dataset.armed = '1'; b.textContent = 'Confirmer l’annulation'; return; }
    b.disabled = true; try { await API('cancelRequest', {ticket: r.ticket}); } catch(x){} reqSet(null); gate('code');
  });
  check();
}
async function logout(){ try { await API('logout', {}); } catch(e){} location.hash = '#accueil'; location.reload(); }

function accountBox(){
  const rail = document.getElementById('rail'); if (!rail || rail.querySelector('.cpt-box')) return;
  const b = document.createElement('div'); b.className = 'cpt-box';
  if (ME.role === 'eleve'){
    b.innerHTML = `<div class="who">${E(ME.me.prenom)} ${E(ME.me.nom)}<small>${ME.me.groupe ? E(ME.me.groupe) + ' · ' : ''}${ME.me.niveau === 'C' ? 'CPGE' : 'Terminale'}${ME.me.code ? ' · code <span class="code">' + E(fmtCode(ME.me.code)) + '</span>' : ''}</small></div>
      <a href="#suivi" data-page="suivi">Mon tableau de bord</a>${SERIES.length ? `<a href="#serie" data-page="serie">Mes séries d’exercices${seriesTodo() ? `<span class="badge" title="Séries pas encore terminées">${seriesTodo()}</span>` : ''}</a>` : ''}<button type="button" class="lk" data-out>Se déconnecter</button>`;
  } else if (ME.role === 'admin'){
    b.innerHTML = `<div class="who">Espace professeur</div><a href="#admin" data-page="admin">Tableau de bord de la classe</a>
      <a href="#admin/eleves">Élèves et codes${ME.pending ? `<span class="badge" title="Demandes de code en attente">${ME.pending}</span>` : ''}</a><button type="button" class="lk" data-out>Se déconnecter</button>`;
  } else {
    const pend = reqGet();
    b.innerHTML = `<div class="who">Visiteur<small>Progression gardée dans ce navigateur.</small></div><a href="#suivi" data-page="suivi">Mon tableau de bord</a><button type="button" class="lk" data-in>${pend ? 'Ma demande de code (en attente)' : 'Se connecter avec un code'}</button>${!pend && ME.requests !== false ? '<button type="button" class="lk" data-req>Demander un code</button>' : ''}`;
  }
  const lvl = rail.querySelector('.level'); (lvl || rail.querySelector('.brand')).after(b);
  b.addEventListener('click', e => { if (e.target.closest('[data-out]')) logout(); if (e.target.closest('[data-in]')) gate(); if (e.target.closest('[data-req]')) gate('demande'); });
}

ready.then(async () => {
  if (ME.offline) return;
  if (ME.role){ if (ME.role === 'eleve') reqSet(null); accountBox(); }
  else {
    let skipped = false; try { skipped = sessionStorage.getItem('olymp-sans-compte') === '1'; } catch(e){}
    // une demande de code acceptée depuis la dernière visite : on affiche le code, même si le visiteur avait continué sans compte
    const r = reqGet();
    if (r && skipped){ try { const st = await API('requestStatus', {ticket: r.ticket}); if (st.status !== 'pending') skipped = false; } catch(e){} }
    if (ME.open){ accountBox(); if (!skipped) gate(); } else gate();
  }
  // un élève inscrit en CPGE n'a accès qu'au contenu CPGE (sélecteur verrouillé, pas de Concours général) ;
  // un élève de terminale, le professeur et les visiteurs gardent les deux niveaux
  if (window.lockLevel) window.lockLevel(ME.role === 'eleve' && ME.me.niveau === 'C' ? 'C' : null);
  const h = mode(); if (h === 'suivi' || h === 'admin') route();
  // questions affichées avant la lecture du suivi
  document.querySelectorAll('#view .q[data-id]').forEach(d => HOOKS.decorate({id: d.dataset.id}, d));
});

/* ------------------------------------------------------------ calculs communs */
const inLevel = (it, lv) => lv === 'C' ? !String(it.group || it.id || '').startsWith('cg-') : (it.level || ['T', 'C']).includes('T');
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
// libellé complet : pour une question d'un problème, titre du problème et numéro de la question
function qFull(q){ if (!q) return 'Question supprimée'; const g = q.group && DATA.gById[q.group]; if (!g) return qLabel(q); const n = q.num ? String(q.num).replace(/[.)]\s*$/, '') : (DATA.byGroup[q.group] || []).indexOf(q) + 1; return g.title + ' · question ' + n; }
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
    return `<div class="cl"><div class="h"><span class="pill ${c.verdict === 'aide' ? '' : scoreCls(s)}">${c.verdict === 'aide' ? 'piste' : c.verdict === 'partiel' ? 'en partie' : c.verdict === 'juste' ? 'juste' : 'à revoir'}</span><a href="#question/${encodeURIComponent(c.qid)}">${E(qLabel(q))}</a><span>${E(ago(c.ts))}</span></div>${c.answer ? `<div class="ans">${E(c.answer)}</div>` : ''}<div class="cm">${E(c.comment)}</div></div>`; }).join('');
  h += '</div></div>';
  root.innerHTML = h; typeset(root);
}

async function showSuivi(){
  view.className = 'page wide dash'; view.dataset.page = '';
  view.innerHTML = '<p class="loading">Chargement…</p>';
  await ready;
  if (isVisitor()){
    const loc = localAll();
    view.innerHTML = `<p class="eyebrow">Mon suivi</p><h1>Mon tableau de bord</h1>
      <p class="muted">Sans compte, votre progression est enregistrée dans ce navigateur seulement (elle disparaît si vous effacez les données du site, et ne suit pas sur un autre appareil).${ME && !ME.offline ? ' Avec un code donné par votre professeur, elle est versée dans votre compte.' : ''}</p>
      ${ME && !ME.offline ? '<p><button class="cpt-btn" type="button" id="cptIn">Se connecter avec un code</button></p>' : ''}<div id="sd"></div>`;
    const b = document.getElementById('cptIn'); if (b) b.addEventListener('click', gate);
    await renderStudentDash(view.querySelector('#sd'), loc, [], LEVEL);
    window.scrollTo(0, 0); return;
  }
  if (ME.role !== 'eleve'){
    view.innerHTML = ME && ME.role === 'admin' ? '<h1>Tableau de bord</h1><p>Vous êtes connecté comme professeur : votre tableau de bord est <a href="#admin">celui de la classe</a>.</p>'
      : '<h1>Mon tableau de bord</h1><p>Connectez-vous avec votre code pour suivre votre progression.</p><p><button class="cpt-btn" type="button" id="cptIn">Se connecter</button></p>';
    const b = document.getElementById('cptIn'); if (b) b.addEventListener('click', gate); return;
  }
  const m = await API('mine').catch(() => ({attempts: [], claude: []}));
  m.attempts.forEach(a => { if (!LAST[a.qid] || LAST[a.qid].ts <= a.ts) LAST[a.qid] = a; }); if (m.series) SERIES = m.series;
  view.innerHTML = `<p class="eyebrow">Mon suivi</p><h1>Bonjour ${E(ME.me.prenom)}</h1>
    <p class="muted">${ME.claude && ME.claude.enabled ? `Corrections par Claude : ${Math.max(0, ME.claude.quota - ME.claude.used)} restantes sur ${ME.claude.quota} par 24 h.` : ''}</p>${seriesBlock()}<div id="sd"></div>`;
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
  const tab = sub.startsWith('eleve-') ? 'eleves' : sub.startsWith('suivi') || sub.startsWith('q-') ? 'suivi' : sub.startsWith('serie') ? 'series' : sub || 'classe';
  view.innerHTML = `<p class="eyebrow">Espace professeur</p><h1>Tableau de bord</h1>
    <nav class="tabs" aria-label="Rubriques"><a href="#admin" class="${tab === 'classe' ? 'on' : ''}">La classe</a><a href="#admin/suivi" class="${tab === 'suivi' ? 'on' : ''}">Suivi détaillé</a><a href="#admin/series" class="${tab === 'series' ? 'on' : ''}">Séries d’exercices</a><a href="#admin/eleves" class="${tab === 'eleves' ? 'on' : ''}">Élèves et codes${ME.pending ? `<span class="badge">${ME.pending}</span>` : ''}</a><a href="#admin/reglages" class="${tab === 'reglages' ? 'on' : ''}">Réglages</a><button type="button" class="cpt-btn sec sm admref" title="Recharger les dernières réponses">Actualiser</button></nav><div id="adm"><p class="loading">Chargement…</p></div>`;
  const root = view.querySelector('#adm');
  view.querySelector('.admref').addEventListener('click', () => showAdmin(sub));
  try { OV = await API('overview'); } catch(e){ root.innerHTML = `<p class="note-bad">${E(e.userMessage || 'Le serveur ne répond pas.')}</p>`; return; }
  syncPending();
  await loadData(); await loadProg();
  if (sub.startsWith('eleve-')) return adminStudent(root, sub.slice(6));
  if (sub.startsWith('q-')) return adminQuestion(root, sub.slice(2));
  if (sub === 'suivi' || sub.startsWith('suivi-')) return adminSuivi(root, sub.slice(6));
  if (sub === 'series') return adminSeries(root);
  if (sub === 'serie-new') return adminSerieEdit(root, null);
  if (sub.startsWith('serie-edit-')) return adminSerieEdit(root, sub.slice(11));
  if (sub.startsWith('serie-')) return adminSerie(root, sub.slice(6));
  if (tab === 'eleves') return adminStudents(root);
  if (tab === 'reglages') return adminSettings(root);
  return adminClass(root);
}
// nombre de demandes en attente : pastilles du menu et des onglets
function syncPending(){
  ME.pending = (OV.requests || []).filter(r => r.status === 'pending').length;
  document.querySelectorAll('.cpt-box a[href="#admin/eleves"], .dash .tabs a[href="#admin/eleves"]').forEach(a => {
    let b = a.querySelector('.badge');
    if (!ME.pending){ if (b) b.remove(); return; }
    if (!b){ b = document.createElement('span'); b.className = 'badge'; a.appendChild(b); } b.textContent = ME.pending;
  });
}
const nameOf = sid => { const s = OV.students.find(x => x.id === sid); return s ? (s.prenom + ' ' + s.nom).trim() : 'Élève supprimé'; };

function adminClass(root){
  const now = Date.now(), week = now - 7 * DAYMS;
  const S = OV.students, P = OV.perq;
  const active7 = new Set(P.filter(p => p.ts > week).map(p => p.sid)).size;
  const days = OV.days, n7 = days.filter(d => d.day * DAYMS > week).reduce((s, d) => s + d.n, 0);
  const PR = P.filter(p => p.how !== 'vu'), meanAll = PR.length ? PR.reduce((s, p) => s + p.score, 0) / PR.length : 0;
  const cl24 = OV.claude.filter(c => c.ts > now - DAYMS).length, cl7 = OV.claude.filter(c => c.ts > week).length;
  let h = `<div class="kpis">
    <div class="kpi"><div class="v">${S.length}</div><div class="l">Élèves</div><div class="s">${active7} actif${active7 > 1 ? 's' : ''} cette semaine</div></div>
    <div class="kpi"><div class="v">${n7}</div><div class="l">Réponses sur 7 jours</div><div class="s">${P.length} questions traitées en tout</div></div>
    <div class="kpi"><div class="v">${PR.length ? pct(meanAll) : '–'}</div><div class="l">Réussite moyenne</div><div class="s">dernière réponse par élève et question${P.length > PR.length ? ` ; ${P.length - PR.length} corrigé${P.length - PR.length > 1 ? 's' : ''} lu${P.length - PR.length > 1 ? 's' : ''} sans essayer` : ''}</div></div>
    <div class="kpi"><div class="v">${cl7}</div><div class="l">Corrections Claude, 7 j</div><div class="s">${cl24} sur les dernières 24 h</div></div>
  </div>`;
  if (ME.pending) h += `<p class="newcodes"><b>${ME.pending} demande${ME.pending > 1 ? 's' : ''} de code en attente</b> : <a href="#admin/eleves">les valider ou les refuser</a>.</p>`;
  if (!S.length) h += `<p class="newcodes">Commencez par <a href="#admin/eleves">créer les comptes des élèves</a> ou laissez-les demander un code depuis la page d’accueil : chacun reçoit un code personnel à six caractères.</p>`;
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
    const rows = P.filter(p => p.chap === c), who = new Set(rows.map(p => p.sid)), rr = rows.filter(p => p.how !== 'vu');
    const m = rr.length ? rr.reduce((s, p) => s + p.score, 0) / rr.length : null;
    h += `<tr><td><a href="#admin/suivi-${c}" title="Suivi détaillé, question par question">${E(CHAPTERS[c].title)}</a></td><td class="num">${who.size} / ${S.length}</td><td class="num">${who.size ? (rows.length / who.size).toFixed(1).replace('.', ',') : '–'}</td><td>${m === null ? '–' : `<div style="display:flex;gap:8px;align-items:center"><div class="bar ok" style="flex:1"><i style="width:${100 * m}%"></i></div><span style="min-width:3.2em;text-align:right">${pct(m)}</span></div>`}</td></tr>`;
  }
  h += '</tbody></table></div><p class="muted" style="font-size:.86rem">Cliquez sur un chapitre pour le suivi détaillé, élève par élève et question par question.</p>';
  h += '<h2>Maîtrise des méthodes</h2><p class="muted" style="font-size:.9rem">Réussite des questions rattachées à chaque fiche méthode (dernière réponse de chaque élève), des moins bien réussies aux mieux réussies.</p>' + methodsHTML(methodRows(P), {students: true, min: 2});
  // questions difficiles
  const byQ = {}; PR.forEach(p => (byQ[p.qid] = byQ[p.qid] || []).push(p.score));
  const hard = Object.entries(byQ).filter(([, v]) => v.length >= Math.min(3, Math.max(1, S.length))).map(([qid, v]) => ({qid, n: v.length, m: v.reduce((a, b) => a + b, 0) / v.length}))
    .filter(x => x.m < 0.75).sort((a, b) => a.m - b.m || b.n - a.n).slice(0, 12);
  h += `<div class="cols2"><div><h2>Questions les plus ratées</h2>`;
  h += hard.length ? '<ul class="qlist">' + hard.map(x => { const q = DATA.qById[x.qid]; return `<li><span class="pill ${scoreCls(x.m >= .5 ? .5 : 0)}">${pct(x.m)}</span><div><a href="#admin/q-${encodeURIComponent(x.qid)}">${E(qFull(q))}</a><span class="sn">${E(q && CHAPTERS[q.chap] ? CHAPTERS[q.chap].title : '')} · ${x.n} élève${x.n > 1 ? 's' : ''}</span></div></li>`; }).join('') + '</ul>'
    : '<p class="muted">Pas encore assez de réponses (il faut au moins trois élèves sur une même question).</p>';
  h += `</div><div><h2>Dernières réponses</h2>`;
  h += OV.recent.length ? '<ul class="qlist">' + OV.recent.slice(0, 15).map(a => { const q = DATA.qById[a.qid]; return `<li>${pillHTML(a)}<div><a href="#admin/eleve-${E(a.sid)}">${E(nameOf(a.sid))}</a> · <a href="#admin/q-${encodeURIComponent(a.qid)}">${E(qFull(q))}</a><span class="sn">${E(ago(a.ts))}${a.hints ? ' · ' + a.hints + ' indice' + (a.hints > 1 ? 's' : '') : ''}</span></div></li>`; }).join('') + '</ul>'
    : '<p class="muted">Aucune réponse enregistrée pour l’instant.</p>';
  h += '</div></div>';
  root.innerHTML = h; bindMore(root);
}

const nkey = (p, n) => (String(p) + ' ' + String(n)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
function requestsHTML(groups){
  const R = OV.requests || [], P = R.filter(r => r.status === 'pending'), D = R.filter(r => r.status !== 'pending');
  const byKey = {}; OV.students.forEach(s => (byKey[nkey(s.prenom, s.nom)] = byKey[nkey(s.prenom, s.nom)] || []).push(s));
  const cnt = {}; P.forEach(r => { const k = nkey(r.prenom, r.nom); cnt[k] = (cnt[k] || 0) + 1; });
  let h = '';
  if (P.length){
    h += `<h2>Demandes de code en attente (${P.length})</h2>
      <p class="muted" style="font-size:.9rem">Des élèves ont demandé un code depuis l’écran d’accueil. Vérifiez le nom, corrigez la classe ou le niveau si besoin, puis validez : le compte est créé et l’élève voit son code s’afficher sur l’appareil d’où il a fait la demande. Si un élève de ce nom a déjà un compte (code perdu, autre appareil), vous pouvez lui redonner son code.</p>
      <div class="scroll"><table class="reqs"><thead><tr><th>Élève</th><th>Classe</th><th>Niveau</th><th></th></tr></thead><tbody>`;
    h += P.map(r => {
      const k = nkey(r.prenom, r.nom), same = byKey[k] || [];
      const flags = same.map(s => `<span class="flag">Déjà inscrit${s.groupe ? ' (' + E(s.groupe) + ')' : ''} · <button type="button" class="cpt-btn sec sm" data-link="${E(s.id)}">Lui redonner son code</button></span>`).join('')
        + (cnt[k] > 1 ? '<span class="flag">Demande en double : refusez l’une des deux.</span>' : '');
      return `<tr data-rid="${E(r.id)}"><td><b>${E(r.nom)} ${E(r.prenom)}</b><small>${E(ago(r.ts))}</small>${flags}</td>
        <td><input type="text" class="rg" value="${E(r.groupe)}" list="adGl" aria-label="Classe"></td>
        <td><select class="rn" aria-label="Niveau"><option value="T"${r.niveau !== 'C' ? ' selected' : ''}>Terminale</option><option value="C"${r.niveau === 'C' ? ' selected' : ''}>CPGE</option></select></td>
        <td><div class="acts"><button type="button" class="cpt-btn sm" data-ok>Valider</button><button type="button" class="cpt-btn dang sm" data-no>Refuser</button></div></td></tr>`;
    }).join('');
    h += `</tbody></table></div>${P.length > 1 ? '<p><button type="button" class="cpt-btn sec" id="rqAll">Valider toutes les demandes</button></p>' : ''}<div id="rqOut"></div>`;
  }
  if (D.length){
    h += `<details style="margin:10px 0 0"><summary>Demandes traitées depuis 30 jours (${D.length})</summary><ul class="qlist">` + D.map(r => {
      const st = r.sid && OV.students.find(s => s.id === r.sid);
      return `<li><span class="pill ${r.status === 'approved' ? 'ok' : 'bad'}">${r.status === 'approved' ? 'validée' : 'refusée'}</span><div>${st ? `<a href="#admin/eleve-${E(st.id)}">${E(r.nom)} ${E(r.prenom)}</a>` : `${E(r.nom)} ${E(r.prenom)}`}<span class="sn">demandée ${E(ago(r.ts))} · traitée ${E(ago(r.decided))}${st ? ' · code <span class="code">' + E(fmtCode(st.code)) + '</span>' : ''}</span></div></li>`;
    }).join('') + '</ul></details>';
  }
  return h;
}
function bindRequests(root){
  const out = () => root.querySelector('#rqOut');
  const item = tr => ({id: tr.dataset.rid, groupe: tr.querySelector('.rg').value, niveau: tr.querySelector('.rn').value});
  const after = async (r, verb) => {
    OV = await API('overview'); syncPending(); adminStudents(root);
    const made = r.done.filter(d => d.code);
    const o = root.querySelector('#adOut');
    if (o && r.done.length) o.innerHTML = `<div class="newcodes"><b>${r.done.length} demande${r.done.length > 1 ? 's' : ''} ${verb}</b>${made.length ? `<table>${made.map(d => `<tr><td>${E(d.prenom)} ${E(d.nom)}</td><td class="code">${E(fmtCode(d.code))}</td></tr>`).join('')}</table><small class="muted">Chaque élève voit son code s’afficher sur l’appareil d’où il a fait la demande.</small>` : ''}</div>`;
    if (o) o.scrollIntoView({block: 'nearest'});
  };
  const t = root.querySelector('table.reqs'); if (!t) return;
  t.addEventListener('click', async e => {
    const tr = e.target.closest('tr[data-rid]'); if (!tr) return;
    const b = e.target.closest('button'); if (!b) return;
    let body;
    if (b.matches('[data-ok]')) body = {decision: 'approve', items: [item(tr)]};
    else if (b.matches('[data-no]')){
      if (!b.dataset.armed){ b.dataset.armed = '1'; b.textContent = 'Confirmer le refus'; setTimeout(() => { if (b.isConnected){ delete b.dataset.armed; b.textContent = 'Refuser'; } }, 5000); return; }
      body = {decision: 'reject', items: [{id: tr.dataset.rid}]};
    }
    else if (b.dataset.link) body = {decision: 'link', sid: b.dataset.link, items: [{id: tr.dataset.rid}]};
    else return;
    tr.querySelectorAll('button').forEach(x => x.disabled = true);
    try { const r = await API('decideRequest', body); await after(r, body.decision === 'reject' ? 'refusée' + (r.done.length > 1 ? 's' : '') : 'validée' + (r.done.length > 1 ? 's' : '')); }
    catch(x){ const o = out(); if (o) o.innerHTML = `<p class="note-bad">${E(x.userMessage || 'Échec.')}</p>`; tr.querySelectorAll('button').forEach(x => x.disabled = false); }
  });
  const all = root.querySelector('#rqAll');
  if (all) all.addEventListener('click', async () => {
    if (!all.dataset.armed){ all.dataset.armed = '1'; all.textContent = 'Confirmer : créer tous ces comptes'; return; }
    all.disabled = true;
    try { const r = await API('decideRequest', {decision: 'approve', items: [...t.querySelectorAll('tr[data-rid]')].map(item)}); await after(r, 'validées'); }
    catch(x){ const o = out(); if (o) o.innerHTML = `<p class="note-bad">${E(x.userMessage || 'Échec.')}</p>`; all.disabled = false; }
  });
}

function adminStudents(root){
  const S = OV.students;
  const groups = [...new Set(S.map(s => s.groupe).filter(Boolean))].sort();
  let h = requestsHTML(groups) + `<div class="cols2"><div><h2>Ajouter des élèves</h2>
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
  bindRequests(root);
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
  const x = document.createElement('div'); x.className = 'esx'; x.innerHTML = studentExtraHTML(d);
  root.querySelector('#esD').before(x); bindJournal(x, d.attempts); bindMore(x);
}

function adminSettings(root){
  const st = OV.settings, cf = OV.config;
  root.innerHTML = `<h2>Correction par Claude</h2>
    <p class="${cf.hasKey ? 'note-ok' : 'note-bad'}">${cf.hasKey ? `Clé API présente · modèle <span class="code">${E(cf.model)}</span>.` : 'Aucune clé API : ajoutez la variable ANTHROPIC_API_KEY dans les réglages du projet Vercel, puis redéployez.'}</p>
    <label class="switch"><input type="checkbox" id="stC"${st.claude ? ' checked' : ''}><div><b>Proposer la correction par Claude aux élèves</b><span>Bouton « Faire corriger par Claude » sous les questions à rédiger.</span></div></label>
    <div class="form-row"><label>Corrections par élève et par 24 h<input type="number" id="stQ" min="0" max="200" value="${st.quota}" style="width:8em"></label></div>
    <h2>Accès au site</h2>
    <label class="switch"><input type="checkbox" id="stO"${st.open ? ' checked' : ''}><div><b>Accès sans code</b><span>Un visiteur peut lire le cours et faire les exercices sans compte : sa progression est gardée dans son navigateur et versée dans son compte s’il se connecte plus tard ; pas de correction par Claude sans code. Sinon, le code est demandé à l’entrée.</span></div></label>
    <label class="switch"><input type="checkbox" id="stR"${st.requests !== false ? ' checked' : ''}><div><b>Demandes de code par les élèves</b><span>Sur l’écran de connexion, un élève sans code peut en demander un en donnant son prénom, son nom, son niveau et sa classe. Vous validez chaque demande dans « Élèves et codes » ; le code s’affiche alors sur l’appareil de l’élève.</span></div></label>
    <p class="form-row"><button class="cpt-btn" type="button" id="stB">Enregistrer les réglages</button><span id="stOut"></span></p>`;
  root.querySelector('#stB').addEventListener('click', async () => {
    const o = root.querySelector('#stOut');
    try { const r = await API('saveSettings', {claude: root.querySelector('#stC').checked, quota: root.querySelector('#stQ').value, open: root.querySelector('#stO').checked, requests: root.querySelector('#stR').checked}); OV.settings = r.settings; o.className = 'note-ok'; o.textContent = 'Réglages enregistrés.'; }
    catch(e){ o.className = 'note-bad'; o.textContent = e.userMessage || 'Échec.'; }
  });
}

/* ------------------------------------------------------------ suivi détaillé : outils communs */
const stOf = a => !a ? '' : a.how === 'vu' ? 'vu' : a.score >= 1 ? 'ok' : a.score > 0 ? 'mid' : 'bad';
const ST_LABEL = {ok: 'juste', mid: 'en partie', bad: 'faux', vu: 'corrigé lu sans essayer', '': 'pas faite'};
const HOW_LABEL = {auto: 'vérifiée par le site', soi: 'auto-évaluée', claude: 'corrigée par Claude', vu: ''};
const PAGE_LABEL = {qcm: 'banque de questions', question: 'page de la question', serie: 'série d’exercices', suivi: 'tableau de bord', recherche: 'recherche', accueil: 'accueil'};
const pageName = m => (CHAPTERS[m] && CHAPTERS[m].title) || PAGE_LABEL[m] || m || '';
function fmtDur(s){ if (s === null || s === undefined || s === '') return '–'; s = +s; if (s < 60) return Math.round(s) + ' s'; const m = Math.round(s / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); }
const fmtDate = ts => new Date(ts).toLocaleString('fr-FR', {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
const median = v => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const sup = e => String(e).split('').map(c => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]).join('');
const sget = k => { try { return sessionStorage.getItem(k); } catch(e){ return null; } };
const sset = (k, v) => { try { sessionStorage.setItem(k, v); } catch(e){} };
// écart d'une valeur numérique à la bonne réponse : facteur 2, puissance de 10 (unité ?), signe…
function ratioHint(r){
  if (!isFinite(r)) return '';
  if (r === 0) return 'zéro';
  const sg = r < 0 ? 'signe opposé' : '', ar = Math.abs(r);
  if (Math.abs(ar - 1) < 0.03) return sg;
  const F = [[1, ''], [2, '×2'], [0.5, '÷2'], [4, '×4'], [0.25, '÷4'], [3, '×3'], [1 / 3, '÷3'], [Math.SQRT2, '×√2'], [Math.SQRT1_2, '÷√2'], [Math.PI, '×π'], [1 / Math.PI, '÷π'], [2 * Math.PI, '×2π'], [1 / (2 * Math.PI), '÷2π']];
  for (let e = 0; Math.abs(e) <= 9; e = e > 0 ? -e : 1 - e) for (const [f, l] of F){
    if (Math.abs(ar / (f * 10 ** e) - 1) < 0.03) return [sg, [l, e ? '×10' + sup(e) : ''].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  }
  return [sg, '×' + ar.toPrecision(2).replace('.', ',')].filter(Boolean).join(', ');
}
function answerHTML(q, a){
  const v = a && a.answer;
  if (!v) return '<span class="muted">—</span>';
  if (q && q.type === 'qcm'){ const ok = new Set(q.correct || []); return v.split(',').map(k => `<span class="opt ${ok.has(k) ? 'g' : 'r'}">${E(k)}</span>`).join(' '); }
  if (q && q.type === 'num' && q.answer){
    const x = parseNum(v), r = q.answer.value ? x / q.answer.value : NaN, good = isFinite(r) && Math.abs(r - 1) <= (q.answer.tol || 0.05), hint = isFinite(r) && !good ? ratioHint(r) : '';
    return `<span class="${good ? 'g' : 'r'}">${E(v)}${q.answer.unit ? ' ' + E(q.answer.unit) : ''}</span>${hint ? ` <small class="muted">(${E(hint)})</small>` : ''}`;
  }
  return `<div class="ans">${E(v)}</div>`;
}
const pillHTML = a => `<span class="pill ${stOf(a)}">${E(ST_LABEL[stOf(a)])}</span>`;
function claudeHTML(c){
  const s = c.verdict === 'juste' ? 1 : c.verdict === 'partiel' ? .5 : 0;
  return `<div class="cl"><div class="h"><span class="pill ${c.verdict === 'aide' ? '' : scoreCls(s)}">${c.verdict === 'aide' ? 'piste demandée' : 'Claude : ' + (c.verdict === 'partiel' ? 'en partie' : c.verdict === 'juste' ? 'juste' : 'à revoir')}</span>${c.sid ? `<b>${E(nameOf(c.sid))}</b>` : ''}<span>${E(fmtDate(c.ts))}</span></div>${c.answer ? `<div class="ans">${E(c.answer)}</div>` : ''}<div>${E(c.comment || '')}</div></div>`;
}
function attemptsHTML(q, list){
  return `<div class="scroll"><table class="att"><thead><tr><th>Date</th><th>Résultat</th><th>Réponse donnée</th><th class="num">Indices</th><th class="num">Temps</th><th>Où</th></tr></thead><tbody>` +
    list.map(a => `<tr><td>${E(fmtDate(a.ts))}</td><td>${pillHTML(a)}${HOW_LABEL[a.how] ? `<small class="muted"> ${E(HOW_LABEL[a.how])}</small>` : ''}</td><td>${answerHTML(q, a)}</td><td class="num">${a.hints || 0}</td><td class="num">${fmtDur(a.dur)}</td><td><small>${E(pageName(a.mode))}</small></td></tr>`).join('') +
    '</tbody></table></div>';
}
const byPair = attempts => { const m = {}; attempts.forEach(a => (m[a.sid + '|' + a.qid] = m[a.sid + '|' + a.qid] || []).push(a)); Object.values(m).forEach(L => L.sort((x, y) => x.ts - y.ts)); return m; };
// une question pour un élève, résumée à partir de toutes ses réponses (dans l'ordre)
function summary(L){
  if (!L || !L.length) return null;
  const real = L.filter(a => a.how !== 'vu');
  return {L, last: L[L.length - 1], real, lastReal: real[real.length - 1] || null, firstOk: L[0].how !== 'vu' && L[0].score >= 1, seen: L.some(a => a.how === 'vu')};
}
const LEGEND = `<p class="legend gridleg"><i class="c ok"></i>juste <i class="c mid"></i>en partie <i class="c bad"></i>faux <i class="c vu"></i>corrigé lu sans essayer <i class="c"></i>pas faite <i class="c ok multi"></i>plusieurs réponses (la case montre la dernière) <i class="c ok late"></i>faite après l’échéance</p>`;

// tableau élèves × questions ; byKey : réponses groupées par « élève|question »
function gridHTML(students, qs, byKey, opts = {}){
  let h = '<div class="scroll gridwrap"><table class="grid"><thead><tr><th class="nm">Élève</th><th class="num" title="Questions auxquelles l’élève a répondu">Faites</th><th class="num" title="Questions réussies dès la première réponse, parmi celles abordées">1<sup>er</sup> coup</th>';
  let pg = null;
  const sepOf = (q, i) => { const s = i > 0 && (q.group || q.id) !== pg ? ' gs' : ''; pg = q.group || q.id; return s; };
  qs.forEach((q, i) => { h += `<th class="qh${sepOf(q, i)}"><a href="#admin/q-${encodeURIComponent(q.id)}" title="${E(qFull(q) + ' — ' + qSnippet(q))}">${opts.num ? opts.num(q, i) : i + 1}</a></th>`; });
  h += '</tr></thead><tbody>';
  const col = qs.map(() => ({n: 0, ok: 0}));
  for (const s of students){
    let done = 0, met = 0, first = 0, row = ''; pg = null;
    qs.forEach((q, i) => {
      const sep = sepOf(q, i), S = summary(byKey[s.id + '|' + q.id]);
      if (!S){ row += `<td class="c${sep}"></td>`; return; }
      met++; if (S.firstOk) first++; if (S.real.length) done++;
      if (S.lastReal){ col[i].n++; if (S.lastReal.score >= 1) col[i].ok++; }
      const st = stOf(S.last), late = opts.due && S.real.length && S.real[0].ts > opts.due;
      const tip = `${s.prenom} ${s.nom} · ${qFull(q)} : ${ST_LABEL[st]}${S.L.length > 1 ? ` (${S.L.length} réponses)` : ''}${S.last.hints ? ` · ${S.last.hints} indice${S.last.hints > 1 ? 's' : ''}` : ''}${S.last.dur ? ' · ' + fmtDur(S.last.dur) : ''} · ${fmtDate(S.last.ts)}${late ? ' · après l’échéance' : ''}`;
      row += `<td class="c ${st}${sep}${S.L.length > 1 ? ' multi' : ''}${late ? ' late' : ''}" data-s="${E(s.id)}" data-q="${E(q.id)}" title="${E(tip)}" tabindex="0" role="button"></td>`;
    });
    h += `<tr><th class="nm"><a href="#admin/eleve-${E(s.id)}">${E(s.nom)} ${E(s.prenom)}</a></th><td class="num">${done}</td><td class="num">${met ? pct(first / met) : '–'}</td>${row}</tr>`;
  }
  pg = null;
  h += `</tbody><tfoot><tr><th class="nm" title="Part des élèves dont la dernière réponse est juste">Réussite (%)</th><td></td><td></td>${qs.map((q, i) => `<td class="pc${sepOf(q, i)}" title="${col[i].n ? `${col[i].ok} juste${col[i].ok > 1 ? 's' : ''} sur ${col[i].n} élève${col[i].n > 1 ? 's' : ''}` : 'Aucune réponse'}">${col[i].n ? Math.round(100 * col[i].ok / col[i].n) : ''}</td>`).join('')}</tr></tfoot></table></div>`;
  return h;
}
// clic sur une case : toutes les réponses de l'élève à cette question
function bindGrid(box, panel){
  const open = async td => {
    if (!td || !td.dataset.s) return;
    box.querySelectorAll('td.sel').forEach(x => x.classList.remove('sel')); td.classList.add('sel');
    const sid = td.dataset.s, qid = td.dataset.q, q = DATA.qById[qid];
    panel.innerHTML = '<p class="loading">Chargement…</p>';
    let d; try { d = await API('cell', {sid, qid}); } catch(e){ panel.innerHTML = `<p class="note-bad">${E(e.userMessage || 'Échec.')}</p>`; return; }
    panel.innerHTML = `<div class="celld"><div class="hd"><b><a href="#admin/eleve-${E(sid)}">${E(nameOf(sid))}</a></b><span>·</span><a href="#admin/q-${encodeURIComponent(qid)}">${E(qFull(q))}</a><button type="button" class="cpt-btn sec sm" data-x>Fermer</button></div>
      <p class="muted">${E(qSnippet(q))}${q && q.type === 'qcm' ? ` · bonne réponse : ${E((q.correct || []).join(', '))}` : q && q.type === 'num' ? ` · bonne réponse : ${E(q.answer.display ? plain(q.answer.display) : fmtNum(q.answer.value) + (q.answer.unit ? ' ' + q.answer.unit : ''))}` : ''}</p>
      ${attemptsHTML(q, d.attempts)}${d.claude.map(claudeHTML).join('')}</div>`;
    panel.querySelector('[data-x]').addEventListener('click', () => { panel.innerHTML = ''; td.classList.remove('sel'); });
    panel.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  };
  box.addEventListener('click', e => open(e.target.closest('td.c')));
  box.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ const td = e.target.closest('td.c'); if (td){ e.preventDefault(); open(td); } } });
}

/* ------------------------------------------------------------ onglet « Suivi détaillé » */
async function adminSuivi(root, chap){
  const perChap = {}; OV.perq.forEach(p => { perChap[p.chap] = (perChap[p.chap] || 0) + 1; });
  const chs = Object.keys(CHAPTERS);
  if (!chap || !CHAPTERS[chap]) chap = sget('olymp-suivi-c') || chs.filter(c => perChap[c]).sort((a, b) => perChap[b] - perChap[a])[0] || chs[0];
  if (!CHAPTERS[chap]) chap = chs[0];
  sset('olymp-suivi-c', chap);
  const groups = [...new Set(OV.students.map(s => s.groupe).filter(Boolean))].sort();
  let g = sget('olymp-suivi-g') || ''; if (g && !groups.includes(g)) g = '';
  let all = sget('olymp-suivi-all') === '1';
  root.innerHTML = `<h2>Suivi détaillé, question par question</h2>
    <p class="muted" style="font-size:.92rem">Une ligne par élève, une colonne par question du chapitre (numérotées dans l’ordre du chapitre ; un trait sépare les problèmes). Cliquez sur une case pour voir toutes les réponses de l’élève à cette question, sur un numéro pour l’analyse de la question par toute la classe.</p>
    <div class="form-row"><label>Chapitre<select id="suC">${chs.map(c => `<option value="${c}"${c === chap ? ' selected' : ''}>${E(CHAPTERS[c].title)}${perChap[c] ? ` (${perChap[c]} réponse${perChap[c] > 1 ? 's' : ''})` : ''}</option>`).join('')}</select></label>
    ${groups.length ? `<label>Élèves<select id="suG"><option value="">tous</option>${groups.map(x => `<option${x === g ? ' selected' : ''}>${E(x)}</option>`).join('')}</select></label>` : ''}
    <label class="chk"><input type="checkbox" id="suA"${all ? ' checked' : ''}> afficher aussi les questions que personne n’a faites</label>
    <a class="cpt-btn sec" href="/api/app?a=exportReponses">Exporter toutes les réponses (CSV)</a></div>
    ${LEGEND}<div id="suGrid"><p class="loading">Chargement…</p></div><div id="suCell"></div>`;
  root.querySelector('#suC').addEventListener('change', e => { location.hash = '#admin/suivi-' + e.target.value; });
  let d; try { d = await API('attemptsFor', {chap}); } catch(e){ root.querySelector('#suGrid').innerHTML = `<p class="note-bad">${E(e.userMessage || 'Échec.')}</p>`; return; }
  const byKey = byPair(d.attempts), qsAll = DATA.questions.filter(q => q.chap === chap), idx = new Map(qsAll.map((q, i) => [q.id, i + 1]));
  const draw = () => {
    const S = OV.students.filter(s => !g || s.groupe === g);
    const qs = all ? qsAll : qsAll.filter(q => S.some(s => byKey[s.id + '|' + q.id]));
    const box = root.querySelector('#suGrid');
    if (!S.length){ box.innerHTML = '<p class="muted">Aucun élève.</p>'; return; }
    if (!qs.length){ box.innerHTML = '<p class="muted">Aucune réponse dans ce chapitre pour ces élèves. Cochez « afficher aussi les questions que personne n’a faites » pour voir la grille vide.</p>'; return; }
    box.innerHTML = `<p class="muted" style="font-size:.86rem">${qs.length} question${qs.length > 1 ? 's' : ''} sur ${qsAll.length} · ${S.length} élève${S.length > 1 ? 's' : ''}</p>` + gridHTML(S, qs, byKey, {num: q => idx.get(q.id)});
  };
  draw(); bindGrid(root.querySelector('#suGrid'), root.querySelector('#suCell'));
  const gs = root.querySelector('#suG'); if (gs) gs.addEventListener('change', () => { g = gs.value; sset('olymp-suivi-g', g); draw(); });
  root.querySelector('#suA').addEventListener('change', e => { all = e.target.checked; sset('olymp-suivi-all', all ? '1' : ''); draw(); });
}

/* ------------------------------------------------------------ une question, vue par toute la classe */
async function adminQuestion(root, qid){
  const q = DATA.qById[qid];
  if (!q){ root.innerHTML = '<p class="note-bad">Question introuvable (elle a peut-être été retirée du site).</p>'; return; }
  root.innerHTML = '<p class="loading">Chargement…</p>';
  let d; try { d = await API('question', {qid}); } catch(e){ root.innerHTML = `<p class="note-bad">${E(e.userMessage || 'Échec.')}</p>`; return; }
  const by = {}; d.attempts.forEach(a => (by[a.sid] = by[a.sid] || []).push(a));
  const sids = Object.keys(by).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const sums = sids.map(sid => ({sid, ...summary(by[sid])}));
  const withReal = sums.filter(s => s.real.length), firstOk = sums.filter(s => s.firstOk).length, seenFirst = sums.filter(s => s.L[0].how === 'vu').length;
  const lastOk = withReal.filter(s => s.lastReal.score >= 1).length;
  const durs = d.attempts.filter(a => a.how !== 'vu' && a.dur > 0).map(a => a.dur), hints = withReal.map(s => s.lastReal.hints || 0);
  const g = q.group ? DATA.gById[q.group] : null, ch = CHAPTERS[q.chap];
  let h = `<p style="margin-top:14px"><a href="#admin/suivi-${E(q.chap)}">← Suivi détaillé${ch ? ' : ' + E(ch.title) : ''}</a></p>
    <h2 style="margin-top:.3em">${E(qFull(q))}</h2>
    <p class="muted">${ch ? E(ch.title) + ' · ' : ''}${q.type === 'qcm' ? 'QCM' : q.type === 'num' ? 'réponse numérique' : 'réponse à rédiger'} · <a href="#question/${encodeURIComponent(q.id)}">ouvrir la question</a>${g ? ` · <a href="#${E(g.chap || q.chap)}--g-${E(g.id)}">le problème dans le chapitre</a>` : ''} · identifiant <span class="code">${E(q.id)}</span></p>
    <details class="qst"><summary>Énoncé${q.type === 'qcm' ? ' et options' : ''}</summary><div>${g ? `<div class="muted" style="font-size:.9rem">${g.intro || ''}</div>` : ''}${q.statement}${q.type === 'qcm' ? '<ol class="optl">' + q.options.map(o => `<li class="${(q.correct || []).includes(o.key) ? 'g' : ''}"><b>${E(o.key)}.</b> ${o.text}</li>`).join('') + '</ol>' : ''}${q.type === 'num' ? `<p><b>Réponse attendue :</b> ${q.answer.display || E(fmtNum(q.answer.value) + ' ' + (q.answer.unit || ''))}</p>` : ''}</div></details>
    <div class="kpis">
      <div class="kpi"><div class="v">${sids.length}</div><div class="l">Élèves</div><div class="s">${withReal.length} ont répondu</div></div>
      <div class="kpi"><div class="v">${sids.length ? pct(firstOk / sids.length) : '–'}</div><div class="l">Juste du premier coup</div><div class="s">${firstOk} élève${firstOk > 1 ? 's' : ''}</div></div>
      <div class="kpi"><div class="v">${withReal.length ? pct(lastOk / withReal.length) : '–'}</div><div class="l">Juste à la fin</div><div class="s">dernière réponse de chacun</div></div>
      <div class="kpi"><div class="v">${seenFirst}</div><div class="l">Corrigé lu d’abord</div><div class="s">sans avoir essayé</div></div>
      <div class="kpi"><div class="v">${durs.length ? fmtDur(median(durs)) : '–'}</div><div class="l">Temps médian</div><div class="s">${hints.length ? (hints.reduce((x, y) => x + y, 0) / hints.length).toFixed(1).replace('.', ',') + ' indice(s) en moyenne' : ''}</div></div>
    </div>`;
  // réponses fausses fréquentes : première réponse de chaque élève
  const firsts = sums.map(s => s.real[0]).filter(a => a && a.answer);
  if (q.type === 'qcm' && firsts.length){
    const cnt = {}; firsts.forEach(a => a.answer.split(',').forEach(k => { cnt[k] = (cnt[k] || 0) + 1; }));
    const mx = Math.max(1, ...Object.values(cnt));
    h += `<h2>Options choisies (première réponse de chaque élève)</h2><div class="optbars">` + q.options.map(o => { const n = cnt[o.key] || 0, ok = (q.correct || []).includes(o.key);
      return `<div class="ob${ok ? ' g' : ''}"><span class="k">${E(o.key)}${ok ? ' ✓' : ''}</span><span class="tx">${o.text}</span><span class="bar ${ok ? 'ok' : 'bad'}"><i style="width:${100 * n / mx}%"></i></span><span class="n">${n}</span></div>`; }).join('') + '</div>';
  } else if (q.type === 'num' && firsts.length){
    const grp = {}; firsts.forEach(a => { const x = parseNum(a.answer), k = isFinite(x) ? x.toPrecision(3) : a.answer.trim(); (grp[k] = grp[k] || {x, n: 0, raw: a.answer}).n++; });
    const rows = Object.values(grp).sort((a, b) => b.n - a.n);
    h += `<h2>Valeurs proposées (première réponse de chaque élève)</h2><div class="scroll"><table><thead><tr><th>Valeur</th><th class="num">Élèves</th><th>Écart à la bonne réponse</th></tr></thead><tbody>` +
      rows.map(r => { const ratio = isFinite(r.x) && q.answer.value ? r.x / q.answer.value : NaN, good = isFinite(ratio) && Math.abs(ratio - 1) <= (q.answer.tol || .05);
        return `<tr><td><span class="${good ? 'g' : 'r'}">${E(r.raw)}${q.answer.unit ? ' ' + E(q.answer.unit) : ''}</span></td><td class="num">${r.n}</td><td>${good ? 'juste' : isFinite(ratio) ? E(ratioHint(ratio)) : 'pas un nombre'}</td></tr>`; }).join('') + '</tbody></table></div>';
  } else if (q.type === 'open'){
    const txt = sums.filter(s => s.L.some(a => a.answer));
    if (txt.length) h += `<h2>Réponses rédigées</h2>` + txt.map(s => { const a = [...s.L].reverse().find(x => x.answer); return `<div class="cl"><div class="h">${pillHTML(s.last)}<b>${E(nameOf(s.sid))}</b><span>${E(HOW_LABEL[s.last.how] || '')}</span><span>${E(fmtDate(a.ts))}</span></div><div class="ans">${E(a.answer)}</div></div>`; }).join('');
    if (d.claude.length) h += `<h2>Corrections et pistes données par Claude</h2>` + d.claude.slice().reverse().map(claudeHTML).join('');
  }
  // un élève par ligne
  h += `<h2>Élève par élève</h2>`;
  if (!sids.length) h += '<p class="muted">Aucun élève n’a encore traité cette question.</p>';
  else h += `<div class="scroll"><table class="att"><thead><tr><th>Élève</th><th>Première réponse</th><th>Dernière réponse</th><th class="num">Réponses</th><th class="num">Indices</th><th class="num">Temps</th><th>Date</th></tr></thead><tbody>` +
    sums.map(s => `<tr data-sid="${E(s.sid)}"><td><a href="#admin/eleve-${E(s.sid)}">${E(nameOf(s.sid))}</a></td><td>${pillHTML(s.L[0])} ${answerHTML(q, s.L[0]).replace('<div class="ans">', '<div class="ans sm">')}</td><td>${s.L.length > 1 ? pillHTML(s.last) + ' ' + answerHTML(q, s.last).replace('<div class="ans">', '<div class="ans sm">') : '<span class="muted">—</span>'}</td><td class="num">${s.L.length}</td><td class="num">${Math.max(...s.L.map(a => a.hints || 0))}</td><td class="num">${fmtDur(s.L.reduce((x, a) => x + (a.dur || 0), 0) || null)}</td><td>${E(ago(s.last.ts))}</td></tr>`).join('') + '</tbody></table></div>';
  root.innerHTML = h; typeset(root);
}

/* ------------------------------------------------------------ maîtrise des méthodes */
function methodsOf(q){ return [...new Set([...(q.methods || []), ...((q.steps || []).map(s => s.m).filter(Boolean))])].filter(m => MBYID[m]); }
function methodRows(list){            // list : réponses (une par élève et par question) avec sid, qid, score, how
  const agg = {};
  list.filter(p => p.how !== 'vu').forEach(p => { const q = DATA.qById[p.qid]; if (!q) return; methodsOf(q).forEach(m => { const A = agg[m] = agg[m] || {m, n: 0, s: 0, who: new Set(), qs: new Set()}; A.n++; A.s += p.score; A.who.add(p.sid); A.qs.add(p.qid); }); });
  return Object.values(agg).map(A => ({...A, mean: A.s / A.n})).sort((a, b) => a.mean - b.mean || b.n - a.n);
}
function methodsHTML(rows, opts = {}){
  if (!rows.length) return '<p class="muted">Pas encore de réponses à des questions rattachées à une fiche méthode.</p>';
  const show = rows.filter(r => r.n >= (opts.min || 1));
  return `<div class="scroll"><table><thead><tr><th>Méthode</th><th class="num">Réponses</th>${opts.students ? '<th class="num">Élèves</th>' : ''}<th class="num">Questions</th><th>Réussite</th></tr></thead><tbody>` +
    show.map((r, i) => `<tr${i >= (opts.top || 12) ? ' class="more" hidden' : ''}><td><a href="#methodes--m-${E(r.m)}">${E(MBYID[r.m].title)}</a></td><td class="num">${r.n}</td>${opts.students ? `<td class="num">${r.who.size}</td>` : ''}<td class="num">${r.qs.size}</td><td><div style="display:flex;align-items:center;gap:8px"><div class="bar ok" style="flex:1"><i style="width:${100 * r.mean}%"></i></div><span style="font-size:.82rem;min-width:3em;text-align:right">${pct(r.mean)}</span></div></td></tr>`).join('') +
    `</tbody></table></div>${show.length > (opts.top || 12) ? `<p><button type="button" class="cpt-btn sec sm" data-more>Afficher les ${show.length} méthodes</button></p>` : ''}`;
}
function bindMore(root){ root.querySelectorAll('[data-more]').forEach(b => b.addEventListener('click', () => { b.closest('p').previousElementSibling.querySelectorAll('tr.more').forEach(t => t.hidden = false); b.remove(); })); }

/* ------------------------------------------------------------ fiche d'un élève : compléments */
function sessionsOf(A){
  const s = [...A].sort((a, b) => a.ts - b.ts), out = [];
  for (const a of s){ const cur = out[out.length - 1]; if (cur && a.ts - cur.end < 40 * 60000){ cur.end = a.ts; cur.list.push(a); } else out.push({start: a.ts, end: a.ts, list: [a]}); }
  return out.reverse();
}
function studentExtraHTML(d){
  const A = d.attempts, byQ = {}; A.forEach(a => (byQ[a.qid] = byQ[a.qid] || []).push(a));
  const S = Object.values(byQ).map(L => summary(L.sort((x, y) => x.ts - y.ts)));
  const met = S.length, first = S.filter(s => s.firstOk).length, seen = S.filter(s => s.seen).length, onlySeen = S.filter(s => !s.real.length).length;
  const tot = A.reduce((x, a) => x + (a.dur || 0), 0), sess = sessionsOf(A);
  let h = `<h2>Suivi détaillé</h2><div class="kpis">
    <div class="kpi"><div class="v">${met ? pct(first / met) : '–'}</div><div class="l">Juste du premier coup</div><div class="s">${first} question${first > 1 ? 's' : ''} sur ${met} abordée${met > 1 ? 's' : ''}</div></div>
    <div class="kpi"><div class="v">${seen}</div><div class="l">Corrigés lus sans essayer</div><div class="s">${onlySeen} jamais tentée${onlySeen > 1 ? 's' : ''} ensuite</div></div>
    <div class="kpi"><div class="v">${tot ? fmtDur(tot) : '–'}</div><div class="l">Temps sur les questions</div><div class="s">temps à l’écran, mesuré depuis le 23 nov.</div></div>
    <div class="kpi"><div class="v">${sess.length}</div><div class="l">Séances</div><div class="s">${sess.length ? 'dernière ' + E(ago(sess[0].end)) : ''}</div></div></div>`;
  // séries
  const mySeries = (OV.series || []).filter(se => !se.archived && serieFor(se, d.me));
  if (mySeries.length){
    h += '<h2>Séries d’exercices</h2><ul class="qlist">' + mySeries.map(se => { const n = se.qids.filter(q => byQ[q] && byQ[q].some(a => a.how !== 'vu')).length;
      return `<li><span class="pill ${n === se.qids.length ? 'ok' : n ? 'mid' : 'bad'}">${n} / ${se.qids.length}</span><div><a href="#admin/serie-${E(se.id)}">${E(se.title)}</a><span class="sn">${E(dueText(se.due))}</span></div></li>`; }).join('') + '</ul>';
  }
  // méthodes
  const last = Object.values(byQ).map(L => { const r = L.filter(a => a.how !== 'vu'); return r.length ? {...r[r.length - 1]} : L[L.length - 1]; });
  h += '<h2>Par méthode</h2>' + methodsHTML(methodRows(last.map(a => ({...a, sid: d.me.id}))), {top: 8});
  // séances
  h += '<h2>Séances de travail</h2>';
  if (!sess.length) h += '<p class="muted">Aucune réponse enregistrée.</p>';
  else h += '<div class="scroll"><table><thead><tr><th>Début</th><th class="num">Durée</th><th class="num">Réponses</th><th>Résultats</th><th>Chapitres</th></tr></thead><tbody>' + sess.slice(0, 25).map(s => {
    const c = {ok: 0, mid: 0, bad: 0, vu: 0}; s.list.forEach(a => c[stOf(a)]++);
    const dur = Math.max((s.end - s.start) / 1000, s.list.reduce((x, a) => x + (a.dur || 0), 0));
    const chs = [...new Set(s.list.map(a => a.chap))].map(x => CHAPTERS[x] ? CHAPTERS[x].title : x);
    return `<tr><td>${E(fmtDate(s.start))}</td><td class="num">${dur ? fmtDur(dur) : '–'}</td><td class="num">${s.list.length}</td><td style="white-space:nowrap">${c.ok ? `<span class="pill ok">${c.ok} juste${c.ok > 1 ? 's' : ''}</span> ` : ''}${c.mid ? `<span class="pill mid">${c.mid} en partie</span> ` : ''}${c.bad ? `<span class="pill bad">${c.bad} faux</span> ` : ''}${c.vu ? `<span class="pill vu">${c.vu} lu${c.vu > 1 ? 's' : ''}</span>` : ''}</td><td><small>${E(chs.join(', '))}</small></td></tr>`; }).join('') + '</tbody></table></div>' + (sess.length > 25 ? `<p class="muted">${sess.length - 25} séances plus anciennes non affichées.</p>` : '');
  // journal
  const chs = [...new Set(A.map(a => a.chap))].filter(c => CHAPTERS[c]);
  h += `<h2>Toutes les réponses</h2><div class="form-row"><label>Chapitre<select id="jrC"><option value="">tous</option>${chs.map(c => `<option value="${c}">${E(CHAPTERS[c].title)}</option>`).join('')}</select></label>
    <label>Résultat<select id="jrS"><option value="">tous</option><option value="ok">juste</option><option value="mid">en partie</option><option value="bad">faux</option><option value="vu">corrigé lu sans essayer</option></select></label></div><div id="jr"></div>`;
  return h;
}
function bindJournal(root, A){
  const box = root.querySelector('#jr'); if (!box) return;
  let lim = 60;
  const draw = () => {
    const c = root.querySelector('#jrC').value, st = root.querySelector('#jrS').value;
    const L = [...A].sort((a, b) => b.ts - a.ts).filter(a => (!c || a.chap === c) && (!st || stOf(a) === st));
    box.innerHTML = !L.length ? '<p class="muted">Aucune réponse.</p>' : `<div class="scroll"><table class="att"><thead><tr><th>Date</th><th>Question</th><th>Résultat</th><th>Réponse donnée</th><th class="num">Indices</th><th class="num">Temps</th></tr></thead><tbody>` +
      L.slice(0, lim).map(a => { const q = DATA.qById[a.qid]; return `<tr><td style="white-space:nowrap">${E(fmtDate(a.ts))}</td><td><a href="#admin/q-${encodeURIComponent(a.qid)}">${E(qFull(q))}</a><br><small class="muted">${E(CHAPTERS[a.chap] ? CHAPTERS[a.chap].title : a.chap)}</small></td><td>${pillHTML(a)}${HOW_LABEL[a.how] ? `<br><small class="muted">${E(HOW_LABEL[a.how])}</small>` : ''}</td><td>${answerHTML(q, a).replace('<div class="ans">', '<div class="ans sm">')}</td><td class="num">${a.hints || 0}</td><td class="num">${fmtDur(a.dur)}</td></tr>`; }).join('') +
      `</tbody></table></div>${L.length > lim ? `<p><button type="button" class="cpt-btn sec sm" id="jrM">Afficher les ${L.length - lim} suivantes</button></p>` : ''}`;
    const m = box.querySelector('#jrM'); if (m) m.addEventListener('click', () => { lim += 200; draw(); });
  };
  root.querySelector('#jrC').addEventListener('change', () => { lim = 60; draw(); });
  root.querySelector('#jrS').addEventListener('change', () => { lim = 60; draw(); });
  draw();
}

/* ------------------------------------------------------------ séries d'exercices (professeur) */
const normG = x => String(x || '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
const serieFor = (se, st) => !se.cible || (se.cible === '@T' ? st.niveau !== 'C' : se.cible === '@C' ? st.niveau === 'C' : normG(se.cible) === normG(st.groupe));
const cibleLabel = c => !c ? 'tous les élèves' : c === '@T' ? 'les élèves de terminale' : c === '@C' ? 'les élèves de CPGE' : 'la classe « ' + c + ' »';
function dueText(due){
  if (!due) return 'sans date limite';
  const s = new Date(due).toLocaleString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'});
  const left = due - Date.now();
  if (left < 0) return 'date limite passée (' + s + ')';
  return 'à faire pour le ' + s + (left < DAYMS ? ' (moins de 24 h)' : left < 7 * DAYMS ? ` (dans ${Math.ceil(left / DAYMS)} j)` : '');
}
function serieStats(se){
  const studs = OV.students.filter(s => serieFor(se, s)), last = {};
  OV.perq.forEach(p => { last[p.sid + '|' + p.qid] = p; });
  const per = studs.map(s => { const n = se.qids.filter(q => { const p = last[s.id + '|' + q]; return p && p.how !== 'vu'; }).length; return {s, n, any: n > 0 || se.qids.some(q => last[s.id + '|' + q])}; });
  return {studs, per, full: per.filter(x => x.n === se.qids.length).length, started: per.filter(x => x.any && x.n < se.qids.length).length, none: per.filter(x => !x.any).length};
}
function adminSeries(root){
  const L = OV.series || [], act = L.filter(s => !s.archived), arch = L.filter(s => s.archived);
  const row = se => { const st = serieStats(se), N = st.studs.length;
    return `<tr data-id="${E(se.id)}"><td><a href="#admin/serie-${E(se.id)}"><b>${E(se.title)}</b></a><br><small class="muted">${E(cibleLabel(se.cible))} · ${se.qids.length} question${se.qids.length > 1 ? 's' : ''}</small></td>
      <td><small>${E(dueText(se.due))}</small></td>
      <td style="min-width:180px">${N ? `<div class="stack" title="${st.full} ont tout fait, ${st.started} ont commencé, ${st.none} n’ont pas commencé"><i class="ok" style="width:${100 * st.full / N}%"></i><i class="mid" style="width:${100 * st.started / N}%"></i></div><small>${st.full} / ${N} ont tout fait · ${st.none} pas commencé${st.none > 1 ? 's' : ''}</small>` : '<small class="muted">aucun élève visé</small>'}</td>
      <td style="white-space:nowrap"><a class="cpt-btn sec sm" href="#admin/serie-edit-${E(se.id)}">Modifier</a> <button type="button" class="cpt-btn sec sm" data-arch="${se.archived ? '' : '1'}">${se.archived ? 'Réactiver' : 'Archiver'}</button> <button type="button" class="cpt-btn dang sm" data-del>Supprimer</button></td></tr>`; };
  const table = list => `<div class="scroll"><table class="series"><thead><tr><th>Série</th><th>Échéance</th><th>Avancement</th><th></th></tr></thead><tbody>${list.map(row).join('')}</tbody></table></div>`;
  root.innerHTML = `<h2>Séries d’exercices</h2>
    <p class="muted" style="font-size:.92rem">Composez une série de questions de la banque, pour toute la classe, un niveau ou un groupe, avec une date limite. Les élèves concernés la voient dans leur menu (« Mes séries ») et la font sur une page dédiée ; vous suivez ici qui a fait quoi, et quand.</p>
    <p><a class="cpt-btn" href="#admin/serie-new">Nouvelle série</a></p>
    ${act.length ? table(act) : '<p class="muted">Aucune série en cours.</p>'}
    ${arch.length ? `<details style="margin-top:1.5em"><summary>Séries archivées (${arch.length}) : invisibles pour les élèves</summary>${table(arch)}</details>` : ''}<p id="seOut"></p>`;
  root.addEventListener('click', async e => {
    const tr = e.target.closest('tr[data-id]'), b = e.target.closest('button'); if (!tr || !b) return;
    const id = tr.dataset.id, out = root.querySelector('#seOut');
    try {
      if (b.hasAttribute('data-arch')){ await API('archiveSerie', {id, archived: b.dataset.arch === '1'}); }
      else if (b.hasAttribute('data-del')){
        if (!b.dataset.armed){ b.dataset.armed = '1'; b.textContent = 'Confirmer la suppression'; return; }
        await API('deleteSerie', {id});
      } else return;
      OV = await API('overview'); adminSeries(root);
    } catch(x){ out.className = 'note-bad'; out.textContent = x.userMessage || 'Échec.'; }
  });
}
async function adminSerieEdit(root, id){
  const se = id ? (OV.series || []).find(x => x.id === id) : null;
  if (id && !se){ root.innerHTML = '<p class="note-bad">Série introuvable.</p>'; return; }
  let sel = se ? se.qids.filter(q => DATA.qById[q]) : [];
  const groups = [...new Set(OV.students.map(s => s.groupe).filter(Boolean))].sort();
  const dd = se && se.due ? new Date(se.due) : null, pad = n => String(n).padStart(2, '0');
  const dateV = dd ? `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}-${pad(dd.getDate())}` : '', timeV = dd ? `${pad(dd.getHours())}:${pad(dd.getMinutes())}` : '22:00';
  const doneBy = {}; OV.perq.forEach(p => { if (p.how !== 'vu') doneBy[p.qid] = (doneBy[p.qid] || 0) + 1; });
  const prog = await loadProg();
  root.innerHTML = `<p style="margin-top:14px"><a href="#admin/series">← Toutes les séries</a></p><h2 style="margin-top:.3em">${se ? 'Modifier la série' : 'Nouvelle série'}</h2>
    <div class="form-row"><label style="flex:2 1 260px">Titre<input type="text" id="sfT" maxlength="120" value="${E(se ? se.title : '')}" placeholder="ex. Oscillateurs : série 1"></label>
    <label>Pour<select id="sfC"><option value="">tous les élèves</option><option value="@T">les élèves de terminale</option><option value="@C">les élèves de CPGE</option>${groups.map(g => `<option value="${E(g)}">la classe « ${E(g)} »</option>`).join('')}</select></label>
    <label>Date limite<input type="date" id="sfD" value="${dateV}"></label><label>Heure<input type="time" id="sfH" value="${timeV}"></label></div>
    <label class="f" style="display:block;font-size:.82rem;color:var(--fg-2)">Consigne (facultative, affichée aux élèves)<textarea id="sfN" style="min-height:60px">${E(se ? se.note : '')}</textarea></label>
    <div class="cols2 picker"><div><h3>Choisir des questions</h3>
      <div class="form-row"><label>Chapitre<select id="pkC">${Object.keys(CHAPTERS).map(c => `<option value="${c}">${E(CHAPTERS[c].title)}</option>`).join('')}</select></label>
      <label style="flex:1 1 140px">Filtrer<input type="text" id="pkF" placeholder="mot de l’énoncé, année…"></label>
      <label class="chk"><input type="checkbox" id="pkS"> incontournables ★</label></div><div id="pkL" class="pklist"></div></div>
    <div><h3>Questions de la série (<span id="sfNb">0</span>)</h3><ol id="sfL" class="sellist"></ol></div></div>
    <p class="form-row"><button type="button" class="cpt-btn" id="sfB">${se ? 'Enregistrer' : 'Créer la série'}</button><span id="sfO"></span></p>`;
  if (se) root.querySelector('#sfC').value = se.cible || '';
  if (se && se.cible && !['', '@T', '@C', ...groups].includes(se.cible)){ const o = document.createElement('option'); o.value = se.cible; o.textContent = 'la classe « ' + se.cible + ' »'; root.querySelector('#sfC').appendChild(o); root.querySelector('#sfC').value = se.cible; }
  const firstChap = sel.length ? DATA.qById[sel[0]].chap : sget('olymp-suivi-c') || Object.keys(CHAPTERS)[0];
  root.querySelector('#pkC').value = CHAPTERS[firstChap] ? firstChap : Object.keys(CHAPTERS)[0];
  const starSet = chap => { const s = new Set(); ['T', 'C'].forEach(lv => stars(prog, DATA, chap, lv).forEach(x => x.qids.forEach(q => s.add(q)))); return s; };
  const lab = q => qFull(q);
  const drawPick = () => {
    const c = root.querySelector('#pkC').value, f = normG(root.querySelector('#pkF').value), onlyStar = root.querySelector('#pkS').checked, st = starSet(c), inSel = new Set(sel);
    let L = DATA.questions.filter(q => q.chap === c);
    if (onlyStar) L = L.filter(q => st.has(q.id));
    if (f) L = L.filter(q => normG(lab(q) + ' ' + plain(q.statement) + ' ' + (q.origin || '') + ' ' + q.id).includes(f));
    let pg = null;
    root.querySelector('#pkL').innerHTML = !L.length ? '<p class="muted">Aucune question.</p>' : L.slice(0, 250).map(q => {
      const head = q.group && q.group !== pg ? `<div class="pkg"><span>${E(DATA.gById[q.group] ? DATA.gById[q.group].title : '')}</span><button type="button" class="lk" data-grp="${E(q.group)}">ajouter tout le problème</button></div>` : ''; pg = q.group || null;
      return `${head}<label class="pk${q.group ? ' in' : ''}"><input type="checkbox" value="${E(q.id)}"${inSel.has(q.id) ? ' checked' : ''}><span><b>${E(q.group ? lab(q).split(' · ').pop() : lab(q))}</b>${st.has(q.id) ? ' <span class="star">★</span>' : ''}${(q.level || ['T', 'C']).includes('T') ? '' : ' <span class="tag lvl">CPGE</span>'}<small>${E(q.type === 'qcm' ? 'QCM' : q.type === 'num' ? 'numérique' : 'à rédiger')}${doneBy[q.id] ? ` · déjà faite par ${doneBy[q.id]} élève${doneBy[q.id] > 1 ? 's' : ''}` : ''} · ${E(qSnippet(q))}</small></span></label>`; }).join('') + (L.length > 250 ? `<p class="muted">${L.length - 250} autres : précisez le filtre.</p>` : '');
  };
  const drawSel = () => {
    root.querySelector('#sfNb').textContent = sel.length;
    root.querySelector('#sfL').innerHTML = sel.map((id, i) => { const q = DATA.qById[id]; return `<li data-i="${i}"><span class="t"><b>${E(lab(q))}</b><small>${E(CHAPTERS[q.chap] ? CHAPTERS[q.chap].title : '')}</small></span><span class="b"><button type="button" class="lk" data-up${i ? '' : ' disabled'} aria-label="Monter">↑</button><button type="button" class="lk" data-dn${i < sel.length - 1 ? '' : ' disabled'} aria-label="Descendre">↓</button><button type="button" class="lk" data-rm aria-label="Retirer">✕</button></span></li>`; }).join('') || '<p class="muted">Cochez des questions à gauche.</p>';
  };
  drawPick(); drawSel();
  ['#pkC', '#pkS'].forEach(s => root.querySelector(s).addEventListener('change', drawPick));
  root.querySelector('#pkF').addEventListener('input', drawPick);
  root.querySelector('#pkL').addEventListener('change', e => { const i = e.target.closest('input[type=checkbox]'); if (!i) return; if (i.checked){ if (!sel.includes(i.value)) sel.push(i.value); } else sel = sel.filter(x => x !== i.value); drawSel(); });
  root.querySelector('#pkL').addEventListener('click', e => { const b = e.target.closest('[data-grp]'); if (!b) return; (DATA.byGroup[b.dataset.grp] || []).forEach(q => { if (!sel.includes(q.id)) sel.push(q.id); }); drawSel(); drawPick(); });
  root.querySelector('#sfL').addEventListener('click', e => { const li = e.target.closest('li[data-i]'), b = e.target.closest('button'); if (!li || !b) return; const i = +li.dataset.i;
    if (b.hasAttribute('data-rm')) sel.splice(i, 1); else if (b.hasAttribute('data-up') && i > 0) [sel[i - 1], sel[i]] = [sel[i], sel[i - 1]]; else if (b.hasAttribute('data-dn') && i < sel.length - 1) [sel[i + 1], sel[i]] = [sel[i], sel[i + 1]];
    drawSel(); drawPick(); });
  root.querySelector('#sfB').addEventListener('click', async () => {
    const o = root.querySelector('#sfO'), dv = root.querySelector('#sfD').value, hv = root.querySelector('#sfH').value || '22:00';
    const due = dv ? new Date(dv + 'T' + hv).getTime() : null;
    try {
      const r = await API('saveSerie', {id: se ? se.id : undefined, title: root.querySelector('#sfT').value, cible: root.querySelector('#sfC').value, note: root.querySelector('#sfN').value, qids: sel, due, archived: se ? se.archived : false});
      OV = await API('overview'); location.hash = '#admin/serie-' + r.id;
    } catch(x){ o.className = 'note-bad'; o.textContent = x.userMessage || 'Échec.'; }
  });
}
async function adminSerie(root, id){
  const se = (OV.series || []).find(x => x.id === id);
  if (!se){ root.innerHTML = '<p class="note-bad">Série introuvable.</p>'; return; }
  const qs = se.qids.map(q => DATA.qById[q]).filter(Boolean), st = serieStats(se), N = st.studs.length;
  const late = se.due && se.due < Date.now(), soon = se.due && !late && se.due - Date.now() < DAYMS;
  root.innerHTML = `<p style="margin-top:14px"><a href="#admin/series">← Toutes les séries</a></p><h2 style="margin-top:.3em">${E(se.title)}${se.archived ? ' <span class="pill">archivée</span>' : ''}</h2>
    <p class="muted">Pour ${E(cibleLabel(se.cible))} · ${E(dueText(se.due))} · créée ${E(ago(se.created))} · <a href="#admin/serie-edit-${E(se.id)}">modifier</a> · <a href="#serie/${E(se.id)}">voir la page des élèves</a></p>
    ${se.note ? `<div class="newcodes">${E(se.note)}</div>` : ''}
    <div class="kpis"><div class="kpi"><div class="v">${N}</div><div class="l">Élèves concernés</div></div>
    <div class="kpi"><div class="v">${st.full}</div><div class="l">Ont tout fait</div><div class="s">${qs.length} question${qs.length > 1 ? 's' : ''}</div></div>
    <div class="kpi"><div class="v">${st.started}</div><div class="l">Ont commencé</div></div>
    <div class="kpi"><div class="v">${st.none}</div><div class="l">Pas commencé</div><div class="s">${soon ? 'échéance dans moins de 24 h' : late ? 'échéance passée' : ''}</div></div></div>
    ${st.none ? `<p class="${soon || late ? 'newcodes' : 'muted'}"><b>Pas encore commencé :</b> ${st.per.filter(x => !x.any).map(x => E(x.s.prenom + ' ' + x.s.nom)).join(', ')} <button type="button" class="cpt-btn sec sm" id="seCp">Copier la liste</button></p>` : ''}
    ${LEGEND}<div id="seGrid"><p class="loading">Chargement…</p></div><div id="seCell"></div>`;
  const cp = root.querySelector('#seCp'); if (cp) cp.addEventListener('click', async () => { try { await navigator.clipboard.writeText(st.per.filter(x => !x.any).map(x => x.s.prenom + ' ' + x.s.nom).join('\n')); cp.textContent = 'Copiée'; } catch(e){ cp.textContent = 'Copie impossible'; } });
  let d; try { d = await API('attemptsFor', {qids: se.qids}); } catch(e){ root.querySelector('#seGrid').innerHTML = `<p class="note-bad">${E(e.userMessage || 'Échec.')}</p>`; return; }
  const box = root.querySelector('#seGrid');
  box.innerHTML = !N ? '<p class="muted">Aucun élève ne correspond à la cible de cette série.</p>' : gridHTML(st.studs, qs, byPair(d.attempts), {due: se.due});
  bindGrid(box, root.querySelector('#seCell'));
}

/* ------------------------------------------------------------ séries d'exercices (élève) */
let SERIES = [];
const serieDone = se => se.qids.filter(q => LAST[q] && LAST[q].how !== 'vu').length;
const seriesTodo = () => SERIES.filter(se => serieDone(se) < se.qids.length).length;
function seriesBlock(){
  if (!SERIES.length) return '';
  return '<h2>Mes séries d’exercices</h2><ul class="qlist">' + SERIES.map(se => { const n = serieDone(se), N = se.qids.length;
    return `<li><span class="pill ${n === N ? 'ok' : n ? 'mid' : 'bad'}">${n} / ${N}</span><div><a href="#serie/${E(se.id)}">${E(se.title)}</a><span class="sn">${E(dueText(se.due))}</span></div></li>`; }).join('') + '</ul>';
}
function syncSeriesBadge(){
  const a = document.querySelector('.cpt-box a[href="#serie"]'); if (!a) return;
  let b = a.querySelector('.badge'); const n = seriesTodo();
  if (!n){ if (b) b.remove(); return; }
  if (!b){ b = document.createElement('span'); b.className = 'badge'; b.title = 'Séries pas encore terminées'; a.appendChild(b); } b.textContent = n;
}
document.addEventListener('olymp:done', syncSeriesBadge);
async function showSerie(id){
  view.className = 'page'; view.dataset.page = '';
  view.innerHTML = '<p class="loading">Chargement…</p>';
  await ready;
  if (ME && ME.role === 'admin'){ location.replace('#admin/' + (id ? 'serie-' + id : 'series')); return; }
  if (!ME || ME.role !== 'eleve'){ view.innerHTML = '<h1>Séries d’exercices</h1><p>Les séries sont données par votre professeur aux élèves connectés avec leur code.</p>'; return; }
  await loadData();
  const se = id && SERIES.find(x => x.id === id);
  if (!se){
    view.innerHTML = `<p class="eyebrow">Mon suivi</p><h1>Mes séries d’exercices</h1>${SERIES.length ? seriesBlock().replace('<h2>Mes séries d’exercices</h2>', '') : '<p class="muted">Aucune série pour l’instant.</p>'}`;
    window.scrollTo(0, 0); return;
  }
  view.innerHTML = `<p class="eyebrow">Série d’exercices</p><h1>${E(se.title)}</h1><p class="lede">${E(dueText(se.due))}</p>
    ${se.note ? `<div class="newcodes" style="white-space:pre-wrap">${E(se.note)}</div>` : ''}<div class="sprog"></div><div class="slist"></div>`;
  const list = view.querySelector('.slist');
  se.qids.forEach((qid, i) => { const q = DATA.qById[qid]; if (!q) return;
    const w = document.createElement('section'); w.className = 'sq'; w.id = 'sq-' + qid;
    w.innerHTML = `<h2>Question ${i + 1} <small>${E(CHAPTERS[q.chap] ? CHAPTERS[q.chap].title : '')}</small></h2>`;
    w.appendChild(renderQuestion(q, {showGroup: true, showSub: true})); list.appendChild(w); });
  typeset(list);
  const upd = () => { const p = view.querySelector('.sprog'); if (!p || !view.contains(list)) return document.removeEventListener('olymp:done', upd);
    const n = serieDone(se), N = se.qids.length;
    p.innerHTML = `<div class="m"><span>${n === N ? 'Série terminée : bravo !' : `${n} question${n > 1 ? 's' : ''} faite${n > 1 ? 's' : ''} sur ${N}`}</span></div><div class="bar ok"><i style="width:${100 * n / N}%"></i></div>`; };
  upd(); document.addEventListener('olymp:done', upd);
  window.scrollTo(0, 0);
}

HOOKS.routes = Object.assign(HOOKS.routes || {}, {suivi: showSuivi, admin: showAdmin, serie: showSerie});
})();
