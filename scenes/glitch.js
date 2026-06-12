import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let glitchTimer = 800, glitchRows = [];
let offscreen = null, oCtx = null;

function init() {
  glitchTimer = 800;
  glitchRows  = [];
  if (!offscreen) { offscreen = document.createElement('canvas'); oCtx = offscreen.getContext('2d'); }
  offscreen.width = W; offscreen.height = H;
}

function scheduleGlitch() {
  glitchTimer = rand(400, 2800);
  glitchRows  = [];
  const n = 2 + Math.floor(Math.random() * 7);
  for (let i = 0; i < n; i++) {
    glitchRows.push({
      y:      Math.random() * H,
      h:      2 + Math.random() * 28,
      offset: (Math.random() - 0.5) * 90,
      life:   60 + Math.random() * 180,
    });
  }
}

function renderToOffscreen(timeStr) {
  if (offscreen.width !== W || offscreen.height !== H) {
    offscreen.width = W; offscreen.height = H;
  }
  oCtx.clearRect(0, 0, W, H);
  const fsSz = Math.min(W * 0.2, H * 0.32, 200);
  const cx = W / 2, cy = H / 2;
  oCtx.textAlign    = 'center';
  oCtx.textBaseline = 'middle';
  oCtx.font         = `700 ${fsSz}px 'JetBrains Mono', monospace`;

  const off = glitchRows.length > 2 ? 7 : 2;
  oCtx.fillStyle = `rgba(${hexToRgb(C1).join(',')},0.75)`;
  oCtx.fillText(timeStr, cx - off, cy + 2);
  oCtx.fillStyle = `rgba(${hexToRgb(C2).join(',')},0.75)`;
  oCtx.fillText(timeStr, cx + off, cy - 2);
  oCtx.fillStyle    = '#ffffff';
  oCtx.shadowColor  = C2;
  oCtx.shadowBlur   = 22;
  oCtx.fillText(timeStr, cx, cy);
  oCtx.shadowBlur = 0;
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  glitchTimer -= 16;
  if (glitchTimer <= 0) scheduleGlitch();
  glitchRows.forEach(r => { r.life -= 16; });
  glitchRows = glitchRows.filter(r => r.life > 0);

  fillBg('glitch');

  const now     = new Date();
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  renderToOffscreen(timeStr);

  ctx.drawImage(offscreen, 0, 0);

  glitchRows.forEach(row => {
    const srcY = Math.max(0, Math.floor(row.y));
    const srcH = Math.min(Math.ceil(row.h), H - srcY);
    if (srcH <= 0) return;
    ctx.drawImage(offscreen, 0, srcY, W, srcH, row.offset, srcY, W, srcH);
  });

  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  if (Math.random() < 0.05) {
    const ny = Math.random() * H;
    ctx.fillStyle = `rgba(${hexToRgb(C2).join(',')},${Math.random() * 0.25})`;
    ctx.fillRect(0, ny, W, 1 + Math.random() * 3);
  }

  if (glitchRows.length > 4 && Math.random() < 0.015) {
    ctx.fillStyle = `rgba(${hexToRgb(C1).join(',')},0.06)`;
    ctx.fillRect(0, 0, W, H);
  }
}

function destroy() { glitchRows = []; }

export default { init, tick, destroy };
