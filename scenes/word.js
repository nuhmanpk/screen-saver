import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { hexToRgb, lerpColor, wordSet, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

const HOUR_ROWS = [
  ['ONE',   'TWO',   'THREE'],
  ['FOUR',  'FIVE',  'SIX'],
  ['SEVEN', 'EIGHT', 'NINE'],
  ['TEN',   'ELEVEN','TWELVE'],
];
const MINSEC_ROWS = [
  ['TWENTY', 'THIRTY', 'FORTY', 'FIFTY'],
  ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'],
  ['SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE'],
  ['THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'],
];

const H_WORDS = ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE'];

let sc = [null, null, null];
let tiles = [];

function buildTiles() {
  tiles = [];
  const sections = [HOUR_ROWS, MINSEC_ROWS, MINSEC_ROWS];
  const secH = H / 3;
  sections.forEach((rows, si) => {
    const secY = si * secH;
    const rowH = secH / rows.length;
    rows.forEach((row, ri) => {
      const tileW = W / row.length;
      row.forEach((word, wi) => {
        tiles.push({ word, x: wi * tileW, y: secY + ri * rowH, w: tileW, h: rowH, si });
      });
    });
  });
}

function init() {
  sc[0] = hexToRgb(C1);
  sc[1] = hexToRgb(C2);
  sc[2] = lerpColor(C1, C2, 0.5);
  buildTiles();
}

function getActive() {
  const now = new Date();
  const h12 = now.getHours() % 12 || 12;
  return [
    new Set([H_WORDS[h12 - 1]]),
    wordSet(now.getMinutes()),
    wordSet(now.getSeconds()),
  ];
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  fillBg('dvd');

  const active = getActive();

  tiles.forEach(({ word, x, y, w, h, si }) => {
    const isActive   = active[si].has(word);
    const [cr, cg, cb] = sc[si] || [255, 255, 255];

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    if (isActive) {
      ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
      ctx.shadowBlur  = 36;
      ctx.fillStyle   = `rgba(${cr},${cg},${cb},0.13)`;
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.5)`;
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    }

    const charRatio = 0.58;
    const fs = Math.min(h * 0.40, (w * 0.84) / (word.length * charRatio));
    ctx.font         = `700 ${fs}px 'JetBrains Mono', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (isActive) {
      ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
      ctx.shadowBlur  = 18;
      ctx.fillStyle   = '#ffffff';
    } else {
      ctx.fillStyle  = 'rgba(255,255,255,0.065)';
      ctx.shadowBlur = 0;
    }
    ctx.fillText(word, x + w / 2, y + h / 2);
    ctx.shadowBlur = 0;
  });

  const [c1r, c1g, c1b] = sc[0] || hexToRgb(C1);
  ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},0.18)`;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(0, H / 3);     ctx.lineTo(W, H / 3);
  ctx.moveTo(0, 2 * H / 3); ctx.lineTo(W, 2 * H / 3);
  ctx.stroke();

  ['HOURS', 'MINUTES', 'SECONDS'].forEach((label, i) => {
    const [lr, lg, lb] = sc[i] || [255, 255, 255];
    ctx.fillStyle    = `rgba(${lr},${lg},${lb},0.22)`;
    ctx.font         = '500 11px Inter, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, 10, i * H / 3 + 5);
  });
}

export default { init, tick };
