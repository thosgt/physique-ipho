/* Simulation : effet Doppler. Source se déplaçant à v_s vers la droite, émettant des fronts circulaires à la fréquence f ;
   deux observateurs fixes (gauche, droite). f' = f v/(v ∓ v_s). Si v_s > v : cône de Mach, sin α = v/v_s. */
window.SIMS['doppler'] = function(mount){
  const K = window.SimKit, C = K.C;
  let vs = 100, v = 340, f = 4, running = true, t = 0, fronts = [], xs = 60, nextEmit = 0;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.slider(ctr, 'Vitesse de la source v_s', 0, 500, 10, vs, x => x + ' m/s' + (x > 340 ? ' (Mach ' + K.fmt(x / 340, 2) + ')' : ''), x => { vs = x; });
  K.slider(ctr, 'Fréquence émise f', 200, 1000, 10, 440, x => x + ' Hz', x => { f = x / 110; });
  f = 4;
  const bp = K.button(ctr, 'Pause', () => { running = !running; bp.textContent = running ? 'Pause' : 'Reprendre'; }, true);
  K.button(ctr, 'Recommencer', () => { fronts = []; xs = 60; t = 0; nextEmit = 0; }, true);
  const out = K.readout(ctr);
  const sc = 0.5, W = 640, H = 300;   // px par m (échelle : 1 px = 2 m)
  let last = performance.now();
  function draw(now){
    if (!mount.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000) * 0.5; last = now;   // temps ralenti ×2
    if (running){ t += dt; xs += vs * dt * sc; if (xs > W + 40){ xs = -40; fronts = []; }
      while (t >= nextEmit){ fronts.push({x: xs, y: H / 2, t0: nextEmit}); nextEmit += 1 / f; }
      fronts = fronts.filter(fr => (t - fr.t0) * v * sc < 900); }
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    ctx.strokeStyle = C.blue; ctx.lineWidth = 1.2;
    for (const fr of fronts){ const r = (t - fr.t0) * v * sc; ctx.beginPath(); ctx.arc(fr.x, fr.y, r, 0, 7); ctx.stroke(); }
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(xs, H / 2, 6, 0, 7); ctx.fill();
    if (vs > v){ const a = Math.asin(v / vs); ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(xs, H / 2); ctx.lineTo(xs - 700 * Math.cos(a), H / 2 - 700 * Math.sin(a)); ctx.moveTo(xs, H / 2); ctx.lineTo(xs - 700 * Math.cos(a), H / 2 + 700 * Math.sin(a)); ctx.stroke(); ctx.setLineDash([]);
      K.text(ctx, 'cône de Mach : sin α = v/v_s, α = ' + K.fmt(a * 180 / Math.PI, 1) + '°', 20, H + 40, {size: 12, bold: true, color: C.red}); }
    // observateurs
    [[30, 'O₁'], [610, 'O₂']].forEach(([x, lab]) => { ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(x, H / 2, 5, 0, 7); ctx.fill(); K.text(ctx, lab, x, H / 2 + 18, {size: 11, bold: true, color: C.green, align: 'center'}); });
    K.text(ctx, 'source → v_s = ' + vs + ' m/s ; v = 340 m/s', 20, 20, {size: 12, bold: true, color: C.ink});
    const f0 = f * 110, fL = vs < v ? f0 * v / (v + vs) : NaN, fR = vs < v ? f0 * v / (v - vs) : NaN;
    out.innerHTML = `f émise = ${K.fmt(f0, 0)} Hz<br>O₂ (devant, source qui s’approche) : f' = f v/(v − v_s) = <b>${isFinite(fR) ? K.fmt(fR, 0) + ' Hz' : '— (supersonique)'}</b><br>O₁ (derrière, source qui s’éloigne) : f' = f v/(v + v_s) = <b>${isFinite(fL) ? K.fmt(fL, 0) + ' Hz' : '—'}</b><br>λ devant : ${K.fmt((v - vs) / f0, 3)} m ; derrière : ${K.fmt((v + vs) / f0, 3)} m<br>Approximation v_s ≪ v : Δf/f ≈ v_s/v = ${K.fmt(vs / v * 100, 0)} %`;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
};
