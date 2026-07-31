import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Pendulum wave: 60 bobs whose frequencies re-align exactly at :00 each minute.
const N = 60;
let trails = [];

function init() { trails = Array.from({ length: N }, () => []); }

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('pendulum');

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const s = now.getSeconds(), ms = now.getMilliseconds();
  const t = s + ms / 1000;                       // 0..60, resets the wave each minute

  const pivotY = H * 0.1;
  const scale  = cfg.settings.pendulum.needle / 70;
  const Lmin   = H * 0.16 * scale;
  const Lmax   = H * 0.66 * scale;
  const amp    = Math.min(0.3, (W / N) / (Lmax * 0.9) * 1.6) * (cfg.intensity / 5);

  const [c1r, c1g, c1b] = hexToRgb(C1);

  // Support rail
  ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},0.22)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.04, pivotY); ctx.lineTo(W * 0.96, pivotY);
  ctx.stroke();

  const bobs = [];
  for (let k = 0; k < N; k++) {
    const f  = (30 + k) / 60;                    // cycles per second → all in phase at t=0
    const L  = Lmax - (Lmax - Lmin) * (k / (N - 1));
    const px = W * 0.06 + (W * 0.88) * (k / (N - 1));
    const th = amp * Math.cos(2 * Math.PI * f * t);
    const bx = px + Math.sin(th) * L;
    const by = pivotY + Math.cos(th) * L;
    bobs.push({ px, bx, by, k });

    const tr = trails[k];
    tr.push([bx, by]);
    if (tr.length > 24) tr.shift();
  }

  // Strings
  bobs.forEach(({ px, bx, by, k }) => {
    const [r, g, b] = lerpColor(C1, C2, k / (N - 1));
    ctx.strokeStyle = `rgba(${r},${g},${b},0.2)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, pivotY); ctx.lineTo(bx, by);
    ctx.stroke();
  });

  // Motion trails
  trails.forEach((tr, k) => {
    const [r, g, b] = lerpColor(C1, C2, k / (N - 1));
    for (let i = 1; i < tr.length; i++) {
      const a = (i / tr.length) * 0.35;
      ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
      ctx.lineWidth = 2.5 * (i / tr.length);
      ctx.beginPath();
      ctx.moveTo(tr[i - 1][0], tr[i - 1][1]);
      ctx.lineTo(tr[i][0], tr[i][1]);
      ctx.stroke();
    }
  });

  // Bobs — index s / m / h%12*5 are the marked ones
  bobs.forEach(({ bx, by, k }) => {
    const [r, g, b] = lerpColor(C1, C2, k / (N - 1));
    let rad = 4, glow = 10, core = 0.75;
    if (k === s)                { rad = 10; glow = 30; core = 1; }
    else if (k === m)           { rad = 7.5; glow = 22; core = 0.95; }
    else if (k === (h % 12) * 5) { rad = 6; glow = 18; core = 0.9; }

    ctx.shadowColor = `rgb(${r},${g},${b})`; ctx.shadowBlur = glow;
    const bg = ctx.createRadialGradient(bx - rad * 0.3, by - rad * 0.3, 0, bx, by, rad);
    bg.addColorStop(0, `rgba(255,255,255,${core})`);
    bg.addColorStop(0.55, `rgba(${r},${g},${b},0.9)`);
    bg.addColorStop(1, `rgba(${r},${g},${b},0.05)`);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(bx, by, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Time
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.1, H * 0.13, 96);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C1; ctx.shadowBlur = 34;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.32)`;
  ctx.fillText(tStr, W / 2, H * 0.86);
  ctx.shadowColor  = C2; ctx.shadowBlur = 14;
  ctx.fillStyle    = 'rgba(255,255,255,0.9)';
  ctx.fillText(tStr, W / 2, H * 0.86);
  ctx.shadowBlur   = 0;
}

export default { init, tick };
