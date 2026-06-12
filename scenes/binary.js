import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// BCD binary clock: 6 columns (H_tens, H_units, M_tens, M_units, S_tens, S_units)
// Each column has up to 4 rows (bit 3..0), top = MSB
const COL_BITS = [2, 4, 3, 4, 3, 4]; // max bits per column (tens have fewer)
const MAX_ROWS = 4;

function init() {}

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('binary');

  const now = new Date();
  const h   = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const digits = [
    Math.floor(h / 10), h % 10,
    Math.floor(m / 10), m % 10,
    Math.floor(s / 10), s % 10,
  ];

  const COLS  = 6;
  const cw    = W / (COLS + 1);
  const rh    = H / (MAX_ROWS + 3);
  const dotR  = Math.min(cw * 0.28, rh * 0.35);

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  // Section backgrounds
  [0, 2, 4].forEach((col, si) => {
    const frac  = si / 2;
    const [sr, sg, sb] = lerpColor(C1, C2, frac);
    ctx.fillStyle = `rgba(${sr},${sg},${sb},0.025)`;
    ctx.fillRect(col * cw + cw * 0.1, rh * 0.6, cw * 1.8, rh * (MAX_ROWS + 1));
  });

  // Column labels (H  H  M  M  S  S)
  const labels = ['H', 'H', 'M', 'M', 'S', 'S'];
  for (let col = 0; col < COLS; col++) {
    const frac = col / (COLS - 1);
    const [cr, cg, cb] = lerpColor(C1, C2, frac);
    ctx.fillStyle    = `rgba(${cr},${cg},${cb},0.45)`;
    ctx.font         = `500 ${Math.min(dotR * 1.2, 16)}px Inter, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[col], (col + 1) * cw, rh * 5.1);
    ctx.fillStyle    = `rgba(${cr},${cg},${cb},0.28)`;
    ctx.font         = `300 ${Math.min(dotR * 0.9, 12)}px 'JetBrains Mono', monospace`;
    ctx.fillText(`${digits[col]}`, (col + 1) * cw, rh * 5.7);
  }

  // Row bit-value labels (8 4 2 1)
  const rowVals = [8, 4, 2, 1];
  for (let row = 0; row < MAX_ROWS; row++) {
    ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.2)`;
    ctx.font         = `300 ${Math.min(dotR * 0.75, 10)}px 'JetBrains Mono', monospace`;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${rowVals[row]}`, cw * 0.72, (row + 1) * rh);
  }

  // Dots
  for (let col = 0; col < COLS; col++) {
    const frac    = col / (COLS - 1);
    const [cr, cg, cb] = lerpColor(C1, C2, frac);
    const maxBits = COL_BITS[col];
    const val     = digits[col];
    const cx      = (col + 1) * cw;

    for (let row = 0; row < MAX_ROWS; row++) {
      const bitPos = MAX_ROWS - 1 - row;
      const bitVal = 1 << bitPos;
      const usable = bitPos < maxBits;
      const isOn   = usable && (val & bitVal) !== 0;
      const cy     = (row + 1) * rh;

      if (!usable) {
        ctx.fillStyle = `rgba(${c1r},${c1g},${c1b},0.02)`;
      } else if (isOn) {
        ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
        ctx.shadowBlur  = dotR * 2.5;
        ctx.fillStyle   = `rgb(${cr},${cg},${cb})`;
      } else {
        ctx.fillStyle  = `rgba(${c1r},${c1g},${c1b},0.08)`;
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(cx, cy, isOn ? dotR : dotR * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // Digital readout at bottom
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.1, H * 0.1, 80);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = `rgba(${c2r},${c2g},${c2b},0.6)`;
  ctx.shadowColor  = C2; ctx.shadowBlur = 20;
  ctx.fillText(tStr, W / 2, rh * 6.6);
  ctx.shadowBlur = 0;
}

export default { init, tick };
