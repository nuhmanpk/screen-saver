import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// A vine that grows over the course of each minute and blossoms at :59.
let segs = [], flowers = [], seedMin = -1, sway = 0;

// Deterministic PRNG so the same minute always grows the same plant.
function prng(seed) {
  let x = seed * 9301 + 49297;
  return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
}

function grow(x, y, ang, len, depth, t0, span, R) {
  const t1 = t0 + span;
  const x1 = x + Math.cos(ang) * len;
  const y1 = y + Math.sin(ang) * len;
  segs.push({ x0: x, y0: y, x1, y1, t0, t1, depth });

  if (depth <= 0 || len < Math.min(W, H) * 0.018) {
    flowers.push({ x: x1, y: y1, t: t1, petals: 5 + Math.floor(R() * 3), ang });
    return;
  }
  const branches = R() < 0.28 ? 3 : 2;
  for (let i = 0; i < branches; i++) {
    const spread = (i - (branches - 1) / 2) * (0.42 + R() * 0.38);
    grow(x1, y1, ang + spread + (R() - 0.5) * 0.16,
         len * (0.74 + R() * 0.14), depth - 1, t1, span * 0.72, R);
  }
}

function plant(minute) {
  segs = []; flowers = [];
  const R = prng(minute + 1);
  const trunk = Math.min(W, H) * (0.21 + R() * 0.05);
  grow(W / 2, H * 0.98, -Math.PI / 2, trunk, 6, 0, 0.26, R);
  // Normalise growth times into 0..1
  const maxT = Math.max(...segs.map(s => s.t1), 1);
  segs.forEach(s => { s.t0 /= maxT; s.t1 /= maxT; });
  flowers.forEach(f => { f.t /= maxT; });
}

function init() { seedMin = -1; sway = 0; }

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('bloom');
  sway += 0.012 * (cfg.speed / 5);

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const s = now.getSeconds(), ms = now.getMilliseconds();
  if (m !== seedMin) { seedMin = m; plant(h * 60 + m); }

  const g = (s + ms / 1000) / 60;                 // 0..1 growth over the minute
  const [c1r, c1g, c1b] = hexToRgb(C1);

  ctx.lineCap = 'round';
  segs.forEach(sg => {
    if (sg.t0 > g) return;
    const f  = Math.min(1, (g - sg.t0) / Math.max(sg.t1 - sg.t0, 1e-4));
    const wob = Math.sin(sway + sg.y0 * 0.01) * (6 - sg.depth) * 1.5;
    const x1 = sg.x0 + (sg.x1 - sg.x0) * f + wob * f;
    const y1 = sg.y0 + (sg.y1 - sg.y0) * f;
    const [r, gg, b] = lerpColor(C1, C2, 1 - sg.depth / 6);

    ctx.strokeStyle = `rgba(${r},${gg},${b},${0.25 + 0.5 * (sg.depth / 6)})`;
    ctx.lineWidth   = 0.6 + sg.depth * 0.9;
    ctx.shadowColor = `rgb(${r},${gg},${b})`;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.moveTo(sg.x0 + wob * f * 0.4, sg.y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  // Blossoms open once their branch has finished growing
  flowers.forEach(fl => {
    if (fl.t > g) return;
    const open = Math.min(1, (g - fl.t) * 6);
    const rad  = open * Math.min(W, H) * 0.016 * (cfg.intensity / 5 + 0.5);
    const wob  = Math.sin(sway + fl.y * 0.01) * 7;
    ctx.shadowColor = C2; ctx.shadowBlur = 16 * open;
    for (let p = 0; p < fl.petals; p++) {
      const a  = (p / fl.petals) * Math.PI * 2 + sway * 0.2;
      const px = fl.x + wob + Math.cos(a) * rad;
      const py = fl.y + Math.sin(a) * rad;
      ctx.fillStyle = `rgba(255,255,255,${0.16 + open * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(px, py, rad * 0.7, rad * 0.45, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = C2;
    ctx.beginPath();
    ctx.arc(fl.x + wob, fl.y, rad * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Time
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.13, H * 0.16, 120);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C1; ctx.shadowBlur = 38;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.32)`;
  ctx.fillText(tStr, W / 2, H * 0.2);
  ctx.shadowColor  = C2; ctx.shadowBlur = 14;
  ctx.fillStyle    = 'rgba(255,255,255,0.9)';
  ctx.fillText(tStr, W / 2, H * 0.2);
  ctx.shadowBlur   = 0;
}

export default { init, tick };
