import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

const N = 9;
let blobs = [], t = 0;

function init() {
  t = 0;
  blobs = Array.from({ length: N }, (_, i) => ({
    frac: i / (N - 1),
    cx:   W * (0.18 + Math.random() * 0.64),
    cy:   H * (0.18 + Math.random() * 0.64),
    ax:   W  * (0.12 + Math.random() * 0.18),
    ay:   H  * (0.12 + Math.random() * 0.18),
    fx:   rand(0.18, 0.55),
    fy:   rand(0.14, 0.48),
    px:   Math.random() * Math.PI * 2,
    py:   Math.random() * Math.PI * 2,
    r:    Math.min(W, H) * (0.1 + Math.random() * 0.13),
    pf:   rand(0.25, 0.65),
    pp:   Math.random() * Math.PI * 2,
  }));
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  const spd = cfg.speed / 5;
  t += 0.007 * spd;
  fillBg('bubble');

  const [c2r, c2g, c2b] = hexToRgb(C2);

  ctx.globalCompositeOperation = 'lighter';

  blobs.forEach(b => {
    const x = b.cx + Math.sin(t * b.fx + b.px) * b.ax;
    const y = b.cy + Math.cos(t * b.fy + b.py) * b.ay;
    const r = b.r * (0.82 + 0.18 * Math.sin(t * b.pf + b.pp));
    const [cr, cg, cb] = lerpColor(C1, C2, b.frac);

    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,   `rgba(${cr},${cg},${cb},0.32)`);
    g.addColorStop(0.38, `rgba(${cr},${cg},${cb},0.16)`);
    g.addColorStop(0.75, `rgba(${cr},${cg},${cb},0.04)`);
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalCompositeOperation = 'source-over';

  const now  = new Date();
  const tStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const fs   = Math.min(W * 0.15, H * 0.21, 148);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C2; ctx.shadowBlur = 45;
  ctx.fillStyle    = `rgba(${c2r},${c2g},${c2b},0.5)`;
  ctx.fillText(tStr, W/2, H/2);
  ctx.shadowBlur   = 0;
  ctx.fillStyle    = 'rgba(255,255,255,0.94)';
  ctx.fillText(tStr, W/2, H/2);
}

export default { init, tick };
