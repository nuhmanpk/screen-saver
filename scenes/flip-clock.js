import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

let prevH = null, prevM = null, bgT = 0, clockInterval = null;

const elHTop    = document.getElementById('fc-h-top');
const elHBot    = document.getElementById('fc-h-bot');
const elHFold   = document.getElementById('fc-h-fold');
const elHUnfold = document.getElementById('fc-h-unfold');
const elMTop    = document.getElementById('fc-m-top');
const elMBot    = document.getElementById('fc-m-bot');
const elMFold   = document.getElementById('fc-m-fold');
const elMUnfold = document.getElementById('fc-m-unfold');
const elAmpm    = document.getElementById('fc-ampm');

function setPanelText(el, val) {
  if (!el) return;
  const t = el.querySelector('.flip-text') || el;
  t.textContent = val;
}

function flipPanel(topEl, botEl, foldEl, unfoldEl, oldVal, newVal) {
  if (!topEl || !botEl || !foldEl || !unfoldEl) return;
  setPanelText(topEl, newVal);
  setPanelText(botEl, oldVal);
  setPanelText(foldEl, oldVal);
  setPanelText(unfoldEl, newVal);
  foldEl.classList.remove('flipping');
  unfoldEl.classList.remove('flipping');
  void foldEl.offsetWidth;
  foldEl.classList.add('flipping');
  unfoldEl.classList.add('flipping');
  setTimeout(() => {
    setPanelText(botEl, newVal);
    foldEl.classList.remove('flipping');
    unfoldEl.classList.remove('flipping');
  }, 650);
}

function readTime() {
  const now = new Date();
  let h = now.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { h: pad(h), m: pad(now.getMinutes()), ampm };
}

function updateTime() {
  const { h, m, ampm } = readTime();
  if (elAmpm) elAmpm.textContent = ampm;
  if (h !== prevH) { flipPanel(elHTop, elHBot, elHFold, elHUnfold, prevH, h); prevH = h; }
  if (m !== prevM) { flipPanel(elMTop, elMBot, elMFold, elMUnfold, prevM, m); prevM = m; }
}

function init() {
  if (clockInterval) clearInterval(clockInterval);
  const { h, m, ampm } = readTime();
  setPanelText(elHTop, h); setPanelText(elHBot, h);
  setPanelText(elMTop, m); setPanelText(elMBot, m);
  if (elAmpm) elAmpm.textContent = ampm;
  prevH = h; prevM = m;
  clockInterval = setInterval(updateTime, 1000);
  document.documentElement.style.setProperty('--fc-scale', cfg.settings.clock.needle / 70);
}

function tick() {
  setRafId(requestAnimationFrame(tick));
  bgT += 0.005 * (cfg.speed / 5);
  fillBg('clock');
  [
    { x: W * 0.35 + Math.sin(bgT) * W * 0.06, y: H * 0.5 + Math.cos(bgT * 0.7) * H * 0.06, r: W * 0.35, c: C1 },
    { x: W * 0.65 + Math.cos(bgT * 0.8) * W * 0.06, y: H * 0.5 + Math.sin(bgT * 0.9) * H * 0.06, r: W * 0.35, c: C2 },
  ].forEach(g => {
    const [r, gv, b] = hexToRgb(g.c);
    const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
    grad.addColorStop(0, `rgba(${r},${gv},${b},0.08)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  });
}

function destroy() {
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
}

export default { init, tick, destroy };
