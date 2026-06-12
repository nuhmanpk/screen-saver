import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let phase = 0;

function init() { phase = 0; }

function tick() {
  setRafId(requestAnimationFrame(tick));
  const spd = cfg.speed / 5;
  phase += 0.003 * spd;
  fillBg('ripple');

  const cx = W / 2, cy = H / 2;
  const rx = Math.min(W, H) * 0.42;
  const ry = rx;

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  const now = new Date();
  const h  = now.getHours(), m = now.getMinutes();
  const s  = now.getSeconds(), ms = now.getMilliseconds();

  const a = 1 + (h % 4);                             // 1-4, changes per hour
  const b = 1 + (m % 4);                             // 1-4, changes per minute
  const δ = (s + ms / 1000) / 60 * Math.PI * 2;      // full sweep per minute

  const STEPS = 2400;

  // Pre-compute all points
  const pts = [];
  for (let i = 0; i <= STEPS; i++) {
    const θ = (i / STEPS) * Math.PI * 2;
    pts.push([
      cx + rx * Math.sin(a * θ + δ + phase),
      cy + ry * Math.sin(b * θ),
    ]);
  }

  // Ghost full figure
  ctx.beginPath();
  pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
  ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},0.055)`;
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Animated bright tail: 8 gradient segments
  const SEGS    = 8;
  const TAIL    = Math.floor(STEPS * 0.27);
  const headIdx = Math.floor(Math.abs(phase * 200) % STEPS);

  for (let seg = 0; seg < SEGS; seg++) {
    const f0 = seg / SEGS;
    const i0 = headIdx - TAIL + Math.floor(TAIL * f0);
    const i1 = headIdx - TAIL + Math.floor(TAIL * (seg + 1) / SEGS);

    ctx.beginPath();
    for (let i = i0; i <= i1; i++) {
      const p = pts[((i % STEPS) + STEPS) % STEPS];
      if (i === i0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
    const [cr, cg, cb] = lerpColor(C1, C2, f0);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${f0 * 0.88 + 0.04})`;
    ctx.lineWidth   = 1 + f0 * 2.2;
    ctx.stroke();
  }

  // Head glow dot
  const hp = pts[headIdx];
  ctx.shadowColor = C2; ctx.shadowBlur = 20;
  ctx.fillStyle   = '#ffffff';
  ctx.beginPath();
  ctx.arc(hp[0], hp[1], 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur  = 0;

  // Time
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.12, H * 0.17, 120);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C1; ctx.shadowBlur = 40;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.38)`;
  ctx.fillText(tStr, cx, cy);
  ctx.shadowColor  = C2; ctx.shadowBlur = 15;
  ctx.fillStyle    = 'rgba(255,255,255,0.93)';
  ctx.fillText(tStr, cx, cy);
  ctx.shadowBlur   = 0;
}

export default { init, tick };
