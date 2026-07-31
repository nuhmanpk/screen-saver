import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Shattered glass: a drifting Voronoi lattice, one shard flares per second.
let sites = [], lastSec = -1, flare = null;

function init() {
  const n = 34 + Math.round(cfg.intensity * 3);
  sites = Array.from({ length: n }, () => ({
    x: rand(0, W), y: rand(0, H),
    vx: rand(-0.22, 0.22), vy: rand(-0.22, 0.22),
    ph: rand(0, Math.PI * 2),
  }));
  lastSec = -1; flare = null;
}

// Clip poly to the half-plane nearer to a than to b.
function clip(poly, ax, ay, bx, by) {
  const nx = bx - ax, ny = by - ay;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const side = p => (p[0] - mx) * nx + (p[1] - my) * ny;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const sp = side(p), sq = side(q);
    if (sp <= 0) out.push(p);
    if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('crystal');
  const spd = cfg.speed / 5;

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  if (s !== lastSec) {
    lastSec = s;
    flare = { i: Math.floor(Math.random() * sites.length), life: 1 };
  }

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const cx = W / 2, cy = H / 2;
  const maxD = Math.hypot(cx, cy);

  sites.forEach(p => {
    p.x += p.vx * spd; p.y += p.vy * spd;
    p.ph += 0.01 * spd;
    if (p.x < -40 || p.x > W + 40) p.vx *= -1;
    if (p.y < -40 || p.y > H + 40) p.vy *= -1;
  });

  const box = [[-40, -40], [W + 40, -40], [W + 40, H + 40], [-40, H + 40]];

  sites.forEach((p, i) => {
    // Nearest neighbours are enough to bound the cell
    const near = sites
      .map((q, j) => ({ q, j, d: (q.x - p.x) ** 2 + (q.y - p.y) ** 2 }))
      .filter(o => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 12);

    let poly = box;
    for (const { q } of near) {
      poly = clip(poly, p.x, p.y, q.x, q.y);
      if (poly.length < 3) break;
    }
    if (poly.length < 3) return;

    const d    = Math.hypot(p.x - cx, p.y - cy) / maxD;
    const hot  = flare && flare.i === i ? flare.life : 0;
    const puls = 0.5 + 0.5 * Math.sin(p.ph);
    const [r, g, b] = lerpColor(C1, C2, Math.min(1, d + puls * 0.25));

    ctx.beginPath();
    poly.forEach((pt, k) => k ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]));
    ctx.closePath();
    ctx.fillStyle = `rgba(${r},${g},${b},${0.03 + puls * 0.045 + hot * 0.4})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.2 + puls * 0.2 + hot * 0.7})`;
    ctx.lineWidth   = 1 + hot * 2;
    ctx.shadowColor = `rgb(${r},${g},${b})`;
    ctx.shadowBlur  = 6 + hot * 26;
    ctx.stroke();
    ctx.shadowBlur  = 0;
  });

  if (flare) { flare.life *= 0.9; if (flare.life < 0.02) flare = null; }

  // Time
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.14, H * 0.19, 140) * (cfg.settings.crystal.needle / 70);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C1; ctx.shadowBlur = 42;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.35)`;
  ctx.fillText(tStr, cx, cy);
  ctx.shadowColor  = C2; ctx.shadowBlur = 16;
  ctx.fillStyle    = 'rgba(255,255,255,0.94)';
  ctx.fillText(tStr, cx, cy);
  ctx.shadowBlur   = 0;
}

export default { init, tick };
