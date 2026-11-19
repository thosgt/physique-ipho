/* Simulation : interférences particule par particule. Chaque impact est tiré au hasard selon la densité de probabilité
   I(x) ∝ cos²(π a x/(λD)) sinc²(π b x/(λD)) (deux fentes), ou sinc² seul (une fente), ou somme des deux sinc² (fente « observée »). */
window.SIMS['unparun'] = function(mount){
  const K = window.SimKit, C = K.C;
  let mode = 'deux', rate = 20, hits = [], running = true;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.select(ctr, 'Dispositif', [['deux', 'deux fentes ouvertes'], ['une', 'une seule fente ouverte'], ['obs', 'deux fentes, on détecte par quelle fente passe chaque particule']], v => { mode = v; hits = []; });
  K.slider(ctr, 'Particules par seconde', 1, 500, 1, rate, x => x, x => { rate = x; });
  const bp = K.button(ctr, 'Pause', () => { running = !running; bp.textContent = running ? 'Pause' : 'Reprendre'; }, true);
  K.button(ctr, 'Effacer l’écran', () => { hits = []; }, true);
  const out = K.readout(ctr);
  const a = 4, b = 1;   // unités : interfrange = 1 (λD/a = 1) → x en interfranges
  const sinc2 = u => u === 0 ? 1 : (Math.sin(u) / u) ** 2;
  function P(x){ const env = sinc2(Math.PI * b / a * x); if (mode === 'deux') return Math.cos(Math.PI * x) ** 2 * env; return env; }
  function sample(){ for (;;){ const x = (Math.random() - 0.5) * 16, y = Math.random(); if (y < P(x)) return x; } }
  let last = performance.now(), acc = 0;
  function draw(now){
    if (!mount.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (running && hits.length < 40000){ acc += rate * dt; while (acc >= 1){ hits.push([sample(), Math.random()]); acc -= 1; } }
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    // écran
    const X = x => 320 + x * 37, y0 = 30, h = 170;
    ctx.fillStyle = '#0e1322'; ctx.fillRect(24, y0, 592, h);
    ctx.fillStyle = 'rgba(255,214,90,0.9)'; const r = hits.length > 5000 ? 0.8 : 1.4;
    hits.forEach(([x, u]) => { const px = X(x); if (px < 24 || px > 616) return; ctx.fillRect(px, y0 + u * h, r, r); });
    K.text(ctx, 'écran : ' + hits.length + ' impacts', 24, 22, {size: 12, bold: true, color: C.ink});
    // histogramme
    const nb = 160, bins = new Array(nb).fill(0); hits.forEach(([x]) => { const k = Math.floor((x + 8) / 16 * nb); if (k >= 0 && k < nb) bins[k]++; });
    const mx = Math.max(1, ...bins), yb = 350, hb = 120;
    ctx.fillStyle = C.blue; bins.forEach((c, k) => { const x = -8 + (k + 0.5) * 16 / nb; ctx.fillRect(X(x) - 1.6, yb - c / mx * hb, 3.2, c / mx * hb); });
    // densité théorique (normalisée au max de l'histogramme)
    let pm = 0; for (let i = 0; i <= 400; i++) pm = Math.max(pm, P(-8 + 16 * i / 400));
    if (hits.length > 50){ let integ = 0; for (let j = 0; j < 800; j++) integ += P(-8 + 16 * (j + 0.5) / 800) * 16 / 800; const bw = 16 / nb;
      ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 400; i++){ const x = -8 + 16 * i / 400; const Y = yb - hits.length * P(x) / integ * bw / mx * hb; i ? ctx.lineTo(X(x), Y) : ctx.moveTo(X(x), Y); } ctx.stroke(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(24, yb); ctx.lineTo(616, yb); ctx.stroke();
    K.text(ctx, 'histogramme des impacts ; en rouge : probabilité prévue', 24, yb + 18, {size: 11, color: C.ink});
    const msg = mode === 'deux' ? 'Chaque particule arrive en un point imprévisible, mais les impacts dessinent les franges : la figure d’interférences est une figure de probabilité.' : mode === 'une' ? 'Une seule fente : pas de franges, seulement la tache de diffraction.' : 'Si l’on sait par quelle fente passe chaque particule, les franges disparaissent : on obtient la somme de deux figures de diffraction.';
    out.innerHTML = msg + `<br>Impacts : ${hits.length}${hits.length < 100 ? ' (on ne voit encore rien de régulier)' : hits.length < 2000 ? ' (la structure apparaît)' : ' (figure nette)'}`;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
};
