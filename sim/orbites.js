/* Simulation : orbites autour du Soleil et lois de Kepler (unités : UA, année ; GM = 4 pi²).
   Lancement à r0 = 1 UA avec une vitesse v (en unités de la vitesse circulaire) faisant l'angle beta avec la direction perpendiculaire au rayon.
   Énergie E = v²/2 - GM/r = -GM/2a ; moment cinétique C = r v cos(beta) = r_p v_p = r_a v_a ;
   loi des aires : secteurs balayés en des durées égales (T/12) d'aires égales ; troisième loi : T² = a³ (en années et UA). */
window.SIMS['orbites'] = function(mount){
  const K = window.SimKit, C = K.C, GM = 4 * Math.PI * Math.PI;
  let vr = 1.2, beta = 0, aires = true, s = null, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 440);
  K.slider(ctr, 'Vitesse de lancement (× vitesse circulaire)', 0.3, 1.6, 0.01, vr, x => K.fmt(x, 2) + ' (' + K.fmt(x * 29.8, 1) + ' km/s)', x => { vr = x; launch(); });
  K.slider(ctr, 'Angle β avec la perpendiculaire au rayon', -60, 60, 1, beta, x => x + '°', x => { beta = x; launch(); });
  K.select(ctr, 'Afficher', [['oui', 'les aires balayées en T/12'], ['non', 'la trajectoire seule']], x => { aires = x === 'oui'; });
  K.button(ctr, '▶ Relancer', launch);
  const out = K.readout(ctr);
  function elements(){
    const r = 1, v = vr * 2 * Math.PI, b = beta * Math.PI / 180, E = v * v / 2 - GM / r, h = r * v * Math.cos(b);
    const e = Math.sqrt(Math.max(0, 1 + 2 * E * h * h / (GM * GM)));
    if (E >= 0) return {E, h, e, bound: false};
    const a = -GM / (2 * E);
    return {E, h, e, a, rp: a * (1 - e), ra: a * (1 + e), T: Math.pow(a, 1.5), bound: true};
  }
  function launch(){
    const v = vr * 2 * Math.PI, b = beta * Math.PI / 180;
    s = {x: 1, y: 0, vx: v * Math.sin(b), vy: v * Math.cos(b), t: 0, trail: [[1, 0, 0]], full: false, el: elements()};
  }
  launch();
  function step(dt){
    let rem = dt;
    while (rem > 1e-12){
      const h = Math.min(rem, 0.0015 * Math.pow(Math.hypot(s.x, s.y), 1.5)); rem -= h;      // pas adapté : petit près du Soleil
      const f = (x, y) => { const r = Math.hypot(x, y), a = -GM / (r * r * r); return [a * x, a * y]; };
      // Verlet (symplectique : l'orbite ne dérive pas)
      const [ax, ay] = f(s.x, s.y); s.vx += ax * h / 2; s.vy += ay * h / 2; s.x += s.vx * h; s.y += s.vy * h;
      const [bx, by] = f(s.x, s.y); s.vx += bx * h / 2; s.vy += by * h / 2; s.t += h;
      if (Math.hypot(s.x, s.y) < 0.02){ s.dead = true; break; }
    }
    if (!s.full) s.trail.push([s.x, s.y, s.t]);
    if (s.el.bound && s.t >= s.el.T) s.full = true;
    if (!s.el.bound && Math.hypot(s.x, s.y) > 12) s.dead = true;
  }
  function arrow(x0, y0, x1, y1, col, lab){ const L = Math.hypot(x1 - x0, y1 - y0); if (L < 3) return; const a = Math.atan2(y1 - y0, x1 - x0); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 8 * Math.cos(a - .4), y1 - 8 * Math.sin(a - .4)); ctx.lineTo(x1 - 8 * Math.cos(a + .4), y1 - 8 * Math.sin(a + .4)); ctx.closePath(); ctx.fill(); if (lab) K.text(ctx, lab, x1 + 6, y1, {size: 12, bold: true, color: col}); }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const el = s.el;
    // cadrage : le centre de l'ellipse est au centre du dessin, le Soleil (foyer) est décalé
    const sc = el.bound ? Math.min(190, 185 / el.a) : 70;
    // direction du périhélie
    const ex = (s.trail[0] && el.bound) ? (() => { const x = 1, y = 0, vx = vr * 2 * Math.PI * Math.sin(beta * Math.PI / 180), vy = vr * 2 * Math.PI * Math.cos(beta * Math.PI / 180), rv = x * vx + y * vy, v2 = vx * vx + vy * vy; return [(v2 - GM) * x / GM - rv * vx / GM, (v2 - GM) * y / GM - rv * vy / GM]; })() : [0, 0];
    const ang = Math.atan2(ex[1], ex[0]);
    const cxw = el.bound ? -el.a * el.e * Math.cos(ang) : 0, cyw = el.bound ? -el.a * el.e * Math.sin(ang) : 0;       // centre de l'ellipse
    const ox = 320 - cxw * sc, oy = 225 + cyw * sc, P = (x, y) => [ox + x * sc, oy - y * sc];
    // secteurs d'aires égales
    if (aires && el.bound && s.trail.length > 2){
      const dT = el.T / 12; let k = 0, poly = [];
      const flush = () => { if (poly.length > 1){ ctx.fillStyle = k % 2 ? 'rgba(217,144,11,0.22)' : 'rgba(11,95,165,0.18)'; ctx.beginPath(); ctx.moveTo(...P(0, 0)); poly.forEach(p => ctx.lineTo(...P(p[0], p[1]))); ctx.closePath(); ctx.fill(); } };
      s.trail.forEach(p => { const kk = Math.floor(p[2] / dT + 1e-9); if (kk !== k){ poly.push(p); flush(); k = kk; poly = [p]; } else poly.push(p); });
      flush();
    }
    ctx.strokeStyle = C.navy; ctx.lineWidth = 1.8; ctx.beginPath(); s.trail.forEach((p, i) => i ? ctx.lineTo(...P(p[0], p[1])) : ctx.moveTo(...P(p[0], p[1]))); ctx.stroke();
    // orbite terrestre de référence
    ctx.setLineDash([3, 4]); ctx.strokeStyle = C.grey; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(...P(0, 0), sc, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#f2b632'; ctx.beginPath(); ctx.arc(...P(0, 0), 11, 0, 7); ctx.fill();
    if (el.bound){
      const pp = P(el.rp * Math.cos(ang), el.rp * Math.sin(ang)), pa = P(-el.ra * Math.cos(ang), -el.ra * Math.sin(ang));
      [[pp, 'périhélie'], [pa, 'aphélie']].forEach(([p, l]) => { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(...p, 3, 0, 7); ctx.fill(); K.text(ctx, l, p[0], p[1] + 14, {size: 10, color: C.ink, align: 'center'}); });
      if (el.e > 0.05){ const f2 = P(2 * cxw, 2 * cyw); ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.arc(...f2, 3, 0, 7); ctx.stroke(); K.text(ctx, 'second foyer', f2[0], f2[1] - 12, {size: 10, color: C.grey, align: 'center'}); }
    }
    if (!s.dead){
      const p = P(s.x, s.y); ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(...p, 6, 0, 7); ctx.fill();
      arrow(p[0], p[1], p[0] + s.vx * 6, p[1] - s.vy * 6, C.red, 'v');
    }
    K.text(ctx, `t = ${K.fmt(s.t, 2)} an${s.t >= 2 ? 's' : ''}`, 14, 20, {size: 12, color: C.ink});
    K.text(ctx, 'pointillés : orbite circulaire à 1 UA (la Terre)', 14, 428, {size: 11, color: C.grey});
    let t = `Énergie massique E = v²/2 − GM/r ${el.E < 0 ? '< 0 : orbite liée' : '≥ 0 : le corps s’échappe'} (seuil : v = √2 × vitesse circulaire).<br>`;
    if (el.bound){
      const vp = el.h / el.rp, va = el.h / el.ra;
      t += `Ellipse : a = <b>${K.fmt(el.a, 3)} UA</b>, excentricité e = ${K.fmt(el.e, 3)}, r<sub>p</sub> = ${K.fmt(el.rp, 3)} UA, r<sub>a</sub> = ${K.fmt(el.ra, 3)} UA.<br>` +
        `Période T = <b>${K.fmt(el.T, 3)} an</b> : T²/a³ = ${K.fmt(el.T * el.T / el.a ** 3, 3)} (troisième loi, la même pour toutes les orbites autour du Soleil).<br>` +
        `r<sub>p</sub> v<sub>p</sub> = r<sub>a</sub> v<sub>a</sub> : ${K.fmt(vp * 4.74, 1)} km/s au périhélie, ${K.fmt(va * 4.74, 1)} km/s à l’aphélie.` + (aires ? '<br>Les secteurs colorés sont balayés en des durées égales (T/12) : leurs aires sont égales (deuxième loi).' : '');
    } else t += 'Trajectoire ouverte (hyperbole, parabole à la limite) : le corps ne revient pas.';
    if (s.dead && el.bound) t += '<br>Le corps tombe sur le Soleil.';
    out.innerHTML = t;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (!s.dead) step(dt * 0.25 * Math.max(1, s.el.bound ? s.el.T / 1.5 : 1)); draw(); requestAnimationFrame(loop); })(performance.now());
};
