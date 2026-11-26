/* Simulation : lois d'échelle. Toutes les longueurs × λ : surfaces × λ², volumes et poids × λ³.
   Contrainte sur les os (poids / section) × λ ; pertes thermiques par kg (surface / masse) × 1/λ.
   Pour garder la même contrainte, le diamètre des pattes doit croître comme λ^(3/2) : × √λ par rapport au corps. */
window.SIMS['echelle'] = function(mount){
  const K = window.SimKit, C = K.C;
  let L = 1;   // log10 λ
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.slider(ctr, 'Facteur d’agrandissement λ', -1, 1.3, 0.01, L, v => 'λ = ' + K.fmt(10 ** v, 10 ** v < 1 ? 2 : 1), v => { L = v; draw(); });
  const out = K.readout(ctr);
  function animal(x0, yb, h, leg, col){
    // corps de hauteur h (échelle d'affichage fixe), pattes d'épaisseur leg (fraction de h)
    const bw = 1.6 * h, bh = 0.55 * h, lh = 0.6 * h, lw = Math.max(2, leg * h);
    ctx.fillStyle = col; ctx.strokeStyle = C.navy; ctx.lineWidth = 1.2;
    [0.12, 0.3, 0.7, 0.88].forEach(f => { ctx.fillRect(x0 + f * bw - lw / 2, yb - lh, lw, lh); });
    ctx.beginPath(); ctx.ellipse(x0 + bw / 2, yb - lh - bh / 2 + 6, bw / 2, bh / 2, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0 + bw + 0.1 * h, yb - lh - bh + 4, 0.22 * h, 0, 7); ctx.fill(); ctx.stroke();
  }
  function draw(){
    const lam = 10 ** L;
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    K.text(ctx, 'Agrandi tel quel', 85, 18, {size: 12, bold: true, color: C.navy, align: 'center'});
    K.text(ctx, 'Pattes pour la même contrainte', 240, 18, {size: 12, bold: true, color: C.navy, align: 'center'});
    animal(30, 170, 70, 0.09, '#dbe8f7');
    animal(185, 170, 70, Math.min(0.5, 0.09 * Math.sqrt(lam)), '#fde7c8');
    K.text(ctx, '(même taille à l’écran : seules les proportions comptent)', 165, 192, {size: 10, color: C.ink, align: 'center'});
    // barres en échelle log
    const rows = [['longueur', 1, C.navy], ['surface, section', 2, C.sky], ['volume, poids', 3, C.blue], ['contrainte sur les os', 1, C.red], ['pertes thermiques par kg', -1, C.amber]];
    const x0 = 330, x1 = 625, mid = (x0 + x1) / 2, span = 4;   // de 10^-4 à 10^4
    const sx = e => mid + e / span * (x1 - x0) / 2;
    K.text(ctx, 'Facteur multiplicatif (échelle log)', mid, 18, {size: 12, bold: true, color: C.navy, align: 'center'});
    ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.moveTo(mid, 34); ctx.lineTo(mid, 330); ctx.stroke();
    [-4, -2, 0, 2, 4].forEach(e => { K.text(ctx, e === 0 ? '1' : '10' + (e < 0 ? '⁻' : '') + '⁰¹²³⁴'[Math.abs(e)], sx(e), 342, {size: 10, color: C.ink, align: 'center'}); ctx.strokeStyle = C.light; ctx.beginPath(); ctx.moveTo(sx(e), 34); ctx.lineTo(sx(e), 330); ctx.stroke(); });
    rows.forEach(([lab, n, col], i) => { const y = 50 + i * 56, e = n * L, X = sx(Math.max(-span, Math.min(span, e)));
      ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(Math.min(mid, X), y + 14, Math.abs(X - mid), 16); ctx.globalAlpha = 1;
      K.text(ctx, lab + ' : λ' + (n === 1 ? '' : n === -1 ? '⁻¹' : n === 2 ? '²' : '³'), x0, y + 4, {size: 11, color: C.navy, bold: true});
      const f = 10 ** e; K.text(ctx, '× ' + (f >= 100 ? Math.round(f).toLocaleString('fr-FR') : K.fmt(f, f < 0.1 ? 3 : f < 10 ? 2 : 0)), e >= 0 ? Math.min(X + 6, 590) : Math.max(X - 6, 360), y + 22, {size: 11, color: C.ink, align: e >= 0 ? 'left' : 'right'}); });
    // repères
    K.text(ctx, 'Exemples : chat → éléphant λ ≈ 10 ; souris → chat λ ≈ 5', 20, 230, {size: 11, color: C.ink});
    K.text(ctx, 'Poids ∝ λ³ mais section des os ∝ λ² :', 20, 260, {size: 11, color: C.navy, bold: true});
    K.text(ctx, 'la contrainte (poids/section) ∝ λ.', 20, 278, {size: 11, color: C.navy});
    K.text(ctx, 'Pattes : diamètre ∝ λ^(3/2) pour la même contrainte,', 20, 304, {size: 11, color: C.navy});
    K.text(ctx, 'soit × √λ = × ' + K.fmt(Math.sqrt(lam), 2) + ' par rapport au corps.', 20, 322, {size: 11, color: C.navy});
    out.innerHTML = `λ = <b>${K.fmt(lam, 2)}</b><br>Surface × ${K.fmt(lam ** 2, lam ** 2 < 10 ? 2 : 0)}<br>Poids × ${K.fmt(lam ** 3, lam ** 3 < 10 ? 2 : 0)}<br>Contrainte sur les os × ${K.fmt(lam, 2)}<br>Pertes par kg × ${K.fmt(1 / lam, 2)}`;
  }
  draw();
};
