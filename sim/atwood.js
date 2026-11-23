/* Simulation : machine d'Atwood, poulie idéale ou massive (disque plein de masse M, J = M R²/2), fil sans masse qui ne glisse pas.
   Newton pour chaque masse et théorème du moment cinétique pour la poulie : a = (m2 - m1) g / (m1 + m2 + J/R²),
   T1 = m1 (g + a), T2 = m2 (g - a) ; T2 - T1 = (J/R²) a : la tension n'est la même des deux côtés que si J = 0. */
window.SIMS['atwood'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81;
  let m1 = 1, m2 = 1.5, M = 0, y = 0, v = 0, run = false, phi = 0, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Masse m₁ (gauche)', 0.1, 5, 0.1, m1, x => K.fmt(x, 1) + ' kg', x => { m1 = x; reset(); });
  K.slider(ctr, 'Masse m₂ (droite)', 0.1, 5, 0.1, m2, x => K.fmt(x, 1) + ' kg', x => { m2 = x; reset(); });
  K.slider(ctr, 'Masse de la poulie M (disque plein)', 0, 8, 0.1, M, x => x === 0 ? '0 (poulie idéale)' : K.fmt(x, 1) + ' kg', x => { M = x; reset(); });
  K.button(ctr, '▶ Lâcher', () => { reset(); run = true; });
  K.button(ctr, 'Remettre en place', reset, true);
  const out = K.readout(ctr);
  function reset(){ run = false; y = 0; v = 0; phi = 0; }
  const acc = () => (m2 - m1) * g / (m1 + m2 + M / 2);
  const sz = m => 22 + 16 * Math.cbrt(m), S = 110, Y0 = 230, TOP = 70 + 44 + 8, FLOOR = 362;
  // course maximale : la masse qui monte ne touche pas la poulie, celle qui descend ne touche pas le sol
  const lim = d => d > 0 ? Math.min((Y0 - TOP - sz(m1) / 2) / S, (FLOOR - Y0 - sz(m2) / 2) / S) : Math.min((Y0 - TOP - sz(m2) / 2) / S, (FLOOR - Y0 - sz(m1) / 2) / S);
  function step(dt){ const a = acc(); v += a * dt; y += v * dt; phi += v * dt / 0.1; if (y !== 0 && Math.abs(y) > lim(Math.sign(y))){ y = Math.sign(y) * lim(Math.sign(y)); v = 0; run = false; } }
  function arrow(x0, y0, x1, y1, col, lab, right){ if (Math.abs(y1 - y0) < 3) return; const s = Math.sign(y1 - y0); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 5, y1 - 9 * s); ctx.lineTo(x1 + 5, y1 - 9 * s); ctx.closePath(); ctx.fill(); K.text(ctx, lab, x1 + (right ? 8 : -8), (y0 + y1) / 2, {size: 12, bold: true, color: col, align: right ? 'left' : 'right'}); }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const cx = 230, cy = 70, R = 44;     // 1 m = S = 110 px
    ctx.fillStyle = C.navy; ctx.fillRect(cx - 70, 12, 140, 8); ctx.fillRect(cx - 3, 18, 6, cy - 18);
    // poulie
    const rp = 0.25 + Math.min(1, M / 8) * 0.75;
    ctx.fillStyle = `rgba(11,95,165,${0.15 + 0.5 * rp})`; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++){ const a = phi + k * 2 * Math.PI / 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * 0.85 * Math.cos(a), cy + R * 0.85 * Math.sin(a)); ctx.stroke(); }
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
    // masses : la gauche monte de y quand la droite descend de y
    const yl = Y0 - y * S, yr = Y0 + y * S;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx - R, yl - sz(m1) / 2); ctx.moveTo(cx + R, cy); ctx.lineTo(cx + R, yr - sz(m2) / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 2 * Math.PI); ctx.stroke();
    const box = (x, yc, m, col, lab) => { const s = sz(m); ctx.fillStyle = col; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.fillRect(x - s / 2, yc - s / 2, s, s); ctx.strokeRect(x - s / 2, yc - s / 2, s, s); K.text(ctx, lab, x, yc, {size: 12, bold: true, color: '#fff', align: 'center'}); };
    box(cx - R, yl, m1, C.blue, 'm₁'); box(cx + R, yr, m2, C.amber, 'm₂');
    ctx.strokeStyle = C.grey; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 120, 370); ctx.lineTo(cx + 120, 370); ctx.stroke();
    // forces (10 N = 26 px)
    const a = acc(), T1 = m1 * (g + a), T2 = m2 * (g - a), f = 2.6;
    arrow(cx - R - 30, yl, cx - R - 30, yl - T1 * f, C.green, 'T₁'); arrow(cx - R - 30, yl, cx - R - 30, yl + m1 * g * f, C.blue, 'm₁g');
    arrow(cx + R + 30, yr, cx + R + 30, yr - T2 * f, C.green, 'T₂', true); arrow(cx + R + 30, yr, cx + R + 30, yr + m2 * g * f, C.blue, 'm₂g', true);
    // tableau de valeurs
    const x0 = 420;
    K.text(ctx, 'Accélération', x0, 40, {size: 12, bold: true});
    K.text(ctx, `a = ${K.fmt(Math.abs(a), 2)} m/s²`, x0, 62, {size: 13, color: C.red});
    K.text(ctx, M > 0 ? `(poulie idéale : ${K.fmt(Math.abs((m2 - m1) * g / (m1 + m2)), 2)} m/s²)` : '(poulie idéale)', x0, 82, {size: 11, color: C.ink});
    K.text(ctx, 'Tensions', x0, 118, {size: 12, bold: true});
    K.text(ctx, `T₁ = ${K.fmt(T1, 2)} N`, x0, 140, {size: 13, color: C.green}); K.text(ctx, `T₂ = ${K.fmt(T2, 2)} N`, x0, 160, {size: 13, color: C.green});
    K.text(ctx, `T₂ − T₁ = ${K.fmt(T2 - T1, 2)} N`, x0, 182, {size: 12, color: C.ink});
    K.text(ctx, 'Poids', x0, 218, {size: 12, bold: true});
    K.text(ctx, `m₁g = ${K.fmt(m1 * g, 2)} N, m₂g = ${K.fmt(m2 * g, 2)} N`, x0, 240, {size: 12, color: C.blue});
    K.text(ctx, `vitesse : ${K.fmt(Math.abs(v), 2)} m/s`, x0, 276, {size: 12, color: C.ink});
    out.innerHTML = `Système entier (fil inextensible) : (m₁ + m₂ + J/R²) a = (m₂ − m₁) g, avec J/R² = M/2 = ${K.fmt(M / 2, 2)} kg. La poulie massive se comporte comme une masse supplémentaire à accélérer.<br>` +
      `Chaque masse : T₁ = m₁(g + a), T₂ = m₂(g − a). ${M > 0 ? 'Les tensions diffèrent : c’est leur différence qui fait tourner la poulie, (T₂ − T₁) R = J dω/dt.' : 'Poulie sans masse : T₁ = T₂, la tension est la même tout le long du fil.'}<br>` +
      `Aucune tension n’est égale au poids de la masse qu’elle soutient, sauf à l’équilibre (m₁ = m₂).`;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) step(dt * 0.6); draw(); requestAnimationFrame(loop); })(performance.now());
};
