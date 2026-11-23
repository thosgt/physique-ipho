/* Simulation : tir d'un projectile, sans frottement ou avec un frottement linéaire ou quadratique.
   Sans frottement : x = v0 cos(a) t, y = h0 + v0 sin(a) t - g t²/2 ; portée v0² sin(2a)/g depuis le sol, maximale à 45°.
   Avec frottement, réglé par la vitesse limite vl : linéaire a = g - (g/vl) v ; quadratique a = g - (g/vl²) |v| v. */
window.SIMS['tir'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81;
  let v0 = 20, ang = 45, h0 = 0, mode = 'sans', vl = 25, shots = [], last = null;
  const COLS = [C.blue, C.red, C.green, C.amber, '#7a4fb5', C.navy];
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Vitesse initiale v₀', 2, 40, 0.5, v0, x => K.fmt(x, 1) + ' m/s', x => { v0 = x; });
  K.slider(ctr, 'Angle de tir α', 0, 90, 1, ang, x => x + '°', x => { ang = x; });
  K.slider(ctr, 'Hauteur de départ h₀', 0, 30, 0.5, h0, x => K.fmt(x, 1) + ' m', x => { h0 = x; });
  K.select(ctr, 'Frottement de l’air', [['sans', 'aucun (chute libre)'], ['lin', 'linéaire, −k v'], ['quad', 'quadratique, −c v²']], x => { mode = x; vlS.el.disabled = x === 'sans'; });
  const vlS = K.slider(ctr, 'Vitesse limite (règle le frottement)', 3, 80, 1, vl, x => x + ' m/s', x => { vl = x; });
  vlS.el.disabled = true;
  K.button(ctr, '▶ Tirer', () => fire([ang]));
  K.button(ctr, 'Tirer à 15°, 30°, 45°, 60° et 75°', () => fire([15, 30, 45, 60, 75]), true);
  K.button(ctr, 'Effacer les trajectoires', () => { shots = []; }, true);
  const out = K.readout(ctr);

  function fire(list){
    list.forEach(a => {
      const r = a * Math.PI / 180;
      shots.push({x: 0, y: h0, vx: v0 * Math.cos(r), vy: v0 * Math.sin(r), t: 0, ymax: h0, trail: [[0, h0]], done: false,
        a, v0, h0, mode, vl, col: COLS[shots.length % COLS.length]});
    });
    if (shots.length > 12) shots = shots.slice(-12);
  }
  function acc(s, vx, vy){
    if (s.mode === 'sans') return [0, -g];
    const v = Math.hypot(vx, vy), k = s.mode === 'lin' ? g / s.vl : g * v / (s.vl * s.vl);
    return [-k * vx, -g - k * vy];
  }
  function step(s, dt){
    const n = 20, h = dt / n;
    for (let i = 0; i < n && !s.done; i++){
      // Runge-Kutta 2 (point milieu)
      const [ax, ay] = acc(s, s.vx, s.vy);
      const mx = s.vx + ax * h / 2, my = s.vy + ay * h / 2;
      const [bx, by] = acc(s, mx, my);
      const px = s.x, py = s.y;
      s.x += mx * h; s.y += my * h; s.vx += bx * h; s.vy += by * h; s.t += h;
      if (s.y > s.ymax) s.ymax = s.y;
      if (s.y < 0 && s.t > 1e-3){ const f = py / (py - s.y); s.x = px + (s.x - px) * f; s.y = 0; s.t -= h * (1 - f); s.done = true; }
    }
    s.trail.push([s.x, s.y]);
  }
  // portée théorique sans frottement depuis la hauteur h0
  const rangeTh = (v, a, h) => { const r = a * Math.PI / 180, vx = v * Math.cos(r), vy = v * Math.sin(r); const t = (vy + Math.sqrt(vy * vy + 2 * g * h)) / g; return {R: vx * t, T: t, H: h + vy * vy / (2 * g)}; };
  function arrow(x0, y0, x1, y1, col){ const L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return; const a = Math.atan2(y1 - y0, x1 - x0); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 9 * Math.cos(a - .4), y1 - 9 * Math.sin(a - .4)); ctx.lineTo(x1 - 9 * Math.cos(a + .4), y1 - 9 * Math.sin(a + .4)); ctx.closePath(); ctx.fill(); }

  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    // échelle commune aux deux axes, choisie pour contenir le tir le plus long possible sans frottement
    const vm = Math.max(v0, ...shots.map(s => s.v0)), hm = Math.max(h0, ...shots.map(s => s.h0));
    const X = Math.max(1, vm / g * Math.sqrt(vm * vm + 2 * g * hm)) * 1.05, Y = Math.max(1, hm + vm * vm / (2 * g)) * 1.12;
    const x0 = 56, yb = 336, W = 570, H = 300, sc = Math.min(W / X, H / Y);
    const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))); return [1, 2, 5, 10].map(m => m * p).find(m => v / m <= 6); };
    const dx = nice(W / sc), dy = nice(H / sc);
    ctx.font = '11px IBM Plex Sans, sans-serif'; ctx.fillStyle = C.ink; ctx.strokeStyle = '#e3e8ef'; ctx.lineWidth = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = 0; v * sc <= W; v += dx){ const x = x0 + v * sc; ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, yb - H); ctx.stroke(); ctx.fillText(K.fmt(v, 0), x, yb + 4); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = 0; v * sc <= H; v += dy){ const y = yb - v * sc; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + W, y); ctx.stroke(); ctx.fillText(K.fmt(v, 0), x0 - 6, y); }
    K.text(ctx, 'x (m)', x0 + W, yb + 26, {size: 11, color: C.ink, align: 'right'});
    K.text(ctx, 'y (m)', 8, 14, {size: 11, color: C.ink});
    ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x0 + W, yb); ctx.stroke();
    const P = (x, y) => [x0 + x * sc, yb - y * sc];
    // tour de départ et canon orienté
    if (h0 > 0){ ctx.fillStyle = '#d7dee9'; const [, yt] = P(0, h0); ctx.fillRect(x0 - 14, yt, 14, yb - yt); }
    const [cx, cy] = P(0, h0), r = ang * Math.PI / 180;
    ctx.strokeStyle = C.navy; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 26 * Math.cos(r), cy - 26 * Math.sin(r)); ctx.stroke(); ctx.lineCap = 'butt';
    // parabole théorique (sans frottement) pour les réglages actuels, en pointillés
    const th = rangeTh(v0, ang, h0);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.grey; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i <= 80; i++){ const t = th.T * i / 80, [px, py] = P(v0 * Math.cos(r) * t, h0 + v0 * Math.sin(r) * t - g * t * t / 2); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke(); ctx.setLineDash([]);
    // trajectoires
    const placed = [];
    shots.forEach(s => {
      ctx.strokeStyle = s.col; ctx.lineWidth = 2; ctx.beginPath(); s.trail.forEach(([x, y], i) => { const [px, py] = P(x, y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
      const [px, py] = P(s.x, s.y); ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill();
      if (s.done){ let ly = py - 10; while (placed.some(([qx, qy]) => Math.abs(qx - px) < 26 && Math.abs(qy - ly) < 11)) ly -= 12; placed.push([px, ly]); K.text(ctx, s.a + '°', px, ly, {size: 10, bold: true, color: s.col, align: 'center'}); }
    });
    // vecteurs vitesse et accélération du dernier projectile en vol
    const s = [...shots].reverse().find(q => !q.done);
    if (s){
      const [px, py] = P(s.x, s.y), sv = 55 / Math.max(1, s.v0), sa = 34 / g, [ax, ay] = acc(s, s.vx, s.vy);
      arrow(px, py, px + s.vx * sv, py - s.vy * sv, C.blue); arrow(px, py, px + ax * sa, py - ay * sa, C.red);
      K.text(ctx, 'v', px + s.vx * sv + 5, py - s.vy * sv, {size: 12, bold: true, color: C.blue});
      K.text(ctx, 'a', px + ax * sa + 5, py - ay * sa + 4, {size: 12, bold: true, color: C.red});
    }
    // résultats
    const done = shots.filter(q => q.done), L = done[done.length - 1];
    let h = `<b>Sans frottement</b>, à ${ang}° : portée ${K.fmt(th.R, 1)} m, flèche ${K.fmt(th.H, 1)} m, durée ${K.fmt(th.T, 2)} s (pointillés).<br>`;
    if (L){
      const T = rangeTh(L.v0, L.a, L.h0);
      h += `<b>Dernier tir</b> (${L.a}°${L.mode === 'sans' ? ', sans frottement' : ', frottement ' + (L.mode === 'lin' ? 'linéaire' : 'quadratique')}) : portée <b>${K.fmt(L.x, 1)} m</b>, flèche ${K.fmt(L.ymax, 1)} m, durée ${K.fmt(L.t, 2)} s` +
        (L.mode !== 'sans' ? ` (soit ${Math.round(100 * L.x / T.R)} % de la portée sans frottement).` : '.') + '<br>';
      if (done.length > 1){ const best = done.reduce((a, b) => b.x > a.x ? b : a); h += `Plus longue portée parmi les tirs affichés : ${best.a}°.<br>`; }
    }
    h += mode === 'sans' ? 'Depuis le sol, la portée est maximale à 45° et deux angles complémentaires (30° et 60°) donnent la même portée. L’accélération est toujours g, vers le bas.'
      : 'Avec frottement, l’accélération n’est plus verticale, la trajectoire n’est plus symétrique (descente plus raide) et le meilleur angle est inférieur à 45°.';
    out.innerHTML = h;
  }
  (function loop(now){
    if (!mount.isConnected) return;
    const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now;
    shots.forEach(s => { if (!s.done){ const T = rangeTh(s.v0, 45, s.h0).T, sp = Math.max(0.3, Math.min(4, T / 2.5)); step(s, dt * sp); } });
    draw(); requestAnimationFrame(loop);
  })(performance.now());
};
