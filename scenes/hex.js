import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Honeycomb: the whole screen is a comb, the time burns through it, ripples wash across.
let cells = [], t = 0, lastStr = '', mask = null, mCtx = null, MW = 260, MH = 0;

function buildMask(str) {
  if (!mask) { mask = document.createElement('canvas'); mCtx = mask.getContext('2d'); }
  MH = Math.max(1, Math.round(MW * H / W));
  if (mask.width !== MW || mask.height !== MH) { mask.width = MW; mask.height = MH; }
  mCtx.clearRect(0, 0, MW, MH);
  const fs = Math.min(MW * 0.185, MH * 0.3);
  mCtx.font         = `700 ${fs}px 'JetBrains Mono', monospace`;
  mCtx.textAlign    = 'center';
  mCtx.textBaseline = 'middle';
  mCtx.fillStyle    = '#fff';
  mCtx.fillText(str, MW / 2, MH / 2);
  const d = mCtx.getImageData(0, 0, MW, MH).data;
  cells.forEach(c => {
    const mx = Math.round(c.x / W * MW), my = Math.round(c.y / H * MH);
    const i  = (Math.min(MH - 1, my) * MW + Math.min(MW - 1, mx)) * 4 + 3;
    const on = d[i] > 100;
    if (on && !c.on) c.ignite = 1;                // fresh cell flares as it lights
    c.on = on;
  });
}

function init() {
  t = 0; lastStr = '';
  const R  = Math.max(14, Math.min(W, H) / 22);   // hex circumradius
  const dx = R * 1.5, dy = R * Math.sqrt(3);
  cells = [];
  for (let col = 0; col * dx < W + R; col++) {
    for (let row = 0; row * dy < H + R; row++) {
      const x = col * dx;
      const y = row * dy + (col % 2 ? dy / 2 : 0);
      cells.push({
        x, y, r: R * 0.86, on: false, ignite: 0,
        d: Math.hypot(x - W / 2, y - H / 2) / Math.hypot(W / 2, H / 2),
      });
    }
  }
}

function hexPath(x, y, r) {
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const hx = x + r * Math.cos(a), hy = y + r * Math.sin(a);
    i ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy);
  }
  ctx.closePath();
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('hex');
  t += 0.014 * (cfg.speed / 5);

  const now  = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const str = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (str !== lastStr) { lastStr = str; buildMask(str); }

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);
  const amp = cfg.intensity / 5;

  // Dormant comb, with a ripple travelling outward from the centre
  ctx.lineWidth = 1;
  cells.forEach(c => {
    if (c.on) return;
    const wave = 0.5 + 0.5 * Math.sin(c.d * 14 - t * 3);
    const a    = (0.035 + wave * 0.075 * amp);
    ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},${a})`;
    ctx.beginPath();
    hexPath(c.x, c.y, c.r * (0.9 + wave * 0.06));
    ctx.stroke();
  });

  // Lit cells forming the digits
  cells.forEach(c => {
    if (!c.on) return;
    const [r, g, b] = lerpColor(C1, C2, Math.min(1, c.x / W));
    const flare = c.ignite;
    if (c.ignite > 0) c.ignite = Math.max(0, c.ignite - 0.05);
    const pulse = 0.5 + 0.5 * Math.sin(c.d * 10 - t * 4);

    ctx.beginPath();
    hexPath(c.x, c.y, c.r * (0.94 + flare * 0.12));
    ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + pulse * 0.2 + flare * 0.5})`;
    ctx.shadowColor = `rgb(${r},${g},${b})`;
    ctx.shadowBlur  = 12 + flare * 26;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + flare * 0.6})`;
    ctx.lineWidth   = 1.2;
    ctx.stroke();
    ctx.shadowBlur  = 0;
  });

  // Seconds trickle along the bottom edge of the comb
  const sFrac = (s + now.getMilliseconds() / 1000) / 60;
  ctx.strokeStyle = `rgba(${c2r},${c2g},${c2b},0.45)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H - 3); ctx.lineTo(W * sFrac, H - 3);
  ctx.stroke();
}

export default { init, tick };
