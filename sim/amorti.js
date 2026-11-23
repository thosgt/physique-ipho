/* Simulation : oscillateur amorti par frottement fluide, x'' + (omega0/Q) x' + omega0² x = 0, lâché sans vitesse de x0.
   Q > 1/2 : pseudo-périodique, enveloppe exp(-omega0 t / 2Q), pseudo-pulsation omega0 sqrt(1 - 1/4Q²) ;
   Q = 1/2 : critique (retour le plus rapide sans oscillation) ; Q < 1/2 : apériodique. Q ≈ nombre d'oscillations visibles. */
window.SIMS['amorti'] = function(mount){
  const K = window.SimKit, C = K.C, w0 = 2 * Math.PI;        // période propre 1 s
  let Q = 5, t = 0, run = false, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  const qS = K.slider(ctr, 'Facteur de qualité Q', -0.8, 1.7, 0.01, Math.log10(Q), u => K.fmt(Math.pow(10, u), Math.pow(10, u) < 2 ? 2 : 1), u => { Q = Math.pow(10, u); if (Math.abs(Q - 0.5) < 0.02) Q = 0.5; t = 0; });
  K.button(ctr, '▶ Lâcher', () => { t = 0; run = true; });
  K.button(ctr, 'Régime critique (Q = 1/2)', () => { Q = 0.5; qS.value = Math.log10(0.5); t = 0; run = true; }, true);
  const out = K.readout(ctr);
  function x(tt, q){
    const l = w0 / (2 * q);
    if (Math.abs(q - 0.5) < 1e-6) return (1 + w0 * tt) * Math.exp(-w0 * tt);
    if (q > 0.5){ const wd = w0 * Math.sqrt(1 - 1 / (4 * q * q)); return Math.exp(-l * tt) * (Math.cos(wd * tt) + l / wd * Math.sin(wd * tt)); }
    const s = Math.sqrt(l * l - w0 * w0), r1 = -l + s, r2 = -l - s; return (r2 * Math.exp(r1 * tt) - r1 * Math.exp(r2 * tt)) / (r2 - r1);
  }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const Tw = Math.min(30, Math.max(6, 1.2 * Q)), tc = Math.min(t, Tw);
    // masse, ressort et amortisseur
    const S = 90, xe = 330, px = xe + x(tc, Q) * S, yb = 70;
    ctx.fillStyle = C.navy; ctx.fillRect(120, yb - 46, 8, 70);
    const sp = (y) => { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(128, y); const L = px - 24 - 128; for (let i = 1; i < 14; i++) ctx.lineTo(128 + L * i / 14, y + (i % 2 ? -6 : 6)); ctx.lineTo(px - 24, y); ctx.stroke(); };
    sp(yb - 26);
    // amortisseur : cylindre fixé au mur, piston relié à la masse
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(128, yb + 6); ctx.lineTo(200, yb + 6); ctx.stroke();
    ctx.strokeRect(200, yb - 4, 70, 20); ctx.fillStyle = 'rgba(217,144,11,' + Math.min(0.6, 0.1 + 0.5 / Math.sqrt(Q)) + ')'; ctx.fillRect(201, yb - 3, 68, 18);
    const pist = Math.max(205, Math.min(265, px - 70)); ctx.fillStyle = C.navy; ctx.fillRect(pist, yb - 2, 4, 16); ctx.beginPath(); ctx.moveTo(pist + 4, yb + 6); ctx.lineTo(px - 24, yb + 6); ctx.stroke();
    ctx.fillStyle = C.blue; ctx.fillRect(px - 24, yb - 40, 48, 54);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = C.green; ctx.beginPath(); ctx.moveTo(xe, yb - 52); ctx.lineTo(xe, yb + 22); ctx.stroke(); ctx.setLineDash([]);
    // x(t)
    const ax = K.axes(ctx, 50, 360, 628, 140, {xmin: 0, xmax: Tw, ymin: -1, ymax: 1, xticks: 6, yticks: [-1, 0, 1], xfmt: v => K.fmt(v, 0) + ' s', yfmt: v => v === 0 ? '0' : (v > 0 ? 'x₀' : '−x₀'), grid: true});
    if (Q > 0.5){ ctx.strokeStyle = C.grey; ctx.setLineDash([4, 3]); ctx.lineWidth = 1; [1, -1].forEach(sg => { ctx.beginPath(); for (let i = 0; i <= 200; i++){ const tt = Tw * i / 200, y = sg * Math.exp(-w0 * tt / (2 * Q)) / Math.sqrt(1 - 1 / (4 * Q * Q)); i ? ctx.lineTo(ax.sx(tt), ax.sy(Math.max(-1.05, Math.min(1.05, y)))) : ctx.moveTo(ax.sx(tt), ax.sy(Math.max(-1.05, Math.min(1.05, y)))); } ctx.stroke(); }); ctx.setLineDash([]); }
    ctx.strokeStyle = '#9fd3b0'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i <= 300; i++){ const tt = Tw * i / 300; i ? ctx.lineTo(ax.sx(tt), ax.sy(x(tt, 0.5))) : ctx.moveTo(ax.sx(tt), ax.sy(1)); } ctx.stroke();
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); const N = 600; for (let i = 0; i <= N; i++){ const tt = tc * i / N; i ? ctx.lineTo(ax.sx(tt), ax.sy(x(tt, Q))) : ctx.moveTo(ax.sx(tt), ax.sy(1)); } ctx.stroke();
    K.text(ctx, 'vert pâle : régime critique, pour comparaison', 628, 128, {size: 10, color: C.green, align: 'right'});
    const reg = Q > 0.5 + 1e-6 ? 'pseudo-périodique' : Q < 0.5 - 1e-6 ? 'apériodique' : 'critique';
    K.text(ctx, 'Régime ' + reg, 50, 128, {size: 13, bold: true, color: C.navy});
    let h = `Q = ${K.fmt(Q, 2)} : régime <b>${reg}</b>.<br>`;
    if (Q > 0.5){ const wd = Math.sqrt(1 - 1 / (4 * Q * Q)); h += `Pseudo-période ${K.fmt(1 / wd, 3)} s (période propre 1 s). L’amplitude est divisée par e en Q/π ≈ ${K.fmt(Q / Math.PI, 1)} périodes : on voit environ <b>Q ≈ ${Math.round(Q)}</b> oscillations.`; }
    else if (Q === 0.5) h += 'Retour à l’équilibre le plus rapide sans dépassement : c’est le réglage des amortisseurs et des aiguilles d’appareils de mesure.';
    else h += 'Frottement si fort que la masse revient lentement, sans osciller ; plus Q est petit, plus le retour est lent.';
    out.innerHTML = h + '<br>Pointillés : enveloppe e<sup>−ω₀t/2Q</sup>.';
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) t += dt * Math.max(1, Math.min(30, 1.2 * Q) / 8); draw(); requestAnimationFrame(loop); })(performance.now());
};
