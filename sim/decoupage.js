/* Simulation : découper en éléments et sommer. Barrage en tranches (dF = ρgzL dz), disque en couronnes (dS = 2πr dr),
   boule en pelures (dV = 4πr² dr). Chaque élément est évalué à son bord intérieur (ou supérieur) : la somme tend vers l'intégrale. */
window.SIMS['decoupage'] = function(mount){
  const K = window.SimKit, C = K.C;
  const M = {
    barrage: {lab: 'Barrage découpé en tranches', v: 'profondeur z', f: z => z, exact: 0.5, u: 'ρgLh²', el: 'dF = ρg z L dz'},
    disque: {lab: 'Disque découpé en couronnes', v: 'rayon r', f: r => 2 * Math.PI * r, exact: Math.PI, u: 'R²', el: 'dS = 2πr dr'},
    boule: {lab: 'Boule découpée en pelures', v: 'rayon r', f: r => 4 * Math.PI * r * r, exact: 4 * Math.PI / 3, u: 'R³', el: 'dV = 4πr² dr'}
  };
  let mode = 'barrage', n = 5, sel = 2;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.select(ctr, 'Objet', [['barrage', 'Barrage (tranches)'], ['disque', 'Disque (couronnes)'], ['boule', 'Boule (pelures)']], v => { mode = v; draw(); });
  const sN = K.slider(ctr, 'Nombre d’éléments', 1, 40, 1, n, v => String(v), v => { n = v; sel = Math.min(sel, n - 1); sS.el.max = n; sS.value = sel + 1; draw(); });
  const sS = K.slider(ctr, 'Élément mis en évidence', 1, 5, 1, sel + 1, v => 'n° ' + v, v => { sel = v - 1; draw(); });
  const out = K.readout(ctr);
  function draw(){
    const m = M[mode], d = 1 / n;
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    // dessin de l'objet (à gauche)
    if (mode === 'barrage'){
      const x0 = 30, y0 = 60, H = 250, W = 150;
      K.text(ctx, 'eau', x0 + 10, y0 + 14, {size: 11, color: C.blue});
      for (let i = 0; i < n; i++){ const y = y0 + i * H * d; ctx.fillStyle = i === sel ? 'rgba(217,144,11,0.85)' : i % 2 ? '#c9dcf2' : '#dbe8f7'; ctx.fillRect(x0, y, W, H * d);
        const z = i * d, L = 10 + 90 * z; if (n <= 20 || i === sel){ ctx.strokeStyle = i === sel ? C.amber : C.blue; ctx.lineWidth = i === sel ? 2.5 : 1.2; const ym = y + H * d / 2;
          ctx.beginPath(); ctx.moveTo(x0 + W + 4, ym); ctx.lineTo(x0 + W + 4 + L, ym); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x0 + W + 4 + L, ym); ctx.lineTo(x0 + W + L - 2, ym - 4); ctx.lineTo(x0 + W + L - 2, ym + 4); ctx.closePath(); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); } }
      ctx.fillStyle = '#8a94a6'; ctx.fillRect(x0 + W, y0 - 20, 4, H + 30);
      ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + W, y0); ctx.stroke();
      K.text(ctx, 'paroi', x0 + W + 8, y0 - 10, {size: 10, color: C.ink}); K.text(ctx, 'force sur chaque tranche', x0 + W + 10, y0 + H + 14, {size: 10, color: C.ink});
    } else {
      const cx = 150, cy = 185, R = 120;
      for (let i = n - 1; i >= 0; i--){ ctx.fillStyle = i === sel ? 'rgba(217,144,11,0.85)' : i % 2 ? '#c9dcf2' : '#dbe8f7'; ctx.beginPath(); ctx.arc(cx, cy, R * (i + 1) * d, 0, 7); ctx.fill(); }
      if (n <= 25){ ctx.strokeStyle = 'rgba(11,95,165,0.5)'; ctx.lineWidth = 0.8; for (let i = 1; i <= n; i++){ ctx.beginPath(); ctx.arc(cx, cy, R * i * d, 0, 7); ctx.stroke(); } }
      if (mode === 'boule'){ ctx.strokeStyle = C.ink; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.28, 0, 0, Math.PI); ctx.stroke(); ctx.setLineDash([]); K.text(ctx, 'coupe de la boule', cx, cy + R + 22, {size: 10, color: C.ink, align: 'center'}); }
      ctx.strokeStyle = C.navy; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * 0.94, cy - R * 0.34); ctx.stroke(); K.text(ctx, 'R', cx + R * 0.5, cy - R * 0.24, {size: 11, color: C.navy});
    }
    K.text(ctx, m.lab, 20, 22, {size: 12, bold: true, color: C.navy});
    // histogramme des contributions (à droite)
    const fmax = m.f(1) * 1.08;
    const A = K.axes(ctx, 360, 320, 625, 40, {xmin: 0, xmax: 1, ymin: 0, ymax: fmax, xticks: 4, yticks: 3, xfmt: u => K.fmt(u, 2), yfmt: u => K.fmt(u, 1), xlabel: m.v + (mode === 'barrage' ? ' / h' : ' / R')});
    let S = 0;
    for (let i = 0; i < n; i++){ const a = i * d, y = m.f(a); S += y * d; ctx.fillStyle = i === sel ? 'rgba(217,144,11,0.85)' : 'rgba(11,95,165,0.25)'; ctx.fillRect(A.sx(a), A.sy(y), A.sx(a + d) - A.sx(a), A.sy(0) - A.sy(y));
      if (n <= 25){ ctx.strokeStyle = C.blue; ctx.lineWidth = 0.8; ctx.strokeRect(A.sx(a), A.sy(y), A.sx(a + d) - A.sx(a), A.sy(0) - A.sy(y)); } }
    ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 100; i++){ const u = i / 100; i ? ctx.lineTo(A.sx(u), A.sy(m.f(u))) : ctx.moveTo(A.sx(u), A.sy(m.f(u))); } ctx.stroke();
    K.text(ctx, 'contribution de chaque élément', 365, 30, {size: 11, color: C.ink});
    const a = sel * d, dG = m.f(a) * d;
    out.innerHTML = `Élément : <b>${m.el}</b><br>Épaisseur : ${K.fmt(d, 3)} ${mode === 'barrage' ? 'h' : 'R'}<br>Élément n° ${sel + 1} : ${K.fmt(dG, 4)} ${m.u}<br>Somme : <b>${K.fmt(S, 4)}</b> ${m.u}<br>Valeur exacte : <b>${K.fmt(m.exact, 4)}</b> ${m.u}<br>Écart : ${K.fmt((S - m.exact) / m.exact * 100, 1)} %`;
  }
  draw();
};
