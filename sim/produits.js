/* Simulation : produit scalaire (projection, signe) et produit vectoriel (aire du parallélogramme, sens ⊙ ou ⊗)
   de deux vecteurs du plan de la feuille. a·b = ab cos θ ; a∧b = ab sin θ u_z (u_z vers le lecteur). */
window.SIMS['produits'] = function(mount){
  const K = window.SimKit, C = K.C;
  let mode = 's', A = 4, B = 3, th = 50, ph = 10;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.select(ctr, 'Produit', [['s', 'scalaire a · b'], ['v', 'vectoriel a ∧ b'], ['bv', 'vectoriel b ∧ a']], v => { mode = v; draw(); });
  K.slider(ctr, 'Norme a', 1, 5, 0.1, A, v => K.fmt(v, 1), v => { A = v; draw(); });
  K.slider(ctr, 'Norme b', 1, 5, 0.1, B, v => K.fmt(v, 1), v => { B = v; draw(); });
  K.slider(ctr, 'Angle θ de a vers b', -180, 180, 1, th, v => v + '°', v => { th = v; draw(); });
  const out = K.readout(ctr);
  function arrow(x1, y1, x2, y2, col, w){ const a = Math.atan2(y2 - y1, x2 - x1), h = 11; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - h * 0.6 * Math.cos(a), y2 - h * 0.6 * Math.sin(a)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)); ctx.lineTo(x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill(); }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const O = [250, 200], s = 34, pa = ph * Math.PI / 180, pb = (ph + th) * Math.PI / 180;
    const Pa = [O[0] + A * s * Math.cos(pa), O[1] - A * s * Math.sin(pa)], Pb = [O[0] + B * s * Math.cos(pb), O[1] - B * s * Math.sin(pb)];
    const dot = A * B * Math.cos(th * Math.PI / 180), cr = A * B * Math.sin(th * Math.PI / 180) * (mode === 'bv' ? -1 : 1);
    if (mode === 's'){
      const pr = B * Math.cos(th * Math.PI / 180), H = [O[0] + pr * s * Math.cos(pa), O[1] - pr * s * Math.sin(pa)];
      ctx.strokeStyle = C.light; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(O[0] - 200 * Math.cos(pa), O[1] + 200 * Math.sin(pa)); ctx.lineTo(O[0] + 230 * Math.cos(pa), O[1] - 230 * Math.sin(pa)); ctx.stroke();
      ctx.setLineDash([4, 3]); ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.moveTo(Pb[0], Pb[1]); ctx.lineTo(H[0], H[1]); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = dot >= 0 ? C.green : C.red; ctx.lineWidth = 6; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(H[0], H[1]); ctx.stroke(); ctx.globalAlpha = 1;
      K.text(ctx, 'projection de b sur a : b cos θ = ' + K.fmt(pr, 2), 14, 22, {size: 12, bold: true, color: dot >= 0 ? C.green : C.red});
    } else {
      const P4 = [Pa[0] + Pb[0] - O[0], Pa[1] + Pb[1] - O[1]];
      ctx.fillStyle = cr >= 0 ? 'rgba(178,58,72,0.16)' : 'rgba(11,95,165,0.16)'; ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(Pa[0], Pa[1]); ctx.lineTo(P4[0], P4[1]); ctx.lineTo(Pb[0], Pb[1]); ctx.closePath(); ctx.fill();
      // symbole ⊙ ou ⊗
      const cx = 540, cy = 180, r = 30 * Math.min(1, 0.25 + Math.abs(cr) / 25);
      if (Math.abs(cr) > 0.05){ ctx.strokeStyle = C.navy; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
        if (cr > 0){ ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(cx, cy, r * 0.22, 0, 7); ctx.fill(); }
        else { const q = r * 0.7; ctx.beginPath(); ctx.moveTo(cx - q, cy - q); ctx.lineTo(cx + q, cy + q); ctx.moveTo(cx + q, cy - q); ctx.lineTo(cx - q, cy + q); ctx.stroke(); } }
      K.text(ctx, Math.abs(cr) < 0.05 ? 'produit nul' : cr > 0 ? 'vers le lecteur ⊙' : 'vers le fond ⊗', cx, cy + 52, {size: 12, bold: true, color: C.navy, align: 'center'});
      K.text(ctx, (mode === 'bv' ? 'b ∧ a' : 'a ∧ b') + ' : aire du parallélogramme = ' + K.fmt(Math.abs(cr), 2), 14, 22, {size: 12, bold: true, color: C.navy});
      // flèche de rotation de a vers b (ou b vers a)
      const r0 = 46, t0 = mode === 'bv' ? pb : pa, t1 = mode === 'bv' ? pa : pb; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(O[0], O[1], r0, -t0, -t1, (mode === 'bv' ? -th : th) > 0); ctx.stroke();
    }
    arrow(O[0], O[1], Pa[0], Pa[1], C.blue, 3); arrow(O[0], O[1], Pb[0], Pb[1], C.amber, 3);
    K.text(ctx, 'a', Pa[0] + 12 * Math.cos(pa), Pa[1] - 12 * Math.sin(pa), {size: 14, bold: true, color: C.blue, align: 'center'});
    K.text(ctx, 'b', Pb[0] + 12 * Math.cos(pb), Pb[1] - 12 * Math.sin(pb), {size: 14, bold: true, color: C.amber, align: 'center'});
    ctx.strokeStyle = C.navy; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(O[0], O[1], 26, -pa, -pb, th > 0); ctx.stroke();
    K.text(ctx, 'θ', O[0] + 34 * Math.cos((pa + pb) / 2), O[1] - 34 * Math.sin((pa + pb) / 2), {size: 12, color: C.navy, align: 'center'});
    out.innerHTML = mode === 's'
      ? `a · b = ab cos θ = <b>${K.fmt(dot, 2)}</b><br>${Math.abs(dot) < 0.05 ? 'Vecteurs perpendiculaires : produit nul.' : dot > 0 ? 'θ aigu : produit positif.' : 'θ obtus : produit négatif.'}<br>Une force perpendiculaire au déplacement ne travaille pas.`
      : `‖${mode === 'bv' ? 'b ∧ a' : 'a ∧ b'}‖ = ab |sin θ| = <b>${K.fmt(Math.abs(cr), 2)}</b><br>Sens : ${Math.abs(cr) < 0.05 ? 'aucun (vecteurs colinéaires)' : cr > 0 ? 'vers le lecteur (⊙)' : 'vers le fond (⊗)'}<br>b ∧ a = − a ∧ b : l’ordre compte.`;
  }
  draw();
};
