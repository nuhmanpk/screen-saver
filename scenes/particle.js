import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let pts = [], lastStr = '', offscreen = null, oCtx = null;

function sample(timeStr) {
  if (!offscreen) { offscreen = document.createElement('canvas'); oCtx = offscreen.getContext('2d'); }
  offscreen.width = 540; offscreen.height = 120;
  oCtx.clearRect(0, 0, 540, 120);
  oCtx.fillStyle    = '#fff';
  oCtx.font         = 'bold 80px JetBrains Mono, monospace';
  oCtx.textAlign    = 'center';
  oCtx.textBaseline = 'middle';
  oCtx.fillText(timeStr, 270, 60);
  const d = oCtx.getImageData(0, 0, 540, 120);
  const targets = [];
  for (let y = 0; y < 120; y += 4)
    for (let x = 0; x < 540; x += 4)
      if (d.data[(y * 540 + x) * 4 + 3] > 80) targets.push({ x, y });
  return targets;
}

function init() {
  lastStr = '';
  pts = [];
  offscreen = null;
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('particle');

  const now    = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const tStr   = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const scale  = Math.min(W * 0.82 / 540, H * 0.38 / 120, 2.2);
  const ox     = W / 2 - 270 * scale;
  const oy     = H / 2 - 60 * scale;

  if (tStr !== lastStr) {
    const targets = sample(tStr);
    const prevPts = pts;

    // Rebuild pts array aligned to new targets
    pts = targets.map((tgt, i) => {
      const tx = ox + tgt.x * scale;
      const ty = oy + tgt.y * scale;
      if (i < prevPts.length) {
        return { ...prevPts[i], tx, ty };
      }
      // New particle: burst in from random position
      const angle = Math.random() * Math.PI * 2;
      const dist  = rand(W * 0.2, W * 0.7);
      return {
        x: W / 2 + Math.cos(angle) * dist,
        y: H / 2 + Math.sin(angle) * dist,
        vx: rand(-3, 3), vy: rand(-3, 3),
        tx, ty,
        frac: i / targets.length,
      };
    });

    // Surviving particles not in new set: burst outward
    if (prevPts.length > targets.length) {
      prevPts.slice(targets.length).forEach(p => {
        p.vx += (p.x - W / 2) * 0.04 + rand(-2, 2);
        p.vy += (p.y - H / 2) * 0.04 + rand(-2, 2);
      });
    }
    lastStr = tStr;
  }

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  pts.forEach(p => {
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const spring = 0.08 * (cfg.speed / 5);
    p.vx  += dx * spring;
    p.vy  += dy * spring;
    p.vx  *= 0.82;
    p.vy  *= 0.82;
    p.x   += p.vx;
    p.y   += p.vy;

    const cr  = Math.round(c1r + (c2r - c1r) * p.frac);
    const cg  = Math.round(c1g + (c2g - c1g) * p.frac);
    const cb  = Math.round(c1b + (c2b - c1b) * p.frac);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const alpha = Math.max(0.3, 1 - dist / (W * 0.3));

    ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = `rgba(${cr},${cg},${cb},${alpha})`;
    ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
  });
  ctx.shadowBlur = 0;
}

export default { init, tick };
