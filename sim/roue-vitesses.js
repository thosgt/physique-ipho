/* Simulation : champ des vitesses d'une roue, v_P = v_G + omega ∧ GP.
   Roulement sans glissement (R omega = v) : le point de contact I est immobile, centre instantané de rotation ; le sommet va à 2v ;
   chaque vitesse est perpendiculaire à IP et proportionnelle à IP. Un point de la jante décrit une cycloïde.
   Patinage (R omega > v) ou dérapage (R omega < v) : le centre instantané de rotation n'est plus au contact. */
window.SIMS['roue-vitesses'] = function(mount){
  const K = window.SimKit, C = K.C;
  let ratio = 1, run = true, xg = 0, th = 0, trail = [], showAll = true, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.slider(ctr, 'Rapport R ω / v', 0, 2, 0.05, ratio, u => K.fmt(u, 2) + (Math.abs(u - 1) < 1e-9 ? ' (roulement sans glissement)' : u > 1 ? ' (patinage)' : u === 0 ? ' (glissement pur)' : ' (dérapage)'), u => { ratio = u; trail = []; });
  K.select(ctr, 'Vitesses affichées', [['all', 'douze points de la roue'], ['rim', 'quelques points seulement']], u => { showAll = u === 'all'; });
  K.button(ctr, 'Pause / reprise', () => { run = !run; });
  K.button(ctr, 'Effacer la trace', () => { trail = []; }, true);
  const out = K.readout(ctr);
  const R = 70, v = 60;        // px et px/s
  function arrow(x0, y0, x1, y1, col, w){ const L = Math.hypot(x1 - x0, y1 - y0); if (L < 3) return; const a = Math.atan2(y1 - y0, x1 - x0); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w || 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 7 * Math.cos(a - .45), y1 - 7 * Math.sin(a - .45)); ctx.lineTo(x1 - 7 * Math.cos(a + .45), y1 - 7 * Math.sin(a + .45)); ctx.closePath(); ctx.fill(); }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const yg = 200, Om = ratio * v / R, gx = 60 + ((xg % 560) + 560) % 560;
    ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, yg + R); ctx.lineTo(640, yg + R); ctx.stroke();
    // trace du point marqué (cycloïde si R omega = v)
    if (trail.length > 1){ ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.beginPath(); trail.forEach(([a, b], i) => { const X = 60 + a; i && Math.abs(a - trail[i - 1][0]) < 200 ? ctx.lineTo(X, b) : ctx.moveTo(X, b); }); ctx.stroke(); }
    ctx.fillStyle = '#eef2f7'; ctx.strokeStyle = C.navy; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(gx, yg, R, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#b8c2d3'; ctx.lineWidth = 1.5; for (let k = 0; k < 6; k++){ const a = th + k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(gx, yg); ctx.lineTo(gx + R * Math.cos(a), yg + R * Math.sin(a)); ctx.stroke(); }
    const mk = [gx + R * Math.cos(th + Math.PI / 2), yg + R * Math.sin(th + Math.PI / 2)];
    ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(...mk, 6, 0, 7); ctx.fill();
    // vitesses (échelle : v = 60 px/s -> 45 px)
    const sc = 45 / v, vel = (rx, ry) => [v - Om * ry, Om * rx];     // repère du canvas (y vers le bas), rotation horaire
    const pts = [];
    const n = showAll ? 12 : 4;
    for (let k = 0; k < n; k++){ const a = k * 2 * Math.PI / n + Math.PI / 2; pts.push([R * Math.cos(a), R * Math.sin(a)]); }
    if (showAll) [[0, -R / 2], [0, R / 2], [R / 2, 0], [-R / 2, 0]].forEach(p => pts.push(p));
    pts.push([0, 0]);
    pts.forEach(([rx, ry]) => { const [vx, vy] = vel(rx, ry); arrow(gx + rx, yg + ry, gx + rx + vx * sc, yg + ry + vy * sc, rx === 0 && ry === 0 ? C.blue : C.red, rx === 0 && ry === 0 ? 2.6 : 1.8); ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(gx + rx, yg + ry, 2.5, 0, 7); ctx.fill(); });
    // centre instantané de rotation
    if (Om > 1e-6){
      const iy = yg + v / Om;
      if (iy < 355){ ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(gx, iy, 7, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx - 10, iy); ctx.lineTo(gx + 10, iy); ctx.moveTo(gx, iy - 10); ctx.lineTo(gx, iy + 10); ctx.stroke(); K.text(ctx, 'CIR', gx + 12, iy - 10, {size: 11, bold: true, color: C.green}); }
      else K.text(ctx, 'CIR plus bas, hors du dessin', gx + 10, 345, {size: 10, color: C.green});
    }
    K.text(ctx, 'bleu : vitesse du centre ; rouge : vitesses des points ; orange : trajectoire d’un point de la jante', 12, 20, {size: 11, color: C.ink});
    const top = v * (1 + ratio) / v, bot = v * (1 - ratio) / v;
    out.innerHTML = `v<sub>P</sub> = v<sub>G</sub> + ω ∧ GP. Avec v<sub>G</sub> = v : sommet <b>${K.fmt(top, 2)} v</b>, point de contact <b>${K.fmt(bot, 2)} v</b>.<br>` +
      (Math.abs(ratio - 1) < 1e-9 ? 'Roulement sans glissement : le point de contact est immobile ; c’est le centre instantané de rotation. Toutes les vitesses sont perpendiculaires à la droite qui joint le point au contact et proportionnelles à sa distance au contact. Un point de la jante décrit une cycloïde, avec un rebroussement à vitesse nulle au contact.'
        : ratio > 1 ? 'Patinage (roue motrice qui patine) : le point de contact recule par rapport au sol ; le centre instantané de rotation est au-dessus du sol, à v/ω du centre.'
        : ratio === 0 ? 'Glissement pur (translation) : tous les points ont la même vitesse ; pas de centre instantané de rotation.' : 'Dérapage (roue freinée) : le point de contact avance encore ; le centre instantané de rotation est sous le sol.');
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now;
    if (run){ const Om = ratio * v / R; xg += v * dt; th += Om * dt; const gx = ((xg % 560) + 560) % 560; if (trail.length && gx < trail[trail.length - 1][0] - 200) trail = []; trail.push([gx + R * Math.cos(th + Math.PI / 2), 200 + R * Math.sin(th + Math.PI / 2)]); if (trail.length > 2000) trail.shift(); }
    draw(); requestAnimationFrame(loop); })(performance.now());
};
