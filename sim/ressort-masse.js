/* Simulation : oscillateur harmonique masse-ressort, horizontal ou vertical.
   x(t) = A cos(omega0 t), omega0 = sqrt(k/m), T = 2 pi sqrt(m/k), indépendante de A ; v_max = A omega0, a_max = A omega0² ; a = -omega0² x.
   Vertical : la pesanteur déplace l'équilibre de mg/k sans changer la période. */
window.SIMS['ressort-masse'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81, L0 = 0.3;
  let k = 40, m = 0.5, A = 0.1, ori = 'h', run = false, t = 0, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  K.slider(ctr, 'Raideur k', 10, 100, 1, k, v => v + ' N/m', v => { k = v; t = 0; });
  K.slider(ctr, 'Masse m', 0.1, 2, 0.05, m, v => K.fmt(v, 2) + ' kg', v => { m = v; t = 0; });
  K.slider(ctr, 'Amplitude A', 0.02, 0.2, 0.01, A, v => K.fmt(v * 100, 0) + ' cm', v => { A = v; t = 0; });
  K.select(ctr, 'Ressort', [['h', 'horizontal'], ['v', 'vertical (avec la pesanteur)']], v => { ori = v; t = 0; });
  K.button(ctr, '▶ Lâcher', () => { t = 0; run = true; });
  K.button(ctr, 'Pause / reprise', () => { run = !run; }, true);
  const out = K.readout(ctr);
  const w = () => Math.sqrt(k / m);
  function spring(x0, y0, x1, y1, n){ const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y0); for (let i = 1; i < n; i++){ const q = i / n, o = i % 2 ? 9 : -9; ctx.lineTo(x0 + dx * q - uy * o, y0 + dy * q + ux * o); } ctx.lineTo(x1, y1); ctx.stroke(); }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const W = w(), x = run || t > 0 ? A * Math.cos(W * t) : A, v = -A * W * Math.sin(W * t), a = -W * W * x;
    const dl = ori === 'v' ? m * g / k : 0;
    if (ori === 'h'){
      const S = 500, xw = 30, yb = 120, xe = xw + (L0 + 0.12) * S, px = xe + x * S;
      ctx.fillStyle = C.navy; ctx.fillRect(xw - 8, yb - 60, 8, 64); ctx.strokeStyle = C.grey; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xw, yb + 2); ctx.lineTo(330, yb + 2); ctx.stroke();
      spring(xw, yb - 20, px - 22, yb - 20, 16);
      ctx.fillStyle = C.blue; ctx.fillRect(px - 22, yb - 40, 44, 40);
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C.green; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xe, yb - 70); ctx.lineTo(xe, yb + 10); ctx.stroke(); ctx.setLineDash([]);
      K.text(ctx, 'équilibre', xe, yb - 78, {size: 10, color: C.green, align: 'center'});
    } else {
      const top = 14, tot = L0 + dl + 0.25, S = Math.min(500, 210 / tot), xs = 150, ye = top + (L0 + dl) * S, py = ye + x * S;
      ctx.fillStyle = C.navy; ctx.fillRect(xs - 40, top - 8, 80, 8);
      spring(xs, top, xs, py - 20, 18);
      ctx.fillStyle = C.blue; ctx.fillRect(xs - 22, py - 20, 44, 40);
      ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.moveTo(xs - 60, top + L0 * S); ctx.lineTo(xs + 80, top + L0 * S); ctx.stroke();
      ctx.strokeStyle = C.green; ctx.beginPath(); ctx.moveTo(xs - 60, ye); ctx.lineTo(xs + 80, ye); ctx.stroke(); ctx.setLineDash([]);
      K.text(ctx, 'longueur à vide', xs + 84, top + L0 * S, {size: 10, color: C.grey}); K.text(ctx, 'équilibre (Δℓ = mg/k)', xs + 84, ye, {size: 10, color: C.green});
    }
    // graphes x, v, a (normalisés à leur maximum)
    const T = 2 * Math.PI / W, tw = Math.max(3 * T, 2), t0 = Math.max(0, t - tw);
    const rows = [['x', A, C.blue, s => A * Math.cos(W * s), 'cm', 100], ['v', A * W, C.amber, s => -A * W * Math.sin(W * s), 'm/s', 1], ['a', A * W * W, C.red, s => -A * W * W * Math.cos(W * s), 'm/s²', 1]];
    rows.forEach(([lab, mx, col, f, u, mul], i) => {
      const gx0 = 360, gx1 = 628, gy = 40 + i * 70, hgt = 26;
      ctx.strokeStyle = '#e3e8ef'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let j = 0; j <= 200; j++){ const s = t0 + (t - t0) * j / 200, X = gx0 + (s - t0) / tw * (gx1 - gx0), Y = gy - f(s) / mx * hgt; j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      if (t > 0) ctx.stroke();
      K.text(ctx, lab, gx0 - 14, gy, {size: 13, bold: true, color: col});
      K.text(ctx, `max ${K.fmt(mx * mul, mul === 100 ? 0 : 2)} ${u}`, gx1, gy - hgt - 4, {size: 10, color: C.ink, align: 'right'});
    });
    // énergie
    const Ec = 0.5 * m * v * v, Ep = 0.5 * k * x * x, E = 0.5 * k * A * A, bx = 360, by = 260, bw = 260;
    ctx.fillStyle = C.amber; ctx.fillRect(bx, by, bw * Ec / E, 20); ctx.fillStyle = C.green; ctx.fillRect(bx + bw * Ec / E, by, bw * Ep / E, 20); ctx.strokeStyle = C.navy; ctx.strokeRect(bx, by, bw, 20);
    K.text(ctx, 'Ec', bx, by + 34, {size: 11, color: C.amber}); K.text(ctx, 'Ep = ½ k x²' + (ori === 'v' ? ' (ressort + pesanteur, depuis l’équilibre)' : ''), bx + 24, by + 34, {size: 11, color: C.green});
    K.text(ctx, `énergie totale ½ k A² = ${K.fmt(E * 1000, 1)} mJ`, bx, by - 10, {size: 11, color: C.ink});
    K.text(ctx, `T = 2π√(m/k) = ${K.fmt(T, 3)} s`, 360, 340, {size: 14, bold: true, color: C.navy});
    K.text(ctx, `t = ${K.fmt(t, 2)} s`, 360, 365, {size: 11, color: C.ink});
    out.innerHTML = `ω₀ = √(k/m) = ${K.fmt(W, 2)} rad/s, f = ${K.fmt(W / (2 * Math.PI), 2)} Hz, <b>T = ${K.fmt(T, 3)} s</b> : changez A, la période ne bouge pas.<br>` +
      `v<sub>max</sub> = A ω₀ = ${K.fmt(A * W, 2)} m/s (au passage à l’équilibre), a<sub>max</sub> = A ω₀² = ${K.fmt(A * W * W, 2)} m/s² (aux extrémités) : a = −ω₀² x, en opposition de phase avec x.<br>` +
      (ori === 'v' ? `Vertical : l’équilibre descend de Δℓ = mg/k = ${K.fmt(dl * 100, 1)} cm, mais la période est la même ; on retrouve T = 2π√(Δℓ/g).` : 'L’énergie passe de la forme potentielle (extrémités) à la forme cinétique (équilibre), deux fois par période.');
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) t += dt; draw(); requestAnimationFrame(loop); })(performance.now());
};
