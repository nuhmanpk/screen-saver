import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Real aurora: drifting curtains over a ridgeline, brightness driven by the seconds.
let t = 0, stars = [], curtains = [], ridge = [];

function init() {
  t = 0;
  stars = Array.from({ length: 150 }, () => ({
    x: rand(0, W), y: rand(0, H * 0.8), r: rand(0.3, 1.4), ph: rand(0, 6.3),
  }));
  curtains = Array.from({ length: 5 }, (_, i) => ({
    x0:    rand(-W * 0.1, W * 0.9),
    w:     rand(W * 0.25, W * 0.7),
    top:   rand(H * 0.04, H * 0.2),
    len:   rand(H * 0.3, H * 0.58),
    k:     rand(0.004, 0.011),
    sp:    rand(0.25, 0.75) * (i % 2 ? 1 : -1),
    amp:   rand(W * 0.02, W * 0.07),
    tone:  i / 4,
    drift: rand(-0.12, 0.12),
  }));
  // Static ridgeline
  ridge = [];
  let y = H * 0.86;
  for (let x = -40; x <= W + 40; x += 26) {
    y += rand(-H * 0.03, H * 0.03);
    y = Math.max(H * 0.78, Math.min(H * 0.93, y));
    ridge.push([x, y]);
  }
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  t += 0.008 * (cfg.speed / 5);
  fillBg('aurora');

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const s = now.getSeconds(), ms = now.getMilliseconds();
  const sFrac = (s + ms / 1000) / 60;

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  stars.forEach(st => {
    const a = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3 + st.ph));
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Curtains: vertical light rays whose base wanders like fabric
  ctx.globalCompositeOperation = 'lighter';
  curtains.forEach((c, ci) => {
    c.x0 += c.drift * (cfg.speed / 5);
    if (c.x0 > W) c.x0 = -c.w;
    if (c.x0 + c.w < 0) c.x0 = W;

    const [r, g, b] = lerpColor(C1, C2, c.tone);
    const STEP = 5;
    for (let x = c.x0; x < c.x0 + c.w; x += STEP) {
      const u    = (x - c.x0) / c.w;
      const env  = Math.sin(u * Math.PI);                      // fade at both edges
      const fold = Math.sin(x * c.k + t * c.sp * 3 + ci)
                 + 0.5 * Math.sin(x * c.k * 2.7 - t * c.sp * 2);
      const top  = c.top + fold * c.amp;
      const len  = c.len * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(x * c.k * 1.7 + t * 2 + ci)));
      const a    = env * (0.05 + 0.07 * (cfg.intensity / 5))
                 * (0.55 + 0.45 * Math.sin(t * 1.3 + u * 4 + ci))
                 * (0.7 + 0.6 * sFrac);
      if (a <= 0.001) continue;

      const grad = ctx.createLinearGradient(0, top, 0, top + len);
      grad.addColorStop(0,    `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.25, `rgba(255,255,255,${a * 0.5})`);
      grad.addColorStop(0.5,  `rgba(${r},${g},${b},${a})`);
      grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, top, STEP + 1, len);
    }
  });
  ctx.globalCompositeOperation = 'source-over';

  // Time, sitting in the sky above the ridge
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.14, H * 0.19, 140) * (cfg.settings.aurora.needle / 70);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C1; ctx.shadowBlur = 44;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.35)`;
  ctx.fillText(tStr, W / 2, H * 0.5);
  ctx.shadowColor  = C2; ctx.shadowBlur = 16;
  ctx.fillStyle    = 'rgba(255,255,255,0.92)';
  ctx.fillText(tStr, W / 2, H * 0.5);
  ctx.shadowBlur   = 0;

  // Ridgeline silhouette, aurora glow catching the snow
  ctx.beginPath();
  ctx.moveTo(-40, H);
  ridge.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(W + 40, H);
  ctx.closePath();
  const gg = ctx.createLinearGradient(0, H * 0.78, 0, H);
  gg.addColorStop(0,    `rgba(${c1r},${c1g},${c1b},0.16)`);
  gg.addColorStop(0.35, 'rgba(0,0,0,0.92)');
  gg.addColorStop(1,    'rgba(0,0,0,1)');
  ctx.fillStyle = gg;
  ctx.fill();
  ctx.strokeStyle = `rgba(${c2r},${c2g},${c2b},0.3)`;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

export default { init, tick };
