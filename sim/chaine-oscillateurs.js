/* Simulation : chaîne de N masses identiques entre deux parois, reliées par N + 1 ressorts identiques.
   m x_n'' = k (x_{n+1} - 2 x_n + x_{n-1}), x_0 = x_{N+1} = 0. Modes : A_n = sin(n theta_p), theta_p = p pi/(N+1),
   omega_p = 2 omega0 sin(theta_p/2). Mouvement quelconque : superposition des modes (ici, exacte). */
window.SIMS['chaine-oscillateurs'] = function(mount){
  const K = window.SimKit, C = K.C, w0 = 2.2;
  let N = 5, mode = '1', t = 0, run = true, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 420);
  const modeSel = K.select(ctr, 'Mouvement', [], v => { mode = v; t = 0; });
  function fillModes(){ modeSel.innerHTML = ''; for (let p = 1; p <= N; p++){ const o = document.createElement('option'); o.value = p; o.textContent = 'mode propre p = ' + p; modeSel.appendChild(o); } const o = document.createElement('option'); o.value = 'un'; o.textContent = 'première masse écartée seule'; modeSel.appendChild(o); if (mode !== 'un' && +mode > N) mode = '1'; modeSel.value = mode; }
  K.slider(ctr, 'Nombre de masses N', 1, 12, 1, N, v => v, v => { N = v; t = 0; fillModes(); });
  fillModes();
  K.button(ctr, 'Pause / reprise', () => { run = !run; });
  K.button(ctr, 'Recommencer', () => { t = 0; }, true);
  const out = K.readout(ctr);
  const th = p => p * Math.PI / (N + 1), om = p => 2 * w0 * Math.sin(th(p) / 2);
  function coeffs(){ const c = []; for (let p = 1; p <= N; p++) c[p] = mode === 'un' ? 2 / (N + 1) * Math.sin(th(p)) : (p === +mode ? 1 : 0); return c; }
  function x(n, tt, c){ let s = 0; for (let p = 1; p <= N; p++) if (c[p]) s += c[p] * Math.sin(n * th(p)) * Math.cos(om(p) * tt); return s; }
  function spring(x0, x1, y){ const n = 10, L = x1 - x0; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x0, y); for (let i = 1; i < n; i++) ctx.lineTo(x0 + L * i / n, y + (i % 2 ? -5 : 5)); ctx.lineTo(x1, y); ctx.stroke(); }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const c = coeffs(), X0 = 30, X1 = 610, a = (X1 - X0) / (N + 1), amp = Math.min(0.32 * a, 26), yc = 60;
    // chaîne réelle (déplacements longitudinaux)
    ctx.fillStyle = C.navy; ctx.fillRect(X0 - 8, yc - 24, 8, 48); ctx.fillRect(X1, yc - 24, 8, 48);
    const pos = [X0]; for (let n = 1; n <= N; n++) pos.push(X0 + n * a + amp * x(n, t, c)); pos.push(X1);
    for (let n = 0; n <= N; n++) spring(pos[n] + (n ? 9 : 0), pos[n + 1] - (n < N ? 9 : 0), yc);
    for (let n = 1; n <= N; n++){ ctx.fillStyle = C.blue; ctx.fillRect(pos[n] - 9, yc - 9, 18, 18); }
    K.text(ctx, 'la chaîne (déplacements le long de l’axe)', X0, 18, {size: 11, color: C.ink});
    // représentation « transversale » : x_n en ordonnée
    const yt = 175, H = 55;
    K.text(ctx, 'les mêmes déplacements reportés verticalement', X0, 112, {size: 11, color: C.ink});
    ctx.strokeStyle = '#e3e8ef'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X0, yt); ctx.lineTo(X1, yt); ctx.stroke();
    if (mode !== 'un'){ const p = +mode; ctx.setLineDash([4, 3]); ctx.strokeStyle = C.grey; [1, -1].forEach(sg => { ctx.beginPath(); for (let i = 0; i <= 200; i++){ const u = (N + 1) * i / 200, X = X0 + u * a, Y = yt - sg * H * Math.sin(u * th(p)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); }); ctx.setLineDash([]); }
    const mx = mode === 'un' ? 1 : 1;
    ctx.strokeStyle = C.blue; ctx.lineWidth = 1.5; ctx.beginPath(); for (let n = 0; n <= N + 1; n++){ const v = (n === 0 || n === N + 1) ? 0 : x(n, t, c) / mx, X = X0 + n * a, Y = yt - H * v; n ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
    for (let n = 1; n <= N; n++){ const X = X0 + n * a, Y = yt - H * x(n, t, c) / mx; ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(X, Y, 5, 0, 7); ctx.fill(); }
    // relation de dispersion
    const ax = K.axes(ctx, 70, 395, 610, 255, {xmin: 0, xmax: Math.PI, ymin: 0, ymax: 2.1, xticks: [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI], yticks: [0, 1, 2], xfmt: v => ['0', 'π/4', 'π/2', '3π/4', 'π'][Math.round(v / (Math.PI / 4))], yfmt: v => v === 0 ? '0' : v + ' ω₀'});
    K.text(ctx, 'ω = 2ω₀ sin(θ/2), déphasage θ entre masses voisines', 72, 244, {size: 11, color: C.ink});
    ctx.strokeStyle = C.grey; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= 100; i++){ const v = Math.PI * i / 100; i ? ctx.lineTo(ax.sx(v), ax.sy(2 * Math.sin(v / 2))) : ctx.moveTo(ax.sx(v), ax.sy(0)); } ctx.stroke();
    for (let p = 1; p <= N; p++){ const on = mode === String(p) || (mode === 'un' && Math.abs(c[p]) > 1e-9); ctx.fillStyle = on ? C.red : '#fff'; ctx.strokeStyle = C.red; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ax.sx(th(p)), ax.sy(2 * Math.sin(th(p) / 2)), on && mode !== 'un' ? 7 : 5, 0, 7); ctx.fill(); ctx.stroke(); }
    let h;
    if (mode !== 'un'){ const p = +mode; const pp = p === 1 ? 'π' : p + 'π'; h = `Mode p = ${p} : θ = ${pp}/${N + 1}, amplitudes A<sub>n</sub> = sin(n·${pp}/${N + 1}), <b>ω = 2ω₀ sin(${pp}/${2 * (N + 1)}) = ${K.fmt(om(p) / w0, 3)} ω₀</b>. ${p === 1 ? 'Aucun nœud' : (p - 1) + ' nœud' + (p > 2 ? 's' : '')} entre les parois : c’est une onde stationnaire.`; }
    else h = 'Une seule masse écartée : tous les modes sont excités (cercles pleins). Leurs pulsations ne sont pas proportionnelles : le mouvement ne se répète pas, et l’ébranlement se propage, s’étale (dispersion) et se réfléchit aux parois.';
    h += `<br>Toutes les pulsations sont inférieures à 2ω₀ (fréquence de coupure). Pour N = 1, ω = √2 ω₀ ; pour N = 2, ω₀ et √3 ω₀.`;
    out.innerHTML = h;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) t += dt; draw(); requestAnimationFrame(loop); })(performance.now());
};
