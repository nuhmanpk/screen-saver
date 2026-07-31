import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Night sea: layered swell, a moon that tracks the hour, time mirrored in the water.
let t = 0, stars = [], glints = [], txt = null, tCtx = null;

function init() {
  t = 0;
  stars = Array.from({ length: 110 }, () => ({
    x: rand(0, W), y: rand(0, H * 0.55), r: rand(0.3, 1.3), ph: rand(0, 6.3),
  }));
  glints = Array.from({ length: 60 }, () => ({
    x: rand(0, W), o: rand(0, 1), w: rand(6, 40), ph: rand(0, 6.3),
  }));
  if (!txt) { txt = document.createElement('canvas'); tCtx = txt.getContext('2d'); }
}

// Sum-of-sines surface height at x for a given layer
function surface(x, level, amp, k, sp, ph) {
  return level
    + Math.sin(x * k + t * sp + ph) * amp
    + Math.sin(x * k * 2.3 - t * sp * 1.4 + ph) * amp * 0.35
    + Math.sin(x * k * 0.4 + t * sp * 0.6) * amp * 0.6;
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  t += 0.012 * (cfg.speed / 5);
  fillBg('waves');

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const s = now.getSeconds(), ms = now.getMilliseconds();

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  // Sky wash
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, `rgba(${c1r},${c1g},${c1b},0.16)`);
  sky.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.7);

  stars.forEach(st => {
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2 + st.ph));
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Moon: crosses the sky once every 12 hours, phase set by the minute
  const hFrac = ((h % 12) + m / 60) / 12;
  const mx = W * (0.08 + hFrac * 0.84);
  const my = H * (0.34 - Math.sin(hFrac * Math.PI) * 0.2);
  const mr = Math.min(W, H) * 0.055;
  const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 5);
  mg.addColorStop(0, `rgba(${c2r},${c2g},${c2b},0.35)`);
  mg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mg;
  ctx.beginPath(); ctx.arc(mx, my, mr * 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  // Bite out of the moon = minute phase
  ctx.fillStyle = cfg.settings.waves.bg;
  ctx.beginPath();
  ctx.arc(mx + mr * (0.4 + (m / 60) * 1.4), my, mr, 0, Math.PI * 2);
  ctx.fill();

  const level = H * 0.6;
  const swell = H * 0.035 * (cfg.intensity / 5);
  const sFrac = (s + ms / 1000) / 60;

  // Time + its reflection, drawn before the front swells so waves overlap it
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.15, H * 0.2, 150) * (cfg.settings.waves.needle / 70);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor  = C2; ctx.shadowBlur = 30;
  ctx.fillStyle    = 'rgba(255,255,255,0.94)';
  ctx.fillText(tStr, W / 2, level - fs * 0.35);
  ctx.shadowBlur   = 0;

  // Mirrored, ripple-sliced copy on the water
  const tw = Math.ceil(ctx.measureText(tStr).width) + 40;
  const th = Math.ceil(fs * 1.2);
  if (txt.width !== tw || txt.height !== th) { txt.width = tw; txt.height = th; }
  tCtx.clearRect(0, 0, tw, th);
  tCtx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  tCtx.textAlign    = 'center';
  tCtx.textBaseline = 'alphabetic';
  tCtx.fillStyle    = `rgba(${c2r},${c2g},${c2b},0.85)`;
  tCtx.fillText(tStr, tw / 2, th * 0.85);

  ctx.save();
  ctx.globalAlpha = 0.3;
  for (let row = 0; row < th; row += 2) {
    const dx = Math.sin(row * 0.09 + t * 3) * (3 + row * 0.05);
    ctx.drawImage(txt, 0, th - row - 2, tw, 2,
                  W / 2 - tw / 2 + dx, level + row * 0.8, tw, 2);
  }
  ctx.restore();

  // Water layers, far to near
  const LAYERS = 5;
  for (let i = 0; i < LAYERS; i++) {
    const f   = i / (LAYERS - 1);
    const lvl = level + f * H * 0.11;
    const amp = swell * (0.35 + f * 1.5);
    const k   = 0.006 - f * 0.0035;
    const sp  = 1 + f * 1.6;
    const [r, g, b] = lerpColor(C2, C1, f);

    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, surface(x, lvl, amp, k, sp, i * 1.7));
    ctx.lineTo(W, H);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, lvl - amp, 0, H);
    wg.addColorStop(0, `rgba(${r},${g},${b},${0.1 + f * 0.16})`);
    wg.addColorStop(1, `rgba(${r},${g},${b},${0.02 + f * 0.05})`);
    ctx.fillStyle = wg;
    ctx.fill();

    // Crest line
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = surface(x, lvl, amp, k, sp, i * 1.7);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.18 + f * 0.42})`;
    ctx.lineWidth   = 0.8 + f * 1.4;
    ctx.stroke();
  }

  // Moonlight glints riding the nearest crest
  glints.forEach(gl => {
    const x = gl.x + Math.sin(t + gl.ph) * 20;
    const y = surface(x, level + H * 0.11, swell * 1.85, 0.0025, 2.6, 6.8);
    const a = (0.25 + 0.5 * Math.sin(t * 3 + gl.ph)) * (1 - Math.abs(x - mx) / W);
    if (a <= 0) return;
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - gl.w / 2, y); ctx.lineTo(x + gl.w / 2, y);
    ctx.stroke();
  });

  // Tide marker: fills once a minute along the shoreline
  ctx.strokeStyle = `rgba(${c2r},${c2g},${c2b},0.5)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H - 4); ctx.lineTo(W * sFrac, H - 4);
  ctx.stroke();
}

export default { init, tick };
