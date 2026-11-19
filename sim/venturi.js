/* Simulation : effet Venturi. Tube horizontal de diamètre d1, gorge de diamètre d2, débit Q réglable.
   Conservation du débit v = Q/S, Bernoulli P1 + ½ρv1² = P2 + ½ρv2² ; tubes piézométriques : h = (P − P0)/(ρg).
   Option « fluide réel » : perte de charge forfaitaire proportionnelle à ½ρv2² (coefficient 0,2) en aval de la gorge. */
window.SIMS['venturi'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81, rho = 1000, P0 = 1.013e5, Pvap = 2.3e3;
  let Q = 2.0, d2 = 2.5, Pin = 1.3e5, real = false;      // L/s, cm, pression amont (Pa)
  const d1 = 5.0;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  K.slider(ctr, 'Débit Q', 0.2, 6, 0.1, Q, v => K.fmt(v, 1) + ' L/s', v => { Q = v; });
  K.slider(ctr, 'Diamètre de la gorge d₂ (d₁ = 5,0 cm)', 1.0, 5.0, 0.1, d2, v => K.fmt(v, 1) + ' cm', v => { d2 = v; });
  K.slider(ctr, 'Pression amont P₁', 1.02e5, 2.0e5, 1e3, Pin, v => K.fmt(v / 1e5, 2) + ' bar', v => { Pin = v; });
  const lab = document.createElement('label'); lab.style.flexDirection = 'row'; lab.style.alignItems = 'center'; lab.style.gap = '6px';
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.addEventListener('change', () => { real = cb.checked; });
  lab.appendChild(cb); lab.appendChild(document.createTextNode('Fluide réel (perte de charge)')); ctr.appendChild(lab);
  const out = K.readout(ctr);
  let t0 = performance.now();
  function draw(){
    const S1 = Math.PI * (d1 / 200) ** 2, S2 = Math.PI * (d2 / 200) ** 2, q = Q / 1000;
    const v1 = q / S1, v2 = q / S2, P1 = Pin, P2 = P1 + 0.5 * rho * (v1 * v1 - v2 * v2), loss = real ? 0.2 * 0.5 * rho * v2 * v2 : 0, P3 = P1 - loss;
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const yc = 300, H1 = 60, H2 = 60 * d2 / d1;      // demi-hauteurs en px (échelle 24 px/cm)
    const xs = [40, 200, 270, 370, 440, 620];
    const top = `M${xs[0]} ${yc - H1} L${xs[1]} ${yc - H1} Q${(xs[1] + xs[2]) / 2} ${yc - H1} ${xs[2]} ${yc - H2} L${xs[3]} ${yc - H2} Q${(xs[3] + xs[4]) / 2} ${yc - H1} ${xs[4]} ${yc - H1} L${xs[5]} ${yc - H1}`;
    const bot = `L${xs[5]} ${yc + H1} L${xs[4]} ${yc + H1} Q${(xs[3] + xs[4]) / 2} ${yc + H1} ${xs[3]} ${yc + H2} L${xs[2]} ${yc + H2} Q${(xs[1] + xs[2]) / 2} ${yc + H1} ${xs[1]} ${yc + H1} L${xs[0]} ${yc + H1} Z`;
    const path = new Path2D(top + bot); ctx.fillStyle = 'rgba(90,169,255,0.4)'; ctx.fill(path); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke(path);
    // particules animées (vitesse ∝ v locale)
    const t = (performance.now() - t0) / 1000; ctx.fillStyle = C.blue;
    for (let i = 0; i < 24; i++){ const ph = ((t * v1 * 60 + i * 37) % 580); let x = 40 + ph; const yy = yc + (i % 6 - 2.5) * 14 * (x > 270 && x < 370 ? d2 / d1 : (x > 200 && x < 270 ? 1 - (1 - d2 / d1) * (x - 200) / 70 : x > 370 && x < 440 ? d2 / d1 + (1 - d2 / d1) * (x - 370) / 70 : 1));
      ctx.beginPath(); ctx.arc(x, yy, 2.5, 0, 7); ctx.fill(); }
    // tubes piézométriques
    const scale = 0.0009;   // px par Pa (hauteur d'eau : 1 m = 9810 Pa → ~8,8 px ... on amplifie)
    const tube = (x, P, lab) => { const h = (P - P0) / (rho * g); const hp = Math.max(-20, Math.min(220, h * 90)); ctx.fillStyle = '#f3f6fa'; ctx.fillRect(x - 9, 30, 18, yc - 30);
      ctx.fillStyle = 'rgba(90,169,255,0.6)'; ctx.fillRect(x - 9, yc - H1 - hp, 18, hp + H1); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(x - 9, 30, 18, yc - 30 - (x > 250 && x < 390 ? H2 : H1) + 0.5);
      ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 9, yc - H1 - hp); ctx.lineTo(x + 9, yc - H1 - hp); ctx.stroke();
      K.text(ctx, lab, x, 20, {size: 11, bold: true, align: 'center', color: C.ink}); K.text(ctx, K.fmt(h, 2) + ' m', x + 14, yc - H1 - hp - 8, {size: 10, color: C.blue}); return hp; };
    tube(120, P1, 'P₁'); tube(320, P2, 'P₂'); tube(530, P3, 'P₃');
    K.text(ctx, 'v₁ = ' + K.fmt(v1, 2) + ' m/s', 60, yc + H1 + 20, {size: 12, bold: true, color: C.blue});
    K.text(ctx, 'v₂ = ' + K.fmt(v2, 2) + ' m/s', 280, yc + H2 + 20, {size: 12, bold: true, color: C.blue});
    K.text(ctx, 'v₃ = v₁', 480, yc + H1 + 20, {size: 12, bold: true, color: C.blue});
    if (P2 < Pvap) K.text(ctx, 'P₂ < pression de vapeur : cavitation, le modèle ne tient plus', 320, 380, {size: 12, bold: true, color: C.red, align: 'center'});
    else if (P2 < P0) K.text(ctx, 'P₂ < P₀ : le tube central aspire (trompe à eau)', 320, 380, {size: 12, bold: true, color: C.amber, align: 'center'});
    out.innerHTML = `S₁ = ${K.fmt(S1 * 1e4, 1)} cm² ; S₂ = ${K.fmt(S2 * 1e4, 2)} cm²<br>v₁ = ${K.fmt(v1, 2)} m/s ; v₂ = v₁S₁/S₂ = <b>${K.fmt(v2, 2)} m/s</b><br>` +
      `P₁ = ${K.fmt(P1 / 1e5, 3)} bar<br>P₂ = P₁ − ½ρ(v₂² − v₁²) = <b>${K.fmt(P2 / 1e5, 3)} bar</b><br>Δh = (v₂² − v₁²)/2g = ${K.fmt((v2 * v2 - v1 * v1) / (2 * g), 3)} m<br>` + (real ? `Perte de charge : ${K.fmt(loss, 0)} Pa` : 'Fluide parfait : P₃ = P₁');
  }
  (function loop(){ if (!mount.isConnected) return; draw(); requestAnimationFrame(loop); })();
};
