/* Simulation : carte de lignes de niveau et gradient. Le gradient est perpendiculaire aux lignes de niveau et pointe
   vers la plus forte montée ; une bille (ou une charge test) suit −grad, la ligne de plus grande pente (ou une ligne de champ). */
window.SIMS['gradient'] = function(mount){
  const K = window.SimKit, C = K.C, W = 640, H = 400, XS = 1.6, YS = 1;
  const F = {
    colline: {lab: 'Colline : h = e^(−x² − 2y²)', f: (x, y) => Math.exp(-x * x - 2 * y * y), dl: 0.1, map: v => v, down: 'la bille descend'},
    cuvette: {lab: 'Cuvette : Ep = x² + 2y²', f: (x, y) => x * x + 2 * y * y, dl: 0.2, map: v => v, down: 'la bille descend vers le fond'},
    col: {lab: 'Col : h = x² − y²', f: (x, y) => x * x - y * y, dl: 0.2, map: v => v, down: 'la bille quitte le col'},
    dipole: {lab: 'Potentiel de deux charges +q et −q', f: (x, y) => 1 / Math.max(0.06, Math.hypot(x + 0.6, y)) - 1 / Math.max(0.06, Math.hypot(x - 0.6, y)), dl: 0.35, map: v => Math.asinh(v * 1.5), down: 'une charge +q suit la ligne de champ'},
    paire: {lab: 'Potentiel de deux charges +q et +q', f: (x, y) => 1 / Math.max(0.06, Math.hypot(x + 0.6, y)) + 1 / Math.max(0.06, Math.hypot(x - 0.6, y)), dl: 0.3, map: v => Math.asinh(v * 1.5), down: 'une charge +q suit la ligne de champ'}
  };
  let fn = 'colline', pt = [0.7, 0.35], arrows = true, path = [], anim = false, img = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, W, H);
  K.select(ctr, 'Champ scalaire', Object.entries(F).map(([k, v]) => [k, v.lab]), v => { fn = v; img = null; path = []; draw(); });
  const lab = document.createElement('label'); lab.style.flexDirection = 'row'; lab.style.alignItems = 'center'; lab.style.gap = '6px';
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; cb.addEventListener('change', () => { arrows = cb.checked; draw(); }); lab.appendChild(cb); lab.appendChild(document.createTextNode('Grille de flèches −grad')); ctr.appendChild(lab);
  K.button(ctr, 'Lâcher une bille ici', () => { path = [pt.slice()]; anim = true; });
  K.button(ctr, 'Effacer', () => { path = []; anim = false; draw(); }, true);
  const out = K.readout(ctr);
  const tx = x => (x + XS) / (2 * XS) * W, ty = y => (YS - y) / (2 * YS) * H, ix = X => X / W * 2 * XS - XS, iy = Y => YS - Y / H * 2 * YS;
  const grad = (x, y) => { const f = F[fn].f, h = 1e-4; return [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)]; };
  ctx.canvas.style.cursor = 'crosshair';
  ctx.canvas.addEventListener('pointerdown', e => { const r = ctx.canvas.getBoundingClientRect(); pt = [ix((e.clientX - r.left) / r.width * W), iy((e.clientY - r.top) / r.height * H)]; path = []; anim = false; draw(); });
  function arrow(x1, y1, x2, y2, col, w, h = 9){ const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1); if (L < 2) return; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.min(h, L) * 0.6 * Math.cos(a), y2 - Math.min(h, L) * 0.6 * Math.sin(a)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)); ctx.lineTo(x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill(); }
  function background(){
    // carte : teinte selon la valeur, lignes de niveau là où l'indice de niveau change
    const m = F[fn], st = 2, nx = W / st, ny = H / st, V = new Float32Array(nx * ny); let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){ const v = m.map(m.f(ix((i + 0.5) * st), iy((j + 0.5) * st))); V[j * nx + i] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
    const off = document.createElement('canvas'); off.width = nx; off.height = ny; const o = off.getContext('2d'), id = o.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){ const v = V[j * nx + i], u = (v - lo) / (hi - lo || 1), k = (j * nx + i) * 4;
      let line = false; const lv = Math.floor(v / m.dl); if (i < nx - 1 && Math.floor(V[j * nx + i + 1] / m.dl) !== lv) line = true; if (j < ny - 1 && Math.floor(V[(j + 1) * nx + i] / m.dl) !== lv) line = true;
      const c = line ? [110, 120, 140] : [Math.round(235 - 40 * u), Math.round(242 - 20 * u), Math.round(250 - 70 * u)]; id.data[k] = c[0]; id.data[k + 1] = c[1]; id.data[k + 2] = c[2]; id.data[k + 3] = 255; }
    o.putImageData(id, 0, 0); return off;
  }
  function draw(){
    if (!img) img = background();
    ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 0, 0, W, H);
    if (fn === 'dipole' || fn === 'paire'){ [[-0.6, '+'], [0.6, fn === 'dipole' ? '−' : '+']].forEach(([x, s]) => { ctx.fillStyle = s === '+' ? C.red : C.blue; ctx.beginPath(); ctx.arc(tx(x), ty(0), 9, 0, 7); ctx.fill(); K.text(ctx, s, tx(x), ty(0), {size: 14, bold: true, color: '#fff', align: 'center'}); }); }
    if (arrows){ for (let i = 1; i < 16; i++) for (let j = 1; j < 10; j++){ const x = -XS + i * 2 * XS / 16, y = -YS + j * 2 * YS / 10, g = grad(x, y), n = Math.hypot(...g); if (n < 1e-6) continue; const L = Math.min(18, 6 + 10 * Math.log10(1 + 4 * n)); arrow(tx(x), ty(y), tx(x) - L * g[0] / n, ty(y) + L * g[1] / n, 'rgba(21,33,58,0.45)', 1.2, 6); } }
    // trajectoire de plus grande pente
    if (path.length > 1){ ctx.strokeStyle = C.red; ctx.lineWidth = 2.5; ctx.beginPath(); path.forEach((p, i) => i ? ctx.lineTo(tx(p[0]), ty(p[1])) : ctx.moveTo(tx(p[0]), ty(p[1]))); ctx.stroke(); const q = path[path.length - 1]; ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(tx(q[0]), ty(q[1]), 6, 0, 7); ctx.fill(); }
    // point choisi : gradient et tangente à la ligne de niveau
    const g = grad(pt[0], pt[1]), n = Math.hypot(...g), P = [tx(pt[0]), ty(pt[1])];
    if (n > 1e-6){ const u = [g[0] / n, -g[1] / n], L = 55;
      ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(P[0] - 40 * u[1], P[1] + 40 * u[0]); ctx.lineTo(P[0] + 40 * u[1], P[1] - 40 * u[0]); ctx.stroke(); ctx.setLineDash([]);
      arrow(P[0], P[1], P[0] + L * u[0], P[1] + L * u[1], C.amber, 3.5, 12); K.text(ctx, 'grad', P[0] + (L + 16) * u[0], P[1] + (L + 16) * u[1], {size: 12, bold: true, color: '#b85a0c', align: 'center'});
      ctx.strokeStyle = C.amber; ctx.lineWidth = 1; const q = 8; ctx.beginPath(); ctx.moveTo(P[0] + q * u[0], P[1] + q * u[1]); ctx.lineTo(P[0] + q * u[0] + q * u[1], P[1] + q * u[1] - q * u[0]); ctx.lineTo(P[0] + q * u[1], P[1] - q * u[0]); ctx.stroke(); }
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(P[0], P[1], 5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(8, 8, 330, 44); K.text(ctx, F[fn].lab, 16, 21, {size: 12, bold: true, color: C.navy}); K.text(ctx, 'vert pointillé : ligne de niveau ; orange : gradient', 16, 40, {size: 11, color: C.ink});
    const val = F[fn].f(pt[0], pt[1]);
    out.innerHTML = `Point (${K.fmt(pt[0], 2)} ; ${K.fmt(pt[1], 2)})<br>Valeur : ${K.fmt(val, 3)}<br>grad = (<b>${K.fmt(g[0], 2)}</b> ; <b>${K.fmt(g[1], 2)}</b>)<br>Norme (pente) : ${K.fmt(n, 2)}<br>Cliquez sur la carte pour choisir un point ; ${F[fn].down} en suivant −grad.`;
  }
  function step(){ // descente selon −grad, pas de longueur fixe
    const q = path[path.length - 1], g = grad(q[0], q[1]), n = Math.hypot(...g);
    if (n < 1e-3 || Math.abs(q[0]) > XS || Math.abs(q[1]) > YS || path.length > 900){ anim = false; return; }
    if (fn === 'dipole' && Math.hypot(q[0] - 0.6, q[1]) < 0.07){ anim = false; return; }
    for (let k = 0; k < 3; k++){ const p = path[path.length - 1], gg = grad(p[0], p[1]), nn = Math.hypot(...gg); if (nn < 1e-3) { anim = false; return; } const np = [p[0] - 0.008 * gg[0] / nn, p[1] - 0.008 * gg[1] / nn]; if (F[fn].f(np[0], np[1]) >= F[fn].f(p[0], p[1])){ anim = false; return; } path.push(np); }
  }
  draw();
  (function loop(){ if (!mount.isConnected) return; if (anim){ step(); draw(); } requestAnimationFrame(loop); })();
};
