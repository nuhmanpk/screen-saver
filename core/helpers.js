import { ctx, W, H } from './canvas.js';
import { cfg } from './cfg.js';

export function pad(n) { return String(n).padStart(2, '0'); }

export function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function lerpColor(hex1, hex2, t) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  ];
}

export function rand(a, b) { return a + Math.random() * (b - a); }

export function fillBg(sceneName) {
  const s = cfg.settings[sceneName];
  const [r, g, b] = hexToRgb(s.bg);
  const op = (s.bgOpacity ?? 100) / 100;
  ctx.fillStyle = `rgba(${r},${g},${b},${op})`;
  ctx.fillRect(0, 0, W, H);
}

export function wordSet(n) {
  const OT = ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE',
              'TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN',
              'SEVENTEEN','EIGHTEEN','NINETEEN'];
  const TN = ['TWENTY','THIRTY','FORTY','FIFTY'];
  const s = new Set();
  if (n <= 0 || n > 59) return s;
  if (n < 20) s.add(OT[n - 1]);
  else { s.add(TN[Math.floor(n / 10) - 2]); if (n % 10) s.add(OT[n % 10 - 1]); }
  return s;
}
