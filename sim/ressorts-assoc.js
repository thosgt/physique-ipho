/* Simulation : associations de ressorts. En série la force est commune, les allongements s'ajoutent : 1/k = 1/k1 + 1/k2 ;
   en parallèle l'allongement est commun, les forces s'ajoutent : k = k1 + k2 ; masse entre deux parois : k1 + k2 (les deux rappellent) ;
   ressort coupé en deux : chaque moitié a la raideur 2k. Comparaison avec un ressort seul de raideur k1, même masse. */
window.SIMS['ressorts-assoc'] = function(mount){
  const K = window.SimKit, C = K.C;
  let mont = 'serie', k1 = 20, k2 = 20, m = 0.5, t = 0, run = false, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.select(ctr, 'Montage', [['serie', 'deux ressorts en série'], ['par', 'deux ressorts en parallèle'], ['parois', 'masse entre deux parois'], ['moitie', 'moitié du ressort k₁']], v => { mont = v; t = 0; });
  K.slider(ctr, 'Raideur k₁', 5, 60, 1, k1, v => v + ' N/m', v => { k1 = v; t = 0; });
  K.slider(ctr, 'Raideur k₂', 5, 60, 1, k2, v => v + ' N/m', v => { k2 = v; t = 0; });
  K.slider(ctr, 'Masse m', 0.1, 2, 0.05, m, v => K.fmt(v, 2) + ' kg', v => { m = v; t = 0; });
  K.button(ctr, '▶ Lâcher', () => { t = 0; run = true; });
  const out = K.readout(ctr);
  const keq = () => ({serie: k1 * k2 / (k1 + k2), par: k1 + k2, parois: k1 + k2, moitie: 2 * k1})[mont];
  function spring(x0, x1, y, col, n){ ctx.strokeStyle = col || C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y); const L = x1 - x0, nn = n || 12; for (let i = 1; i < nn; i++) ctx.lineTo(x0 + L * i / nn, y + (i % 2 ? -6 : 6)); ctx.lineTo(x1, y); ctx.stroke(); }
  const wall = (x, y0, y1) => { ctx.fillStyle = C.navy; ctx.fillRect(x - 4, y0, 8, y1 - y0); };
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const A = 0.12, S = 300, ke = keq(), w = Math.sqrt(ke / m), w1 = Math.sqrt(k1 / m);
    const x = A * Math.cos(w * t), xr = A * Math.cos(w1 * t);
    // montage étudié
    const y = 95, xw = 40, Lr = 210, xe = mont === 'moitie' ? xw + Lr / 2 : mont === 'serie' ? xw + 2 * Lr * 0.6 : xw + Lr, px = xe + x * S;
    K.text(ctx, ({serie: 'En série', par: 'En parallèle', parois: 'Entre deux parois', moitie: 'Moitié du ressort k₁'})[mont] + ` : k_éq = ${K.fmt(ke, 1)} N/m`, 40, 22, {size: 13, bold: true, color: C.navy});
    wall(xw, y - 45, y + 40);
    if (mont === 'serie'){
      const L1 = Lr * 0.6, j = xw + L1 + x * S * ke / k1;          // le point de jonction se déplace de F/k1
      spring(xw, j, y, C.blue); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(j, y, 3.5, 0, 7); ctx.fill(); spring(j, px - 22, y, C.amber);
      K.text(ctx, 'k₁', (xw + j) / 2, y - 18, {size: 12, color: C.blue, align: 'center'}); K.text(ctx, 'k₂', (j + px - 22) / 2, y - 18, {size: 12, color: C.amber, align: 'center'});
    } else if (mont === 'par'){
      spring(xw, px - 22, y - 18, C.blue); spring(xw, px - 22, y + 18, C.amber);
      K.text(ctx, 'k₁', (xw + px) / 2, y - 34, {size: 12, color: C.blue, align: 'center'}); K.text(ctx, 'k₂', (xw + px) / 2, y + 36, {size: 12, color: C.amber, align: 'center'});
    } else if (mont === 'parois'){
      const xw2 = xe + Lr; wall(xw2, y - 45, y + 40);
      spring(xw, px - 22, y, C.blue); spring(px + 22, xw2, y, C.amber);
      K.text(ctx, 'k₁', (xw + px) / 2, y - 18, {size: 12, color: C.blue, align: 'center'}); K.text(ctx, 'k₂', (px + xw2) / 2, y - 18, {size: 12, color: C.amber, align: 'center'});
    } else {
      spring(xw, px - 22, y, C.blue, 7); K.text(ctx, 'k₁ coupé en deux', (xw + px) / 2, y - 18, {size: 12, color: C.blue, align: 'center'});
    }
    ctx.fillStyle = C.navy; ctx.fillRect(px - 22, y - 22, 44, 44);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = C.green; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xe, y - 50); ctx.lineTo(xe, y + 44); ctx.stroke(); ctx.setLineDash([]);
    // référence : ressort k1 seul
    const yr = 245, xer = xw + Lr, pxr = xer + xr * S;
    K.text(ctx, `Référence : le ressort k₁ seul, même masse`, 40, yr - 60, {size: 12, bold: true, color: C.grey});
    wall(xw, yr - 30, yr + 30); spring(xw, pxr - 22, yr, C.grey); ctx.fillStyle = C.grey; ctx.fillRect(pxr - 22, yr - 22, 44, 44);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = C.green; ctx.beginPath(); ctx.moveTo(xer, yr - 34); ctx.lineTo(xer, yr + 34); ctx.stroke(); ctx.setLineDash([]);
    const T = 2 * Math.PI / w, T1 = 2 * Math.PI / w1;
    K.text(ctx, `T = ${K.fmt(T, 2)} s`, 520, y, {size: 15, bold: true, color: C.navy}); K.text(ctx, `T₁ = ${K.fmt(T1, 2)} s`, 520, yr, {size: 15, bold: true, color: C.grey});
    K.text(ctx, `T / T₁ = ${K.fmt(T / T1, 3)}`, 520, 330, {size: 12, color: C.ink});
    const why = {serie: 'En série, la même force traverse les deux ressorts et leurs allongements s’ajoutent : les souplesses 1/k s’ajoutent, l’ensemble est plus mou que chacun.',
      par: 'En parallèle, les deux ressorts ont le même allongement et leurs forces s’ajoutent : les raideurs s’ajoutent.',
      parois: 'Quand la masse se déplace, un ressort s’allonge et l’autre se raccourcit : tous deux la rappellent vers l’équilibre, les raideurs s’ajoutent. C’est un montage « en parallèle », même s’il en a l’air de « série ».',
      moitie: 'Une moitié de ressort s’allonge deux fois moins sous la même force : sa raideur est double (k ℓ est constant quand on coupe un ressort).'}[mont];
    out.innerHTML = `${why}<br>k_éq = <b>${K.fmt(ke, 2)} N/m</b> ; T = 2π√(m/k_éq) = <b>${K.fmt(T, 3)} s</b>, contre ${K.fmt(T1, 3)} s avec k₁ seul.<br>Règle à retenir : c’est l’inverse des résistances, et la même que pour les condensateurs.`;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) t += dt; draw(); requestAnimationFrame(loop); })(performance.now());
};
