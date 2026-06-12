import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// 16 vertices: all (±1,±1,±1,±1)
const VERTS4 = [];
for (let a = -1; a <= 1; a += 2)
  for (let b = -1; b <= 1; b += 2)
    for (let c = -1; c <= 1; c += 2)
      for (let d = -1; d <= 1; d += 2)
        VERTS4.push([a, b, c, d]);

// 32 edges: pairs differing in exactly 1 coord
const EDGES4 = [];
for (let i = 0; i < 16; i++)
  for (let j = i + 1; j < 16; j++) {
    let diff = 0;
    for (let k = 0; k < 4; k++) if (VERTS4[i][k] !== VERTS4[j][k]) diff++;
    if (diff === 1) EDGES4.push([i, j]);
  }

let t = 0;

function init() { t = 0; }

function rotate4(v, θ1, θ2, θ3) {
  let [x, y, z, w] = v;
  let c, s;
  c = Math.cos(θ1); s = Math.sin(θ1);
  [x, w] = [x*c - w*s, x*s + w*c];
  c = Math.cos(θ2); s = Math.sin(θ2);
  [y, z] = [y*c - z*s, y*s + z*c];
  c = Math.cos(θ3); s = Math.sin(θ3);
  [x, y] = [x*c - y*s, x*s + y*c];
  return [x, y, z, w];
}

function proj([x, y, z, w]) {
  const d4 = w + 2.8;
  if (d4 < 0.1) return null;
  const x3 = x / d4, y3 = y / d4, z3 = z / d4;
  const d3   = z3 + 4.2;
  const size = Math.min(W, H) * 0.27;
  return [W/2 + (x3/d3)*size, H/2 + (y3/d3)*size, d4];
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('cube');
  const spd = cfg.speed / 5;
  t += 0.005 * spd;

  const projected = VERTS4.map(v => proj(rotate4(v, t*0.71, t*1.13, t*0.47)));
  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  EDGES4.forEach(([a, b]) => {
    const pa = projected[a], pb = projected[b];
    if (!pa || !pb) return;
    const frac  = Math.max(0, Math.min(1, ((pa[2] + pb[2]) / 2 - 1) / 2.5));
    const [cr, cg, cb] = lerpColor(C1, C2, frac);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.07 + frac * 0.78})`;
    ctx.lineWidth   = 0.5 + frac * 2;
    ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
    ctx.shadowBlur  = frac > 0.55 ? 10 : 0;
    ctx.beginPath();
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  projected.forEach(p => {
    if (!p) return;
    const frac = Math.max(0, Math.min(1, (p[2] - 1) / 2.5));
    if (frac < 0.45) return;
    const [cr, cg, cb] = lerpColor(C1, C2, frac);
    ctx.shadowColor = `rgb(${cr},${cg},${cb})`; ctx.shadowBlur = 14;
    ctx.fillStyle   = `rgba(255,255,255,${frac * 0.85})`;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 1 + frac * 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  const now  = new Date();
  const tStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const fs   = Math.min(W * 0.1, H * 0.14, 100);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C2; ctx.shadowBlur = 35;
  ctx.fillStyle    = `rgba(${c2r},${c2g},${c2b},0.4)`;
  ctx.fillText(tStr, W/2, H/2);
  ctx.shadowColor  = C1; ctx.shadowBlur = 14;
  ctx.fillStyle    = 'rgba(255,255,255,0.93)';
  ctx.fillText(tStr, W/2, H/2);
  ctx.shadowBlur   = 0;
}

export default { init, tick };
