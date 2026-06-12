import { cfg, applyPalette } from './cfg.js';
import { pad } from './helpers.js';
import { scenes, switchScene } from './scene-manager.js';

// Live HUD clock
function updateClock() {
  const now = new Date();
  const str = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const el  = document.getElementById('live-time');
  if (el) el.textContent = str;
  const ov  = document.getElementById('clock-overlay-time');
  if (ov) ov.textContent = str;
}
setInterval(updateClock, 1000);
updateClock();

// Settings sliders / inputs
document.getElementById('cfg-speed').addEventListener('input', e => {
  cfg.speed = +e.target.value;
  if (cfg.scene === 'orbs') scenes.orbs.init();
});

document.getElementById('cfg-intensity').addEventListener('input', e => {
  cfg.intensity = +e.target.value;
  if (cfg.scene === 'orbs')   scenes.orbs.init();
  if (cfg.scene === 'matrix') scenes.matrix.init();
});

document.getElementById('cfg-dim').addEventListener('input', e => {
  document.getElementById('dim-overlay').style.opacity = e.target.value / 100;
});

document.getElementById('cfg-clock-overlay').addEventListener('change', e => {
  cfg.clockOverlay = e.target.checked;
  document.getElementById('clock-overlay').classList.toggle('hidden', !cfg.clockOverlay);
});

document.getElementById('cfg-needle').addEventListener('input', e => {
  const val = +e.target.value;
  cfg.settings[cfg.scene].needle = val;
  if (cfg.scene === 'clock') document.documentElement.style.setProperty('--fc-scale', val / 70);
});

document.getElementById('cfg-bg-color').addEventListener('input', e => {
  const val = e.target.value;
  cfg.settings[cfg.scene].bg = val;
  document.getElementById('cfg-bg-color-val').textContent = val;
});

document.getElementById('cfg-bg-opacity').addEventListener('input', e => {
  cfg.settings[cfg.scene].bgOpacity = +e.target.value;
});

// Palette buttons
document.querySelectorAll('.palette-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    applyPalette(btn.dataset.palette);
    scenes[cfg.scene]?.init?.();
  });
});

// Fullscreen
const fsToggle = document.getElementById('fullscreen-toggle');
if (fsToggle) {
  fsToggle.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(console.error);
    else document.exitFullscreen();
  });
}
document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('fullscreen-toggle');
  if (!btn) return;
  btn.innerHTML = document.fullscreenElement
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
});

// Settings drawer
const drawer = document.getElementById('settings-drawer');
document.getElementById('settings-toggle').addEventListener('click', () => drawer.classList.toggle('closed'));
document.getElementById('settings-close').addEventListener('click', () => drawer.classList.add('closed'));

// Mode bar
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => switchScene(btn.dataset.scene));
});

// Keyboard shortcuts — a..z → 26 scenes in order
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  const map = {
    a: 'waves',    b: 'clock',   c: 'matrix',  d: 'aurora',
    e: 'orbs',     f: 'dvd',     g: 'neon',    h: 'fire',
    i: 'warp',     j: 'glitch',  k: 'hex',     l: 'ring',
    m: 'flow',     n: 'sand',    o: 'pulse',   p: 'binary',
    q: 'cube',     r: 'particle',s: 'tron',    t: 'kaleid',
    u: 'morse',    v: 'spiral',  w: 'terrain', x: 'bubble',
    y: 'ripple',   z: 'typer',
  };
  const scene = map[e.key.toLowerCase()];
  if (scene) switchScene(scene);
});
