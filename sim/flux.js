/* Simulation : flux d'un écoulement uniforme à travers une surface inclinée. Φ = v S cos θ, θ angle entre la vitesse et la normale.
   Les particules qui traversent la surface sont colorées ; leur nombre est proportionnel à la hauteur projetée S cos θ. */
window.SIMS['flux'] = function(mount){
  const K = window.SimKit, C = K.C, W = 640, H = 340;
  let th = 30, v = 2, S = 1, last = 0, parts = [];
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, W, H);
  K.slider(ctr, 'Angle θ entre v et la normale', 0, 90, 1, th, x => x + '°', x => { th = x; });
  K.slider(ctr, 'Vitesse v', 0.5, 4, 0.1, v, x => K.fmt(x, 1) + ' m·s⁻¹', x => { v = x; });
  K.slider(ctr, 'Aire S', 0.5, 1.5, 0.05, S, x => K.fmt(x, 2) + ' m²', x => { S = x; });
  const out = K.readout(ctr);
  for (let i = 0; i < 26; i++) for (let j = 0; j < 9; j++) parts.push({x: i * W / 26 + Math.random() * 10, y: 22 + j * (H - 44) / 26 * 3 + (i % 2) * 18, hit: false});
  function draw(){
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const cx = 330, cy = H / 2, L = 130 * S, t = th * Math.PI / 180, n = [Math.cos(t), -Math.sin(t)], d = [Math.sin(t), Math.cos(t)];
    const A = [cx - L / 2 * d[0], cy - L / 2 * d[1]], B = [cx + L / 2 * d[0], cy + L / 2 * d[1]], ylo = Math.min(A[1], B[1]), yhi = Math.max(A[1], B[1]);
    // bande traversée
    ctx.fillStyle = 'rgba(217,144,11,0.08)'; ctx.fillRect(0, ylo, cx, yhi - ylo);
    ctx.strokeStyle = 'rgba(217,144,11,0.5)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, ylo); ctx.lineTo(W, ylo); ctx.moveTo(0, yhi); ctx.lineTo(W, yhi); ctx.stroke(); ctx.setLineDash([]);
    parts.forEach(p => { ctx.fillStyle = p.hit ? C.amber : '#9fb4cc'; ctx.beginPath(); ctx.arc(p.x, p.y, p.hit ? 3.5 : 2.5, 0, 7); ctx.fill(); });
    ctx.strokeStyle = C.navy; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
    const arrow = (x1, y1, x2, y2, col) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 11; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)); ctx.lineTo(x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill(); };
    arrow(cx, cy, cx + 70 * n[0], cy + 70 * n[1], C.red); K.text(ctx, 'S (normale)', cx + 80 * n[0] + 4, cy + 80 * n[1] - 6, {size: 12, bold: true, color: C.red});
    arrow(40, 20, 40 + 25 * v, 20, C.blue); K.text(ctx, 'v', 46 + 25 * v, 20, {size: 13, bold: true, color: C.blue});
    if (th > 2){ ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, -t, true); ctx.stroke(); ctx.beginPath(); ctx.setLineDash([3, 3]); ctx.moveTo(cx, cy); ctx.lineTo(cx + 60, cy); ctx.stroke(); ctx.setLineDash([]); K.text(ctx, 'θ', cx + 44 * Math.cos(t / 2), cy - 44 * Math.sin(t / 2), {size: 12, color: C.navy, align: 'center'}); }
    K.text(ctx, 'hauteur traversée = S cos θ', 14, H - 14, {size: 12, bold: true, color: '#b85a0c'});
    out.innerHTML = `Φ = v S cos θ = ${K.fmt(v, 1)} × ${K.fmt(S, 2)} × ${K.fmt(Math.cos(t), 2)}<br>Débit : <b>${K.fmt(v * S * Math.cos(t), 2)}</b> m³·s⁻¹<br>${th === 0 ? 'Surface face à l’écoulement : débit maximal.' : th === 90 ? 'Surface parallèle à l’écoulement : rien ne traverse.' : ''}`;
    return [A, B, ylo, yhi];
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    const [A, B, ylo, yhi] = draw(), t = th * Math.PI / 180;
    parts.forEach(p => { const x0 = p.x; p.x += v * 40 * dt;
      // abscisse de la surface à la hauteur p.y
      if (p.y >= ylo && p.y <= yhi){ const xs = A[0] + (p.y - A[1]) / ((B[1] - A[1]) || 1e-9) * (B[0] - A[0]); if (x0 < xs && p.x >= xs) p.hit = true; }
      if (p.x > W){ p.x -= W + 10; p.hit = false; } });
    requestAnimationFrame(loop); })(performance.now());
};
