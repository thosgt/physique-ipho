/* Simulation : chute dans un tunnel rectiligne à travers une Terre homogène, sans frottement.
   À l'intérieur, seule la masse plus proche du centre attire : g(r) = g0 r / R. Le long d'une corde, la composante utile est
   -g0 x / R (x : distance au milieu de la corde) : oscillation harmonique de période 2 pi sqrt(R/g0) = 84 min, quelle que soit la corde,
   égale à la période d'un satellite en orbite rasante. */
window.SIMS['tunnel'] = function(mount){
  const K = window.SimKit, C = K.C, R = 6.371e6, g0 = 9.81, w = Math.sqrt(g0 / R);
  let d = 0, t = 0, run = false, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  K.slider(ctr, 'Distance du tunnel au centre', 0, 0.9, 0.01, d, x => K.fmt(x, 2) + ' R', x => { d = x; t = 0; run = false; });
  K.button(ctr, '▶ Lâcher', () => { t = 0; run = true; });
  K.button(ctr, 'Pause / reprise', () => { run = !run; }, true);
  const out = K.readout(ctr);
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const cx = 190, cy = 200, Rp = 150, half = Math.sqrt(1 - d * d);   // demi-corde (en R)
    // Terre en coupe
    const gr = ctx.createRadialGradient(cx, cy, 10, cx, cy, Rp); gr.addColorStop(0, '#f4c27a'); gr.addColorStop(0.55, '#e39a5a'); gr.addColorStop(1, '#a6784f');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, Rp, 0, 7); ctx.fill(); ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.stroke();
    // tunnel horizontal à la distance d sous le centre
    const ty = cy + d * Rp; ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(cx - half * Rp, ty); ctx.lineTo(cx + half * Rp, ty); ctx.stroke();
    ctx.strokeStyle = C.navy; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, ty); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill();
    // objet dans le tunnel : x = demi-corde × cos(w t)
    const xo = -half * Math.cos(w * t), bx = cx + xo * Rp;
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(bx, ty, 7, 0, 7); ctx.fill();
    // force de pesanteur et sa composante le long du tunnel
    const r = Math.hypot(xo, d), gx = -xo, gy = -d;                       // g ∝ -r (vecteur), en unités g0
    const sa = 60;
    const arrow = (x0, y0, x1, y1, col, lab) => { const L = Math.hypot(x1 - x0, y1 - y0); if (L < 4) return; const a = Math.atan2(y1 - y0, x1 - x0); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 8 * Math.cos(a - .4), y1 - 8 * Math.sin(a - .4)); ctx.lineTo(x1 - 8 * Math.cos(a + .4), y1 - 8 * Math.sin(a + .4)); ctx.closePath(); ctx.fill(); if (lab) K.text(ctx, lab, x1 + 4, y1 - 8, {size: 11, bold: true, color: col}); };
    arrow(bx, ty, bx + gx * sa, ty - gy * sa, C.red, 'g');
    arrow(bx, ty + 16, bx + gx * sa, ty + 16, C.amber, '');
    // satellite en orbite rasante, même période
    ctx.strokeStyle = '#c9d2df'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(cx, cy, Rp + 6, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    const sxx = cx - (Rp + 6) * Math.cos(w * t), syy = cy - (Rp + 6) * Math.sin(w * t);
    ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(sxx, syy, 5, 0, 7); ctx.fill();
    if (d === 0){ ctx.strokeStyle = C.green; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(sxx, syy); ctx.lineTo(sxx, ty); ctx.stroke(); ctx.setLineDash([]); }
    K.text(ctx, 'satellite en orbite rasante', 30, 22, {size: 11, color: C.green});
    // g(r)
    const ax = K.axes(ctx, 400, 330, 625, 70, {xmin: 0, xmax: 3, ymin: 0, ymax: 1.1, xticks: [0, 1, 2, 3], yticks: [0, 0.5, 1], xfmt: v => v ? v + ' R' : '0', yfmt: v => K.fmt(v, 1)});
    K.text(ctx, 'g(r) / g₀', 400, 54, {size: 11, color: C.ink});
    ctx.strokeStyle = C.red; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ax.sx(0), ax.sy(0)); ctx.lineTo(ax.sx(1), ax.sy(1));
    for (let i = 0; i <= 60; i++){ const rr = 1 + 2 * i / 60; ctx.lineTo(ax.sx(rr), ax.sy(1 / (rr * rr))); } ctx.stroke();
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(ax.sx(r), ax.sy(r), 5, 0, 7); ctx.fill();
    K.text(ctx, 'intérieur : ∝ r', ax.sx(0.15), ax.sy(0.75), {size: 10, color: C.ink}); K.text(ctx, 'extérieur : ∝ 1/r²', ax.sx(1.6), ax.sy(0.62), {size: 10, color: C.ink});
    K.text(ctx, `t = ${K.fmt(t / 60, 1)} min`, 400, 372, {size: 12, color: C.ink});
    const T = 2 * Math.PI / w, vmax = w * half * R;
    out.innerHTML = `Dans une Terre homogène, à la distance r du centre, g = g₀ r/R. Le long du tunnel seule compte la composante <span style="color:#d9900b">−g₀ x/R</span> (x : écart au milieu) : c’est un oscillateur harmonique de pulsation √(g₀/R).<br>` +
      `Traversée : <b>${K.fmt(T / 120, 1)} min</b> quel que soit le tunnel (demi-période de 2π√(R/g₀) = ${K.fmt(T / 60, 1)} min, celle d’une orbite rasante). Vitesse au milieu : ${K.fmt(vmax / 1e3, 2)} km/s${d === 0 ? ', la vitesse en orbite basse' : ''}.<br>` +
      (d === 0 ? 'L’objet reste à l’aplomb du satellite : son mouvement est la projection d’un mouvement circulaire uniforme.' : 'Le satellite et l’objet partent ensemble et reviennent ensemble à leur point de départ.');
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run){ t += dt * 900; if (t > 2 * Math.PI / w * 2) t -= 2 * Math.PI / w; } draw(); requestAnimationFrame(loop); })(performance.now());
};
