/* Simulation : oscillateur forcé, x'' + (omega0/Q) x' + omega0² x = (F0/m) cos(omega t), parti du repos.
   Régime permanent : amplitude X = (F0/m) / sqrt((omega0² - omega²)² + (omega omega0 / Q)²), retard de phase phi = atan2(omega omega0/Q, omega0² - omega²).
   Le régime transitoire dure environ 2Q/omega0. À la résonance (omega ≈ omega0) : X ≈ Q F0/k, phi = 90°. */
window.SIMS['resonance'] = function(mount){
  const K = window.SimKit, C = K.C, w0 = 2 * Math.PI;
  let r = 0.8, Q = 8, x = 0, v = 0, t = 0, hist = [], last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 420);
  K.slider(ctr, 'Pulsation imposée ω / ω₀', 0.1, 3, 0.01, r, u => K.fmt(u, 2), u => { r = u; });
  K.slider(ctr, 'Facteur de qualité Q', -0.3, 1.6, 0.01, Math.log10(Q), u => K.fmt(Math.pow(10, u), 1), u => { Q = Math.pow(10, u); });
  K.button(ctr, 'Repartir du repos', () => { x = 0; v = 0; t = 0; hist = []; });
  K.button(ctr, 'Se placer à la résonance', () => { r = 1; ctr.querySelector('input').value = 1; ctr.querySelector('input').dispatchEvent(new Event('input')); }, true);
  const out = K.readout(ctr);
  const amp = (rr, q) => 1 / Math.sqrt((1 - rr * rr) ** 2 + (rr / q) ** 2);         // en unités de F0/k
  const phase = (rr, q) => Math.atan2(rr / q, 1 - rr * rr);
  function step(dt){
    const n = 40, h = dt / n, w = r * w0;
    for (let i = 0; i < n; i++){
      const f = (xx, vv, tt) => w0 * w0 * Math.cos(w * tt) - (w0 / Q) * vv - w0 * w0 * xx;     // F0/m = w0² (x en unités de F0/k)
      const a1 = f(x, v, t), x2 = x + v * h / 2, v2 = v + a1 * h / 2, a2 = f(x2, v2, t + h / 2);
      x += v2 * h; v += a2 * h; t += h;
    }
    hist.push([t, x, Math.cos(w * t)]); while (hist.length && hist[0][0] < t - 6) hist.shift();
  }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const Xmax = Math.max(1.2, 1.1 * amp(r, Q), 1.1 * Math.max(0, ...hist.map(p => Math.abs(p[1])))), sc = 70 / Xmax;
    // masse forcée
    const xe = 200, yb = 70, px = xe + x * sc;
    ctx.fillStyle = C.navy; ctx.fillRect(40, yb - 40, 8, 60);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(48, yb - 10); const L = px - 20 - 48; for (let i = 1; i < 12; i++) ctx.lineTo(48 + L * i / 12, yb - 10 + (i % 2 ? -6 : 6)); ctx.lineTo(px - 20, yb - 10); ctx.stroke();
    ctx.fillStyle = C.blue; ctx.fillRect(px - 20, yb - 30, 40, 40);
    const F = Math.cos(r * w0 * t), fl = F * 40;
    ctx.strokeStyle = C.red; ctx.fillStyle = C.red; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px, yb + 22); ctx.lineTo(px + fl, yb + 22); ctx.stroke();
    if (Math.abs(fl) > 6){ const s = Math.sign(fl); ctx.beginPath(); ctx.moveTo(px + fl, yb + 22); ctx.lineTo(px + fl - 8 * s, yb + 17); ctx.lineTo(px + fl - 8 * s, yb + 27); ctx.closePath(); ctx.fill(); }
    K.text(ctx, 'F(t)', px + fl + (fl >= 0 ? 6 : -30), yb + 22, {size: 11, color: C.red});
    ctx.setLineDash([3, 3]); ctx.strokeStyle = C.green; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xe, yb - 46); ctx.lineTo(xe, yb + 34); ctx.stroke(); ctx.setLineDash([]);
    // x(t) et F(t)
    const g = K.axes(ctx, 50, 230, 400, 130, {xmin: Math.max(0, t - 6), xmax: Math.max(6, t), ymin: -Xmax, ymax: Xmax, xticks: 3, yticks: [-Xmax, 0, Xmax], xfmt: u => K.fmt(u, 0) + ' s', yfmt: u => u === 0 ? '0' : '', grid: false});
    ctx.strokeStyle = C.red; ctx.lineWidth = 1.3; ctx.beginPath(); hist.forEach((p, i) => i ? ctx.lineTo(g.sx(p[0]), g.sy(p[2])) : ctx.moveTo(g.sx(p[0]), g.sy(p[2]))); ctx.stroke();
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); hist.forEach((p, i) => i ? ctx.lineTo(g.sx(p[0]), g.sy(p[1])) : ctx.moveTo(g.sx(p[0]), g.sy(p[1]))); ctx.stroke();
    K.text(ctx, 'x(t)', 56, 122, {size: 11, bold: true, color: C.blue}); K.text(ctx, 'F(t) / k', 96, 122, {size: 11, bold: true, color: C.red});
    // courbe de résonance et phase
    const Amax = Math.max(2, amp(1, Q) * 1.15);
    const ga = K.axes(ctx, 460, 190, 628, 40, {xmin: 0, xmax: 3, ymin: 0, ymax: Amax, xticks: [0, 1, 2, 3], yticks: [0, 1, Math.round(Amax)], xfmt: u => u, yfmt: u => u, grid: true});
    K.text(ctx, 'amplitude X k / F₀', 462, 28, {size: 10, color: C.ink});
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 1; i <= 300; i++){ const rr = 3 * i / 300; i > 1 ? ctx.lineTo(ga.sx(rr), ga.sy(Math.min(Amax, amp(rr, Q)))) : ctx.moveTo(ga.sx(rr), ga.sy(Math.min(Amax, amp(rr, Q)))); } ctx.stroke();
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(ga.sx(r), ga.sy(Math.min(Amax, amp(r, Q))), 5, 0, 7); ctx.fill();
    const gp = K.axes(ctx, 460, 390, 628, 250, {xmin: 0, xmax: 3, ymin: 0, ymax: 180, xticks: [0, 1, 2, 3], yticks: [0, 90, 180], xfmt: u => u === 3 ? 'ω/ω₀ 3' : u, yfmt: u => u + '°', grid: true});
    K.text(ctx, 'retard de phase φ', 462, 238, {size: 10, color: C.ink});
    ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 300; i++){ const rr = 3 * i / 300; i ? ctx.lineTo(gp.sx(rr), gp.sy(phase(rr, Q) * 180 / Math.PI)) : ctx.moveTo(gp.sx(rr), gp.sy(0)); } ctx.stroke();
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(gp.sx(r), gp.sy(phase(r, Q) * 180 / Math.PI), 5, 0, 7); ctx.fill();
    // régime transitoire
    const tau = 2 * Q / w0;
    K.text(ctx, t < 3 * tau ? `régime transitoire (dure ~ 2Q/ω₀ = ${K.fmt(tau, 1)} s)` : 'régime permanent', 50, 260, {size: 11, color: t < 3 * tau ? C.amber : C.green});
    const A = amp(r, Q), ph = phase(r, Q) * 180 / Math.PI;
    out.innerHTML = `Régime permanent : x oscille à la pulsation imposée ω, avec l’amplitude <b>X = ${K.fmt(A, 2)} F₀/k</b> et un retard de phase <b>φ = ${Math.round(ph)}°</b> sur la force.<br>` +
      (r < 0.5 ? 'ω ≪ ω₀ : la masse suit la force (X ≈ F₀/k, en phase).' : r > 1.6 ? 'ω ≫ ω₀ : la masse ne suit plus (X ≈ F₀/mω²), en opposition de phase.' : Math.abs(r - 1) < 0.08 ? `Résonance : X ≈ Q F₀/k = ${K.fmt(Q, 1)} F₀/k, φ = 90° (la vitesse est en phase avec la force, qui fournit le maximum de puissance).` : 'Au voisinage de la résonance, l’amplitude dépend fortement de ω.') +
      `<br>Largeur du pic : Δω ≈ ω₀/Q = ${K.fmt(1 / Q, 2)} ω₀ ; plus Q est grand, plus le pic est haut et étroit, et plus le régime transitoire est long.`;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; step(dt * 0.7); draw(); requestAnimationFrame(loop); })(performance.now());
};
