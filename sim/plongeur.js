/* Simulation : stabilité d'un plongeur (ou d'un ludion) — modèle du Concours général 2026.
   Système {plongeur + équipement + plomb + air} : masse m = m0 + m_plomb, volume V0 incompressible + air
   (n moles, T0 = 293 K) comprimé à la pression de l'eau P(z) = Patm + ρ g z (z : profondeur, vers le bas).
   Force nette vers le bas : F = m g − ρ g (V0 + nRT0/P(z)) ; frottement quadratique de l'eau pour l'animation. */
window.SIMS['plongeur'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.8, rho = 1030, Patm = 1.0e5, R = 8.314, T0 = 293, m0 = 75, V0 = 0.075;
  const ZMAX = 40, kD = 60;                                    // profondeur affichée (m), coefficient de traînée (kg/m)
  let mp = 4, n = 0.21, z = 20, v = 0, running = false, last = null, trail = [];
  const P = zz => Patm + rho * g * Math.max(0, zz);
  const Vair = zz => n * R * T0 / P(zz);
  const Pi = zz => rho * g * (V0 + Vair(zz));
  const W = () => (m0 + mp) * g;
  const zEq = () => { const k = (m0 + mp) / rho - V0; if (k <= 0) return null; const Peq = n * R * T0 / k; const ze = (Peq - Patm) / (rho * g); return ze; };
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 430);
  const sP = K.slider(ctr, 'Plomb à la ceinture', 0, 8, 1, mp, v => v + ' kg', v => { mp = v; stop(); draw(); });
  const sN = K.slider(ctr, 'Air dans le gilet et les poumons', 0, 0.6, 0.005, n, v => K.fmt(v, 3) + ' mol (' + K.fmt(v * R * T0 / Patm * 1000, 1) + ' L en surface)', v => { n = v; stop(); draw(); });
  const sZ = K.slider(ctr, 'Profondeur de départ', 0, ZMAX, 0.5, z, val => K.fmt(val, 1) + ' m', val => { z = val; v = 0; stop(); trail = []; draw(); });
  const bRun = K.button(ctr, '▶ Lâcher le plongeur', () => { if (running){ stop(); return; } running = true; bRun.textContent = '⏸ Pause'; last = null; requestAnimationFrame(loop); });
  K.button(ctr, 'Placer 1 m au-dessus de l’équilibre', () => place(-1), true);
  K.button(ctr, 'Placer 1 m au-dessous de l’équilibre', () => place(+1), true);
  const out = K.readout(ctr);
  function place(dz){ const ze = zEq(); if (ze === null || ze < 0 || ze > ZMAX) return; stop(); z = Math.max(0, Math.min(ZMAX, ze + dz)); v = 0; trail = []; sZ.value = z; draw(); }
  function stop(){ running = false; bRun.textContent = '▶ Lâcher le plongeur'; }
  function loop(ts){
    if (!ctx.canvas.isConnected || !running) return;
    const dt = last === null ? 0 : Math.min(0.05, (ts - last) / 1000) * 3; last = ts;      // temps accéléré × 3
    const nSub = 20;
    for (let i = 0; i < nSub; i++){
      const h = dt / nSub, m = m0 + mp, F = W() - Pi(z) - kD * v * Math.abs(v);
      v += F / m * h; z += v * h;
      if (z <= 0){ z = 0; if (v < 0) v = 0; }
      if (z >= ZMAX){ z = ZMAX; if (v > 0) v = 0; }
    }
    trail.push(z); if (trail.length > 200) trail.shift();
    draw(); if (running) requestAnimationFrame(loop);
  }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    // colonne d'eau
    const x0 = 20, x1 = 240, y0 = 40, y1 = 410, sy = zz => y0 + zz / ZMAX * (y1 - y0);
    const grd = ctx.createLinearGradient(0, y0, 0, y1); grd.addColorStop(0, 'rgba(90,169,255,0.35)'); grd.addColorStop(1, 'rgba(11,60,120,0.55)');
    ctx.fillStyle = grd; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    K.text(ctx, 'surface (1 bar)', x0 + 4, y0 - 10, {size: 11, color: C.ink});
    ctx.font = '10px IBM Plex Sans, sans-serif'; ctx.fillStyle = '#e9eef5'; ctx.textAlign = 'right';
    for (let d = 10; d <= ZMAX; d += 10){ const y = sy(d); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(x1 - 36, y - 0.5, 36, 1); ctx.fillText(d + ' m · ' + K.fmt(P(d) / 1e5, 1) + ' bar', x1 - 4, y - 5); }
    const ze = zEq();
    if (ze !== null && ze >= 0 && ze <= ZMAX){ const y = sy(ze); ctx.setLineDash([5, 4]); ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]);
      K.text(ctx, 'équilibre z₀ = ' + K.fmt(ze, 1) + ' m', x0 + 4, y + 10, {size: 11, color: '#7a4e05', bold: true}); }
    // trace
    if (trail.length > 1){ ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); trail.forEach((t, i) => { const X = 90 - (trail.length - i) * 0.3, Y = sy(t); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); }
    // plongeur : corps + gilet dont la taille suit le volume d'air
    const yd = sy(z), xd = 110, va = Vair(z) * 1000, rg = 4 + 3.2 * Math.sqrt(va);
    ctx.fillStyle = '#1e2a3a'; ctx.beginPath(); ctx.ellipse(xd, yd, 26, 8, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(xd + 30, yd - 2, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2b84b'; ctx.beginPath(); ctx.ellipse(xd - 2, yd - 8, rg * 1.3, rg * 0.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5d6472'; ctx.fillRect(xd - 14, yd + 5, 10, 5);
    // forces
    const sc = 0.12, wv = W(), pv = Pi(z);
    const arrow = (x, y, L, col, lab, right) => { ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3; const s = Math.sign(L), Lc = Math.max(-150, Math.min(150, L));
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + Lc - s * 9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y + Lc); ctx.lineTo(x - 6, y + Lc - s * 10); ctx.lineTo(x + 6, y + Lc - s * 10); ctx.fill();
      K.text(ctx, lab, x + (right ? 8 : -8), y + Lc / 2, {size: 11, bold: true, color: col, align: right ? 'left' : 'right'}); };
    arrow(xd + 52, yd, wv * sc, C.red, 'P = ' + K.fmt(wv, 0) + ' N', true);
    arrow(xd - 50, yd, -pv * sc, '#0b5fa5', 'Π = ' + K.fmt(pv, 0) + ' N', false);
    // graphe : poussée et poids en fonction de la profondeur
    const A = K.axes(ctx, 320, 400, 630, 40, {xmin: 0, xmax: ZMAX, ymin: 720, ymax: 840, xticks: 4, yticks: 6, xfmt: v => K.fmt(v, 0), yfmt: v => K.fmt(v, 0), xlabel: 'profondeur z (m)'});
    K.text(ctx, 'force (N)', 320, 26, {size: 11, color: C.ink, align: 'center'});
    ctx.save(); ctx.beginPath(); ctx.rect(320, 40, 310, 360); ctx.clip();
    ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(A.sx(0), A.sy(wv)); ctx.lineTo(A.sx(ZMAX), A.sy(wv)); ctx.stroke();
    ctx.strokeStyle = '#0b5fa5'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 200; i++){ const zz = i / 200 * ZMAX; const X = A.sx(zz), Y = A.sy(Pi(zz)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
    // zones : flèche de la force nette
    if (ze !== null && ze > 0.5 && ze < ZMAX - 0.5){ const yy = A.sy(wv) - 18; const xe = A.sx(ze);
      ctx.fillStyle = C.green; ctx.font = '600 11px IBM Plex Sans, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Π > P : remonte ↑', (A.sx(0) + xe) / 2, A.sy(wv) + 30); ctx.fillStyle = C.red; ctx.fillText('Π < P : coule ↓', (xe + A.sx(ZMAX)) / 2, A.sy(wv) - 22);
      ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(xe, A.sy(wv), 5, 0, 7); ctx.fill(); }
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(A.sx(z), A.sy(pv), 5, 0, 7); ctx.fill();
    ctx.restore();
    K.text(ctx, 'poids P', 560, A.sy(wv) - 10 < 50 ? 54 : A.sy(wv) - 10, {size: 11, color: C.red, bold: true});
    K.text(ctx, 'poussée Π(z)', 330, 52, {size: 11, color: '#0b5fa5', bold: true});
    // lecture
    const net = wv - pv;
    out.innerHTML = `Profondeur z = <b>${K.fmt(z, 1)} m</b> ; P = ${K.fmt(P(z) / 1e5, 2)} bar<br>Volume d'air : <b>${K.fmt(Vair(z) * 1000, 2)} L</b><br>` +
      `Poids : ${K.fmt(wv, 1)} N ; poussée : ${K.fmt(pv, 1)} N<br>Force nette : <b>${K.fmt(Math.abs(net), 1)} N ${net > 0.05 ? 'vers le bas' : net < -0.05 ? 'vers le haut' : '(équilibre)'}</b><br>` +
      `Vitesse : ${K.fmt(Math.abs(v), 2)} m/s ${v > 0.01 ? '↓' : v < -0.01 ? '↑' : ''}<br>` +
      (ze === null ? 'Trop lesté : coule à toute profondeur.' : ze < 0 ? 'Pas assez lesté : flotte en surface.' : `Équilibre à z₀ = ${K.fmt(ze, 1)} m : <b>instable</b>.`);
  }
  draw();
};
