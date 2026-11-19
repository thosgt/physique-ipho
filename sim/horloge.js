/* Simulation : horloge de lumière. À gauche l'horloge au repos, à droite la même horloge se déplaçant à βc :
   trajet en zigzag, tic plus long d'un facteur γ. Deux compteurs de tics comparés. */
window.SIMS['horloge'] = function(mount){
  const K = window.SimKit, C = K.C;
  let beta = 0.6, t = 0, running = true;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 330);
  K.slider(ctr, 'Vitesse de l’horloge β = v/c', 0, 0.99, 0.01, beta, x => K.fmt(x, 2) + ' c', x => { beta = x; t = 0; });
  const bp = K.button(ctr, 'Pause', () => { running = !running; bp.textContent = running ? 'Pause' : 'Reprendre'; }, true);
  K.button(ctr, 'Remettre à zéro', () => { t = 0; }, true);
  const out = K.readout(ctr);
  let last = performance.now();
  function draw(now){
    if (!mount.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; if (running) t += dt;
    const g = 1 / Math.sqrt(1 - beta * beta), T0 = 2.0;        // un tic au repos = 2 s d'animation
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const L = 150, yTop = 80, yBot = yTop + L;
    // horloge au repos : phase dans le tic
    const ph0 = (t / T0) % 1, yl0 = ph0 < 0.5 ? yTop + 2 * ph0 * L : yBot - 2 * (ph0 - 0.5) * L;
    ctx.fillStyle = '#5f6b80'; ctx.fillRect(60, yTop - 6, 80, 6); ctx.fillRect(60, yBot, 80, 6);
    ctx.fillStyle = '#d9900b'; ctx.beginPath(); ctx.arc(100, yl0, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d9900b'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(100, yTop); ctx.lineTo(100, yBot); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, 'au repos', 100, 50, {size: 12, bold: true, align: 'center', color: C.ink});
    K.text(ctx, 'tics : ' + Math.floor(t / T0), 100, yBot + 30, {size: 13, bold: true, align: 'center', color: C.ink});
    K.text(ctx, 'Δt₀ = 2L/c', 100, yBot + 48, {size: 11, align: 'center', color: C.ink});
    // horloge mobile : période γT0 ; position horizontale (défile, on recentre à chaque tic)
    const T1 = g * T0, ph1 = (t / T1) % 1, x0 = 230, span = Math.min(330, beta * 330 / 0.99 * 1.0);
    const xm = x0 + ph1 * span, yl1 = ph1 < 0.5 ? yTop + 2 * ph1 * L : yBot - 2 * (ph1 - 0.5) * L;
    ctx.fillStyle = 'rgba(95,107,128,0.3)'; ctx.fillRect(x0 - 40, yTop - 6, 80, 6); ctx.fillRect(x0 - 40, yBot, 80, 6);
    ctx.fillStyle = '#5f6b80'; ctx.fillRect(xm - 40, yTop - 6, 80, 6); ctx.fillRect(xm - 40, yBot, 80, 6);
    // trajet de la lumière depuis le début du tic
    ctx.strokeStyle = '#d9900b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yTop); ctx.lineTo(x0 + span / 2, yBot); ctx.lineTo(x0 + span, yTop); ctx.stroke();
    ctx.fillStyle = '#d9900b'; ctx.beginPath(); ctx.arc(xm, yl1, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = C.red; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, yBot + 20); ctx.lineTo(x0 + span, yBot + 20); ctx.stroke();
    K.text(ctx, 'v Δt', x0 + span / 2, yBot + 36, {size: 11, color: C.red, align: 'center'});
    K.text(ctx, 'en mouvement à β = ' + K.fmt(beta, 2), x0 + span / 2, 50, {size: 12, bold: true, align: 'center', color: C.ink});
    K.text(ctx, 'tics : ' + Math.floor(t / T1), 560, yBot + 30, {size: 13, bold: true, align: 'center', color: C.red});
    K.text(ctx, 'Δt = γ Δt₀', 560, yBot + 48, {size: 11, align: 'center', color: C.red});
    K.text(ctx, 'la lumière va à c dans les deux cas : le zigzag est plus long, donc le tic dure plus longtemps', 20, 320, {size: 11, color: C.ink});
    out.innerHTML = `β = ${K.fmt(beta, 2)} → γ = 1/√(1−β²) = <b>${K.fmt(g, 3)}</b><br>Durée d’un tic de l’horloge mobile : γ × Δt₀<br>Horloge au repos : ${K.fmt(t / T0, 2)} tics<br>Horloge mobile : ${K.fmt(t / T1, 2)} tics<br>γ − 1 = ${g - 1 < 0.01 ? (g - 1).toExponential(2) : K.fmt(g - 1, 3)} (≈ β²/2 = ${K.fmt(beta * beta / 2, 3)} si β ≪ 1)`;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
};
