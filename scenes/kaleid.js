import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let t = 0;

function init() { t = 0; }

function tick() {
  setRafId(requestAnimationFrame(tick));
  t += 0.006 * (cfg.speed / 5);
  fillBg('kaleid');

  const cx = W / 2, cy = H / 2;
  const N  = 8;
  const R  = Math.min(W, H) * 0.44;

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  // Clip to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  for (let i = 0; i < N; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / N) * Math.PI * 2 + t * 0.15);
    if (i % 2 === 1) ctx.scale(-1, 1);

    const wedge = Math.PI * 2 / N;

    // Draw shapes in one wedge slice
    for (let j = 0; j < 5; j++) {
      const ang  = (j / 5) * wedge;
      const ang2 = ((j + 1) / 5) * wedge;
      const r1   = R * (0.15 + j * 0.17);
      const r2   = R * (0.28 + j * 0.17);
      const frac = (j / 4 + Math.sin(t * 0.4 + j * 1.3) * 0.3 + 0.5) % 1;
      const [cr, cg, cb] = lerpColor(C1, C2, Math.abs(frac));

      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
      ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
      ctx.arc(0, 0, r2, ang, ang2);
      ctx.lineTo(Math.cos(ang2) * r1, Math.sin(ang2) * r1);
      ctx.arc(0, 0, r1, ang2, ang, true);
      ctx.closePath();

      const intensity = cfg.intensity / 10;
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.06 + intensity * 0.12})`;
      ctx.fill();

      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.2 + intensity * 0.2})`;
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

    // Radial lines
    for (let j = 0; j < 6; j++) {
      const ang   = (j / 5) * wedge;
      const alpha = j === 0 || j === 5 ? 0.2 : 0.06;
      ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},${alpha})`;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * R, Math.sin(ang) * R);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore(); // end clip

  // Center circle
  const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.12);
  cGrad.addColorStop(0, `rgba(${c2r},${c2g},${c2b},0.5)`);
  cGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Time
  const now  = new Date();
  const tStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const fs   = Math.min(R * 0.2, 38);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C2; ctx.shadowBlur = 18;
  ctx.fillStyle    = '#ffffff';
  ctx.fillText(tStr, cx, cy);
  ctx.shadowBlur = 0;

  // Outer ring
  ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},0.15)`;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
}

export default { init, tick };
