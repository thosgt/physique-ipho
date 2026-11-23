/* Simulation : lecture d'un diagramme d'énergie potentielle (mouvement à un degré de liberté, m = 1, unités arbitraires).
   Le mouvement n'est possible que là où Ep(x) <= Em ; la vitesse s'annule aux points de rebroussement ; F = -dEp/dx ;
   équilibres aux extrema de Ep (minimum stable, maximum instable) ; petites oscillations de pulsation sqrt(Ep''(x0)/m). */
window.SIMS['diagramme-ep'] = function(mount){
  const K = window.SimKit, C = K.C;
  const POT = {
    double: {nom: 'double puits (x² − 1)²', f: x => (x * x - 1) ** 2, x0: -2.1, x1: 2.1, e0: -0.15, e1: 2.2, start: -1.35},
    morse: {nom: 'molécule (potentiel de Morse)', f: x => (1 - Math.exp(-1.6 * (x - 1.2))) ** 2 - 1, x0: 0.7, x1: 5, e0: -1.15, e1: 1.2, start: 0.85, open: true},
    meta: {nom: 'puits et barrière 3x² − 2x³', f: x => 3 * x * x - 2 * x ** 3, x0: -1.1, x1: 2, e0: -0.2, e1: 2.2, start: -0.6, open: true},
    pendule: {nom: 'pendule, 1 − cos θ', f: x => 1 - Math.cos(x), x0: -7, x1: 7, e0: -0.15, e1: 2.6, start: -1.2, periodic: true},
  };
  let key = 'double', P = POT[key], xs = P.start, ec0 = 0, x = xs, v = 0, run = false, t = 0, turns = [], last = null, gone = false;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  K.select(ctr, 'Énergie potentielle', Object.entries(POT).map(([k, p]) => [k, p.nom]), k => { key = k; P = POT[k]; xs = P.start; xS.el.min = P.x0 + 0.05; xS.el.max = P.x1 - 0.05; xS.value = xs; reset(); });
  const xS = K.slider(ctr, 'Position de départ x₀', P.x0 + 0.05, P.x1 - 0.05, 0.01, xs, v_ => K.fmt(v_, 2), v_ => { xs = v_; reset(); });
  K.slider(ctr, 'Énergie cinétique de départ', 0, 2, 0.01, ec0, v_ => K.fmt(v_, 2), v_ => { ec0 = v_; reset(); });
  K.button(ctr, '▶ Lâcher', () => { reset(); run = true; });
  K.button(ctr, 'Pause / reprise', () => { run = !run; }, true);
  const out = K.readout(ctr);
  const dE = x_ => (P.f(x_ + 1e-4) - P.f(x_ - 1e-4)) / 2e-4, d2E = x_ => (P.f(x_ + 1e-3) - 2 * P.f(x_) + P.f(x_ - 1e-3)) / 1e-6;
  function equilibria(){
    const r = [], N = 800; let pd = dE(P.x0);
    for (let i = 1; i <= N; i++){ const xx = P.x0 + (P.x1 - P.x0) * i / N, d = dE(xx); if (pd * d < 0 || d === 0){ let a = xx - (P.x1 - P.x0) / N, b = xx; for (let k = 0; k < 40; k++){ const m = (a + b) / 2; if (dE(a) * dE(m) <= 0) b = m; else a = m; } const xe = (a + b) / 2; r.push({x: xe, stable: d2E(xe) > 0}); } pd = d; }
    return r;
  }
  function reset(){ run = false; x = xs; v = Math.sqrt(2 * ec0); t = 0; turns = []; gone = false; }
  reset();
  const Em = () => P.f(xs) + ec0;
  function step(dt){
    const n = 40, h = dt / n;
    for (let i = 0; i < n; i++){
      const a0 = -dE(x); x += v * h + a0 * h * h / 2; const a1 = -dE(x); const nv = v + (a0 + a1) * h / 2;
      if (nv * v < 0 || (v === 0 && nv !== 0 && t > 0)) turns.push(t);
      v = nv; t += h;
      if (P.periodic){ if (x > Math.PI * 2) x -= 4 * Math.PI; if (x < -Math.PI * 2) x += 4 * Math.PI; }
      if (x > P.x1 || x < P.x0){ gone = true; run = false; x = Math.max(P.x0, Math.min(P.x1, x)); break; }
    }
    if (turns.length > 6) turns = turns.slice(-6);
  }
  function arrow(x0, y0, x1, y1, col){ const L = Math.hypot(x1 - x0, y1 - y0); if (L < 3) return; const a = Math.atan2(y1 - y0, x1 - x0); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 9 * Math.cos(a - .4), y1 - 9 * Math.sin(a - .4)); ctx.lineTo(x1 - 9 * Math.cos(a + .4), y1 - 9 * Math.sin(a + .4)); ctx.closePath(); ctx.fill(); }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const X0 = 50, X1 = 625, Y0 = 290, Y1 = 22, E = Em();
    const ax = K.axes(ctx, X0, Y0, X1, Y1, {xmin: P.x0, xmax: P.x1, ymin: P.e0, ymax: P.e1, xticks: 6, yticks: 4, xfmt: v_ => K.fmt(v_, 1), yfmt: v_ => K.fmt(v_, 1)});
    K.text(ctx, 'Ep', X0 + 6, Y1 + 4, {size: 12, bold: true, color: C.navy});
    // zones interdites (Ep > Em)
    const N = 400;
    for (let i = 0; i < N; i++){ const a = P.x0 + (P.x1 - P.x0) * i / N, b = P.x0 + (P.x1 - P.x0) * (i + 1) / N; if (P.f((a + b) / 2) > E){ ctx.fillStyle = 'rgba(138,148,166,0.16)'; ctx.fillRect(ax.sx(a), Y1, ax.sx(b) - ax.sx(a) + 0.5, Y0 - Y1); } }
    // courbe
    ctx.save(); ctx.beginPath(); ctx.rect(X0, Y1 - 4, X1 - X0, Y0 - Y1 + 4); ctx.clip();
    ctx.strokeStyle = C.navy; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let i = 0; i <= N; i++){ const a = P.x0 + (P.x1 - P.x0) * i / N, yy = Math.max(P.e0 - 1, Math.min(P.e1 + 1, P.f(a))); i ? ctx.lineTo(ax.sx(a), ax.sy(yy)) : ctx.moveTo(ax.sx(a), ax.sy(yy)); }
    ctx.stroke(); ctx.restore();
    // énergie mécanique
    if (E <= P.e1){ ctx.strokeStyle = C.red; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X0, ax.sy(E)); ctx.lineTo(X1, ax.sy(E)); ctx.stroke(); K.text(ctx, 'Em', X1 - 4, ax.sy(E) - 9, {size: 12, bold: true, color: C.red, align: 'right'}); }
    // équilibres
    const eqs = equilibria();
    eqs.forEach(q => { const X = ax.sx(q.x), Y = ax.sy(P.f(q.x)); ctx.lineWidth = 2; ctx.strokeStyle = q.stable ? C.green : C.red; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, 6, 0, 7); ctx.fill(); ctx.stroke(); });
    // points de rebroussement autour de la position actuelle
    const tp = []; { let a = x; while (a > P.x0 && P.f(a) <= E) a -= 0.002; if (a > P.x0) tp.push(a); let b = x; while (b < P.x1 && P.f(b) <= E) b += 0.002; if (b < P.x1) tp.push(b); }
    tp.forEach(q => { ctx.strokeStyle = C.red; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax.sx(q), ax.sy(E)); ctx.lineTo(ax.sx(q), Y0 + 52); ctx.stroke(); ctx.setLineDash([]); });
    // particule sur la courbe et sur l'axe
    const px = ax.sx(x), py = ax.sy(P.f(x));
    ctx.strokeStyle = C.blue; ctx.setLineDash([2, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, Y0 + 52); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(px, py, 7, 0, 7); ctx.fill();
    // l'écart entre Ep et Em est l'énergie cinétique
    if (E - P.f(x) > 0.02 && E <= P.e1){ ctx.strokeStyle = C.amber; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, ax.sy(E)); ctx.stroke(); K.text(ctx, 'Ec', px + 6, (py + ax.sy(E)) / 2, {size: 11, bold: true, color: C.amber}); }
    const yt = Y0 + 60; ctx.strokeStyle = C.grey; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0, yt + 10); ctx.lineTo(X1, yt + 10); ctx.stroke();
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(px, yt, 9, 0, 7); ctx.fill();
    const F = -dE(x), fl = Math.max(-90, Math.min(90, F * 30));
    arrow(px, yt - 22, px + fl, yt - 22, C.red); if (Math.abs(fl) > 8) K.text(ctx, 'F = −dEp/dx', px + fl + (fl > 0 ? 6 : -6), yt - 22, {size: 11, color: C.red, align: fl > 0 ? 'left' : 'right'});
    // texte
    let h = `Em = ${K.fmt(E, 3)} ; Ec = Em − Ep(x) = ${K.fmt(Math.max(0, E - P.f(x)), 3)}. La zone grisée (Ep > Em) est interdite.<br>`;
    if (gone) h += '<b>La particule s’échappe :</b> son énergie dépasse la barrière, rien ne la ramène.<br>';
    else if (tp.length === 2) h += `Mouvement lié entre x = ${K.fmt(tp[0], 2)} et x = ${K.fmt(tp[1], 2)} (points de rebroussement, en pointillés rouges).<br>`;
    else if (tp.length === 1 && P.open) h += 'Un seul point de rebroussement : la particule part à l’infini (état de diffusion).<br>';
    else if (P.periodic && tp.length === 0) h += 'Em dépasse le maximum : le pendule fait des tours complets.<br>';
    const st = eqs.filter(q => q.stable).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
    if (st){ const k = d2E(st.x); h += `Équilibre stable le plus proche : x = ${K.fmt(st.x, 2)}, κ = Ep″ = ${K.fmt(k, 2)}, période des petites oscillations 2π/√κ = <b>${K.fmt(2 * Math.PI / Math.sqrt(k), 2)}</b>`; }
    if (turns.length >= 3 && !gone) h += ` ; période mesurée : <b>${K.fmt(turns[turns.length - 1] - turns[turns.length - 3], 2)}</b> (elle s’en écarte quand l’amplitude grandit)`;
    h += '.<br>Cercles verts : équilibres stables (minima) ; rouges : instables (maxima).';
    out.innerHTML = h;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) step(dt); draw(); requestAnimationFrame(loop); })(performance.now());
};
