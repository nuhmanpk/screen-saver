import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

const ROWS = 7, CHAR_W = 5, GAP = 1;
const FONT = {
  '0': [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  '1': [0b00100,0b01100,0b00100,0b00100,0b00100,0b00100,0b01110],
  '2': [0b01110,0b10001,0b00001,0b00010,0b00100,0b01000,0b11111],
  '3': [0b01110,0b10001,0b00001,0b00110,0b00001,0b10001,0b01110],
  '4': [0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0b00010],
  '5': [0b11111,0b10000,0b11110,0b00001,0b00001,0b10001,0b01110],
  '6': [0b00110,0b01000,0b10000,0b11110,0b10001,0b10001,0b01110],
  '7': [0b11111,0b00001,0b00010,0b00100,0b01000,0b01000,0b01000],
  '8': [0b01110,0b10001,0b10001,0b01110,0b10001,0b10001,0b01110],
  '9': [0b01110,0b10001,0b10001,0b01111,0b00001,0b00010,0b01100],
  ':': [0b00000,0b00100,0b00100,0b00000,0b00100,0b00100,0b00000],
};

function hexDot(cx, cy, r) {
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const hx = cx + r * Math.cos(a), hy = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
}

function init() {}

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('hex');

  const now   = new Date();
  const chars = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`.split('');

  const totalCols = chars.length * (CHAR_W + GAP) - GAP;
  const cell      = Math.min(W * 0.88 / totalCols, H * 0.74 / ROWS);
  const hexR      = cell * 0.40;
  const ox        = (W - totalCols * cell) / 2;
  const oy        = (H - ROWS * cell) / 2;

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  // Pass 1: inactive dots
  ctx.beginPath();
  let colOff = 0;
  chars.forEach(ch => {
    const bm = FONT[ch] || FONT['0'];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < CHAR_W; col++) {
        if ((bm[row] >> (CHAR_W - 1 - col)) & 1) continue;
        hexDot(ox + (colOff + col) * cell + cell / 2, oy + row * cell + cell / 2, hexR);
      }
    }
    colOff += CHAR_W + GAP;
  });
  ctx.fillStyle = `rgba(${c1r},${c1g},${c1b},0.07)`;
  ctx.fill();

  // Pass 2: active dots per char with gradient + glow
  colOff = 0;
  chars.forEach((ch, ci) => {
    const frac = chars.length > 1 ? ci / (chars.length - 1) : 0;
    const cr   = Math.round(c1r + (c2r - c1r) * frac);
    const cg   = Math.round(c1g + (c2g - c1g) * frac);
    const cb   = Math.round(c1b + (c2b - c1b) * frac);

    ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
    ctx.shadowBlur  = cell * 0.6;
    ctx.fillStyle   = `rgb(${cr},${cg},${cb})`;
    ctx.beginPath();

    const bm = FONT[ch] || FONT['0'];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < CHAR_W; col++) {
        if (!((bm[row] >> (CHAR_W - 1 - col)) & 1)) continue;
        hexDot(ox + (colOff + col) * cell + cell / 2, oy + row * cell + cell / 2, hexR);
      }
    }
    ctx.fill();
    colOff += CHAR_W + GAP;
  });
  ctx.shadowBlur = 0;
}

export default { init, tick };
