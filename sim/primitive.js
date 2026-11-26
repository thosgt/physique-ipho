/* Simulation : l'aire sous v(t) s'accumule et trace x(t). x(t) = x0 + ∫ v dt ; là où v < 0, x diminue ; x est extrémal quand v = 0. */
window.SIMS['primitive'] = function(mount){
  const K = window.SimKit, C = K.C, T = 10;
  const P = {
    trajet: ['Démarrage, croisière, freinage', t => t < 3 ? 10 * t / 3 : t < 7 ? 10 : t < 9 ? 10 * (9 - t) / 2 : 0, [-1, 11]],
    allerretour: ['Aller-retour : v = 3 cos(πt/5)', t => 3 * Math.cos(Math.PI * t / 5), [-3.5, 3.5]],
    acc: ['Accélération constante : v = t', t => t, [-1, 11]],
    freinage: ['Lancé vers le haut : v = 8 − 2t', t => 8 - 2 * t, [-13, 9]]
  };
  let pr = 'trajet', t = 0, run = true, last = 0, X = [];
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 420);
  K.select(ctr, 'Profil de vitesse', Object.entries(P).map(([k, v]) => [k, v[0]]), v => { pr = v; prep(); t = 0; run = true; bp.textContent = 'Pause'; });
  const bp = K.button(ctr, 'Pause', () => { run = !run; if (t >= T){ t = 0; run = true; } bp.textContent = run ? 'Pause' : 'Reprendre'; });
  const st = K.slider(ctr, 'Instant t', 0, T, 0.01, 0, u => K.fmt(u, 2) + ' s', u => { t = u; run = false; bp.textContent = 'Reprendre'; });
  const out = K.readout(ctr);
  function prep(){ const v = P[pr][1], N = 1000; X = [0]; for (let i = 1; i <= N; i++){ const a = T * (i - 1) / N, b = T * i / N; X.push(X[i - 1] + (v(a) + 4 * v((a + b) / 2) + v(b)) / 6 * (b - a)); } }
  const xAt = u => { const i = Math.min(999, Math.floor(u / T * 1000)), r = u / T * 1000 - i; return X[i] + r * (X[i + 1] - X[i]); };
  function draw(){
    const [name, v, vr] = P[pr];
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const A = K.axes(ctx, 56, 190, 625, 20, {xmin: 0, xmax: T, ymin: vr[0], ymax: vr[1], xticks: 10, yticks: 4, xfmt: u => K.fmt(u, 0), yfmt: u => K.fmt(u, 0)});
    K.text(ctx, 'v (m·s⁻¹)', 60, 12, {size: 11, color: C.ink});
    // aire accumulée
    for (let i = 0; i < 400; i++){ const a = T * i / 400; if (a >= t) break; const b = Math.min(t, T * (i + 1) / 400), y = v((a + b) / 2);
      ctx.fillStyle = y >= 0 ? 'rgba(11,95,165,0.28)' : 'rgba(178,58,72,0.3)'; const Y = A.sy(y), Y0 = A.sy(0); ctx.fillRect(A.sx(a), Math.min(Y, Y0), A.sx(b) - A.sx(a) + 0.6, Math.abs(Y - Y0)); }
    ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.moveTo(56, A.sy(0)); ctx.lineTo(625, A.sy(0)); ctx.stroke();
    ctx.strokeStyle = C.navy; ctx.lineWidth = 2.2; ctx.beginPath(); for (let i = 0; i <= 400; i++){ const u = T * i / 400; i ? ctx.lineTo(A.sx(u), A.sy(v(u))) : ctx.moveTo(A.sx(u), A.sy(v(u))); } ctx.stroke();
    const xmin = Math.min(0, ...X), xmax = Math.max(...X), pad = 0.08 * (xmax - xmin || 1);
    const B = K.axes(ctx, 56, 395, 625, 230, {xmin: 0, xmax: T, ymin: xmin - pad, ymax: xmax + pad, xticks: 10, yticks: 4, xfmt: u => K.fmt(u, 0), yfmt: u => K.fmt(u, 0), xlabel: 't (s)'});
    K.text(ctx, 'x (m) = aire accumulée', 60, 222, {size: 11, color: C.ink});
    ctx.strokeStyle = C.light; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 1000; i += 4){ const u = T * i / 1000; i ? ctx.lineTo(B.sx(u), B.sy(X[i])) : ctx.moveTo(B.sx(u), B.sy(X[i])); } ctx.stroke();
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 1000; i += 2){ const u = T * i / 1000; if (u > t) break; i ? ctx.lineTo(B.sx(u), B.sy(X[i])) : ctx.moveTo(B.sx(u), B.sy(X[i])); } ctx.stroke();
    const xt = xAt(t), vt = v(t);
    ctx.strokeStyle = C.ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(A.sx(t), 20); ctx.lineTo(A.sx(t), 395); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(A.sx(t), A.sy(vt), 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(B.sx(t), B.sy(xt), 5, 0, 7); ctx.fill();
    // tangente de x(t) : sa pente est v
    const L = 0.9; ctx.strokeStyle = C.green; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(B.sx(t - L), B.sy(xt - vt * L)); ctx.lineTo(B.sx(t + L), B.sy(xt + vt * L)); ctx.stroke();
    out.innerHTML = `t = ${K.fmt(t, 2)} s<br>v(t) = <b>${K.fmt(vt, 2)}</b> m·s⁻¹ (pente verte en bas)<br>x(t) = aire = <b>${K.fmt(xt, 2)}</b> m<br>${Math.abs(vt) < 0.15 && t > 0.2 ? 'v ≈ 0 : x est extrémal.' : vt < 0 ? 'v < 0 : l’aire compte négativement, x diminue.' : 'v > 0 : x augmente.'}`;
  }
  prep();
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (run){ t += dt * 1.2; if (t >= T){ t = T; run = false; bp.textContent = 'Recommencer'; } st.value = t; } draw(); requestAnimationFrame(loop); })(performance.now());
};
