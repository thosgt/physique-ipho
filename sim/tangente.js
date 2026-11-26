/* Simulation : de la sécante à la tangente. x(t) au choix ; la pente de la corde Δx/Δt tend vers la dérivée quand Δt → 0.
   En bas, la courbe v(t) = x'(t) : sa valeur à l'instant t est la pente de la tangente en haut. */
window.SIMS['tangente'] = function(mount){
  const K = window.SimKit, C = K.C;
  const F = {
    demi: ['x = 1 + 3t − t² (demi-tour)', t => 1 + 3 * t - t * t, t => 3 - 2 * t, [-3, 4], [-6, 4]],
    unif: ['x = t²/2 (accélération constante)', t => t * t / 2, t => t, [0, 8.5], [0, 4.5]],
    osc: ['x = 2 + 1,5 sin(1,5t) (oscillation)', t => 2 + 1.5 * Math.sin(1.5 * t), t => 2.25 * Math.cos(1.5 * t), [0, 4], [-2.5, 2.5]],
    cub: ['x = t³ − 6t² + 9t (arrêt puis reprise)', t => t ** 3 - 6 * t * t + 9 * t, t => 3 * t * t - 12 * t + 9, [-1, 5], [-4, 10]]
  };
  let fn = 'demi', t0 = 0.6, dt = 1.5, anim = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 420);
  K.select(ctr, 'Mouvement', Object.entries(F).map(([k, v]) => [k, v[0]]), v => { fn = v; draw(); });
  const sT = K.slider(ctr, 'Instant t', 0, 3.5, 0.01, t0, v => K.fmt(v, 2) + ' s', v => { t0 = v; draw(); });
  const sD = K.slider(ctr, 'Durée Δt', 0.01, 2, 0.01, dt, v => K.fmt(v, 2) + ' s', v => { dt = v; draw(); });
  K.button(ctr, 'Faire tendre Δt vers 0', () => {
    if (anim) return; const start = performance.now(), d0 = dt;
    anim = true; (function step(now){ if (!mount.isConnected){ anim = null; return; } const u = Math.min(1, (now - start) / 2500);
      dt = d0 * Math.pow(0.01 / d0, u); sD.value = dt; draw(); if (u < 1) requestAnimationFrame(step); else anim = null; })(start);
  });
  const out = K.readout(ctr);
  function draw(){
    const [name, x, v, xr, vr] = F[fn], T = 4;
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const A = K.axes(ctx, 56, 240, 625, 22, {xmin: 0, xmax: T, ymin: xr[0], ymax: xr[1], xticks: 8, yticks: 5, xfmt: u => K.fmt(u, 1), yfmt: u => K.fmt(u, 0)});
    K.text(ctx, 'x (m)', 60, 14, {size: 11, color: C.ink});
    const plot = (A, f, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); for (let i = 0; i <= 200; i++){ const u = T * i / 200, X = A.sx(u), Y = A.sy(f(u)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); };
    ctx.save(); ctx.beginPath(); ctx.rect(56, 22, 569, 218); ctx.clip();
    plot(A, x, C.blue, 2.5);
    const t1 = t0 + dt, x0 = x(t0), x1 = x(t1), slope = (x1 - x0) / dt, vt = v(t0);
    // sécante prolongée
    ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(A.sx(0), A.sy(x0 - slope * t0)); ctx.lineTo(A.sx(T), A.sy(x0 + slope * (T - t0))); ctx.stroke();
    // tangente
    ctx.strokeStyle = C.green; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(A.sx(0), A.sy(x0 - vt * t0)); ctx.lineTo(A.sx(T), A.sy(x0 + vt * (T - t0))); ctx.stroke(); ctx.setLineDash([]);
    // triangle Δt, Δx
    ctx.strokeStyle = C.red; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(A.sx(t0), A.sy(x0)); ctx.lineTo(A.sx(t1), A.sy(x0)); ctx.lineTo(A.sx(t1), A.sy(x1)); ctx.stroke();
    ctx.restore();
    if (dt > 0.25){ K.text(ctx, 'Δt', (A.sx(t0) + A.sx(t1)) / 2, A.sy(x0) + (x1 >= x0 ? 10 : -10), {size: 11, color: C.red, align: 'center'}); K.text(ctx, 'Δx', A.sx(t1) + 6, (A.sy(x0) + A.sy(x1)) / 2, {size: 11, color: C.red}); }
    [[t0, x0], [t1, x1]].forEach(([u, y], i) => { if (u > T) return; ctx.fillStyle = i ? C.amber : C.navy; ctx.beginPath(); ctx.arc(A.sx(u), A.sy(y), 5, 0, 7); ctx.fill(); });
    K.text(ctx, '— sécante (pente Δx/Δt)', 380, 36, {size: 11, bold: true, color: C.amber});
    K.text(ctx, '- - tangente (pente v(t))', 380, 52, {size: 11, bold: true, color: C.green});
    // graphe de la dérivée
    const B = K.axes(ctx, 56, 395, 625, 280, {xmin: 0, xmax: T, ymin: vr[0], ymax: vr[1], xticks: 8, yticks: 2, xfmt: u => K.fmt(u, 1), yfmt: u => K.fmt(u, 0), xlabel: 't (s)'});
    K.text(ctx, 'v = dx/dt (m·s⁻¹)', 60, 272, {size: 11, color: C.ink});
    ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.moveTo(56, B.sy(0)); ctx.lineTo(625, B.sy(0)); ctx.stroke();
    plot(B, v, C.green, 2);
    ctx.strokeStyle = C.ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(A.sx(t0), 22); ctx.lineTo(A.sx(t0), 395); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(B.sx(t0), B.sy(vt), 5, 0, 7); ctx.fill();
    ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(B.sx(t0), Math.max(280, Math.min(395, B.sy(slope))), 4, 0, 7); ctx.fill();
    out.innerHTML = `Pente de la sécante Δx/Δt = <b>${K.fmt(slope, 3)}</b> m·s⁻¹<br>Vitesse instantanée v(t) = <b>${K.fmt(vt, 3)}</b> m·s⁻¹<br>Écart : ${K.fmt(slope - vt, 3)} m·s⁻¹<br>${Math.abs(vt) < 0.05 ? 'Tangente horizontale : x est extrémal.' : vt > 0 ? 'v > 0 : x augmente.' : 'v < 0 : x diminue.'}`;
  }
  draw();
};
