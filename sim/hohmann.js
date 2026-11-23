/* Simulation : transfert de Hohmann entre deux orbites circulaires coplanaires autour du Soleil (UA, années, GM = 4 pi²).
   Demi-ellipse de grand axe r1 + r2, tangente aux deux orbites ; impulsions dv1 au périhélie et dv2 à l'aphélie ;
   durée = demi-période de l'ellipse = ½ ((r1 + r2)/2)^(3/2) an ; la planète visée doit avoir une avance angulaire pi - omega2 t au départ. */
window.SIMS['hohmann'] = function(mount){
  const K = window.SimKit, C = K.C, GM = 4 * Math.PI * Math.PI, r1 = 1;
  let r2 = 1.524, t = 0, last = null, pre = 0.3;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 440);
  const rS = K.slider(ctr, 'Rayon de l’orbite visée r₂', 1.2, 10, 0.01, r2, x => K.fmt(x, 2) + ' UA', x => { r2 = x; t = 0; });
  K.select(ctr, 'Destination', [['1.524', 'Mars (1,52 UA)'], ['5.203', 'Jupiter (5,20 UA)'], ['1.2', 'orbite à 1,2 UA'], ['9.537', 'Saturne (9,54 UA)']], x => { r2 = +x; rS.value = r2; t = 0; });
  K.button(ctr, '▶ Recommencer', () => { t = 0; });
  const out = K.readout(ctr);
  function el(){ const a = (r1 + r2) / 2, e = (r2 - r1) / (r2 + r1), Tt = Math.pow(a, 1.5); return {a, e, Tt, tt: Tt / 2, w2: 2 * Math.PI / Math.pow(r2, 1.5)}; }
  function ship(tt_){
    const E_ = el();
    if (tt_ < pre) return {phase: 0, th: 2 * Math.PI * (tt_ - pre), r: r1};
    if (tt_ < pre + E_.tt){
      const M = 2 * Math.PI * (tt_ - pre) / E_.Tt; let E = M; for (let k = 0; k < 30; k++) E -= (E - E_.e * Math.sin(E) - M) / (1 - E_.e * Math.cos(E));
      const nu = 2 * Math.atan(Math.sqrt((1 + E_.e) / (1 - E_.e)) * Math.tan(E / 2));
      return {phase: 1, th: nu, r: E_.a * (1 - E_.e * Math.cos(E))};
    }
    return {phase: 2, th: Math.PI + E_.w2 * (tt_ - pre - E_.tt), r: r2};
  }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const E_ = el(), cx = 330, cy = 220, sc = Math.min(190 / r2, 120);
    const P = (r, th) => [cx + r * sc * Math.cos(th), cy - r * sc * Math.sin(th)];
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#9fc3ec'; ctx.beginPath(); ctx.arc(cx, cy, r1 * sc, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#e8b9a0'; ctx.beginPath(); ctx.arc(cx, cy, r2 * sc, 0, 7); ctx.stroke();
    // demi-ellipse de transfert
    ctx.setLineDash([5, 4]); ctx.strokeStyle = C.grey; ctx.beginPath();
    for (let i = 0; i <= 100; i++){ const nu = Math.PI * i / 100, r = E_.a * (1 - E_.e * E_.e) / (1 + E_.e * Math.cos(nu)); const [X, Y] = P(r, nu); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#f2b632'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(5, Math.min(12, 0.08 * sc)), 0, 7); ctx.fill();
    // Terre, planète visée, vaisseau
    const tE = 2 * Math.PI * (t - pre), tP = Math.PI + E_.w2 * (t - pre - E_.tt), sh = ship(t);
    const pE = P(r1, tE), pP = P(r2, tP), pS = P(sh.r, sh.th);
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(...pE, 6, 0, 7); ctx.fill(); K.text(ctx, 'Terre', pE[0] + 8, pE[1] - 8, {size: 10, color: C.blue});
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(...pP, 6, 0, 7); ctx.fill(); K.text(ctx, 'cible', pP[0] + 8, pP[1] - 8, {size: 10, color: C.red});
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(...pS, 4, 0, 7); ctx.fill();
    // impulsions
    const burn = (tb, th, r, lab) => { if (t >= tb && t < tb + 0.06 * Math.max(1, E_.tt)){ const [X, Y] = P(r, th); ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, 12, 0, 7); ctx.stroke(); K.text(ctx, lab, X + 14, Y + 14, {size: 12, bold: true, color: C.amber}); } };
    burn(pre, 0, r1, 'Δv₁'); burn(pre + E_.tt, Math.PI, r2, 'Δv₂');
    // angle d'avance de la cible au départ
    const lead = ((Math.PI - E_.w2 * E_.tt) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    if (t <= pre){ ctx.strokeStyle = C.red; ctx.setLineDash([2, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(...P(r2, lead)); ctx.moveTo(cx, cy); ctx.lineTo(...P(r2, 0)); ctx.stroke(); ctx.setLineDash([]); }
    const vc1 = Math.sqrt(GM / r1), vc2 = Math.sqrt(GM / r2), vp = Math.sqrt(GM * (2 / r1 - 1 / E_.a)), va = Math.sqrt(GM * (2 / r2 - 1 / E_.a)), kms = 4.74;
    K.text(ctx, sh.phase === 0 ? 'Sur l’orbite terrestre' : sh.phase === 1 ? 'Transfert (moteurs coupés)' : 'Arrivé sur l’orbite visée', 14, 20, {size: 12, bold: true, color: C.ink});
    K.text(ctx, `t = ${Math.round(Math.max(0, t - pre) * 365.25)} jours depuis le départ`, 14, 40, {size: 11, color: C.ink});
    out.innerHTML = `Ellipse de transfert : a = (r₁ + r₂)/2 = ${K.fmt(E_.a, 3)} UA, durée = demi-période = <b>${K.fmt(E_.tt * 365.25, 0)} jours</b> (${K.fmt(E_.tt, 2)} an).<br>` +
      `Δv₁ = v<sub>p</sub> − v<sub>c1</sub> = ${K.fmt(vp * kms, 2)} − ${K.fmt(vc1 * kms, 2)} = <b>${K.fmt((vp - vc1) * kms, 2)} km/s</b> au départ ; Δv₂ = v<sub>c2</sub> − v<sub>a</sub> = ${K.fmt(vc2 * kms, 2)} − ${K.fmt(va * kms, 2)} = <b>${K.fmt((vc2 - va) * kms, 2)} km/s</b> à l’arrivée.<br>` +
      `Au départ, la cible doit être en avance de π − ω₂ t = <b>${K.fmt(lead * 180 / Math.PI, 0)}°</b> sur la Terre (pointillés rouges) : c’est la fenêtre de tir.<br>` +
      `Les deux impulsions sont dans le sens du mouvement : on accélère deux fois pour monter, et pourtant la vitesse finale (${K.fmt(vc2 * kms, 1)} km/s) est plus faible qu’au départ.`;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; const E_ = el(); t += dt * Math.max(0.06, E_.tt / 5); if (t > pre + E_.tt + Math.max(0.6, 0.5 * Math.pow(r2, 1.5))) t = 0; draw(); requestAnimationFrame(loop); })(performance.now());
};
