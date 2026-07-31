import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Broken VHS: channel split, slice displacement, tracking bar, datamosh blocks.
let slices = [], blocks = [], track = 0, burst = 0, lastTs = 0, lastSec = -1;
let off = null, oCtx = null;

function init() {
  slices = []; blocks = []; track = H; burst = 0; lastTs = 0; lastSec = -1;
  if (!off) { off = document.createElement('canvas'); oCtx = off.getContext('2d'); }
  off.width = W; off.height = H;
}

function corrupt(heavy) {
  const n = heavy ? 10 + Math.floor(Math.random() * 10) : 2 + Math.floor(Math.random() * 5);
  for (let i = 0; i < n; i++) {
    slices.push({
      y:    Math.random() * H,
      h:    2 + Math.random() * (heavy ? 46 : 22),
      dx:   (Math.random() - 0.5) * (heavy ? 220 : 90),
      life: rand(0.05, heavy ? 0.5 : 0.28),
    });
  }
  if (heavy) {
    for (let i = 0; i < 6; i++) {
      blocks.push({
        x: Math.random() * W, y: Math.random() * H,
        w: rand(W * 0.05, W * 0.3), h: rand(10, 70),
        dx: (Math.random() - 0.5) * 260, dy: (Math.random() - 0.5) * 90,
        life: rand(0.08, 0.4),
      });
    }
  }
  burst = heavy ? 1 : 0.35;
}

function renderSource(timeStr, jitter) {
  if (off.width !== W || off.height !== H) { off.width = W; off.height = H; }
  oCtx.clearRect(0, 0, W, H);
  const fs = Math.min(W * 0.2, H * 0.3, 210);
  const cx = W / 2, cy = H / 2;

  oCtx.textAlign    = 'center';
  oCtx.textBaseline = 'middle';
  oCtx.font         = `700 ${fs}px 'JetBrains Mono', monospace`;

  // Chromatic split — the two palette colours stand in for R and B channels
  oCtx.globalCompositeOperation = 'lighter';
  oCtx.fillStyle = `rgba(${hexToRgb(C1).join(',')},0.85)`;
  oCtx.fillText(timeStr, cx - jitter, cy + jitter * 0.35);
  oCtx.fillStyle = `rgba(${hexToRgb(C2).join(',')},0.85)`;
  oCtx.fillText(timeStr, cx + jitter, cy - jitter * 0.35);
  oCtx.fillStyle = 'rgba(255,255,255,0.92)';
  oCtx.fillText(timeStr, cx, cy);
  oCtx.globalCompositeOperation = 'source-over';

  // Timecode strip, the kind a deck burns into the tape
  const sfs = Math.min(W * 0.02, 18);
  oCtx.font      = `500 ${sfs}px 'JetBrains Mono', monospace`;
  oCtx.textAlign = 'left';
  oCtx.fillStyle = `rgba(${hexToRgb(C2).join(',')},0.55)`;
  oCtx.fillText(`REC ● ${timeStr}:${pad(Math.floor(Math.random() * 30))}`, 18, H - 26);
  oCtx.textAlign = 'right';
  oCtx.fillText('SP  ▮▮▯', W - 18, H - 26);
}

function tick(ts) {
  setRafId(requestAnimationFrame(tick));
  const dt = Math.min((ts - lastTs) / 1000, 0.05) || 0.016;
  lastTs = ts;

  fillBg('glitch');

  const now = new Date();
  const s = now.getSeconds();
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(s)}`;

  // The tape stumbles every second, and badly on the minute
  if (s !== lastSec) { lastSec = s; corrupt(s === 0 || Math.random() < 0.25); }
  if (Math.random() < 0.012) corrupt(false);

  burst = Math.max(0, burst - dt * 2.5);
  const jitter = 3 + burst * 14 + Math.random() * burst * 6;
  renderSource(timeStr, jitter);

  // Base image, nudged by the current burst
  ctx.drawImage(off, (Math.random() - 0.5) * burst * 10, (Math.random() - 0.5) * burst * 4);

  // Displaced scanline slices
  slices = slices.filter(sl => (sl.life -= dt) > 0);
  slices.forEach(sl => {
    const y = Math.max(0, Math.floor(sl.y));
    const hh = Math.min(Math.ceil(sl.h), H - y);
    if (hh <= 0) return;
    ctx.drawImage(off, 0, y, W, hh, sl.dx, y, W, hh);
  });

  // Datamosh blocks: rectangles lifted from elsewhere in the frame
  blocks = blocks.filter(b => (b.life -= dt) > 0);
  blocks.forEach(b => {
    const sx = Math.max(0, Math.min(W - 4, b.x));
    const sy = Math.max(0, Math.min(H - 4, b.y));
    const sw = Math.min(b.w, W - sx), sh = Math.min(b.h, H - sy);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(off, sx, sy, sw, sh, sx + b.dx, sy + b.dy, sw, sh);
    ctx.globalAlpha = 1;
  });

  // Head-switching noise at the bottom of the frame
  const nH = 14;
  for (let i = 0; i < 26; i++) {
    const y = H - nH + Math.random() * nH;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * W, y, rand(4, 70), 1);
  }

  // Tracking bar rolling up the screen
  track -= (30 + burst * 200) * dt * (cfg.speed / 5);
  if (track < -H * 0.2) track = H + H * 0.1;
  const tg = ctx.createLinearGradient(0, track, 0, track + H * 0.16);
  tg.addColorStop(0,   'rgba(255,255,255,0)');
  tg.addColorStop(0.5, `rgba(${hexToRgb(C2).join(',')},0.1)`);
  tg.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = tg;
  ctx.fillRect(0, track, W, H * 0.16);
  ctx.drawImage(off, 0, Math.max(0, track), W, 6, rand(-30, 30), Math.max(0, track), W, 6);

  // Scanlines + static
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  const grains = 200 + burst * 900;
  for (let i = 0; i < grains; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.09})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 1);
  }

  // CRT vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function destroy() { slices = []; blocks = []; }

export default { init, tick, destroy };
