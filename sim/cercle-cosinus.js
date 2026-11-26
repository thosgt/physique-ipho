/* Simulation : un point tourne à vitesse angulaire ω sur un cercle de rayon A ; sa projection verticale vaut A cos(ωt + φ).
   La phase φ est l'angle de départ (mesuré depuis la verticale), la pulsation la vitesse de rotation. */
window.SIMS['cercle-cosinus'] = function(mount){
  const K = window.SimKit, C = K.C, TM = 8;
  let A = 1, w = 1.5, phi = 0, t = 0, run = true, last = 0;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 320);
  K.slider(ctr, 'Amplitude A', 0.3, 1, 0.05, A, v => K.fmt(v, 2), v => { A = v; });
  K.slider(ctr, 'Pulsation ω', 0.5, 4, 0.1, w, v => K.fmt(v, 1) + ' rad·s⁻¹', v => { w = v; t = 0; });
  K.slider(ctr, 'Phase à l’origine φ', -180, 180, 15, 0, v => (v > 0 ? '+' : '') + v + '°', v => { phi = v * Math.PI / 180; t = 0; });
  const bp = K.button(ctr, 'Pause', () => { run = !run; bp.textContent = run ? 'Pause' : 'Reprendre'; });
  const out = K.readout(ctr);
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const cx = 120, cy = 165, R = 110 * A, Rm = 110;
    // cercle et repères
    ctx.strokeStyle = C.light; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 125, cy); ctx.lineTo(cx + 125, cy); ctx.moveTo(cx, cy - 135); ctx.lineTo(cx, cy + 135); ctx.stroke();
    ctx.strokeStyle = C.grey; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    const th = w * t + phi, px = cx - R * Math.sin(th), py = cy - R * Math.cos(th);
    // angle de départ
    ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - R * Math.sin(phi), cy - R * Math.cos(phi)); ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    if (Math.abs(phi) > 0.05){ ctx.beginPath(); ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 - phi, phi > 0); ctx.stroke(); K.text(ctx, 'φ', cx - 36 * Math.sin(phi / 2), cy - 36 * Math.cos(phi / 2), {size: 12, color: C.amber, bold: true, align: 'center'}); }
    ctx.strokeStyle = C.navy; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill();
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(cx, py, 5, 0, 7); ctx.fill();
    K.text(ctx, 'ω', cx + Rm * 0.78, cy - Rm * 0.9, {size: 13, color: C.navy, bold: true}); K.text(ctx, '↺', cx + Rm * 0.62, cy - Rm * 0.9, {size: 16, color: C.navy});
    // courbe
    const G = K.axes(ctx, 270, 290, 630, 40, {xmin: 0, xmax: TM, ymin: -125 / 110, ymax: 125 / 110, xticks: 8, yticks: [-1, 0, 1], xfmt: u => K.fmt(u, 0), yfmt: u => K.fmt(u, 0), xlabel: 't (s)', grid: true});
    const sy = v => cy - v * Rm;
    ctx.strokeStyle = C.light; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 400; i++){ const u = TM * i / 400; i ? ctx.lineTo(G.sx(u), sy(A * Math.cos(w * u + phi))) : ctx.moveTo(G.sx(u), sy(A * Math.cos(w * u + phi))); } ctx.stroke();
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2.6; ctx.beginPath(); for (let i = 0; i <= 400; i++){ const u = TM * i / 400; if (u > t) break; i ? ctx.lineTo(G.sx(u), sy(A * Math.cos(w * u + phi))) : ctx.moveTo(G.sx(u), sy(A * Math.cos(w * u + phi))); } ctx.stroke();
    ctx.strokeStyle = C.blue; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(G.sx(t), py); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(G.sx(t), py, 4.5, 0, 7); ctx.fill();
    // période
    const T0 = 2 * Math.PI / w; if (T0 < TM){ const t1 = ((-phi) / w % T0 + T0) % T0; if (t1 + T0 <= TM){ const yA = sy(A) - 10; ctx.strokeStyle = C.amber; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(G.sx(t1), yA); ctx.lineTo(G.sx(t1 + T0), yA); ctx.stroke(); K.text(ctx, 'T = 2π/ω', (G.sx(t1) + G.sx(t1 + T0)) / 2, yA - 9, {size: 11, color: C.amber, bold: true, align: 'center'}); } }
    K.text(ctx, 'y = A cos(ωt + φ)', 280, 22, {size: 12, bold: true, color: C.navy});
    out.innerHTML = `Angle ωt + φ = ${K.fmt(((th * 180 / Math.PI) % 360 + 540) % 360 - 180, 0)}°<br>y = <b>${K.fmt(A * Math.cos(th), 2)}</b><br>Période T = 2π/ω = <b>${K.fmt(T0, 2)}</b> s<br>Fréquence f = ${K.fmt(1 / T0, 2)} Hz<br>y(0) = A cos φ = ${K.fmt(A * Math.cos(phi), 2)}`;
  }
  (function loop(now){ if (!mount.isConnected) return; const d = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (run){ t += d; if (t > TM) t = 0; } draw(); requestAnimationFrame(loop); })(performance.now());
};
