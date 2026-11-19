/* Simulation : figure de diffraction à l'infini (Fraunhofer) d'une ouverture quelconque, calculée par FFT 2D.
   L'intensité observée dans la direction (θx, θy) est |TF de la transmittance|² : la figure est « inverse » de l'objet,
   symétrique par rapport à son centre, tourne avec lui, et chaque bord rectiligne donne une traînée perpendiculaire. */
window.SIMS['diffraction2d'] = function(mount){
  const K = window.SimKit, C = K.C, N = 256;
  let shape = 'fente', size = 14, rot = 0, sep = 18, logs = true;
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 340);
  K.select(ctr, 'Ouverture', [['fente', 'Fente fine'], ['rect', 'Rectangle'], ['carre', 'Carré'], ['disque', 'Disque'], ['triangle', 'Triangle'], ['hexagone', 'Hexagone'], ['etoile', 'Étoile à 5 branches'], ['trous', 'Deux trous'], ['fentes', 'Deux fentes (Young)'], ['reseau', 'Réseau de 6 fentes'], ['anneau', 'Anneau']], v => { shape = v; dirty = true; });
  K.slider(ctr, 'Taille de l’ouverture', 6, 30, 1, size, v => K.fmt(v, 0), v => { size = v; dirty = true; });
  K.slider(ctr, 'Rotation de l’ouverture', 0, 180, 5, rot, v => K.fmt(v, 0) + '°', v => { rot = v; dirty = true; });
  K.slider(ctr, 'Écart entre les motifs (trous, fentes)', 8, 40, 1, sep, v => K.fmt(v, 0), v => { sep = v; dirty = true; });
  K.select(ctr, 'Échelle des intensités', [['log', 'logarithmique (fait voir les détails)'], ['lin', 'linéaire (ce que voit l’œil)']], v => { logs = v === 'log'; dirty = true; });
  const out = K.readout(ctr);
  let dirty = true;
  // ----- FFT radix-2 (in place) -----
  function fft1(re, im, inv){
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++){ let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j){ [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1){ const ang = 2 * Math.PI / len * (inv ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len){ let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++){ const a = i + k, b = a + len / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr; re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
  }
  function inside(px, py){
    const a = -rot * Math.PI / 180, x = px * Math.cos(a) - py * Math.sin(a), y = px * Math.sin(a) + py * Math.cos(a), s = size;
    const poly = (n, r, r0) => { for (let k = 0; k < n; k++){ const t = r0 + 2 * Math.PI * k / n + Math.PI / n; if (x * Math.cos(t) + y * Math.sin(t) > r * Math.cos(Math.PI / n)) return false; } return true; };
    switch (shape){
      case 'fente': return Math.abs(x) < 1.5 && Math.abs(y) < 4 * s;
      case 'rect': return Math.abs(x) < 1.6 * s && Math.abs(y) < 0.5 * s;
      case 'carre': return Math.abs(x) < s && Math.abs(y) < s;
      case 'disque': return x * x + y * y < s * s;
      case 'triangle': return poly(3, 1.3 * s, -Math.PI / 2);
      case 'hexagone': return poly(6, 1.1 * s, 0);
      case 'etoile': return starTest(x, y, 1.4 * s, 0.55 * s);
      case 'trous': return (x - sep / 2) ** 2 + y * y < (0.35 * s) ** 2 || (x + sep / 2) ** 2 + y * y < (0.35 * s) ** 2;
      case 'fentes': return (Math.abs(x - sep / 2) < 1.5 || Math.abs(x + sep / 2) < 1.5) && Math.abs(y) < 4 * s;
      case 'reseau': { for (let k = 0; k < 6; k++){ if (Math.abs(x - (k - 2.5) * sep * 0.6) < 1.2) return Math.abs(y) < 4 * s; } return false; }
      case 'anneau': { const r2 = x * x + y * y; return r2 < s * s && r2 > (0.75 * s) ** 2; }
    }
    return false;
  }
  function starTest(x, y, R, r0){   // étoile à 5 branches : union de 5 triangles fins et d'un pentagone
    const pts = []; for (let k = 0; k < 10; k++){ const t = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r0 : R; pts.push([rr * Math.cos(t), rr * Math.sin(t)]); }
    let c = false; for (let i = 0, j = 9; i < 10; j = i++){ const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c;
  }
  const re = new Float64Array(N * N), im = new Float64Array(N * N), rowr = new Float64Array(N), rowi = new Float64Array(N);
  const apImg = ctx.createImageData(N, N), dfImg = ctx.createImageData(N, N);
  function compute(){
    const sub = [-0.25, 0.25];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
      let v = 0; for (const a of sub) for (const b of sub) if (inside(i - N / 2 + a, j - N / 2 + b)) v += 0.25;
      re[j * N + i] = v; im[j * N + i] = 0; const q = (j * N + i) * 4, g = v * 255; apImg.data[q] = apImg.data[q + 1] = apImg.data[q + 2] = g; apImg.data[q + 3] = 255;
    }
    for (let j = 0; j < N; j++){ for (let i = 0; i < N; i++){ rowr[i] = re[j * N + i]; rowi[i] = im[j * N + i]; } fft1(rowr, rowi); for (let i = 0; i < N; i++){ re[j * N + i] = rowr[i]; im[j * N + i] = rowi[i]; } }
    for (let i = 0; i < N; i++){ for (let j = 0; j < N; j++){ rowr[j] = re[j * N + i]; rowi[j] = im[j * N + i]; } fft1(rowr, rowi); for (let j = 0; j < N; j++){ re[j * N + i] = rowr[j]; im[j * N + i] = rowi[j]; } }
    let mx = 0; const I = new Float64Array(N * N);
    for (let k = 0; k < N * N; k++){ I[k] = re[k] * re[k] + im[k] * im[k]; if (I[k] > mx) mx = I[k]; }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
      const si = (i + N / 2) % N, sj = (j + N / 2) % N, v = I[sj * N + si] / mx;
      const L = logs ? Math.max(0, (Math.log10(v + 1e-12) + 4.5) / 4.5) : Math.min(1, v * 6);
      const q = (j * N + i) * 4; dfImg.data[q] = 255 * L; dfImg.data[q + 1] = 60 * L * L; dfImg.data[q + 2] = 50 * L * L; dfImg.data[q + 3] = 255;
    }
  }
  function draw(){
    if (dirty){ compute(); dirty = false; }
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const zoomAp = 2;   // l'ouverture est montrée agrandie (seul le centre de la grille)
    const tmp = document.createElement('canvas'); tmp.width = N; tmp.height = N; tmp.getContext('2d').putImageData(apImg, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, N / 2 - N / (2 * zoomAp), N / 2 - N / (2 * zoomAp), N / zoomAp, N / zoomAp, 40, 50, 256, 256);
    tmp.getContext('2d').putImageData(dfImg, 0, 0); ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, N, N, 344, 50, 256, 256);
    K.text(ctx, 'Ouverture (vue de face, agrandie)', 168, 36, {size: 12, bold: true, color: C.navy, align: 'center'});
    K.text(ctx, 'Figure de diffraction à l’infini', 472, 36, {size: 12, bold: true, color: C.navy, align: 'center'});
    K.text(ctx, '→', 312, 184, {size: 22, bold: true, color: C.grey, align: 'center'});
  }
  const NOTE = {
    fente: 'Fente fine verticale : la figure s’étale horizontalement, perpendiculairement à la fente (la petite dimension donne le grand étalement).',
    rect: 'Rectangle : une croix, plus étalée dans la direction du petit côté ; les franges sont espacées de λ/a et λ/b.',
    carre: 'Carré : une croix de deux traînées perpendiculaires aux côtés.',
    disque: 'Disque : anneaux d’Airy ; premier anneau sombre à θ = 1,22 λ/D.',
    triangle: 'Triangle : 3 côtés, mais 6 branches, car la figure est toujours symétrique par rapport à son centre.',
    hexagone: 'Hexagone : 6 côtés parallèles deux à deux, donc 6 branches seulement.',
    etoile: 'Étoile à 5 branches : 10 bords de 5 directions, donc 10 traînées.',
    trous: 'Deux trous : la tache d’Airy d’un trou, rayée de franges d’Young perpendiculaires à la droite qui joint les trous, d’interfrange λ/e.',
    fentes: 'Deux fentes (Young) : franges d’interférence dans l’enveloppe de diffraction d’une fente.',
    reseau: 'Réseau : des pics fins et intenses aux angles sin θ = pλ/a ; plus il y a de fentes, plus ils sont fins.',
    anneau: 'Anneau : comme un disque, mais avec des anneaux plus nombreux et plus contrastés.'
  };
  (function loop(){ if (!mount.isConnected) return; draw();
    out.innerHTML = NOTE[shape] + '<br>Tournez l’ouverture : la figure tourne du même angle. Agrandissez-la : la figure rétrécit (θ ≈ λ/a).';
    setTimeout(() => requestAnimationFrame(loop), 120); })();
};
