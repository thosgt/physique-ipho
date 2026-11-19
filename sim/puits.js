/* Simulation : particule dans un puits infini de largeur L. E_n = n² h²/(8 m L²) ; ψ_n ∝ sin(nπx/L) ; |ψ_n|².
   Transition n → p : photon λ = hc/(E_n − E_p). */
window.SIMS['puits'] = function(mount){
  const K = window.SimKit, C = K.C, h = 6.626e-34, c = 2.998e8, eV = 1.602e-19;
  const M = {e: ['électron', 9.109e-31], p: ['proton', 1.673e-27]};
  let part = 'e', L = 1.0, n = 2, show = 'psi', p = 1;   // L en nm
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  K.select(ctr, 'Particule', [['e', 'électron'], ['p', 'proton']], v => { part = v; draw(); });
  K.slider(ctr, 'Largeur du puits L', 0.2, 3, 0.05, L, x => K.fmt(x, 2) + ' nm', x => { L = x; draw(); });
  K.slider(ctr, 'État n', 1, 6, 1, n, x => 'n = ' + x, x => { n = x; draw(); });
  K.select(ctr, 'Tracer', [['psi', 'fonction d’onde ψₙ'], ['prob', 'densité de probabilité |ψₙ|²']], v => { show = v; draw(); });
  const out = K.readout(ctr);
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const m = M[part][1], E = k => k * k * h * h / (8 * m * (L * 1e-9) ** 2) / eV, Emax = E(6.5);
    const x0 = 140, x1 = 500, yb = 370, yt = 30, Y = e => yb - e / Emax * (yb - yt);
    ctx.fillStyle = '#e8ecf5'; ctx.fillRect(x0 - 30, yt, 30, yb - yt); ctx.fillRect(x1, yt, 30, yb - yt);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, yt); ctx.lineTo(x0, yb); ctx.lineTo(x1, yb); ctx.lineTo(x1, yt); ctx.stroke();
    for (let k = 1; k <= 6; k++){ const yy = Y(E(k)); ctx.strokeStyle = k === n ? C.red : '#8a94a6'; ctx.lineWidth = k === n ? 2 : 1; ctx.setLineDash(k === n ? [] : [4, 3]); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); ctx.setLineDash([]);
      K.text(ctx, 'n=' + k + '  ' + (E(k) < 0.1 ? (E(k) * 1000).toFixed(1) + ' meV' : K.fmt(E(k), 2) + ' eV'), x0 - 36, yy + 4, {size: 10, align: 'right', color: k === n ? C.red : C.ink}); }
    const amp = 0.45 * (Y(E(Math.max(1, n - 1))) - Y(E(n + 1))) / 2 + 12;
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i <= 300; i++){ const u = i / 300, s = Math.sin(n * Math.PI * u), v = show === 'psi' ? s : s * s; const X = x0 + u * (x1 - x0), yy = Y(E(n)) - v * amp; i ? ctx.lineTo(X, yy) : ctx.moveTo(X, yy); }
    ctx.stroke();
    if (show === 'prob'){ ctx.fillStyle = 'rgba(43,108,176,0.15)'; ctx.beginPath(); ctx.moveTo(x0, Y(E(n))); for (let i = 0; i <= 300; i++){ const u = i / 300; ctx.lineTo(x0 + u * (x1 - x0), Y(E(n)) - Math.sin(n * Math.PI * u) ** 2 * amp); } ctx.lineTo(x1, Y(E(n))); ctx.fill(); }
    K.text(ctx, 'L = ' + K.fmt(L, 2) + ' nm', (x0 + x1) / 2, yb + 18, {size: 11, align: 'center', color: C.ink});
    const dE = E(n) - E(1);
    out.innerHTML = `${M[part][0]} ; E₁ = h²/(8mL²) = <b>${E(1) < 0.1 ? (E(1) * 1000).toFixed(2) + ' meV' : K.fmt(E(1), 3) + ' eV'}</b><br>E_n = n² E₁ : E_${n} = ${K.fmt(E(n), 3)} eV<br>λ de de Broglie dans l’état n : 2L/n = ${K.fmt(2 * L / n, 2)} nm (${n} demi-longueurs d’onde)<br>` + (n > 1 ? `Transition ${n} → 1 : photon de ${K.fmt(dE, 3)} eV, λ = <b>${dE > 0 ? K.fmt(1240 / dE, 0) + ' nm' : '—'}</b><br>` : '') + `${n - 1} nœud${n > 2 ? 's' : ''} à l’intérieur ; probabilité nulle aux bords. Diviser L par 2 multiplie les énergies par 4.`;
  }
  draw();
};
