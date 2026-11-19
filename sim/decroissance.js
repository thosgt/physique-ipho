/* Simulation : décroissance radioactive aléatoire. N0 noyaux sur une grille ; à chaque pas dt, chaque noyau restant se
   désintègre avec la probabilité λ dt. Comparaison avec N0 e^(−λt). Le temps est mesuré en demi-vies. */
window.SIMS['decroissance'] = function(mount){
  const K = window.SimKit, C = K.C;
  let N0 = 400, alive = [], t = 0, running = false, hist = [];
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.select(ctr, 'Nombre initial de noyaux', [['400', '400'], ['25', '25'], ['100', '100'], ['2500', '2 500'], ['10000', '10 000']], v => { N0 = +v; reset(); });
  const bs = K.button(ctr, '▶ Démarrer', () => { running = !running; bs.textContent = running ? 'Pause' : '▶ Reprendre'; });
  K.button(ctr, 'Nouveau tirage', reset, true);
  const out = K.readout(ctr);
  function reset(){ alive = new Array(N0).fill(true); t = 0; hist = [[0, N0]]; running = false; bs.textContent = '▶ Démarrer'; draw(); }
  const lam = Math.LN2;   // par demi-vie
  let last = performance.now();
  function loop(now){
    if (!mount.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000) * 0.8; last = now;
    if (running && t < 6){ const p = 1 - Math.exp(-lam * dt); for (let i = 0; i < alive.length; i++) if (alive[i] && Math.random() < p) alive[i] = false; t += dt; hist.push([t, alive.filter(Boolean).length]); if (t >= 6){ running = false; bs.textContent = 'Terminé'; } draw(); }
    requestAnimationFrame(loop);
  }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const n = alive.length, side = Math.ceil(Math.sqrt(n)), cell = Math.min(14, 240 / side);
    for (let i = 0; i < n; i++){ const x = 20 + (i % side) * cell, y = 40 + Math.floor(i / side) * cell; ctx.fillStyle = alive[i] ? C.amber : '#dfe4ec'; ctx.fillRect(x, y, Math.max(1, cell - (cell > 3 ? 1 : 0)), Math.max(1, cell - (cell > 3 ? 1 : 0))); }
    K.text(ctx, 'noyaux : orange = non désintégré', 20, 26, {size: 11, bold: true, color: C.ink});
    const A = K.axes(ctx, 320, 320, 620, 30, {xmin: 0, xmax: 6, ymin: 0, ymax: N0, xticks: 6, yticks: 4, xfmt: v => K.fmt(v, 0), yfmt: v => K.fmt(v, 0), xlabel: 't / t₁/₂'});
    ctx.strokeStyle = C.red; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= 120; i++){ const tt = 6 * i / 120; const X = A.sx(tt), Y = A.sy(N0 * Math.pow(2, -tt)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); hist.forEach(([tt, nn], i) => { const X = A.sx(tt), Y = A.sy(nn); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke();
    K.text(ctx, '— simulation', 470, 46, {size: 11, bold: true, color: C.blue}); K.text(ctx, '- - N₀ e^(−λt)', 470, 62, {size: 11, bold: true, color: C.red});
    const N = alive.filter(Boolean).length, th = N0 * Math.pow(2, -t);
    out.innerHTML = `t = ${K.fmt(t, 2)} t₁/₂<br>Restants : <b>${N}</b> (loi exponentielle : ${K.fmt(th, 1)})<br>Écart : ${K.fmt(N - th, 1)} ; fluctuation attendue ≈ √(N p(1−p)) = ${K.fmt(Math.sqrt(N0 * Math.pow(2, -t) * (1 - Math.pow(2, -t))), 1)}<br>Chaque noyau : probabilité ½ de survivre à chaque demi-vie, sans mémoire de son âge.`;
  }
  reset(); requestAnimationFrame(loop);
};
