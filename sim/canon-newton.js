/* Simulation : le canon de Newton. Un projectile est lancé horizontalement depuis l'altitude h au-dessus de la Terre (sans atmosphère).
   v < v_c : il retombe ; v = v_c = sqrt(GM/r) : orbite circulaire ; v_c < v < v_l : ellipse ; v >= v_l = sqrt(2GM/r) : il s'échappe.
   Énergie E = ½ m v² - GMm/r : négative pour une orbite liée, avec E = -GMm/2a. */
window.SIMS['canon-newton'] = function(mount){
  const K = window.SimKit, C = K.C, GM = 3.986e14, R = 6.371e6;
  let h = 800e3, v = 7.0e3, shots = [], last = null;
  const COLS = [C.red, C.blue, C.green, C.amber, '#7a4fb5', C.navy];
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 460);
  K.slider(ctr, 'Altitude du canon h', 100, 3000, 50, h / 1e3, x => x + ' km', x => { h = x * 1e3; });
  K.slider(ctr, 'Vitesse horizontale v', 1, 12, 0.05, v / 1e3, x => K.fmt(x, 2) + ' km/s', x => { v = x * 1e3; });
  K.button(ctr, '▶ Tirer', () => fire(v));
  K.button(ctr, 'Tirer à v_c (orbite circulaire)', () => fire(Math.sqrt(GM / (R + h))), true);
  K.button(ctr, 'Tirer à v_l (libération)', () => fire(Math.sqrt(2 * GM / (R + h))), true);
  K.button(ctr, 'Effacer', () => { shots = []; }, true);
  const out = K.readout(ctr);
  function fire(vv){
    const r0 = R + h;
    shots.push({x: 0, y: r0, vx: vv, vy: 0, t: 0, trail: [[0, r0]], end: '', v0: vv, r0, col: COLS[shots.length % COLS.length], ang: 0});
    if (shots.length > 6) shots.shift();
  }
  function accel(x, y){ const r = Math.hypot(x, y), a = -GM / (r * r * r); return [a * x, a * y]; }
  function step(s, T){
    const hh = 4;                                   // pas de 4 s (Runge-Kutta 4)
    for (let k = 0; k < T / hh && !s.end; k++){
      const f = (x, y, vx, vy) => { const [ax, ay] = accel(x, y); return [vx, vy, ax, ay]; };
      const k1 = f(s.x, s.y, s.vx, s.vy), k2 = f(s.x + k1[0] * hh / 2, s.y + k1[1] * hh / 2, s.vx + k1[2] * hh / 2, s.vy + k1[3] * hh / 2);
      const k3 = f(s.x + k2[0] * hh / 2, s.y + k2[1] * hh / 2, s.vx + k2[2] * hh / 2, s.vy + k2[3] * hh / 2), k4 = f(s.x + k3[0] * hh, s.y + k3[1] * hh, s.vx + k3[2] * hh, s.vy + k3[3] * hh);
      const px = s.x, py = s.y;
      s.x += hh / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); s.y += hh / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      s.vx += hh / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]); s.vy += hh / 6 * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]); s.t += hh;
      // angle parcouru (pour arrêter une orbite après un tour)
      s.ang += Math.atan2(px * s.y - py * s.x, px * s.x + py * s.y);
      const r = Math.hypot(s.x, s.y);
      if (r <= R){ s.end = 'sol'; }
      else if (r > 14 * R) s.end = 'loin';
      else if (Math.abs(s.ang) >= 2 * Math.PI) s.end = 'tour';
    }
    s.trail.push([s.x, s.y]);
  }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const cx = 320, cy = 250, sc = 120 / R;                // le rayon terrestre vaut 120 px
    ctx.fillStyle = '#cfe3f7'; ctx.beginPath(); ctx.arc(cx, cy, R * sc + 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#5aa9ff'; ctx.beginPath(); ctx.arc(cx, cy, R * sc, 0, 7); ctx.fill();
    ctx.fillStyle = '#3d8a4f'; [[-0.6, 0.5, 0.5], [0.4, -0.2, 0.6], [-0.2, -0.65, 0.35]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.ellipse(cx + a * 90, cy + b * 90, r * 40, r * 26, a, 0, 7); ctx.fill(); });
    // montagne et canon
    const my = cy - (R + h) * sc;
    ctx.fillStyle = '#8a6d4b'; ctx.beginPath(); ctx.moveTo(cx - 20 - h * sc * 0.4, cy - R * sc + 3); ctx.lineTo(cx, my); ctx.lineTo(cx + 20 + h * sc * 0.4, cy - R * sc + 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.navy; ctx.fillRect(cx - 4, my - 6, 18, 6);
    // orbite circulaire de référence
    ctx.setLineDash([3, 4]); ctx.strokeStyle = C.grey; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, (R + h) * sc, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    shots.forEach(s => {
      ctx.strokeStyle = s.col; ctx.lineWidth = 2; ctx.beginPath(); s.trail.forEach(([x, y], i) => { const X = cx + x * sc, Y = cy - y * sc; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke();
      if (!s.end || s.end === 'tour'){ ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(cx + s.x * sc, cy - s.y * sc, 4.5, 0, 7); ctx.fill(); }
      if (s.end === 'sol'){ const X = cx + s.x * sc, Y = cy - s.y * sc; ctx.strokeStyle = s.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X - 5, Y - 5); ctx.lineTo(X + 5, Y + 5); ctx.moveTo(X + 5, Y - 5); ctx.lineTo(X - 5, Y + 5); ctx.stroke(); }
    });
    const r0 = R + h, vc = Math.sqrt(GM / r0), vl = Math.sqrt(2 * GM / r0);
    K.text(ctx, `v_c = ${K.fmt(vc / 1e3, 2)} km/s`, 14, 22, {size: 12, color: C.ink}); K.text(ctx, `v_l = ${K.fmt(vl / 1e3, 2)} km/s`, 14, 42, {size: 12, color: C.ink});
    K.text(ctx, 'pointillés : orbite circulaire à l’altitude h', 14, 448, {size: 11, color: C.grey});
    const L = shots[shots.length - 1];
    let t = `À l’altitude ${Math.round(h / 1e3)} km (r = ${Math.round(r0 / 1e3)} km) : vitesse circulaire √(GM/r) = <b>${K.fmt(vc / 1e3, 2)} km/s</b>, vitesse de libération √(2GM/r) = <b>${K.fmt(vl / 1e3, 2)} km/s</b> (= √2 v_c).<br>`;
    if (L){
      const E = 0.5 * L.v0 * L.v0 - GM / L.r0;
      t += `Dernier tir à ${K.fmt(L.v0 / 1e3, 2)} km/s : énergie massique E = ${K.fmt(E / 1e6, 1)} MJ/kg, `;
      if (E >= 0) t += '<b>positive : le projectile s’échappe</b> (parabole si E = 0, hyperbole au-delà).';
      else {
        const a = -GM / (2 * E), rp = Math.min(L.r0, 2 * a - L.r0), T = 2 * Math.PI * Math.sqrt(a ** 3 / GM);
        t += `négative : trajectoire liée, ellipse de demi-grand axe a = ${Math.round(a / 1e3)} km, période ${K.fmt(T / 60, 0)} min. `;
        t += rp < R ? '<b>L’ellipse coupe la Terre : le projectile retombe.</b>' : Math.abs(L.v0 - vc) < 20 ? '<b>Orbite circulaire.</b>' : `<b>Satellisé</b> : ${L.v0 > vc ? 'le canon est au périgée' : 'le canon est à l’apogée'} (${Math.round((2 * a - L.r0 - R) / 1e3)} km d’altitude au point opposé).`;
      }
    } else t += 'Tirez plusieurs fois en augmentant v : chute, orbite circulaire, ellipse, libération.';
    out.innerHTML = t;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; shots.forEach(s => { if (!s.end) step(s, dt * 900); }); draw(); requestAnimationFrame(loop); })(performance.now());
};
