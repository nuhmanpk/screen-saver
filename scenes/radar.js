import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let targets = [], blips = [], lastTimeStr = '', offscreen = null, oCtx = null;

function init() {
  targets = []; blips = []; lastTimeStr = '';
  if (!offscreen) { offscreen = document.createElement('canvas'); oCtx = offscreen.getContext('2d'); }
  offscreen.width = 540; offscreen.height = 120;
  ctx.clearRect(0, 0, W, H);
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('matrix');

  const cx = W / 2, cy = H / 2;
  const sf      = cfg.settings.matrix.needle / 70;
  const rRings  = Math.min(W, H) * 0.44 * sf;
  const rNeedle = Math.sqrt(W * W + H * H) / 2;

  const now = new Date();
  const hrs = now.getHours(), mins = now.getMinutes(), secs = now.getSeconds(), ms = now.getMilliseconds();
  const ampm    = hrs >= 12 ? 'PM' : 'AM';
  const dH      = hrs % 12 || 12;
  const timeStr = `${pad(dH)}:${pad(mins)}:${pad(secs)} ${ampm}`;

  if (timeStr !== lastTimeStr) {
    lastTimeStr = timeStr;
    oCtx.clearRect(0, 0, 540, 120);
    oCtx.fillStyle     = '#fff';
    oCtx.font          = 'bold 74px JetBrains Mono, monospace';
    oCtx.textAlign     = 'center';
    oCtx.textBaseline  = 'middle';
    oCtx.fillText(timeStr, 270, 60);
    const d = oCtx.getImageData(0, 0, 540, 120);
    targets = [];
    for (let y = 0; y < 120; y += 3)
      for (let x = 0; x < 540; x += 3)
        if (d.data[(y * 540 + x) * 4 + 3] > 70) targets.push({ x, y });
  }

  const rgbC1 = hexToRgb(C1).join(',');
  const rgbC2 = hexToRgb(C2).join(',');

  // Range rings
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach((f, i) => {
    const r = rRings * f;
    ctx.strokeStyle = `rgba(${rgbC1},${0.06 + i * 0.015})`;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle    = `rgba(${rgbC1},0.18)`;
    ctx.font         = '8px JetBrains Mono, monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.round(f * 100)}`, cx, cy - r - 3);
  });

  // Crosshair
  ctx.strokeStyle = `rgba(${rgbC1},0.06)`;
  ctx.beginPath();
  ctx.moveTo(cx - rRings, cy); ctx.lineTo(cx + rRings, cy);
  ctx.moveTo(cx, cy - rRings); ctx.lineTo(cx, cy + rRings);
  ctx.stroke();

  // Spokes every 30°
  for (let deg = 0; deg < 360; deg += 30) {
    const rad = (deg - 90) * Math.PI / 180;
    ctx.strokeStyle = `rgba(${rgbC1},0.04)`;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(rad) * rRings, cy + Math.sin(rad) * rRings);
    ctx.stroke();
  }

  // Degree ticks + labels
  ctx.lineWidth = 1;
  for (let deg = 0; deg < 360; deg += 10) {
    const rad     = (deg - 90) * Math.PI / 180;
    const isMajor = deg % 30 === 0;
    const inner   = rRings - (isMajor ? 10 : 5);
    ctx.strokeStyle = `rgba(${rgbC1},${isMajor ? 0.22 : 0.09})`;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * inner,  cy + Math.sin(rad) * inner);
    ctx.lineTo(cx + Math.cos(rad) * rRings, cy + Math.sin(rad) * rRings);
    ctx.stroke();
    if (isMajor) {
      const lr = rRings + 14;
      ctx.fillStyle    = `rgba(${rgbC1},0.58)`;
      ctx.font         = '8px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${deg}`, cx + Math.cos(rad) * lr, cy + Math.sin(rad) * lr);
    }
  }

  // Sweep needle + tail
  const sweepAngle = ((secs + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2;
  const tailWidth  = 0.5;
  for (let i = 0; i < 30; i++) {
    const angle = sweepAngle - (i / 30) * tailWidth;
    ctx.strokeStyle = `rgba(${rgbC2},${0.18 * (1 - i / 30)})`;
    ctx.lineWidth   = i === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * rNeedle, cy + Math.sin(angle) * rNeedle);
    ctx.stroke();
  }

  // Blips
  if (Math.random() < 0.3) {
    const r = rand(rRings * 0.08, rRings * 0.96);
    const a = sweepAngle + rand(-0.08, 0.04);
    blips.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, age: 0, life: 40 + Math.floor(rand(0, 35)) });
  }
  blips = blips.filter(b => b.age < b.life);
  blips.forEach(b => {
    b.age++;
    const alpha = (1 - b.age / b.life) * 0.6;
    const sz    = 1 + (1 - b.age / b.life) * 1.8;
    ctx.fillStyle = `rgba(${rgbC2},${alpha})`;
    ctx.fillRect(b.x - sz / 2, b.y - sz / 2, sz, sz);
  });

  // Clock dot targets
  const scale  = Math.min(W * 0.82 / 540, H * 0.38 / 120, 2.2);
  const startX = cx - (540 * scale) / 2;
  const startY = cy - (120 * scale) / 2;

  targets.forEach(pt => {
    const sx = startX + pt.x * scale;
    const sy = startY + pt.y * scale;
    const dx = sx - cx, dy = sy - cy;
    const ang = Math.atan2(dy, dx);
    let diff = sweepAngle - ang;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    if (diff >= 0 && diff < tailWidth) {
      const f = 1 - diff / tailWidth;
      ctx.fillStyle = f > 0.85 ? '#fff' : `rgba(${rgbC2},${0.35 + f * 0.65})`;
      ctx.fillRect(sx - 1, sy - 1, 2.5, 2.5);
    } else {
      ctx.fillStyle = `rgba(${rgbC1},0.85)`;
      ctx.fillRect(sx - 1, sy - 1, 1.5, 1.5);
    }
  });

  // Target-lock brackets
  const cW = 540 * scale, cH = 120 * scale;
  const mg = 20, bS = 18;
  const bL = startX - mg, bR = startX + cW + mg;
  const bT = startY - mg, bB = startY + cH + mg;
  ctx.strokeStyle = `rgba(${rgbC2},0.38)`;
  ctx.lineWidth   = 1;
  [[bL,bT,1,1],[bR,bT,-1,1],[bL,bB,1,-1],[bR,bB,-1,-1]].forEach(([x,y,sx2,sy2]) => {
    ctx.beginPath();
    ctx.moveTo(x + sx2*bS, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy2*bS);
    ctx.stroke();
  });
  ctx.fillStyle    = `rgba(${rgbC2},0.38)`;
  ctx.font         = '8px JetBrains Mono, monospace';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('TGT_LOCK', bL, bT - 3);
  ctx.textAlign = 'right';
  ctx.fillText(`${targets.length}pts`, bR, bT - 3);

  // Corner HUD
  const bearing = ((sweepAngle * 180 / Math.PI + 90 + 360) % 360).toFixed(1);
  ctx.fillStyle    = `rgba(${rgbC2},0.32)`;
  ctx.font         = '9px JetBrains Mono, monospace';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  const hx = cx - rRings + 10, hy = cy - rRings + 18;
  ctx.fillText('SYS_RADAR_ACTIVE', hx, hy);
  ctx.fillText(`BRG ${bearing}°`, hx, hy + 14);
  ctx.fillText(`RNG ${rRings.toFixed(0)}px`, hx, hy + 28);
  ctx.textAlign = 'right';
  ctx.fillText(`${pad(hrs)}:${pad(mins)} ${ampm}`, cx + rRings - 10, hy);
  ctx.fillText(`${secs}s`, cx + rRings - 10, hy + 14);
  ctx.fillText(`BLIPS ${blips.length}`, cx + rRings - 10, hy + 28);
}

export default { init, tick };
