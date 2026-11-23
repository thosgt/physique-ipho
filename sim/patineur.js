/* Simulation : conservation du moment cinétique (tabouret tournant vu de dessus, deux haltères de masse m à la distance r de l'axe).
   Sans moment extérieur, L = J omega se conserve, J = J0 + 2 m r². Rapprocher les masses diminue J : omega augmente.
   L'énergie cinétique L²/2J augmente : c'est le travail fourni par les bras (forces intérieures) qui tirent les masses vers l'axe. */
window.SIMS['patineur'] = function(mount){
  const K = window.SimKit, C = K.C, J0 = 1.5, m = 2;
  let r = 0.75, L = 0, phi = 0, w0 = 1.5, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  const rS = K.slider(ctr, 'Distance des haltères à l’axe r (à changer en tournant)', 0.15, 0.8, 0.01, r, u => K.fmt(u * 100, 0) + ' cm', u => { r = u; });
  K.slider(ctr, 'Vitesse angulaire de départ', 0.5, 3, 0.1, w0, u => K.fmt(u, 1) + ' rad/s', u => { w0 = u; });
  K.button(ctr, '▶ Lancer la rotation, bras tendus', () => { r = 0.75; rS.value = 0.75; L = J() * w0; });
  K.button(ctr, 'Ramener les bras', () => { anim = 0.15; }, true);
  K.button(ctr, 'Écarter les bras', () => { anim = 0.8; }, true);
  const out = K.readout(ctr);
  let anim = null;
  const J = () => J0 + 2 * m * r * r;
  L = J() * w0;
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const cx = 190, cy = 190, S = 190, w = L / J();
    // plateau et personne vue de dessus
    ctx.fillStyle = '#eef2f7'; ctx.strokeStyle = C.grey; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 70, 0, 7); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-phi);
    ctx.strokeStyle = '#c9d2df'; ctx.lineWidth = 1.5; for (let k = 0; k < 8; k++){ const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(20 * Math.cos(a), 20 * Math.sin(a)); ctx.lineTo(68 * Math.cos(a), 68 * Math.sin(a)); ctx.stroke(); }
    ctx.strokeStyle = '#d9b48f'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-r * S, 0); ctx.lineTo(r * S, 0); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#6d4b2f'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 30, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8c9a8'; ctx.beginPath(); ctx.arc(0, -2, 13, 0, 7); ctx.fill();
    [-1, 1].forEach(sg => { ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(sg * r * S, 0, 13, 0, 7); ctx.fill(); });
    ctx.restore();
    // flèche de rotation
    ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 170, -0.4, 0.4); ctx.stroke();
    ctx.fillStyle = C.red; ctx.beginPath(); const ea = -0.4; ctx.moveTo(cx + 170 * Math.cos(ea), cy + 170 * Math.sin(ea)); ctx.lineTo(cx + 170 * Math.cos(ea) - 4, cy + 170 * Math.sin(ea) + 10); ctx.lineTo(cx + 170 * Math.cos(ea) + 8, cy + 170 * Math.sin(ea) + 6); ctx.closePath(); ctx.fill();
    // barres : J, omega, L, Ec (rapportées à leur valeur bras tendus)
    const Jt = J0 + 2 * m * 0.75 * 0.75, wt = L / Jt, Et = L * L / (2 * Jt), Ec = L * L / (2 * J());
    const bars = [['J', J() / Jt, C.blue, K.fmt(J(), 2) + ' kg·m²'], ['ω', w / wt, C.red, K.fmt(w, 2) + ' rad/s'], ['L = Jω', 1, C.green, K.fmt(L, 2) + ' J·s'], ['Ec', Ec / Et, C.amber, K.fmt(Ec, 1) + ' J']];
    const bx = 420, by = 300, bw = 36, scB = 70;
    bars.forEach(([lab, val, col, txt], i) => { const X = bx + i * 52, H = Math.min(260, val * scB); ctx.fillStyle = '#eef2f7'; ctx.fillRect(X, by - 260, bw, 260); ctx.fillStyle = col; ctx.fillRect(X, by - H, bw, H); K.text(ctx, lab, X + bw / 2, by + 14, {size: 11, bold: true, color: col, align: 'center'}); K.text(ctx, txt, X + bw / 2, by + 30 + (i % 2) * 14, {size: 9, color: C.ink, align: 'center'}); });
    ctx.setLineDash([3, 3]); ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.moveTo(bx - 4, by - scB); ctx.lineTo(bx + 4 * 52, by - scB); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, 'tirets : valeurs bras tendus', bx, by - 275, {size: 10, color: C.grey});
    out.innerHTML = `J = J₀ + 2 m r² = ${K.fmt(J(), 2)} kg·m² (corps : J₀ = ${J0} kg·m², haltères : m = ${m} kg chacun).<br>` +
      `Aucun moment extérieur par rapport à l’axe : <b>L = Jω se conserve</b>. ω = ${K.fmt(w, 2)} rad/s, soit ${K.fmt(w / wt, 2)} fois la valeur bras tendus.<br>` +
      `L’énergie cinétique L²/2J n’est pas conservée : ${K.fmt(Ec / Et, 2)} fois la valeur initiale. En ramenant les haltères, les bras fournissent un travail (ils tirent contre la tendance centrifuge des masses) ; en les écartant, ils en reçoivent.`;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now;
    if (anim !== null){ const d = anim - r, s = Math.sign(d) * Math.min(Math.abs(d), 0.6 * dt); r += s; rS.value = r; if (Math.abs(anim - r) < 1e-4){ r = anim; anim = null; } }
    phi += (L / J()) * dt; draw(); requestAnimationFrame(loop); })(performance.now());
};
