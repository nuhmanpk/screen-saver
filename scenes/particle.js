import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Swarm that reassembles the time each second: particles scatter, then snap back into the digits.
const SAMP_W = 600, SAMP_H = 140;
let pts = [], lastStr = '', shock = 0, t = 0, off = null, oCtx = null;

function sample(str) {
  if (!off) { off = document.createElement('canvas'); oCtx = off.getContext('2d'); }
  off.width = SAMP_W; off.height = SAMP_H;
  oCtx.clearRect(0, 0, SAMP_W, SAMP_H);
  oCtx.fillStyle    = '#fff';
  oCtx.font         = `bold 96px 'JetBrains Mono', monospace`;
  oCtx.textAlign    = 'center';
  oCtx.textBaseline = 'middle';
  oCtx.fillText(str, SAMP_W / 2, SAMP_H / 2);
  const d = oCtx.getImageData(0, 0, SAMP_W, SAMP_H).data;
  const out = [];
  for (let y = 0; y < SAMP_H; y += 4)
    for (let x = 0; x < SAMP_W; x += 4)
      if (d[(y * SAMP_W + x) * 4 + 3] > 90) out.push([x, y]);
  return out;
}

function init() { pts = []; lastStr = ''; shock = 0; t = 0; }

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('particle');
  const spd = cfg.speed / 5;
  t += 0.01 * spd;

  const now  = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const str = `${pad(h)}:${pad(m)}:${pad(s)}`;

  const scale = Math.min(W * 0.8 / SAMP_W, H * 0.34 / SAMP_H, 2.4);
  const ox = W / 2 - SAMP_W * scale / 2;
  const oy = H / 2 - SAMP_H * scale / 2;

  if (str !== lastStr) {
    const targets = sample(str);
    const prev = pts;
    pts = targets.map((tg, i) => {
      const tx = ox + tg[0] * scale, ty = oy + tg[1] * scale;
      const p  = prev[i];
      if (p) { p.tx = tx; p.ty = ty; return p; }
      const a = Math.random() * Math.PI * 2, d = rand(W * 0.25, W * 0.7);
      return {
        x: W / 2 + Math.cos(a) * d, y: H / 2 + Math.sin(a) * d,
        vx: 0, vy: 0, tx, ty, frac: Math.random(), ph: rand(0, 6.3),
      };
    });
    // Every particle gets kicked outward, then springs home
    const cx = W / 2, cy = H / 2;
    pts.forEach(p => {
      const dx = p.x - cx, dy = p.y - cy;
      const len = Math.hypot(dx, dy) || 1;
      const push = s % 10 === 0 ? 9 : 5;
      p.vx += dx / len * push + rand(-2, 2);
      p.vy += dy / len * push + rand(-2, 2);
    });
    shock = 1;
    lastStr = str;
  }

  shock = Math.max(0, shock - 0.03);

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  // Physics: spring to target + a slow swirl so the swarm never looks static
  pts.forEach(p => {
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const k  = 0.055 * spd;
    const swirl = 0.5 + shock * 2;
    p.vx += dx * k + Math.sin(p.y * 0.01 + t * 2 + p.ph) * swirl * 0.35;
    p.vy += dy * k + Math.cos(p.x * 0.01 - t * 2 + p.ph) * swirl * 0.35;
    p.vx *= 0.86; p.vy *= 0.86;
    p.x  += p.vx; p.y  += p.vy;
    p.d   = Math.hypot(dx, dy);
  });

  // Constellation links between neighbours that are still settling
  ctx.lineWidth = 1;
  const step = Math.max(1, Math.floor(pts.length / 260));
  for (let i = 0; i < pts.length; i += step) {
    const a = pts[i];
    for (let j = i + step; j < Math.min(i + step * 7, pts.length); j += step) {
      const b = pts[j];
      const dd = Math.hypot(a.x - b.x, a.y - b.y);
      if (dd > Math.min(W, H) * 0.06) continue;
      const al = (1 - dd / (Math.min(W, H) * 0.06)) * (0.06 + shock * 0.22);
      ctx.strokeStyle = `rgba(${c2r},${c2g},${c2b},${al})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // Particles
  pts.forEach(p => {
    const settle = Math.max(0, 1 - p.d / (Math.min(W, H) * 0.25));
    const [r, g, b] = lerpColor(C1, C2, Math.min(1, p.frac * 0.4 + settle * 0.7));
    const size = 1.1 + settle * 1.4 + shock * 1.2;
    ctx.shadowColor = `rgb(${r},${g},${b})`;
    ctx.shadowBlur  = 6 + settle * 8;
    ctx.fillStyle   = `rgba(${r},${g},${b},${0.35 + settle * 0.6})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  // Ghost of the digits underneath, so the read stays instant
  const fs = SAMP_H * scale * 0.68;
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},${0.05 + shock * 0.08})`;
  ctx.fillText(str, W / 2, H / 2);
}

export default { init, tick };
