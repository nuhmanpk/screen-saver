import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let t = 0;

function init() { t = 0; }

function fieldDir(x, y, nx, ny, sx, sy) {
  const dnx = x - nx, dny = y - ny;
  const dsx = x - sx, dsy = y - sy;
  const dn3 = Math.pow(dnx*dnx + dny*dny, 1.5) + 1e-6;
  const ds3 = Math.pow(dsx*dsx + dsy*dsy, 1.5) + 1e-6;
  const bx  = dnx/dn3 - dsx/ds3;
  const by  = dny/dn3 - dsy/ds3;
  const len = Math.sqrt(bx*bx + by*by) + 1e-9;
  return [bx/len, by/len];
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('terrain');
  const spd = cfg.speed / 5;
  t += 0.018 * spd;

  const cx = W / 2, cy = H / 2;
  const R  = Math.min(W, H) * 0.34;

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  const now    = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();

  const hAngle = ((h % 12) + m / 60) / 12 * Math.PI * 2 - Math.PI / 2;
  const mAngle = (m + s / 60) / 60 * Math.PI * 2 - Math.PI / 2;
  const sAngle = (s / 60) * Math.PI * 2 - Math.PI / 2;

  const nx = cx + Math.cos(hAngle) * R * 0.65;
  const ny = cy + Math.sin(hAngle) * R * 0.65;
  const sx = cx + Math.cos(mAngle) * R * 0.85;
  const sy = cy + Math.sin(mAngle) * R * 0.85;

  const N_LINES  = 20;
  const STEP     = 3.8;
  const MAX_ITER = 200;

  ctx.setLineDash([4, 13]);

  for (let i = 0; i < N_LINES; i++) {
    const startA = (i / N_LINES) * Math.PI * 2;
    let x = nx + Math.cos(startA) * 15;
    let y = ny + Math.sin(startA) * 15;

    const pts = [[x, y]];
    for (let step = 0; step < MAX_ITER; step++) {
      const [fx, fy] = fieldDir(x, y, nx, ny, sx, sy);
      x += fx * STEP;
      y += fy * STEP;
      pts.push([x, y]);
      if (Math.hypot(x - sx, y - sy) < 16) break;
      if (x < -60 || x > W+60 || y < -60 || y > H+60) break;
    }
    if (pts.length < 4) continue;

    ctx.beginPath();
    pts.forEach((p, k) => { if (k === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });

    const frac = i / N_LINES;
    const [cr, cg, cb] = lerpColor(C1, C2, frac);
    ctx.lineDashOffset = -(t * 9 + i * 4) % 17;
    ctx.strokeStyle    = `rgba(${cr},${cg},${cb},0.42)`;
    ctx.lineWidth      = 1.2;
    ctx.shadowColor    = `rgb(${cr},${cg},${cb})`;
    ctx.shadowBlur     = 4;
    ctx.stroke();
    ctx.shadowBlur     = 0;
  }

  ctx.setLineDash([]);

  // Second-hand indicator dot orbiting center
  const dotX = cx + Math.cos(sAngle) * R * 0.38;
  const dotY = cy + Math.sin(sAngle) * R * 0.38;
  ctx.shadowColor = C2; ctx.shadowBlur = 14;
  ctx.fillStyle   = 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur  = 0;

  // North pole (hour)
  ctx.shadowColor = C1; ctx.shadowBlur = 22;
  ctx.fillStyle   = C1;
  ctx.beginPath();
  ctx.arc(nx, ny, 8, 0, Math.PI * 2);
  ctx.fill();

  // South pole (minute)
  ctx.shadowColor = C2; ctx.shadowBlur = 22;
  ctx.fillStyle   = C2;
  ctx.beginPath();
  ctx.arc(sx, sy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur  = 0;

  // Time
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.12, H * 0.17, 120);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C1; ctx.shadowBlur = 50;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.38)`;
  ctx.fillText(tStr, cx, cy);
  ctx.shadowColor  = C2; ctx.shadowBlur = 18;
  ctx.fillStyle    = 'rgba(255,255,255,0.93)';
  ctx.fillText(tStr, cx, cy);
  ctx.shadowBlur   = 0;
}

export default { init, tick };
