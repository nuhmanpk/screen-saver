import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// A harp: each second plucks one string, each minute strums the whole set.
const N = 14;
let strs = [], lastSec = -1, t = 0;

function init() {
  strs = Array.from({ length: N }, (_, i) => ({
    amp: 0,
    mode: 1 + (i % 4),          // standing-wave harmonic
    freq: 2.2 + i * 0.55,       // vibration rate
    ph: 0,
  }));
  lastSec = -1; t = 0;
}

function pluck(i, power) {
  const st = strs[i % N];
  st.amp  = power;
  st.ph   = 0;
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('strings');
  const spd = cfg.speed / 5;
  t += 0.016 * spd;

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();

  if (s !== lastSec) {
    lastSec = s;
    if (s === 0) strs.forEach((_, i) => pluck(i, 1));         // minute strum
    else {
      pluck(s % N, 1);
      if (s % 15 === 0) pluck((s + 5) % N, 0.7);
      // hour + minute keep two strings gently ringing
      strs[h % N].mode = 1 + (h % 5);
      strs[m % N].mode = 1 + (m % 6);
    }
  }

  const x0 = W * 0.08, x1 = W * 0.92, L = x1 - x0;
  const top = H * 0.16, bot = H * 0.84;
  const maxA = (bot - top) / (N + 1) * 0.85 * (cfg.intensity / 5);
  const [c1r, c1g, c1b] = hexToRgb(C1);

  // Frame posts
  ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},0.18)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, top - 12); ctx.lineTo(x0, bot + 12);
  ctx.moveTo(x1, top - 12); ctx.lineTo(x1, bot + 12);
  ctx.stroke();

  strs.forEach((st, i) => {
    const y = top + (bot - top) * (i / (N - 1));
    st.ph += st.freq * 0.09 * spd;
    st.amp = 0.045 + (st.amp - 0.045) * 0.991;        // decay to a faint shimmer
    const a = st.amp * maxA;
    const [r, g, b] = lerpColor(C1, C2, i / (N - 1));

    ctx.beginPath();
    const STEP = 6;
    for (let x = x0; x <= x1; x += STEP) {
      const u  = (x - x0) / L;
      const dy = a * Math.sin(Math.PI * st.mode * u) * Math.cos(st.ph);
      x === x0 ? ctx.moveTo(x, y + dy) : ctx.lineTo(x, y + dy);
    }
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.14 + st.amp * 0.8})`;
    ctx.lineWidth   = 1 + st.amp * 2.2;
    ctx.shadowColor = `rgb(${r},${g},${b})`;
    ctx.shadowBlur  = 6 + st.amp * 26;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Antinode sparks on a hot string
    if (st.amp > 0.15) {
      for (let k = 1; k <= st.mode; k++) {
        const u  = (k - 0.5) / st.mode;
        const px = x0 + u * L;
        const dy = a * Math.sin(Math.PI * st.mode * u) * Math.cos(st.ph);
        ctx.fillStyle   = `rgba(255,255,255,${st.amp * 0.8})`;
        ctx.shadowColor = C2; ctx.shadowBlur = 14 * st.amp;
        ctx.beginPath();
        ctx.arc(px, y + dy, 2 + st.amp * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  });

  // Time
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.13, H * 0.17, 130) * (cfg.settings.strings.needle / 70);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C1; ctx.shadowBlur = 40;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.32)`;
  ctx.fillText(tStr, W / 2, H / 2);
  ctx.shadowColor  = C2; ctx.shadowBlur = 15;
  ctx.fillStyle    = 'rgba(255,255,255,0.93)';
  ctx.fillText(tStr, W / 2, H / 2);
  ctx.shadowBlur   = 0;
}

export default { init, tick };
