/* Simulation : courbe d'Aston (énergie de liaison par nucléon) et bilan énergétique d'une réaction de fission ou de fusion.
   Énergies de liaison : valeurs tabulées (AME 2020, arrondies) pour les noyaux des réactions proposées.
   Q = Σ E_ℓ(produits) − Σ E_ℓ(réactifs) (les neutrons libres ont E_ℓ = 0). */
window.SIMS['aston'] = function(mount){
  const K = window.SimKit, C = K.C;
  const BE = {'n': [1, 0], '¹H': [1, 0], '²H': [2, 2.224], '³H': [3, 8.482], '³He': [3, 7.718], '⁴He': [4, 28.296], '⁶Li': [6, 31.994], '⁷Li': [7, 39.245], '¹²C': [12, 92.162], '¹⁶O': [16, 127.619], '⁵⁶Fe': [56, 492.254],
    '²³⁵U': [235, 1783.87], '²³⁶U': [236, 1790.41], '¹⁴⁰Xe': [140, 1160.0], '⁹⁴Sr': [94, 807.8], '¹⁴¹Ba': [141, 1173.98], '⁹²Kr': [92, 783.18], '²³⁹Pu': [239, 1806.92], '¹³⁴Te': [134, 1123.4], '¹⁰³Zr': [103, 873.3]};
  const R = {
    dt: ['Fusion D + T → ⁴He + n', ['²H', '³H'], ['⁴He', 'n']],
    dd: ['Fusion D + D → ³He + n', ['²H', '²H'], ['³He', 'n']],
    li: ['Fusion ⁶Li + D → 2 ⁴He', ['⁶Li', '²H'], ['⁴He', '⁴He']],
    pp: ['Bilan solaire 4 ¹H → ⁴He (+ 2e⁺, 2ν)', ['¹H', '¹H', '¹H', '¹H'], ['⁴He']],
    ucx: ['Fission n + ²³⁵U → ¹⁴⁰Xe + ⁹⁴Sr + 2n', ['n', '²³⁵U'], ['¹⁴⁰Xe', '⁹⁴Sr', 'n', 'n']],
    uba: ['Fission n + ²³⁵U → ¹⁴¹Ba + ⁹²Kr + 3n', ['n', '²³⁵U'], ['¹⁴¹Ba', '⁹²Kr', 'n', 'n', 'n']],
    pu: ['Fission n + ²³⁹Pu → ¹³⁴Te + ¹⁰³Zr + 3n', ['n', '²³⁹Pu'], ['¹³⁴Te', '¹⁰³Zr', 'n', 'n', 'n']]
  };
  let r = 'dt';
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.select(ctr, 'Réaction', Object.entries(R).map(([k, v]) => [k, v[0]]), v => { r = v; draw(); });
  const out = K.readout(ctr);
  function bw(A){ const Z = Math.round(A / (2 + 0.0157 * A ** (2 / 3))); return (15.75 * A - 17.8 * A ** (2 / 3) - 0.711 * Z * (Z - 1) / A ** (1 / 3) - 23.7 * (A - 2 * Z) ** 2 / A) / A; }
  const light = [[2, 1.112], [3, 2.573], [4, 7.074], [6, 5.332], [7, 5.606], [9, 6.463], [12, 7.680], [14, 7.476], [16, 7.976], [20, 8.032], [24, 8.261], [28, 8.448], [32, 8.493], [40, 8.551], [48, 8.723], [56, 8.790], [62, 8.795]];
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const A = K.axes(ctx, 60, 340, 620, 30, {xmin: 0, xmax: 250, ymin: 0, ymax: 9.5, xticks: 5, yticks: 4, xfmt: v => K.fmt(v, 0), yfmt: v => K.fmt(v, 0), xlabel: 'nombre de masse A'});
    K.text(ctx, 'E_ℓ / A (MeV par nucléon)', 64, 22, {size: 11, bold: true, color: C.ink});
    const pts = light.concat([...Array(19)].map((_, i) => [70 + 10 * i, bw(70 + 10 * i)]));
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach(([a, e], i) => { const X = A.sx(a), Y = A.sy(e); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke();
    const [name, reac, prod] = R[r];
    const mark = (k, col) => { if (k === 'n' || k === '¹H') return; const [a, b] = BE[k]; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(A.sx(a), A.sy(b / a), 6, 0, 7); ctx.fill(); K.text(ctx, k, A.sx(a) + 8, A.sy(b / a) + (col === C.red ? -8 : 16), {size: 12, bold: true, color: col}); };
    reac.forEach(k => mark(k, C.red)); prod.forEach(k => mark(k, C.green));
    const sum = ks => ks.reduce((s, k) => s + BE[k][1], 0), Q = sum(prod) - sum(reac), nuc = reac.reduce((s, k) => s + BE[k][0], 0);
    K.text(ctx, '● réactifs', 420, 260, {size: 12, bold: true, color: C.red}); K.text(ctx, '● produits', 420, 278, {size: 12, bold: true, color: C.green});
    K.text(ctx, 'Q = ' + K.fmt(Q, 1) + ' MeV', 420, 304, {size: 14, bold: true, color: C.ink});
    out.innerHTML = `${name}<br>Σ E_ℓ réactifs = ${K.fmt(sum(reac), 1)} MeV<br>Σ E_ℓ produits = ${K.fmt(sum(prod), 1)} MeV<br>Énergie libérée Q = <b>${K.fmt(Q, 1)} MeV</b><br>Par nucléon : ${K.fmt(Q / nuc, 2)} MeV<br>Par kg de réactifs : ${(Q * 1.602e-13 / (nuc * 1.6605e-27)).toExponential(2)} J/kg<br>(combustion du pétrole : 4,2 × 10⁷ J/kg)`;
  }
  draw();
};
