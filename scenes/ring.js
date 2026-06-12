import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, wordSet, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

const H_WORDS  = ['TWELVE','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN'];
const MS_WORDS = ['TWENTY','THIRTY','FORTY','FIFTY','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN',
                  'EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN',
                  'SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'];
let t = 0;

function init() { t = 0; }

function drawRing(words, cx, cy, r, active, rgb, rot) {
  const [cr, cg, cb] = rgb;
  const n = words.length;
  const arcPerWord = (2 * Math.PI * r) / n;

  ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.07)`;
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  words.forEach((word, i) => {
    const ang      = -Math.PI / 2 + (i / n) * Math.PI * 2 + rot;
    const wx       = cx + Math.cos(ang) * r;
    const wy       = cy + Math.sin(ang) * r;
    const isActive = active instanceof Set ? active.has(word) : active === word;
    const fs       = Math.max(Math.min(arcPerWord * 0.55 / (word.length * 0.6), r * 0.17, 20), 8);

    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(ang + Math.PI / 2);
    ctx.font         = `700 ${fs}px 'JetBrains Mono', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    if (isActive) {
      ctx.fillStyle   = '#ffffff';
      ctx.shadowColor = `rgb(${cr},${cg},${cb})`; ctx.shadowBlur = 22;
      ctx.fillText(word, 0, 0);
      ctx.shadowBlur  = 40;
      ctx.fillStyle   = `rgba(${cr},${cg},${cb},0.35)`;
      ctx.fillText(word, 0, 0);
      ctx.shadowBlur  = 0;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.065)';
      ctx.fillText(word, 0, 0);
    }
    ctx.restore();
  });
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  t += 0.0008 * (cfg.speed / 5);
  fillBg('ring');

  const cx = W / 2, cy = H / 2;
  const rMin = Math.min(W, H);
  const r1 = rMin * 0.19, r2 = rMin * 0.34, r3 = rMin * 0.47;

  const now   = new Date();
  const c1rgb = hexToRgb(C1);
  const c2rgb = hexToRgb(C2);
  const c3rgb = lerpColor(C1, C2, 0.5);

  drawRing(H_WORDS,  cx, cy, r1, H_WORDS[now.getHours() % 12], c1rgb,  t * 0.5);
  drawRing(MS_WORDS, cx, cy, r2, wordSet(now.getMinutes()),      c2rgb, -t * 0.3);
  drawRing(MS_WORDS, cx, cy, r3, wordSet(now.getSeconds()),      c3rgb,  t * 0.18);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = `300 ${Math.min(r1 * 0.42, 22)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle    = 'rgba(255,255,255,0.35)';
  ctx.fillText(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`, cx, cy);

  ctx.font = '500 9px Inter, sans-serif';
  [[r1, 'H', c1rgb], [r2, 'M', c2rgb], [r3, 'S', c3rgb]].forEach(([r, lbl, rgb]) => {
    const [lr, lg, lb] = rgb;
    ctx.fillStyle    = `rgba(${lr},${lg},${lb},0.28)`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lbl, cx - r - 10, cy);
  });
}

export default { init, tick };
