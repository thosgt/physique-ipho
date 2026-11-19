/* Simulation : niveaux d'énergie d'un atome hydrogénoïde (E_n = −13,6 Z²/n² eV) et spectre d'émission.
   On choisit le niveau de départ ; une cascade aléatoire (vers un niveau inférieur choisi au hasard) ou une transition
   choisie ; les raies émises s'accumulent sur le spectre (λ = 1240/ΔE nm). */
window.SIMS['niveaux'] = function(mount){
  const K = window.SimKit, C = K.C;
  let Z = 1, nStart = 4, lines = {}, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  K.select(ctr, 'Atome', [['1', 'Hydrogène (Z = 1)'], ['2', 'Ion He⁺ (Z = 2)'], ['3', 'Ion Li²⁺ (Z = 3)']], v => { Z = +v; lines = {}; last = null; draw(); });
  K.slider(ctr, 'Niveau excité de départ n', 2, 7, 1, nStart, x => 'n = ' + x, x => { nStart = x; draw(); });
  K.button(ctr, 'Exciter puis laisser se désexciter (cascade aléatoire)', () => { let n = nStart; const path = []; while (n > 1){ const p = 1 + Math.floor(Math.random() * (n - 1)); path.push([n, p]); n = p; } path.forEach(([a, b]) => { const k = a + '-' + b; lines[k] = (lines[k] || 0) + 1; }); last = path; draw(); });
  K.button(ctr, 'Effacer le spectre', () => { lines = {}; last = null; draw(); }, true);
  const out = K.readout(ctr);
  const E = n => -13.6 * Z * Z / (n * n);
  function color(w){ if (w < 400 || w > 750) return null; if (w < 440) return '#6a3fff'; if (w < 490) return '#3b5bdb'; if (w < 510) return '#1fa3b3'; if (w < 580) return '#2fa84f'; if (w < 645) return '#e0a010'; return '#d62728'; }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const E1 = E(1), y = e => 40 + (e / E1) * 230;   // E=0 → 40 ; E1 → 270
    ctx.strokeStyle = '#8a94a6'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(80, 40); ctx.lineTo(330, 40); ctx.stroke(); ctx.setLineDash([]); K.text(ctx, '0 (ionisation)', 76, 44, {size: 10, align: 'right', color: C.ink});
    for (let n = 1; n <= 7; n++){ ctx.strokeStyle = n === nStart ? C.red : C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(80, y(E(n))); ctx.lineTo(330, y(E(n))); ctx.stroke(); if (n <= 3 || n === nStart) K.text(ctx, 'n=' + n + '  ' + K.fmt(E(n), 2) + ' eV', 76, y(E(n)) + 4, {size: 10, align: 'right', color: n === nStart ? C.red : C.ink}); }
    if (last) last.forEach(([a, b], i) => { const w = 1240 / (E(a) - E(b)), col = color(w) || '#5f6b80', x = 110 + i * 40; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y(E(a))); ctx.lineTo(x, y(E(b)) - 6); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y(E(b))); ctx.lineTo(x - 5, y(E(b)) - 9); ctx.lineTo(x + 5, y(E(b)) - 9); ctx.fill(); K.text(ctx, K.fmt(w, 0) + ' nm', x + 4, (y(E(a)) + y(E(b))) / 2, {size: 10, bold: true, color: col}); });
    // spectre : axe log en longueur d'onde de 50 à 5000 nm
    const x0 = 360, x1 = 630, lmin = Math.log10(Math.min(80 / (Z * Z), 50)), lmax = Math.log10(5000), X = w => x0 + (Math.log10(w) - lmin) / (lmax - lmin) * (x1 - x0);
    ctx.fillStyle = '#15213a'; ctx.fillRect(x0, 60, x1 - x0, 60);
    for (let w = 400; w <= 750; w += 5){ const c = color(w); ctx.fillStyle = c; ctx.globalAlpha = 0.25; ctx.fillRect(X(w), 60, X(w + 5) - X(w) + 1, 60); } ctx.globalAlpha = 1;
    Object.entries(lines).forEach(([k, cnt]) => { const [a, b] = k.split('-').map(Number), w = 1240 / (E(a) - E(b)); if (w < Math.pow(10, lmin) || w > 5000) return; ctx.fillStyle = color(w) || '#ffffff'; ctx.globalAlpha = Math.min(1, 0.4 + 0.15 * cnt); ctx.fillRect(X(w) - 1, 60, 3, 60); ctx.globalAlpha = 1; });
    [100, 400, 750, 2000].forEach(w => { if (w < Math.pow(10, lmin)) return; ctx.fillStyle = C.ink; ctx.fillRect(X(w), 120, 1, 6); K.text(ctx, w + ' nm', X(w), 140, {size: 10, align: 'center', color: C.ink}); });
    K.text(ctx, 'spectre d’émission (échelle log en λ)', x0, 50, {size: 11, bold: true, color: C.ink});
    K.text(ctx, 'UV', x0 + 10, 160, {size: 10, color: C.ink}); K.text(ctx, 'visible', X(520), 160, {size: 10, color: C.ink, align: 'center'}); K.text(ctx, 'IR', x1 - 20, 160, {size: 10, color: C.ink});
    // tableau des séries
    const ser = [[1, 'Lyman'], [2, 'Balmer'], [3, 'Paschen']];
    let txt = ''; ser.forEach(([p, nm]) => { const ws = []; for (let n = p + 1; n <= Math.min(p + 4, 7); n++) ws.push(K.fmt(1240 / (E(n) - E(p)), 0)); txt += `${nm} (→ n=${p}) : ${ws.join(', ')} nm<br>`; });
    out.innerHTML = `E_n = −13,6 × ${Z * Z} / n² eV<br>Énergie d’ionisation : ${K.fmt(-E(1), 1)} eV<br>${txt}` + (last ? `Dernière cascade : ${last.map(([a, b]) => a + '→' + b).join(', ')}` : 'Cliquez sur « Exciter » plusieurs fois pour remplir le spectre.');
  }
  draw();
};
