/* Simulation : développements limités. Fonction au choix, approximations d'ordre 1, 2, 3 ; zone où l'erreur relative < 1 %. */
window.SIMS['dl'] = function(mount){
  const K = window.SimKit, C = K.C;
  const F = {
    sin: ['sin x', Math.sin, [x => x, x => x, x => x - x ** 3 / 6], ['x', 'x', 'x − x³/6']],
    cos: ['cos x', Math.cos, [x => 1, x => 1 - x * x / 2, x => 1 - x * x / 2], ['1', '1 − x²/2', '1 − x²/2']],
    exp: ['eˣ', Math.exp, [x => 1 + x, x => 1 + x + x * x / 2, x => 1 + x + x * x / 2 + x ** 3 / 6], ['1 + x', '1 + x + x²/2', '1 + x + x²/2 + x³/6']],
    sqrt: ['√(1+x)', x => Math.sqrt(1 + x), [x => 1 + x / 2, x => 1 + x / 2 - x * x / 8, x => 1 + x / 2 - x * x / 8 + x ** 3 / 16], ['1 + x/2', '1 + x/2 − x²/8', '1 + x/2 − x²/8 + x³/16']],
    inv: ['1/(1+x)', x => 1 / (1 + x), [x => 1 - x, x => 1 - x + x * x, x => 1 - x + x * x - x ** 3], ['1 − x', '1 − x + x²', '1 − x + x² − x³']],
    ln: ['ln(1+x)', x => Math.log(1 + x), [x => x, x => x - x * x / 2, x => x - x * x / 2 + x ** 3 / 3], ['x', 'x − x²/2', 'x − x²/2 + x³/3']],
    inv2: ['1/(1+x)²', x => 1 / (1 + x) ** 2, [x => 1 - 2 * x, x => 1 - 2 * x + 3 * x * x, x => 1 - 2 * x + 3 * x * x - 4 * x ** 3], ['1 − 2x', '1 − 2x + 3x²', '1 − 2x + 3x² − 4x³']]
  };
  let fn = 'sin', ord = 1, x0 = 0.5;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.select(ctr, 'Fonction', Object.entries(F).map(([k, v]) => [k, v[0]]), v => { fn = v; draw(); });
  K.select(ctr, 'Ordre du développement', [['1', 'ordre 1'], ['2', 'ordre 2'], ['3', 'ordre 3']], v => { ord = +v; draw(); });
  K.slider(ctr, 'Valeur de x', 0.01, 1.5, 0.01, x0, v => K.fmt(v, 2) + (fn === 'sin' || fn === 'cos' ? ' rad = ' + K.fmt(v * 180 / Math.PI, 0) + '°' : ''), v => { x0 = v; draw(); });
  const out = K.readout(ctr);
  function draw(){
    const [name, f, apps, labs] = F[fn], g = apps[ord - 1];
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const xmax = 1.6, ys = []; for (let i = 0; i <= 80; i++){ const x = xmax * i / 80; ys.push(f(x), g(x)); }
    const ymin = Math.min(0, ...ys.filter(isFinite)), ymax = Math.min(6, Math.max(...ys.filter(isFinite))) * 1.05;
    const A = K.axes(ctx, 50, 320, 620, 30, {xmin: 0, xmax, ymin, ymax, xticks: 8, yticks: 5, xfmt: v => K.fmt(v, 1), yfmt: v => K.fmt(v, 1), xlabel: 'x'});
    const plot = (h, col, w, dash) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); let st = false; for (let i = 0; i <= 160; i++){ const x = xmax * i / 160, y = h(x); if (!isFinite(y) || y > ymax * 1.2){ st = false; continue; } const X = A.sx(x), Y = A.sy(y); st ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); st = true; } ctx.stroke(); ctx.setLineDash([]); };
    // zone à 1 %
    let x1 = 0; for (let x = 0; x <= xmax; x += 0.002){ if (Math.abs(g(x) - f(x)) / Math.abs(f(x)) > 0.01){ x1 = x; break; } x1 = x; }
    ctx.fillStyle = 'rgba(31,138,76,0.12)'; ctx.fillRect(A.sx(0), A.sy(ymax), A.sx(x1) - A.sx(0), A.sy(ymin) - A.sy(ymax));
    K.text(ctx, 'erreur < 1 % jusqu’à x = ' + K.fmt(x1, 2), A.sx(0) + 6, A.sy(ymax) + 14, {size: 11, bold: true, color: C.green});
    plot(f, C.blue, 3); plot(g, C.red, 2, [6, 4]);
    const X = A.sx(x0); ctx.strokeStyle = C.ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X, A.sy(ymin)); ctx.lineTo(X, A.sy(ymax)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(X, A.sy(f(x0)), 4, 0, 7); ctx.fill(); ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(X, A.sy(g(x0)), 4, 0, 7); ctx.fill();
    K.text(ctx, '— ' + name, 420, 50, {size: 12, bold: true, color: C.blue}); K.text(ctx, '- - ' + labs[ord - 1], 420, 68, {size: 12, bold: true, color: C.red});
    const err = (g(x0) - f(x0)) / f(x0);
    out.innerHTML = `x = ${K.fmt(x0, 3)}<br>${name} = <b>${K.fmt(f(x0), 4)}</b><br>DL ordre ${ord} : ${labs[ord - 1]} = <b>${K.fmt(g(x0), 4)}</b><br>Erreur relative : ${K.fmt(err * 100, 2)} %<br>Erreur < 1 % pour x < ${K.fmt(x1, 2)}${fn === 'sin' || fn === 'cos' ? ' (' + K.fmt(x1 * 180 / Math.PI, 0) + '°)' : ''}`;
  }
  draw();
};
