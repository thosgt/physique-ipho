/* Simulation : vitesse et accélération dans la base de Frenet (u_T, u_N) et la base polaire (u_r, u_θ).
   a_T = dv/dt change la norme de la vitesse, a_N = v²/R sa direction. Trajectoires : cercle uniforme, cercle accéléré, orbite de Kepler. */
window.SIMS['polaire'] = function(mount){
  const K = window.SimKit, C = K.C;
  let tr = 'unif', t = 0, run = true, last = 0, base = 'frenet', orb = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.select(ctr, 'Mouvement', [['unif', 'Cercle à vitesse constante'], ['acc', 'Cercle, vitesse croissante'], ['frein', 'Cercle, freinage'], ['kepler', 'Orbite elliptique (Kepler)']], v => { tr = v; t = 0; });
  K.select(ctr, 'Base affichée', [['frenet', 'Frenet : tangente et normale'], ['polaire', 'Polaire : u_r et u_θ']], v => { base = v; });
  const bp = K.button(ctr, 'Pause', () => { run = !run; bp.textContent = run ? 'Pause' : 'Reprendre'; });
  const out = K.readout(ctr);
  const R = 1.2, GM = 1;
  function kepler(){ // orbite : périhélie 0,55, aphélie 1,65 (unités arbitraires), intégration RK4
    const rp = 0.55, ra = 1.65, aa = (rp + ra) / 2, vp = Math.sqrt(GM * (2 / rp - 1 / aa)); let s = [rp, 0, 0, vp]; const dt = 0.002, T = 2 * Math.PI * Math.sqrt(aa ** 3 / GM), N = Math.ceil(T / dt), pts = [];
    const f = s => { const r3 = Math.hypot(s[0], s[1]) ** 3; return [s[2], s[3], -GM * s[0] / r3, -GM * s[1] / r3]; };
    for (let i = 0; i <= N; i++){ pts.push(s.slice()); const k1 = f(s), k2 = f(s.map((v, j) => v + dt / 2 * k1[j])), k3 = f(s.map((v, j) => v + dt / 2 * k2[j])), k4 = f(s.map((v, j) => v + dt * k3[j])); s = s.map((v, j) => v + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); }
    return {pts, dt, T}; }
  function state(u){
    if (tr === 'kepler'){ if (!orb) orb = kepler(); const q = (u % orb.T) / orb.dt, i = Math.floor(q), s = orb.pts[Math.min(i, orb.pts.length - 1)], r3 = Math.hypot(s[0], s[1]) ** 3; return {x: s[0] + 0.55, y: s[1], vx: s[2], vy: s[3], ax: -GM * s[0] / r3, ay: -GM * s[1] / r3, cx: 0.55, cy: 0}; }
    let th, w, al;
    if (tr === 'unif'){ w = 1.2; al = 0; th = w * u; }
    else if (tr === 'acc'){ const T = 6, uu = u % T; al = 0.25; w = 0.3 + al * uu; th = 0.3 * uu + 0.5 * al * uu * uu; }
    else { const T = 6, uu = u % T; al = -0.22; w = 1.6 + al * uu; th = 1.6 * uu + 0.5 * al * uu * uu; }
    const c = Math.cos(th), s = Math.sin(th);
    return {x: R * c, y: R * s, vx: -R * w * s, vy: R * w * c, ax: -R * w * w * c - R * al * s, ay: -R * w * w * s + R * al * c, cx: 0, cy: 0};
  }
  function arrow(x1, y1, x2, y2, col, w){ const a = Math.atan2(y2 - y1, x2 - x1), h = 10, L = Math.hypot(x2 - x1, y2 - y1); if (L < 2) return; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.min(h, L) * 0.6 * Math.cos(a), y2 - Math.min(h, L) * 0.6 * Math.sin(a)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)); ctx.lineTo(x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill(); }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const k = 120, X0 = 250, Y0 = 195, sx = x => X0 + k * x, sy = y => Y0 - k * y;
    // trajectoire
    ctx.strokeStyle = C.light; ctx.lineWidth = 2; ctx.beginPath();
    if (tr === 'kepler'){ if (!orb) orb = kepler(); orb.pts.forEach((p, i) => i % 10 ? 0 : (i ? ctx.lineTo(sx(p[0] + 0.55), sy(p[1])) : ctx.moveTo(sx(p[0] + 0.55), sy(p[1])))); ctx.closePath(); }
    else ctx.arc(X0, Y0, k * R, 0, 7);
    ctx.stroke();
    const S = state(t), v = Math.hypot(S.vx, S.vy), uT = [S.vx / v, S.vy / v], aT = S.ax * uT[0] + S.ay * uT[1], aN = [S.ax - aT * uT[0], S.ay - aT * uT[1]], aNn = Math.hypot(...aN), Rc = aNn > 1e-6 ? v * v / aNn : Infinity;
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(sx(S.cx), sy(S.cy), 5, 0, 7); ctx.fill(); K.text(ctx, tr === 'kepler' ? 'astre attracteur' : 'centre', sx(S.cx) + 8, sy(S.cy) + 14, {size: 11, color: C.ink});
    const P = [sx(S.x), sy(S.y)], AM = {unif: 1.73, acc: 3.9, frein: 3.1, kepler: 3.3}[tr], VM = {unif: 1.44, acc: 1.8, frein: 1.92, kepler: 1.65}[tr], kv = Math.min(55, 100 / VM), ka = Math.min(55, 110 / AM);
    if (base === 'polaire'){ const rr = Math.hypot(S.x - S.cx, S.y - S.cy), ur = [(S.x - S.cx) / rr, (S.y - S.cy) / rr], ut = [-ur[1], ur[0]];
      ctx.strokeStyle = C.grey; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx(S.cx), sy(S.cy)); ctx.lineTo(P[0], P[1]); ctx.stroke(); ctx.setLineDash([]);
      arrow(P[0], P[1], P[0] + 40 * ur[0], P[1] - 40 * ur[1], C.green, 2); K.text(ctx, 'u_r', P[0] + 50 * ur[0], P[1] - 50 * ur[1], {size: 11, bold: true, color: C.green, align: 'center'});
      arrow(P[0], P[1], P[0] + 40 * ut[0], P[1] - 40 * ut[1], C.green, 2); K.text(ctx, 'u_θ', P[0] + 52 * ut[0], P[1] - 52 * ut[1], {size: 11, bold: true, color: C.green, align: 'center'}); }
    else {
      arrow(P[0], P[1], P[0] + ka * aT * uT[0], P[1] - ka * aT * uT[1], C.amber, 2.5);
      arrow(P[0], P[1], P[0] + ka * aN[0], P[1] - ka * aN[1], C.amber, 2.5);
      if (Math.abs(aT) > 0.03) K.text(ctx, 'a_T', P[0] + ka * aT * uT[0] + 8, P[1] - ka * aT * uT[1], {size: 11, bold: true, color: C.amber});
      { const nn = Math.hypot(...aN) || 1; K.text(ctx, 'a_N', P[0] + ka * aN[0] * 0.55 + 14 * aN[1] / nn, P[1] - ka * aN[1] * 0.55 + 14 * aN[0] / nn, {size: 11, bold: true, color: '#b85a0c', align: 'center'}); } }
    arrow(P[0], P[1], P[0] + ka * S.ax, P[1] - ka * S.ay, C.red, 3); K.text(ctx, 'a', P[0] + ka * S.ax * 1.1 + 6, P[1] - ka * S.ay * 1.1, {size: 13, bold: true, color: C.red});
    arrow(P[0], P[1], P[0] + kv * S.vx, P[1] - kv * S.vy, C.blue, 3); K.text(ctx, 'v', P[0] + kv * S.vx * 1.1 + 6, P[1] - kv * S.vy * 1.1, {size: 13, bold: true, color: C.blue});
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(P[0], P[1], 6, 0, 7); ctx.fill();
    // légende et jauges
    K.text(ctx, 'vitesse v', 470, 40, {size: 12, bold: true, color: C.blue}); K.text(ctx, 'accélération a', 470, 60, {size: 12, bold: true, color: C.red});
    if (base === 'frenet') K.text(ctx, 'composantes a_T et a_N', 470, 80, {size: 12, bold: true, color: C.amber}); else K.text(ctx, 'base polaire (u_r, u_θ)', 470, 80, {size: 12, bold: true, color: C.green});
    out.innerHTML = `v = <b>${K.fmt(v, 2)}</b><br>a_T = dv/dt = <b>${K.fmt(Math.abs(aT) < 0.005 ? 0 : aT, 2)}</b> ${Math.abs(aT) < 0.02 ? '(vitesse constante)' : aT > 0 ? '(accélère)' : '(freine)'}<br>a_N = v²/R = <b>${K.fmt(aNn, 2)}</b><br>Rayon de courbure R = ${isFinite(Rc) ? K.fmt(Rc, 2) : '∞'}${tr === 'kepler' ? '<br>L’accélération pointe toujours vers l’astre.' : ''}`;
  }
  (function loop(now){ if (!mount.isConnected) return; const d = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (run) t += d * (tr === 'kepler' ? 1.6 : 1); draw(); requestAnimationFrame(loop); })(performance.now());
};
