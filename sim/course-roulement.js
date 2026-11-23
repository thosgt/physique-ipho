/* Simulation : course sur un plan incliné (longueur 2 m) entre un bloc qui glisse sans frottement et trois solides qui roulent :
   boule pleine (J = 2/5 MR²), cylindre plein (1/2 MR²), anneau (MR²). Roulement sans glissement : a = g sin(alpha)/(1 + k), k = J/MR².
   Il faut T = k/(1+k) M g sin(alpha) <= mu N, soit tan(alpha) <= mu (1+k)/k ; sinon le solide roule en glissant : a = g (sin - mu cos). */
window.SIMS['course-roulement'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81, L = 2;
  const OBJ = [{nom: 'bloc sans frottement', k: null, col: C.grey}, {nom: 'boule pleine', k: 0.4, col: C.red}, {nom: 'cylindre plein', k: 0.5, col: C.amber}, {nom: 'anneau', k: 1, col: C.green}];
  let al = 20, mu = 0.3, t = 0, run = false, last = null;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Inclinaison α', 3, 60, 1, al, v => v + '°', v => { al = v; t = 0; run = false; });
  K.slider(ctr, 'Coefficient de frottement μ (sol-roues)', 0, 1, 0.01, mu, v => K.fmt(v, 2), v => { mu = v; t = 0; run = false; });
  K.button(ctr, '▶ Départ', () => { t = 0; run = true; });
  const out = K.readout(ctr);
  function motion(o){
    const a_ = al * Math.PI / 180, sn = Math.sin(a_), cs = Math.cos(a_);
    if (o.k === null) return {a: g * sn, alpha: 0, slip: false};
    if (Math.tan(a_) <= mu * (1 + o.k) / o.k) return {a: g * sn / (1 + o.k), alpha: g * sn / (1 + o.k), slip: false};     // alpha = R × accélération angulaire
    return {a: g * (sn - mu * cs), alpha: mu * g * cs / o.k, slip: true};
  }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    // petit schéma du plan incliné
    const a_ = al * Math.PI / 180, bx = 150, by = 80, Lp = 120;
    ctx.fillStyle = '#e9eef5'; ctx.strokeStyle = C.navy; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx - Lp * Math.cos(a_), by - Lp * Math.sin(a_) + 0); ctx.lineTo(bx, by); ctx.lineTo(bx - Lp * Math.cos(a_), by); ctx.closePath(); ctx.fill(); ctx.stroke();
    K.text(ctx, `α = ${al}°`, bx - 46, by - 9, {size: 11, color: C.ink});
    K.text(ctx, 'Chaque piste est le plan incliné « déroulé » : départ à gauche, arrivée à 2 m.', 180, 40, {size: 11, color: C.ink});
    const x0 = 60, x1 = 600, R = 15;
    OBJ.forEach((o, i) => {
      const y = 130 + i * 62, M = motion(o), arr = Math.sqrt(2 * L / M.a), tt = Math.min(t, arr), s = 0.5 * M.a * tt * tt, ang = 0.5 * M.alpha * tt * tt / (R / ((x1 - x0) / L));
      ctx.strokeStyle = C.grey; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 - R, y + R); ctx.lineTo(x1 + R, y + R); ctx.stroke();
      ctx.strokeStyle = C.navy; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1 + R, y - R - 6); ctx.lineTo(x1 + R, y + R); ctx.stroke(); ctx.setLineDash([]);
      const px = x0 + s / L * (x1 - x0);
      if (o.k === null){ ctx.fillStyle = o.col; ctx.fillRect(px - R, y - R, 2 * R, 2 * R); }
      else {
        ctx.fillStyle = o.k === 1 ? '#fff' : o.col; ctx.strokeStyle = o.col; ctx.lineWidth = o.k === 1 ? 5 : 1; ctx.beginPath(); ctx.arc(px, y, R - (o.k === 1 ? 2.5 : 0), 0, 7); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = o.k === 1 ? o.col : '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + (R - 3) * Math.cos(ang - Math.PI / 2), y + (R - 3) * Math.sin(ang - Math.PI / 2)); ctx.stroke();
      }
      K.text(ctx, o.nom + (o.k !== null ? ` (k = ${o.k === 0.4 ? '2/5' : o.k === 0.5 ? '1/2' : '1'})` : ''), x0 - R, y - R - 10, {size: 11, bold: true, color: o.col === C.grey ? C.ink : o.col});
      K.text(ctx, `a = ${K.fmt(M.a, 2)} m/s²${M.slip ? ' · glisse !' : ''} · arrivée en ${K.fmt(arr, 2)} s`, x1 + R, y - R - 10, {size: 11, color: M.slip ? C.red : C.ink, align: 'right'});
      if (t >= arr && run) K.text(ctx, '✓', x1 + R + 10, y, {size: 14, bold: true, color: C.green});
    });
    const sl = OBJ.filter(o => o.k !== null && motion(o).slip);
    out.innerHTML = `Roulement sans glissement : a = g sin α / (1 + k), indépendante de la masse et du rayon. Ordre d’arrivée : bloc sans frottement, boule (a = 5/7 g sin α), cylindre (2/3), anneau (1/2) : plus la masse est loin de l’axe, plus il faut d’énergie pour la mettre en rotation.<br>` +
      `Le frottement nécessaire, T = k/(1+k) · M g sin α, doit rester inférieur à μ N : tan α ≤ μ (1+k)/k, soit ${K.fmt(Math.atan(mu * 3.5) * 180 / Math.PI, 0)}° pour la boule, ${K.fmt(Math.atan(mu * 3) * 180 / Math.PI, 0)}° pour le cylindre, ${K.fmt(Math.atan(mu * 2) * 180 / Math.PI, 0)}° pour l’anneau avec μ = ${K.fmt(mu, 2)}.` +
      (sl.length ? `<br><b>Ici, ${sl.map(o => o.nom).join(', ')} glisse${sl.length > 1 ? 'nt' : ''} en roulant</b> : a = g(sin α − μ cos α), et la rotation ne suit plus (v > Rω).` : '');
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) t += dt * 0.6; draw(); requestAnimationFrame(loop); })(performance.now());
};
