/* Simulation : produit vectoriel en trois dimensions. c = a ∧ b est perpendiculaire au plan (a, b), de norme ab sin θ
   (aire du parallélogramme), orienté par la règle de la main droite. La scène tourne pour qu'on voie la perpendicularité. */
window.SIMS['vectoriel3d'] = function(mount){
  const K = window.SimKit, C = K.C;
  let th = 60, el = 0, swap = false, gam = 30, spin = true, last = 0;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Angle θ entre a et b', 0, 180, 1, th, v => v + '°', v => { th = v; });
  K.slider(ctr, 'Inclinaison de b hors du plan (x, y)', -60, 60, 1, el, v => v + '°', v => { el = v; });
  const bs = K.button(ctr, 'Calculer b ∧ a', () => { swap = !swap; bs.textContent = swap ? 'Calculer a ∧ b' : 'Calculer b ∧ a'; });
  const bp = K.button(ctr, 'Arrêter la rotation', () => { spin = !spin; bp.textContent = spin ? 'Arrêter la rotation' : 'Faire tourner'; }, true);
  const sg = K.slider(ctr, 'Point de vue', 0, 360, 1, gam, v => v + '°', v => { gam = v; spin = false; bp.textContent = 'Faire tourner'; });
  const out = K.readout(ctr);
  const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const g = gam * Math.PI / 180, e = 22 * Math.PI / 180, k = 52, cx = 300, cy = 235;
    const P = p => { const x = p[0] * Math.cos(g) - p[1] * Math.sin(g), y = p[0] * Math.sin(g) + p[1] * Math.cos(g); return [cx + k * x, cy - k * (p[2] * Math.cos(e) + y * Math.sin(e))]; };
    const arrow = (p, q, col, w, lab) => { const A = P(p), B = P(q), a = Math.atan2(B[1] - A[1], B[0] - A[0]), h = 11, L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0] - Math.min(L, h) * 0.6 * Math.cos(a), B[1] - Math.min(L, h) * 0.6 * Math.sin(a)); ctx.stroke();
      if (L > 4){ ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(B[0] - h * Math.cos(a - 0.4), B[1] - h * Math.sin(a - 0.4)); ctx.lineTo(B[0] - h * Math.cos(a + 0.4), B[1] - h * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill(); }
      if (lab) K.text(ctx, lab, B[0] + 8, B[1] - 8, {size: 13, bold: true, color: col}); };
    const O = [0, 0, 0];
    [[[3, 0, 0], 'x'], [[0, 3, 0], 'y'], [[0, 0, 3], 'z']].forEach(([q, l]) => arrow(O, q, '#c3cad6', 1.2, l));
    const A = 2.6, B = 2.2, t = th * Math.PI / 180, f = el * Math.PI / 180;
    let a = [A, 0, 0], b = [B * Math.cos(t) * Math.cos(f), B * Math.sin(t) * Math.cos(f), B * Math.sin(f)];
    const u = swap ? b : a, v = swap ? a : b, c = cross(u, v), sc = 0.45, cs = c.map(z => z * sc);
    // parallélogramme
    const q1 = P(a), q2 = P([a[0] + b[0], a[1] + b[1], a[2] + b[2]]), q3 = P(b), q0 = P(O);
    ctx.fillStyle = 'rgba(11,95,165,0.13)'; ctx.strokeStyle = 'rgba(11,95,165,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.lineTo(q3[0], q3[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
    arrow(O, a, C.blue, 3, 'a'); arrow(O, b, C.amber, 3, 'b');
    const n = Math.hypot(...c);
    if (n > 0.02) arrow(O, cs, C.red, 3.5, swap ? 'b ∧ a' : 'a ∧ b');
    // marques d'angle droit entre c et a, c et b
    if (n > 0.3){ const cu = c.map(z => z / n * 0.35); [a, b].forEach(w => { const wn = Math.hypot(...w), wu = w.map(z => z / wn * 0.35); const p1 = P(wu), p2 = P([wu[0] + cu[0], wu[1] + cu[1], wu[2] + cu[2]]), p3 = P(cu);
      ctx.strokeStyle = C.red; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.stroke(); }); }
    K.text(ctx, 'Règle de la main droite : pouce sur le 1er vecteur, index sur le 2e, majeur = produit', 14, 18, {size: 12, color: C.navy});
    K.text(ctx, '(longueur du produit réduite pour l’affichage)', 14, 36, {size: 11, color: C.ink});
    out.innerHTML = `${swap ? 'b ∧ a' : 'a ∧ b'} = (${c.map(z => K.fmt(z, 2)).join(' ; ')})<br>Norme = <b>${K.fmt(n, 2)}</b> = aire du parallélogramme<br>a · (a ∧ b) = ${K.fmt(Math.abs(a[0] * c[0] + a[1] * c[1] + a[2] * c[2]) < 1e-9 ? 0 : a[0] * c[0] + a[1] * c[1] + a[2] * c[2], 2)} : perpendiculaire à a<br>${n < 0.02 ? 'a et b colinéaires : produit nul.' : ''}`;
  }
  (function loop(now){ if (!mount.isConnected) return; const d = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (spin){ gam = (gam + 20 * d) % 360; sg.value = Math.round(gam); } draw(); requestAnimationFrame(loop); })(performance.now());
};
