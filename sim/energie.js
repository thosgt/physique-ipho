/* Simulation : énergie cinétique, quantité de mouvement et γ en fonction de β, relativiste et classique, pour une particule
   de masse donnée (électron, proton, 1 kg). */
window.SIMS['energie'] = function(mount){
  const K = window.SimKit, C = K.C;
  const P = {e: ['électron', 0.511, 'MeV'], p: ['proton', 938.3, 'MeV'], kg: ['masse de 1 kg', 8.988e16, 'J']};
  let part = 'e', beta = 0.6;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 400);
  K.select(ctr, 'Particule', Object.entries(P).map(([k, v]) => [k, v[0]]), v => { part = v; draw(); });
  K.slider(ctr, 'Vitesse β = v/c', 0, 0.999, 0.001, beta, x => K.fmt(x, 3) + ' c', x => { beta = x; draw(); });
  const out = K.readout(ctr);
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const [name, mc2, unit] = P[part], g = 1 / Math.sqrt(1 - beta * beta);
    const A = K.axes(ctx, 60, 350, 620, 30, {xmin: 0, xmax: 1, ymin: 0, ymax: 4, xticks: 5, yticks: 4, xfmt: v => K.fmt(v, 1), yfmt: v => K.fmt(v, 0), xlabel: 'β = v/c'});
    K.text(ctx, 'énergie cinétique / mc²', 60, 22, {size: 11, bold: true, color: C.ink});
    const plot = (f, col, w, dash) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); let st = false; for (let i = 0; i <= 400; i++){ const b = 0.9999 * i / 400, y = f(b); if (y > 4.3){ st = false; continue; } const X = A.sx(b), Y = A.sy(y); st ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); st = true; } ctx.stroke(); ctx.setLineDash([]); };
    plot(b => 1 / Math.sqrt(1 - b * b) - 1, C.blue, 3); plot(b => b * b / 2, C.red, 2, [6, 4]); plot(b => b / Math.sqrt(1 - b * b), C.green, 1.5, [2, 3]);
    K.text(ctx, '— E_c/mc² = γ − 1 (relativiste)', 80, 50, {size: 11, bold: true, color: C.blue}); K.text(ctx, '- - ½β² (classique)', 80, 66, {size: 11, bold: true, color: C.red}); K.text(ctx, '· · · p/(mc) = γβ', 80, 82, {size: 11, bold: true, color: C.green});
    ctx.strokeStyle = C.ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(A.sx(beta), A.sy(0)); ctx.lineTo(A.sx(beta), A.sy(4)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(A.sx(beta), A.sy(Math.min(4, g - 1)), 5, 0, 7); ctx.fill();
    ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(A.sx(1), A.sy(0)); ctx.lineTo(A.sx(1), A.sy(4)); ctx.stroke(); K.text(ctx, 'β = 1 : E_c → ∞', A.sx(1) - 6, A.sy(3.6), {size: 11, bold: true, color: C.amber, align: 'right'});
    const fmtE = v => unit === 'J' ? v.toExponential(2) + ' J' : (v >= 1000 ? K.fmt(v / 1000, 3) + ' GeV' : v >= 1 ? K.fmt(v, 3) + ' MeV' : K.fmt(v * 1000, 1) + ' keV');
    out.innerHTML = `${name} : mc² = ${fmtE(mc2)}<br>β = ${K.fmt(beta, 3)} → γ = <b>${K.fmt(g, 4)}</b><br>E = γmc² = ${fmtE(g * mc2)}<br>E_c = (γ−1)mc² = <b>${fmtE((g - 1) * mc2)}</b> (classique ½mv² : ${fmtE(beta * beta / 2 * mc2)})<br>pc = γβmc² = ${fmtE(g * beta * mc2)} ; vérif. E² − p²c² = (mc²)² ✓<br>Écart relativiste/classique : ${K.fmt(((g - 1) / (beta * beta / 2) - 1) * 100, 1)} %`;
  }
  draw();
};
