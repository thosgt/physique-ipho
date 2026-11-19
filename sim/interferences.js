/* Simulation : interférences de deux sources ponctuelles cohérentes S1, S2 (même fréquence), dans un plan.
   Carte du champ instantané s = A cos(ωt − k r1) + A cos(ωt − k r2 + φ) ou de l'intensité moyenne ; profil sur un écran. */
window.SIMS['interferences'] = function(mount){
  const K = window.SimKit, C = K.C;
  let lam = 2.0, a = 6.0, phi = 0, mode = 'inst', t = 0, running = true;   // cm, cm, rad
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  K.slider(ctr, 'Longueur d’onde λ', 0.8, 5, 0.1, lam, x => K.fmt(x, 1) + ' cm', x => { lam = x; });
  K.slider(ctr, 'Distance entre les sources a', 1, 16, 0.5, a, x => K.fmt(x, 1) + ' cm', x => { a = x; });
  K.slider(ctr, 'Déphasage des sources φ', 0, 360, 15, 0, x => x + '°', x => { phi = x * Math.PI / 180; });
  K.select(ctr, 'Affichage', [['inst', 'champ instantané (animé)'], ['moy', 'intensité moyenne (franges)']], v => { mode = v; });
  const bp = K.button(ctr, 'Pause', () => { running = !running; bp.textContent = running ? 'Pause' : 'Reprendre'; }, true);
  const out = K.readout(ctr);
  const W = 400, H = 360, cell = 2, nx = W / cell, ny = H / cell, img = ctx.createImageData(nx, ny), tmp = document.createElement('canvas'); tmp.width = nx; tmp.height = ny; const tctx = tmp.getContext('2d');
  const sc = 10;   // px par cm
  let last = performance.now();
  function draw(now){
    if (!mount.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; if (running) t += dt;
    const k = 2 * Math.PI / lam, w = 2 * Math.PI * 0.8;
    const s1 = [60, H / 2 - a * sc / 2], s2 = [60, H / 2 + a * sc / 2];
    const d = img.data; let p = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
      const x = i * cell + 1, y = j * cell + 1, r1 = Math.hypot(x - s1[0], y - s1[1]) / sc, r2 = Math.hypot(x - s2[0], y - s2[1]) / sc;
      let v;
      if (mode === 'inst'){ v = (Math.cos(w * t - k * r1) + Math.cos(w * t - k * r2 + phi)) / 2; }   // −1..1
      else { v = Math.abs(Math.cos((k * (r2 - r1) - phi) / 2)); v = v * v * 2 - 1; }                    // intensité normalisée −1..1
      const u = (v + 1) / 2; d[p++] = 255 - 190 * (1 - u) * (mode === 'inst' ? 1 : 0.9); d[p++] = 255 - 150 * (1 - u); d[p++] = 255 - 60 * (1 - u) + (mode === 'inst' ? 0 : 0); d[p++] = 255;
    }
    tctx.putImageData(img, 0, 0);
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(tmp, 0, 0, W, H); ctx.strokeStyle = C.ink; ctx.strokeRect(0.5, 0.5, W, H);
    [s1, s2].forEach(([x, y], i) => { ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); K.text(ctx, 'S' + (i + 1), x - 22, y, {size: 12, bold: true, color: C.red}); });
    // écran à x = 380 px : profil d'intensité moyenne
    const xe = 380; ctx.strokeStyle = C.ink; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(xe, 0); ctx.lineTo(xe, H); ctx.stroke(); ctx.setLineDash([]);
    const A = K.axes(ctx, 440, 360, 630, 20, {xmin: 0, xmax: 4.2, ymin: -18, ymax: 18, xticks: 2, yticks: 6, xfmt: v => K.fmt(v, 0), yfmt: v => K.fmt(v, 0), xlabel: 'I / I₀'});
    K.text(ctx, 'intensité sur l’écran', 535, 10, {size: 11, bold: true, align: 'center', color: C.ink});
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath();
    for (let j = 0; j <= 180; j++){ const y = j * 2, r1 = Math.hypot(xe - s1[0], y - s1[1]) / sc, r2 = Math.hypot(xe - s2[0], y - s2[1]) / sc; const I = 4 * Math.cos((k * (r2 - r1) - phi) / 2) ** 2; const X = A.sx(I), Yp = A.sy((H / 2 - y) / sc); j ? ctx.lineTo(X, Yp) : ctx.moveTo(X, Yp); }
    ctx.stroke();
    const D = (xe - 60) / sc, i = lam * D / a;
    out.innerHTML = `k = 2π/λ ; en M : δ = S₂M − S₁M<br>I = 4I₀ cos²(πδ/λ − φ/2)<br>Franges brillantes : δ = pλ (φ = 0)<br>Écran à D = ${K.fmt(D, 0)} cm : interfrange λD/a ≈ <b>${K.fmt(i, 1)} cm</b> (si D ≫ a)<br>Les lignes sombres sont des hyperboles de foyers S₁, S₂.`;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
};
