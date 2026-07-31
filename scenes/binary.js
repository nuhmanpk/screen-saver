import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// BCD: 6 cols (H_tens H_units  M_tens M_units  S_tens S_units), 4 rows (8 4 2 1)
const COL_BITS = [2, 4, 3, 4, 3, 4];
const ROW_VALS = [8, 4, 2, 1];

let pulses = {};   // key = "col-row" → brightness 0..1 for on-flash
let t = 0;

function init() { pulses = {}; t = 0; }

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('binary');
  t += 0.04;

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const digits = [
    Math.floor(h / 10), h % 10,
    Math.floor(m / 10), m % 10,
    Math.floor(s / 10), s % 10,
  ];

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  // Layout — full screen with margin
  const PAD_X = W * 0.06, PAD_Y = H * 0.1;
  const LABEL_W = W * 0.055, LABEL_H = H * 0.07;
  const gridX = PAD_X + LABEL_W;
  const gridY = PAD_Y + LABEL_H;
  const gridW = W - gridX - PAD_X;
  const gridH = H - gridY - PAD_Y - LABEL_H;

  const colW = gridW / 6;
  const rowH = gridH / 4;
  const cellW = colW * 0.72;
  const cellH = rowH * 0.72;
  const rad   = Math.min(cellW, cellH) * 0.12;

  // Section backgrounds (H / M / S pairs)
  [[0, C1], [2, null], [4, C2]].forEach(([ci, col], si) => {
    const [sr, sg, sb] = si === 1 ? lerpColor(C1, C2, 0.5) : hexToRgb(col);
    ctx.fillStyle = `rgba(${sr},${sg},${sb},0.03)`;
    const sx = gridX + ci * colW - colW * 0.08;
    ctx.fillRect(sx, gridY - rowH * 0.18, colW * 2.16, gridH + rowH * 0.36);
  });

  // Section dividers
  [2, 4].forEach(ci => {
    const x = gridX + ci * colW - colW * 0.05;
    const [cr, cg, cb] = lerpColor(C1, C2, ci / 5);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.12)`;
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(x, gridY - rowH * 0.3);
    ctx.lineTo(x, gridY + gridH + rowH * 0.3);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Row bit-value labels (left side)
  for (let row = 0; row < 4; row++) {
    const cy = gridY + row * rowH + rowH / 2;
    const labelFs = Math.min(rowH * 0.38, 24);
    ctx.font         = `700 ${labelFs}px 'JetBrains Mono', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.3)`;
    ctx.fillText(ROW_VALS[row], gridX - LABEL_W * 0.5, cy);
  }

  // Column header labels (top)
  const HEADS = ['H', 'H', 'M', 'M', 'S', 'S'];
  for (let col = 0; col < 6; col++) {
    const cx   = gridX + col * colW + colW / 2;
    const frac = col / 5;
    const [cr, cg, cb] = lerpColor(C1, C2, frac);
    const headFs = Math.min(colW * 0.4, 22);
    ctx.font         = `600 ${headFs}px 'JetBrains Mono', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = `rgba(${cr},${cg},${cb},0.45)`;
    ctx.fillText(HEADS[col], cx, gridY - LABEL_H * 0.55);
  }

  // Cells
  for (let col = 0; col < 6; col++) {
    const frac   = col / 5;
    const [cr, cg, cb] = lerpColor(C1, C2, frac);
    const maxBit = COL_BITS[col];
    const val    = digits[col];
    const cx     = gridX + col * colW + colW / 2;

    for (let row = 0; row < 4; row++) {
      const bitPos = 3 - row;
      const usable = bitPos < maxBit;
      const isOn   = usable && (val & (1 << bitPos)) !== 0;
      const cy     = gridY + row * rowH + rowH / 2;
      const key    = `${col}-${row}`;
      const cx0    = cx - cellW / 2;
      const cy0    = cy - cellH / 2;

      // Pulse flash on rising edge
      if (isOn && !pulses[key]) pulses[key] = 1.0;
      if (!isOn) pulses[key] = 0;
      if (pulses[key] > 0) pulses[key] *= 0.88;

      if (!usable) {
        // Unused bit position — hairline ghost
        ctx.fillStyle = `rgba(${c1r},${c1g},${c1b},0.02)`;
        roundRect(cx0, cy0, cellW, cellH, rad);
        ctx.fill();
        continue;
      }

      if (isOn) {
        // Glow
        ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
        ctx.shadowBlur  = cellW * 0.6 + (pulses[key] || 0) * cellW * 0.8;

        // Cell body — gradient
        const g = ctx.createLinearGradient(cx0, cy0, cx0 + cellW, cy0 + cellH);
        g.addColorStop(0, `rgba(${cr},${cg},${cb},0.95)`);
        g.addColorStop(1, `rgba(${cr},${cg},${cb},0.65)`);
        ctx.fillStyle = g;
        roundRect(cx0, cy0, cellW, cellH, rad);
        ctx.fill();

        // Inner highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle  = `rgba(255,255,255,${0.12 + (pulses[key] || 0) * 0.15})`;
        roundRect(cx0 + cellW * 0.08, cy0 + cellH * 0.08, cellW * 0.84, cellH * 0.35, rad * 0.6);
        ctx.fill();
      } else {
        // Off cell — dim border + fill
        ctx.shadowBlur = 0;
        ctx.fillStyle  = `rgba(${cr},${cg},${cb},0.05)`;
        roundRect(cx0, cy0, cellW, cellH, rad);
        ctx.fill();
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.12)`;
        ctx.lineWidth   = 1;
        roundRect(cx0, cy0, cellW, cellH, rad);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    // Decimal digit below column
    const digFs = Math.min(colW * 0.32, 18);
    ctx.font         = `300 ${digFs}px 'JetBrains Mono', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = `rgba(${cr},${cg},${cb},0.4)`;
    ctx.fillText(val, cx, gridY + gridH + LABEL_H * 0.55);
  }

  // Time readout center-bottom
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.08, H * 0.09, 80);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = C2; ctx.shadowBlur = 30;
  ctx.fillStyle    = `rgba(${c2r},${c2g},${c2b},0.55)`;
  ctx.fillText(tStr, W / 2, H - PAD_Y * 0.45);
  ctx.shadowBlur   = 0;
  ctx.fillStyle    = 'rgba(255,255,255,0.88)';
  ctx.fillText(tStr, W / 2, H - PAD_Y * 0.45);
  ctx.shadowBlur   = 0;
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export default { init, tick };
