/* Simulation : ascension capillaire (loi de Jurin). Tube de rayon r plongé dans un bain ; h = 2γcosθ/(ρgr).
   Liquides : eau/verre propre (θ ≈ 0), eau/verre gras, éthanol, mercure/verre (θ ≈ 140° : descente). */
window.SIMS['jurin'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81;
  const LIQ = {
    eau: {nom: 'Eau, verre propre', gam: 0.072, rho: 1000, th: 0},
    eaug: {nom: 'Eau, verre gras', gam: 0.072, rho: 1000, th: 60},
    eth: {nom: 'Éthanol', gam: 0.022, rho: 789, th: 0},
    hg: {nom: 'Mercure, verre', gam: 0.485, rho: 13600, th: 140}
  };
  let liq = 'eau', r = 0.5;          // mm
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 420);
  K.select(ctr, 'Liquide et paroi', Object.entries(LIQ).map(([k, v]) => [k, v.nom]), v => { liq = v; });
  K.slider(ctr, 'Rayon intérieur du tube r', 0.1, 2.0, 0.05, r, v => K.fmt(v, 2) + ' mm', v => { r = v; });
  const out = K.readout(ctr);
  const H = () => { const L = LIQ[liq]; return 2 * L.gam * Math.cos(L.th * Math.PI / 180) / (L.rho * g * r * 1e-3); };   // m
  function draw(){
    const L = LIQ[liq], h = H(), lc = Math.sqrt(L.gam / (L.rho * g));
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const yB = 280, sc = 2000;           // px par mètre (1 cm = 20 px)
    const col = liq === 'hg' ? 'rgba(150,160,175,0.85)' : 'rgba(90,169,255,0.45)';
    // bain
    ctx.fillStyle = col; ctx.fillRect(40, yB, 360, 110);
    ctx.strokeStyle = C.navy; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(40, 230); ctx.lineTo(40, 390); ctx.lineTo(400, 390); ctx.lineTo(400, 230); ctx.stroke();
    // tube (largeur dessinée exagérée)
    const xc = 220, w = Math.max(10, r * 22), hp = Math.max(-100, Math.min(250, h * sc));
    const top = yB - hp;
    ctx.fillStyle = '#fff'; ctx.fillRect(xc - w, 20, 2 * w, yB + 60 - 20);
    ctx.fillStyle = col; ctx.fillRect(xc - w, Math.min(top, yB + 60), 2 * w, yB + 60 - Math.min(top, yB + 60));
    if (hp < 0){ ctx.fillStyle = '#fff'; ctx.fillRect(xc - w, yB, 2 * w, -hp); }
    // ménisque
    const th = L.th * Math.PI / 180, R = w / Math.max(0.05, Math.abs(Math.cos(th)));
    ctx.fillStyle = '#fff'; ctx.beginPath();
    if (Math.cos(th) > 0){ const sag = R - Math.sqrt(Math.max(0, R * R - w * w)); ctx.moveTo(xc - w, top); ctx.quadraticCurveTo(xc, top + 2 * sag, xc + w, top); ctx.lineTo(xc + w, top - 2); ctx.lineTo(xc - w, top - 2); ctx.fill(); }
    else { const sag = R - Math.sqrt(Math.max(0, R * R - w * w)); ctx.fillStyle = col; ctx.moveTo(xc - w, top); ctx.quadraticCurveTo(xc, top - 2 * sag, xc + w, top); ctx.fill(); }
    ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xc - w, 20); ctx.lineTo(xc - w, yB + 60); ctx.moveTo(xc + w, 20); ctx.lineTo(xc + w, yB + 60); ctx.stroke();
    // cote h
    if (Math.abs(hp) > 4){ ctx.strokeStyle = C.red; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xc + w + 30, yB); ctx.lineTo(xc + w + 30, top); ctx.stroke();
      [yB, top].forEach(y => { ctx.beginPath(); ctx.moveTo(xc + w + 24, y); ctx.lineTo(xc + w + 36, y); ctx.stroke(); });
      K.text(ctx, (h > 0 ? 'h = ' : 'descente ') + K.fmt(Math.abs(h) * 100, 2) + ' cm' + (Math.abs(h * sc) > 250 ? ' (hors cadre)' : ''), xc + w + 42, (yB + top) / 2, {size: 12, bold: true, color: C.red}); }
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.moveTo(40, yB); ctx.lineTo(400, yB); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, 'niveau du bain', 50, yB - 10, {size: 11, color: C.ink});
    K.text(ctx, 'tube dessiné élargi ; échelle verticale : 1 cm = 20 px', 40, 410, {size: 10, color: C.grey});
    // graphe h(r)
    const y0 = liq === 'hg' ? -6 : 0, y1 = liq === 'hg' ? 0.5 : 15;
    const A = K.axes(ctx, 450, 380, 625, 60, {xmin: 0, xmax: 2, ymin: y0, ymax: y1, xticks: 4, yticks: 4, xfmt: x => K.fmt(x, 1), yfmt: y => K.fmt(y, 0), xlabel: 'r (mm)'});
    K.text(ctx, 'h (cm)', 455, 46, {size: 11, color: C.ink});
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2.5; ctx.beginPath(); let first = true;
    for (let i = 1; i <= 100; i++){ const rr = 2 * i / 100, hh = 2 * L.gam * Math.cos(th) / (L.rho * g * rr * 1e-3) * 100; const Y = A.sy(Math.max(y0, Math.min(y1, hh))); first ? ctx.moveTo(A.sx(rr), Y) : ctx.lineTo(A.sx(rr), Y); first = false; } ctx.stroke();
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(A.sx(r), A.sy(Math.max(y0, Math.min(y1, h * 100))), 4, 0, 7); ctx.fill();
    K.text(ctx, 'h ∝ 1/r', 560, liq === 'hg' ? 330 : 90, {size: 12, bold: true, color: C.blue});
    out.innerHTML = `γ = ${K.fmt(L.gam * 1000, 0)} mN/m, ρ = ${K.fmt(L.rho, 0)} kg/m³, angle de contact θ = ${L.th}°<br>` +
      `Loi de Jurin : h = 2γ cos θ / (ρ g r) = <b>${K.fmt(h * 100, 2)} cm</b>${h < 0 ? ' (le liquide descend : θ > 90°)' : ''}<br>` +
      `Longueur capillaire ℓ<sub>c</sub> = √(γ/ρg) = ${K.fmt(lc * 1000, 1)} mm : la loi ne vaut que pour r ≪ ℓ<sub>c</sub>.<br>` +
      `Contrôle : le poids de la colonne ρ g h π r² équilibre la force 2π r γ cos θ sur la ligne de contact.`;
  }
  (function loop(){ if (!mount.isConnected) return; draw(); requestAnimationFrame(loop); })();
};
