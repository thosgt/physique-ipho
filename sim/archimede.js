/* Simulation : la poussée d'Archimède. Un bloc cubique lâché dans un fluide flotte (fraction immergée ρ_corps/ρ_fluide)
   ou coule ; poids P, poussée Π (poids du fluide déplacé) et réaction du fond à la même échelle ; montée du niveau de l'eau ;
   fonte d'un glaçon flottant (niveau inchangé dans l'eau douce) ou de glace posée sur un rocher (le niveau monte). */
window.SIMS['archimede'] = function(mount){
  const K = window.SimKit, C = K.C, g = 9.81, RG = 917;                 // masse volumique de la glace (kg/m³)
  const FL = {douce: ['Eau douce', 1000, 'rgba(90,169,255,0.42)'], mer: ['Eau de mer', 1025, 'rgba(11,95,165,0.38)'],
    huile: ['Huile', 920, 'rgba(217,170,40,0.45)'], mercure: ['Mercure', 13534, 'rgba(140,150,166,0.72)']};
  const CO = {glace: ['Glace', 917, '#e2f2fc'], chene: ['Bois de chêne', 700, '#b98a55'], poly: ['Polystyrène', 30, '#f7f7f2'],
    humain: ['Corps humain', 985, '#e7b896'], roche: ['Roche (granite)', 2700, '#9a9ca3'], fer: ['Fer', 7870, '#5d6472']};
  // cuve : largeur 0,50 m, profondeur 0,25 m, eau sur 0,24 m ; rocher 0,20 m × 0,25 m, haut de 0,36 m ; S pixels par mètre
  const TW = 0.5, TD = 0.25, H0 = 0.24, RW = 0.2, RH = 0.36, S = 640, FX = 34, FY = 426;
  const ART = {douce: 'l\'eau douce', mer: 'l\'eau de mer', huile: 'l\'huile', mercure: 'le mercure'};
  const pm = (v, d) => (v < -0.5 * 10 ** -d ? '−' : '+') + K.fmt(Math.abs(v), d);     // signe explicite, pas de « +-0,00 »
  const n3 = v => K.fmt(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);
  let mode = 'flotte', fl = 'douce', co = 'chene', V = 4e-3, running = false, last = null;
  let zb = 0, vz = 0, phase = 'repos', Vw = 0, m = 0, m0 = 0, Href = H0, sc = 1, tSim = 0;
  const rf = () => FL[fl][1], rc = () => mode === 'flotte' ? CO[co][1] : RG;
  const side = () => mode === 'flotte' ? Math.cbrt(V) : Math.cbrt(m / RG);          // arête du cube (m)
  const Afree = () => (mode === 'rocher' ? TW - RW : TW) * TD;                        // section libre de la cuve (m²)
  // niveau H de l'eau et hauteur immergée hi d'un bloc d'arête a dont la base est à zb du fond
  function niveau(z, a){ const A = Afree(); if (mode === 'rocher' || a <= 0) return {H: Vw / A, hi: 0};
    let H = Vw / A; if (H > z){ H = (Vw - a * a * z) / (A - a * a); if (H - z >= a) H = (Vw + a ** 3) / A; }
    return {H, hi: Math.max(0, Math.min(a, H - z))}; }
  // position d'équilibre : Π(z) = P (dichotomie) ; z = 0 si le bloc coule ou touche le fond
  function equilibre(){ const a = side(); if (a <= 0 || mode === 'rocher') return 0; const P = rc() * a ** 3 * g, Pi = z => rf() * a * a * niveau(z, a).hi * g;
    if (Pi(0) <= P) return 0; let lo = 0, hi = 1; for (let i = 0; i < 60; i++){ const mid = (lo + hi) / 2; if (Pi(mid) > P) lo = mid; else hi = mid; } return lo; }
  function init(){            // état initial de l'expérience choisie (au repos)
    running = false; phase = 'repos'; vz = 0; tSim = 0; if (bRun) bRun.textContent = runLabel();
    if (mode !== 'flotte' && fl !== 'douce' && fl !== 'mer'){ fl = 'douce'; sF.value = fl; }
    m = m0 = RG * V; Vw = H0 * Afree(); Href = Vw / Afree(); zb = equilibre();
    if (mode === 'fonte') Href = niveau(zb, side()).H;
    // échelle des forces (px/N), fixée pour l'expérience : P mesure 105 px (moins si le bloc coule, pour rester dans la cuve)
    const P0 = (mode === 'flotte' ? rc() * V : m0) * g; sc = (rc() < rf() || mode === 'rocher' ? 105 : Math.min(105, side() * S / 2 + 26)) / P0; draw(); }
  // ---------- interface ----------
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 460);
  const sM = K.select(ctr, 'Expérience', [['flotte', 'Lâcher un bloc dans le fluide'], ['fonte', 'Fonte d\'un glaçon flottant'], ['rocher', 'Fonte de glace posée sur un rocher']], v => { mode = v; init(); });
  const sF = K.select(ctr, 'Fluide', Object.entries(FL).map(([k, [n, r]]) => [k, n + ' (' + K.fmt(r, 0) + ' kg/m³)']), v => { fl = v; if (mode !== 'flotte' && v !== 'douce' && v !== 'mer'){ mode = 'flotte'; sM.value = mode; } init(); });
  const sC = K.select(ctr, 'Corps', Object.entries(CO).map(([k, [n, r]]) => [k, n + ' (' + K.fmt(r, 0) + ' kg/m³)']), v => { co = v; if (mode !== 'flotte'){ mode = 'flotte'; sM.value = mode; } init(); });
  sC.value = co;
  const sV = K.slider(ctr, 'Volume du bloc (cube)', 0.2, 8, 0.1, V * 1000, v => K.fmt(v, 1) + ' L', v => { V = v / 1000; init(); });
  const runLabel = () => running ? '⏸ Pause' : mode === 'flotte' ? '▶ Lâcher le bloc' : '▶ Faire fondre';
  const bRun = K.button(ctr, '', () => {
    if (running){ running = false; bRun.textContent = '▶ Reprendre'; return; }
    if (mode === 'flotte' && phase !== 'chute'){ Href = Vw / Afree(); zb = Href + 0.03; vz = 0; tSim = 0; phase = 'chute'; }
    if (mode !== 'flotte' && m <= 1e-6) init();
    if (mode !== 'flotte') phase = 'fonte';
    running = true; bRun.textContent = runLabel(); last = null; requestAnimationFrame(loop); });
  K.button(ctr, 'Iceberg : glace dans l\'eau de mer', () => { mode = 'flotte'; fl = 'mer'; co = 'glace'; V = 8e-3; sM.value = mode; sF.value = fl; sC.value = co; sV.value = 8; init(); bRun.click(); }, true);
  K.button(ctr, 'Réinitialiser', () => init(), true);
  const out = K.readout(ctr);
  // ---------- évolution ----------
  function step(dt){            // mouvement vertical amorti du bloc (Euler semi-implicite)
    const a = side(), mass = rc() * a ** 3, {hi} = niveau(zb, a), k = rf() * g * a * a, me = mass + 0.5 * rf() * a * a * hi;   // masse ajoutée
    const c = hi > 0 ? 0.6 * Math.sqrt(k * me) : 0, F = -mass * g + rf() * a * a * hi * g - c * vz;
    vz += F / me * dt; zb += vz * dt; if (zb <= 0){ zb = 0; if (vz < 0) vz = 0; } return F; }
  function loop(ts){
    if (!ctx.canvas.isConnected || !running) return;
    const dt = last === null ? 0 : Math.min(0.05, (ts - last) / 1000); last = ts;
    if (mode === 'flotte'){ let F = 0; const n = Math.ceil(dt * 0.35 / 0.0005);   // ralenti × 0,35
      for (let i = 0; i < n; i++) F = step(dt * 0.35 / n); tSim += dt * 0.35;
      const P = rc() * V * g; if (tSim > 0.4 && Math.abs(vz) < 2e-3 && (Math.abs(F) < 2e-3 * P || (zb === 0 && F < 0))){ zb = equilibre(); vz = 0; phase = 'repos'; running = false; } }
    else { const dm = Math.min(m, m0 * dt / 10); m -= dm; Vw += dm / 1000; zb = equilibre();       // fonte (accélérée) : 10 s ; eau de fonte = eau douce
      if (m <= 1e-6){ m = 0; running = false; phase = 'fondu'; } }
    bRun.textContent = runLabel(); draw(); if (running) requestAnimationFrame(loop);
  }
  // ---------- dessin ----------
  const halo = (s, x, y, o) => { ctx.save(); ctx.font = (o.bold ? '600 ' : '') + (o.size || 12) + 'px IBM Plex Sans, sans-serif'; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.strokeText(s, x, y); ctx.fillStyle = o.color || C.navy; ctx.fillText(s, x, y); ctx.restore(); };
  // texte avec indices : « Π = ρ_{fluide}·V_{imm}·g »
  const rich = (str, x, y, o = {}) => { const sz = o.size || 12; ctx.save(); ctx.textBaseline = 'middle'; ctx.fillStyle = o.color || C.navy;
    str.split(/(_\{[^}]*\})/).forEach(p => { const sub = p.startsWith('_{'), s = sub ? p.slice(2, -1) : p; ctx.font = (o.bold ? '600 ' : '') + (sub ? Math.round(sz * 0.78) : sz) + 'px IBM Plex Sans, sans-serif';
      ctx.fillText(s, x, y + (sub ? sz * 0.3 : 0)); x += ctx.measureText(s).width; }); ctx.restore(); };
  const arrow = (x, y, d, col) => { if (Math.abs(d) < 3) return y; const s = Math.sign(d), L = Math.min(175, Math.abs(d)) * s, h = Math.min(10, Math.abs(L) * 0.6);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + L - s * h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + L); ctx.lineTo(x - 6, y + L - s * h); ctx.lineTo(x + 6, y + L - s * h); ctx.fill(); return y + L; };
  function draw(){
    const W = ctx.W, Hc = ctx.H; ctx.clearRect(0, 0, W, Hc); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, Hc);
    const a = side(), {H, hi} = niveau(zb, a), xr = FX + (TW - RW) * S, xw1 = mode === 'rocher' ? xr : FX + TW * S, ys = FY - H * S;
    const cx = mode === 'rocher' ? xr + RW * S / 2 : FX + TW * S / 2, zbase = mode === 'rocher' ? RH : zb, yb = FY - zbase * S, A = a * S;
    // eau, surface, niveau de référence
    ctx.fillStyle = FL[fl][2]; ctx.fillRect(FX, ys, xw1 - FX, FY - ys);
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(FX, ys); ctx.lineTo(xw1, ys); ctx.stroke();
    const yref = FY - Href * S, dh = H - Href;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(FX, yref); ctx.lineTo(xw1, yref); ctx.stroke(); ctx.setLineDash([]);
    halo(mode === 'flotte' ? 'sans le bloc' : 'niveau initial', FX + 5, yref + (dh > 0.004 ? 10 : -10), {size: 11, color: C.ink});
    if (Math.abs(dh) * S > 4){ const xa = xw1 - 10; ctx.strokeStyle = C.red; ctx.fillStyle = C.red; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xa, yref); ctx.lineTo(xa, ys); ctx.stroke();
      [yref, ys].forEach((y, i) => { const s = (i ? -1 : 1) * Math.sign(dh); ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xa - 4, y + 6 * s); ctx.lineTo(xa + 4, y + 6 * s); ctx.fill(); });
      halo('Δh = +' + K.fmt(dh * 100, 1) + ' cm', xa - 6, (yref + ys) / 2, {size: 11, bold: true, color: C.red, align: 'right'}); }
    // rocher (glace continentale)
    if (mode === 'rocher'){ ctx.fillStyle = '#8d8f94'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xr, FY); ctx.lineTo(xr, FY - RH * S + 14);
      ctx.lineTo(xr + 12, FY - RH * S); ctx.lineTo(FX + TW * S, FY - RH * S); ctx.lineTo(FX + TW * S, FY); ctx.closePath(); ctx.fill(); ctx.stroke();
      K.text(ctx, 'rocher', xr + RW * S / 2, FY - 40, {size: 12, bold: true, color: '#fff', align: 'center'});
      if (running && m > 0){ ctx.strokeStyle = C.sky; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(xr + 6, FY - RH * S + 4); ctx.lineTo(xr - 3, FY - RH * S + 16); ctx.lineTo(xr - 3, ys); ctx.stroke(); } }
    // cuve
    ctx.strokeStyle = '#5f6b80'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(FX - 2, FY - 0.42 * S); ctx.lineTo(FX - 2, FY + 2); ctx.lineTo(FX + TW * S + 2, FY + 2); ctx.lineTo(FX + TW * S + 2, FY - 0.42 * S); ctx.stroke();
    K.text(ctx, 'Cuve vue de face : 50 cm × 25 cm (section libre ' + K.fmt(Afree() * 1e4, 0) + ' cm²)', FX - 4, 14, {size: 11, color: C.ink});
    K.text(ctx, 'Flèches des forces à la même échelle', FX - 4, 30, {size: 11, color: C.ink});
    // bloc (ou glaçon), partie immergée hachurée
    if (A > 0.5){ const xl = cx - A / 2, yt = yb - A;
      ctx.fillStyle = mode === 'flotte' ? CO[co][2] : CO.glace[2]; ctx.fillRect(xl, yt, A, A);
      if (hi > 0){ const yi = yb - hi * S; ctx.save(); ctx.beginPath(); ctx.rect(xl, yi, A, yb - yi); ctx.clip(); ctx.fillStyle = FL[fl][2]; ctx.fillRect(xl, yi, A, yb - yi);
        ctx.strokeStyle = 'rgba(11,95,165,0.55)'; ctx.lineWidth = 1.2; for (let k = -A; k < A + (yb - yi); k += 8){ ctx.beginPath(); ctx.moveTo(xl + k, yb); ctx.lineTo(xl + k + (yb - yi), yi); ctx.stroke(); } ctx.restore();
        const onF = zb <= 1e-6 && phase !== 'chute' && rc() > rf();    // bloc posé au fond : étiquette à gauche (la réaction R est à droite)
        if (yb - yi > 14) halo('V immergé', onF ? xl - 6 : xl + A + 6, onF ? yi + 12 : yb - 9, {size: 11, bold: true, color: C.blue, align: onF ? 'right' : 'left'}); }
      ctx.strokeStyle = C.navy; ctx.lineWidth = 1.5; ctx.strokeRect(xl, yt, A, A);
      // forces à la même échelle (sc pixels par newton)
      const P = rc() * a ** 3 * g, Pi = rf() * a * a * hi * g, onFloor = mode !== 'rocher' && zb <= 1e-6 && phase !== 'chute' && P > Pi, R = onFloor ? P - Pi : 0;
      const yG = yb - A / 2, yC = yb - hi * S / 2;
      ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(cx, yG, 2.5, 0, 7); ctx.fill();
      // étiquettes : à l'extrémité des flèches, ou près de leur origine quand le bloc est posé au fond (flèches courtes, place réduite)
      const tP = arrow(cx - 9, yG, P * sc, C.red); halo('P = ' + n3(P) + ' N', cx - 17, onFloor ? yG + 14 : Math.min(tP - 6, FY - 8), {size: 12, bold: true, align: 'right', color: C.red});
      if (Pi > 0){ const tPi = arrow(cx + 9, yC, -Pi * sc, C.blue); halo('Π = ' + n3(Pi) + ' N', cx + 17, onFloor ? Math.min(tPi, yb - A) - 22 : Math.max(tPi + 6, 44), {size: 12, bold: true, color: C.blue}); }
      if (R > 0){ const xR = Math.min(xl + A + 14, FX + TW * S - 60), tR = arrow(xR, yb, -R * sc, C.green); halo('R = ' + n3(R) + ' N', xR + 8, tR - 10, {size: 12, bold: true, color: C.green}); } }
    // ---------- panneau droit : masses volumiques classées ----------
    const X0 = 392, X1 = 630, list = [...Object.entries(FL).map(([k, v]) => ['f', k, v]), ...Object.entries(CO).map(([k, v]) => ['c', k, v])].sort((p, q) => q[2][1] - p[2][1]);
    K.text(ctx, 'Masses volumiques (kg/m³)', X0, 14, {size: 12, bold: true, color: C.navy});
    let yF = 0;
    list.forEach(([t, k, [nm, r]], i) => { const y = 36 + i * 20, isF = t === 'f' && k === fl, isC = t === 'c' && k === (mode === 'flotte' ? co : 'glace');
      if (isF){ ctx.fillStyle = 'rgba(11,95,165,0.16)'; ctx.fillRect(X0 - 2, y - 9, X1 - X0 + 4, 18); yF = y; }
      if (isC){ ctx.fillStyle = 'rgba(217,144,11,0.22)'; ctx.fillRect(X0 - 2, y - 9, X1 - X0 + 4, 18); }
      const col = t === 'f' ? C.blue : C.navy; K.text(ctx, (t === 'f' ? '≈ ' : '') + nm, X0 + 12, y, {size: 12, bold: isF || isC, color: col}); K.text(ctx, K.fmt(r, 0), X1, y, {size: 12, bold: isF || isC, color: col, align: 'right'}); });
    const yTop = 36 - 9, yBot = 36 + 9 * 20 + 9; ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
    [[yTop, yF - 10, 'coule'], [yF + 10, yBot, 'flotte']].forEach(([ya, yz, s]) => { if (yz - ya < 12) return; ctx.beginPath(); ctx.moveTo(X0 + 4, ya + 2); ctx.lineTo(X0 + 4, yz - 2); ctx.stroke();
      if (yz - ya > 44){ ctx.save(); ctx.translate(X0 - 6, (ya + yz) / 2); ctx.rotate(-Math.PI / 2); K.text(ctx, s, 0, 0, {size: 11, bold: true, align: 'center', color: C.ink}); ctx.restore(); } });
    K.text(ctx, '≈ : fluides ; au-dessus du fluide choisi : coule', X0, 240, {size: 11, color: C.ink});
    // formules et fraction immergée
    let y = 266; const frac = rc() / rf();
    rich('P = ρ_{corps}·V·g = ' + n3(rc() * a ** 3 * g) + ' N', X0, y, {color: C.red, bold: true}); y += 20;
    rich('Π = ρ_{fluide}·V_{immergé}·g = ' + n3(rf() * a * a * hi * g) + ' N', X0, y, {color: C.blue, bold: true}); y += 24;
    if (mode === 'rocher'){ ['La glace repose sur le rocher : elle ne', 'déplace pas d\'eau. En fondant, toute son', 'eau s\'ajoute à la cuve : le niveau monte.'].forEach(s => { K.text(ctx, s, X0, y, {size: 12}); y += 17; }); }
    else if (frac < 1){ rich('Flotte : Π = P ⇒ V_{immergé} / V = ρ_{corps} / ρ_{fluide}', X0, y, {size: 11}); y += 22;
      const bw = X1 - X0, bi = bw * frac; ctx.fillStyle = 'rgba(11,95,165,0.55)'; ctx.fillRect(X0, y - 9, bi, 18); ctx.fillStyle = mode === 'flotte' ? CO[co][2] : CO.glace[2]; ctx.fillRect(X0 + bi, y - 9, bw - bi, 18);
      ctx.strokeStyle = C.navy; ctx.strokeRect(X0, y - 9, bw, 18); halo(K.fmt(100 * frac, 1) + ' % immergé', X0 + 6, y, {size: 12, bold: true, color: C.navy}); y += 26;
      if (mode === 'flotte' && co === 'glace' && fl === 'mer') { K.text(ctx, '« La partie émergée de l\'iceberg » :', X0, y, {size: 12, bold: true, color: C.blue}); K.text(ctx, 'seulement ' + K.fmt(100 - 100 * frac, 1) + ' % du volume.', X0, y + 16, {size: 12, color: C.blue}); } }
    else { rich('Coule : ρ_{corps} > ρ_{fluide}, donc même', X0, y, {size: 12}); y += 18;
      rich('entièrement immergé, Π_{max} = ' + n3(rf() * V * g) + ' N < P', X0, y, {size: 12}); y += 18; K.text(ctx, 'Le fond exerce R = P − Π.', X0, y, {size: 12, color: C.green, bold: true}); }
    // ---------- readout ----------
    const Pn = rc() * a ** 3 * g, Pin = rf() * a * a * hi * g, Vi = a * a * hi;
    let s = '';
    if (mode === 'flotte'){
      const repos = phase !== 'chute', flotte = rc() < rf();
      s = `<b>${CO[co][0]}</b> (${K.fmt(rc(), 0)} kg/m³) dans <b>${ART[fl]}</b> (${K.fmt(rf(), 0)} kg/m³)<br>` +
        `V = ${K.fmt(V * 1000, 2)} L = ${K.fmt(V * 1000, 2)}·10⁻³ m³ (cube de ${K.fmt(a * 100, 1)} cm)<br>` +
        `P = ρ<sub>corps</sub>·V·g = <b>${n3(Pn)} N</b> (m = ${n3(rc() * V)} kg)<br>Π = ρ<sub>fluide</sub>·V<sub>imm</sub>·g = <b>${n3(Pin)} N</b><br>` +
        `(V<sub>imm</sub> = ${K.fmt(Vi * 1000, 2)} L ; fluide déplacé : ${n3(rf() * Vi)} kg)<br>` +
        `Immergé : <b>${K.fmt(100 * Vi / V, 1)} %</b>` + (repos && flotte ? ` = ρ<sub>corps</sub>/ρ<sub>fluide</sub>` : '') + `<br>` +
        `Hauteurs : ${K.fmt(hi * 100, 1)} cm immergée, ${K.fmt((a - hi) * 100, 1)} cm émergée<br>Niveau de l'eau : ${pm((H - Href) * 100, 1)} cm<br>→ ` +
        (!repos ? 'en mouvement…' : flotte ? '<b>flotte</b> : Π = P' : `<b>coule</b> : Π < P ; le fond exerce R = P − Π = ${n3(Pn - Pin)} N`);
    } else {
      const fondu = m0 - m, eau = fl === 'douce';
      s = `<b>${mode === 'fonte' ? 'Glaçon flottant' : 'Glace posée sur un rocher'}</b> ${mode === 'fonte' ? 'dans' : 'au-dessus de'} ${ART[fl]}<br>Glace : ${n3(m)} kg restants sur ${n3(m0)} kg<br>Eau de fonte (douce) : ${K.fmt(fondu, 2)} L<br>` +
        `Niveau : <b>Δh = ${mode === 'fonte' ? pm((H - Href) * 1000, 2) + ' mm' : pm((H - Href) * 100, 2) + ' cm'}</b><br><br>` +
        (mode === 'fonte' ? (eau ? 'Eau douce : la glace fondue (m/1 000) occupe <b>exactement</b> le volume immergé (m/1 000) : le niveau ne change pas.'
          : `Eau de mer : l'eau de fonte (m/1 000) occupe 2,5 % de plus que le volume immergé (m/1 025) : +${K.fmt(m0 * (1 / 1000 - 1 / 1025) / Afree() * 1000, 2)} mm à la fin. La fonte de la banquise élève très peu le niveau.`)
          : 'Toute l\'eau de fonte s\'ajoute : la fonte des <b>glaces continentales</b> (Groenland, Antarctique, glaciers) fait monter le niveau de la mer, pas celle de la banquise.');
    }
    out.innerHTML = s;
  }
  init();
};
