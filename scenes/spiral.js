import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

const TRAIL = 90;
let trails = [[], [], []];

function init() { trails = [[], [], []]; }

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('spiral');

  const cx = W / 2, cy = H / 2;
  const R  = Math.min(W, H) * 0.44;

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);
  const [cmr, cmg, cmb] = lerpColor(C1, C2, 0.5);

  const now = new Date();
  const h  = now.getHours(),  m  = now.getMinutes();
  const s  = now.getSeconds(), ms = now.getMilliseconds();

  const hFrac = ((h % 12) + m / 60) / 12;
  const mFrac = (m + s / 60) / 60;
  const sFrac = (s + ms / 1000) / 60;

  const rH = R * 0.80, rM = R * 0.53, rS = R * 0.28;

  const aH = hFrac * Math.PI * 2 - Math.PI / 2;
  const aM = mFrac * Math.PI * 2 - Math.PI / 2;
  const aS = sFrac * Math.PI * 2 - Math.PI / 2;

  const pH = [cx + Math.cos(aH) * rH, cy + Math.sin(aH) * rH];
  const pM = [cx + Math.cos(aM) * rM, cy + Math.sin(aM) * rM];
  const pS = [cx + Math.cos(aS) * rS, cy + Math.sin(aS) * rS];

  [pH, pM, pS].forEach((p, i) => {
    trails[i].push([p[0], p[1]]);
    if (trails[i].length > TRAIL) trails[i].shift();
  });

  // Orbit rings
  [[rH, c1r, c1g, c1b], [rM, c2r, c2g, c2b], [rS, cmr, cmg, cmb]].forEach(([r, cr, cg, cb]) => {
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.1)`;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Trails
  [[trails[0], c1r, c1g, c1b], [trails[1], c2r, c2g, c2b], [trails[2], cmr, cmg, cmb]]
    .forEach(([tr, cr, cg, cb]) => {
      for (let i = 1; i < tr.length; i++) {
        const a = (i / tr.length) * 0.65;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a})`;
        ctx.lineWidth   = (i / tr.length) * 2.5;
        ctx.beginPath();
        ctx.moveTo(tr[i-1][0], tr[i-1][1]);
        ctx.lineTo(tr[i][0],   tr[i][1]);
        ctx.stroke();
      }
    });

  // Sun corona
  const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.11);
  sg.addColorStop(0,   `rgba(${c2r},${c2g},${c2b},0.95)`);
  sg.addColorStop(0.45, `rgba(${c1r},${c1g},${c1b},0.55)`);
  sg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.shadowColor = C2; ctx.shadowBlur = 28;
  ctx.fillStyle   = sg;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur  = 0;

  // Planets
  [
    [pH, 9,   c1r, c1g, c1b, C1],
    [pM, 6.5, c2r, c2g, c2b, C2],
    [pS, 4,   cmr, cmg, cmb, `rgb(${cmr},${cmg},${cmb})`],
  ].forEach(([pos, r, cr, cg, cb, glow]) => {
    ctx.shadowColor = glow; ctx.shadowBlur = r * 2.5;
    const pg = ctx.createRadialGradient(pos[0]-r*0.3, pos[1]-r*0.35, 0, pos[0], pos[1], r);
    pg.addColorStop(0,   'rgba(255,255,255,0.95)');
    pg.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.85)`);
    pg.addColorStop(1,   `rgba(${cr},${cg},${cb},0.1)`);
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(pos[0], pos[1], r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Time
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(R * 0.22, 38);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C2; ctx.shadowBlur = 18;
  ctx.fillStyle    = 'rgba(255,255,255,0.92)';
  ctx.fillText(tStr, cx, cy);
  ctx.shadowBlur   = 0;
}

export default { init, tick };
