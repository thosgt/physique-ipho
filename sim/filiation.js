/* Simulation : filiation P → F → stable. N_P = N0 e^(−λ1 t), N_F = λ1 N0/(λ2 − λ1) (e^(−λ1 t) − e^(−λ2 t)).
   Activités A_P = λ1 N_P, A_F = λ2 N_F ; équilibre séculaire si λ2 ≫ λ1. */
window.SIMS['filiation'] = function(mount){
  const K = window.SimKit, C = K.C;
  let T1 = 10, T2 = 1, logv = false;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 360);
  K.slider(ctr, 'Demi-vie du père T₁', 0.5, 50, 0.5, T1, x => K.fmt(x, 1) + ' h', x => { T1 = x; draw(); });
  K.slider(ctr, 'Demi-vie du fils T₂', 0.1, 50, 0.1, T2, x => K.fmt(x, 1) + ' h', x => { T2 = x; draw(); });
  K.select(ctr, 'Grandeur tracée', [['A', 'activités'], ['N', 'nombres de noyaux']], v => { logv = v === 'N'; draw(); });
  const out = K.readout(ctr);
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const l1 = Math.LN2 / T1, l2 = Math.LN2 / T2, tmax = 5 * Math.max(T1, T2), N0 = 1000;
    const NP = t => N0 * Math.exp(-l1 * t), NF = t => Math.abs(l2 - l1) < 1e-9 ? N0 * l1 * t * Math.exp(-l1 * t) : l1 * N0 / (l2 - l1) * (Math.exp(-l1 * t) - Math.exp(-l2 * t)), NS = t => N0 - NP(t) - NF(t);
    const series = logv ? [[NP, C.red, 'père N_P'], [NF, C.blue, 'fils N_F'], [NS, C.green, 'descendant stable']] : [[t => l1 * NP(t), C.red, 'activité du père λ₁N_P'], [t => l2 * NF(t), C.blue, 'activité du fils λ₂N_F']];
    let ymax = 0; for (const [f] of series) for (let i = 0; i <= 200; i++) ymax = Math.max(ymax, f(tmax * i / 200));
    const A = K.axes(ctx, 60, 320, 620, 30, {xmin: 0, xmax: tmax, ymin: 0, ymax: ymax * 1.05, xticks: 5, yticks: 4, xfmt: v => K.fmt(v, 0), yfmt: v => K.fmt(v, logv ? 0 : 1), xlabel: 't (h)'});
    series.forEach(([f, col, lab], j) => { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 300; i++){ const t = tmax * i / 300; const X = A.sx(t), Y = A.sy(f(t)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); K.text(ctx, '— ' + lab, 380, 50 + 16 * j, {size: 11, bold: true, color: col}); });
    const regime = T2 < T1 / 5 ? '<b>équilibre séculaire</b> : après quelques T₂, les activités du père et du fils sont égales' : T2 < T1 ? 'équilibre transitoire : activité du fils un peu supérieure à celle du père' : 'pas d’équilibre : le fils vit plus longtemps que le père, il s’accumule';
    const tm = Math.abs(l2 - l1) < 1e-9 ? 1 / l1 : Math.log(l2 / l1) / (l2 - l1);
    out.innerHTML = `λ₁ = ${K.fmt(l1, 3)} h⁻¹ ; λ₂ = ${K.fmt(l2, 3)} h⁻¹<br>Le nombre de noyaux fils est maximal à t = ln(λ₂/λ₁)/(λ₂ − λ₁) = <b>${K.fmt(tm, 2)} h</b><br>${regime}<br>À t = ${K.fmt(tmax, 0)} h : A_F/A_P = ${K.fmt(l2 * NF(tmax) / (l1 * NP(tmax)), 3)}`;
  }
  draw();
};
