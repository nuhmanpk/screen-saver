import { resize } from './core/canvas.js';
import { cfg, applyPalette } from './core/cfg.js';
import { scenes, switchScene } from './core/scene-manager.js';
import { initWakeLock } from './core/wake-lock.js';
import './core/ui.js';

resize();
window.addEventListener('resize', () => {
  resize();
  scenes[cfg.scene]?.init?.();
});

window.addEventListener('hashchange', () => {
  const name = location.hash.slice(1);
  if (name && scenes[name] && name !== cfg.scene) switchScene(name);
});

applyPalette('neon');
const _initScene = scenes[location.hash.slice(1)] ? location.hash.slice(1) : 'orbs';
switchScene(_initScene);
initWakeLock();
