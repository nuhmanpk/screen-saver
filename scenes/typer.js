import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

const LINES = [
  'NOSLEEP CLOCK v2.0',
  '──────────────────',
  '',
  'CURRENT TIME:',
  '', // time goes here (index 4)
  '',
  'STATUS: AWAKE',
  'WAKE LOCK: ACTIVE',
];
const TIME_LINE = 4;

let typed = [], target = [], phase = 0, lastTs = 0, cursorOn = true, cursorTimer = 0;

function buildTarget(now) {
  const lines = [...LINES];
  lines[TIME_LINE] = `> ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return lines;
}

function init() {
  const now = new Date();
  target = buildTarget(now);
  typed  = target.map(() => '');
  phase  = 0; lastTs = 0; cursorTimer = 0;
}

function tick(ts) {
  setRafId(requestAnimationFrame(tick));
  const dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;
  fillBg('typer');

  const now = new Date();
  const newTarget = buildTarget(now);

  // Only retype the time line when it changes
  if (newTarget[TIME_LINE] !== target[TIME_LINE]) {
    target[TIME_LINE] = newTarget[TIME_LINE];
    typed[TIME_LINE]  = '';
  }

  // Type characters
  const CHARS_PER_SEC = 28 * (cfg.speed / 5);
  phase += dt * CHARS_PER_SEC;
  let remaining = Math.floor(phase);
  phase -= remaining;

  for (let li = 0; li < target.length && remaining > 0; li++) {
    const tLine = target[li];
    const dLine = typed[li];
    if (dLine.length < tLine.length) {
      const add = Math.min(remaining, tLine.length - dLine.length);
      typed[li] += tLine.slice(dLine.length, dLine.length + add);
      remaining  -= add;
    }
  }

  // Cursor blink
  cursorTimer += dt;
  if (cursorTimer > 0.55) { cursorOn = !cursorOn; cursorTimer = 0; }

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  const lineH = Math.min(H * 0.1, 52);
  const fs    = lineH * 0.46;
  const startY = H / 2 - (LINES.length * lineH) / 2;

  // CRT scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  // Screen glow
  const sg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.6);
  sg.addColorStop(0, `rgba(${c1r},${c1g},${c1b},0.04)`);
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);

  typed.forEach((line, li) => {
    const y      = startY + li * lineH;
    const isTime = li === TIME_LINE;
    const isDone = typed[li].length === target[li].length;

    ctx.font         = `400 ${fs}px 'JetBrains Mono', monospace`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';

    if (isTime) {
      ctx.shadowColor = C2; ctx.shadowBlur = 22;
      ctx.fillStyle   = `rgb(${c2r},${c2g},${c2b})`;
    } else if (li === 0) {
      ctx.shadowColor = C1; ctx.shadowBlur = 12;
      ctx.fillStyle   = `rgba(${c1r},${c1g},${c1b},0.9)`;
    } else {
      ctx.shadowBlur  = 0;
      ctx.fillStyle   = `rgba(${c1r},${c1g},${c1b},0.5)`;
    }

    const x = W * 0.08;
    ctx.fillText(line, x, y);

    // Cursor after last active line
    const isActiveLine = !isDone || (li === target.length - 1);
    if (isActiveLine && !isDone && cursorOn) {
      const w = ctx.measureText(line).width;
      ctx.fillStyle = isTime ? `rgb(${c2r},${c2g},${c2b})` : `rgba(${c1r},${c1g},${c1b},0.9)`;
      ctx.fillRect(x + w + 2, y - fs * 0.45, fs * 0.55, fs * 0.9);
    }
    ctx.shadowBlur = 0;
  });

  // Final cursor on last line if all typed
  if (typed.every((t, i) => t.length === target[i].length) && cursorOn) {
    const li = target.length - 1;
    const y  = startY + li * lineH;
    const x  = W * 0.08;
    ctx.font  = `400 ${fs}px 'JetBrains Mono', monospace`;
    const w   = ctx.measureText(typed[li]).width;
    ctx.fillStyle = `rgba(${c1r},${c1g},${c1b},0.8)`;
    ctx.fillRect(x + w + 2, y - fs * 0.45, fs * 0.55, fs * 0.9);
  }
}

export default { init, tick };
