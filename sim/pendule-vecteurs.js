/* Simulation : vitesse, accélération et tension d'un pendule (masse ponctuelle, L = 1 m), sans approximation.
   a = a_t (tangentielle, -g sin(theta)) + a_n (centripète, v²/L) ; T/m = g cos(theta) + v²/L.
   Avec un fil, si T devient négative le fil se détend : chute libre jusqu'à ce qu'il se tende de nouveau (choc, la vitesse radiale disparaît). */
window.SIMS['pendule-vecteurs'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81, L = 1;
  let th0 = 60, v0 = 0, liaison = 'fil', run = false, mode = 'circ', th = 0, om = 0, x = 0, y = 0, vx = 0, vy = 0, t = 0, hist = [], trail = [], sa = 8, last = null, note = '';
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Angle de départ θ₀', 0, 179, 1, th0, v => v + '°', v => { th0 = v; reset(); });
  K.slider(ctr, 'Vitesse de départ v₀ (tangentielle)', 0, 9, 0.1, v0, v => K.fmt(v, 1) + ' m/s', v => { v0 = v; reset(); });
  K.select(ctr, 'Liaison', [['fil', 'fil (ne peut que tirer)'], ['tige', 'tige rigide (tire ou pousse)']], v => { liaison = v; reset(); });
  K.button(ctr, '▶ Lâcher', () => { reset(); run = true; });
  K.button(ctr, 'Pause / reprise', () => { run = !run; }, true);
  const out = K.readout(ctr);
  function reset(){
    run = false; mode = 'circ'; th = th0 * Math.PI / 180; om = v0 / L; t = 0; hist = []; trail = []; note = '';
    const vmax2 = v0 * v0 + 2 * g * L * (1 + Math.cos(th)), amax = Math.max(g, vmax2 / L + g);
    sa = Math.min(7, 120 / amax);
  }
  reset();
  const tension = () => g * Math.cos(th) + L * om * om;           // T/m
  function step(dt){
    const n = 40, h = dt / n;
    for (let i = 0; i < n; i++){
      if (mode === 'circ'){
        const f = (a) => -(g / L) * Math.sin(a);
        const k1 = f(th), k2 = f(th + om * h / 2);                 // point milieu
        th += (om + k1 * h / 2) * h; om += k2 * h;
        if (liaison === 'fil' && tension() < -1e-6){
          mode = 'libre'; x = L * Math.sin(th); y = -L * Math.cos(th); vx = L * om * Math.cos(th); vy = L * om * Math.sin(th); trail = [[x, y]];
          note = `Le fil s’est détendu à θ = ${Math.round(((th * 180 / Math.PI) % 360 + 540) % 360 - 180)}° : la masse est en chute libre (parabole).`;
        }
      } else {
        x += vx * h; y += vy * h - g * h * h / 2; vy -= g * h;
        if (Math.hypot(x, y) >= L){
          const r = Math.hypot(x, y); x *= L / r; y *= L / r; th = Math.atan2(x, -y);
          const et = [Math.cos(th), Math.sin(th)]; om = (vx * et[0] + vy * et[1]) / L; mode = 'circ';
          note += ' Le fil se retend brutalement : la vitesse radiale disparaît, de l’énergie est perdue.';
        }
      }
      t += h;
    }
    if (mode === 'libre') trail.push([x, y]);
    hist.push([t, mode === 'circ' ? tension() / g : 0]); while (hist.length && hist[0][0] < t - 6) hist.shift();
  }
  function arrow(x0, y0, x1, y1, col, w, lab, dash){ const Lg = Math.hypot(x1 - x0, y1 - y0); if (Lg < 3) return; const a = Math.atan2(y1 - y0, x1 - x0); ctx.setLineDash(dash || []); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 9 * Math.cos(a - .4), y1 - 9 * Math.sin(a - .4)); ctx.lineTo(x1 - 9 * Math.cos(a + .4), y1 - 9 * Math.sin(a + .4)); ctx.closePath(); ctx.fill(); if (lab) K.text(ctx, lab, x1 + 8 * Math.cos(a), y1 + 8 * Math.sin(a), {size: 12, bold: true, color: col, align: 'center'}); }
  function draw(){
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const Ox = 210, Oy = 190, S = 130;                              // 1 m = 130 px
    ctx.strokeStyle = '#e3e8ef'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(Ox, Oy, S, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(Ox, Oy + S + 20); ctx.stroke();
    ctx.fillStyle = C.navy; ctx.fillRect(Ox - 22, Oy - 6, 44, 6);
    const px = mode === 'circ' ? L * Math.sin(th) : x, py = mode === 'circ' ? -L * Math.cos(th) : y;
    const bx = Ox + px * S, by = Oy - py * S;
    if (trail.length > 1){ ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.beginPath(); trail.forEach(([a, b], i) => i ? ctx.lineTo(Ox + a * S, Oy - b * S) : ctx.moveTo(Ox + a * S, Oy - b * S)); ctx.stroke(); }
    // fil ou tige
    if (mode === 'circ'){ ctx.strokeStyle = C.ink; ctx.lineWidth = liaison === 'tige' ? 4 : 1.5; ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(bx, by); ctx.stroke(); }
    else { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(Ox, Oy); const mx = (Ox + bx) / 2 + 18, my = (Oy + by) / 2 + 18; ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke(); }
    // vecteurs
    let vX, vY, aX, aY, atX = 0, atY = 0, anX = 0, anY = 0, T = 0;
    if (mode === 'circ'){
      const et = [Math.cos(th), Math.sin(th)], en = [-Math.sin(th), Math.cos(th)];      // en : vers le centre
      const v = L * om, at = -g * Math.sin(th), an = L * om * om; T = tension();
      vX = v * et[0]; vY = v * et[1]; atX = at * et[0]; atY = at * et[1]; anX = an * en[0]; anY = an * en[1]; aX = atX + anX; aY = atY + anY;
      arrow(bx, by, bx + atX * sa, by - atY * sa, '#e3a0a8', 1.5, '', [4, 3]);
      arrow(bx, by, bx + anX * sa, by - anY * sa, '#e3a0a8', 1.5, '', [4, 3]);
      if (Math.abs(T) > 0.05) arrow(bx, by, bx + T * en[0] * sa, by - T * en[1] * sa, C.green, 2.2, T >= 0 ? 'T' : 'T (pousse)');
    } else { vX = vx; vY = vy; aX = 0; aY = -g; }
    arrow(bx, by, bx + aX * sa, by - aY * sa, C.red, 2.6, 'a');
    arrow(bx, by, bx + vX * 18, by - vY * 18, C.blue, 2.6, 'v');
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(bx, by, 9, 0, 7); ctx.fill();
    // graphe de la tension
    const gx0 = 440, gy0 = 330, gx1 = 628, gy1 = 70, Tm = Math.max(3, ...hist.map(p => p[1])), Tn = Math.min(-1, ...hist.map(p => p[1]));
    const ax = K.axes(ctx, gx0, gy0, gx1, gy1, {xmin: Math.max(0, t - 6), xmax: Math.max(6, t), ymin: Tn, ymax: Math.ceil(Tm), xticks: 3, yticks: [Tn, 0, 1, Math.ceil(Tm)].filter((v, i, a) => a.indexOf(v) === i), xfmt: v => K.fmt(v, 0) + ' s', yfmt: v => K.fmt(v, 0), grid: true});
    K.text(ctx, 'tension T / m g', gx0, gy1 - 14, {size: 11, color: C.green});
    ctx.strokeStyle = C.grey; ctx.beginPath(); ctx.moveTo(gx0, ax.sy(0)); ctx.lineTo(gx1, ax.sy(0)); ctx.stroke();
    ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.beginPath(); hist.forEach(([a, b], i) => i ? ctx.lineTo(ax.sx(a), ax.sy(b)) : ctx.moveTo(ax.sx(a), ax.sy(b))); ctx.stroke();
    K.text(ctx, 'v', 20, 20, {size: 12, bold: true, color: C.blue}); K.text(ctx, 'vitesse', 34, 20, {size: 11, color: C.ink});
    K.text(ctx, 'a', 20, 38, {size: 12, bold: true, color: C.red}); K.text(ctx, 'accélération (tirets : tangentielle et normale)', 34, 38, {size: 11, color: C.ink});
    K.text(ctx, 'T', 20, 56, {size: 12, bold: true, color: C.green}); K.text(ctx, 'tension / m (même échelle que a)', 34, 56, {size: 11, color: C.ink});
    const deg = mode === 'circ' ? ((th * 180 / Math.PI) % 360 + 540) % 360 - 180 : Math.atan2(px, -py) * 180 / Math.PI;
    const vv = Math.hypot(vX, vY);
    let h = `θ = ${Math.round(deg)}°, v = ${K.fmt(vv, 2)} m/s.<br>`;
    if (mode === 'circ') h += `a<sub>t</sub> = −g sin θ = ${K.fmt(-g * Math.sin(th), 2)}, a<sub>n</sub> = v²/L = ${K.fmt(L * om * om, 2)} m/s² ; <b>T = ${K.fmt(T / g, 2)} m g</b>.<br>`;
    else h += 'Fil détendu : seule la pesanteur agit, a = g.<br>';
    if (note) h += note + '<br>';
    h += Math.abs(v0) < 0.05 ? 'Aux extrémités la vitesse est nulle mais pas l’accélération (tangentielle) ; au point bas elle est centripète ; entre les deux, elle a les deux composantes.'
      : `Pour faire un tour complet il faut v₀ ≥ √(5 g L) = ${K.fmt(Math.sqrt(5 * g * L), 2)} m/s depuis le bas avec un fil (T ≥ 0 en haut), seulement √(4 g L) = ${K.fmt(Math.sqrt(4 * g * L), 2)} m/s avec une tige.`;
    out.innerHTML = h;
  }
  (function loop(now){ if (!mount.isConnected) return; const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; if (run) step(dt * 0.7); draw(); requestAnimationFrame(loop); })(performance.now());
};
