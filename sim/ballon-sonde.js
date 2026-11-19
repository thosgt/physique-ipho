/* Simulation : ascension d'un ballon-sonde stratosphérique ouvert (hélium) — d'après le Concours général 2023.
   Atmosphère : 0-12 km T = 288 K − 5,9 K/km (modèle du sujet) ; 12-20 km T = 217 K ; au-dessus, réchauffement de
   la stratosphère (+1 K/km jusqu'à 32 km, +2,8 K/km au-delà, comme l'atmosphère standard). P(z) par intégration de
   dP/dz = −ρg avec ρ = PM/(RT). Ballon ouvert : P et T de l'hélium égales à celles de l'air, donc ρHe/ρair = MHe/Mair.
   Phase 1 : masse d'hélium constante, V = mHe·Ma/(Mh·ρa) croît jusqu'à Vmax. Phase 2 : V = Vmax, l'hélium s'échappe. */
window.SIMS['ballon-sonde'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.8, R = 8.314, Ma = 0.029, Mh = 0.004, P0 = 101325, T0 = 288, ZT = 45000, DZ = 10;
  const Tz = z => z < 12000 ? T0 - 0.0059 * z : z < 20000 ? T0 - 0.0059 * 12000 : z < 32000 ? 217.2 + 0.001 * (z - 20000) : 229.2 + 0.0028 * (z - 32000);
  const PT = [P0]; for (let i = 1; i * DZ <= ZT; i++){ const zm = (i - 0.5) * DZ; PT.push(PT[i - 1] * Math.exp(-Ma * g * DZ / (R * Tz(zm)))); }
  const Pz = z => { const x = Math.max(0, Math.min(ZT - DZ, z)) / DZ, i = Math.floor(x), f = x - i; return PT[i] * Math.pow(PT[i + 1] / PT[i], f); };
  const rhoA = z => Pz(z) * Ma / (R * Tz(z));
  const rho0 = rhoA(0);
  let V0 = 1.08e4, Vmax = 1.96e5, mb = 1200, mHe, z, v, running = false, last = null, t = 0, k0, path = [];
  function reset(){ mHe = rho0 * Mh / Ma * V0; z = 0; v = 0; t = 0; path = []; const F = (Ma / Mh - 1) * mHe * g - mb * g; k0 = Math.max(F, 1) / 49; running = false; if (bRun) bRun.textContent = '▶ Lâcher le ballon'; draw(); }
  const vol = () => Math.min(Vmax, mHe * Ma / (Mh * rhoA(z)));
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 440);
  K.slider(ctr, 'Volume d’hélium au sol V₀', 1, 30, 0.1, V0 / 1000, v => K.fmt(v, 1) + '·10³ m³', v => { V0 = v * 1000; reset(); });
  K.slider(ctr, 'Volume maximal de l’enveloppe', 50, 300, 1, Vmax / 1000, v => K.fmt(v, 0) + '·10³ m³', v => { Vmax = v * 1000; reset(); });
  K.slider(ctr, 'Masse du ballon hors hélium m_b', 400, 3000, 50, mb, v => K.fmt(v, 0) + ' kg', v => { mb = v; reset(); });
  const bRun = K.button(ctr, '▶ Lâcher le ballon', () => { if (running){ running = false; bRun.textContent = '▶ Reprendre'; return; } if (!canLift()) return; running = true; bRun.textContent = '⏸ Pause'; last = null; requestAnimationFrame(loop); });
  K.button(ctr, 'Réinitialiser (ballon Spirale)', () => { V0 = 1.08e4; Vmax = 1.96e5; mb = 1200; ctr.querySelectorAll('input[type=range]').forEach((el, i) => { el.value = [10.8, 196, 1200][i]; el.dispatchEvent(new Event('input')); }); reset(); }, true);
  const out = K.readout(ctr);
  const canLift = () => (Ma / Mh - 1) * mHe > mb;
  function loop(ts){
    if (!ctx.canvas.isConnected || !running) return;
    const dtr = last === null ? 0 : Math.min(0.05, (ts - last) / 1000); last = ts;
    const dt = dtr * 150, n = 30;                          // 1 s à l'écran = 2 min 30 s de vol
    for (let i = 0; i < n; i++){
      const h = dt / n, Vb = vol();
      if (Vb >= Vmax - 1e-6) mHe = Math.min(mHe, rhoA(z) * Mh / Ma * Vmax);   // l'hélium en excès s'échappe
      const V = vol(), Pi = rhoA(z) * V * g, Wt = (mb + mHe) * g, mi = mb + mHe + 0.5 * rhoA(z) * V;
      const F = Pi - Wt - k0 * v * Math.abs(v);
      v += F / mi * h; z += v * h; t += h; if (z < 0){ z = 0; v = Math.max(0, v); }
    }
    if (!path.length || t - path[path.length - 1][0] > 20) path.push([t, z]);
    draw(); if (running) requestAnimationFrame(loop);
  }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const Ymax = 42, y0 = 410, y1 = 40, sy = km => y0 - km / Ymax * (y0 - y1);
    // colonne d'atmosphère
    const x0 = 20, x1 = 160;
    [[0, 12, 'TROPOSPHÈRE', '#dbe8f7'], [12, 42, 'STRATOSPHÈRE', '#eef3fa']].forEach(([a, b, nm, col]) => { ctx.fillStyle = col; ctx.fillRect(x0, sy(b), x1 - x0, sy(a) - sy(b)); K.text(ctx, nm, x1 - 4, sy(b) + 12, {size: 9, bold: true, color: C.ink, align: 'right'}); });
    ctx.strokeStyle = '#8a94a6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    ctx.fillStyle = '#4a5670'; ctx.font = '10px IBM Plex Sans, sans-serif'; ctx.textAlign = 'right';
    for (let k = 0; k <= 40; k += 10) ctx.fillText(k + ' km', x0 + 32, sy(k) - 3);
    // ballon
    const V = vol(), rB = 5 + 2.2 * Math.cbrt(V / 1000), yb = sy(z / 1000), xb = 95;
    ctx.fillStyle = 'rgba(240,244,250,0.95)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(xb, yb - rB - 14, rB * 0.85, rB, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xb, yb - 14); ctx.lineTo(xb, yb - 2); ctx.stroke(); ctx.fillStyle = C.navy; ctx.fillRect(xb - 4, yb - 3, 8, 6);
    if (V >= Vmax - 1){ ctx.fillStyle = C.amber; ctx.font = '600 10px IBM Plex Sans, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('He ↓', xb + rB * 0.85 + 2, yb - 10); }
    // graphe 1 : volume
    const A = K.axes(ctx, 210, y0, 400, y1, {xmin: 0, xmax: Math.max(Vmax, 1e5) / 1e3 * 1.1, ymin: 0, ymax: Ymax, xticks: 3, yticks: [0, 10, 20, 30, 40], xfmt: v => K.fmt(v, 0), yfmt: v => K.fmt(v, 0), xlabel: 'V (10³ m³)', grid: true});
    ctx.strokeStyle = '#0b5fa5'; ctx.lineWidth = 2; ctx.beginPath();
    const mh0 = rho0 * Mh / Ma * V0;
    for (let k = 0; k <= 420; k++){ const zz = k * 100; const Vz = Math.min(Vmax, mh0 * Ma / (Mh * rhoA(zz))); const X = A.sx(Vz / 1e3), Y = A.sy(zz / 1000); k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.moveTo(A.sx(Vmax / 1e3), y0); ctx.lineTo(A.sx(Vmax / 1e3), y1); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, 'V_max', A.sx(Vmax / 1e3) - 3, y1 + 8, {size: 10, color: '#7a4e05', align: 'right'});
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(A.sx(V / 1e3), A.sy(z / 1000), 4.5, 0, 7); ctx.fill();
    // graphe 2 : forces
    const Wmax = Math.max((Ma / Mh) * mh0 * g, (mb + mh0) * g) / 1e3 * 1.15;
    const B = K.axes(ctx, 450, y0, 630, y1, {xmin: 0, xmax: Wmax, ymin: 0, ymax: Ymax, xticks: 3, yticks: [0, 10, 20, 30, 40], xfmt: v => K.fmt(v, 0), yfmt: v => K.fmt(v, 0), xlabel: 'force (kN)', grid: true});
    const curve = (fn, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k <= 420; k++){ const zz = k * 100; const X = B.sx(fn(zz) / 1e3), Y = B.sy(zz / 1000); k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); };
    const mHeOf = zz => Math.min(mh0, rhoA(zz) * Mh / Ma * Vmax);
    curve(zz => rhoA(zz) * Math.min(Vmax, mh0 * Ma / (Mh * rhoA(zz))) * g, '#0b5fa5');
    curve(zz => (mb + mHeOf(zz)) * g, C.red);
    K.text(ctx, 'poussée Π', 456, 52, {size: 11, bold: true, color: '#0b5fa5'}); K.text(ctx, 'poids', 456, 68, {size: 11, bold: true, color: C.red});
    // plafond prévu
    let zc = null; for (let k = 0; k <= 4400; k++){ const zz = k * 10; if (rhoA(zz) * Math.min(Vmax, mh0 * Ma / (Mh * rhoA(zz))) - (mb + mHeOf(zz)) <= 0){ zc = zz; break; } }
    if (zc !== null){ ctx.setLineDash([5, 4]); ctx.strokeStyle = C.green; ctx.beginPath(); ctx.moveTo(x0, sy(zc / 1000)); ctx.lineTo(630, sy(zc / 1000)); ctx.stroke(); ctx.setLineDash([]); K.text(ctx, 'plafond ' + K.fmt(zc / 1000, 1) + ' km', 405, sy(zc / 1000) - 7, {size: 10, bold: true, color: C.green}); }
    ctx.fillStyle = C.navy; const PiNow = rhoA(z) * V * g; ctx.beginPath(); ctx.arc(B.sx(PiNow / 1e3), B.sy(z / 1000), 4.5, 0, 7); ctx.fill();
    // lecture
    const Vt = Math.min(Vmax, mHe * Ma / (Mh * rhoA(z)));
    const mm = Math.floor(t / 60), ph = !canLift() ? '<b>le ballon ne décolle pas</b> (V₀ trop petit)' : Vt >= Vmax - 1 ? 'phase 2 : V = Vmax, l’hélium s’échappe' : 'phase 1 : masse d’hélium constante';
    out.innerHTML = `Altitude <b>${K.fmt(z / 1000, 2)} km</b> (t = ${mm} min)<br>T = ${K.fmt(Tz(z), 0)} K ; P = ${Pz(z) >= 1e4 ? K.fmt(Pz(z) / 100, 0) : K.fmt(Pz(z) / 100, 2)} hPa<br>ρ<sub>air</sub> = ${rhoA(z) >= 0.1 ? K.fmt(rhoA(z), 3) : K.fmt(rhoA(z) * 1000, 2) + '·10⁻³'} kg/m³<br>` +
      `V = <b>${K.fmt(Vt / 1e3, 1)}·10³ m³</b> ; m<sub>He</sub> = ${K.fmt(mHe, 0)} kg<br>Π = ${K.fmt(rhoA(z) * Vt * g / 1e3, 1)} kN ; poids = ${K.fmt((mb + mHe) * g / 1e3, 1)} kN<br>vitesse ${K.fmt(v, 1)} m/s<br>${ph}<br>` +
      `V₀,min = m_b / [ρ₀(1 − M_He/M_air)] = ${K.fmt(mb / (rho0 * (1 - Mh / Ma)), 0)} m³`;
  }
  reset();
};
