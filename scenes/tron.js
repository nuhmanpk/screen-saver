import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let t = 0;

function init() { t = 0; }

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('tron');
  const spd = cfg.speed / 5;
  t += 0.01 * spd;

  const cx = W / 2, cy = H / 2;
  const N  = 30, SEGS = 8;
  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  for (let i = 0; i < N; i++) {
    const z     = ((i / N) + t * 0.16) % 1;      // 0=far 1=near
    const scale = 0.04 + z * 0.96;
    const r     = Math.min(W, H) * 0.47 * scale;
    if (r < 3) continue;

    const twist = z * Math.PI * 3.5;              // helix rotation
    const frac  = z;
    const [cr, cg, cb] = lerpColor(C1, C2, frac);
    const alpha  = frac * frac * 0.85;
    const lineW  = frac * 2.8;

    for (let s = 0; s < SEGS; s++) {
      const a0 = twist + (s / SEGS) * Math.PI * 2 + 0.07;
      const a1 = twist + ((s + 1) / SEGS) * Math.PI * 2 - 0.07;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.lineWidth   = lineW;
      ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
      ctx.shadowBlur  = frac > 0.62 ? lineW * 4 : 0;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a1);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Sparse spokes connecting rings
    if (i % 5 === 0 && i < N - 1) {
      const zN    = (((i + 1) / N) + t * 0.16) % 1;
      const rN    = Math.min(W, H) * 0.47 * (0.04 + zN * 0.96);
      const twN   = zN * Math.PI * 3.5;
      for (let s = 0; s < SEGS; s += 2) {
        const a  = twist + (s / SEGS + 0.5 / SEGS) * Math.PI * 2;
        const aN = twN   + (s / SEGS + 0.5 / SEGS) * Math.PI * 2;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha * 0.35})`;
        ctx.lineWidth   = 0.6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a)  * r,  cy + Math.sin(a)  * r);
        ctx.lineTo(cx + Math.cos(aN) * rN, cy + Math.sin(aN) * rN);
        ctx.stroke();
      }
    }
  }

  // Center glow
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.13);
  grd.addColorStop(0, `rgba(${c2r},${c2g},${c2b},0.22)`);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(W, H) * 0.13, 0, Math.PI * 2);
  ctx.fill();

  const now  = new Date();
  const tStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const fs   = Math.min(W * 0.12, H * 0.17, 130);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C1; ctx.shadowBlur = 55;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.5)`;
  ctx.fillText(tStr, cx, cy);
  ctx.shadowColor  = C2; ctx.shadowBlur = 22;
  ctx.fillStyle    = 'rgba(255,255,255,0.94)';
  ctx.fillText(tStr, cx, cy);
  ctx.shadowBlur   = 0;
}

export default { init, tick };
