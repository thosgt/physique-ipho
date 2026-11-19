window.SIMS = window.SIMS || {};
/* SimKit: helpers shared by all simulations (canvas with DPR scaling, sliders, readouts, axes). */
window.SimKit = (function(){
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function canvas(parent, w, h){
    const c = document.createElement('canvas'); const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * dpr; c.height = h * dpr; c.style.aspectRatio = w + ' / ' + h; parent.appendChild(c);
    const ctx = c.getContext('2d'); ctx.scale(dpr, dpr); ctx.W = w; ctx.H = h; return ctx;
  }
  function box(mount){
    const b = document.createElement('div'); b.className = 'simbox';
    const left = document.createElement('div'); const ctr = document.createElement('div'); ctr.className = 'controls';
    b.appendChild(left); b.appendChild(ctr); mount.appendChild(b); return {left, ctr};
  }
  function slider(ctr, label, min, max, step, value, fmt, onInput){
    const l = document.createElement('label'); const id = 'sl' + Math.random().toString(36).slice(2, 8);
    l.innerHTML = `<span>${label} : <span class="v"></span></span>`;
    const i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = value; i.id = id;
    const v = l.querySelector('.v'); const upd = () => { v.textContent = fmt(+i.value); };
    i.addEventListener('input', () => { upd(); onInput(+i.value); }); l.appendChild(i); ctr.appendChild(l); upd();
    return { get value(){ return +i.value; }, set value(x){ i.value = x; upd(); }, el: i };
  }
  function select(ctr, label, options, onChange){
    const l = document.createElement('label'); l.innerHTML = `<span>${label}</span>`; const s = document.createElement('select');
    options.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); });
    s.addEventListener('change', () => onChange(s.value)); l.appendChild(s); ctr.appendChild(l); return s;
  }
  function button(ctr, label, onClick, secondary){ const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (secondary) b.className = 'secondary'; b.addEventListener('click', onClick); ctr.appendChild(b); return b; }
  function readout(ctr){ const r = document.createElement('div'); r.className = 'readout'; ctr.appendChild(r); return r; }
  function axes(ctx, x0, y0, x1, y1, opts){
    // draws a frame with ticks; opts: {xmin,xmax,ymin,ymax,xlabel,ylabel,xticks,yticks,xfmt,yfmt,grid}
    const o = Object.assign({xticks:5, yticks:5, xfmt:v=>v, yfmt:v=>v, grid:true}, opts);
    const sx = v => x0 + (v - o.xmin) / (o.xmax - o.xmin) * (x1 - x0), sy = v => y0 - (v - o.ymin) / (o.ymax - o.ymin) * (y0 - y1);
    ctx.save(); ctx.strokeStyle = '#8a94a6'; ctx.fillStyle = '#4a5670'; ctx.lineWidth = 1; ctx.font = '11px IBM Plex Sans, sans-serif';
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    const xt = Array.isArray(o.xticks) ? o.xticks : Array.from({length:o.xticks+1}, (_, i) => o.xmin + (o.xmax - o.xmin) * i / o.xticks);
    const yt = Array.isArray(o.yticks) ? o.yticks : Array.from({length:o.yticks+1}, (_, i) => o.ymin + (o.ymax - o.ymin) * i / o.yticks);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    xt.forEach(v => { const x = sx(v); if (o.grid){ ctx.strokeStyle = '#e3e8ef'; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); } ctx.strokeStyle = '#8a94a6'; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 4); ctx.stroke(); ctx.fillText(o.xfmt(v), x, y0 + 6); });
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    yt.forEach(v => { const y = sy(v); if (o.grid){ ctx.strokeStyle = '#e3e8ef'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); } ctx.strokeStyle = '#8a94a6'; ctx.beginPath(); ctx.moveTo(x0 - 4, y); ctx.lineTo(x0, y); ctx.stroke(); ctx.fillText(o.yfmt(v), x0 - 6, y); });
    if (o.xlabel){ ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(o.xlabel, (x0 + x1) / 2, ctx.H - 4); }
    if (o.ylabel){ ctx.save(); ctx.translate(12, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(o.ylabel, 0, 0); ctx.restore(); }
    ctx.restore(); return {sx, sy};
  }
  function text(ctx, s, x, y, opts={}){ ctx.save(); ctx.font = (opts.bold ? '600 ' : '') + (opts.size || 12) + 'px IBM Plex Sans, sans-serif'; ctx.fillStyle = opts.color || '#15213a'; ctx.textAlign = opts.align || 'left'; ctx.textBaseline = opts.base || 'middle'; ctx.fillText(s, x, y); ctx.restore(); }
  const C = { navy:'#15213a', blue:'#0b5fa5', sky:'#5aa9ff', amber:'#d9900b', red:'#b23a48', green:'#1f8a4c', grey:'#8a94a6', light:'#e9eef5', ink:'#4a5670' };
  const fmt = (v, d=1) => v.toLocaleString('fr-FR', {minimumFractionDigits:d, maximumFractionDigits:d});
  return {canvas, box, slider, select, button, readout, axes, text, C, fmt};
})();
