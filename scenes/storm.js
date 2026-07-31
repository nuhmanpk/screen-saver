import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Fractal lightning: one strike per second, branching bolts + flash decay.
let bolts = [], flash = 0, lastSec = -1, clouds = [];

function makeBolt(x0, y0, x1, y1, depth, spread, out) {
  if (depth === 0) { out.push([x0, y0, x1, y1, depth]); return; }
  const mx = (x0 + x1) / 2 + rand(-spread, spread);
  const my = (y0 + y1) / 2 + rand(-spread * 0.25, spread * 0.25);
  makeBolt(x0, y0, mx, my, depth - 1, spread / 2, out);
  makeBolt(mx, my, x1, y1, depth - 1, spread / 2, out);

  // Occasional fork that dies out
  if (depth > 1 && Math.random() < 0.55) {
    const dx = (x1 - x0) * rand(0.25, 0.7) + rand(-spread, spread);
    const dy = (y1 - y0) * rand(0.25, 0.7);
    makeBolt(mx, my, mx + dx, my + dy, depth - 2, spread / 2, out);
  }
}

function strike() {
  const segs = [];
  const x0 = rand(W * 0.15, W * 0.85);
  const x1 = x0 + rand(-W * 0.22, W * 0.22);
  makeBolt(x0, -20, x1, H + 20, 7, Math.min(W, H) * 0.15, segs);
  bolts.push({ segs, life: 1, hot: Math.random() < 0.5 });
  if (bolts.length > 5) bolts.shift();
  flash = Math.min(1, flash + rand(0.45, 0.9));
}

function init() {
  bolts = []; flash = 0; lastSec = -1;
  clouds = Array.from({ length: 7 }, () => ({
    x: rand(0, W), y: rand(-H * 0.05, H * 0.32),
    r: rand(Math.min(W, H) * 0.18, Math.min(W, H) * 0.42),
    d: rand(0.2, 0.8),
  }));
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  const spd = cfg.speed / 5;
  fillBg('storm');

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  if (s !== lastSec) {
    lastSec = s;
    strike();
    if (s === 0) { strike(); strike(); }   // minute rollover: triple flash
  }

  // Storm clouds lit from within by the flash
  clouds.forEach(c => {
    c.x += 0.06 * spd * c.d;
    if (c.x - c.r > W) c.x = -c.r;
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    const lit = 0.05 + flash * 0.85 * c.d;
    g.addColorStop(0, `rgba(${c1r},${c1g},${c1b},${lit})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Bolts
  bolts = bolts.filter(b => b.life > 0.02);
  bolts.forEach(b => {
    b.life *= 0.93;
    const [br, bg, bb] = lerpColor(C1, C2, b.hot ? 0.85 : 0.25);

    ctx.lineCap = 'round';
    // Outer glow pass
    ctx.strokeStyle = `rgba(${br},${bg},${bb},${b.life * 0.32})`;
    ctx.lineWidth   = 9;
    ctx.shadowColor = b.hot ? C2 : C1; ctx.shadowBlur = 28 * b.life;
    ctx.beginPath();
    b.segs.forEach(([x0, y0, x1, y1]) => { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); });
    ctx.stroke();

    // Hot core
    ctx.strokeStyle = `rgba(255,255,255,${b.life * 0.95})`;
    ctx.lineWidth   = 1.6;
    ctx.shadowBlur  = 12 * b.life;
    ctx.beginPath();
    b.segs.forEach(([x0, y0, x1, y1]) => { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); });
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // Full-screen flash
  if (flash > 0.01) {
    ctx.fillStyle = `rgba(${c2r},${c2g},${c2b},${flash * 0.13})`;
    ctx.fillRect(0, 0, W, H);
    flash *= 0.82;
  } else flash = 0;

  // Time — dark silhouette that only the flash reveals
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.15, H * 0.2, 150) * (cfg.settings.storm.needle / 70);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C1; ctx.shadowBlur = 30 + flash * 60;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},${0.3 + flash * 0.5})`;
  ctx.fillText(tStr, W / 2, H / 2);
  ctx.shadowColor  = C2; ctx.shadowBlur = 14;
  ctx.fillStyle    = `rgba(255,255,255,${0.6 + flash * 0.4})`;
  ctx.fillText(tStr, W / 2, H / 2);
  ctx.shadowBlur   = 0;
}

export default { init, tick };
