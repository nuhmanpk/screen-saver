import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&!?+=<>';
let cols = [], fs = 16, lastTs = 0;

function init() {
  fs = Math.max(12, Math.floor(W / 60));
  const colW    = fs * 0.7;
  const numCols = Math.floor(W / colW);
  cols = Array.from({ length: numCols }, (_, i) => {
    const trailLen = Math.floor(rand(8, 26));
    return {
      x: i * colW + colW * 0.3,
      y: rand(-H * 1.5, H),
      speed: rand(60, 200),
      trailLen,
      chars: Array.from({ length: trailLen }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
    };
  });
}

function tick(ts) {
  setRafId(requestAnimationFrame(tick));
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs = ts;
  fillBg('neon');

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);
  const spd = cfg.speed / 5;

  ctx.font         = `${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';

  cols.forEach(col => {
    col.y += col.speed * spd * dt;
    if (col.y - col.trailLen * fs > H) {
      col.y        = -col.trailLen * fs * rand(0.3, 1.2);
      col.speed    = rand(60, 200);
      col.trailLen = Math.floor(rand(8, 26));
      col.chars    = Array.from({ length: col.trailLen }, () => CHARS[Math.floor(Math.random() * CHARS.length)]);
    }
    if (Math.random() < 0.05) {
      col.chars[Math.floor(Math.random() * col.chars.length)] = CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    col.chars.forEach((ch, i) => {
      const cy = col.y - (col.trailLen - 1 - i) * fs;
      if (cy < -fs || cy > H) return;
      const frac = i / (col.trailLen - 1);
      if (frac > 0.88) {
        ctx.fillStyle  = '#ffffff';
        ctx.shadowColor = `rgb(${c2r},${c2g},${c2b})`;
        ctx.shadowBlur  = 10;
      } else {
        const alpha = frac * 0.6 + 0.04;
        const r = Math.round(c1r + (c2r - c1r) * frac);
        const g = Math.round(c1g + (c2g - c1g) * frac);
        const b = Math.round(c1b + (c2b - c1b) * frac);
        ctx.fillStyle  = `rgba(${r},${g},${b},${alpha})`;
        ctx.shadowBlur = 0;
      }
      ctx.fillText(ch, col.x, cy);
      ctx.shadowBlur = 0;
    });
  });

  const now     = new Date();
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const bigFs   = Math.min(W * 0.19, H * 0.27, 170);
  const cy      = H * 0.46;
  const panW    = bigFs * 5.5, panH = bigFs * 1.25;

  ctx.fillStyle = 'rgba(2,0,14,0.7)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - panW / 2, cy - panH / 2, panW, panH, 10);
  ctx.fill();

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = `300 ${bigFs}px 'JetBrains Mono', monospace`;

  ctx.shadowColor = `rgb(${c1r},${c1g},${c1b})`; ctx.shadowBlur = 80;
  ctx.fillStyle   = `rgba(${c1r},${c1g},${c1b},0.35)`;
  ctx.fillText(timeStr, W / 2, cy);

  ctx.shadowColor = `rgb(${c2r},${c2g},${c2b})`; ctx.shadowBlur = 35;
  ctx.fillStyle   = `rgba(${c2r},${c2g},${c2b},0.65)`;
  ctx.fillText(timeStr, W / 2, cy);

  ctx.shadowBlur = 0;
  ctx.fillStyle  = '#ffffff';
  ctx.fillText(timeStr, W / 2, cy);
}

export default { init, tick };
