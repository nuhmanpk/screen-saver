import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let particles = [];

function init() {
  particles = Array.from({ length: 320 }, (_, i) => {
    const frac = i / 319;
    return {
      x:    rand(0, W),
      y:    rand(-H * 2, H * 0.85),
      vx:   rand(-0.8, 0.8),
      vy:   rand(0.5, 2.5),
      size: rand(1.5, 3.5),
      frac,
    };
  });
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('sand');

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);
  const spd = cfg.speed / 5;

  particles.forEach(p => {
    p.vy  += 0.045 * spd;
    p.vx  += rand(-0.015, 0.015);
    p.vx  *= 0.99;
    p.x   += p.vx;
    p.y   += p.vy;

    if (p.x < 0)  { p.x = 0; p.vx =  Math.abs(p.vx) * 0.5; }
    if (p.x > W)  { p.x = W; p.vx = -Math.abs(p.vx) * 0.5; }

    if (p.y > H * 0.9) {
      if (p.vy > 1.2) {
        p.vy  *= -0.28;
        p.vx  += rand(-0.4, 0.4);
      } else {
        p.y   = rand(-H * 1.8, -10);
        p.x   = rand(0, W);
        p.vy  = rand(0.5, 2.5);
        p.vx  = rand(-0.8, 0.8);
      }
    }

    const r = Math.round(c1r + (c2r - c1r) * p.frac);
    const g = Math.round(c1g + (c2g - c1g) * p.frac);
    const b = Math.round(c1b + (c2b - c1b) * p.frac);
    ctx.fillStyle = `rgba(${r},${g},${b},${0.38 + p.frac * 0.42})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Time
  const now  = new Date();
  const tStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const fs   = Math.min(W * 0.17, H * 0.23, 160);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C2; ctx.shadowBlur = 50;
  ctx.fillStyle    = `rgba(${c2r},${c2g},${c2b},0.6)`;
  ctx.fillText(tStr, W / 2, H / 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle  = 'rgba(255,255,255,0.92)';
  ctx.fillText(tStr, W / 2, H / 2);
}

export default { init, tick };
