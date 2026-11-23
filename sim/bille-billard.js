/* Simulation : bille (boule pleine, J = 2/5 m R²) lancée sur une table avec une vitesse v0 et une rotation omega0.
   Tant que v ≠ R omega, elle glisse : le frottement dynamique mu m g freine (ou accélère) le centre et modifie la rotation,
   dv/dt = -mu g s, R domega/dt = (5/2) mu g s, avec s = signe de (v - R omega). Roulement atteint quand v = R omega :
   v_f = (5 v0 + 2 R omega0)/7, indépendante de mu (conservation du moment cinétique par rapport à un point de la table). */
window.SIMS['bille-billard'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81, kk = 0.4;
  let v0 = 2, sp = 0, mu = 0.2, t = 0, v = 0, w = 0, x = 0, phi = 0, run = false, hist = [], Q = 0, tr = null, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Vitesse de lancement v₀', 0.5, 4, 0.1, v0, u => K.fmt(u, 1) + ' m/s', u => { v0 = u; reset(); });
  K.slider(ctr, 'Effet R ω₀ (en unités de v₀)', -2, 2, 0.05, sp, u => K.fmt(u, 2) + (u === 0 ? ' (aucun)' : u > 0 ? ' (coulé)' : ' (rétro)'), u => { sp = u; reset(); });
  K.slider(ctr, 'Coefficient de frottement μ', 0.05, 0.6, 0.01, mu, u => K.fmt(u, 2), u => { mu = u; reset(); });
  K.button(ctr, '▶ Lancer la bille', () => { reset(); run = true; });
  const out = K.readout(ctr);
  function reset(){ run = false; t = 0; v = v0; w = sp * v0; x = 0; phi = 0; hist = [[0, v, w]]; Q = 0; tr = null; }
  reset();
  function step(dt){
    const n = 40, h = dt / n;
    for (let i = 0; i < n; i++){
      const slip = v - w;      // w désigne R omega
      if (Math.abs(slip) > 1e-4){
        const s = Math.sign(slip), dv = -mu * g * s * h, dw = mu * g / kk * s * h;
        if (Math.sign(v + dv - (w + dw)) !== s){ const vf = (v + kk * w) / (1 + kk); Q += 0.5 * (v * v + kk * w * w) - 0.5 * (1 + kk) * vf * vf; v = vf; w = vf; tr = tr || t; }
        else { Q += mu * g * Math.abs(slip) * h; v += dv; w += dw; }
      } else { w = v; if (tr === null) tr = t; }
      x += v * h; phi += w * h; t += h;
    }
    hist.push([t, v, w]);
    if (t > (tr !== null ? tr + 1.2 : 30)) run = false;
  }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    // tapis qui défile sous la bille (la caméra suit la bille)
    const yb = 120, R = 24, S = 120, cx = 200;
    ctx.fillStyle = '#2f7d55'; ctx.fillRect(0, yb + R, 640, 28);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; const off = ((x * S) % 60 + 60) % 60; for (let k = -1; k < 13; k++){ const X = k * 60 - off; ctx.beginPath(); ctx.moveTo(X, yb + R + 4); ctx.lineTo(X, yb + R + 24); ctx.stroke(); }
    ctx.fillStyle = '#f5f1e6'; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, yb, R, 0, 7); ctx.fill(); ctx.stroke();
    const a = phi / (R / S) - Math.PI / 2; ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(cx + (R - 8) * Math.cos(a), yb + (R - 8) * Math.sin(a), 5, 0, 7); ctx.fill();
    // vitesse du point de contact (glissement)
    const slip = v - w;
    if (Math.abs(slip) > 0.02){ const L = slip * 40; ctx.strokeStyle = C.red; ctx.fillStyle = C.red; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx, yb + R + 2); ctx.lineTo(cx + L, yb + R + 2); ctx.stroke(); K.text(ctx, 'glissement du point de contact', cx + 50, yb + R + 42, {size: 11, color: C.red}); }
    else K.text(ctx, 'roulement sans glissement : le point de contact est immobile', cx - 40, yb + R + 42, {size: 11, color: C.green});
    ctx.strokeStyle = C.blue; ctx.fillStyle = C.blue; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx, yb); ctx.lineTo(cx + v * 40, yb); ctx.stroke(); K.text(ctx, 'v', cx + v * 40 + 6, yb - 6, {size: 12, bold: true, color: C.blue});
    // v(t) et R omega(t)
    const vf = (v0 + kk * sp * v0) / (1 + kk), Tm = Math.max(1, Math.abs(v0 - sp * v0) / (mu * g * (1 + 1 / kk)) * 1.6), ymin = Math.min(0, sp * v0, vf) - 0.2, ymax = Math.max(v0, sp * v0) + 0.3;
    const ax = K.axes(ctx, 60, 360, 620, 200, {xmin: 0, xmax: Tm, ymin, ymax, xticks: 4, yticks: 4, xfmt: u => K.fmt(u, 2) + ' s', yfmt: u => K.fmt(u, 1)});
    ctx.setLineDash([4, 3]); ctx.strokeStyle = C.green; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(60, ax.sy(vf)); ctx.lineTo(620, ax.sy(vf)); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, '(5v₀ + 2Rω₀)/7', 618, ax.sy(vf) - 9, {size: 10, color: C.green, align: 'right'});
    [[1, C.blue, 'v'], [2, C.amber, 'R ω']].forEach(([j, col, lab]) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); hist.forEach((p, i) => { const X = ax.sx(Math.min(Tm, p[0])), Y = ax.sy(p[j]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); K.text(ctx, lab, 70 + (j - 1) * 30, 190, {size: 12, bold: true, color: col}); });
    K.text(ctx, 'm/s', 140, 190, {size: 10, color: C.ink});
    const E0 = 0.5 * (v0 * v0 + kk * (sp * v0) ** 2);
    out.innerHTML = `Pendant le glissement : dv/dt = ∓μg et R dω/dt = ±(5/2)μg, jusqu’à v = Rω. Vitesse finale <b>v<sub>f</sub> = (5v₀ + 2Rω₀)/7 = ${K.fmt(vf, 2)} m/s</b>, quel que soit μ${sp === 0 ? ' (5/7 de v₀ sans effet)' : ''}.<br>` +
      `Durée du glissement : ${K.fmt(Math.abs(v0 - sp * v0) / (mu * g * 3.5), 2)} s (inversement proportionnelle à μ). Énergie dissipée : ${K.fmt(100 * (1 - (1 + kk) * vf * vf / 2 / E0), 0)} % de l’énergie de départ.<br>` +
      `Pourquoi v<sub>f</sub> ne dépend pas de μ : par rapport à un point de la table, le frottement (appliqué sur la table) et le poids (compensé par N) ont un moment nul, donc m R v + J ω se conserve.` + (sp < -0.4 ? ' Avec un fort rétro-effet, la bille revient en arrière !' : '');
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) step(dt * 0.5); draw(); requestAnimationFrame(loop); })(performance.now());
};
