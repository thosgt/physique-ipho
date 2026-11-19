/* Simulation : diagramme d'espace-temps (x, ct). Référentiel R (axes orthogonaux) et R' en mouvement à β (axes x' et ct'
   inclinés de l'angle artanh β... en représentation de Minkowski : ct' le long de x = βct, x' le long de ct = βx).
   Deux événements déplaçables (sliders) ; coordonnées dans R et R' ; intervalle invariant ; simultanéité. */
window.SIMS['minkowski'] = function(mount){
  const K = window.SimKit, C = K.C;
  let beta = 0.5, A = [1, 2], B = [4, 2];
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 460);
  K.slider(ctr, 'Vitesse de R′ : β', -0.9, 0.9, 0.05, beta, x => K.fmt(x, 2) + ' c', x => { beta = x; draw(); });
  K.slider(ctr, 'Événement A : x', -5, 5, 0.25, A[0], x => K.fmt(x, 2), x => { A[0] = x; draw(); });
  K.slider(ctr, 'Événement A : ct', -5, 5, 0.25, A[1], x => K.fmt(x, 2), x => { A[1] = x; draw(); });
  K.slider(ctr, 'Événement B : x', -5, 5, 0.25, B[0], x => K.fmt(x, 2), x => { B[0] = x; draw(); });
  K.slider(ctr, 'Événement B : ct', -5, 5, 0.25, B[1], x => K.fmt(x, 2), x => { B[1] = x; draw(); });
  const out = K.readout(ctr);
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const cx = 320, cy = 240, s = 36, X = x => cx + x * s, Y = ct => cy - ct * s, g = 1 / Math.sqrt(1 - beta * beta);
    // cône de lumière
    ctx.fillStyle = 'rgba(217,144,11,0.08)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(X(6), Y(6)); ctx.lineTo(X(-6), Y(6)); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(X(6), Y(-6)); ctx.lineTo(X(-6), Y(-6)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.amber; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(-6), Y(-6)); ctx.lineTo(X(6), Y(6)); ctx.moveTo(X(-6), Y(6)); ctx.lineTo(X(6), Y(-6)); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, 'lumière', X(5.2), Y(5.6), {size: 10, color: C.amber});
    // grille R
    ctx.strokeStyle = '#e3e8f0'; ctx.lineWidth = 1; for (let k = -6; k <= 6; k++){ ctx.beginPath(); ctx.moveTo(X(k), Y(-6)); ctx.lineTo(X(k), Y(6)); ctx.moveTo(X(-6), Y(k)); ctx.lineTo(X(6), Y(k)); ctx.stroke(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(-6), cy); ctx.lineTo(X(6), cy); ctx.moveTo(cx, Y(-6)); ctx.lineTo(cx, Y(6)); ctx.stroke();
    K.text(ctx, 'x', X(6) - 10, cy + 16, {size: 13, bold: true, color: C.ink}); K.text(ctx, 'ct', cx + 8, Y(6) + 12, {size: 13, bold: true, color: C.ink});
    // axes R' : ct' : x = β ct ; x' : ct = β x ; graduations : unité en R' → points (γ β, γ) et (γ, γβ)
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(-6 * beta), Y(-6)); ctx.lineTo(X(6 * beta), Y(6)); ctx.moveTo(X(-6), Y(-6 * beta)); ctx.lineTo(X(6), Y(6 * beta)); ctx.stroke();
    K.text(ctx, "ct'", X(5.4 * beta) + 10, Y(5.4) + 4, {size: 13, bold: true, color: C.blue}); K.text(ctx, "x'", X(5.6), Y(5.6 * beta) - 8, {size: 13, bold: true, color: C.blue});
    ctx.fillStyle = C.blue; for (let k = -5; k <= 5; k++){ if (!k) continue; ctx.beginPath(); ctx.arc(X(k * g * beta), Y(k * g), 2.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(X(k * g), Y(k * g * beta), 2.5, 0, 7); ctx.fill(); }
    // événements et leurs projections dans R' (lignes parallèles aux axes de R')
    const lor = ([x, ct]) => [g * (x - beta * ct), g * (ct - beta * x)];
    const ev = (P, name, col) => { const [xp, ctp] = lor(P);
      ctx.setLineDash([3, 3]); ctx.strokeStyle = col; ctx.lineWidth = 1; // parallèle à ct' (direction (β,1)) jusqu'à l'axe x', et parallèle à x' jusqu'à l'axe ct'
      const fx = xp * g, fct = xp * g * beta; ctx.beginPath(); ctx.moveTo(X(P[0]), Y(P[1])); ctx.lineTo(X(fx), Y(fct)); ctx.stroke();
      const tx = ctp * g * beta, tct = ctp * g; ctx.beginPath(); ctx.moveTo(X(P[0]), Y(P[1])); ctx.lineTo(X(tx), Y(tct)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(P[0]), Y(P[1]), 6, 0, 7); ctx.fill(); K.text(ctx, name, X(P[0]) + 9, Y(P[1]) - 6, {size: 13, bold: true, color: col}); return [xp, ctp]; };
    const Ap = ev(A, 'A', C.red), Bp = ev(B, 'B', C.green);
    ctx.strokeStyle = '#8a94a6'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(X(A[0]), Y(A[1])); ctx.lineTo(X(B[0]), Y(B[1])); ctx.stroke(); ctx.setLineDash([]);
    const dx = B[0] - A[0], dct = B[1] - A[1], s2 = dct * dct - dx * dx, dxp = Bp[0] - Ap[0], dctp = Bp[1] - Ap[1];
    const genre = Math.abs(s2) < 1e-9 ? 'lumière' : s2 > 0 ? 'temps' : 'espace';
    out.innerHTML = `R′ à β = ${K.fmt(beta, 2)}, γ = ${K.fmt(g, 3)}<br>A : (x, ct) = (${K.fmt(A[0], 2)}, ${K.fmt(A[1], 2)}) → (x′, ct′) = (${K.fmt(Ap[0], 2)}, ${K.fmt(Ap[1], 2)})<br>B : (${K.fmt(B[0], 2)}, ${K.fmt(B[1], 2)}) → (${K.fmt(Bp[0], 2)}, ${K.fmt(Bp[1], 2)})<br>` +
      `Dans R : Δct = ${K.fmt(dct, 2)}, Δx = ${K.fmt(dx, 2)} ; dans R′ : Δct′ = <b>${K.fmt(dctp, 2)}</b>, Δx′ = ${K.fmt(dxp, 2)}<br>Intervalle s² = Δ(ct)² − Δx² = <b>${K.fmt(s2, 2)}</b> = ${K.fmt(dctp * dctp - dxp * dxp, 2)} (invariant), genre <b>${genre}</b><br>` +
      (Math.abs(dct) < 1e-9 && Math.abs(dctp) > 1e-9 ? 'Simultanés dans R, pas dans R′.' : genre === 'espace' ? 'Genre espace : l’ordre de A et B dépend du référentiel ; aucun signal ne les relie.' : genre === 'temps' ? 'Genre temps : ordre identique dans tous les référentiels ; durée propre √s² = ' + K.fmt(Math.sqrt(Math.max(s2, 0)), 2) : 'Reliés par un rayon lumineux.');
  }
  draw();
};
