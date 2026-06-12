import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

const NUM = 500;
let stars = [];

function resetStar(i, randomZ) {
  stars[i] = {
    x:  (Math.random() - 0.5) * 2200,
    y:  (Math.random() - 0.5) * 2200,
    z:  randomZ ? Math.random() * 1000 : 1000,
    pz: randomZ ? Math.random() * 1000 + 1 : 1000,
  };
}

function init() {
  stars = [];
  for (let i = 0; i < NUM; i++) resetStar(i, true);
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('warp');

  const speed = (cfg.speed / 5) * 7;
  const cx = W / 2, cy = H / 2;
  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  stars.forEach((s, i) => {
    s.pz = s.z;
    s.z -= speed;
    if (s.z <= 1) { resetStar(i, false); return; }

    const sx = (s.x / s.z)  * W * 0.5 + cx;
    const sy = (s.y / s.z)  * W * 0.5 + cy;
    const px = (s.x / s.pz) * W * 0.5 + cx;
    const py = (s.y / s.pz) * W * 0.5 + cy;

    if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) { resetStar(i, false); return; }

    const bright = 1 - s.z / 1000;
    const r = Math.round(c1r + (c2r - c1r) * bright);
    const g = Math.round(c1g + (c2g - c1g) * bright);
    const b = Math.round(c1b + (c2b - c1b) * bright);

    ctx.strokeStyle = `rgba(${r},${g},${b},${bright * 0.85})`;
    ctx.lineWidth   = Math.max(0.5, bright * 2.5);
    ctx.beginPath();
    ctx.moveTo(px, py); ctx.lineTo(sx, sy);
    ctx.stroke();
  });

  const now  = new Date();
  const h    = now.getHours(), m = now.getMinutes(), sv = now.getSeconds();
  const tStr = `${pad(h)}:${pad(m)}:${pad(sv)}`;
  const fsSz = Math.min(W * 0.1, 110);

  ctx.font         = `300 ${fsSz}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = C1; ctx.shadowBlur = 40;
  ctx.fillStyle   = `rgba(${c1r},${c1g},${c1b},0.5)`;
  ctx.fillText(tStr, cx, cy);

  ctx.shadowColor = C2; ctx.shadowBlur = 20;
  ctx.fillStyle   = `rgba(${c2r},${c2g},${c2b},0.7)`;
  ctx.fillText(tStr, cx, cy);

  ctx.shadowBlur = 5;
  ctx.fillStyle  = '#ffffff';
  ctx.fillText(tStr, cx, cy);
  ctx.shadowBlur = 0;
}

function destroy() { stars = []; }

export default { init, tick, destroy };
