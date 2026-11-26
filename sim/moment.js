/* Simulation : moment d'une force sur une clé. M = F r sin θ = F × d, d = bras de levier (distance de l'axe à la droite d'action). */
window.SIMS['moment'] = function(mount){
  const K = window.SimKit, C = K.C;
  let r = 0.25, th = 90, F = 50;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 340);
  K.slider(ctr, 'Point d’application r', 0.05, 0.3, 0.01, r, v => K.fmt(v * 100, 0) + ' cm', v => { r = v; draw(); });
  K.slider(ctr, 'Angle θ entre la clé et la force', 0, 180, 1, th, v => v + '°', v => { th = v; draw(); });
  K.slider(ctr, 'Intensité F', 10, 100, 1, F, v => v + ' N', v => { F = v; draw(); });
  const out = K.readout(ctr);
  function arrow(x1, y1, x2, y2, col, w){ const a = Math.atan2(y2 - y1, x2 - x1), h = 12; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - h * 0.6 * Math.cos(a), y2 - h * 0.6 * Math.sin(a)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)); ctx.lineTo(x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill(); }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const O = [90, 210], s = 1300, t = th * Math.PI / 180;
    // écrou et clé
    ctx.fillStyle = '#c3cad6'; ctx.strokeStyle = C.grey; ctx.beginPath(); for (let i = 0; i < 6; i++){ const a = i * Math.PI / 3 + Math.PI / 6; ctx.lineTo(O[0] + 22 * Math.cos(a), O[1] + 22 * Math.sin(a)); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9aa4b5'; ctx.fillRect(O[0], O[1] - 9, 0.32 * s, 18); ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(O[0], O[1], 5, 0, 7); ctx.fill();
    K.text(ctx, 'O', O[0] - 14, O[1] + 34, {size: 12, bold: true});
    const M = [O[0] + r * s, O[1]], L = 1.6 * F, u = [Math.cos(t), -Math.sin(t)], Fe = [M[0] + L * u[0], M[1] + L * u[1]];
    // droite d'action et bras de levier
    const tt = (O[0] - M[0]) * u[0] + (O[1] - M[1]) * u[1], H = [M[0] + tt * u[0], M[1] + tt * u[1]], d = r * Math.sin(t);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = C.red; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(M[0] - 600 * u[0], M[1] - 600 * u[1]); ctx.lineTo(M[0] + 600 * u[0], M[1] + 600 * u[1]); ctx.stroke(); ctx.setLineDash([]);
    if (Math.abs(d) > 0.002){ ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(H[0], H[1]); ctx.stroke();
      const mx = (O[0] + H[0]) / 2, my = (O[1] + H[1]) / 2, ln = Math.hypot(H[0] - O[0], H[1] - O[1]) || 1, px = (H[1] - O[1]) / ln, py = -(H[0] - O[0]) / ln, sg = py > 0 ? -1 : 1; K.text(ctx, 'd = ' + K.fmt(Math.abs(d) * 100, 1) + ' cm', mx + sg * 20 * px, my + sg * 20 * py, {size: 12, bold: true, color: '#b85a0c', align: 'center'}); }
    arrow(M[0], M[1], Fe[0], Fe[1], C.red, 3.5); K.text(ctx, 'F', Fe[0] + 10, Fe[1], {size: 14, bold: true, color: C.red});
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(M[0], M[1], 4, 0, 7); ctx.fill();
    if (th > 3){ ctx.strokeStyle = C.navy; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(M[0], M[1], 30, 0, -t, true); ctx.stroke(); K.text(ctx, 'θ', M[0] + 40 * Math.cos(t / 2), M[1] - 40 * Math.sin(t / 2), {size: 12, color: C.navy, align: 'center'}); }
    // indicateur de rotation
    const Mo = F * r * Math.sin(t), R0 = 30 + Math.min(30, Math.abs(Mo));
    if (Math.abs(Mo) > 0.05){ const a0 = Math.PI * 1.25, a1 = Math.PI * 0.68; ctx.strokeStyle = C.green; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(O[0], O[1], R0, a0, a1, true); ctx.stroke();
      const X = O[0] + R0 * Math.cos(a1), Y = O[1] + R0 * Math.sin(a1), dx = Math.sin(a1), dy = -Math.cos(a1); ctx.fillStyle = C.green; ctx.beginPath(); ctx.moveTo(X + 10 * dx, Y + 10 * dy); ctx.lineTo(X - 7 * dy, Y + 7 * dx); ctx.lineTo(X + 7 * dy, Y - 7 * dx); ctx.closePath(); ctx.fill();
      K.text(ctx, 'fait tourner (sens trigonométrique)', 14, 22, {size: 12, bold: true, color: C.green}); }
    else K.text(ctx, 'moment nul : la force passe par l’axe', 14, 22, {size: 12, bold: true, color: C.red});
    out.innerHTML = `Bras de levier d = r sin θ = <b>${K.fmt(Math.abs(d) * 100, 1)}</b> cm<br>Moment 𝓜 = F × d = <b>${K.fmt(Math.abs(Mo), 2)}</b> N·m<br>Maximum à θ = 90° : ${K.fmt(F * r, 2)} N·m`;
  }
  draw();
};
