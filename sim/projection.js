/* Simulation : composantes d'un vecteur dans des axes tournés. F_x' = F cos(α − β), F_y' = F sin(α − β) ;
   la norme ne dépend pas des axes. */
window.SIMS['projection'] = function(mount){
  const K = window.SimKit, C = K.C;
  let F = 5, al = 40, be = 0;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.slider(ctr, 'Norme F', 1, 6, 0.1, F, v => K.fmt(v, 1) + ' N', v => { F = v; draw(); });
  K.slider(ctr, 'Angle du vecteur α', -180, 180, 1, al, v => v + '°', v => { al = v; draw(); });
  const sb = K.slider(ctr, 'Rotation des axes β', -90, 90, 1, be, v => v + '°', v => { be = v; draw(); });
  K.button(ctr, 'Aligner x sur le vecteur', () => { be = Math.max(-90, Math.min(90, ((al + 90) % 180 + 180) % 180 - 90)); sb.value = be; draw(); }, true);
  const out = K.readout(ctr);
  function arrow(x1, y1, x2, y2, col, w){ const a = Math.atan2(y2 - y1, x2 - x1), h = 10; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - h * 0.6 * Math.cos(a), y2 - h * 0.6 * Math.sin(a)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)); ctx.lineTo(x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill(); }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const O = [320, 190], s = 26, a = al * Math.PI / 180, b = be * Math.PI / 180;
    const P = (r, t) => [O[0] + r * Math.cos(t), O[1] - r * Math.sin(t)];
    // axes fixes en gris clair
    ctx.strokeStyle = C.light; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(O[0] - 300, O[1]); ctx.lineTo(O[0] + 300, O[1]); ctx.moveTo(O[0], 10); ctx.lineTo(O[0], 350); ctx.stroke();
    // axes tournés
    const ux = [Math.cos(b), -Math.sin(b)], uy = [-Math.sin(b), -Math.cos(b)];
    arrow(O[0] - 200 * ux[0], O[1] - 200 * ux[1], O[0] + 220 * ux[0], O[1] + 220 * ux[1], C.grey, 1.4);
    arrow(O[0] - 160 * uy[0], O[1] - 160 * uy[1], O[0] + 170 * uy[0], O[1] + 170 * uy[1], C.grey, 1.4);
    K.text(ctx, 'x', O[0] + 232 * ux[0], O[1] + 232 * ux[1], {size: 13, bold: true, color: C.ink, align: 'center'});
    K.text(ctx, 'y', O[0] + 182 * uy[0], O[1] + 182 * uy[1], {size: 13, bold: true, color: C.ink, align: 'center'});
    const fx = F * Math.cos(a - b), fy = F * Math.sin(a - b), tip = P(F * s, a);
    const X = [O[0] + fx * s * ux[0], O[1] + fx * s * ux[1]], Y = [O[0] + fy * s * uy[0], O[1] + fy * s * uy[1]];
    ctx.setLineDash([4, 3]); ctx.strokeStyle = C.grey; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(X[0], X[1]); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(Y[0], Y[1]); ctx.stroke(); ctx.setLineDash([]);
    if (Math.abs(fx) > 0.05) arrow(O[0], O[1], X[0], X[1], C.amber, 4);
    if (Math.abs(fy) > 0.05) arrow(O[0], O[1], Y[0], Y[1], C.amber, 4);
    arrow(O[0], O[1], tip[0], tip[1], C.blue, 3);
    K.text(ctx, 'F', tip[0] + 10 * Math.cos(a), tip[1] - 10 * Math.sin(a), {size: 14, bold: true, color: C.blue, align: 'center'});
    if (Math.abs(fx) > 0.3) K.text(ctx, 'Fx', X[0] + 14 * uy[0], X[1] + 14 * uy[1], {size: 12, bold: true, color: C.amber, align: 'center'});
    if (Math.abs(fy) > 0.3) K.text(ctx, 'Fy', Y[0] - 16 * ux[0], Y[1] - 16 * ux[1], {size: 12, bold: true, color: C.amber, align: 'center'});
    // angle entre F et l'axe x
    ctx.strokeStyle = C.navy; ctx.lineWidth = 1.2; ctx.beginPath(); const d = ((al - be) % 360 + 540) % 360 - 180; ctx.arc(O[0], O[1], 40, -b, -b - d * Math.PI / 180, d > 0); ctx.stroke();
    K.text(ctx, 'α − β = ' + d + '°', 14, 22, {size: 12, bold: true, color: C.navy});
    out.innerHTML = `Angle entre F et l’axe x : ${d}°<br>Fx = F cos(${d}°) = <b>${K.fmt(fx, 2)}</b> N<br>Fy = F sin(${d}°) = <b>${K.fmt(fy, 2)}</b> N<br>√(Fx² + Fy²) = ${K.fmt(Math.hypot(fx, fy), 2)} N : la norme ne change pas.`;
  }
  draw();
};
