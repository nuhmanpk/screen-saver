import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { hexToRgb, lerpColor, rand, wordSet, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

const SEC_WORDS = [
  ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE'],
  ['TWENTY','THIRTY','FORTY','FIFTY','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN',
   'EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN',
   'SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'],
  ['TWENTY','THIRTY','FORTY','FIFTY','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN',
   'EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN',
   'SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'],
];
const H_LABELS = ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE'];

let words = [], t = 0;

function init() {
  words = []; t = 0;
  const sH = H / 3;
  SEC_WORDS.forEach((wlist, si) => {
    const COLS = Math.min(wlist.length, 6);
    const ROWS = Math.ceil(wlist.length / COLS);
    wlist.forEach((word, i) => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const bx  = (col + 0.5) * (W / COLS);
      const by  = si * sH + (row + 0.5) * (sH / ROWS);
      words.push({
        word, si, bx, by,
        x: bx + rand(-25, 25), y: by + rand(-12, 12),
        phase: Math.random() * Math.PI * 2, freq: rand(0.22, 0.52),
        scale: 1,
      });
    });
  });
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  t += 0.01 * (cfg.speed / 5);
  fillBg('flow');

  const now    = new Date();
  const h12    = now.getHours() % 12 || 12;
  const activeH = new Set([H_LABELS[h12 - 1]]);
  const activeM = wordSet(now.getMinutes());
  const activeS = wordSet(now.getSeconds());
  const active  = [activeH, activeM, activeS];

  const c1rgb = hexToRgb(C1), c2rgb = hexToRgb(C2), c3rgb = lerpColor(C1, C2, 0.5);
  const secRgb = [c1rgb, c2rgb, c3rgb];
  const sH = H / 3;

  const [c1r, c1g, c1b] = c1rgb;
  ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},0.1)`;
  ctx.lineWidth   = 1;
  ctx.setLineDash([3, 8]);
  ctx.beginPath();
  ctx.moveTo(0, H / 3);     ctx.lineTo(W, H / 3);
  ctx.moveTo(0, 2 * H / 3); ctx.lineTo(W, 2 * H / 3);
  ctx.stroke();
  ctx.setLineDash([]);

  words.forEach(wo => {
    const isActive = active[wo.si].has(wo.word);
    const fx = Math.sin(t * wo.freq + wo.phase) * 14;
    const fy = Math.cos(t * wo.freq * 0.7 + wo.phase + 1) * 9;
    wo.x     += (wo.bx + fx - wo.x) * 0.04;
    wo.y     += (wo.by + fy - wo.y) * 0.04;
    wo.scale += ((isActive ? 1.55 : 1) - wo.scale) * 0.07;

    const ROWS  = Math.ceil(SEC_WORDS[wo.si].length / Math.min(SEC_WORDS[wo.si].length, 6));
    const baseFs = Math.min(sH / ROWS * 0.34, 28);
    const fs     = baseFs * wo.scale;
    const [cr, cg, cb] = secRgb[wo.si];

    ctx.font         = `700 ${fs}px 'JetBrains Mono', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    if (isActive) {
      ctx.shadowColor = `rgb(${cr},${cg},${cb})`; ctx.shadowBlur = 18;
      ctx.fillStyle   = '#ffffff';
    } else {
      ctx.fillStyle  = 'rgba(255,255,255,0.065)'; ctx.shadowBlur = 0;
    }
    ctx.fillText(wo.word, wo.x, wo.y);
    ctx.shadowBlur = 0;
  });

  ['HOURS', 'MINUTES', 'SECONDS'].forEach((lbl, i) => {
    const [lr, lg, lb] = secRgb[i];
    ctx.fillStyle    = `rgba(${lr},${lg},${lb},0.22)`;
    ctx.font         = '500 11px Inter, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(lbl, 10, i * H / 3 + 5);
  });
}

export default { init, tick };
