/* Simulation : forces pressantes sur une paroi plane (barrage), verticale ou inclinée.
   Surpression p = ρ g d (d : profondeur) ; résultante par unité de largeur F = ρ g h² / (2 sin α),
   composantes Fx = ρ g h²/2 (comme une paroi verticale) et Fz = poids de l'eau au-dessus de la paroi ;
   centre de poussée aux 2/3 de la profondeur (h/3 au-dessus du pied). */
window.SIMS['barrage'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81, rho = 1000;
  let h = 50, alpha = 90, showAtm = false;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  K.slider(ctr, 'Hauteur d’eau h', 5, 100, 1, h, v => v + ' m', v => { h = v; draw(); });
  K.slider(ctr, 'Inclinaison de la paroi α', 30, 90, 1, alpha, v => v + '°', v => { alpha = v; draw(); });
  const lab = document.createElement('label'); lab.style.flexDirection = 'row'; lab.style.alignItems = 'center'; lab.style.gap = '6px';
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.addEventListener('change', () => { showAtm = cb.checked; draw(); });
  lab.appendChild(cb); lab.appendChild(document.createTextNode('Ajouter la pression atmosphérique (des deux côtés)')); ctr.appendChild(lab);
  const out = K.readout(ctr);
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const S = 3.0, xf = 330, yf = 360;                 // px par mètre ; pied du barrage
    const a = alpha * Math.PI / 180, H = 100;
    // paroi : du pied (xf, yf) vers le haut-gauche ; l'eau est à droite
    const top = [xf - H / Math.tan(a) * S, yf - H * S];
    const wl = [xf - h / Math.tan(a) * S, yf - h * S]; // point de la paroi au niveau de l'eau
    // sol
    ctx.fillStyle = '#efe4d2'; ctx.fillRect(0, yf, 640, 40);
    // eau
    ctx.fillStyle = 'rgba(90,169,255,0.35)'; ctx.beginPath(); ctx.moveTo(wl[0], wl[1]); ctx.lineTo(630, wl[1]); ctx.lineTo(630, yf); ctx.lineTo(xf, yf); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wl[0], wl[1]); ctx.lineTo(630, wl[1]); ctx.stroke();
    // barrage (massif)
    ctx.fillStyle = '#9a9ca3'; ctx.beginPath(); ctx.moveTo(xf, yf); ctx.lineTo(top[0], top[1]); ctx.lineTo(top[0] - 30, top[1]); ctx.lineTo(Math.min(top[0] - 30, xf - 120), yf); ctx.closePath(); ctx.fill();
    // flèches de pression, normales à la paroi (vers le barrage), longueur ∝ pression
    const n = [-Math.sin(a), Math.cos(a)];           // normale dirigée de l'eau vers la paroi (gauche, et vers le bas si la paroi est inclinée)
    const ka = 1.1;                                   // px par kPa·(1/10)
    const pAtm = 101.3;
    for (let k = 1; k <= 12; k++){
      const d = h * (k - 0.5) / 12, px = xf - (h - d) / Math.tan(a) * S, py = yf - (h - d) * S;
      const p = rho * g * d / 1000 + (showAtm ? pAtm : 0), L = p * ka * 0.18;
      const x2 = px - n[0] * L, y2 = py - n[1] * L;
      ctx.strokeStyle = '#3b5bdb'; ctx.fillStyle = '#3b5bdb'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(px, py); ctx.stroke();
      const ang = Math.atan2(py - y2, px - x2); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 7 * Math.cos(ang - 0.4), py - 7 * Math.sin(ang - 0.4)); ctx.lineTo(px - 7 * Math.cos(ang + 0.4), py - 7 * Math.sin(ang + 0.4)); ctx.fill();
    }
    // centre de poussée (profondeur 2h/3) et résultante
    const dC = 2 * h / 3, cx = xf - (h - dC) / Math.tan(a) * S, cy = yf - (h - dC) * S;
    const F = rho * g * h * h / (2 * Math.sin(a));   // N par mètre de largeur
    const LF = Math.min(170, 30 + F / 1e6 * 3.2);
    ctx.strokeStyle = C.red; ctx.fillStyle = C.red; ctx.lineWidth = 4; const ex = cx + n[0] * LF, ey = cy + n[1] * LF;
    ctx.beginPath(); ctx.moveTo(cx - n[0] * 4, cy - n[1] * 4); ctx.lineTo(ex, ey); ctx.stroke();
    const ang = Math.atan2(ey - cy, ex - cx); ctx.beginPath(); ctx.moveTo(ex + 4 * Math.cos(ang), ey + 4 * Math.sin(ang)); ctx.lineTo(ex - 10 * Math.cos(ang - 0.45), ey - 10 * Math.sin(ang - 0.45)); ctx.lineTo(ex - 10 * Math.cos(ang + 0.45), ey - 10 * Math.sin(ang + 0.45)); ctx.fill();
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
    K.text(ctx, 'C (centre de poussée)', cx + 10, cy + 14, {size: 11, bold: true, color: C.red});
    K.text(ctx, 'F', ex - 14, ey - 8, {size: 13, bold: true, color: C.red});
    // cotes
    ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(610, wl[1]); ctx.lineTo(610, yf); ctx.stroke();
    K.text(ctx, 'h = ' + h + ' m', 604, (wl[1] + yf) / 2, {size: 12, bold: true, align: 'right', color: C.ink});
    ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(560, cy); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, 'h/3 au-dessus du pied', 560, cy - 8, {size: 11, color: C.ink, align: 'right'});
    K.text(ctx, 'profil de surpression ρgd (triangle)', 20, 24, {size: 11, color: '#3b5bdb', bold: true});
    if (showAtm) K.text(ctx, 'P₀ s’ajoute partout… et pousse aussi de l’autre côté : elle se compense', 20, 42, {size: 11, color: C.ink});
    const Fx = rho * g * h * h / 2, Fz = Fx / Math.tan(a);
    out.innerHTML = `Par mètre de largeur (L = 1 m) :<br>F = ρgh²/(2 sin α) = <b>${(F / 1e6).toLocaleString('fr-FR', {maximumFractionDigits: 2})} MN</b><br>` +
      `F<sub>x</sub> = ρgh²/2 = ${(Fx / 1e6).toLocaleString('fr-FR', {maximumFractionDigits: 2})} MN (horizontale)<br>` +
      `F<sub>z</sub> = ${(Fz / 1e6).toLocaleString('fr-FR', {maximumFractionDigits: 2})} MN = poids de l’eau au-dessus de la paroi<br>` +
      `Centre de poussée : profondeur 2h/3 = ${K.fmt(2 * h / 3, 1)} m<br>Moment au pied : ρgh³/(6 sin²α) = ${(rho * g * h ** 3 / (6 * Math.sin(a) ** 2) / 1e6).toLocaleString('fr-FR', {maximumFractionDigits: 1})} MN·m`;
  }
  draw();
};
