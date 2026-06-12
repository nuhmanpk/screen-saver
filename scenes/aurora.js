import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let t = 0, stars = [];

function init() {
  stars = Array.from({ length: 120 }, () => ({
    x:     Math.random() * W,
    y:     Math.random() * H,
    r:     Math.random() * 1.1 + 0.2,
    a:     Math.random(),
    speed: rand(0.005, 0.015),
  }));
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  t += 0.004 * (cfg.speed / 5);
  fillBg('aurora');

  stars.forEach(s => {
    s.a += s.speed;
    if (s.a > 1 || s.a < 0) s.speed = -s.speed;
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0.08, Math.min(0.8, s.a))})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });

  const cx = W / 2, cy = H / 2;
  const now = new Date();
  const hrs = now.getHours(), mins = now.getMinutes(), secs = now.getSeconds(), ms = now.getMilliseconds();
  const sf = cfg.settings.aurora.needle / 70;
  const r1 = Math.min(W, H) * 0.18 * sf;
  const r2 = Math.min(W, H) * 0.28 * sf;
  const r3 = Math.min(W, H) * 0.38 * sf;

  function drawAuroraRing(radius, frac, color, width, speedMult, ampMult) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur  = 18;
    const steps = 150, startAngle = -Math.PI / 2, endAngle = startAngle + frac * Math.PI * 2;

    function ringPath(extra) {
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const angle = startAngle + (i / steps) * (endAngle - startAngle);
        const wf    = 7 + (cfg.intensity / 2);
        const wa    = (cfg.intensity / 10) * 11 * ampMult;
        const r     = radius + Math.sin(angle * wf + t * speedMult + extra) * wa;
        const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }

    ringPath(0);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke();
    ringPath(1.2);
    ctx.strokeStyle = `rgba(${hexToRgb(color).join(',')},0.25)`;
    ctx.lineWidth   = width * 2.8; ctx.stroke();
    ctx.restore();
  }

  drawAuroraRing(r3, ((hrs % 12) + mins / 60) / 12, C1, 6, 2, 0.9);
  drawAuroraRing(r2, (mins + secs / 60) / 60,        C2, 4, 2.8, 1.2);
  drawAuroraRing(r1, (secs + ms / 1000) / 60,    '#fff', 1.8, 3.8, 1.4);

  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 36px Inter, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${pad(hrs % 12 || 12)}:${pad(mins)}`, cx, cy - 6);
  ctx.font      = '13px JetBrains Mono, monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(`${pad(secs)}s`, cx, cy + 24);
}

export default { init, tick };
