import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Neon sign behind a rainy window: bokeh city, droplets, tube flicker, wet reflection.
let drops = [], trails = [], bokeh = [], lastTs = 0, flick = 1, flickHold = 0, buzz = 0;

function init() {
  lastTs = 0; flick = 1; flickHold = 0; buzz = 0;
  bokeh = Array.from({ length: 34 }, () => ({
    x: rand(0, W), y: rand(0, H),
    r: rand(Math.min(W, H) * 0.02, Math.min(W, H) * 0.075),
    tone: Math.random(), a: rand(0.05, 0.16), vy: rand(-0.06, 0.06),
  }));
  drops  = Array.from({ length: 90 }, spawnDrop);
  trails = [];
}

function spawnDrop() {
  return {
    x: rand(0, W), y: rand(-H, H),
    r: rand(1.5, 7),
    v: 0,
    wob: rand(0, 6.3),
    stuck: Math.random() < 0.45,
  };
}

function tick(ts) {
  setRafId(requestAnimationFrame(tick));
  const dt  = Math.min((ts - lastTs) / 1000, 0.05) || 0.016;
  lastTs = ts;
  const spd = cfg.speed / 5;
  fillBg('neon');

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  // Out-of-focus city lights behind the glass
  bokeh.forEach(b => {
    b.y += b.vy * spd;
    if (b.y < -b.r) b.y = H + b.r;
    if (b.y > H + b.r) b.y = -b.r;
    const [r, g, bl] = lerpColor(C1, C2, b.tone);
    const gd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    gd.addColorStop(0,    `rgba(${r},${g},${bl},${b.a})`);
    gd.addColorStop(0.75, `rgba(${r},${g},${bl},${b.a * 0.45})`);
    gd.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = gd;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Neon tube flicker — mostly steady, with rare stutters
  flickHold -= dt;
  if (flickHold <= 0) {
    flick = Math.random() < 0.12 ? rand(0.25, 0.6) : 1;
    flickHold = flick === 1 ? rand(0.4, 3.5) : rand(0.03, 0.12);
  }
  buzz += dt * 60;
  const glow = flick * (0.94 + 0.06 * Math.sin(buzz));

  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.17, H * 0.24, 165) * (cfg.settings.neon.needle / 70);
  const cy   = H * 0.44;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;

  // Tube: wide colour halo, then hot white core
  ctx.shadowColor = C1; ctx.shadowBlur = 90 * glow;
  ctx.fillStyle   = `rgba(${c1r},${c1g},${c1b},${0.4 * glow})`;
  ctx.fillText(tStr, W / 2, cy);
  ctx.shadowColor = C2; ctx.shadowBlur = 40 * glow;
  ctx.fillStyle   = `rgba(${c2r},${c2g},${c2b},${0.7 * glow})`;
  ctx.fillText(tStr, W / 2, cy);
  ctx.shadowBlur  = 18 * glow;
  ctx.fillStyle   = `rgba(255,255,255,${0.95 * glow})`;
  ctx.fillText(tStr, W / 2, cy);
  ctx.shadowBlur  = 0;

  // Wet-street reflection below the sign
  ctx.save();
  ctx.globalAlpha = 0.16 * glow;
  ctx.translate(0, cy * 2 + fs * 0.55);
  ctx.scale(1, -1);
  ctx.filter = 'blur(2px)';
  ctx.fillStyle = `rgba(${c2r},${c2g},${c2b},0.9)`;
  ctx.fillText(tStr, W / 2 + Math.sin(buzz * 0.05) * 3, cy);
  ctx.restore();
  ctx.filter = 'none';

  // Droplets on the glass: fat ones break loose and streak down
  drops.forEach(d => {
    if (d.stuck) {
      if (d.r > 4.5 && Math.random() < 0.01) d.stuck = false;
    } else {
      d.v += 18 * spd * dt * (d.r / 4);
      d.y += d.v * dt * 12;
      d.x += Math.sin(d.y * 0.04 + d.wob) * 0.4;
      trails.push({ x: d.x, y: d.y, r: d.r * 0.45, life: 1 });
      if (d.y > H + 20) Object.assign(d, spawnDrop(), { y: rand(-H * 0.4, -10), stuck: Math.random() < 0.45 });
    }

    const gd = ctx.createRadialGradient(d.x - d.r * 0.35, d.y - d.r * 0.4, 0, d.x, d.y, d.r);
    gd.addColorStop(0,   `rgba(255,255,255,0.4)`);
    gd.addColorStop(0.5, `rgba(${c2r},${c2g},${c2b},0.16)`);
    gd.addColorStop(1,   'rgba(255,255,255,0.03)');
    ctx.fillStyle = gd;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Streaks left behind by running drops
  trails = trails.filter(tr => tr.life > 0.02);
  trails.forEach(tr => {
    tr.life -= dt * 0.55;
    ctx.fillStyle = `rgba(255,255,255,${tr.life * 0.12})`;
    ctx.beginPath();
    ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
    ctx.fill();
  });
  if (trails.length > 1400) trails.splice(0, trails.length - 1400);

  // Glass vignette
  const vg = ctx.createRadialGradient(W / 2, cy, Math.min(W, H) * 0.15, W / 2, cy, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function destroy() { trails = []; }

export default { init, tick, destroy };
