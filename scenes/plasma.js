import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

const SCALE = 5;
let t = 0, lastTs = 0, pOff = null, pCtx = null;

function init() {
  t = 0; lastTs = 0;
  if (!pOff) { pOff = document.createElement('canvas'); pCtx = pOff.getContext('2d'); }
  pOff.width  = Math.ceil(W / SCALE);
  pOff.height = Math.ceil(H / SCALE);
}

function tick(ts) {
  setRafId(requestAnimationFrame(tick));
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs = ts;
  t += dt * 0.6 * (cfg.speed / 5);

  if (pOff.width !== Math.ceil(W / SCALE) || pOff.height !== Math.ceil(H / SCALE)) {
    pOff.width = Math.ceil(W / SCALE); pOff.height = Math.ceil(H / SCALE);
  }

  const pw = pOff.width, ph = pOff.height;
  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  const img = pCtx.createImageData(pw, ph);
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const nx = x / pw, ny = y / ph;
      const dx = nx - 0.5, dy = ny - 0.5;
      const v = (
        Math.sin(nx * 9  + t        ) +
        Math.sin(ny * 7  - t * 0.8  ) +
        Math.sin((nx + ny) * 6 + t * 0.6) +
        Math.sin(Math.sqrt(dx * dx + dy * dy) * 14 - t * 1.1)
      ) * 0.25;
      const blend = (v + 1) * 0.5;
      const idx = (y * pw + x) * 4;
      img.data[idx]     = Math.round(c1r + (c2r - c1r) * blend);
      img.data[idx + 1] = Math.round(c1g + (c2g - c1g) * blend);
      img.data[idx + 2] = Math.round(c1b + (c2b - c1b) * blend);
      img.data[idx + 3] = 255;
    }
  }
  pCtx.putImageData(img, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(pOff, 0, 0, W, H);

  const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.1, W / 2, H / 2, W * 0.7);
  vig.addColorStop(0, 'rgba(0,0,0,0.55)');
  vig.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  const now  = new Date();
  const tStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const fsSz = Math.min(W * 0.19, H * 0.26, 165);
  ctx.font             = `300 ${fsSz}px 'JetBrains Mono', monospace`;
  ctx.textAlign        = 'center';
  ctx.textBaseline     = 'middle';
  ctx.shadowColor      = `rgb(${c2r},${c2g},${c2b})`;
  ctx.shadowBlur       = 45;
  ctx.fillStyle        = '#ffffff';
  ctx.fillText(tStr, W / 2, H / 2);
  ctx.shadowBlur = 0;
}

export default { init, tick };
