/* Simulation : tube en U arrondi contenant deux liquides séparés par une fine paroi mobile (membrane sans masse,
   libre de glisser le long du tube). Coordonnée s le long de l'axe du tube (s = 0 au point bas, s < 0 à gauche) ;
   le fond est un demi-cercle de rayon Rc, les branches sont verticales. La paroi se place là où les pressions
   des deux côtés sont égales : ρ₁ g h₁ = ρ₂ g h₂, h₁ et h₂ comptés au-dessus du niveau de la paroi. */
window.SIMS['tube-u'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81;
  const LIQ = {eau: ['Eau', 1000, 'rgba(90,169,255,0.6)'], mercure: ['Mercure', 13600, 'rgba(140,150,166,0.9)'],
    huile: ['Huile', 920, 'rgba(232,186,40,0.8)'], essence: ['Essence', 720, 'rgba(245,222,140,0.95)'],
    glycerine: ['Glycérine', 1260, 'rgba(186,140,220,0.65)'], eau2: ['Eau', 1000, 'rgba(90,169,255,0.6)']};
  const Rc = 0.11, HB = 0.60, L1 = 0.42;         // rayon du coude, hauteur des branches, longueur de liquide 1 (m)
  const LMAX = HB - Rc + Math.PI * Rc / 2;        // longueur de tube d'un côté (du point bas au sommet)
  let l1 = 'eau', l2 = 'huile', L2 = 0.22;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 430);
  const s1 = K.select(ctr, 'Liquide de gauche', [['eau', 'Eau (1 000 kg/m³)'], ['mercure', 'Mercure (13 600 kg/m³)'], ['glycerine', 'Glycérine (1 260 kg/m³)'], ['huile', 'Huile (920 kg/m³)']], v => { l1 = v; draw(); });
  const s2 = K.select(ctr, 'Liquide de droite', [['huile', 'Huile (920 kg/m³)'], ['essence', 'Essence (720 kg/m³)'], ['eau2', 'Eau (1 000 kg/m³)'], ['glycerine', 'Glycérine (1 260 kg/m³)']], v => { l2 = v; draw(); });
  const sl = K.slider(ctr, 'Quantité de liquide à droite (longueur de colonne)', 2, 50, 0.5, L2 * 100, v => K.fmt(v, 1) + ' cm', v => { L2 = v / 100; draw(); });
  K.button(ctr, 'Verser la même masse qu’à gauche', () => { L2 = Math.min(0.50, LIQ[l1][1] * L1 / LIQ[l2][1]); sl.value = L2 * 100; draw(); }, true);
  const out = K.readout(ctr);
  // hauteur z et position (x, z) d'un point d'abscisse curviligne s
  const zOf = s => { const a = Math.abs(s); return a <= Math.PI * Rc / 2 ? Rc * (1 - Math.cos(a / Rc)) : Rc + (a - Math.PI * Rc / 2); };
  const xOf = s => { const a = Math.abs(s), sg = Math.sign(s) || 1; return sg * (a <= Math.PI * Rc / 2 ? Rc * Math.sin(a / Rc) : Rc); };
  function solve(){
    const r1 = LIQ[l1][1], r2 = LIQ[l2][1];
    const f = sm => r1 * (zOf(sm - L1) - zOf(sm)) - r2 * (zOf(sm + L2) - zOf(sm));   // > 0 : la gauche pousse plus fort → paroi vers la droite
    let a = -LMAX + L1, b = LMAX - L2;            // la paroi doit laisser chaque liquide dans le tube
    if (a > b) return {sm: 0, over: true};
    let fa = f(a); if (fa < 0) return {sm: a, over: false}; if (f(b) > 0) return {sm: b, over: true};
    for (let i = 0; i < 60; i++){ const m = (a + b) / 2; if (f(m) > 0) a = m; else b = m; }
    return {sm: (a + b) / 2, over: false};
  }
  const S = 430, CX = 200, YB = 355, W = 42;      // px/m, centre horizontal, y du point bas, largeur du tube
  const px = s => [CX + xOf(s) * S, YB - zOf(s) * S];
  function path(sa, sb){ ctx.beginPath(); const n = 60; for (let i = 0; i <= n; i++){ const [x, y] = px(sa + (sb - sa) * i / n); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } }
  function draw(){
    const r1 = LIQ[l1][1], r2 = LIQ[l2][1], {sm, over} = solve();
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    // tube (verre) puis liquides, tracés comme des traits épais le long de l'axe
    ctx.strokeStyle = '#5f6b80'; ctx.lineWidth = W + 5; path(-LMAX, LMAX); ctx.stroke();
    ctx.strokeStyle = '#f3f6fa'; ctx.lineWidth = W; path(-LMAX, LMAX); ctx.stroke();
    ctx.strokeStyle = LIQ[l1][2]; ctx.lineWidth = W; path(sm - L1, sm); ctx.stroke();
    ctx.strokeStyle = LIQ[l2][2]; path(sm, sm + L2); ctx.stroke();
    // paroi mobile : petit segment perpendiculaire à l'axe
    const [mx, my] = px(sm), [tx, ty] = px(sm + 0.002), ang = Math.atan2(ty - my, tx - mx);
    ctx.save(); ctx.translate(mx, my); ctx.rotate(ang); ctx.fillStyle = '#15213a'; ctx.fillRect(-1.5, -W / 2 - 1, 3, W + 2); ctx.restore();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(CX, YB + W / 2 + 26); ctx.stroke(); K.text(ctx, 'paroi mobile (sans masse)', CX, YB + W / 2 + 36, {size: 11, bold: true, color: C.ink, align: 'center'});
    // isobare au niveau de la paroi
    const zm = zOf(sm), yI = YB - zm * S;
    ctx.setLineDash([6, 4]); ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(CX - Rc * S - 60, yI); ctx.lineTo(CX + Rc * S + 50, yI); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, 'même pression', CX + Rc * S + 52, yI - 8, {size: 11, color: C.amber, bold: true});
    K.text(ctx, 'des deux côtés', CX + Rc * S + 52, yI + 6, {size: 11, color: C.amber, bold: true});
    const zL = zOf(sm - L1), zR = zOf(sm + L2), h1 = zL - zm, h2 = zR - zm;
    const dim = (x, ya, yb, lab, col, right) => { ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, ya); ctx.lineTo(x, yb); ctx.stroke();
      [ya, yb].forEach(y => { ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.stroke(); }); K.text(ctx, lab, x + (right ? 8 : -8), (ya + yb) / 2, {size: 12, bold: true, color: col, align: right ? 'left' : 'right'}); };
    dim(CX - Rc * S - W / 2 - 14, YB - zL * S, yI, 'h₁ = ' + K.fmt(h1 * 100, 1) + ' cm', '#0b5fa5', false);
    dim(CX + Rc * S + W / 2 + 14, YB - zR * S, yI, 'h₂ = ' + K.fmt(h2 * 100, 1) + ' cm', '#a8660a', true);
    K.text(ctx, 'P₀', CX - Rc * S, YB - zL * S - 12, {size: 12, align: 'center', color: C.ink});
    K.text(ctx, 'P₀', CX + Rc * S, YB - zR * S - 12, {size: 12, align: 'center', color: C.ink});
    K.text(ctx, LIQ[l1][0], CX - Rc * S, YB - zL * S + 16, {size: 11, align: 'center', color: C.ink});
    K.text(ctx, LIQ[l2][0], CX + Rc * S, YB - zR * S + 16, {size: 11, align: 'center', color: C.ink});
    if (over) K.text(ctx, 'Trop de liquide : ça déborde !', CX, 24, {size: 12, bold: true, color: C.red, align: 'center'});
    // profil de pression dans chaque branche (au-dessus du niveau de la paroi)
    const pm = r1 * g * h1, Pmax = Math.max(pm * 1.1, 300);
    const A = K.axes(ctx, 430, 400, 630, 60, {xmin: 0, xmax: Pmax / 100, ymin: 0, ymax: HB * 100, xticks: 4, yticks: 6, xfmt: v => K.fmt(v, Pmax > 2000 ? 0 : 1), yfmt: v => K.fmt(v, 0), xlabel: 'P − P₀ (hPa)'});
    K.text(ctx, 'hauteur au-dessus du point bas (cm)', 530, 44, {size: 11, color: C.ink, align: 'center'});
    const prof = (pts, col, w, dash) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); pts.forEach(([p, z], i) => { const X = A.sx(p / 100), Y = A.sy(z * 100); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); ctx.setLineDash([]); };
    prof([[0, zL], [pm, zm]], '#0b5fa5', 3); prof([[0, zR], [r2 * g * h2, zm]], '#d9900b', 2, [6, 4]);
    ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(A.sx(pm / 100), A.sy(zm * 100), 4, 0, 7); ctx.fill();
    K.text(ctx, '— gauche', 470, 76, {size: 11, color: '#0b5fa5', bold: true}); K.text(ctx, '- - droite', 470, 92, {size: 11, color: '#d9900b', bold: true});
    out.innerHTML = `<b>${LIQ[l1][0]}</b> : ρ₁ = ${K.fmt(r1, 0)} kg/m³ · <b>${LIQ[l2][0]}</b> : ρ₂ = ${K.fmt(r2, 0)} kg/m³<br>` +
      `Au-dessus du niveau de la paroi :<br>h₁ = ${K.fmt(h1 * 100, 1)} cm ; h₂ = ${K.fmt(h2 * 100, 1)} cm<br>` +
      `ρ₁h₁ = ${K.fmt(r1 * h1, 1)} kg/m² ; ρ₂h₂ = ${K.fmt(r2 * h2, 1)} kg/m²<br>` +
      `P − P₀ sur la paroi = <b>${K.fmt(pm, 0)} Pa</b> des deux côtés<br>` +
      `Masses (section 1 cm²) : ${K.fmt(r1 * L1 * 0.1, 1)} g et ${K.fmt(r2 * L2 * 0.1, 1)} g<br>Surfaces libres : écart ${K.fmt(Math.abs(zR - zL) * 100, 1)} cm`;
  }
  draw();
};
