/* Simulation : lignes de champ et équipotentielles de deux charges ponctuelles. Les lignes partent des charges
   positives et arrivent sur les négatives (ou à l'infini) ; elles coupent les équipotentielles à angle droit. */
window.SIMS['lignes-champ'] = function(mount){
  const K = window.SimKit, C = K.C, W = 640, H = 400, XS = 2, YS = 1.25;
  let q2 = -1, d = 1.2, equi = true, pt = [0, 0.6], img = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, W, H);
  K.slider(ctr, 'Charge de droite q₂ (en unités de q₁ = +q)', -3, 3, 0.5, q2, v => K.fmt(v, 1), v => { q2 = v; img = null; draw(); });
  K.slider(ctr, 'Distance entre les charges', 0.6, 2.4, 0.1, d, v => K.fmt(v, 1), v => { d = v; img = null; draw(); });
  const lab = document.createElement('label'); lab.style.flexDirection = 'row'; lab.style.alignItems = 'center'; lab.style.gap = '6px';
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; cb.addEventListener('change', () => { equi = cb.checked; draw(); });
  lab.appendChild(cb); lab.appendChild(document.createTextNode('Équipotentielles')); ctr.appendChild(lab);
  const out = K.readout(ctr);
  const tx = x => (x + XS) / (2 * XS) * W, ty = y => (YS - y) / (2 * YS) * H, ix = X => X / W * 2 * XS - XS, iy = Y => YS - Y / H * 2 * YS;
  const charges = () => [[-d / 2, 0, 1], [d / 2, 0, q2]].filter(c => c[2] !== 0);
  function field(x, y){ let ex = 0, ey = 0, v = 0; for (const [cx, cy, q] of charges()){ const dx = x - cx, dy = y - cy, r2 = dx * dx + dy * dy, r = Math.sqrt(r2) || 1e-9; ex += q * dx / (r2 * r); ey += q * dy / (r2 * r); v += q / r; } return [ex, ey, v]; }
  ctx.canvas.style.cursor = 'crosshair';
  ctx.canvas.addEventListener('pointerdown', e => { const r = ctx.canvas.getBoundingClientRect(); pt = [ix((e.clientX - r.left) / r.width * W), iy((e.clientY - r.top) / r.height * H)]; draw(); });
  function background(){
    const st = 2, nx = W / st, ny = H / st, V = new Float32Array(nx * ny), dl = 0.5, map = v => Math.asinh(2 * v);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[j * nx + i] = map(field(ix((i + 0.5) * st), iy((j + 0.5) * st))[2]);
    const off = document.createElement('canvas'); off.width = nx; off.height = ny; const o = off.getContext('2d'), id = o.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
      const v = V[j * nx + i], k = (j * nx + i) * 4, lv = Math.floor(v / dl); let line = false;
      if (i < nx - 1 && Math.floor(V[j * nx + i + 1] / dl) !== lv) line = true;
      if (j < ny - 1 && Math.floor(V[(j + 1) * nx + i] / dl) !== lv) line = true;
      const u = Math.min(1, Math.abs(v) / 5);
      let c = v > 0 ? [255, Math.round(246 - 50 * u), Math.round(240 - 60 * u)] : [Math.round(240 - 60 * u), Math.round(246 - 40 * u), 255];
      if (line) c = v > 0 ? [205, 120, 110] : [110, 130, 205];
      id.data[k] = c[0]; id.data[k + 1] = c[1]; id.data[k + 2] = c[2]; id.data[k + 3] = 255; }
    o.putImageData(id, 0, 0); return off;
  }
  function trace(x0, y0, sgn){ // intègre dr/ds = sgn·E/|E| (RK2) jusqu'à une charge ou la sortie d'une grande boîte
    const p = [[x0, y0]], h = 0.012; let x = x0, y = y0, end = 'inf';
    for (let n = 0; n < 1600; n++){
      let [ex, ey] = field(x, y), e = Math.hypot(ex, ey); if (e < 1e-9){ end = 'nul'; break; }
      const xm = x + 0.5 * h * sgn * ex / e, ym = y + 0.5 * h * sgn * ey / e; [ex, ey] = field(xm, ym); e = Math.hypot(ex, ey); if (e < 1e-9){ end = 'nul'; break; }
      x += h * sgn * ex / e; y += h * sgn * ey / e; p.push([x, y]);
      const hit = charges().find(c => Math.hypot(x - c[0], y - c[1]) < 0.03); if (hit && n > 3){ end = 'charge'; break; }
      if (Math.abs(x) > 3 * XS || Math.abs(y) > 3 * YS) break;
    }
    return {p, end};
  }
  function arrowAt(p, sgn){ const i = Math.floor(p.length * 0.45); if (i < 2 || i > p.length - 2) return; const a = p[i - 1], b = p[i + 1]; let X = tx(p[i][0]), Y = ty(p[i][1]);
    if (X < 6 || X > W - 6 || Y < 6 || Y > H - 6) return; const ang = Math.atan2(ty(b[1]) - ty(a[1]), tx(b[0]) - tx(a[0])) + (sgn < 0 ? Math.PI : 0), hh = 7;
    ctx.beginPath(); ctx.moveTo(X + hh * Math.cos(ang), Y + hh * Math.sin(ang)); ctx.lineTo(X - hh * Math.cos(ang - 0.45), Y - hh * Math.sin(ang - 0.45)); ctx.lineTo(X - hh * Math.cos(ang + 0.45), Y - hh * Math.sin(ang + 0.45)); ctx.closePath(); ctx.fill(); }
  function draw(){
    if (!img) img = background();
    if (equi){ ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 0, 0, W, H); } else { ctx.fillStyle = '#fbfcfe'; ctx.fillRect(0, 0, W, H); }
    ctx.strokeStyle = C.navy; ctx.fillStyle = C.navy; ctx.lineWidth = 1.4;
    const ch = charges(), nPer = 8;
    for (const [cx, cy, q] of ch){ // lignes issues des charges positives ; pour les négatives, seulement celles qui viennent de l'infini
      const n = Math.round(nPer * Math.abs(q)), sgn = q > 0 ? 1 : -1;
      for (let k = 0; k < n; k++){ const a = 2 * Math.PI * (k + 0.5) / n, r0 = 0.035, L = trace(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a), sgn);
        if (q < 0 && L.end === 'charge') continue;
        ctx.beginPath(); L.p.forEach((pp, i) => i ? ctx.lineTo(tx(pp[0]), ty(pp[1])) : ctx.moveTo(tx(pp[0]), ty(pp[1]))); ctx.stroke(); arrowAt(L.p, sgn); }
    }
    for (const [cx, cy, q] of ch){ ctx.fillStyle = q > 0 ? C.red : C.blue; ctx.beginPath(); ctx.arc(tx(cx), ty(cy), 11, 0, 7); ctx.fill();
      K.text(ctx, (q > 0 ? '+' : '−') + (Math.abs(q) === 1 ? '' : K.fmt(Math.abs(q), 1)), tx(cx), ty(cy), {size: 12, bold: true, color: '#fff', align: 'center'}); }
    // point choisi : champ E
    const [ex, ey, v] = field(pt[0], pt[1]), e = Math.hypot(ex, ey), P = [tx(pt[0]), ty(pt[1])];
    if (e > 1e-6){ const L = Math.min(70, 20 + 25 * Math.log10(1 + 10 * e)), u = [ex / e, -ey / e], Q = [P[0] + L * u[0], P[1] + L * u[1]], a = Math.atan2(u[1], u[0]), hh = 12;
      ctx.strokeStyle = C.amber; ctx.fillStyle = C.amber; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(Q[0] - 0.6 * hh * u[0], Q[1] - 0.6 * hh * u[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Q[0], Q[1]); ctx.lineTo(Q[0] - hh * Math.cos(a - 0.4), Q[1] - hh * Math.sin(a - 0.4)); ctx.lineTo(Q[0] - hh * Math.cos(a + 0.4), Q[1] - hh * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
      K.text(ctx, 'E', Q[0] + 12 * u[0], Q[1] + 12 * u[1], {size: 13, bold: true, color: '#b85a0c', align: 'center'}); }
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(P[0], P[1], 5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fillRect(8, 8, 360, 44);
    K.text(ctx, 'Lignes de champ (bleu foncé) et équipotentielles', 16, 21, {size: 12, bold: true, color: C.navy});
    K.text(ctx, 'teinte rouge : V > 0 ; teinte bleue : V < 0', 16, 40, {size: 11, color: C.ink});
    const Q = 1 + q2;
    out.innerHTML = `Au point choisi : V = <b>${K.fmt(v, 2)}</b> kq/a, E = <b>${K.fmt(e, 2)}</b> kq/a² (a : unité de longueur)<br>` +
      `Charge totale : ${K.fmt(Q, 1)} q. ` + (Q === 0 ? 'Toutes les lignes issues de +q arrivent sur −q : de loin, c’est un dipôle, le champ décroît en 1/r³.' :
      Math.abs(q2) > 1 && q2 < 0 ? 'Une partie des lignes qui arrivent sur q₂ vient de l’infini.' : 'De loin, on voit une charge unique ' + K.fmt(Q, 1) + ' q : le champ redevient radial.') +
      (q2 > 0 ? ' Entre deux charges de même signe, il existe un point où le champ est nul.' : '') + '<br>Cliquez sur la carte pour lire V et E en un point.';
  }
  draw();
};
