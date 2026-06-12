import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let stars = [], trailS = [], trailM = [], trailH = [];

function init() {
  stars  = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 0.8 + 0.2 }));
  trailS = []; trailM = []; trailH = [];
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  const speed = cfg.speed / 5;
  fillBg('orbs');

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  stars.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); });

  const cx = W / 2, cy = H / 2;
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds(), ms = now.getMilliseconds();
  const sf = cfg.settings.orbs.needle / 70;
  const r1 = Math.min(W, H) * 0.16 * sf;
  const r2 = Math.min(W, H) * 0.27 * sf;
  const r3 = Math.min(W, H) * 0.38 * sf;

  const aS = ((s + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2;
  const aM = ((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2;
  const aH = (((h % 12) + m / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const pS = { x: cx + Math.cos(aS) * r1, y: cy + Math.sin(aS) * r1 };
  const pM = { x: cx + Math.cos(aM) * r2, y: cy + Math.sin(aM) * r2 };
  const pH = { x: cx + Math.cos(aH) * r3, y: cy + Math.sin(aH) * r3 };

  trailS.push({ x: pS.x, y: pS.y, a: 1 }); if (trailS.length > 50) trailS.shift();
  trailM.push({ x: pM.x, y: pM.y, a: 1 }); if (trailM.length > 40) trailM.shift();
  trailH.push({ x: pH.x, y: pH.y, a: 1 }); if (trailH.length > 30) trailH.shift();

  ctx.strokeStyle = 'rgba(255,255,255,0.012)'; ctx.lineWidth = 1;
  const gs = 44;
  for (let x = 0; x < W; x += gs) {
    ctx.beginPath();
    for (let y = 0; y < H; y += 12) {
      let wx = x, wy = y;
      [pS, pM, pH].forEach((p, idx) => {
        const dx = x - p.x, dy = y - p.y, d = Math.sqrt(dx * dx + dy * dy);
        const pr = idx === 0 ? 80 : idx === 1 ? 115 : 150;
        if (d < pr) { const f = (1 - d / pr) * 16 * (cfg.intensity / 5); wx -= (dx / d) * f; wy -= (dy / d) * f; }
      });
      if (y === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
  }
  for (let y = 0; y < H; y += gs) {
    ctx.beginPath();
    for (let x = 0; x < W; x += 12) {
      let wx = x, wy = y;
      [pS, pM, pH].forEach((p, idx) => {
        const dx = x - p.x, dy = y - p.y, d = Math.sqrt(dx * dx + dy * dy);
        const pr = idx === 0 ? 80 : idx === 1 ? 115 : 150;
        if (d < pr) { const f = (1 - d / pr) * 16 * (cfg.intensity / 5); wx -= (dx / d) * f; wy -= (dy / d) * f; }
      });
      if (x === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  [r1, r2, r3].forEach(r => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); });

  function drawTrail(trail, color, size) {
    for (let i = 0; i < trail.length; i++) {
      const pt = trail[i]; pt.a -= 0.02 * speed;
      if (pt.a <= 0) continue;
      ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},${pt.a * 0.35})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, size * pt.a, 0, Math.PI * 2); ctx.fill();
    }
  }
  drawTrail(trailS, '#fff', 4); drawTrail(trailM, C2, 6); drawTrail(trailH, C1, 8);

  [[pH, C1, 10], [pM, C2, 7], [pS, '#fff', 4]].forEach(([p, c, r]) => {
    ctx.shadowColor = c; ctx.shadowBlur = 15; ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.shadowBlur = 0;

  const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
  sg.addColorStop(0, `rgba(${hexToRgb(C2).join(',')},0.45)`);
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.shadowColor = C2; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 18px JetBrains Mono, monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${pad(h)}:${pad(m)}`, cx, cy);
}

export default { init, tick };
