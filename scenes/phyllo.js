import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Sunflower phyllotaxis: 720 seeds on the golden angle, a bloom pulse each second.
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const SEEDS  = 720;
let rot = 0;

function init() { rot = 0; }

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('phyllo');
  const spd = cfg.speed / 5;
  rot += 0.0016 * spd;

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const s = now.getSeconds(), ms = now.getMilliseconds();
  const sFrac = (s + ms / 1000) / 60;

  const cx = W / 2, cy = H / 2;
  const R  = Math.min(W, H) * 0.46 * (cfg.settings.phyllo.needle / 70);
  const c  = R / Math.sqrt(SEEDS);

  const [c1r, c1g, c1b] = hexToRgb(C1);

  // Wave front sweeping outward once per second
  const front = sFrac * 1.35 % 1;

  for (let i = 0; i < SEEDS; i++) {
    const f = i / SEEDS;
    const r = c * Math.sqrt(i);
    const a = i * GOLDEN + rot + f * (m / 60) * 0.6;      // minute twists the spiral
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;

    // Distance to the outward pulse
    const d    = Math.abs(f - front);
    const puls = Math.max(0, 1 - d * 9);

    // Seeds on the second/minute/hour rings get marked
    const isSec = i % 60 === s;
    const isMin = i % 60 === m % 60 && i > SEEDS * 0.5;
    const isHr  = i % 12 === h % 12 && i < SEEDS * 0.12;

    const size = c * (0.3 + f * 0.42) * (1 + puls * 1.4)
               + (isSec ? 2.4 : 0) + (isMin ? 1.4 : 0) + (isHr ? 1.2 : 0);
    const [rr, gg, bb] = lerpColor(C1, C2, Math.min(1, f * 1.1));
    const alpha = 0.1 + f * 0.28 + puls * 0.6
                + (isSec ? 0.45 : 0) + (isMin ? 0.25 : 0);

    if (puls > 0.55 || isSec) { ctx.shadowColor = `rgb(${rr},${gg},${bb})`; ctx.shadowBlur = 12; }
    ctx.fillStyle = `rgba(${rr},${gg},${bb},${Math.min(1, alpha)})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.6, size), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Core disc so the readout stays legible
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.34);
  core.addColorStop(0, `rgba(0,0,0,0.72)`);
  core.addColorStop(0.6, `rgba(${c1r},${c1g},${c1b},0.12)`);
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.34, 0, Math.PI * 2);
  ctx.fill();

  // Time
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.12, H * 0.16, 120);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C2; ctx.shadowBlur = 22;
  ctx.fillStyle    = 'rgba(255,255,255,0.95)';
  ctx.fillText(tStr, cx, cy);
  ctx.shadowBlur   = 0;
}

export default { init, tick };
