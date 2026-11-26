/* Simulation : méthode d'Euler. L'équation différentielle donne la pente en chaque point (champ de pentes) ;
   on avance pas à pas : y(t + Δt) = y(t) + pente × Δt. Comparaison avec la solution exacte. */
window.SIMS['euler'] = function(mount){
  const K = window.SimKit, C = K.C, T = 5;
  const E = {
    charge: ['Charge : τ dy/dt + y = 1 (τ = 1 s)', (y) => 1 - y, (t, y0) => 1 + (y0 - 1) * Math.exp(-t), [-0.6, 2.1]],
    decharge: ['Décharge : τ dy/dt + y = 0 (τ = 1 s)', (y) => -y, (t, y0) => y0 * Math.exp(-t), [-0.6, 2.1]],
    quad: ['Chute, frottement en v² : dv/dt = 1 − v²', (y) => 1 - y * y, (t, y0) => { if (Math.abs(y0) < 1){ const a = Math.atanh(y0); return Math.tanh(t + a); } if (y0 === 1) return 1; const a = Math.atanh(1 / y0); return 1 / Math.tanh(t + a); }, [-0.6, 2.1]]
  };
  let eq = 'charge', y0 = 0, dt = 0.5, nst = 3, run = false, acc = 0, last = 0;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.select(ctr, 'Équation', Object.entries(E).map(([k, v]) => [k, v[0]]), v => { eq = v; nst = 0; draw(); });
  K.slider(ctr, 'Condition initiale y(0)', -0.5, 2, 0.05, y0, v => K.fmt(v, 2), v => { y0 = v; nst = 0; draw(); });
  K.slider(ctr, 'Pas Δt', 0.05, 1, 0.05, dt, v => K.fmt(v, 2) + ' s', v => { dt = v; nst = 0; draw(); });
  const b1 = K.button(ctr, 'Un pas', () => { run = false; bp.textContent = 'Lancer'; if (nst * dt < T - 1e-9) nst++; draw(); });
  const bp = K.button(ctr, 'Lancer', () => { if (nst * dt >= T - 1e-9) nst = 0; run = !run; bp.textContent = run ? 'Pause' : 'Lancer'; });
  K.button(ctr, 'Effacer', () => { run = false; bp.textContent = 'Lancer'; nst = 0; draw(); }, true);
  const out = K.readout(ctr);
  function draw(){
    const [name, f, ex, yr] = E[eq];
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const A = K.axes(ctx, 50, 345, 625, 30, {xmin: 0, xmax: T, ymin: yr[0], ymax: yr[1], xticks: 5, yticks: 6, xfmt: u => K.fmt(u, 0), yfmt: u => K.fmt(u, 1), xlabel: 't (s)'});
    K.text(ctx, name, 60, 16, {size: 12, bold: true, color: C.navy});
    // champ de pentes
    const kx = (A.sx(1) - A.sx(0)), ky = (A.sy(0) - A.sy(1));
    ctx.strokeStyle = '#b8c1cf'; ctx.lineWidth = 1.2;
    for (let i = 0; i <= 20; i++) for (let j = 0; j <= 13; j++){ const t = T * i / 20, y = yr[0] + (yr[1] - yr[0]) * j / 13, s = f(y);
      const dx = kx, dy = -s * ky, L = Math.hypot(dx, dy), h = 9; const X = A.sx(t), Y = A.sy(y);
      ctx.beginPath(); ctx.moveTo(X - h * dx / L, Y - h * dy / L); ctx.lineTo(X + h * dx / L, Y + h * dy / L); ctx.stroke(); }
    // solution exacte
    ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath();
    for (let i = 0; i <= 300; i++){ const t = T * i / 300, y = ex(t, y0); const Y = A.sy(Math.max(yr[0] - 1, Math.min(yr[1] + 1, y))); i ? ctx.lineTo(A.sx(t), Y) : ctx.moveTo(A.sx(t), Y); } ctx.stroke(); ctx.setLineDash([]);
    // Euler
    let t = 0, y = y0; const pts = [[0, y0]];
    for (let k = 0; k < nst; k++){ y = y + f(y) * dt; t = t + dt; pts.push([t, y]); }
    ctx.save(); ctx.beginPath(); ctx.rect(50, 30, 575, 315); ctx.clip();
    ctx.strokeStyle = C.red; ctx.lineWidth = 2.2; ctx.beginPath(); pts.forEach(([u, v], i) => i ? ctx.lineTo(A.sx(u), A.sy(v)) : ctx.moveTo(A.sx(u), A.sy(v))); ctx.stroke();
    ctx.fillStyle = C.red; pts.forEach(([u, v]) => { ctx.beginPath(); ctx.arc(A.sx(u), A.sy(v), 3.5, 0, 7); ctx.fill(); });
    // prochain pas en pointillés
    if (t < T - 1e-9){ const s = f(y); ctx.strokeStyle = C.amber; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(A.sx(t), A.sy(y)); ctx.lineTo(A.sx(t + dt), A.sy(y + s * dt)); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
    K.text(ctx, '— construction d’Euler', 440, 300, {size: 11, bold: true, color: C.red}); K.text(ctx, '- - solution exacte', 440, 316, {size: 11, bold: true, color: C.green}); K.text(ctx, 'traits gris : pente imposée', 440, 332, {size: 11, color: C.ink});
    const err = y - ex(t, y0);
    out.innerHTML = `Pas effectués : ${nst}<br>t = ${K.fmt(t, 2)} s<br>Pente actuelle : ${K.fmt(f(y), 3)}<br>y (Euler) = <b>${K.fmt(y, 3)}</b><br>y (exact) = <b>${K.fmt(ex(t, y0), 3)}</b><br>Erreur : ${K.fmt(err, 3)}`;
  }
  draw();
  (function loop(now){ if (!mount.isConnected) return; const d = last ? (now - last) / 1000 : 0; last = now;
    if (run){ acc += d; if (acc > 0.35){ acc = 0; if (nst * dt < T - 1e-9){ nst++; draw(); } else { run = false; bp.textContent = 'Lancer'; } } } requestAnimationFrame(loop); })(performance.now());
};
