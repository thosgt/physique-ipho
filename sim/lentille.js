/* Simulation : lentille mince. Objet AB réel (OA < 0) ou virtuel (OA > 0 : les rayons incidents convergent vers B),
   focale f' positive (convergente) ou négative (divergente). Tracé général : un rayon incident de pente m qui frappe la
   lentille à la hauteur y ressort avec la pente m − y/f'. Relation de conjugaison 1/OA' − 1/OA = 1/f', γ = OA'/OA. */
window.SIMS['lentille'] = function(mount){
  const K = window.SimKit, C = K.C;
  let OA = -24, fp = 10, h = 6;      // cm
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  K.slider(ctr, 'Position de l’objet OA (négatif : objet réel, positif : objet virtuel)', -30, 25, 0.5, OA, x => K.fmt(x, 1) + ' cm', x => { OA = x; draw(); });
  K.slider(ctr, 'Distance focale f′ (négative : divergente)', -20, 20, 0.5, fp, x => K.fmt(x, 1) + ' cm (' + K.fmt(100 / x, 1) + ' δ)', x => { fp = x || 0.5; draw(); });
  K.slider(ctr, 'Taille de l’objet AB', 2, 10, 0.5, h, x => K.fmt(x, 1) + ' cm', x => { h = x; draw(); });
  const out = K.readout(ctr);
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const sc = 10, ox = 320, oy = 215, X = x => ox + x * sc, Y = y => oy - y * sc, far = (640 - ox) / sc;
    const OAp = Math.abs(1 / fp + 1 / OA) < 1e-9 ? Infinity : 1 / (1 / fp + 1 / OA), gam = OAp / OA, hp = gam * h, conv = fp > 0;
    const realObj = OA < 0, realImg = isFinite(OAp) && OAp > 0;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, oy); ctx.lineTo(630, oy); ctx.stroke();
    // lentille
    ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox, 30); ctx.lineTo(ox, 400); ctx.stroke();
    const tip = (y, dir) => { ctx.fillStyle = C.blue; ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox - 9, y + dir * (conv ? 13 : -13)); ctx.lineTo(ox + 9, y + dir * (conv ? 13 : -13)); ctx.fill(); };
    tip(30, 1); tip(400, -1);
    K.text(ctx, 'O', ox + 7, oy + 16, {size: 13, bold: true, color: C.ink});
    [[fp, "F'"], [-fp, 'F']].forEach(([x, l]) => { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(X(x), oy, 3.5, 0, 7); ctx.fill(); K.text(ctx, l, X(x) - 5, oy + 18, {size: 13, bold: true, color: C.ink}); });
    // rayons : pente incidente m, hauteur yL à la lentille ; droite passant par B(OA, h)
    const rays = [
      {m: h / OA, lab: 'par O'},                      // vers/par le centre : yL = 0
      {m: 0, lab: 'parallèle'},                        // parallèle à l'axe : yL = h
      {m: h / (OA + fp), lab: 'par F'}                 // passe par F(−fp, 0) : yL = h·fp/(OA+fp)
    ];
    ctx.lineWidth = 1.6;
    for (const r of rays){
      if (!isFinite(r.m) || Math.abs(r.m) > 30) continue;
      const yL = h - r.m * OA;                          // hauteur à la lentille (x = 0)
      if (Math.abs(yL) > 26) continue;
      const m2 = r.m - yL / fp;
      ctx.strokeStyle = C.red;
      // partie incidente (trait plein) : de l'objet réel, ou depuis le bord gauche pour un objet virtuel
      const x0 = realObj ? OA : -far;
      ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(X(x0), Y(h + r.m * (x0 - OA))); ctx.lineTo(X(0), Y(yL)); ctx.stroke();
      if (!realObj){ ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(0), Y(yL)); ctx.lineTo(X(OA), Y(h)); ctx.stroke(); }   // prolongement vers l'objet virtuel
      // partie émergente
      ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(X(0), Y(yL)); ctx.lineTo(X(far), Y(yL + m2 * far)); ctx.stroke();
      if (isFinite(OAp) && !realImg && Math.abs(OAp) < 200){ ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(0), Y(yL)); ctx.lineTo(X(OAp), Y(hp)); ctx.stroke(); }   // prolongement vers l'image virtuelle
      ctx.setLineDash([]);
    }
    // objet
    ctx.strokeStyle = C.green; ctx.lineWidth = 4; ctx.setLineDash(realObj ? [] : [6, 4]); ctx.beginPath(); ctx.moveTo(X(OA), oy); ctx.lineTo(X(OA), Y(h)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.green; ctx.beginPath(); ctx.moveTo(X(OA), Y(h) - 2); ctx.lineTo(X(OA) - 6, Y(h) + 9); ctx.lineTo(X(OA) + 6, Y(h) + 9); ctx.fill();
    K.text(ctx, 'B', X(OA) - 16, Y(h) - 4, {size: 13, bold: true, color: C.green}); K.text(ctx, 'A', X(OA) - 5, oy + 18, {size: 13, bold: true, color: C.green});
    if (!realObj) K.text(ctx, 'objet virtuel : les rayons incidents convergent vers B', X(OA) - 10, Y(h) - 24, {size: 11, bold: true, color: C.green, align: 'center'});
    // image
    if (isFinite(OAp) && Math.abs(OAp) < 200){
      ctx.strokeStyle = C.amber; ctx.lineWidth = 4; ctx.setLineDash(realImg ? [] : [6, 4]); ctx.beginPath(); ctx.moveTo(X(OAp), oy); ctx.lineTo(X(OAp), Y(hp)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.amber; const s = hp > 0 ? 1 : -1; ctx.beginPath(); ctx.moveTo(X(OAp), Y(hp) - 2 * s); ctx.lineTo(X(OAp) - 6, Y(hp) + 9 * s); ctx.lineTo(X(OAp) + 6, Y(hp) + 9 * s); ctx.fill();
      K.text(ctx, "B'", X(OAp) + 9, Y(hp) - 4 * s, {size: 13, bold: true, color: C.amber}); K.text(ctx, "A'", X(OAp) + 2, oy + (hp > 0 ? 18 : -12), {size: 13, bold: true, color: C.amber});
    } else K.text(ctx, 'image à l’infini (objet dans le plan focal objet)', 330, 50, {size: 12, bold: true, color: C.amber, align: 'center'});
    K.text(ctx, (conv ? 'convergente' : 'divergente') + ", f' = " + K.fmt(fp, 1) + ' cm · trait plein : rayon réel ; pointillé : prolongement virtuel', 16, 20, {size: 12, bold: true, color: C.blue});
    out.innerHTML = `OA = ${K.fmt(OA, 1)} cm (objet ${realObj ? 'réel' : '<b>virtuel</b>'}) ; f' = ${K.fmt(fp, 1)} cm<br>1/OA' = 1/f' + 1/OA → OA' = <b>${isFinite(OAp) && Math.abs(OAp) < 1e4 ? K.fmt(OAp, 1) + ' cm' : '∞'}</b><br>Image ${!isFinite(OAp) ? 'à l’infini' : realImg ? '<b>réelle</b> (après la lentille)' : '<b>virtuelle</b> (avant la lentille)'}<br>γ = OA'/OA = <b>${isFinite(OAp) ? K.fmt(gam, 2) : '—'}</b>${isFinite(OAp) ? ' : ' + (gam < 0 ? 'renversée' : 'droite') + ', ' + (Math.abs(gam) > 1 ? 'agrandie' : 'réduite') : ''}<br>A'B' = ${isFinite(OAp) ? K.fmt(hp, 2) + ' cm' : '—'}`;
  }
  draw();
};
