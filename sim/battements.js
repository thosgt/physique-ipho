/* Simulation : battements. Somme de deux sinusoïdes de fréquences voisines f1, f2 ; enveloppe 2A|cos(π(f1−f2)t)| ;
   écoute possible (WebAudio, après un clic). */
window.SIMS['battements'] = function(mount){
  const K = window.SimKit, C = K.C;
  let f1 = 440, f2 = 444, audio = null, osc = [];
  const {left, ctr} = K.box(mount);
  const ctx = K.canvas(left, 640, 380);
  K.slider(ctr, 'Fréquence f₁', 400, 500, 1, f1, x => x + ' Hz', x => { f1 = x; draw(); tune(); });
  K.slider(ctr, 'Fréquence f₂', 400, 500, 1, f2, x => x + ' Hz', x => { f2 = x; draw(); tune(); });
  const bs = K.button(ctr, '🔊 Écouter les deux sons', () => { if (audio){ stop(); return; } try { audio = new (window.AudioContext || window.webkitAudioContext)(); const g = audio.createGain(); g.gain.value = 0.15; g.connect(audio.destination);
      osc = [f1, f2].map(f => { const o = audio.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(); return o; }); bs.textContent = '⏹ Arrêter'; } catch(e){} });
  const out = K.readout(ctr);
  function stop(){ if (audio){ osc.forEach(o => { try { o.stop(); } catch(e){} }); audio.close(); audio = null; osc = []; bs.textContent = '🔊 Écouter les deux sons'; } }
  function tune(){ if (osc.length){ osc[0].frequency.value = f1; osc[1].frequency.value = f2; } }
  function draw(){
    ctx.clearRect(0, 0, ctx.W, ctx.H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    const T = 0.5;   // fenêtre de 0,5 s
    const panel = (y0, y1, fn, col, lab, env) => { const A = K.axes(ctx, 50, y1, 620, y0, {xmin: 0, xmax: T * 1000, ymin: -2.2, ymax: 2.2, xticks: 5, yticks: 2, xfmt: v => K.fmt(v, 0), yfmt: v => '', xlabel: y1 > 300 ? 't (ms)' : ''});
      K.text(ctx, lab, 56, y0 + 10, {size: 11, bold: true, color: col});
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i <= 2400; i++){ const t = T * i / 2400; const X = A.sx(t * 1000), Y = A.sy(fn(t)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
      if (env){ ctx.strokeStyle = C.red; ctx.lineWidth = 2; [1, -1].forEach(s => { ctx.beginPath(); for (let i = 0; i <= 600; i++){ const t = T * i / 600; const X = A.sx(t * 1000), Y = A.sy(s * env(t)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); }); } };
    panel(20, 120, t => Math.cos(2 * Math.PI * f1 * t), C.blue, 's₁ : ' + f1 + ' Hz');
    panel(130, 230, t => Math.cos(2 * Math.PI * f2 * t), C.green, 's₂ : ' + f2 + ' Hz');
    panel(240, 350, t => Math.cos(2 * Math.PI * f1 * t) + Math.cos(2 * Math.PI * f2 * t), C.ink, 's₁ + s₂ et son enveloppe 2|cos(π(f₁−f₂)t)|', t => 2 * Math.abs(Math.cos(Math.PI * (f1 - f2) * t)));
    const fb = Math.abs(f1 - f2);
    out.innerHTML = `s₁ + s₂ = 2 cos(π(f₁−f₂)t) · cos(π(f₁+f₂)t)<br>Fréquence moyenne (f₁+f₂)/2 = ${K.fmt((f1 + f2) / 2, 1)} Hz<br>Battements : f_b = |f₁ − f₂| = <b>${fb} Hz</b>${fb ? ' (période ' + K.fmt(1000 / fb, 0) + ' ms)' : ' : pas de battement'}<br>L’intensité (∝ enveloppe²) passe par un maximum ${fb} fois par seconde.<br>Les oscillations rapides ne sont pas résolues sur le tracé : seule l’enveloppe compte.`;
  }
  draw();
  const obs = new MutationObserver(() => { if (!mount.isConnected){ stop(); obs.disconnect(); } }); obs.observe(document.body, {childList: true, subtree: true});
};
