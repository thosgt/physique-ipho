/* Simulation : rayon paraxial dans une suite de lentilles minces régulièrement espacées de d.
   Lentille : alpha -> alpha - y/f ; propagation : y -> y + d alpha. Lentilles identiques : y_{n+1} = (2 - d/f) y_n - y_{n-1},
   confinement si 0 < d < 4f (cos theta = 1 - d/2f). Lentilles alternées +f, -f : confinement si d <= 2f. */
window.SIMS['lentilles-periodiques'] = function(mount){
  const K = window.SimKit, C = K.C, N = 16;
  let r = 1, conf = 'id', h = 1, a0 = 0;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Espacement d / f′', 0.2, 5, 0.05, r, v => K.fmt(v, 2), v => { r = v; });
  K.select(ctr, 'Lentilles', [['id', 'toutes convergentes (f′)'], ['alt', 'alternées : +f′, −f′, +f′…']], v => { conf = v; });
  K.slider(ctr, 'Pente d’entrée (en h/f′)', -1, 1, 0.05, a0, v => K.fmt(v, 2), v => { a0 = v; });
  K.button(ctr, 'd = f′', () => set(1), true); K.button(ctr, 'd = 2f′', () => set(2), true); K.button(ctr, 'd = 4f′ (limite)', () => set(4), true);
  const out = K.readout(ctr);
  const sl = ctr.querySelector('input');
  function set(v){ r = v; sl.value = v; sl.dispatchEvent(new Event('input')); }
  function trace(){
    // unités : f' = 1, hauteur d'entrée h = 1 ; le rayon arrive avec la pente a0 sur la lentille 0
    const ys = [], f = n => conf === 'alt' && n % 2 ? -1 : 1;
    let y = h, a = a0;
    for (let n = 0; n < N; n++){ ys.push(y); a = a - y / f(n); y = y + r * a; }
    ys.push(y); return ys;
  }
  function lens(X, Y0, H, conv){
    ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(90,169,255,0.25)';
    ctx.beginPath();
    if (conv){ ctx.moveTo(X, Y0 - H); ctx.quadraticCurveTo(X + 9, Y0, X, Y0 + H); ctx.quadraticCurveTo(X - 9, Y0, X, Y0 - H); }
    else { ctx.moveTo(X - 6, Y0 - H); ctx.lineTo(X + 6, Y0 - H); ctx.quadraticCurveTo(X, Y0, X + 6, Y0 + H); ctx.lineTo(X - 6, Y0 + H); ctx.quadraticCurveTo(X, Y0, X - 6, Y0 - H); }
    ctx.fill(); ctx.stroke();
  }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const ys = trace(), X0 = 30, sp = 36, Y0 = 170, hl = 120;
    const mx = Math.max(1.2, ...ys.slice(0, 7).map(Math.abs)), sc = Math.min(70, (hl - 8) / mx);
    ctx.strokeStyle = C.navy; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, Y0); ctx.lineTo(630, Y0); ctx.stroke();
    for (let n = 0; n < N; n++) lens(X0 + 20 + n * sp, Y0, hl, !(conf === 'alt' && n % 2));
    // rayon (coupé s'il sort du dessin)
    ctx.save(); ctx.beginPath(); ctx.rect(0, Y0 - hl - 10, 640, 2 * hl + 20); ctx.clip();
    ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0 - 20, Y0 - sc * (h - a0 * 20 / sp * r));
    ys.forEach((y, n) => ctx.lineTo(X0 + 20 + n * sp, Y0 - sc * y)); ctx.stroke();
    ys.slice(0, N).forEach((y, n) => { ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(X0 + 20 + n * sp, Y0 - sc * y, 3, 0, 7); ctx.fill(); });
    ctx.restore();
    K.text(ctx, 'lentilles dessinées équidistantes ; hauteurs à l’échelle', 14, 18, {size: 11, color: C.ink});
    const esc = ys.findIndex(y => Math.abs(y) * sc > hl + 8);
    if (esc >= 0) K.text(ctx, '→ le rayon sort des lentilles', 630, 18, {size: 12, bold: true, color: C.red, align: 'right'});
    // suite des hauteurs
    K.text(ctx, 'y₀ … y₈ (en h) : ' + ys.slice(0, 9).map(y => K.fmt(y, 2)).join('  '), 14, 330, {size: 11, color: C.ink});
    // analyse
    let tr, lim;
    if (conf === 'id'){ tr = 2 - r; lim = 4; } else { tr = 2 - r * r; lim = 2; }      // trace de la matrice d'une période (1 ou 2 lentilles)
    let t;
    if (Math.abs(tr) < 2){
      const th = Math.acos(tr / 2), per = 2 * Math.PI / th;
      t = `<b>Rayon confiné</b> : cos θ = ${conf === 'id' ? '1 − d/2f′' : '1 − d²/2f′²'} = ${K.fmt(tr / 2, 3)}, θ = ${K.fmt(th * 180 / Math.PI, 1)}°. La hauteur oscille avec une période de ${K.fmt(per, 2)} ${conf === 'id' ? 'lentilles' : 'paires de lentilles'}${Math.abs(per - Math.round(per)) < 0.01 ? ' : le rayon se reproduit exactement' : ''}.`;
    } else if (Math.abs(Math.abs(tr) - 2) < 1e-9) t = `<b>Cas limite</b> (d = ${lim}f′) : racine double, l’écart à l’axe croît en général linéairement.`;
    else { const rho = (Math.abs(tr) + Math.sqrt(tr * tr - 4)) / 2; t = `<b>Rayon non confiné</b> : la hauteur est multipliée par ${K.fmt(rho, 2)} à chaque ${conf === 'id' ? 'lentille' : 'paire'} (racine réelle de module supérieur à 1).`; }
    t += conf === 'id' ? `<br>Récurrence : y<sub>n+1</sub> = (2 − d/f′) y<sub>n</sub> − y<sub>n−1</sub> ; confinement pour 0 < d < 4f′.` : `<br>Lentilles alternées : bien qu’une sur deux soit divergente, l’ensemble focalise tant que d ≤ 2f′ (focalisation forte des accélérateurs).`;
    out.innerHTML = t;
  }
  (function loop(){ if (!mount.isConnected) return; draw(); requestAnimationFrame(loop); })();
};
