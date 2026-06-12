import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let history = [], phase = 0;

function ekg(t) {
  const mod = ((t % 1) + 1) % 1;
  if (mod < 0.04)  return mod / 0.04 * 0.15;
  if (mod < 0.08)  return 0.15 - (mod - 0.04) / 0.04 * 0.15;
  if (mod < 0.12)  return -(mod - 0.08) / 0.04 * 0.35;
  if (mod < 0.145) return -0.35 + (mod - 0.12) / 0.025 * 2.2;
  if (mod < 0.175) return 1.85 - (mod - 0.145) / 0.03 * 2.4;
  if (mod < 0.22)  return -0.55 + (mod - 0.175) / 0.045 * 0.75;
  if (mod < 0.28)  return 0.2 - (mod - 0.22) / 0.06 * 0.25;
  return 0;
}

function init() { history = []; phase = 0; }

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('pulse');

  const spd   = cfg.speed / 5;
  const rate  = 0.006 * spd;

  const now  = new Date();
  const bpm  = 40 + (now.getSeconds() % 20) * 1.2;
  phase += rate * bpm / 60;
  history.push(ekg(phase));
  if (history.length > W) history.shift();

  const cy   = H * 0.5;
  const amp  = H * 0.28 * (cfg.intensity / 5);
  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);
  const len  = history.length;

  // Glow pass
  ctx.beginPath();
  history.forEach((v, i) => {
    const x = (i / len) * W;
    const y = cy - v * amp;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = `rgba(${c2r},${c2g},${c2b},0.25)`;
  ctx.lineWidth   = 8;
  ctx.shadowColor = C2; ctx.shadowBlur = 18;
  ctx.stroke();

  // Core line
  ctx.beginPath();
  history.forEach((v, i) => {
    const x = (i / len) * W;
    const y = cy - v * amp;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},0.9)`;
  ctx.lineWidth   = 1.5;
  ctx.shadowColor = C1; ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Baseline
  ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},0.06)`;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, cy); ctx.lineTo(W, cy);
  ctx.stroke();

  // Scan head glow
  const headX = W - 1;
  const grad  = ctx.createLinearGradient(headX - 120, 0, headX, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(${c2r},${c2g},${c2b},0.08)`);
  ctx.fillStyle = grad;
  ctx.fillRect(headX - 120, 0, 120, H);

  // Time
  const tStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const fs   = Math.min(W * 0.13, H * 0.18, 130);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C1; ctx.shadowBlur = 40;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.4)`;
  ctx.fillText(tStr, W / 2, H * 0.82);
  ctx.shadowColor  = C2; ctx.shadowBlur = 18;
  ctx.fillStyle    = 'rgba(255,255,255,0.92)';
  ctx.fillText(tStr, W / 2, H * 0.82);
  ctx.shadowBlur = 0;
}

export default { init, tick };
