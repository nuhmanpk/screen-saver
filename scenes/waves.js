import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let t = 0;

function init() {}

function tick() {
  setRafId(requestAnimationFrame(tick));
  t += 0.005 * (cfg.speed / 5);
  fillBg('waves');

  const cx = W / 2, cy = H / 2;
  const scale = cfg.settings.waves.needle / 70;
  const rMax  = Math.min(W, H) * 0.35 * scale;

  for (let i = 0; i < 3; i++) {
    const frac     = i / 2;
    const alpha    = 0.03 + (1 - frac) * 0.04;
    const rgbParts = lerpColor(C1, C2, frac);
    const amp      = (cfg.intensity / 10) * H * 0.06;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 10) {
      const y = H * (0.35 + frac * 0.3) + Math.sin(x * 0.003 + t + i * 2) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = `rgba(${rgbParts.join(',')}, ${alpha})`;
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, rMax, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(angle) * (rMax - 12);
    const y1 = cy + Math.sin(angle) * (rMax - 12);
    const x2 = cx + Math.cos(angle) * rMax;
    const y2 = cy + Math.sin(angle) * rMax;
    ctx.strokeStyle = i % 3 === 0
      ? `rgba(${hexToRgb(C2).join(',')},0.35)`
      : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = i % 3 === 0 ? 3 : 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds(), ms = now.getMilliseconds();
  const secAngle  = ((s + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2;
  const minAngle  = ((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = (((h % 12) + m / 60) / 12) * Math.PI * 2 - Math.PI / 2;

  function drawWavyHand(angle, length, width, color, freq, amp, phase) {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const frac = i / 40;
      const d    = frac * length;
      const bx   = cx + Math.cos(angle) * d;
      const by   = cy + Math.sin(angle) * d;
      const wo   = Math.sin(d * freq - phase) * amp * (1 - frac * 0.3);
      const wx   = bx - Math.sin(angle) * wo;
      const wy   = by + Math.cos(angle) * wo;
      if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
    ctx.lineCap     = 'round';
    ctx.stroke();
    const hx = cx + Math.cos(angle) * length;
    const hy = cy + Math.sin(angle) * length;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(hx, hy, width * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const handAmp = (cfg.intensity / 10) * 14;
  drawWavyHand(hourAngle, rMax * 0.55, 6,   C1,    0.04, handAmp * 0.7, t * 1.8);
  drawWavyHand(minAngle,  rMax * 0.78, 4,   C2,    0.03, handAmp,       t * 2.2);
  drawWavyHand(secAngle,  rMax * 0.9,  1.5, '#fff', 0.02, handAmp * 1.3, t * 3.5);

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle     = 'rgba(255,255,255,0.28)';
  ctx.font          = '15px JetBrains Mono, monospace';
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';
  ctx.fillText(`${pad(h)}:${pad(m)}:${pad(s)}`, cx, cy + rMax * 0.3);
}

export default { init, tick };
