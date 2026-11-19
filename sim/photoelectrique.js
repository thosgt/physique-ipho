/* Simulation : effet photoélectrique. Métal (travail d'extraction W), longueur d'onde λ, intensité (nombre de photons),
   tension U = V_anode − V_cathode. E_c,max = hc/λ − W ; courant I(U) : saturation pour U > 0, coupure à U = −U₀.
   Modèle du courant : électrons d'énergie répartie uniformément entre 0 et E_c,max, collectés si E_c > −eU. */
window.SIMS['photoelectrique'] = function(mount){
  const K = window.SimKit, C = K.C;
  const M = {na: ['Sodium', 2.3], cs: ['Césium', 2.1], k: ['Potassium', 2.3], zn: ['Zinc', 4.3], cu: ['Cuivre', 4.7], pt: ['Platine', 5.6]};
  let met = 'na', lam = 400, inten = 50, U = 0, t = 0, parts = [];
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.select(ctr, 'Métal de la cathode', Object.entries(M).map(([k, v]) => [k, `${v[0]} (W = ${String(v[1]).replace('.', ',')} eV)`]), v => { met = v; });
  K.slider(ctr, 'Longueur d’onde λ', 150, 750, 5, lam, x => x + ' nm (' + K.fmt(1240 / x, 2) + ' eV)', x => { lam = x; });
  K.slider(ctr, 'Intensité lumineuse', 0, 100, 5, inten, x => x + ' %', x => { inten = x; });
  K.slider(ctr, 'Tension anode − cathode U', -4, 2, 0.05, U, x => K.fmt(x, 2) + ' V', x => { U = x; });
  const out = K.readout(ctr);
  function color(w){ if (w < 380) return '#7b3fd6'; if (w < 440) return '#6a3fff'; if (w < 490) return '#3b5bdb'; if (w < 510) return '#1fa3b3'; if (w < 580) return '#2fa84f'; if (w < 645) return '#e0a010'; return '#d62728'; }
  let last = performance.now();
  function draw(now){
    if (!mount.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const W = M[met][1], Eph = 1240 / lam, Ec = Eph - W, emit = Ec > 0;
    // émission de particules (électrons) proportionnelle à l'intensité
    if (emit && Math.random() < inten / 100 * 0.9) parts.push({x: 92, y: 120 + Math.random() * 100, e: Math.random() * Ec, vx: 0});
    parts.forEach(p => { const v0 = 40 + 120 * Math.sqrt(p.e / 3); if (p.vx === 0) p.vx = v0; p.vx += U * 60 * dt * 3; p.x += p.vx * dt; });
    parts = parts.filter(p => p.x > 88 && p.x < 300);
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    // cellule
    ctx.fillStyle = '#f3f6fa'; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.ellipse(190, 170, 150, 95, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a94a6'; ctx.fillRect(78, 110, 14, 120); ctx.fillRect(290, 110, 8, 120);
    K.text(ctx, M[met][0], 70, 262, {size: 11, bold: true, align: 'center', color: C.ink}); K.text(ctx, 'anode', 300, 262, {size: 11, align: 'center', color: C.ink});
    // photons
    const col = color(lam); ctx.strokeStyle = col; ctx.lineWidth = 2; const nph = Math.round(inten / 12);
    for (let i = 0; i < nph; i++){ const ph = ((t * 1.2 + i / nph) % 1), x = 20 + ph * 60, y = 40 + ph * 80 + i * 10; ctx.beginPath(); for (let k = 0; k <= 20; k++){ const xx = x - 18 + k * 1.2, yy = y - 18 * 1.33 + k * 1.6 + 3 * Math.sin(k * 6000 / lam); k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    K.text(ctx, 'photons ' + lam + ' nm', 20, 26, {size: 11, bold: true, color: col});
    ctx.fillStyle = C.blue; parts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill(); });
    // caractéristique I(U)
    const A = K.axes(ctx, 380, 330, 625, 40, {xmin: -4, xmax: 2, ymin: 0, ymax: 1.1, xticks: 6, yticks: 2, xfmt: v => K.fmt(v, 0), yfmt: v => '', xlabel: 'U (V)'});
    K.text(ctx, 'courant I (u. a.)', 384, 28, {size: 11, bold: true, color: C.ink});
    const I = u => !emit ? 0 : inten / 100 * Math.min(1, Math.max(0, (Ec + u) / Ec));
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 200; i++){ const u = -4 + 6 * i / 200; const X = A.sx(u), Y = A.sy(I(u)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(A.sx(U), A.sy(I(U)), 5, 0, 7); ctx.fill();
    if (emit){ ctx.strokeStyle = C.amber; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(A.sx(-Ec), A.sy(0)); ctx.lineTo(A.sx(-Ec), A.sy(1.05)); ctx.stroke(); ctx.setLineDash([]); K.text(ctx, '−U₀', A.sx(-Ec) - 4, A.sy(1.08), {size: 11, bold: true, color: C.amber, align: 'right'}); }
    out.innerHTML = `Photon : E = hc/λ = <b>${K.fmt(Eph, 2)} eV</b> ; W = ${K.fmt(W, 1)} eV<br>Seuil : λ₀ = hc/W = ${K.fmt(1240 / W, 0)} nm<br>` + (emit ? `E_c,max = hν − W = <b>${K.fmt(Ec, 2)} eV</b> ; tension d’arrêt U₀ = ${K.fmt(Ec, 2)} V<br>v_max = ${K.fmt(Math.sqrt(2 * Ec * 1.602e-19 / 9.109e-31) / 1000, 0)} km/s<br>Courant ∝ intensité : ${K.fmt(I(U) * 100, 0)} % de la saturation maximale` : `<b>Aucun électron émis</b> (hν &lt; W), même à 100 % d’intensité`);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
};
