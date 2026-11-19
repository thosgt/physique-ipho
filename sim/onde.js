/* Simulation : onde progressive sinusoïdale s(x,t) = A cos(ωt − kx). Deux points marqués M₁ (x = 0) et M₂ (x = d) : on lit leur déphasage 2πd/λ. */
window.SIMS['onde'] = function(mount){
  const K = window.SimKit, C = K.C;
  let f = 2, v = 4, d = 1.0, t = 0, running = true;     // Hz, m/s, m
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Fréquence f', 0.5, 5, 0.1, f, x => K.fmt(x, 1) + ' Hz', x => { f = x; });
  K.slider(ctr, 'Célérité v', 1, 8, 0.1, v, x => K.fmt(x, 1) + ' m/s', x => { v = x; });
  K.slider(ctr, 'Distance d entre M₁ et M₂', 0.1, 4, 0.05, d, x => K.fmt(x, 2) + ' m', x => { d = x; });
  const bp = K.button(ctr, 'Pause', () => { running = !running; bp.textContent = running ? 'Pause' : 'Reprendre'; }, true);
  const out = K.readout(ctr);
  const hist = [];
  let last = performance.now();
  function draw(now){
    if (!mount.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; if (running) t += dt * 0.25;   // ralenti ×4
    const lam = v / f, A = 50, y0 = 110, x0 = 40, L = 560, sc = L / 5;      // 5 m visibles
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    ctx.strokeStyle = '#8a94a6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + L, y0); ctx.stroke();
    for (let m = 0; m <= 5; m++){ ctx.beginPath(); ctx.moveTo(x0 + m * sc, y0 - 4); ctx.lineTo(x0 + m * sc, y0 + 4); ctx.stroke(); K.text(ctx, m + ' m', x0 + m * sc, y0 + 70, {size: 10, align: 'center', color: C.ink}); }
    const s = x => A * Math.cos(2 * Math.PI * (f * t - x / lam));
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 280; i++){ const x = 5 * i / 280; const X = x0 + x * sc, Y = y0 - s(x); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
    // longueur d'onde
    const xc = ((f * t) % 1) * lam; let xa = xc; while (xa > lam) xa -= lam;
    ctx.strokeStyle = C.red; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + xa * sc, y0 - A - 14); ctx.lineTo(x0 + (xa + lam) * sc, y0 - A - 14); ctx.stroke();
    K.text(ctx, 'λ = v/f = ' + K.fmt(lam, 2) + ' m', x0 + (xa + lam / 2) * sc, y0 - A - 24, {size: 11, bold: true, color: C.red, align: 'center'});
    // points M1 et M2
    const pt = (x, col, lab) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0 + x * sc, y0 - s(x), 6, 0, 7); ctx.fill(); K.text(ctx, lab, x0 + x * sc, y0 + 82, {size: 11, bold: true, color: col, align: 'center'}); };
    pt(1, C.green, 'M₁'); pt(1 + d, C.amber, 'M₂');
    // historique des deux signaux
    hist.push([s(1), s(1 + d)]); if (hist.length > 280) hist.shift();
    const y1 = 290; ctx.strokeStyle = '#8a94a6'; ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0 + L, y1); ctx.stroke();
    K.text(ctx, 'signaux en M₁ et M₂ au cours du temps →', x0, y1 - 62, {size: 11, color: C.ink});
    [[0, C.green], [1, C.amber]].forEach(([k, col]) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); hist.forEach((h, i) => { const X = x0 + L - (hist.length - i) * 2, Y = y1 - h[k] * 0.8; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); });
    const dphi = 2 * Math.PI * d / lam, r = ((d / lam) % 1 + 1) % 1;
    out.innerHTML = `T = 1/f = ${K.fmt(1 / f, 2)} s ; λ = vT = <b>${K.fmt(lam, 2)} m</b><br>k = 2π/λ = ${K.fmt(2 * Math.PI / lam, 2)} rad/m<br>Retard de M₂ sur M₁ : τ = d/v = ${K.fmt(d / v, 3)} s<br>Déphasage 2πd/λ = ${K.fmt(dphi, 2)} rad = ${K.fmt(d / lam, 2)} × 2π<br>${r < 0.03 || r > 0.97 ? '<b>En phase</b> (d = pλ)' : Math.abs(r - 0.5) < 0.03 ? '<b>En opposition de phase</b> (d = (p+½)λ)' : 'ni en phase ni en opposition'}<br>(animation ralentie 4 fois)`;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
};
