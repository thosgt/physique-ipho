/* Simulation : bloc sur un plan incliné avec frottement solide (lois de Coulomb).
   Sans glissement, le frottement s'ajuste : T = m g sin(a), possible tant que T <= mu_s N, soit tan(a) <= mu_s.
   Avec glissement : T = mu_d N = mu_d m g cos(a), opposé à la vitesse ; a = g (sin(a) -+ mu_d cos(a)). */
window.SIMS['plan-frottement'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81, L = 2.0;      // longueur du plan (m)
  let al = 20, mus = 0.5, mud = 0.4, start = 'repos', v0 = 3, s = 0, u = 0, state = '', last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.slider(ctr, 'Inclinaison α', 0, 60, 0.5, al, x => K.fmt(x, 1) + '°', x => { al = x; if (state === 'arrêt' || state === 'repos') check(); });
  const sS = K.slider(ctr, 'Coefficient statique μs', 0, 1.2, 0.01, mus, x => K.fmt(x, 2), x => { mus = x; if (mud > mus){ mud = mus; dS.value = mus; } if (state === 'arrêt' || state === 'repos') check(); });
  const dS = K.slider(ctr, 'Coefficient dynamique μd (≤ μs)', 0, 1.2, 0.01, mud, x => K.fmt(x, 2), x => { mud = Math.min(x, mus); if (x > mus) dS.value = mus; });
  K.select(ctr, 'Départ', [['repos', 'posé au repos en haut'], ['lance', 'lancé vers le haut depuis le bas']], x => { start = x; reset(); });
  K.slider(ctr, 'Vitesse de lancement', 0.5, 6, 0.1, v0, x => K.fmt(x, 1) + ' m/s', x => { v0 = x; });
  K.button(ctr, '▶ Remettre en place et lâcher', reset);
  const out = K.readout(ctr);
  const BL = 0.22;      // longueur du bloc (m)
  function reset(){ if (start === 'repos'){ s = 0.4; u = 0; state = 'repos'; check(); } else { s = L - BL - 0.05; u = -v0; state = 'monte'; } }
  function check(){ const r = al * Math.PI / 180; if (Math.tan(r) > mus + 1e-9 && s < L - BL - 1e-3){ state = 'glisse'; } else if (state !== 'bas') state = s < L - BL - 1e-3 ? (state === 'repos' ? 'repos' : 'arrêt') : 'bas'; }
  reset();
  function step(dt){
    const r = al * Math.PI / 180, sn = Math.sin(r), cs = Math.cos(r);
    if (state === 'repos' || state === 'arrêt' || state === 'bas') return;
    const n = 20, h = dt / n;
    for (let i = 0; i < n; i++){
      if (u === 0 && state === 'glisse' && Math.tan(r) <= mus){ state = 'arrêt'; return; }
      const sg = u > 0 ? 1 : u < 0 ? -1 : 1;
      const a = g * (sn - sg * mud * cs);
      const nu = u + a * h;
      if (u < 0 && nu >= 0){ u = 0; state = Math.tan(r) > mus ? 'glisse' : 'arrêt'; if (state === 'arrêt') return; continue; }
      if (u > 0 && nu <= 0){ u = 0; state = Math.tan(r) > mus ? 'glisse' : 'arrêt'; if (state === 'arrêt') return; continue; }
      u = nu; s += u * h;
      if (u > 0 && state === 'monte') state = 'glisse';
      if (s >= L - BL){ s = L - BL; u = 0; state = 'bas'; return; }
      if (s <= 0){ s = 0; u = 0; state = 'arrêt'; check(); return; }
    }
  }
  function arrow(x0, y0, x1, y1, col, lab){ const Lg = Math.hypot(x1 - x0, y1 - y0); if (Lg < 3) return; const a = Math.atan2(y1 - y0, x1 - x0); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 9 * Math.cos(a - .4), y1 - 9 * Math.sin(a - .4)); ctx.lineTo(x1 - 9 * Math.cos(a + .4), y1 - 9 * Math.sin(a + .4)); ctx.closePath(); ctx.fill(); if (lab) K.text(ctx, lab, x1 + 5 * Math.cos(a), y1 + 5 * Math.sin(a) + (Math.sin(a) > 0.5 ? 8 : -2), {size: 12, bold: true, color: col, align: Math.cos(a) < -0.3 ? 'right' : 'left'}); }
  function draw(){
    const r = al * Math.PI / 180, sn = Math.sin(r), cs = Math.cos(r);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    // plan incliné : le bas est à droite
    const Bx = 395, By = 320, Lpx = 330, px = Lpx / L, Ax = Bx - Lpx * cs, Ay = By - Lpx * sn;
    ctx.fillStyle = '#e9eef5'; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Ax, Ay); ctx.lineTo(Bx, By); ctx.lineTo(Ax, By); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.grey; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(Bx, By, 40, Math.PI, Math.PI + r); ctx.stroke();
    K.text(ctx, 'α', Bx - 52, By - 10, {size: 13, color: C.ink});
    // bloc : coin bas-gauche à la distance s du sommet le long du plan
    const ux = cs, uy = sn, nx = sn, ny = -cs;          // ux, uy : vers le bas de la pente ; nx, ny : normale sortante
    const w = BL * px, hgt = 26, b0x = Ax + s * px * ux, b0y = Ay + s * px * uy;
    ctx.save(); ctx.translate(b0x, b0y); ctx.rotate(r); ctx.fillStyle = state === 'glisse' || state === 'monte' ? '#f4c27a' : '#9fc3ec'; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.fillRect(0, -hgt, w, hgt); ctx.strokeRect(0, -hgt, w, hgt); ctx.restore();
    const gx = b0x + ux * w / 2 + nx * hgt / 2, gy = b0y + uy * w / 2 + ny * hgt / 2;      // centre du bloc
    const cx = b0x + ux * w / 2, cy = b0y + uy * w / 2;                                    // milieu de la face de contact
    // forces (m g représenté par 70 px)
    const F = 70;
    let T, moving = state === 'glisse' || state === 'monte';
    if (moving) T = mud * cs * (u > 0 ? -1 : 1);       // composante le long de la pente vers le bas (en m g)
    else if (state === 'bas') T = 0;
    else T = -sn;                                        // statique : compense m g sin(a)
    arrow(gx, gy, gx, gy + F, C.blue, 'm g');
    arrow(cx, cy, cx + nx * F * cs, cy + ny * F * cs, C.green, 'N');
    if (Math.abs(T) > 0.01) arrow(cx, cy, cx + ux * F * T, cy + uy * F * T, C.red, 'T');
    if (moving && Math.abs(u) > 0.05) arrow(gx - nx * 34, gy - ny * 34 + 0, gx - nx * 34 + ux * Math.sign(u) * 30, gy - ny * 34 + uy * Math.sign(u) * 30, C.amber, 'v');
    // graphe T/(m g) en fonction de l'inclinaison, pour un bloc posé au repos
    const gx0 = 450, gy0 = 300, gx1 = 628, gy1 = 50;
    const ax = K.axes(ctx, gx0, gy0, gx1, gy1, {xmin: 0, xmax: 60, ymin: 0, ymax: 1, xticks: [0, 20, 40, 60], yticks: [0, .5, 1], xfmt: v => v + '°', yfmt: v => K.fmt(v, 1)});
    K.text(ctx, 'frottement T / m g', gx0, gy1 - 14, {size: 11, color: C.ink});
    K.text(ctx, 'inclinaison', (gx0 + gx1) / 2, gy0 + 30, {size: 11, color: C.ink, align: 'center'});
    const curve = (f, col, dash) => { ctx.setLineDash(dash || []); ctx.strokeStyle = col; ctx.lineWidth = dash ? 1.2 : 2.2; ctx.beginPath(); for (let i = 0; i <= 120; i++){ const d = 60 * i / 120, y = f(d * Math.PI / 180); const X = ax.sx(d), Y = ax.sy(Math.min(1.02, y)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); ctx.setLineDash([]); };
    curve(a => mus * Math.cos(a), C.grey, [4, 3]);
    curve(a => Math.sin(a), '#b8c2d3', [2, 3]);
    curve(a => Math.tan(a) <= mus ? Math.sin(a) : mud * Math.cos(a), C.red);
    const as = Math.atan(mus) * 180 / Math.PI;
    if (as < 60){ ctx.setLineDash([3, 3]); ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.moveTo(ax.sx(as), gy0); ctx.lineTo(ax.sx(as), gy1); ctx.stroke(); ctx.setLineDash([]); K.text(ctx, 'seuil', ax.sx(as) + 3, gy1 + 8, {size: 10, color: C.amber}); }
    const yv = Math.tan(r) <= mus ? sn : mud * cs;
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(ax.sx(al), ax.sy(Math.min(1, yv)), 5, 0, 7); ctx.fill();
    K.text(ctx, 'μs cos α', gx1 - 2, ax.sy(Math.min(1, mus * Math.cos(1.05))) - 9, {size: 10, color: C.grey, align: 'right'});
    // texte
    const tn = Math.tan(r);
    const msg = {repos: 'Le bloc reste immobile : le frottement statique compense exactement m g sin α.', arrêt: 'Le bloc est à l’arrêt : le frottement statique, inférieur à μs N, le retient.',
      glisse: `Le bloc glisse vers le bas : a = g (sin α − μd cos α) = <b>${K.fmt(g * (sn - mud * cs), 2)} m/s²</b>.`, monte: `Le bloc monte en ralentissant : a = −g (sin α + μd cos α) = <b>${K.fmt(-g * (sn + mud * cs), 2)} m/s²</b> (le frottement s’ajoute au poids).`,
      bas: 'Le bloc est arrivé en bas du plan.'}[state];
    out.innerHTML = `tan α = ${K.fmt(tn, 2)} ${tn <= mus ? '≤' : '>'} μs = ${K.fmt(mus, 2)} : ${tn <= mus ? 'l’équilibre est possible' : 'aucun équilibre possible'} (angle limite ${K.fmt(as, 1)}°).<br>` +
      `${msg}<br>Frottement : T = <b>${K.fmt(Math.abs(T), 2)} m g</b>${moving ? ' = μd N (glissement)' : state === 'bas' ? '' : ' ≤ μs N = ' + K.fmt(mus * cs, 2) + ' m g (le frottement s’ajuste)'} ; réaction normale N = ${K.fmt(cs, 2)} m g.<br>` +
      `Graphe : frottement subi par un bloc posé, selon l’inclinaison ; il croît comme sin α puis chute à μd cos α quand le bloc décroche.`;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; step(dt * 0.8); draw(); requestAnimationFrame(loop); })(performance.now());
};
