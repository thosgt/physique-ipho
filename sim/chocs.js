/* Simulation : choc de deux chariots sur un rail (une dimension).
   Conservation de la quantité de mouvement ; dans le référentiel du centre de masse, les vitesses s'inversent et sont multipliées par e
   (coefficient de restitution : 1 élastique, 0 mou) : v' = vG - e (v - vG). Énergie perdue : (1 - e²) × énergie cinétique dans le référentiel de G. */
window.SIMS['chocs'] = function(mount){
  const K = window.SimKit, C = K.C;
  let m1 = 1, m2 = 1, v1 = 2, v2 = 0, e = 1, frame = 'labo', run = false, t = 0, x1 = 0, x2 = 0, u1 = 0, u2 = 0, hit = false, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.slider(ctr, 'Masse m₁ (gauche)', 0.2, 5, 0.1, m1, x => K.fmt(x, 1) + ' kg', x => { m1 = x; reset(); });
  K.slider(ctr, 'Masse m₂ (droite)', 0.2, 5, 0.1, m2, x => K.fmt(x, 1) + ' kg', x => { m2 = x; reset(); });
  K.slider(ctr, 'Vitesse v₁', -3, 3, 0.1, v1, x => K.fmt(x, 1) + ' m/s', x => { v1 = x; reset(); });
  K.slider(ctr, 'Vitesse v₂', -3, 3, 0.1, v2, x => K.fmt(x, 1) + ' m/s', x => { v2 = x; reset(); });
  K.slider(ctr, 'Coefficient de restitution e', 0, 1, 0.05, e, x => K.fmt(x, 2) + (x === 1 ? ' (élastique)' : x === 0 ? ' (mou)' : ''), x => { e = x; reset(); });
  K.select(ctr, 'Vu dans le référentiel', [['labo', 'du laboratoire'], ['cm', 'du centre de masse G']], x => { frame = x; });
  K.button(ctr, '▶ Lancer', () => { reset(); run = true; });
  const out = K.readout(ctr);
  const W = m => 0.45 * Math.cbrt(m);       // largeur d'un chariot (m)
  function reset(){ run = false; t = 0; hit = false; x1 = 2.5; x2 = 6.5; u1 = v1; u2 = v2; }
  reset();
  const vG = () => (m1 * v1 + m2 * v2) / (m1 + m2);
  function after(){ const G = vG(); return [G - e * (v1 - G), G - e * (v2 - G)]; }
  function step(dt){
    const n = 10, h = dt / n;
    for (let i = 0; i < n; i++){
      x1 += u1 * h; x2 += u2 * h; t += h;
      if (!hit && x2 - x1 <= (W(m1) + W(m2)) / 2 && u1 - u2 > 0){ [u1, u2] = after(); hit = true; }
      if (hit && e === 0){ x2 = x1 + (W(m1) + W(m2)) / 2; }
    }
    if (t > 14) run = false;
  }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const S = 60, xo = 20, yr = 150, G = vG();
    const shift = frame === 'cm' ? ((m1 * 2.5 + m2 * 6.5) / (m1 + m2) + G * t - 5) : 0;      // G reste au milieu
    const X = x => xo + (x - shift) * S;
    // rail
    ctx.strokeStyle = C.navy; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, yr + 2); ctx.lineTo(640, yr + 2); ctx.stroke();
    ctx.strokeStyle = '#c9d2df'; ctx.lineWidth = 1.5;
    for (let k = -30; k < 40; k++){ const px = X(k); if (px > -5 && px < 645){ ctx.beginPath(); ctx.moveTo(px, yr + 4); ctx.lineTo(px, yr + 12); ctx.stroke(); } }
    const cart = (x, m, col, lab, u) => {
      const w = W(m) * S, hgt = 34 + 10 * Math.cbrt(m), px = X(x);
      ctx.fillStyle = col; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.fillRect(px - w / 2, yr - hgt - 8, w, hgt); ctx.strokeRect(px - w / 2, yr - hgt - 8, w, hgt);
      [-w / 4, w / 4].forEach(d => { ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(px + d, yr - 4, 5, 0, 7); ctx.fill(); });
      K.text(ctx, lab, px, yr - hgt / 2 - 8, {size: 12, bold: true, color: '#fff', align: 'center'});
      const uu = u - (frame === 'cm' ? G : 0);
      if (Math.abs(uu) > 0.02){ const y = yr - hgt - 22, x2_ = px + uu * 30; ctx.strokeStyle = C.red; ctx.fillStyle = C.red; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(x2_, y); ctx.stroke(); const s = Math.sign(uu); ctx.beginPath(); ctx.moveTo(x2_, y); ctx.lineTo(x2_ - 8 * s, y - 5); ctx.lineTo(x2_ - 8 * s, y + 5); ctx.closePath(); ctx.fill(); K.text(ctx, K.fmt(uu, 2) + ' m/s', px, y - 12, {size: 11, color: C.red, align: 'center'}); }
    };
    cart(x1, m1, C.blue, 'm₁', u1); cart(x2, m2, C.amber, 'm₂', u2);
    // centre de masse
    const xg = (m1 * x1 + m2 * x2) / (m1 + m2), gx = X(xg);
    ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx - 7, yr + 22); ctx.lineTo(gx + 7, yr + 22); ctx.moveTo(gx, yr + 15); ctx.lineTo(gx, yr + 29); ctx.stroke();
    K.text(ctx, 'G', gx + 9, yr + 23, {size: 12, bold: true, color: C.green});
    // bilans
    const [w1, w2] = after(), p0 = m1 * v1 + m2 * v2, p1 = m1 * w1 + m2 * w2, E0 = 0.5 * (m1 * v1 * v1 + m2 * v2 * v2), E1 = 0.5 * (m1 * w1 * w1 + m2 * w2 * w2);
    const meet = v1 - v2 > 0;
    const pmax = Math.max(1, Math.abs(p0)) * 1.3, Emax = Math.max(0.2, E0) * 1.15;
    const bar = (x, y, val, max, col, lab, signed) => {
      const Wb = 220, zero = signed ? x + Wb / 2 : x, len = val / max * (signed ? Wb / 2 : Wb);
      ctx.fillStyle = '#eef2f7'; ctx.fillRect(x, y, Wb, 16); ctx.fillStyle = col; ctx.fillRect(Math.min(zero, zero + len), y, Math.abs(len), 16);
      if (signed){ ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.moveTo(zero, y - 2); ctx.lineTo(zero, y + 18); ctx.stroke(); }
      K.text(ctx, lab, x - 8, y + 8, {size: 11, color: C.ink, align: 'right'});
    };
    K.text(ctx, 'avant', 200, 232, {size: 11, bold: true, color: C.ink, align: 'center'}); K.text(ctx, hit ? 'après' : 'après (prévu)', 470, 232, {size: 11, bold: true, color: C.ink, align: 'center'});
    bar(90, 246, p0, pmax, C.blue, 'p (kg·m/s)', true); bar(360, 246, meet ? p1 : p0, pmax, C.blue, '', true);
    bar(90, 276, E0, Emax, C.amber, 'Ec (J)', false); bar(360, 276, meet ? E1 : E0, Emax, C.amber, '', false);
    if (meet && E0 - E1 > 1e-6){ ctx.fillStyle = 'rgba(178,58,72,0.25)'; ctx.fillRect(360 + E1 / Emax * 220, 276, (E0 - E1) / Emax * 220, 16); K.text(ctx, 'perdue', 360 + (E0 + E1) / 2 / Emax * 220, 304, {size: 10, color: C.red, align: 'center'}); }
    K.text(ctx, 'p : ' + K.fmt(p0, 2) + ' → ' + K.fmt(meet ? p1 : p0, 2) + ' kg·m/s   ·   Ec : ' + K.fmt(E0, 2) + ' → ' + K.fmt(meet ? E1 : E0, 2) + ' J', 320, 335, {size: 11, color: C.ink, align: 'center'});
    let h;
    if (!meet) h = 'Avec ces vitesses, les chariots s’éloignent : il n’y a pas de choc.';
    else {
      const Ecm = 0.5 * (m1 * m2 / (m1 + m2)) * (v1 - v2) ** 2;
      h = `Après le choc : v₁′ = <b>${K.fmt(w1, 2)} m/s</b>, v₂′ = <b>${K.fmt(w2, 2)} m/s</b>. Vitesse de G : ${K.fmt(G, 2)} m/s, inchangée.<br>` +
        `Quantité de mouvement conservée ; énergie cinétique perdue : ${K.fmt(E0 - E1, 2)} J = (1 − e²) × ${K.fmt(Ecm, 2)} J, l’énergie cinétique « relative », seule disponible.<br>` +
        (e === 1 ? 'Choc élastique : la vitesse relative change de signe. ' + (Math.abs(m1 - m2) < 1e-9 && Math.abs(v2) < 1e-9 ? 'Masses égales, cible immobile : le projectile s’arrête et lui cède sa vitesse.' : '')
          : e === 0 ? 'Choc mou : les chariots restent ensemble à la vitesse de G ; la perte d’énergie est maximale.' : 'Choc partiellement élastique : la vitesse relative est inversée et multipliée par e.');
      if (frame === 'cm') h += '<br>Vu de G, les deux quantités de mouvement sont opposées avant comme après : le choc ne fait que les retourner (et les multiplier par e).';
    }
    out.innerHTML = h;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) step(dt); draw(); requestAnimationFrame(loop); })(performance.now());
};
