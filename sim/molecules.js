/* Simulation : origine microscopique de la pression d'un gaz. Des molécules (disques durs sans interaction, vitesses
   tirées selon Maxwell-Boltzmann en 2D) rebondissent dans une boîte ; à chaque choc sur la paroi de droite, la quantité
   de mouvement transférée 2 m |vx| est comptée. La force moyenne sur la paroi est le transfert par seconde ; on compare
   au résultat cinétique F = N m <vx²> / Lx (ce qui donne, en 3D, P V = N k T). */
window.SIMS['molecules'] = function(mount){
  const K = window.SimKit, C = K.C;
  const BW = 400, BH = 300, X0 = 30, Y0 = 40;       // boîte (px) ; 1 px = 1 unité de longueur arbitraire
  let N = 60, T = 1, running = true, mol = [], hits = [], flash = 0, impulse = 0, tAcc = 0, Fmean = 0;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Nombre de molécules N', 5, 300, 5, N, v => v, v => { N = v; reset(); });
  K.slider(ctr, 'Température (agitation)', 0.2, 3, 0.1, T, v => K.fmt(v, 1) + ' T₀', v => { const k = Math.sqrt(v / T); T = v; mol.forEach(m => { m.vx *= k; m.vy *= k; }); impulse = 0; tAcc = 0; hits = []; });
  const bp = K.button(ctr, 'Pause', () => { running = !running; bp.textContent = running ? 'Pause' : 'Reprendre'; if (running) loop(); }, true);
  K.button(ctr, 'Réinitialiser', reset, true);
  const out = K.readout(ctr);
  function gauss(){ let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function reset(){ mol = []; const s = 90 * Math.sqrt(T); for (let i = 0; i < N; i++) mol.push({x: X0 + 6 + Math.random() * (BW - 12), y: Y0 + 6 + Math.random() * (BH - 12), vx: s * gauss(), vy: s * gauss()}); hits = []; impulse = 0; tAcc = 0; Fmean = 0; }
  function step(dt){
    for (const m of mol){
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.x < X0 + 4){ m.x = X0 + 4; m.vx = -m.vx; }
      if (m.x > X0 + BW - 4){ m.x = X0 + BW - 4; impulse += 2 * Math.abs(m.vx); m.vx = -m.vx; flash = 1; hits.push(m.y); if (hits.length > 40) hits.shift(); }
      if (m.y < Y0 + 4){ m.y = Y0 + 4; m.vy = -m.vy; }
      if (m.y > Y0 + BH - 4){ m.y = Y0 + BH - 4; m.vy = -m.vy; }
    }
    tAcc += dt; if (tAcc > 0.5){ Fmean = 0.8 * Fmean + 0.2 * impulse / tAcc; impulse = 0; tAcc = 0; }
  }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    ctx.fillStyle = '#f3f6fa'; ctx.fillRect(X0, Y0, BW, BH); ctx.strokeStyle = '#5f6b80'; ctx.lineWidth = 2; ctx.strokeRect(X0, Y0, BW, BH);
    ctx.fillStyle = flash > 0 ? `rgba(178,58,72,${0.25 + 0.5 * flash})` : '#5f6b80'; ctx.fillRect(X0 + BW - 1, Y0, 6, BH); flash = Math.max(0, flash - 0.15);
    ctx.fillStyle = C.blue; for (const m of mol){ ctx.beginPath(); ctx.arc(m.x, m.y, 3.5, 0, 7); ctx.fill(); }
    // impacts récents sur la paroi
    ctx.fillStyle = C.red; for (const y of hits){ ctx.beginPath(); ctx.arc(X0 + BW + 2, y, 2, 0, 7); ctx.fill(); }
    // force moyenne : flèche proportionnelle
    const vx2 = mol.reduce((a, m) => a + m.vx * m.vx, 0) / Math.max(1, mol.length), Fth = N * vx2 / BW;
    const L = Math.min(160, Fmean * 0.09);
    ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X0 + BW + 8, Y0 + BH / 2); ctx.lineTo(X0 + BW + 8 + L, Y0 + BH / 2); ctx.stroke();
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(X0 + BW + 16 + L, Y0 + BH / 2); ctx.lineTo(X0 + BW + 4 + L, Y0 + BH / 2 - 7); ctx.lineTo(X0 + BW + 4 + L, Y0 + BH / 2 + 7); ctx.fill();
    K.text(ctx, 'force moyenne', X0 + BW + 12, Y0 + BH / 2 - 34, {size: 11, bold: true, color: C.red});
    K.text(ctx, 'sur la paroi', X0 + BW + 12, Y0 + BH / 2 - 20, {size: 11, bold: true, color: C.red});
    K.text(ctx, 'Chaque choc transfère 2m|vx| à la paroi ; la force est le transfert de quantité de mouvement par seconde.', X0, Y0 + BH + 22, {size: 11, color: C.ink});
    K.text(ctx, 'N = ' + N + ' molécules, T = ' + K.fmt(T, 1) + ' T₀', X0, 22, {size: 12, bold: true, color: C.ink});
    out.innerHTML = `Force moyenne mesurée : <b>${K.fmt(Fmean, 0)}</b> (unités arbitraires)<br>Théorie cinétique N m⟨vx²⟩/Lx : ${K.fmt(Fth, 0)}<br>Pression ∝ N × T : doublez N ou T, la force double.<br>Chocs comptés sur ${K.fmt(0.5, 1)} s glissantes.`;
  }
  let last = null;
  function loop(ts){ if (!running) return; if (!mount.isConnected) return; const now = performance.now(); const dt = Math.min(0.03, last ? (now - last) / 1000 : 0.016); last = now; step(dt); draw(); requestAnimationFrame(loop); }
  reset(); loop();
};
