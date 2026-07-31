import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Hourglass: the upper bulb drains over the minute, then the glass flips.
let grains = [], flip = 0, lastMin = -1, lastTs = 0;

function init() { grains = []; flip = 0; lastMin = -1; lastTs = 0; }

// Bulb outline: half-width of the glass at height u (0 = top, 1 = bottom)
function halfW(u, w) {
  const k = Math.abs(u - 0.5) * 2;                  // 1 at the ends, 0 at the neck
  return w * (0.08 + Math.pow(k, 1.35) * 0.92);
}

function tick(ts) {
  setRafId(requestAnimationFrame(tick));
  const dt = Math.min((ts - lastTs) / 1000, 0.05) || 0.016;
  lastTs = ts;
  fillBg('sand');

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const s = now.getSeconds(), ms = now.getMilliseconds();
  const frac = (s + ms / 1000) / 60;                 // 0..1 drained

  if (m !== lastMin) { if (lastMin !== -1) flip = 1; lastMin = m; }
  if (flip > 0) flip = Math.max(0, flip - dt * 1.6);

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  const gh = Math.min(H * 0.72, W * 0.6) * (cfg.settings.sand.needle / 70);
  const gw = gh * 0.46;
  const cx = W / 2, cy = H / 2;
  const top = cy - gh / 2, bot = cy + gh / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(flip * Math.PI * (1 - flip) * 2.6);     // quick tumble on the minute
  ctx.translate(-cx, -cy);

  // Glass body
  ctx.beginPath();
  for (let u = 0; u <= 1.0001; u += 0.02) ctx.lineTo(cx - halfW(u, gw), top + u * gh);
  for (let u = 1; u >= -0.0001; u -= 0.02) ctx.lineTo(cx + halfW(u, gw), top + u * gh);
  ctx.closePath();
  const glass = ctx.createLinearGradient(cx - gw, 0, cx + gw, 0);
  glass.addColorStop(0,   `rgba(${c1r},${c1g},${c1b},0.10)`);
  glass.addColorStop(0.5, 'rgba(255,255,255,0.03)');
  glass.addColorStop(1,   `rgba(${c2r},${c2g},${c2b},0.10)`);
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = `rgba(${c2r},${c2g},${c2b},0.4)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Upper charge: a level that falls as the minute drains
  const upTop = top + (1 - Math.pow(1 - frac, 0.75)) * gh * 0.46;
  ctx.save();
  ctx.beginPath();
  for (let u = 0; u <= 1.0001; u += 0.02) ctx.lineTo(cx - halfW(u, gw), top + u * gh);
  for (let u = 1; u >= -0.0001; u -= 0.02) ctx.lineTo(cx + halfW(u, gw), top + u * gh);
  ctx.closePath();
  ctx.clip();

  const sandTop = ctx.createLinearGradient(0, upTop, 0, cy);
  sandTop.addColorStop(0, `rgba(${c1r},${c1g},${c1b},0.85)`);
  sandTop.addColorStop(1, `rgba(${c2r},${c2g},${c2b},0.6)`);
  ctx.fillStyle = sandTop;
  ctx.beginPath();
  ctx.moveTo(cx - gw, upTop + Math.sin(ts * 0.002) * 1.5);
  ctx.lineTo(cx + gw, upTop);
  ctx.lineTo(cx + gw, cy);
  ctx.lineTo(cx - gw, cy);
  ctx.closePath();
  ctx.fill();

  // Lower heap: a cone that grows as grains land
  const heapH = gh * 0.42 * Math.pow(frac, 0.85);
  ctx.beginPath();
  ctx.moveTo(cx - gw, bot);
  ctx.lineTo(cx - gw, bot - heapH * 0.55);
  ctx.lineTo(cx, bot - heapH);
  ctx.lineTo(cx + gw, bot - heapH * 0.55);
  ctx.lineTo(cx + gw, bot);
  ctx.closePath();
  const sandBot = ctx.createLinearGradient(0, bot - heapH, 0, bot);
  sandBot.addColorStop(0, `rgba(${c2r},${c2g},${c2b},0.9)`);
  sandBot.addColorStop(1, `rgba(${c1r},${c1g},${c1b},0.7)`);
  ctx.fillStyle = sandBot;
  ctx.fill();
  ctx.restore();

  // Falling stream
  const rate = 8 * (cfg.intensity / 5);
  for (let i = 0; i < rate; i++) {
    grains.push({
      x: cx + rand(-gw * 0.05, gw * 0.05),
      y: cy - gh * 0.02,
      vy: rand(60, 140), vx: rand(-6, 6),
      r: rand(0.8, 2.2), tone: Math.random(),
    });
  }
  const floor = bot - heapH;
  grains = grains.filter(g => g.y < floor + 4);
  grains.forEach(g => {
    g.vy += 420 * dt;
    g.x  += g.vx * dt;
    g.y  += g.vy * dt;
    const [r, gg, b] = lerpColor(C1, C2, g.tone);
    ctx.fillStyle = `rgba(${r},${gg},${b},0.9)`;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
  });
  if (grains.length > 900) grains.splice(0, grains.length - 900);

  // Neck glow
  const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, gw * 0.5);
  ng.addColorStop(0, `rgba(${c2r},${c2g},${c2b},0.35)`);
  ng.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ng;
  ctx.beginPath(); ctx.arc(cx, cy, gw * 0.5, 0, Math.PI * 2); ctx.fill();

  // Caps
  ctx.fillStyle = `rgba(${c1r},${c1g},${c1b},0.35)`;
  ctx.fillRect(cx - gw * 1.08, top - 10, gw * 2.16, 10);
  ctx.fillRect(cx - gw * 1.08, bot, gw * 2.16, 10);
  ctx.restore();

  // Readout
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.1, H * 0.12, 92);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor  = C1; ctx.shadowBlur = 34;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.3)`;
  ctx.fillText(tStr, W / 2, H - 18);
  ctx.shadowColor  = C2; ctx.shadowBlur = 14;
  ctx.fillStyle    = 'rgba(255,255,255,0.9)';
  ctx.fillText(tStr, W / 2, H - 18);
  ctx.shadowBlur   = 0;
}

function destroy() { grains = []; }

export default { init, tick, destroy };
