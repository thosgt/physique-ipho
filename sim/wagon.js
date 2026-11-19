/* Simulation : pendule et liquide dans un wagon qui accélère, vus dans le référentiel du wagon (non galiléen).
   Force d'inertie -m a : pesanteur effective g_eff = g - a ; équilibre tan(theta) = a/g (vers l'arrière) ;
   surface libre perpendiculaire à g_eff ; période 2 pi sqrt(L / g_eff). */
window.SIMS['wagon'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81, L = 1.0;
  let a = 3, th = 0, om = 0, run = true, scroll = 0, v = 0;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Accélération du wagon a (vers la droite)', -6, 6, 0.1, a, x => K.fmt(x, 1) + ' m/s²', x => { a = x; });
  K.button(ctr, 'Lâcher le pendule depuis la verticale', () => { th = 0; om = 0; });
  K.button(ctr, 'Lâcher depuis l’équilibre', () => { th = -Math.atan(a / g); om = 0; }, true);
  const out = K.readout(ctr);
  let last = null;
  function arr(c_, x0, y0, x1, y1, o){ const ang = Math.atan2(y1 - y0, x1 - x0); ctx.strokeStyle = o.color; ctx.fillStyle = o.color; ctx.lineWidth = o.width || 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 10 * Math.cos(ang - 0.4), y1 - 10 * Math.sin(ang - 0.4)); ctx.lineTo(x1 - 10 * Math.cos(ang + 0.4), y1 - 10 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill(); }
  function step(dt){
    // L theta'' = -g sin(theta) - a cos(theta)  (theta > 0 : masse vers l'avant, à droite)
    const n = 10, h = dt / n;
    for (let i = 0; i < n; i++){ const al = (-g * Math.sin(th) - a * Math.cos(th)) / L - 0.15 * om; om += al * h; th += om * h; }
    v += a * dt; scroll = (scroll + v * dt * 40) % 80;
  }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    // décor qui défile (poteaux)
    ctx.strokeStyle = '#c9d2df'; ctx.lineWidth = 3;
    for (let x = -scroll; x < 660; x += 80){ ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 330); ctx.stroke(); }
    ctx.strokeStyle = C.grey; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 345); ctx.lineTo(640, 345); ctx.stroke();
    // wagon
    ctx.fillStyle = '#f3f6fb'; ctx.strokeStyle = C.navy; ctx.lineWidth = 2.5; ctx.fillRect(40, 40, 560, 270); ctx.strokeRect(40, 40, 560, 270);
    [110, 530].forEach(x => { ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(x, 322, 18, 0, 7); ctx.fill(); });
    // pendule
    const px = 200, py = 60, Lp = 170, bx = px + Lp * Math.sin(th), by = py + Lp * Math.cos(th);
    ctx.strokeStyle = C.navy; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 30, py); ctx.lineTo(px + 30, py); ctx.stroke();
    const te = -Math.atan(a / g);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = C.green; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 200 * Math.sin(te), py + 200 * Math.cos(te)); ctx.stroke();
    ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + 200); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(bx, by, 11, 0, 7); ctx.fill();
    // vecteurs sur la masse : poids, force d'inertie, g_eff
    const sc = 7;
    arr(ctx, bx, by, bx, by + g * sc, {color: C.blue, width: 2.5});
    if (Math.abs(a) > 0.05) arr(ctx, bx, by, bx - a * sc, by, {color: '#b5651d', width: 2.5});
    K.text(ctx, 'm g', bx + 6, by + g * sc + 4, {size: 11, color: C.blue});
    if (Math.abs(a) > 0.05) K.text(ctx, '− m a', bx - a * sc + (a > 0 ? -38 : 6), by - 8, {size: 11, color: '#b5651d'});
    K.text(ctx, 'équilibre', px + 200 * Math.sin(te) + 6, py + 200 * Math.cos(te), {size: 11, color: C.green});
    // aquarium
    const x0 = 360, x1 = 560, yb = 290, hm = 70, alpha = Math.atan(a / g);
    ctx.strokeStyle = C.navy; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, 150); ctx.lineTo(x0, yb); ctx.lineTo(x1, yb); ctx.lineTo(x1, 150); ctx.stroke();
    const xm = (x0 + x1) / 2, dy = Math.tan(alpha) * (x1 - x0) / 2;
    ctx.fillStyle = 'rgba(90,169,255,0.45)'; ctx.beginPath(); ctx.moveTo(x0 + 2, yb - hm - dy); ctx.lineTo(x1 - 2, yb - hm + dy); ctx.lineTo(x1 - 2, yb - 2); ctx.lineTo(x0 + 2, yb - 2); ctx.closePath(); ctx.fill();
    K.text(ctx, 'surface ⟂ pesanteur effective', x0 + 10, 140, {size: 11, color: C.blue});
    // sens de l'accélération
    if (Math.abs(a) > 0.05){ const ax = 320, ay = 24, d = a > 0 ? 1 : -1; arr(ctx, ax - 40 * d, ay, ax + 40 * d, ay, {color: C.navy, width: 3}); K.text(ctx, 'accélération du wagon', ax + 50, ay + 4, {size: 11, color: C.navy}); }
    const geff = Math.hypot(g, a);
    out.innerHTML = `Dans le wagon, la force d’inertie −m a s’ajoute au poids : <b>g<sub>eff</sub> = g − a</b>, de norme √(g² + a²) = ${K.fmt(geff, 2)} m/s².<br>` +
      `Équilibre du pendule : incliné de <b>${K.fmt(Math.abs(Math.atan(a / g)) * 180 / Math.PI, 1)}°</b> vers ${a >= 0 ? 'l’arrière' : 'l’avant'} (tan θ = a/g).<br>` +
      `Période des petites oscillations : 2π√(L/g<sub>eff</sub>) = ${K.fmt(2 * Math.PI * Math.sqrt(L / geff), 3)} s pour L = 1 m (${K.fmt(2 * Math.PI * Math.sqrt(L / g), 3)} s à l’arrêt).<br>` +
      `La surface de l’eau s’incline du même angle : elle reste perpendiculaire à g<sub>eff</sub>.`;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) step(dt); draw(); requestAnimationFrame(loop); })(performance.now());
};
