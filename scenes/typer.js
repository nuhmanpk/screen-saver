import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Live terminal: a scrolling log that types itself out, one entry per second.
const EVENTS = [
  ['ok',   'wake-lock renewed          sentinel=held'],
  ['ok',   'frame budget nominal       drift=%dms'],
  ['warn', 'display idle timer reset   t=%ds'],
  ['ok',   'heartbeat  seq=%d          rtt=%dms'],
  ['ok',   'scene buffer swapped       vsync=on'],
  ['warn', 'ambient light dropped      lux=%d'],
  ['ok',   'battery draw steady        %dmW'],
  ['ok',   'clock sync  offset=%dms    src=ntp'],
  ['err',  'sleep request denied       pid=%d'],
  ['ok',   'gc pass complete           freed=%dkb'],
];

let lines = [], typing = null, lastSec = -1, lastTs = 0, cursorT = 0, seq = 0, flicker = 1;

function makeLine(now) {
  const [lvl, tpl] = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  const text = tpl.replace(/%d/g, () => Math.floor(rand(1, 999)));
  seq++;
  return {
    stamp: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    lvl, text, shown: 0,
  };
}

function init() {
  lines = []; typing = null; lastSec = -1; lastTs = 0; cursorT = 0; seq = 0; flicker = 1;
}

function tick(ts) {
  setRafId(requestAnimationFrame(tick));
  const dt = Math.min((ts - lastTs) / 1000, 0.1) || 0.016;
  lastTs = ts;
  fillBg('typer');

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();

  if (s !== lastSec) {
    lastSec = s;
    if (typing) { typing.shown = typing.text.length; lines.push(typing); }
    typing = makeLine(now);
  }

  // Type the current line out
  if (typing) {
    typing.shown = Math.min(typing.text.length, typing.shown + 42 * (cfg.speed / 5) * dt);
    if (typing.shown >= typing.text.length && lines[lines.length - 1] !== typing) {
      // stays as the active line until the next second rolls over
    }
  }
  cursorT += dt;

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  // CRT flicker
  flicker += (1 - flicker) * 0.1 + (Math.random() < 0.02 ? rand(-0.15, 0.05) : 0);

  const pad_ = Math.min(W * 0.06, 60);
  const fs   = Math.min(W * 0.019, H * 0.032, 22);
  const lh   = fs * 1.65;

  // Big clock header
  const bigFs = Math.min(W * 0.13, H * 0.2, 132);
  const tStr  = `${pad(h)}:${pad(m)}:${pad(s)}`;
  ctx.font         = `300 ${bigFs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor  = C1; ctx.shadowBlur = 38 * flicker;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},${0.32 * flicker})`;
  ctx.fillText(tStr, pad_, H * 0.06);
  ctx.shadowColor  = C2; ctx.shadowBlur = 14 * flicker;
  ctx.fillStyle    = `rgba(255,255,255,${0.93 * flicker})`;
  ctx.fillText(tStr, pad_, H * 0.06);
  ctx.shadowBlur   = 0;

  ctx.font = `400 ${fs}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = `rgba(${c2r},${c2g},${c2b},0.45)`;
  ctx.fillText(`nosleep@local  ·  uptime ${Math.floor(seq / 60)}m ${seq % 60}s  ·  wake-lock ACTIVE`,
               pad_, H * 0.06 + bigFs * 1.05);

  // Log body, newest at the bottom
  const bodyTop = H * 0.06 + bigFs * 1.05 + lh * 2.2;
  const rows    = Math.max(3, Math.floor((H - bodyTop - lh) / lh));
  if (lines.length > rows) lines = lines.slice(lines.length - rows);

  const all = typing ? [...lines, typing] : lines;
  const view = all.slice(-rows);
  ctx.textBaseline = 'middle';

  view.forEach((ln, i) => {
    const y   = bodyTop + i * lh + lh / 2;
    const age = (view.length - 1 - i) / rows;
    const dim = 1 - age * 0.65;
    const col = ln.lvl === 'err'
      ? `rgba(255,${Math.round(80 + c1g * 0.3)},110,${0.9 * dim})`
      : ln.lvl === 'warn'
        ? `rgba(${c2r},${c2g},${c2b},${0.85 * dim})`
        : `rgba(${c1r},${c1g},${c1b},${0.75 * dim})`;

    ctx.font      = `400 ${fs}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = `rgba(255,255,255,${0.28 * dim})`;
    ctx.fillText(ln.stamp, pad_, y);

    const tagX = pad_ + fs * 6.2;
    ctx.fillStyle = col;
    ctx.fillText(ln.lvl.toUpperCase().padEnd(5), tagX, y);

    const txtX = tagX + fs * 4.2;
    ctx.fillStyle = `rgba(255,255,255,${(ln === typing ? 0.95 : 0.7) * dim})`;
    const shown = ln.text.slice(0, Math.floor(ln.shown));
    ctx.fillText(shown, txtX, y);

    // Block cursor rides the line being typed
    if (ln === typing && Math.floor(cursorT * 2) % 2 === 0) {
      const w = ctx.measureText(shown).width;
      ctx.fillStyle = `rgba(${c2r},${c2g},${c2b},0.9)`;
      ctx.fillRect(txtX + w + 2, y - fs * 0.5, fs * 0.55, fs);
    }
  });

  // Scanlines + phosphor vignette
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

export default { init, tick };
