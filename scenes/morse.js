import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

const TABLE = {
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-',
  '5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
  ':':'---...', ' ':' ',
};

let phase = 0, displayStr = '', symbols = [];

function timeToMorse(str) {
  return str.split('').map(c => TABLE[c] ?? '').join('   ');
}

function buildSymbols(morseStr) {
  const syms = [];
  let i = 0;
  while (i < morseStr.length) {
    const ch = morseStr[i];
    if (ch === ' ') { syms.push({ type: 'gap', w: 1 }); i++; }
    else if (ch === '.') { syms.push({ type: 'dot' }); i++; }
    else if (ch === '-') { syms.push({ type: 'dash' }); i++; }
    else i++;
  }
  return syms;
}

function init() { phase = 0; displayStr = ''; symbols = []; }

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('morse');

  const now  = new Date();
  const tStr = `${pad(now.getHours())} ${pad(now.getMinutes())} ${pad(now.getSeconds())}`;
  if (tStr !== displayStr) {
    displayStr = tStr;
    symbols    = buildSymbols(timeToMorse(tStr));
  }

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  const spd   = cfg.speed / 5;
  const UNIT  = Math.max(18, Math.min(W / 45, 32));
  const DOT_R = UNIT * 0.38;
  const DASH_W = UNIT * 2.4;
  const GAP   = UNIT * 0.7;

  // Measure total width
  let totalW = 0;
  symbols.forEach(s => {
    if (s.type === 'dot')  totalW += DOT_R * 2 + GAP;
    else if (s.type === 'dash') totalW += DASH_W + GAP;
    else totalW += GAP * 2.5;
  });

  // Animate scroll
  phase += 0.4 * spd;
  if (phase > totalW) phase -= totalW;

  const rows = 3;
  const rowH = H / (rows + 1);

  for (let row = 0; row < rows; row++) {
    const cy      = rowH * (row + 1);
    const offset  = phase + row * (totalW / rows);
    let   x       = -offset % totalW;

    // Draw twice for seamless wrap
    for (let pass = 0; pass < 2; pass++) {
      symbols.forEach((s, si) => {
        const frac = si / symbols.length;
        const [cr, cg, cb] = [
          Math.round(c1r + (c2r - c1r) * frac),
          Math.round(c1g + (c2g - c1g) * frac),
          Math.round(c1b + (c2b - c1b) * frac),
        ];
        const alpha = 0.15 + frac * 0.55;

        if (s.type === 'dot') {
          ctx.beginPath();
          ctx.arc(x + DOT_R, cy, DOT_R, 0, Math.PI * 2);
          ctx.fillStyle   = `rgba(${cr},${cg},${cb},${alpha})`;
          ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
          ctx.shadowBlur  = DOT_R * 1.5;
          ctx.fill();
          ctx.shadowBlur = 0;
          x += DOT_R * 2 + GAP;
        } else if (s.type === 'dash') {
          ctx.beginPath();
          ctx.roundRect(x, cy - DOT_R, DASH_W, DOT_R * 2, DOT_R);
          ctx.fillStyle   = `rgba(${cr},${cg},${cb},${alpha})`;
          ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
          ctx.shadowBlur  = DOT_R * 1.5;
          ctx.fill();
          ctx.shadowBlur = 0;
          x += DASH_W + GAP;
        } else {
          x += GAP * 2.5;
        }
      });
      x += totalW;
    }
  }

  // Time readout
  const raw = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const fs  = Math.min(W * 0.11, H * 0.14, 100);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C2; ctx.shadowBlur = 30;
  ctx.fillStyle    = `rgba(${c2r},${c2g},${c2b},0.5)`;
  ctx.fillText(raw, W / 2, H * 0.88);
  ctx.shadowBlur = 0;
  ctx.fillStyle  = 'rgba(255,255,255,0.88)';
  ctx.fillText(raw, W / 2, H * 0.88);
}

export default { init, tick };
