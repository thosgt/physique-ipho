/* Simulation : fentes d'Young. Deux fentes de largeur b distantes de a, écran à D, longueur d'onde λ.
   I(x) = I0 cos²(π a x/(λ D)) · sinc²(π b x/(λ D)). Interfrange i = λD/a ; largeur de l'enveloppe 2λD/b. */
window.SIMS['young'] = function(mount){
  const K = window.SimKit, C = K.C;
  let lam = 600, a = 0.20, D = 2.0, b = 0.05;    // nm, mm, m, mm
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.slider(ctr, 'Longueur d’onde λ', 400, 750, 5, lam, x => x + ' nm', x => { lam = x; draw(); });
  K.slider(ctr, 'Distance entre les fentes a', 0.05, 1, 0.01, a, x => K.fmt(x, 2) + ' mm', x => { a = x; draw(); });
  K.slider(ctr, 'Largeur des fentes b', 0.01, 0.3, 0.005, b, x => K.fmt(x, 3) + ' mm', x => { b = x; draw(); });
  K.slider(ctr, 'Distance fentes-écran D', 0.5, 5, 0.1, D, x => K.fmt(x, 1) + ' m', x => { D = x; draw(); });
  const out = K.readout(ctr);
  function wl2rgb(w){ let r, g, bb; if (w < 440){ r = -(w - 440) / 60; g = 0; bb = 1; } else if (w < 490){ r = 0; g = (w - 440) / 50; bb = 1; } else if (w < 510){ r = 0; g = 1; bb = -(w - 510) / 20; } else if (w < 580){ r = (w - 510) / 70; g = 1; bb = 0; } else if (w < 645){ r = 1; g = -(w - 645) / 65; bb = 0; } else { r = 1; g = 0; bb = 0; } return [r, g, bb].map(c => Math.round(255 * c)); }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const L = lam * 1e-9, A = a * 1e-3, B = b * 1e-3, i = L * D / A, env = 2 * L * D / B;
    const xmax = 0.03;   // ±3 cm d'écran affichés
    const I = x => { const u = Math.PI * B * x / (L * D), s = u === 0 ? 1 : Math.sin(u) / u; return Math.cos(Math.PI * A * x / (L * D)) ** 2 * s * s; };
    const [r, g, bb] = wl2rgb(lam);
    // bande colorée (l'écran)
    for (let px = 0; px < 600; px++){ const x = (px / 600 - 0.5) * 2 * xmax; const k = I(x); ctx.fillStyle = `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(bb * k)})`; ctx.fillRect(20 + px, 30, 1.5, 70); }
    ctx.strokeStyle = C.ink; ctx.strokeRect(20, 30, 600, 70);
    K.text(ctx, 'écran (−3 cm … +3 cm)', 320, 20, {size: 11, align: 'center', color: C.ink});
    // courbe
    const Ax = K.axes(ctx, 50, 320, 620, 130, {xmin: -xmax * 100, xmax: xmax * 100, ymin: 0, ymax: 1.05, xticks: 6, yticks: 2, xfmt: v => K.fmt(v, 0), yfmt: v => K.fmt(v, 1), xlabel: 'x (cm)'});
    ctx.strokeStyle = C.blue; ctx.lineWidth = 1.5; ctx.beginPath(); for (let px = 0; px <= 600; px++){ const x = (px / 600 - 0.5) * 2 * xmax; const X = Ax.sx(x * 100), Y = Ax.sy(I(x)); px ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
    ctx.strokeStyle = C.amber; ctx.setLineDash([5, 4]); ctx.beginPath(); for (let px = 0; px <= 600; px++){ const x = (px / 600 - 0.5) * 2 * xmax; const u = Math.PI * B * x / (L * D), s = u === 0 ? 1 : Math.sin(u) / u; const X = Ax.sx(x * 100), Y = Ax.sy(s * s); px ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, '- - enveloppe de diffraction (largeur 2λD/b)', 60, 145, {size: 11, color: C.amber, bold: true});
    K.text(ctx, '— interférences : interfrange i = λD/a', 60, 160, {size: 11, color: C.blue, bold: true});
    out.innerHTML = `Interfrange i = λD/a = <b>${K.fmt(i * 1000, 2)} mm</b><br>Tache centrale de diffraction : 2λD/b = ${K.fmt(env * 1000, 1)} mm<br>Franges dans la tache centrale : ≈ ${K.fmt(env / i, 0)} (= 2a/b)<br>Franges brillantes en x = p·i : 0, ±${K.fmt(i * 1000, 2)}, ±${K.fmt(2 * i * 1000, 2)} mm…`;
  }
  draw();
};
