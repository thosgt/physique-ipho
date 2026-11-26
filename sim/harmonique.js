/* Simulation : oscillateur harmonique masse-ressort et conditions initiales.
   x = x0 cos ω0t + (v0/ω0) sin ω0t ; A = √(x0² + (v0/ω0)²) ; T0 = 2π√(m/k) ne dépend pas de A.
   Portrait de phase (x, v/ω0) : cercle de rayon A parcouru à vitesse angulaire ω0. Énergie Ec + Ep constante. */
window.SIMS['harmonique'] = function(mount){
  const K = window.SimKit, C = K.C, TM = 10;
  let k = 20, m = 0.5, x0 = 0.04, v0 = 0, t = 0, run = true, last = 0, hist = [];
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  const reset = () => { t = 0; hist = []; run = true; bp.textContent = 'Pause'; };
  K.slider(ctr, 'Raideur k', 5, 50, 1, k, v => v + ' N·m⁻¹', v => { k = v; reset(); });
  K.slider(ctr, 'Masse m', 0.1, 2, 0.05, m, v => K.fmt(v, 2) + ' kg', v => { m = v; reset(); });
  K.slider(ctr, 'Position initiale x₀', -5, 5, 0.5, x0 * 100, v => K.fmt(v, 1) + ' cm', v => { x0 = v / 100; reset(); });
  K.slider(ctr, 'Vitesse initiale v₀', -0.5, 0.5, 0.02, v0, v => K.fmt(v, 2) + ' m·s⁻¹', v => { v0 = v; reset(); });
  const bp = K.button(ctr, 'Pause', () => { run = !run; bp.textContent = run ? 'Pause' : 'Reprendre'; });
  K.button(ctr, 'Relâcher', reset, true);
  const out = K.readout(ctr);
  function state(u){ const w = Math.sqrt(k / m); return [x0 * Math.cos(w * u) + v0 / w * Math.sin(w * u), -x0 * w * Math.sin(w * u) + v0 * Math.cos(w * u), w]; }
  function draw(){
    const [x, v, w] = state(t), A = Math.hypot(x0, v0 / w), Am = Math.max(A, 0.05);
    const sc = Math.min(800, 230 / Am);   // px par mètre : 8 px par cm, réduit si l’amplitude est grande
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    // ressort et masse
    const wall = 30, eq = 330, yb = 62, xm = eq + x * sc;
    ctx.fillStyle = '#c3cad6'; ctx.fillRect(wall - 12, 22, 12, 80); ctx.fillStyle = '#e9eef5'; ctx.fillRect(wall, 102, 600, 6);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(wall, yb); const nC = 14, x1 = xm - 28; for (let i = 0; i <= nC; i++){ const X = wall + 10 + (x1 - wall - 20) * i / nC; ctx.lineTo(X, yb + (i % 2 ? -12 : 12) * (i === 0 || i === nC ? 0 : 1)); } ctx.lineTo(xm - 28, yb); ctx.stroke();
    ctx.fillStyle = C.blue; ctx.fillRect(xm - 28, yb - 26, 56, 52); K.text(ctx, 'm', xm, yb, {size: 14, color: '#fff', bold: true, align: 'center'});
    ctx.strokeStyle = C.green; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(eq, 18); ctx.lineTo(eq, 108); ctx.stroke(); ctx.setLineDash([]); K.text(ctx, 'équilibre', eq + 4, 14, {size: 10, color: C.green});
    if (A > 0.001){ ctx.strokeStyle = C.amber; ctx.setLineDash([2, 3]); [eq - A * sc, eq + A * sc].forEach(X => { ctx.beginPath(); ctx.moveTo(X, 30); ctx.lineTo(X, 104); ctx.stroke(); }); ctx.setLineDash([]); K.text(ctx, '±A', eq + A * sc + 4, 30, {size: 10, color: C.amber, bold: true}); }
    // x(t)
    const Gm = Math.max(6, Math.ceil(Am * 110));
    const G = K.axes(ctx, 50, 380, 420, 140, {xmin: 0, xmax: TM, ymin: -Gm, ymax: Gm, xticks: 5, yticks: [-Gm, -Gm / 2, 0, Gm / 2, Gm], xfmt: u => K.fmt(u, 0), yfmt: u => K.fmt(u, 0), xlabel: 't (s)'});
    K.text(ctx, 'x (cm)', 54, 132, {size: 11, color: C.ink});
    const tw = t % TM; if (run || !hist.length) hist.push([tw, x]); if (hist.length > 1 && hist[hist.length - 1][0] < hist[hist.length - 2][0]) hist = [[tw, x]];
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2.2; ctx.beginPath(); hist.forEach(([u, y], i) => i ? ctx.lineTo(G.sx(u), G.sy(y * 100)) : ctx.moveTo(G.sx(u), G.sy(y * 100))); ctx.stroke();
    const T0 = 2 * Math.PI / w;
    if (T0 < TM){ ctx.strokeStyle = C.amber; ctx.lineWidth = 1.2; const ya = 152; ctx.beginPath(); ctx.moveTo(G.sx(0), ya); ctx.lineTo(G.sx(T0), ya); ctx.stroke(); [0, T0].forEach(u => { ctx.beginPath(); ctx.moveTo(G.sx(u), ya - 4); ctx.lineTo(G.sx(u), ya + 4); ctx.stroke(); }); K.text(ctx, 'T₀', G.sx(T0 / 2), ya - 8, {size: 11, color: C.amber, bold: true, align: 'center'}); }
    // portrait de phase
    const pc = [520, 235], pr = 75, ps = pr / Math.max(0.06, A * 1.1);
    ctx.strokeStyle = C.light; ctx.beginPath(); ctx.moveTo(pc[0] - pr - 8, pc[1]); ctx.lineTo(pc[0] + pr + 8, pc[1]); ctx.moveTo(pc[0], pc[1] - pr - 8); ctx.lineTo(pc[0], pc[1] + pr + 8); ctx.stroke();
    K.text(ctx, 'x', pc[0] + pr + 10, pc[1], {size: 11, color: C.ink}); K.text(ctx, 'v/ω₀', pc[0] + 4, pc[1] - pr - 12, {size: 11, color: C.ink});
    ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(pc[0], pc[1], A * ps, 0, 7); ctx.stroke();
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(pc[0] + x * ps, pc[1] - v / w * ps, 5, 0, 7); ctx.fill();
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(pc[0] + x0 * ps, pc[1] - v0 / w * ps, 3, 0, 7); ctx.fill();
    K.text(ctx, 'portrait de phase', pc[0], 140, {size: 11, color: C.ink, align: 'center', bold: true});
    // énergies
    const E = 0.5 * k * A * A, Ep = 0.5 * k * x * x, Ec = 0.5 * m * v * v, bx = 455, bw = 130, by = 345;
    if (E > 0){ ctx.fillStyle = C.blue; ctx.fillRect(bx, by, bw * Ec / E, 12); ctx.fillStyle = C.amber; ctx.fillRect(bx + bw * Ec / E, by, bw * Ep / E, 12); }
    ctx.strokeStyle = C.ink; ctx.strokeRect(bx, by, bw, 12);
    K.text(ctx, 'Ec', bx, by + 24, {size: 10, color: C.blue, bold: true}); K.text(ctx, 'Ep', bx + bw, by + 24, {size: 10, color: C.amber, bold: true, align: 'right'}); K.text(ctx, 'énergie totale constante', bx + bw / 2, by - 8, {size: 10, color: C.ink, align: 'center'});
    const phi = Math.atan2(-v0 / w, x0) * 180 / Math.PI;
    out.innerHTML = `ω₀ = √(k/m) = <b>${K.fmt(w, 2)}</b> rad·s⁻¹<br>T₀ = 2π/ω₀ = <b>${K.fmt(T0, 2)}</b> s<br>v₀/ω₀ = ${K.fmt(v0 / w * 100, 1)} cm<br>A = √(x₀² + (v₀/ω₀)²) = <b>${K.fmt(A * 100, 1)}</b> cm<br>φ = ${K.fmt(Math.round(phi) + 0, 0)}°<br>E = ½kA² = ${K.fmt(E * 1000, 1)} mJ`;
  }
  (function loop(now){ if (!mount.isConnected) return; const d = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (run) t += d; draw(); requestAnimationFrame(loop); })(performance.now());
};
