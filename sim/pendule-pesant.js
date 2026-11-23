/* Simulation : pendule pesant. Un solide oscille autour d'un axe horizontal situé à la distance d de son centre de masse G.
   J = J_G + m d² (Huygens) ; petites oscillations : T = 2 pi sqrt(J/(m g d)) = 2 pi sqrt(l_eq/g), longueur équivalente l_eq = J/(m d).
   T est minimale quand d est égal au rayon de giration sqrt(J_G/m) ; elle diverge si l'axe passe par G. */
window.SIMS['pendule-pesant'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81;
  const SH = {tige: {nom: 'tige de 1 m', JG: 1 / 12, dmax: 0.5, txt: 'J_G = mL²/12'}, disque: {nom: 'disque de rayon 30 cm', JG: 0.09 / 2, dmax: 0.3, txt: 'J_G = mR²/2'}};
  let sh = 'tige', d = 0.5, th = 0.35, om = 0, run = false, last = null, t = 0, phs = 0.35;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.select(ctr, 'Solide', [['tige', 'tige homogène de longueur L = 1 m'], ['disque', 'disque homogène, R = 30 cm']], u => { sh = u; dS.el.max = SH[u].dmax; d = Math.min(d, SH[u].dmax); dS.value = d; reset(); });
  const dS = K.slider(ctr, 'Distance d de l’axe au centre de masse', 0.01, 0.5, 0.01, d, u => K.fmt(u * 100, 0) + ' cm', u => { d = u; reset(); });
  K.button(ctr, '▶ Lâcher (20°)', () => { reset(); run = true; });
  const out = K.readout(ctr);
  const P = () => SH[sh], J = () => P().JG + d * d, leq = () => J() / d;
  function reset(){ run = false; th = 0.35; om = 0; phs = 0.35; t = 0; }
  function step(dt){
    const n = 20, h = dt / n, w2 = g * d / J(), ws = g / leq();
    for (let i = 0; i < n; i++){ const a1 = -w2 * Math.sin(th), a2 = -w2 * Math.sin(th + om * h / 2); th += (om + a1 * h / 2) * h; om += a2 * h; t += h; }
    phs = 0.35 * Math.cos(Math.sqrt(ws) * t);       // pendule simple de longueur l_eq (petits angles)
  }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const px = 170, py = 60, S = 200, a = th;
    const rot = (x, y) => [px + x * Math.cos(a) - y * Math.sin(a), py + x * Math.sin(a) + y * Math.cos(a)];      // y vers le bas, solide pendu
    ctx.fillStyle = C.navy; ctx.fillRect(px - 30, py - 26, 60, 8); ctx.fillRect(px - 2, py - 20, 4, 20);
    if (sh === 'tige'){
      const y0 = (d - 0.5) * S, y1 = (d + 0.5) * S, A = rot(-5, y0), B = rot(5, y0), Cc = rot(5, y1), D = rot(-5, y1);
      ctx.fillStyle = '#9fc3ec'; ctx.strokeStyle = C.navy; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.lineTo(...Cc); ctx.lineTo(...D); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      const [cx, cy] = rot(0, d * S); ctx.fillStyle = '#9fc3ec'; ctx.strokeStyle = C.navy; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 0.3 * S, 0, 7); ctx.fill(); ctx.stroke();
      const [mx, my] = rot(0.2 * S, d * S); ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(mx, my); ctx.stroke();
    }
    ctx.fillStyle = '#fff'; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill(); ctx.stroke();
    const [gx, gy] = rot(0, d * S); ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(gx, gy, 4, 0, 7); ctx.fill(); K.text(ctx, 'G', gx + 8, gy, {size: 12, bold: true, color: C.red});
    // pendule simple équivalent
    const L2 = Math.min(1.6, leq()) * S, qx = px + 170, bx = qx + L2 * Math.sin(phs), by = py + L2 * Math.cos(phs);
    ctx.fillStyle = C.navy; ctx.fillRect(qx - 15, py - 26, 30, 8); ctx.fillRect(qx - 2, py - 20, 4, 20);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(qx, py); ctx.lineTo(bx, by); ctx.stroke(); ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(bx, by, 7, 0, 7); ctx.fill();
    K.text(ctx, leq() > 1.6 ? 'pendule simple équivalent (raccourci)' : 'pendule simple de longueur ℓ_éq', qx - 60, 22, {size: 10, color: C.amber});
    // T(d)
    const JG = P().JG, Tf = dd => 2 * Math.PI * Math.sqrt((JG + dd * dd) / (g * dd)), dmax = P().dmax, Tmax = Tf(0.06 * dmax);
    const ax = K.axes(ctx, 430, 330, 628, 60, {xmin: 0, xmax: dmax * 100, ymin: 0, ymax: Tmax, xticks: sh === 'tige' ? [0, 10, 20, 30, 40, 50] : [0, 10, 20, 30], yticks: 4, xfmt: u => K.fmt(u, 0), yfmt: u => K.fmt(u, 1)});
    K.text(ctx, 'période T (s)', 432, 46, {size: 11, color: C.ink}); K.text(ctx, 'd (cm)', 628, 360, {size: 11, color: C.ink, align: 'right'});
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 3; i <= 200; i++){ const dd = dmax * i / 200, X = ax.sx(dd * 100), Y = ax.sy(Math.min(Tmax, Tf(dd))); i > 3 ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
    const rg = Math.sqrt(JG); ctx.setLineDash([3, 3]); ctx.strokeStyle = C.green; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax.sx(rg * 100), 330); ctx.lineTo(ax.sx(rg * 100), ax.sy(Tf(rg))); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, 'minimum', ax.sx(rg * 100) + 4, ax.sy(Tf(rg)) + 14, {size: 10, color: C.green});
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(ax.sx(d * 100), ax.sy(Math.min(Tmax, Tf(d))), 5, 0, 7); ctx.fill();
    out.innerHTML = `${P().txt} ; Huygens : J = J_G + m d² = m (${K.fmt(JG, 4)} + ${K.fmt(d * d, 4)}) m².<br>` +
      `T = 2π√(J / m g d) = <b>${K.fmt(Tf(d), 3)} s</b> ; longueur équivalente ℓ_éq = J / m d = <b>${K.fmt(leq() * 100, 1)} cm</b> (le pendule simple orange bat en même temps).<br>` +
      (sh === 'tige' && Math.abs(d - 0.5) < 1e-9 ? 'Tige suspendue par une extrémité : ℓ_éq = 2L/3. ' : '') +
      `La période est minimale (${K.fmt(Tf(rg), 3)} s) pour d = √(J_G/m) = ${K.fmt(rg * 100, 1)} cm (rayon de giration) et diverge quand l’axe s’approche de G : le poids n’a presque plus de moment.`;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) step(dt); draw(); requestAnimationFrame(loop); })(performance.now());
};
