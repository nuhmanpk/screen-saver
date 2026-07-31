import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Soap bubbles: iridescent rims, wobbling skins, one pops on every second.
let bubbles = [], pops = [], t = 0, lastSec = -1, lastTs = 0;

function makeBubble() {
  const r = rand(Math.min(W, H) * 0.05, Math.min(W, H) * 0.16);
  return {
    x: rand(r, W - r), y: rand(H * 0.9, H * 1.35),
    r, rise: rand(8, 26) / (r / 40),
    wob: rand(0, 6.3), wobF: rand(0.6, 1.6), wobA: rand(0.02, 0.07),
    drift: rand(-0.35, 0.35), tone: Math.random(), spin: rand(-0.5, 0.5),
  };
}

function init() {
  t = 0; lastSec = -1; lastTs = 0; pops = [];
  bubbles = Array.from({ length: 14 }, () => {
    const b = makeBubble();
    b.y = rand(-H * 0.1, H);
    return b;
  });
}

function tick(ts) {
  setRafId(requestAnimationFrame(tick));
  const dt = Math.min((ts - lastTs) / 1000, 0.05) || 0.016;
  lastTs = ts;
  const spd = cfg.speed / 5;
  t += dt * spd;
  fillBg('bubble');

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();

  // A bubble bursts each second
  if (s !== lastSec) {
    lastSec = s;
    if (bubbles.length) {
      const i = Math.floor(Math.random() * bubbles.length);
      const b = bubbles[i];
      pops.push({ x: b.x, y: b.y, r: b.r, life: 1, tone: b.tone });
      bubbles[i] = makeBubble();
    }
  }
  while (bubbles.length < 14) bubbles.push(makeBubble());

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  bubbles.forEach(b => {
    b.y -= b.rise * dt * 10 * spd;
    b.x += b.drift * spd;
    b.wob += dt * b.wobF * 2;
    if (b.y + b.r < -20) Object.assign(b, makeBubble());
    if (b.x < -b.r) b.x = W + b.r;
    if (b.x > W + b.r) b.x = -b.r;

    // Wobbling skin
    ctx.beginPath();
    const STEP = Math.PI / 22;
    for (let a = 0; a <= Math.PI * 2 + 0.001; a += STEP) {
      const rr = b.r * (1 + Math.sin(a * 3 + b.wob) * b.wobA
                          + Math.sin(a * 5 - b.wob * 1.4) * b.wobA * 0.6);
      const x = b.x + Math.cos(a) * rr, y = b.y + Math.sin(a) * rr;
      a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Thin film interior
    const [ir, ig, ib] = lerpColor(C1, C2, b.tone);
    const fill = ctx.createRadialGradient(
      b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
    fill.addColorStop(0,    `rgba(255,255,255,0.1)`);
    fill.addColorStop(0.55, `rgba(${ir},${ig},${ib},0.06)`);
    fill.addColorStop(0.88, `rgba(${ir},${ig},${ib},0.16)`);
    fill.addColorStop(1,    `rgba(255,255,255,0.3)`);
    ctx.fillStyle = fill;
    ctx.fill();

    // Iridescent rim: the film shifts colour around the circumference
    const ang = t * b.spin;
    const rim = ctx.createLinearGradient(
      b.x + Math.cos(ang) * b.r, b.y + Math.sin(ang) * b.r,
      b.x - Math.cos(ang) * b.r, b.y - Math.sin(ang) * b.r);
    rim.addColorStop(0,   `rgba(${c1r},${c1g},${c1b},0.75)`);
    rim.addColorStop(0.4, `rgba(255,255,255,0.5)`);
    rim.addColorStop(0.7, `rgba(${c2r},${c2g},${c2b},0.7)`);
    rim.addColorStop(1,   `rgba(${c1r},${c1g},${c1b},0.3)`);
    ctx.strokeStyle = rim;
    ctx.lineWidth   = 1.6;
    ctx.shadowColor = `rgb(${ir},${ig},${ib})`;
    ctx.shadowBlur  = 14;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Specular highlights
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(b.x - b.r * 0.38, b.y - b.r * 0.42, b.r * 0.16, b.r * 0.1, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(b.x + b.r * 0.4, b.y + b.r * 0.34, b.r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });

  // Bursts: expanding ring plus film shreds
  pops = pops.filter(p => p.life > 0);
  pops.forEach(p => {
    p.life -= dt * 1.8;
    const e = 1 - p.life;
    const [r, g, b] = lerpColor(C1, C2, p.tone);
    ctx.strokeStyle = `rgba(${r},${g},${b},${p.life * 0.7})`;
    ctx.lineWidth   = 2 * p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (1 + e * 0.9), 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + p.tone * 6;
      const d = p.r * (1 + e * 1.6);
      ctx.fillStyle = `rgba(255,255,255,${p.life * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1.6 * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Time
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.15, H * 0.21, 148) * (cfg.settings.bubble.needle / 70);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C2; ctx.shadowBlur = 45;
  ctx.fillStyle    = `rgba(${c2r},${c2g},${c2b},0.45)`;
  ctx.fillText(tStr, W / 2, H / 2);
  ctx.shadowBlur   = 0;
  ctx.fillStyle    = 'rgba(255,255,255,0.94)';
  ctx.fillText(tStr, W / 2, H / 2);
}

function destroy() { pops = []; }

export default { init, tick, destroy };
