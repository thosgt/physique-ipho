/* Simulation : deux bulles de savon reliées par un tube (expérience classique de la pression de Laplace).
   Surpression dans une bulle de savon (deux interfaces) : ΔP = 4γ/R. Quand on ouvre le robinet, l'air va de la
   bulle où la pression est la plus forte (la plus petite) vers l'autre. Le volume total est conservé (ΔP ≪ P0). */
window.SIMS['bulles'] = function(mount){
  const K = window.SimKit, C = K.C, gam = 0.025, rt = 0.4;   // N/m (eau savonneuse), rayon du tube (cm)
  let R10 = 1.2, R20 = 2.0, R1 = R10, R2 = R20, open = false, done = '';
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Rayon initial de la bulle de gauche', 0.6, 3, 0.1, R10, v => K.fmt(v, 1) + ' cm', v => { R10 = v; reset(); });
  K.slider(ctr, 'Rayon initial de la bulle de droite', 0.6, 3, 0.1, R20, v => K.fmt(v, 1) + ' cm', v => { R20 = v; reset(); });
  const bo = K.button(ctr, '▶ Ouvrir le robinet', () => { open = !open; bo.textContent = open ? 'Fermer le robinet' : '▶ Ouvrir le robinet'; });
  K.button(ctr, 'Recommencer', reset, true);
  const out = K.readout(ctr);
  function reset(){ R1 = R10; R2 = R20; open = false; done = ''; bo.textContent = '▶ Ouvrir le robinet'; }
  const V = R => 4 / 3 * Math.PI * R ** 3, Rof = v => Math.cbrt(3 * v / (4 * Math.PI));
  const dP = R => 4 * gam / (R * 1e-2);   // Pa
  let last = null;
  function step(now){
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (!open || done) return;
    const flow = 0.004 * (dP(R1) - dP(R2)) * dt * 60;     // cm³ transférés de 1 vers 2 (vitesse arbitraire)
    let v1 = V(R1) - flow, v2 = V(R2) + flow;
    if (Rof(Math.max(v1, 1e-6)) <= rt){ const tot = V(R1) + V(R2); R1 = rt; R2 = Rof(tot - V(rt)); done = 'gauche'; return; }
    if (Rof(Math.max(v2, 1e-6)) <= rt){ const tot = V(R1) + V(R2); R2 = rt; R1 = Rof(tot - V(rt)); done = 'droite'; return; }
    R1 = Rof(v1); R2 = Rof(v2);
    if (Math.abs(R1 - R2) < 1e-3){ done = 'egal'; }
  }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const sc = 30, yc = 215, xa = 170, xb = 470;     // px par cm
    // tube
    ctx.fillStyle = '#e9eef5'; ctx.fillRect(xa, yc + 40, xb - xa, 16); ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.strokeRect(xa, yc + 40, xb - xa, 16);
    ctx.fillRect(xa - 8, yc, 16, 56); ctx.strokeRect(xa - 8, yc, 16, 56); ctx.fillRect(xb - 8, yc, 16, 56); ctx.strokeRect(xb - 8, yc, 16, 56);
    ctx.fillStyle = '#e9eef5'; ctx.fillRect(xa - 6, yc + 40, 12, 16); ctx.fillRect(xb - 6, yc + 40, 12, 16);
    // robinet
    const xm = (xa + xb) / 2; ctx.fillStyle = open ? C.green : C.red; ctx.beginPath(); ctx.arc(xm, yc + 48, 11, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); if (open){ ctx.moveTo(xm - 8, yc + 48); ctx.lineTo(xm + 8, yc + 48); } else { ctx.moveTo(xm, yc + 40); ctx.lineTo(xm, yc + 56); } ctx.stroke();
    K.text(ctx, open ? 'ouvert' : 'fermé', xm, yc + 74, {size: 11, color: C.ink, align: 'center'});
    // bulles (posées au-dessus des embouchures)
    const bub = (x, R, lab) => {
      const rp = R * sc, w = rt * sc, cy = yc - Math.sqrt(Math.max(0, rp * rp - w * w));
      const gr = ctx.createRadialGradient(x - rp * 0.4, cy - rp * 0.4, rp * 0.1, x, cy, rp);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.6, 'rgba(160,200,255,0.25)'); gr.addColorStop(1, 'rgba(200,120,220,0.35)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, cy, rp, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(90,110,160,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
      K.text(ctx, lab + ' : R = ' + K.fmt(R, 2) + ' cm', x, 338, {size: 12, bold: true, color: C.navy, align: 'center'});
      K.text(ctx, 'ΔP = 4γ/R = ' + K.fmt(dP(R), 1) + ' Pa', x, 358, {size: 12, color: C.red, align: 'center'});
    };
    bub(xa, R1, 'gauche'); bub(xb, R2, 'droite');
    if (open && !done){ const dir = dP(R1) > dP(R2) ? 1 : -1; ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xm - 50 * dir, yc + 90); ctx.lineTo(xm + 50 * dir, yc + 90); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xm + 50 * dir, yc + 90); ctx.lineTo(xm + 40 * dir, yc + 84); ctx.lineTo(xm + 40 * dir, yc + 96); ctx.fillStyle = C.blue; ctx.fill(); K.text(ctx, 'air', xm, yc + 104, {size: 11, color: C.blue, align: 'center'}); }
    let msg = 'La plus petite bulle a la plus forte surpression : à l’ouverture, elle se vide dans la grande.';
    if (done === 'gauche' || done === 'droite') msg = 'La petite bulle s’est vidée jusqu’à n’être plus qu’une calotte sur l’embouchure du tube.';
    if (done === 'egal' || Math.abs(R10 - R20) < 0.05) msg = 'Deux bulles égales sont en équilibre… instable : la moindre différence s’amplifie.';
    K.text(ctx, msg, 320, 24, {size: 12, color: C.navy, align: 'center'});
    out.innerHTML = `Bulle de savon (deux interfaces liquide-air) : P<sub>int</sub> − P<sub>ext</sub> = 4γ/R, avec γ = ${K.fmt(gam * 1000, 0)} mN/m.<br>` +
      `Gauche : ΔP = <b>${K.fmt(dP(R1), 1)} Pa</b> · Droite : ΔP = <b>${K.fmt(dP(R2), 1)} Pa</b><br>` +
      `Volume total conservé : ${K.fmt(V(R1) + V(R2), 1)} cm³ (la surpression, quelques pascals, est négligeable devant P₀ = 10⁵ Pa).`;
  }
  (function loop(now){ if (!mount.isConnected) return; step(now); draw(); requestAnimationFrame(loop); })(performance.now());
};
