/* Simulation : onde stationnaire sur une corde. Mode « incidente + réfléchie » : une onde vers la droite se réfléchit
   sur l'extrémité fixe (x = L) avec changement de signe ; on trace les deux ondes et leur somme. Mode « modes propres » :
   corde fixée aux deux bouts, mode n, f_n = n v / 2L avec v = sqrt(T/μ). */
window.SIMS['stationnaire'] = function(mount){
  const K = window.SimKit, C = K.C;
  let mode = 'modes', n = 2, Tn = 50, mu = 1.0, L = 0.65, t = 0, running = true, lamRel = 0.5;   // N, g/m, m
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.select(ctr, 'Affichage', [['modes', 'modes propres de la corde fixée aux deux bouts'], ['sup', 'onde incidente + onde réfléchie']], v => { mode = v; t = 0; });
  K.slider(ctr, 'Mode n (nombre de fuseaux)', 1, 6, 1, n, x => x, x => { n = x; });
  K.slider(ctr, 'Tension T', 10, 200, 5, Tn, x => x + ' N', x => { Tn = x; });
  K.slider(ctr, 'Masse linéique μ', 0.2, 5, 0.1, mu, x => K.fmt(x, 1) + ' g/m', x => { mu = x; });
  K.slider(ctr, 'Longueur L', 0.3, 1.0, 0.05, L, x => K.fmt(x, 2) + ' m', x => { L = x; });
  const bp = K.button(ctr, 'Pause', () => { running = !running; bp.textContent = running ? 'Pause' : 'Reprendre'; }, true);
  const out = K.readout(ctr);
  let last = performance.now();
  function draw(now){
    if (!mount.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; if (running) t += dt;
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const v = Math.sqrt(Tn / (mu / 1000)), x0 = 60, x1 = 600, px = (x1 - x0) / L, A = 70;
    if (mode === 'modes'){
      const yc = 170, lam = 2 * L / n, f = n * v / (2 * L), w = 2 * Math.PI * 1.2;   // animation lente (1,2 Hz)
      ctx.strokeStyle = C.ink; ctx.lineWidth = 4; [[x0, yc], [x1, yc]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x, y + 30); ctx.stroke(); });
      ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = 1; [1, -1].forEach(s => { ctx.beginPath(); for (let i = 0; i <= 200; i++){ const x = L * i / 200; const X = x0 + x * px, Y = yc - s * A * Math.sin(n * Math.PI * x / L); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); });
      ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 200; i++){ const x = L * i / 200; const X = x0 + x * px, Y = yc - A * Math.sin(n * Math.PI * x / L) * Math.cos(w * t); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
      for (let k = 0; k <= n; k++){ const X = x0 + k * lam / 2 * px; ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(X, yc, 4, 0, 7); ctx.fill(); if (k === 0) K.text(ctx, 'nœuds', X + 8, yc + 16, {size: 11, bold: true, color: C.red}); }
      for (let k = 0; k < n; k++){ const X = x0 + (k + 0.5) * lam / 2 * px; K.text(ctx, k === 0 ? 'ventre' : '', X, yc - A - 12, {size: 11, bold: true, color: C.blue, align: 'center'}); }
      ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, 290); ctx.lineTo(x0 + lam * px, 290); ctx.stroke(); [x0, x0 + lam * px].forEach(X => { ctx.beginPath(); ctx.moveTo(X, 284); ctx.lineTo(X, 296); ctx.stroke(); });
      K.text(ctx, 'λ = 2L/n = ' + K.fmt(lam * 100, 1) + ' cm', x0 + lam * px / 2, 308, {size: 12, bold: true, color: C.amber, align: 'center'});
      K.text(ctx, 'Mode n = ' + n + ' : L = n λ/2, tous les points vibrent en phase (ou en opposition), amplitude fixe en chaque point', 60, 30, {size: 11, color: C.ink});
      K.text(ctx, '(animation ralentie : la vraie fréquence est ' + K.fmt(f, 0) + ' Hz)', 60, 48, {size: 11, color: C.ink});
      out.innerHTML = `v = √(T/μ) = <b>${K.fmt(v, 0)} m/s</b><br>f_n = n v / 2L = <b>${K.fmt(f, 1)} Hz</b> (f₁ = ${K.fmt(v / (2 * L), 1)} Hz)<br>λ = 2L/n = ${K.fmt(lam * 100, 1)} cm ; ${n + 1} nœuds, ${n} ventres<br>Tendre la corde ou la raccourcir → plus aigu.`;
    } else {
      const lam = lamRel * L, k = 2 * Math.PI / lam, w = 2 * Math.PI * 0.6;
      const inc = x => 0.5 * A * Math.cos(w * t - k * (x - L)), ref = x => -0.5 * A * Math.cos(w * t + k * (x - L));
      const panel = (yc, fn, col, lab, wd) => { ctx.strokeStyle = '#8a94a6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, yc); ctx.lineTo(x1, yc); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); for (let i = 0; i <= 240; i++){ const x = L * i / 240; const X = x0 + x * px, Y = yc - fn(x); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); K.text(ctx, lab, x0, yc - 44, {size: 11, bold: true, color: col}); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, yc - 25); ctx.lineTo(x1, yc + 25); ctx.stroke(); };
      panel(80, inc, C.blue, 'onde incidente, vers la droite →', 1.5);
      panel(190, ref, C.green, '← onde réfléchie sur l’extrémité fixe (signe changé)', 1.5);
      panel(310, x => inc(x) + ref(x), C.ink, 'somme : onde stationnaire, nœuds tous les λ/2 (dont l’extrémité fixe)', 3);
      for (let m = 0; m * lam / 2 <= L + 1e-9; m++){ const X = x1 - m * lam / 2 * px; if (X < x0 - 1) break; ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(X, 310, 4, 0, 7); ctx.fill(); }
      out.innerHTML = `cos(ωt − kx) + cos(ωt + kx + π) → 2 sin(kx′) sin(ωt)<br>Nœuds : x′ = 0, λ/2, λ… depuis l’extrémité fixe<br>Ventres entre deux nœuds (amplitude double)<br>λ = ${K.fmt(lam * 100, 1)} cm ici (fixée pour l’illustration)<br>Il n’y a plus de propagation : l’énergie reste sur place.`;
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
};
