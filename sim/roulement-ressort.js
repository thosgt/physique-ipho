/* Simulation : méthode de l'énergie à un paramètre. Un même ressort (k) rappelle un bloc qui glisse sans frottement,
   un cylindre plein et un anneau qui roulent sans glisser (même masse m, ressort fixé à l'axe).
   E = ½ m_eff ẋ² + ½ k x² avec m_eff = m (1 + J/mR²) : 1, 3/2 et 2 ; d'où omega = sqrt(k/m_eff).
   Le frottement qui assure le roulement ne travaille pas : il n'apparaît pas dans le bilan. */
window.SIMS['roulement-ressort'] = function(mount){
  const K = window.SimKit, C = K.C;
  let m = 1, k = 20, A = 0.2, run = false, t = 0, hist = [], last = null;
  const OBJ = [{nom: 'bloc qui glisse', f: 1, col: C.blue}, {nom: 'cylindre plein qui roule', f: 1.5, col: C.amber}, {nom: 'anneau qui roule', f: 2, col: C.green}];
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  K.slider(ctr, 'Masse m (identique pour les trois)', 0.5, 3, 0.1, m, v => K.fmt(v, 1) + ' kg', v => { m = v; reset(); });
  K.slider(ctr, 'Raideur k du ressort', 5, 50, 1, k, v => v + ' N/m', v => { k = v; reset(); });
  K.slider(ctr, 'Écart initial', 0.05, 0.3, 0.01, A, v => K.fmt(v * 100, 0) + ' cm', v => { A = v; reset(); });
  K.button(ctr, '▶ Lâcher les trois', () => { reset(); run = true; });
  K.button(ctr, 'Pause / reprise', () => { run = !run; }, true);
  const out = K.readout(ctr);
  function reset(){ run = false; t = 0; hist = []; }
  const xOf = (o, tt) => A * Math.cos(Math.sqrt(k / (m * o.f)) * tt);
  const vOf = (o, tt) => -A * Math.sqrt(k / (m * o.f)) * Math.sin(Math.sqrt(k / (m * o.f)) * tt);
  function spring(x0, x1, y){ const n = 14, amp = 7; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y); const L = x1 - x0; for (let i = 1; i < n; i++) ctx.lineTo(x0 + L * i / n, y + (i % 2 ? -amp : amp)); ctx.lineTo(x1, y); ctx.stroke(); }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const S = 420, xe = 230;                       // position d'équilibre (px), 1 m = 420 px
    OBJ.forEach((o, i) => {
      const yb = 78 + i * 78, x = xOf(o, t), v = vOf(o, t), px = xe + x * S, r = 20;
      ctx.fillStyle = C.navy; ctx.fillRect(28, yb - 50, 8, 52); ctx.strokeStyle = C.grey; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(28, yb + 1); ctx.lineTo(400, yb + 1); ctx.stroke();
      ctx.setLineDash([3, 3]); ctx.strokeStyle = '#c9d2df'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xe, yb - 52); ctx.lineTo(xe, yb + 4); ctx.stroke(); ctx.setLineDash([]);
      if (o.f === 1){ spring(36, px - 24, yb - 18); ctx.fillStyle = o.col; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.fillRect(px - 24, yb - 36, 48, 36); ctx.strokeRect(px - 24, yb - 36, 48, 36); }
      else {
        spring(36, px, yb - r);
        const phi = -x / (r / S);                  // roulement sans glissement : angle = déplacement / R
        ctx.fillStyle = o.f === 2 ? '#fff' : o.col; ctx.strokeStyle = o.f === 2 ? o.col : C.navy; ctx.lineWidth = o.f === 2 ? 6 : 2; ctx.beginPath(); ctx.arc(px, yb - r, r - (o.f === 2 ? 3 : 0), 0, 7); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = o.f === 2 ? o.col : '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, yb - r); ctx.lineTo(px + (r - 4) * Math.cos(phi), yb - r - (r - 4) * Math.sin(phi)); ctx.stroke();
        ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(px, yb - r, 3, 0, 7); ctx.fill();
      }
      K.text(ctx, o.nom, 44, yb - 58, {size: 11, bold: true, color: o.col});
      // énergie : translation, rotation, ressort (barre empilée de longueur constante)
      const Et = 0.5 * m * v * v, Er = 0.5 * m * (o.f - 1) * v * v, Es = 0.5 * k * x * x, E = 0.5 * k * A * A, bw = 200, X = 425, Y = yb - 30;
      [[Et, C.blue], [Er, C.amber], [Es, C.green]].reduce((acc, [val, col]) => { const w = bw * val / E; ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(X + acc, Y, w, 18); ctx.globalAlpha = 1; return acc + w; }, 0);
      ctx.strokeStyle = C.navy; ctx.lineWidth = 1; ctx.strokeRect(X, Y, bw, 18);
      K.text(ctx, `T = ${K.fmt(2 * Math.PI * Math.sqrt(m * o.f / k), 2)} s`, X, Y + 32, {size: 11, color: C.ink});
      K.text(ctx, `m_eff = ${o.f === 1 ? 'm' : o.f === 1.5 ? '3m/2' : '2m'}`, X + bw, Y + 32, {size: 11, color: C.ink, align: 'right'});
    });
    K.text(ctx, 'translation', 425, 22, {size: 10, color: C.blue}); K.text(ctx, 'rotation', 500, 22, {size: 10, color: C.amber}); K.text(ctx, 'ressort', 562, 22, {size: 10, color: C.green});
    // x(t)
    const gx0 = 50, gy0 = 385, gx1 = 625, gy1 = 300, T0 = 8;
    const ax = K.axes(ctx, gx0, gy0, gx1, gy1, {xmin: Math.max(0, t - T0), xmax: Math.max(T0, t), ymin: -A, ymax: A, xticks: 4, yticks: [-A, 0, A], xfmt: v => K.fmt(v, 0) + ' s', yfmt: v => K.fmt(v * 100, 0), grid: false});
    K.text(ctx, 'x (cm)', gx0 + 6, gy1 - 8, {size: 10, color: C.ink});
    OBJ.forEach(o => { ctx.strokeStyle = o.col; ctx.lineWidth = 1.8; ctx.beginPath(); const t0 = Math.max(0, t - T0); for (let i = 0; i <= 200; i++){ const tt = t0 + (t - t0) * i / 200; i ? ctx.lineTo(ax.sx(tt), ax.sy(xOf(o, tt))) : ctx.moveTo(ax.sx(tt), ax.sy(xOf(o, tt))); } ctx.stroke(); });
    out.innerHTML = `Énergie : E = ½ m_eff ẋ² + ½ k x², donc ω₀ = √(k/m_eff).<br>` +
      `Pour un objet qui roule sans glisser, ω = ẋ/R : l’énergie cinétique ½ m ẋ² + ½ J ω² s’écrit ½ m(1 + J/mR²) ẋ². Cylindre plein : J = mR²/2, m_eff = 3m/2 ; anneau : J = mR², m_eff = 2m.<br>` +
      `Périodes : bloc ${K.fmt(2 * Math.PI * Math.sqrt(m / k), 2)} s, cylindre ${K.fmt(2 * Math.PI * Math.sqrt(1.5 * m / k), 2)} s (× √(3/2) = 1,22), anneau ${K.fmt(2 * Math.PI * Math.sqrt(2 * m / k), 2)} s (× √2).<br>` +
      `Le frottement du sol, inconnu, assure le roulement mais ne travaille pas (point de contact immobile) : la méthode de l’énergie l’ignore, sans projeter aucune force.`;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) t += dt; draw(); requestAnimationFrame(loop); })(performance.now());
};
