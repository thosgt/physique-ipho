/* Simulation : muons cosmiques. Créés à l'altitude h0 = 15 km avec la vitesse βc, durée de vie propre τ0 = 2,2 µs.
   Fraction survivante au sol : exp(−h0/(γβcτ0)). Comparaison avec le calcul non relativiste exp(−h0/(βcτ0)),
   et point de vue du muon : atmosphère contractée h0/γ parcourue en h0/(γβc) de temps propre. */
window.SIMS['muons'] = function(mount){
  const K = window.SimKit, C = K.C, c = 3e8, tau0 = 2.2e-6, h0 = 15000;
  let beta = 0.995, N0 = 1000, t = 0, running = false, rel = true;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 420);
  K.slider(ctr, 'Vitesse des muons β', 0.5, 0.9999, 0.0001, beta, x => K.fmt(x, 4) + ' c', x => { beta = x; reset(); });
  K.select(ctr, 'Modèle', [['rel', 'relativiste (durée de vie γτ₀)'], ['cla', 'sans relativité (durée de vie τ₀)']], v => { rel = v === 'rel'; reset(); });
  const bp = K.button(ctr, '▶ Lâcher 1 000 muons', () => { running = !running; bp.textContent = running ? 'Pause' : '▶ Reprendre'; });
  K.button(ctr, 'Recommencer', reset, true);
  const out = K.readout(ctr);
  function reset(){ t = 0; running = false; bp.textContent = '▶ Lâcher 1 000 muons'; }
  const gam = () => 1 / Math.sqrt(1 - beta * beta);
  let last = performance.now();
  function draw(now){
    if (!mount.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const g = gam(), tauLab = rel ? g * tau0 : tau0, Tfall = h0 / (beta * c);     // temps de chute (référentiel du sol)
    if (running){ t += dt * Tfall / 4; if (t >= Tfall){ t = Tfall; running = false; bp.textContent = 'Arrivés'; } }
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    // colonne d'atmosphère : altitude 0-15 km → y de 380 à 40
    const yOf = z => 380 - z / h0 * 340, zNow = h0 - beta * c * t, frac = Math.exp(-t / tauLab);
    const grad = ctx.createLinearGradient(0, 40, 0, 380); grad.addColorStop(0, '#dbe8f7'); grad.addColorStop(1, '#f6e6c8'); ctx.fillStyle = grad; ctx.fillRect(60, 40, 180, 340);
    ctx.fillStyle = '#efe4d2'; ctx.fillRect(40, 380, 220, 14);
    for (let z = 0; z <= 15000; z += 5000){ K.text(ctx, (z / 1000) + ' km', 54, yOf(z) + 4, {size: 11, align: 'right', color: C.ink}); ctx.strokeStyle = '#c9ced8'; ctx.beginPath(); ctx.moveTo(60, yOf(z)); ctx.lineTo(240, yOf(z)); ctx.stroke(); }
    // nuage de muons : densité ∝ fraction
    const n = Math.round(60 * frac); ctx.fillStyle = C.blue;
    for (let i = 0; i < n; i++){ const x = 70 + ((i * 97) % 160), y = yOf(zNow) + ((i * 31) % 12) - 6; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); }
    K.text(ctx, 'N = ' + Math.round(N0 * frac), 150, yOf(zNow) - 14, {size: 12, bold: true, align: 'center', color: C.blue});
    // courbe N(z)
    const A = K.axes(ctx, 320, 380, 620, 40, {xmin: 0, xmax: 15, ymin: 0, ymax: 1000, xticks: 3, yticks: 5, xfmt: v => K.fmt(v, 0), yfmt: v => K.fmt(v, 0), xlabel: 'distance parcourue (km)'});
    K.text(ctx, 'muons survivants', 470, 28, {size: 11, bold: true, align: 'center', color: C.ink});
    const curve = (tau, col, dash) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash || []); ctx.beginPath(); for (let i = 0; i <= 100; i++){ const d = h0 * i / 100; const Nn = N0 * Math.exp(-d / (beta * c * tau)); const X = A.sx(d / 1000), Y = A.sy(Math.max(Nn, 0)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); ctx.setLineDash([]); };
    curve(g * tau0, C.blue); curve(tau0, C.red, [5, 4]);
    K.text(ctx, '— relativiste', 330, 50, {size: 11, bold: true, color: C.blue}); K.text(ctx, '- - sans relativité', 330, 66, {size: 11, bold: true, color: C.red});
    ctx.fillStyle = rel ? C.blue : C.red; ctx.beginPath(); ctx.arc(A.sx((h0 - zNow) / 1000), A.sy(N0 * frac), 5, 0, 7); ctx.fill();
    const fRel = Math.exp(-h0 / (beta * c * g * tau0)), fCla = Math.exp(-h0 / (beta * c * tau0));
    out.innerHTML = `γ = <b>${K.fmt(g, 2)}</b> ; parcours moyen βcτ₀ = ${K.fmt(beta * c * tau0, 0)} m, dilaté : γβcτ₀ = ${K.fmt(g * beta * c * tau0 / 1000, 2)} km<br>` +
      `Sol : durée du trajet ${K.fmt(Tfall * 1e6, 1)} µs, survivants <b>${(fRel * 100).toPrecision(2)} %</b> (sans relativité : ${fCla < 1e-4 ? fCla.toExponential(1) : K.fmt(fCla * 100, 2) + ' %'})<br>` +
      `Muon : atmosphère contractée h₀/γ = ${K.fmt(h0 / g / 1000, 2)} km, parcourue en ${K.fmt(Tfall / g * 1e6, 2)} µs de temps propre → même fraction e^(−${K.fmt(Tfall / g / tau0, 2)}) = ${(fRel * 100).toPrecision(2)} %`;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
};
