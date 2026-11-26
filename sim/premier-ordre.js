/* Simulation : réponse d'un système du premier ordre, y = y∞ + (y0 − y∞) e^(−t/τ).
   Lectures de τ : tangente à l'origine qui coupe l'asymptote en τ, 63 % du chemin à t = τ, régime établi après 5τ. */
window.SIMS['premier-ordre'] = function(mount){
  const K = window.SimKit, C = K.C, T = 10;
  let tau = 1.5, y0 = 0, yf = 8, cmp = false, t = 0, run = true, last = 0;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  const pre = K.select(ctr, 'Situation', [['charge', 'Charge d’un condensateur (0 → 8 V)'], ['decharge', 'Décharge (8 V → 0)'], ['libre', 'Réglage libre']], v => {
    if (v === 'charge'){ y0 = 0; yf = 8; } else if (v === 'decharge'){ y0 = 8; yf = 0; } s0.value = y0; sf.value = yf; t = 0; run = true; });
  const sT = K.slider(ctr, 'Constante de temps τ', 0.2, 3, 0.05, tau, v => K.fmt(v, 2) + ' s', v => { tau = v; t = 0; run = true; });
  const s0 = K.slider(ctr, 'Valeur initiale y₀', 0, 10, 0.5, y0, v => K.fmt(v, 1), v => { y0 = v; pre.value = 'libre'; t = 0; run = true; });
  const sf = K.slider(ctr, 'Valeur finale y∞', 0, 10, 0.5, yf, v => K.fmt(v, 1), v => { yf = v; pre.value = 'libre'; t = 0; run = true; });
  const lab = document.createElement('label'); lab.style.flexDirection = 'row'; lab.style.alignItems = 'center'; lab.style.gap = '6px';
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.addEventListener('change', () => { cmp = cb.checked; }); lab.appendChild(cb); lab.appendChild(document.createTextNode('Comparer avec 2τ')); ctr.appendChild(lab);
  K.button(ctr, 'Rejouer', () => { t = 0; run = true; }, true);
  const out = K.readout(ctr);
  const y = (u, ta) => yf + (y0 - yf) * Math.exp(-u / ta);
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const A = K.axes(ctx, 50, 325, 625, 20, {xmin: 0, xmax: T, ymin: 0, ymax: 10.5, xticks: 10, yticks: 7, xfmt: u => K.fmt(u, 0), yfmt: u => K.fmt(u, 1), xlabel: 't (s)'});
    // régime établi
    if (5 * tau < T){ ctx.fillStyle = 'rgba(31,138,76,0.08)'; ctx.fillRect(A.sx(5 * tau), 20, A.sx(T) - A.sx(5 * tau), 305); K.text(ctx, 'régime établi (> 5τ)', Math.min(A.sx(5 * tau) + 6, 520), 34, {size: 11, color: C.green}); }
    ctx.strokeStyle = C.green; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(50, A.sy(yf)); ctx.lineTo(625, A.sy(yf)); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, 'y∞', 604, A.sy(yf) - 9, {size: 11, color: C.green, bold: true});
    if (y0 !== yf){
      // tangente à l'origine
      ctx.strokeStyle = C.amber; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(A.sx(0), A.sy(y0)); ctx.lineTo(A.sx(tau * 1.15), A.sy(y0 + (yf - y0) * 1.15)); ctx.stroke();
      ctx.strokeStyle = C.amber; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(A.sx(tau), A.sy(0)); ctx.lineTo(A.sx(tau), A.sy(yf)); ctx.stroke(); ctx.setLineDash([]);
      K.text(ctx, 'τ', A.sx(tau), 338, {size: 12, color: C.amber, bold: true, align: 'center'});
      const y63 = y(tau, tau); ctx.strokeStyle = C.blue; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(50, A.sy(y63)); ctx.lineTo(A.sx(tau), A.sy(y63)); ctx.stroke(); ctx.setLineDash([]);
      K.text(ctx, '63 %', 54, A.sy(y63) - 8, {size: 11, color: C.blue, bold: true});
    }
    if (cmp){ ctx.strokeStyle = C.sky; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 300; i++){ const u = T * i / 300; i ? ctx.lineTo(A.sx(u), A.sy(y(u, 2 * tau))) : ctx.moveTo(A.sx(u), A.sy(y(u, 2 * tau))); } ctx.stroke(); K.text(ctx, '2τ', A.sx(2.2 * tau), A.sy(y(2.2 * tau, 2 * tau)) + 14, {size: 11, color: C.sky, bold: true}); }
    ctx.strokeStyle = C.light; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 300; i++){ const u = T * i / 300; i ? ctx.lineTo(A.sx(u), A.sy(y(u, tau))) : ctx.moveTo(A.sx(u), A.sy(y(u, tau))); } ctx.stroke();
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2.8; ctx.beginPath(); for (let i = 0; i <= 300; i++){ const u = T * i / 300; if (u > t) break; i ? ctx.lineTo(A.sx(u), A.sy(y(u, tau))) : ctx.moveTo(A.sx(u), A.sy(y(u, tau))); } ctx.stroke();
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(A.sx(t), A.sy(y(t, tau)), 4.5, 0, 7); ctx.fill();
    const frac = y0 === yf ? 1 : 1 - Math.exp(-t / tau);
    out.innerHTML = `Équation : ${K.fmt(tau, 2)} dy/dt + y = ${K.fmt(yf, 1)}<br>t = ${K.fmt(t, 2)} s = ${K.fmt(t / tau, 2)} τ<br>y(t) = <b>${K.fmt(y(t, tau), 2)}</b><br>Chemin parcouru : ${K.fmt(frac * 100, 0)} %<br>t½ = τ ln 2 = ${K.fmt(tau * Math.LN2, 2)} s ; 99 % à ${K.fmt(4.6 * tau, 1)} s`;
  }
  (function loop(now){ if (!mount.isConnected) return; const d = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (run){ t += d * 2; if (t >= T){ t = T; run = false; } } draw(); requestAnimationFrame(loop); })(performance.now());
};
