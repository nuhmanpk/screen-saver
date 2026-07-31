import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Ink dropped in water: one drop per second, curl-noise tendrils, slow bleed-out.
let parts = [], lastSec = -1, off = null, oCtx = null, t = 0, lastTs = 0;

function curl(x, y, t) {
  const a = Math.sin(x * 0.0042 + t) * Math.cos(y * 0.0037 - t * 0.7)
          + 0.6 * Math.sin(x * 0.014 - t * 1.7) * Math.cos(y * 0.012 + t);
  const b = Math.cos(x * 0.0031 - t * 0.6) * Math.sin(y * 0.0049 + t * 0.4)
          + 0.6 * Math.cos(x * 0.011 + t * 1.3) * Math.sin(y * 0.013 - t);
  return [b, -a];
}

function drop() {
  const cx = rand(W * 0.15, W * 0.85);
  const cy = rand(H * 0.15, H * 0.85);
  const n  = 80 + cfg.intensity * 14;
  const tone = Math.random();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(-0.1, 0.1);
    const v = rand(1.4, 5.2);
    parts.push({
      x: cx, y: cy,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      r: rand(1.0, 3.6), life: 1, tone: tone + rand(-0.12, 0.12),
    });
  }
  if (parts.length > 6000) parts.splice(0, parts.length - 6000);
}

function init() {
  parts = []; lastSec = -1; t = 0; lastTs = 0;
  if (!off) { off = document.createElement('canvas'); oCtx = off.getContext('2d'); }
  off.width = W; off.height = H;
  oCtx.clearRect(0, 0, W, H);
}

function tick(ts) {
  setRafId(requestAnimationFrame(tick));
  const spd = cfg.speed / 5;

  // Time-based so dispersal looks the same at 60 Hz or 120 Hz
  const k = Math.min((ts - lastTs) / 16.67, 3) || 1;
  lastTs = ts;
  t += 0.004 * spd * k;

  if (off.width !== W || off.height !== H) { off.width = W; off.height = H; }

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  if (s !== lastSec) { lastSec = s; drop(); if (s === 0) { drop(); drop(); } }

  // Fade the accumulation buffer — the ink slowly disperses
  oCtx.globalCompositeOperation = 'destination-out';
  oCtx.fillStyle = `rgba(0,0,0,${0.0032 * k})`;
  oCtx.fillRect(0, 0, W, H);
  oCtx.globalCompositeOperation = 'lighter';

  parts = parts.filter(p => p.life > 0.03);
  parts.forEach(p => {
    const [fx, fy] = curl(p.x, p.y, t);
    const damp = Math.pow(0.955, k);
    p.vx = p.vx * damp + fx * 0.32 * spd * k;
    p.vy = p.vy * damp + fy * 0.32 * spd * k + 0.005 * k;   // faint sink
    p.x += p.vx * spd * k;
    p.y += p.vy * spd * k;
    p.life *= Math.pow(0.997, k);
    p.r += 0.02 * spd * k;

    const [r, g, b] = lerpColor(C1, C2, Math.min(1, p.tone * 0.6 + (1 - p.life) * 0.7));
    oCtx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.5, p.life * 0.075 * k)})`;
    oCtx.beginPath();
    oCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    oCtx.fill();
  });
  oCtx.globalCompositeOperation = 'source-over';

  fillBg('ink');
  ctx.drawImage(off, 0, 0);

  // Time
  const [c1r, c1g, c1b] = hexToRgb(C1);
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.14, H * 0.19, 140) * (cfg.settings.ink.needle / 70);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C1; ctx.shadowBlur = 40;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.35)`;
  ctx.fillText(tStr, W / 2, H / 2);
  ctx.shadowColor  = C2; ctx.shadowBlur = 15;
  ctx.fillStyle    = 'rgba(255,255,255,0.92)';
  ctx.fillText(tStr, W / 2, H / 2);
  ctx.shadowBlur   = 0;
}

function destroy() { parts = []; }

export default { init, tick, destroy };
