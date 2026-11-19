/* Simulation : un palet lancé sur un manège tournant, vu du sol (galiléen) et vu du manège (non galiléen).
   Vu du sol, le palet (sans frottement) va en ligne droite ; vu du manège, sa trajectoire s'incurve :
   c'est l'effet de la force de Coriolis -2m ω × v' (et de la force centrifuge). Rotation dans le sens direct
   (comme la Terre vue du pôle Nord) : déviation vers la droite. */
window.SIMS['manege'] = function(mount){
  const K = window.SimKit, C = K.C, Rm = 3;      // rayon du manège (m)
  let om = 0.6, v0 = 2, launch = 'centre', t = 0, flying = false, trail = [], phi = 0;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 340);
  K.slider(ctr, 'Vitesse angulaire du manège ω', 0, 1.5, 0.05, om, x => K.fmt(x, 2) + ' rad/s', x => { om = x; });
  K.slider(ctr, 'Vitesse de lancement par rapport au manège', 0.5, 4, 0.1, v0, x => K.fmt(x, 1) + ' m/s', x => { v0 = x; });
  K.select(ctr, 'Point de lancement', [['centre', 'du centre vers le bord'], ['bord', 'du bord vers le centre']], x => { launch = x; });
  K.button(ctr, '▶ Lancer le palet', () => { t = 0; flying = true; trail = []; });
  const out = K.readout(ctr);
  // position du palet dans le référentiel du sol (le lanceur est fixé au manège : il tourne avec lui)
  function posSol(tt){
    if (launch === 'centre'){ const a0 = phi0; return [v0 * tt * Math.cos(a0), v0 * tt * Math.sin(a0)]; }
    // lancé du bord, au point du manège d'angle phi0, avec la vitesse du bord (ω R, tangentielle) + v0 vers le centre
    const x0 = Rm * Math.cos(phi0), y0 = Rm * Math.sin(phi0);
    const vx = -v0 * Math.cos(phi0) - om * Rm * Math.sin(phi0), vy = -v0 * Math.sin(phi0) + om * Rm * Math.cos(phi0);
    return [x0 + vx * tt, y0 + vy * tt];
  }
  let phi0 = 0, last = null;
  function disk(cx, cy, rot, title){
    const s = 42;
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = '#f3f6fb'; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, Rm * s, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c9d2df'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 6; k++){ const a = rot + k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Rm * s * Math.cos(a), -Rm * s * Math.sin(a)); ctx.stroke(); }
    ctx.fillStyle = '#b5651d'; ctx.beginPath(); ctx.arc((launch === 'centre' ? 0 : Rm * s * Math.cos(rot)), -(launch === 'centre' ? 0 : Rm * s * Math.sin(rot)), 6, 0, 7); ctx.fill();
    ctx.restore();
    K.text(ctx, title, cx, 22, {size: 13, bold: true, color: C.navy, align: 'center'});
    return s;
  }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const A = [160, 180], B = [480, 180];
    const sA = disk(A[0], A[1], phi, 'Vu du sol (galiléen)');
    const sB = disk(B[0], B[1], 0, 'Vu du manège (tourne avec lui)');
    // flèche de rotation
    ctx.strokeStyle = C.grey; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(A[0], A[1], Rm * sA + 12, -0.9, -0.2); ctx.stroke();
    K.text(ctx, 'ω', A[0] + (Rm * sA + 18) * Math.cos(-0.55), A[1] + (Rm * sA + 18) * Math.sin(-0.55), {size: 12, bold: true, color: C.grey});
    // trajectoires
    const draw1 = (pts, c, s, col) => { if (pts.length < 2) return; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach((p, i) => { const X = c[0] + p[0] * s, Y = c[1] - p[1] * s; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); const p = pts[pts.length - 1]; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(c[0] + p[0] * s, c[1] - p[1] * s, 6, 0, 7); ctx.fill(); };
    draw1(trail.map(q => q.sol), A, sA, C.red);
    draw1(trail.map(q => q.rot), B, sB, C.blue);
    out.innerHTML = `Vu du sol, le palet (sans frottement) va en <b>ligne droite</b> à vitesse constante : aucune force horizontale.<br>` +
      `Vu du manège, sa trajectoire s’incurve <b>vers la droite</b> (rotation dans le sens direct) : on l’attribue aux forces d’inertie, Coriolis −2m ω × v′ et centrifuge m ω² r.<br>` +
      `Accélération de Coriolis au départ : 2ωv = ${K.fmt(2 * om * v0, 2)} m/s². Si ω = 0, les deux trajectoires coïncident.`;
  }
  function step(dt){
    if (!flying){ phi = (phi + om * dt) % (2 * Math.PI); phi0 = phi; return; }
    t += dt; phi = (phi + om * dt) % (2 * Math.PI);
    const p = posSol(t);
    if (Math.hypot(p[0], p[1]) > Rm + 0.02 || t > 12){ flying = false; return; }
    const ca = Math.cos(phi), sa = Math.sin(phi);   // coordonnées dans le repère du manège (lanceur sur l'axe x)
    const pr = [p[0] * ca + p[1] * sa, -p[0] * sa + p[1] * ca];
    trail.push({sol: p, rot: pr});
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; step(dt); draw(); requestAnimationFrame(loop); })(performance.now());
};
