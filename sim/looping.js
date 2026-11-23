/* Simulation : bille (point matériel, qui glisse) lâchée sur une rampe suivie d'un looping de rayon R = 1 m.
   Sans frottement : v² = 2 g (h - z) ; au point d'angle phi du looping (0 en bas), N/m = v²/R + g cos(phi).
   Le passage au sommet exige N >= 0, soit v² >= g R en haut, d'où h >= 5R/2. Si N s'annule avant, la bille décolle et suit une parabole.
   Frottement solide optionnel : f = mu N, qui dissipe de l'énergie. */
window.SIMS['looping'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81, R = 1;
  let h = 2.7, mu = 0, run = false, last = null;
  let ph = 'ramp', s = 0, v = 0, x = 0, y = 0, vx = 0, vy = 0, Q = 0, msg = '', trail = [], Nnow = 0, Lr = 2, tab = [], Sr = 0;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Hauteur de départ h', 1, 4.5, 0.05, h, v_ => K.fmt(v_, 2) + ' m = ' + K.fmt(v_ / R, 2) + ' R', v_ => { h = v_; reset(); });
  K.slider(ctr, 'Frottement μ', 0, 0.3, 0.01, mu, v_ => v_ === 0 ? '0 (aucun)' : K.fmt(v_, 2), v_ => { mu = v_; reset(); });
  K.button(ctr, '▶ Lâcher la bille', () => { reset(); run = true; });
  K.button(ctr, 'h = 5R/2 (limite sans frottement)', () => { h = 2.5; hS.value = 2.5; reset(); run = true; }, true);
  const out = K.readout(ctr);
  const hS = ctr.querySelector('input');
  // rampe parabolique y = h (x/Lr)², x de -Lr à 0 ; table abscisse curviligne (s < 0) -> point
  function build(){
    Lr = Math.max(2, 1.4 * h); tab = []; const N = 600; let acc = 0, px = -Lr, py = h;
    tab.push([0, -Lr, h]);
    for (let i = 1; i <= N; i++){ const xx = -Lr + Lr * i / N, yy = h * (xx / Lr) ** 2; acc += Math.hypot(xx - px, yy - py); tab.push([acc, xx, yy]); px = xx; py = yy; }
    Sr = acc;                         // longueur de la rampe ; s = abscisse - Sr (négatif sur la rampe)
  }
  function rampAt(sv){                // sv dans [-Sr, 0]
    const u = sv + Sr; let lo = 0, hi = tab.length - 1;
    while (hi - lo > 1){ const m = (lo + hi) >> 1; if (tab[m][0] < u) lo = m; else hi = m; }
    const f = (u - tab[lo][0]) / Math.max(1e-9, tab[hi][0] - tab[lo][0]), xx = tab[lo][1] + f * (tab[hi][1] - tab[lo][1]);
    const yp = 2 * h * xx / (Lr * Lr), ypp = 2 * h / (Lr * Lr);
    return {x: xx, y: h * (xx / Lr) ** 2, th: Math.atan(yp), k: ypp / Math.pow(1 + yp * yp, 1.5)};
  }
  function reset(){ build(); run = false; ph = 'ramp'; s = -Sr + 1e-4; v = 0; Q = 0; msg = ''; trail = []; Nnow = 0; }
  reset();
  function geom(){        // position, angle de la tangente (sens de parcours), courbure vers l'intérieur
    if (ph === 'ramp'){ const r = rampAt(Math.max(-Sr, Math.min(0, s))); return r; }
    if (ph === 'loop'){ const p = s / R; return {x: R * Math.sin(p), y: R - R * Math.cos(p), th: p, k: 1 / R}; }
    return {x: s - 2 * Math.PI * R, y: 0, th: 0, k: 0};
  }
  function step(dt){
    const n = 60, hh = dt / n;
    for (let i = 0; i < n && run; i++){
      if (ph === 'air'){
        x += vx * hh; y += vy * hh - g * hh * hh / 2; vy -= g * hh; trail.push([x, y]);
        if (Math.hypot(x, y - R) >= R && y > 0.02 && trail.length > 5){ run = false; msg = 'La bille retombe sur la piste du looping : elle a décroché avant le sommet (N = 0).'; }
        if (y <= 0){ y = 0; run = false; msg = 'La bille est retombée au sol.'; }
        continue;
      }
      const G = geom();
      const N = g * Math.cos(G.th) + v * v * G.k;                  // N/m (courbure vers le haut ou vers le centre)
      Nnow = N;
      if (ph === 'loop' && N < -0.01 * g){
        ph = 'air'; x = G.x; y = G.y; vx = v * Math.cos(G.th); vy = v * Math.sin(G.th); trail = [[x, y]];
        msg = `Décrochage à ${Math.round(G.th * 180 / Math.PI)}° du bas du looping (hauteur ${K.fmt(G.y, 2)} m) : N s’annule, la bille suit une parabole.`; continue;
      }
      const at = -g * Math.sin(G.th);
      const fr = mu * Math.max(0, N);
      if (Math.abs(v) < 1e-3 && Math.abs(at) <= fr){ v = 0; run = false; msg = 'La bille s’arrête : le frottement statique la retient.'; break; }
      const a = at - fr * (v > 0 ? 1 : v < 0 ? -1 : Math.sign(at));
      const nv = v + a * hh;
      Q += fr * Math.abs(v) * hh;                                   // énergie dissipée par unité de masse
      if (v !== 0 && Math.sign(nv) !== Math.sign(v) && mu > 0 && Math.abs(at) <= fr){ v = 0; } else v = nv;
      s += v * hh;
      if (ph === 'ramp' && s >= 0){ ph = 'loop'; }
      if (ph === 'loop' && s < 0){ ph = 'ramp'; }
      if (ph === 'loop' && s >= 2 * Math.PI * R){ ph = 'flat'; }
      if (ph === 'ramp' && s <= -Sr){ s = -Sr; v = 0; }
      if (ph === 'flat' && s > 2 * Math.PI * R + 2.5){ run = false; msg = 'La bille a fait le tour du looping et repart.'; }
    }
  }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const xmin = -Lr - 0.2, xmax = 2.8, ymax = Math.max(h, 2 * R) + 0.25, W = 430, H = 330, sc = Math.min(W / (xmax - xmin), H / (ymax + 0.15));
    const P = (a, b) => [10 + (a - xmin) * sc, 350 - b * sc];
    // piste
    ctx.strokeStyle = C.navy; ctx.lineWidth = 4; ctx.beginPath();
    tab.forEach(([, a, b], i) => { const [X, Y] = P(a, b); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke();
    const [cx, cy] = P(0, R); ctx.beginPath(); ctx.arc(cx, cy, R * sc, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...P(0, 0)); ctx.lineTo(...P(xmax, 0)); ctx.stroke();
    // hauteur de départ et 5R/2
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.moveTo(...P(xmin, 2.5 * R)); ctx.lineTo(...P(xmax, 2.5 * R)); ctx.stroke();
    ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.moveTo(...P(xmin, h)); ctx.lineTo(...P(xmax, h)); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, '5R/2', P(xmax, 2.5 * R)[0] - 2, P(0, 2.5 * R)[1] - 8, {size: 11, color: C.amber, align: 'right'});
    K.text(ctx, 'h', P(xmax, h)[0] - 2, P(0, h)[1] + (Math.abs(h - 2.5) < 0.15 ? 10 : -8), {size: 11, color: C.ink, align: 'right'});
    if (trail.length > 1){ ctx.strokeStyle = C.red; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); trail.forEach(([a, b], i) => { const [X, Y] = P(a, b); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); ctx.setLineDash([]); }
    const G = ph === 'air' ? {x, y} : geom();
    const [bx, by] = P(G.x, G.y);
    // la bille est dessinée du côté intérieur de la piste
    let ox = 0, oy = 0; if (ph !== 'air'){ const th = G.th; ox = -Math.sin(th) * 8; oy = -Math.cos(th) * 8; }
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(bx + ox, by + oy, 8, 0, 7); ctx.fill();
    // barres d'énergie (par unité de masse, en J/kg)
    const vv = ph === 'air' ? Math.hypot(vx, vy) : Math.abs(v), Ec = vv * vv / 2, Ep = g * G.y, Etot = g * h;
    const bx0 = 470, by0 = 330, bw = 34, bh = 260, scE = bh / Etot;
    const bars = [['Ec', Ec, C.blue], ['Ep', Ep, C.green], ['chaleur', Q, C.red]];
    bars.forEach(([lab, val, col], k) => { const X = bx0 + k * (bw + 14); ctx.fillStyle = '#eef2f7'; ctx.fillRect(X, by0 - bh, bw, bh); ctx.fillStyle = col; const hh = Math.min(bh, val * scE); ctx.fillRect(X, by0 - hh, bw, hh); K.text(ctx, lab, X + bw / 2, by0 + 12, {size: 11, color: C.ink, align: 'center'}); });
    ctx.strokeStyle = C.navy; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(bx0 - 4, by0 - bh); ctx.lineTo(bx0 + 3 * (bw + 14), by0 - bh); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, 'énergie initiale m g h', bx0 - 4, by0 - bh - 12, {size: 11, color: C.navy});
    // texte
    let t = `Hauteur de départ h = ${K.fmt(h / R, 2)} R. Sans frottement, il faut h ≥ 5R/2 pour passer le sommet sans décoller (N ≥ 0 en haut, donc v² ≥ g R).<br>`;
    if (ph !== 'air') t += `Réaction du rail : <b>N = ${K.fmt(Nnow / g, 2)} m g</b>${ph === 'loop' ? ' (N/m = v²/R + g cos φ)' : ''} ; vitesse ${K.fmt(vv, 2)} m/s.<br>`;
    if (mu > 0) t += `Énergie dissipée par le frottement : ${K.fmt(Q / Etot * 100, 0)} % de m g h : il faut partir plus haut que 5R/2.<br>`;
    if (msg) t += '<b>' + msg + '</b>';
    out.innerHTML = t;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) step(dt * 0.8); draw(); requestAnimationFrame(loop); })(performance.now());
};
