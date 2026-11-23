/* Simulation : pendule simple aux grands angles, comparé au modèle linéarisé (sin(theta) ≈ theta).
   Période exacte T = T0 × 2K(sin(theta0/2))/pi (K : intégrale elliptique complète), T0 = 2 pi sqrt(l/g) ;
   développement : T ≈ T0 (1 + theta0²/16). L'isochronisme n'est vrai qu'aux petits angles. */
window.SIMS['pendule-grand-angle'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81, l = 1, w0 = Math.sqrt(g / l), T0 = 2 * Math.PI / w0;
  let th0 = 60, th = 0, om = 0, t = 0, run = false, hist = [], last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  K.slider(ctr, 'Amplitude θ₀', 5, 175, 1, th0, v => v + '°', v => { th0 = v; reset(); });
  K.button(ctr, '▶ Lâcher les deux pendules', () => { reset(); run = true; });
  K.button(ctr, 'Pause / reprise', () => { run = !run; }, true);
  const out = K.readout(ctr);
  const agm = (a, b) => { for (let i = 0; i < 30; i++){ const c = (a + b) / 2; b = Math.sqrt(a * b); a = c; } return a; };
  const ratio = d => { const k = Math.sin(d * Math.PI / 360); return 1 / agm(1, Math.sqrt(1 - k * k)); };     // T/T0 = 2K/pi = 1/AGM
  function reset(){ run = false; t = 0; th = th0 * Math.PI / 180; om = 0; hist = []; }
  reset();
  function step(dt){
    const n = 30, h = dt / n;
    for (let i = 0; i < n; i++){ const k1 = -w0 * w0 * Math.sin(th), k2 = -w0 * w0 * Math.sin(th + om * h / 2); th += (om + k1 * h / 2) * h; om += k2 * h; t += h; }
    hist.push([t, th, th0 * Math.PI / 180 * Math.cos(w0 * t)]); while (hist.length && hist[0][0] < t - 3 * T0) hist.shift();
  }
  function pend(cx, cy, a, col, lab){
    const L = 95, bx = cx + L * Math.sin(a), by = cy + L * Math.cos(a);
    ctx.fillStyle = C.navy; ctx.fillRect(cx - 18, cy - 5, 36, 5);
    ctx.strokeStyle = '#e3e8ef'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, L, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, 9, 0, 7); ctx.fill();
    K.text(ctx, lab, cx, cy + L + 26, {size: 11, bold: true, color: col, align: 'center'});
  }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const lin = th0 * Math.PI / 180 * Math.cos(w0 * t);
    pend(110, 110, th, C.red, 'pendule réel'); pend(320, 110, run || t > 0 ? lin : th0 * Math.PI / 180, C.blue, 'modèle linéaire');
    // T/T0 en fonction de l'amplitude
    const ax = K.axes(ctx, 450, 230, 628, 30, {xmin: 0, xmax: 180, ymin: 1, ymax: 3, xticks: [0, 45, 90, 135, 180], yticks: [1, 1.5, 2, 2.5, 3], xfmt: v => v + '°', yfmt: v => K.fmt(v, 1)});
    K.text(ctx, 'T / T₀', 452, 18, {size: 11, color: C.ink});
    ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 1; i <= 178; i++){ const X = ax.sx(i), Y = ax.sy(Math.min(3, ratio(i))); i > 1 ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
    ctx.strokeStyle = C.grey; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i <= 180; i += 2){ const r = Math.min(3, 1 + (i * Math.PI / 180) ** 2 / 16), X = ax.sx(i), Y = ax.sy(r); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(ax.sx(th0), ax.sy(Math.min(3, ratio(th0))), 5, 0, 7); ctx.fill();
    K.text(ctx, '1 + θ₀²/16', ax.sx(150), ax.sy(2.25), {size: 10, color: C.grey, align: 'center'});
    // theta(t)
    const g0 = K.axes(ctx, 50, 380, 628, 280, {xmin: Math.max(0, t - 3 * T0), xmax: Math.max(3 * T0, t), ymin: -180, ymax: 180, xticks: 3, yticks: [-180, 0, 180], xfmt: v => K.fmt(v, 0) + ' s', yfmt: v => v + '°', grid: false});
    K.text(ctx, 'θ(t)', 56, 274, {size: 11, color: C.ink});
    [[1, C.red], [2, C.blue]].forEach(([j, col]) => { ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath(); hist.forEach((p, i) => { const X = g0.sx(p[0]), Y = g0.sy(p[j] * 180 / Math.PI); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); });
    const r = ratio(th0);
    out.innerHTML = `Petits angles : T₀ = 2π√(ℓ/g) = ${K.fmt(T0, 3)} s pour ℓ = 1 m.<br>Amplitude ${th0}° : <b>T = ${K.fmt(r * T0, 3)} s</b>, soit T₀ × ${K.fmt(r, 3)} (approximation 1 + θ₀²/16 : × ${K.fmt(1 + (th0 * Math.PI / 180) ** 2 / 16, 3)}).<br>` +
      `L’écart dépasse 1 % vers 23° et 5 % vers 50° : en dessous de 20°, on peut considérer le pendule comme isochrone. Près de 180°, le pendule s’attarde en haut et la période diverge.`;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) step(dt); draw(); requestAnimationFrame(loop); })(performance.now());
};
