/* Simulation : vidange de Torricelli. Réservoir cylindrique de section S, trou de section s à la hauteur zt au-dessus du sol,
   hauteur d'eau initiale H0 (au-dessus du sol). v = sqrt(2 g h) avec h = niveau − zt ; portée x = v sqrt(2 zt / g) ;
   vidange : S dh/dt = −s sqrt(2 g h). Le temps est accéléré (×accel). */
window.SIMS['torricelli'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81;
  let H0 = 1.0, zt = 0.3, S = 0.5, s = 2.0, level = H0, running = false, tsim = 0, accel = 5;   // m, m, m², cm², m
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 420);
  const sH = K.slider(ctr, 'Hauteur d’eau initiale H₀', 0.4, 1.5, 0.05, H0, v => K.fmt(v, 2) + ' m', v => { H0 = v; reset(); });
  K.slider(ctr, 'Hauteur du trou z_t (au-dessus du sol)', 0.0, 1.4, 0.05, zt, v => K.fmt(v, 2) + ' m', v => { zt = v; reset(); });
  K.slider(ctr, 'Section du réservoir S', 0.1, 2, 0.1, S, v => K.fmt(v, 1) + ' m²', v => { S = v; reset(); });
  K.slider(ctr, 'Section du trou s', 0.5, 10, 0.5, s, v => K.fmt(v, 1) + ' cm²', v => { s = v; reset(); });
  const bs = K.button(ctr, '▶ Ouvrir le trou', () => { running = !running; bs.textContent = running ? 'Pause' : '▶ Ouvrir le trou'; });
  K.button(ctr, 'Remplir', reset, true);
  const out = K.readout(ctr);
  function reset(){ level = H0; tsim = 0; running = false; bs.textContent = '▶ Ouvrir le trou'; }
  const h = () => Math.max(0, level - zt), vel = () => Math.sqrt(2 * g * h()), range = () => vel() * Math.sqrt(2 * zt / g);
  const tv = () => (S / (s * 1e-4)) * Math.sqrt(2 * Math.max(0, H0 - zt) / g);
  let last = null;
  function step(now){
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (running && h() > 0){ const d = dt * accel; level -= (s * 1e-4) * Math.sqrt(2 * g * h()) / S * d; tsim += d; if (level < zt){ level = zt; running = false; bs.textContent = 'Vide'; } }
  }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const px = 180, x0 = 60, y0 = 380, w = 150;     // px par mètre, bas-gauche du réservoir
    const yOf = z => y0 - z * px;
    ctx.fillStyle = '#efe4d2'; ctx.fillRect(0, y0, 640, 20);
    ctx.fillStyle = 'rgba(90,169,255,0.45)'; ctx.fillRect(x0, yOf(level), w, y0 - yOf(level));
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, yOf(1.6)); ctx.lineTo(x0, y0); ctx.lineTo(x0 + w, y0); ctx.lineTo(x0 + w, yOf(1.6)); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0 + w, yOf(zt) - 4); ctx.lineTo(x0 + w, yOf(zt) + 4); ctx.stroke();
    // jet parabolique
    const v = vel();
    if (v > 0){ ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath(); for (let t = 0; t <= Math.sqrt(2 * zt / g) + 0.001; t += 0.01){ const X = x0 + w + v * t * px, Y = yOf(zt - 0.5 * g * t * t); t ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
      const xr = x0 + w + range() * px; ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(xr, y0, 4, 0, 7); ctx.fill(); K.text(ctx, 'portée ' + K.fmt(range(), 2) + ' m', xr, y0 + 32, {size: 11, bold: true, color: C.blue, align: 'center'}); }
    // cotes
    const dim = (x, za, zb, lab, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, yOf(za)); ctx.lineTo(x, yOf(zb)); ctx.stroke(); [za, zb].forEach(z => { ctx.beginPath(); ctx.moveTo(x - 5, yOf(z)); ctx.lineTo(x + 5, yOf(z)); ctx.stroke(); }); K.text(ctx, lab, x - 8, (yOf(za) + yOf(zb)) / 2, {size: 11, bold: true, color: col, align: 'right'}); };
    if (h() > 0.01) dim(x0 - 14, zt, level, 'h = ' + K.fmt(h(), 2) + ' m', '#0b5fa5');
    if (zt > 0.02) dim(x0 - 14, 0, zt, 'z_t = ' + K.fmt(zt, 2) + ' m', '#a8660a');
    K.text(ctx, 'P₀', x0 + w / 2, yOf(level) - 10, {size: 12, align: 'center', color: C.ink});
    K.text(ctx, 'v = √(2gh) = ' + K.fmt(v, 2) + ' m/s', x0 + w + 8, yOf(zt) - 14, {size: 12, bold: true, color: C.blue});
    // graphe h(t)
    const T = Math.max(tv(), 1), A = K.axes(ctx, 400, 240, 620, 40, {xmin: 0, xmax: T * 1.05, ymin: 0, ymax: Math.max(0.1, H0 - zt), xticks: 4, yticks: 4, xfmt: x => K.fmt(x, 0), yfmt: y => K.fmt(y, 1), xlabel: 't (s)'});
    K.text(ctx, 'h (m) : hauteur au-dessus du trou', 510, 26, {size: 11, color: C.ink, align: 'center'});
    const hh0 = Math.max(0, H0 - zt);
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 80; i++){ const tt = T * i / 80, hv = Math.max(0, Math.sqrt(hh0) - (s * 1e-4) / S * Math.sqrt(g / 2) * tt) ** 2; const X = A.sx(tt), Y = A.sy(hv); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
    ctx.setLineDash([5, 4]); ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.moveTo(A.sx(0), A.sy(hh0)); ctx.lineTo(A.sx(T / 2), A.sy(0)); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, '- - à débit initial constant : t = t_v/2', 410, 258, {size: 10, color: C.amber});
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(A.sx(Math.min(tsim, T)), A.sy(h()), 4, 0, 7); ctx.fill();
    K.text(ctx, 'parabole : h(t) = (√h₀ − (s/S)√(g/2) t)²', 410, 272, {size: 10, color: C.blue});
    out.innerHTML = `h = ${K.fmt(h(), 2)} m → v = √(2gh) = <b>${K.fmt(v, 2)} m/s</b><br>Débit Q = s·v = ${K.fmt(s * 1e-4 * v * 1000, 2)} L/s<br>Portée x = v√(2z_t/g) = 2√(h z_t) = <b>${K.fmt(range(), 2)} m</b><br>` +
      `Temps de vidange t_v = (S/s)√(2h₀/g) = <b>${K.fmt(tv(), 0)} s</b><br>t = ${K.fmt(tsim, 0)} s (temps ×${accel})<br>Portée maximale pour z_t = (H₀)/2 = ${K.fmt(H0 / 2, 2)} m`;
  }
  (function loop(now){ if (!mount.isConnected) return; step(now); draw(); requestAnimationFrame(loop); })(performance.now());
};
