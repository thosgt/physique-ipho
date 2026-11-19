/* Simulation : proton (ou antiproton) dans un champ magnétique uniforme B, sortant de l'écran, avec en option un champ
   électrique E uniforme dirigé vers le haut. Solution exacte : dans le référentiel qui dérive à v_d = E/B (vers la droite),
   la particule décrit un cercle à la pulsation cyclotron ω = qB/m. Sans E : cercle de rayon mv/|q|B.
   Unités : B en mT, v0 en km/s, E en V/m ; l'animation est ralentie (1 s d'écran = 8 µs). */
window.SIMS['cyclotron'] = function(mount){
  const K = window.SimKit, C = K.C, QM = 9.58e7;            // e/m du proton (C/kg)
  let B = 5, v0 = 50, E = 0, sgn = 1, t = 0, trail = [], last = null, run = true;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 340);
  const reset = () => { t = 0; trail = []; run = true; };
  K.slider(ctr, 'Champ magnétique B (sortant)', 1, 10, 0.5, B, x => K.fmt(x, 1) + ' mT', x => { B = x; reset(); });
  K.slider(ctr, 'Vitesse initiale v₀ (vers la droite)', 0, 100, 5, v0, x => K.fmt(x, 0) + ' km/s', x => { v0 = x; reset(); });
  K.slider(ctr, 'Champ électrique E (vers le haut)', 0, 300, 10, E, x => K.fmt(x, 0) + ' V/m', x => { E = x; reset(); });
  K.select(ctr, 'Particule', [['1', 'proton (charge +e)'], ['-1', 'antiproton (charge −e)']], x => { sgn = +x; reset(); });
  K.button(ctr, '↺ Relancer', reset, true);
  const out = K.readout(ctr);
  const S = 600, X0 = 150, Y0 = 170, SLOW = 8e-6;            // px par mètre, origine, secondes réelles par seconde d'écran
  function pos(tt){
    const w = sgn * QM * B * 1e-3, vd = E / (B * 1e-3), vp = v0 * 1e3 - vd;   // pulsation signée, dérive, vitesse dans le référentiel de dérive
    return [vd * tt + vp / w * Math.sin(w * tt), vp / w * (Math.cos(w * tt) - 1)];
  }
  function arrow(x1, y1, x2, y2, col){
    const a = Math.atan2(y2 - y1, x2 - x1); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 8 * Math.cos(a - 0.4), y2 - 8 * Math.sin(a - 0.4)); ctx.lineTo(x2 - 8 * Math.cos(a + 0.4), y2 - 8 * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
  }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    // champ B : points (vecteur sortant)
    ctx.strokeStyle = '#b9dcc6'; ctx.fillStyle = '#7fbf97'; ctx.lineWidth = 1;
    for (let x = 40; x < 640; x += 80) for (let y = 40; y < 340; y += 75){ ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); }
    K.text(ctx, 'B', 52, 30, {size: 12, bold: true, color: C.green});
    if (E > 0){ for (let x = 80; x < 640; x += 160) arrow(x, 330, x, 330 - 12 - E / 10, '#d9900b'); K.text(ctx, 'E', 92, 322, {size: 12, bold: true, color: C.amber}); }
    // règle de 10 cm
    ctx.strokeStyle = C.grey; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(560, 20); ctx.lineTo(560 + 0.1 * S, 20); ctx.stroke(); K.text(ctx, '10 cm', 560 + 0.05 * S, 32, {size: 11, color: C.ink, align: 'center'});
    // trajectoire
    if (trail.length > 1){ ctx.strokeStyle = sgn > 0 ? C.red : C.blue; ctx.lineWidth = 2.2; ctx.beginPath(); trail.forEach((p, i) => { const X = X0 + p[0] * S, Y = Y0 - p[1] * S; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); }
    const p = pos(t), X = X0 + p[0] * S, Y = Y0 - p[1] * S;
    ctx.fillStyle = sgn > 0 ? C.red : C.blue; ctx.beginPath(); ctx.arc(X, Y, 6, 0, 7); ctx.fill();
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(X0, Y0, 2.5, 0, 7); ctx.fill();
    const w = QM * B * 1e-3, vd = E / (B * 1e-3), R = Math.abs(v0 * 1e3 - vd) / w, T = 2 * Math.PI / w;
    out.innerHTML = `Pulsation cyclotron ω = |q|B/m = <b>${K.fmt(w / 1e5, 2)} × 10⁵ rad/s</b>, période <b>${K.fmt(T * 1e6, 1)} µs</b> : elle ne dépend pas de la vitesse.<br>` +
      (E === 0 ? `Rayon R = mv₀/|q|B = <b>${K.fmt(R * 100, 1)} cm</b>. La vitesse garde sa norme : la force magnétique ne travaille pas.`
        : `Vitesse de dérive E/B = <b>${K.fmt(vd / 1e3, 1)} km/s</b>, vers la droite quel que soit le signe de la charge. Rayon du cercle dans le référentiel de dérive : <b>${K.fmt(R * 100, 1)} cm</b>.` +
          (Math.abs(v0 * 1e3 - vd) < 0.02 * vd ? ` <b>v₀ = E/B : filtre de vitesse, la trajectoire est une droite.</b>` : (v0 === 0 ? ` Partie du repos, la particule décrit une cycloïde.` : ``)));
  }
  function step(dt){
    if (!run) return;
    const n = 6; for (let k = 0; k < n; k++){ t += dt * SLOW / n; const p = pos(t); if (trail.length < 6000) trail.push(p);
      const X = X0 + p[0] * S, Y = Y0 - p[1] * S; if (X < -40 || X > 680 || Y < -40 || Y > 380){ run = false; break; } }
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; step(dt); draw(); requestAnimationFrame(loop); })(performance.now());
};
