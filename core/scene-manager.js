import { ctx, W, H } from './canvas.js';
import { cfg } from './cfg.js';
import { cancelRaf, setRafId } from './raf.js';

import waves    from '../scenes/waves.js';
import flipClock from '../scenes/flip-clock.js';
import radar    from '../scenes/radar.js';
import aurora   from '../scenes/aurora.js';
import orbs     from '../scenes/orbs.js';
import word     from '../scenes/word.js';
import rain     from '../scenes/rain.js';
import storm    from '../scenes/storm.js';
import warp     from '../scenes/warp.js';
import glitch   from '../scenes/glitch.js';
import hex      from '../scenes/hex.js';
import ring     from '../scenes/ring.js';
import flow     from '../scenes/flow.js';
import sand     from '../scenes/sand.js';
import pulse    from '../scenes/pulse.js';
import binary   from '../scenes/binary.js';
import pendulum from '../scenes/pendulum.js';
import particle from '../scenes/particle.js';
import bloom    from '../scenes/bloom.js';
import crystal  from '../scenes/crystal.js';
import morse    from '../scenes/morse.js';
import phyllo   from '../scenes/phyllo.js';
import ink      from '../scenes/ink.js';
import bubble   from '../scenes/bubble.js';
import strings  from '../scenes/strings.js';
import typer    from '../scenes/typer.js';

export const scenes = {
  waves,
  clock:    flipClock,
  matrix:   radar,
  aurora,
  orbs,
  dvd:      word,
  neon:     rain,
  storm,
  warp,
  glitch,
  hex,
  ring,
  flow,
  sand,
  pulse,
  binary,
  pendulum,
  particle,
  bloom,
  crystal,
  morse,
  phyllo,
  ink,
  bubble,
  strings,
  typer,
};

export function switchScene(name) {
  scenes[cfg.scene]?.destroy?.();
  cancelRaf();

  document.querySelectorAll('.scene').forEach(s => s.classList.add('hidden'));
  document.getElementById(`scene-${name}`)?.classList.remove('hidden');
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.scene === name);
  });

  cfg.scene = name;
  history.replaceState(null, '', '#' + name);

  const sCfg = cfg.settings[name];
  if (sCfg) {
    const elNeedle  = document.getElementById('cfg-needle');
    const elBg      = document.getElementById('cfg-bg-color');
    const elBgVal   = document.getElementById('cfg-bg-color-val');
    const elOpacity = document.getElementById('cfg-bg-opacity');
    if (elNeedle)  elNeedle.value      = sCfg.needle;
    if (elBg)      elBg.value          = sCfg.bg;
    if (elBgVal)   elBgVal.textContent = sCfg.bg;
    if (elOpacity) elOpacity.value     = sCfg.bgOpacity ?? 100;
  }
  if (name === 'clock') {
    document.documentElement.style.setProperty('--fc-scale', cfg.settings.clock.needle / 70);
  }

  ctx.clearRect(0, 0, W, H);
  scenes[name]?.init?.();
  setRafId(requestAnimationFrame(scenes[name].tick));
}
