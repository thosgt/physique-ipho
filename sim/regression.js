/* Simulation : loi de puissance y = k x^n mesurée avec du bruit ; représentation linéaire et log-log ; régression
   linéaire (moindres carrés) sur log y = log k + n log x, avec incertitude-type sur la pente. */
window.SIMS['regression'] = function(mount){
  const K = window.SimKit, C = K.C;
  let n = 1.5, noise = 5, N = 8, seed = 1, k = 2;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.slider(ctr, 'Exposant vrai n', 0.5, 3, 0.1, n, v => K.fmt(v, 1), v => { n = v; draw(); });
  K.slider(ctr, 'Bruit (incertitude relative sur y)', 0, 20, 1, noise, v => v + ' %', v => { noise = v; draw(); });
  K.slider(ctr, 'Nombre de points', 4, 30, 1, N, v => v, v => { N = v; draw(); });
  K.button(ctr, 'Nouveau tirage', () => { seed++; draw(); }, true);
  const out = K.readout(ctr);
  function rnd(){ seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function gauss(){ let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function draw(){
    const s0 = seed; const pts = [];
    for (let i = 0; i < N; i++){ const x = 1 + 9 * i / (N - 1); const y = k * Math.pow(x, n) * (1 + noise / 100 * gauss()); pts.push([x, Math.max(y, 1e-3)]); }
    seed = s0;
    // régression sur les logs
    const lx = pts.map(p => Math.log10(p[0])), ly = pts.map(p => Math.log10(p[1]));
    const mx = lx.reduce((a, b) => a + b) / N, my = ly.reduce((a, b) => a + b) / N;
    let sxy = 0, sxx = 0; for (let i = 0; i < N; i++){ sxy += (lx[i] - mx) * (ly[i] - my); sxx += (lx[i] - mx) ** 2; }
    const a = sxy / sxx, b = my - a * mx; let sr = 0; for (let i = 0; i < N; i++) sr += (ly[i] - a * lx[i] - b) ** 2;
    const ua = N > 2 ? Math.sqrt(sr / ((N - 2) * sxx)) : 0;
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const ymax = Math.max(...pts.map(p => p[1])) * 1.1;
    const A = K.axes(ctx, 50, 320, 300, 40, {xmin: 0, xmax: 10.5, ymin: 0, ymax, xticks: 5, yticks: 4, xfmt: v => K.fmt(v, 0), yfmt: v => K.fmt(v, 0), xlabel: 'x'});
    K.text(ctx, 'y = k xⁿ (échelle linéaire)', 175, 26, {size: 11, bold: true, align: 'center', color: C.ink});
    ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); for (let i = 0; i <= 60; i++){ const x = 0.2 + 10 * i / 60; const X = A.sx(x), Y = A.sy(k * Math.pow(x, n)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.blue; pts.forEach(p => { ctx.beginPath(); ctx.arc(A.sx(p[0]), A.sy(p[1]), 4, 0, 7); ctx.fill(); });
    const B = K.axes(ctx, 380, 320, 620, 40, {xmin: -0.1, xmax: 1.1, ymin: Math.min(...ly) - 0.2, ymax: Math.max(...ly) + 0.2, xticks: 4, yticks: 4, xfmt: v => K.fmt(v, 1), yfmt: v => K.fmt(v, 1), xlabel: 'log x'});
    K.text(ctx, 'log y en fonction de log x : droite de pente n', 500, 26, {size: 11, bold: true, align: 'center', color: C.ink});
    ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(B.sx(-0.1), B.sy(b - 0.1 * a)); ctx.lineTo(B.sx(1.1), B.sy(b + 1.1 * a)); ctx.stroke();
    ctx.fillStyle = C.blue; lx.forEach((x, i) => { ctx.beginPath(); ctx.arc(B.sx(x), B.sy(ly[i]), 4, 0, 7); ctx.fill(); });
    K.text(ctx, 'pente ajustée : ' + K.fmt(a, 2) + ' ± ' + K.fmt(ua, 2), 400, 56, {size: 12, bold: true, color: C.red});
    out.innerHTML = `Loi vraie : y = ${k} x<sup>${K.fmt(n, 1)}</sup><br>Régression sur (log x, log y) :<br>pente n = <b>${K.fmt(a, 2)} ± ${K.fmt(ua, 2)}</b><br>ordonnée à l'origine log k = ${K.fmt(b, 2)} → k = ${K.fmt(Math.pow(10, b), 2)}<br>Écart normalisé |n − n_vrai|/u = ${K.fmt(Math.abs(a - n) / (ua || 1e-9), 1)}<br>Résidus : ${K.fmt(Math.sqrt(sr / Math.max(1, N - 2)), 3)} (sur log y)`;
  }
  draw();
};
