/* Simulation : deux pendules identiques (pulsation omega0 = sqrt(g/l)) reliés par un ressort faible (petits angles).
   Modes propres : symétrique (x1 = x2) à omega0, le ressort ne travaille pas ; antisymétrique (x1 = -x2) à sqrt(omega0² + 2k/m).
   En écartant un seul pendule on excite les deux modes : battements, l'énergie passe d'un pendule à l'autre en pi/(omega_a - omega_s). */
window.SIMS['pendules-couples'] = function(mount){
  const K = window.SimKit, C = K.C, w0 = 2 * Math.PI / 1.6;      // période propre 1,6 s
  let kap = 0.12, init = 'un', run = false, t = 0, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 420);
  K.slider(ctr, 'Couplage k/m (en unités de ω₀²)', 0.02, 1, 0.01, kap, v => K.fmt(v, 2), v => { kap = v; t = 0; });
  K.select(ctr, 'État initial', [['un', 'un seul pendule écarté'], ['sym', 'mode symétrique (écartés du même côté)'], ['anti', 'mode antisymétrique (écartés en sens opposés)']], v => { init = v; t = 0; run = true; });
  K.button(ctr, '▶ Lâcher', () => { t = 0; run = true; });
  K.button(ctr, 'Pause / reprise', () => { run = !run; }, true);
  const out = K.readout(ctr);
  const ws = () => w0, wa = () => w0 * Math.sqrt(1 + 2 * kap);
  function pos(tt){
    const A = 1, [a1, a2] = init === 'un' ? [A, 0] : init === 'sym' ? [A, A] : [A, -A];
    const s0 = (a1 + a2) / 2, d0 = (a1 - a2) / 2;
    const s = s0 * Math.cos(ws() * tt), d = d0 * Math.cos(wa() * tt), sv = -s0 * ws() * Math.sin(ws() * tt), dv = -d0 * wa() * Math.sin(wa() * tt);
    return {x1: s + d, x2: s - d, v1: sv + dv, v2: sv - dv};
  }
  // énergie de chaque pendule (sans le ressort), en unités de l'énergie initiale totale
  const en = (x, v) => 0.5 * (v * v / (w0 * w0) + x * x);
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const p = pos(t), L = 130, top = 30, x1c = 220, x2c = 420, th = 0.28;     // amplitude dessinée : 0,28 rad
    ctx.fillStyle = C.navy; ctx.fillRect(140, top - 8, 360, 8);
    const b1 = [x1c + L * Math.sin(th * p.x1), top + L * Math.cos(th * p.x1)], b2 = [x2c + L * Math.sin(th * p.x2), top + L * Math.cos(th * p.x2)];
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1c, top); ctx.lineTo(...b1); ctx.moveTo(x2c, top); ctx.lineTo(...b2); ctx.stroke();
    // ressort entre les deux masses (aux deux tiers du fil)
    const f = 0.62, s1 = [x1c + f * (b1[0] - x1c), top + f * (b1[1] - top)], s2 = [x2c + f * (b2[0] - x2c), top + f * (b2[1] - top)];
    const n = 16, dx = s2[0] - s1[0], dy = s2[1] - s1[1], Ls = Math.hypot(dx, dy), ux = dx / Ls, uy = dy / Ls;
    ctx.strokeStyle = C.amber; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(...s1);
    for (let i = 1; i < n; i++){ const q = i / n, o = (i % 2 ? 6 : -6); ctx.lineTo(s1[0] + dx * q - uy * o, s1[1] + dy * q + ux * o); } ctx.lineTo(...s2); ctx.stroke();
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(...b1, 13, 0, 7); ctx.fill(); ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(...b2, 13, 0, 7); ctx.fill();
    K.text(ctx, '1', b1[0], b1[1], {size: 12, bold: true, color: '#fff', align: 'center'}); K.text(ctx, '2', b2[0], b2[1], {size: 12, bold: true, color: '#fff', align: 'center'});
    // graphes : positions puis énergies
    const T0 = 24, t0 = Math.max(0, t - T0), t1 = Math.max(T0, t);
    const g1 = K.axes(ctx, 50, 270, 625, 195, {xmin: t0, xmax: t1, ymin: -2, ymax: 2, xticks: 4, yticks: [-1, 0, 1], xfmt: v => '', yfmt: v => v, grid: false});
    const g2 = K.axes(ctx, 50, 395, 625, 300, {xmin: t0, xmax: t1, ymin: 0, ymax: 1.05, xticks: 4, yticks: [0, 0.5, 1], xfmt: v => K.fmt(v, 0) + ' s', yfmt: v => K.fmt(v, 1), grid: false});
    K.text(ctx, 'positions x₁, x₂', 56, 190, {size: 11, color: C.ink}); K.text(ctx, 'énergies E₁, E₂ (part de l’énergie totale)', 56, 296, {size: 11, color: C.ink});
    const curve = (g, fn, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i <= 500; i++){ const tt = t0 + (t - t0) * i / 500; const y = fn(pos(tt)); i ? ctx.lineTo(g.sx(tt), g.sy(y)) : ctx.moveTo(g.sx(tt), g.sy(y)); } ctx.stroke(); };
    const Etot = init === 'un' ? 0.5 : 1;
    if (t > 0){
      curve(g1, q => q.x1, C.blue); curve(g1, q => q.x2, C.red);
      curve(g2, q => en(q.x1, q.v1) / Etot, C.blue); curve(g2, q => en(q.x2, q.v2) / Etot, C.red);
    }
    const Tb = 2 * Math.PI / (wa() - ws());
    out.innerHTML = `Mode symétrique : ω<sub>s</sub> = ω₀ (le ressort garde sa longueur), période ${K.fmt(2 * Math.PI / ws(), 2)} s.<br>` +
      `Mode antisymétrique : ω<sub>a</sub> = √(ω₀² + 2k/m) = ${K.fmt(wa() / w0, 3)} ω₀, période ${K.fmt(2 * Math.PI / wa(), 2)} s.<br>` +
      (init === 'un' ? `Un seul pendule écarté : les deux modes sont excités à parts égales. L’énergie passe entièrement d’un pendule à l’autre et revient : <b>période des battements 2π/(ω<sub>a</sub> − ω<sub>s</sub>) = ${K.fmt(Tb, 1)} s</b> ; transfert complet en ${K.fmt(Tb / 2, 1)} s. Plus le couplage est faible, plus le transfert est lent.`
        : init === 'sym' ? 'Mode propre symétrique : les deux pendules oscillent ensemble à ω₀, sans échange d’énergie.' : 'Mode propre antisymétrique : oscillation à une seule pulsation, plus rapide, sans échange d’énergie.');
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) t += dt; draw(); requestAnimationFrame(loop); })(performance.now());
};
