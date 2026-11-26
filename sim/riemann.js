/* Simulation : sommes de rectangles (Riemann). La somme des f(x_i)Δx tend vers l'intégrale quand Δx → 0 ;
   les rectangles sous l'axe comptent négativement. */
window.SIMS['riemann'] = function(mount){
  const K = window.SimKit, C = K.C;
  const F = {
    v: ['v(t) = 10 e^(−t/2), de 0 à 4 s', t => 10 * Math.exp(-t / 2), 0, 4, 20 * (1 - Math.exp(-2)), 'm', [0, 11], 't (s)'],
    x2: ['f(x) = x², de 0 à 2', x => x * x, 0, 2, 8 / 3, '', [0, 4.4], 'x'],
    sin: ['v(t) = sin t, de 0 à 2π (aller-retour)', t => Math.sin(t), 0, 2 * Math.PI, 0, 'm', [-1.2, 1.2], 't (s)'],
    lin: ['v(t) = 2 + 0,5 t, de 0 à 6 s', t => 2 + 0.5 * t, 0, 6, 21, 'm', [0, 5.5], 't (s)']
  };
  let fn = 'v', n = 6, mode = 'g';
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.select(ctr, 'Fonction', Object.entries(F).map(([k, v]) => [k, v[0]]), v => { fn = v; draw(); });
  K.select(ctr, 'Hauteur des rectangles', [['g', 'valeur à gauche'], ['m', 'valeur au milieu'], ['d', 'valeur à droite']], v => { mode = v; draw(); });
  K.slider(ctr, 'Nombre de rectangles', 1, 100, 1, n, v => String(v), v => { n = v; draw(); });
  const out = K.readout(ctr);
  function draw(){
    const [name, f, a, b, exact, unit, yr, xl] = F[fn];
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const A = K.axes(ctx, 50, 325, 625, 20, {xmin: a, xmax: b, ymin: yr[0], ymax: yr[1], xticks: 6, yticks: 4, xfmt: u => K.fmt(u, 1), yfmt: u => K.fmt(u, 1), xlabel: xl});
    const dx = (b - a) / n, off = mode === 'g' ? 0 : mode === 'm' ? 0.5 : 1; let S = 0;
    for (let i = 0; i < n; i++){
      const xi = a + (i + off) * dx, y = f(xi); S += y * dx;
      const X0 = A.sx(a + i * dx), X1 = A.sx(a + (i + 1) * dx), Y = A.sy(y), Y0 = A.sy(0);
      ctx.fillStyle = y >= 0 ? 'rgba(11,95,165,0.22)' : 'rgba(178,58,72,0.25)'; ctx.fillRect(X0, Math.min(Y, Y0), X1 - X0, Math.abs(Y0 - Y));
      if (n <= 40){ ctx.strokeStyle = y >= 0 ? C.blue : C.red; ctx.lineWidth = 1; ctx.strokeRect(X0, Math.min(Y, Y0), X1 - X0, Math.abs(Y0 - Y)); }
    }
    ctx.strokeStyle = C.grey; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(50, A.sy(0)); ctx.lineTo(625, A.sy(0)); ctx.stroke();
    ctx.strokeStyle = C.navy; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i <= 300; i++){ const x = a + (b - a) * i / 300, X = A.sx(x), Y = A.sy(f(x)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
    if (n <= 12){ const i = Math.floor(n / 2), xi = a + (i + off) * dx; K.text(ctx, 'Δx', A.sx(a + (i + 0.5) * dx), A.sy(0) + (f(xi) >= 0 ? 12 : -12), {size: 11, color: C.amber, align: 'center', bold: true}); }
    const err = exact !== 0 ? (S - exact) / Math.abs(exact) * 100 : null;
    K.text(ctx, name, 60, 36, {size: 12, bold: true, color: C.navy});
    out.innerHTML = `Δx = ${K.fmt(dx, 3)}<br>Somme des rectangles : <b>${K.fmt(S, 4)}</b>${unit ? ' ' + unit : ''}<br>Intégrale exacte : <b>${K.fmt(exact, 4)}</b>${unit ? ' ' + unit : ''}<br>${err === null ? 'Écart : ' + K.fmt(S - exact, 4) + ' (les aires positives et négatives se compensent)' : 'Écart : ' + K.fmt(err, 2) + ' %'}${unit === 'm' ? '<br>Ici l’aire sous v(t) est un déplacement.' : ''}`;
  }
  draw();
};
