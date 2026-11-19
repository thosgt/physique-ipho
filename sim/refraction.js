/* Simulation : réfraction et réflexion à un dioptre plan. n1 sin i1 = n2 sin i2 ; réflexion totale si n1 sin i1 > n2. */
window.SIMS['refraction'] = function(mount){
  const K = window.SimKit, C = K.C;
  let i1 = 35, n1 = 1.00, n2 = 1.50;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Angle d’incidence i₁', 0, 89, 1, i1, x => x + '°', x => { i1 = x; draw(); });
  K.select(ctr, 'Milieu 1 (en haut)', [['1.00', 'Air (n = 1,00)'], ['1.33', 'Eau (1,33)'], ['1.50', 'Verre (1,50)'], ['2.42', 'Diamant (2,42)']], x => { n1 = +x; draw(); });
  const s2 = K.select(ctr, 'Milieu 2 (en bas)', [['1.50', 'Verre (1,50)'], ['1.00', 'Air (1,00)'], ['1.33', 'Eau (1,33)'], ['2.42', 'Diamant (2,42)']], x => { n2 = +x; draw(); });
  const out = K.readout(ctr);
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const cx = 320, cy = 190, R = 170;
    ctx.fillStyle = `rgba(90,169,255,${0.08 + 0.18 * (n1 - 1)})`; ctx.fillRect(0, 0, 640, cy); ctx.fillStyle = `rgba(90,169,255,${0.08 + 0.18 * (n2 - 1)})`; ctx.fillRect(0, cy, 640, 380 - cy);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, cy); ctx.lineTo(620, cy); ctx.stroke();
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, 20); ctx.lineTo(cx, 360); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, 'normale', cx + 6, 28, {size: 11, color: C.ink});
    K.text(ctx, 'n₁ = ' + K.fmt(n1, 2), 30, 30, {size: 13, bold: true, color: C.ink}); K.text(ctx, 'n₂ = ' + K.fmt(n2, 2), 30, cy + 30, {size: 13, bold: true, color: C.ink});
    const a1 = i1 * Math.PI / 180, s = n1 * Math.sin(a1) / n2, total = s > 1, a2 = total ? null : Math.asin(s);
    const ray = (ang, up, col, w, lab) => { const dx = Math.sin(ang) * R, dy = Math.cos(ang) * R * (up ? -1 : 1); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx, cy + dy); ctx.stroke();
      const mx = cx + dx * 0.6, my = cy + dy * 0.6, ang2 = Math.atan2(dy, dx); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(mx + 8 * Math.cos(ang2), my + 8 * Math.sin(ang2)); ctx.lineTo(mx - 6 * Math.cos(ang2 - 0.5), my - 6 * Math.sin(ang2 - 0.5)); ctx.lineTo(mx - 6 * Math.cos(ang2 + 0.5), my - 6 * Math.sin(ang2 + 0.5)); ctx.fill();
      if (lab) K.text(ctx, lab, cx + dx * 1.08, cy + dy * 1.08, {size: 11, bold: true, color: col, align: dx < 0 ? 'right' : 'left'}); };
    // incident (vient d'en haut à gauche, vers O)
    { const dx = -Math.sin(a1) * R, dy = -Math.cos(a1) * R; ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + dx, cy + dy); ctx.lineTo(cx, cy); ctx.stroke();
      const mx = cx + dx * 0.5, my = cy + dy * 0.5, ang2 = Math.atan2(-dy, -dx); ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(mx + 8 * Math.cos(ang2), my + 8 * Math.sin(ang2)); ctx.lineTo(mx - 6 * Math.cos(ang2 - 0.5), my - 6 * Math.sin(ang2 - 0.5)); ctx.lineTo(mx - 6 * Math.cos(ang2 + 0.5), my - 6 * Math.sin(ang2 + 0.5)); ctx.fill();
      K.text(ctx, 'incident, i₁ = ' + i1 + '°', cx + dx * 1.08, cy + dy * 1.08, {size: 11, bold: true, color: C.red, align: 'right'}); }
    ray(a1, true, C.amber, total ? 3 : 1.5, 'réfléchi, i₁');
    if (!total) ray(a2, false, C.blue, 3, 'réfracté, i₂ = ' + K.fmt(a2 * 180 / Math.PI, 1) + '°');
    else K.text(ctx, 'RÉFLEXION TOTALE', cx, cy + 60, {size: 14, bold: true, color: C.red, align: 'center'});
    // arcs d'angle
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 40, -Math.PI / 2 - a1, -Math.PI / 2); ctx.stroke();
    if (!total){ ctx.beginPath(); ctx.arc(cx, cy, 40, Math.PI / 2 - a2, Math.PI / 2); ctx.stroke(); }
    const il = n1 > n2 ? Math.asin(n2 / n1) * 180 / Math.PI : null;
    out.innerHTML = `n₁ sin i₁ = ${K.fmt(n1 * Math.sin(a1), 3)}<br>` + (total ? `n₁ sin i₁ &gt; n₂ : pas de rayon réfracté, <b>réflexion totale</b>` : `sin i₂ = n₁ sin i₁ / n₂ = ${K.fmt(s, 3)} → i₂ = <b>${K.fmt(a2 * 180 / Math.PI, 1)}°</b>`) + `<br>` + (il ? `Angle limite i_ℓ = arcsin(n₂/n₁) = <b>${K.fmt(il, 1)}°</b>` : 'Milieu 2 plus réfringent : jamais de réflexion totale dans ce sens') + `<br>λ₂/λ₁ = n₁/n₂ = ${K.fmt(n1 / n2, 2)} ; v₂/v₁ = ${K.fmt(n1 / n2, 2)}`;
  }
  draw();
};
