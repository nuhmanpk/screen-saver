/* ─────────────────────────────────────────────────────────────
   NoSleep — app.js
   ───────────────────────────────────────────────────────────── */
'use strict';

const canvas = document.getElementById('bg-canvas');
const ctx    = canvas.getContext('2d');
let W = 0, H = 0;

const cfg = {
  scene:        'orbs',
  speed:        5,
  intensity:    5,
  palette:      'neon',
  clockOverlay: false,
  dim:          0,
  settings: {
    waves:  { bg: '#030308', needle: 70, bgOpacity: 100 },
    clock:  { bg: '#040409', needle: 70, bgOpacity: 100 },
    matrix: { bg: '#030308', needle: 70, bgOpacity: 100 },
    aurora: { bg: '#030307', needle: 70, bgOpacity: 100 },
    orbs:   { bg: '#030308', needle: 70, bgOpacity: 100 },
    dvd:    { bg: '#030307', needle: 70, bgOpacity: 100 },
    neon:   { bg: '#020010', needle: 70, bgOpacity: 100 },
    fire:   { bg: '#000000', needle: 70, bgOpacity: 100 },
    warp:   { bg: '#000008', needle: 70, bgOpacity: 82 },
    glitch: { bg: '#040209', needle: 70, bgOpacity: 100 },
    hex:    { bg: '#030308', needle: 70, bgOpacity: 100 },
    ring:   { bg: '#030307', needle: 70, bgOpacity: 100 },
    flow:   { bg: '#030307', needle: 70, bgOpacity: 100 },
  }
};

const PALETTES = {
  neon:   { c1: '#7b2ff7', c2: '#00f0ff' },
  ember:  { c1: '#ff4e00', c2: '#ec9f05' },
  forest: { c1: '#11998e', c2: '#38ef7d' },
  rose:   { c1: '#f953c6', c2: '#b91d73' },
  ice:    { c1: '#4facfe', c2: '#00f2fe' },
  gold:   { c1: '#f7971e', c2: '#ffd200' },
};

let C1 = '#7b2ff7', C2 = '#00f0ff';
let rafId = null;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => {
  resize();
  scenes[cfg.scene]?.init?.();
});
resize();

// ── Wake Lock ─────────────────────────────────────────────────
let wakeLock = null;
async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) { setWakeLockUI(false, 'Not supported'); return; }
  if (wakeLock !== null && !wakeLock.released) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    setWakeLockUI(true);
    wakeLock.addEventListener('release', () => {
      setWakeLockUI(false);
      if (document.visibilityState === 'visible') acquireWakeLock();
    });
  } catch (err) {
    setWakeLockUI(false, `Inactive: ${err.message}`);
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) acquireWakeLock();
});
['click', 'touchstart', 'keydown'].forEach(type => {
  document.addEventListener(type, () => {
    if (document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) acquireWakeLock();
  }, { passive: true });
});
setInterval(() => {
  if (document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) acquireWakeLock();
}, 15000);
function setWakeLockUI(ok, msg) {
  const ind  = document.getElementById('lock-indicator');
  const txt  = document.getElementById('wl-status-text');
  const icon = document.getElementById('wl-icon');
  if (ok) {
    ind?.classList.remove('failed');
    if (txt)  txt.textContent  = 'Screen will stay on';
    if (icon) icon.textContent = '☀️';
  } else {
    ind?.classList.add('failed');
    if (txt)  txt.textContent  = msg || 'Not active';
    if (icon) icon.textContent = '🌙';
  }
}
acquireWakeLock();

// ── Live Clock ────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }
function updateClock() {
  const now = new Date();
  const str = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const el = document.getElementById('live-time');
  if (el) el.textContent = str;
  const ov = document.getElementById('clock-overlay-time');
  if (ov) ov.textContent = str;
}
setInterval(updateClock, 1000);
updateClock();

// ── Palette ───────────────────────────────────────────────────
function applyPalette(name) {
  cfg.palette = name;
  const p = PALETTES[name];
  C1 = p.c1; C2 = p.c2;
  document.documentElement.style.setProperty('--c1', C1);
  document.documentElement.style.setProperty('--c2', C2);
  document.querySelectorAll('.palette-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.palette === name);
  });
  scenes[cfg.scene]?.init?.();
}

// ── Helpers ───────────────────────────────────────────────────
function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1,3), 16),
    parseInt(hex.slice(3,5), 16),
    parseInt(hex.slice(5,7), 16),
  ];
}
function lerpColor(hex1, hex2, t) {
  const [r1,g1,b1] = hexToRgb(hex1);
  const [r2,g2,b2] = hexToRgb(hex2);
  return [
    Math.round(r1+(r2-r1)*t),
    Math.round(g1+(g2-g1)*t),
    Math.round(b1+(b2-b1)*t),
  ];
}
function rand(a, b) { return a + Math.random() * (b - a); }

function fillBg(sceneName) {
  const s = cfg.settings[sceneName];
  const [r, g, b] = hexToRgb(s.bg);
  const op = (s.bgOpacity ?? 100) / 100;
  ctx.fillStyle = `rgba(${r},${g},${b},${op})`;
  ctx.fillRect(0, 0, W, H);
}

// ── Scene Manager ─────────────────────────────────────────────
function switchScene(name) {
  const prev = cfg.scene;
  scenes[prev]?.destroy?.();
  if (rafId) cancelAnimationFrame(rafId);
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
    if (elNeedle)  elNeedle.value       = sCfg.needle;
    if (elBg)      elBg.value           = sCfg.bg;
    if (elBgVal)   elBgVal.textContent  = sCfg.bg;
    if (elOpacity) elOpacity.value      = sCfg.bgOpacity ?? 100;
  }
  if (name === 'clock') {
    const scale = cfg.settings.clock.needle / 70;
    document.documentElement.style.setProperty('--fc-scale', scale);
  }

  ctx.clearRect(0, 0, W, H);
  scenes[name]?.init?.();
  rafId = requestAnimationFrame(scenes[name].tick);
}

// ═══════════════════════════════════════════════════════════════
//  SCENE: WAVE CLOCK
// ═══════════════════════════════════════════════════════════════
const sceneWaves = (() => {
  let t = 0;

  function init() {}

  function tick() {
    rafId = requestAnimationFrame(tick);
    t += 0.005 * (cfg.speed / 5);
    fillBg('waves');

    const cx = W / 2, cy = H / 2;
    const scale = cfg.settings.waves.needle / 70;
    const rMax = Math.min(W, H) * 0.35 * scale;

    for (let i = 0; i < 3; i++) {
      const frac = i / 2;
      const alpha = 0.03 + (1 - frac) * 0.04;
      const rgbParts = lerpColor(C1, C2, frac);
      const amp = (cfg.intensity / 10) * H * 0.06;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 10) {
        const y = H * (0.35 + frac * 0.3) + Math.sin(x * 0.003 + t + i * 2) * amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = `rgba(${rgbParts.join(',')}, ${alpha})`;
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, rMax, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + Math.cos(angle) * (rMax - 12);
      const y1 = cy + Math.sin(angle) * (rMax - 12);
      const x2 = cx + Math.cos(angle) * rMax;
      const y2 = cy + Math.sin(angle) * rMax;
      ctx.strokeStyle = i % 3 === 0 ? `rgba(${hexToRgb(C2).join(',')},0.35)` : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = i % 3 === 0 ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    const now = new Date();
    const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds(), ms = now.getMilliseconds();
    const secAngle  = ((s + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2;
    const minAngle  = ((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2;
    const hourAngle = (((h % 12) + m / 60) / 12) * Math.PI * 2 - Math.PI / 2;

    function drawWavyHand(angle, length, width, color, freq, amp, phase) {
      ctx.beginPath();
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const d  = frac * length;
        const bx = cx + Math.cos(angle) * d;
        const by = cy + Math.sin(angle) * d;
        const wo = Math.sin(d * freq - phase) * amp * (1 - frac * 0.3);
        const wx = bx - Math.sin(angle) * wo;
        const wy = by + Math.cos(angle) * wo;
        if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();
      const hx = cx + Math.cos(angle) * length;
      const hy = cy + Math.sin(angle) * length;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(hx, hy, width * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const handAmp = (cfg.intensity / 10) * 14;
    drawWavyHand(hourAngle, rMax * 0.55, 6, C1, 0.04, handAmp * 0.7, t * 1.8);
    drawWavyHand(minAngle,  rMax * 0.78, 4, C2, 0.03, handAmp,       t * 2.2);
    drawWavyHand(secAngle,  rMax * 0.9,  1.5, '#fff', 0.02, handAmp * 1.3, t * 3.5);

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '15px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${pad(h)}:${pad(m)}:${pad(s)}`, cx, cy + rMax * 0.3);
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: FLIP CLOCK
// ═══════════════════════════════════════════════════════════════
const sceneClock = (() => {
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
    rafId = requestAnimationFrame(tick);
    bgT += 0.005 * (cfg.speed / 5);
    fillBg('clock');
    [
      { x: W*0.35 + Math.sin(bgT)*W*0.06, y: H*0.5 + Math.cos(bgT*0.7)*H*0.06, r: W*0.35, c: C1 },
      { x: W*0.65 + Math.cos(bgT*0.8)*W*0.06, y: H*0.5 + Math.sin(bgT*0.9)*H*0.06, r: W*0.35, c: C2 },
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

  return { init, tick, destroy };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: RADAR CLOCK
// ═══════════════════════════════════════════════════════════════
const sceneMatrix = (() => {
  let targets = [], blips = [], lastTimeStr = '', offscreen = null, oCtx = null;

  function init() {
    targets = []; blips = []; lastTimeStr = '';
    if (!offscreen) { offscreen = document.createElement('canvas'); oCtx = offscreen.getContext('2d'); }
    offscreen.width = 540; offscreen.height = 120;
    ctx.clearRect(0, 0, W, H);
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    fillBg('matrix');

    const cx = W / 2, cy = H / 2;
    const sf    = cfg.settings.matrix.needle / 70;
    const rRings  = Math.min(W, H) * 0.44 * sf;          // rings stay proportional
    const rNeedle = Math.sqrt(W * W + H * H) / 2;         // needle reaches corners

    const now = new Date();
    const hrs = now.getHours(), mins = now.getMinutes(), secs = now.getSeconds(), ms = now.getMilliseconds();
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const dH = hrs % 12 || 12;
    const timeStr = `${pad(dH)}:${pad(mins)}:${pad(secs)} ${ampm}`;

    if (timeStr !== lastTimeStr) {
      lastTimeStr = timeStr;
      oCtx.clearRect(0, 0, 540, 120);
      oCtx.fillStyle = '#fff';
      oCtx.font = 'bold 74px JetBrains Mono, monospace';
      oCtx.textAlign = 'center'; oCtx.textBaseline = 'middle';
      oCtx.fillText(timeStr, 270, 60);
      const d = oCtx.getImageData(0, 0, 540, 120);
      targets = [];
      for (let y = 0; y < 120; y += 3)
        for (let x = 0; x < 540; x += 3)
          if (d.data[(y * 540 + x) * 4 + 3] > 70) targets.push({ x, y });
    }

    const rgbC1 = hexToRgb(C1).join(',');
    const rgbC2 = hexToRgb(C2).join(',');

    // ── Concentric range rings ──
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach((f, i) => {
      const r = rRings * f;
      ctx.strokeStyle = `rgba(${rgbC1},${0.06 + i * 0.015})`;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      // Range label at top of each ring
      ctx.fillStyle = `rgba(${rgbC1},0.18)`;
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(`${Math.round(f * 100)}`, cx, cy - r - 3);
    });

    // ── Crosshair ──
    ctx.strokeStyle = `rgba(${rgbC1},0.06)`;
    ctx.beginPath();
    ctx.moveTo(cx - rRings, cy); ctx.lineTo(cx + rRings, cy);
    ctx.moveTo(cx, cy - rRings); ctx.lineTo(cx, cy + rRings);
    ctx.stroke();

    // ── Radial spokes every 30° ──
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg - 90) * Math.PI / 180;
      ctx.strokeStyle = `rgba(${rgbC1},0.04)`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rad) * rRings, cy + Math.sin(rad) * rRings);
      ctx.stroke();
    }

    // ── Degree ticks + labels on outer ring ──
    ctx.lineWidth = 1;
    for (let deg = 0; deg < 360; deg += 10) {
      const rad     = (deg - 90) * Math.PI / 180;
      const isMajor = deg % 30 === 0;
      const inner   = rRings - (isMajor ? 10 : 5);
      ctx.strokeStyle = `rgba(${rgbC1},${isMajor ? 0.22 : 0.09})`;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad) * inner,   cy + Math.sin(rad) * inner);
      ctx.lineTo(cx + Math.cos(rad) * rRings,  cy + Math.sin(rad) * rRings);
      ctx.stroke();
      if (isMajor) {
        const lr = rRings + 14;
        ctx.fillStyle = `rgba(${rgbC1},0.58)`;
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${deg}`, cx + Math.cos(rad) * lr, cy + Math.sin(rad) * lr);
      }
    }

    // ── Sweep needle + glow tail ──
    const sweepAngle = ((secs + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2;
    const tailWidth  = 0.5;
    for (let i = 0; i < 30; i++) {
      const angle = sweepAngle - (i / 30) * tailWidth;
      ctx.strokeStyle = `rgba(${rgbC2},${0.18 * (1 - i / 30)})`;
      ctx.lineWidth = i === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * rNeedle, cy + Math.sin(angle) * rNeedle);
      ctx.stroke();
    }

    // ── Blips: spawn near sweep head, fade out ──
    if (Math.random() < 0.3) {
      const r = rand(rRings * 0.08, rRings * 0.96);
      const a = sweepAngle + rand(-0.08, 0.04);
      blips.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, age: 0, life: 40 + Math.floor(rand(0, 35)) });
    }
    blips = blips.filter(b => b.age < b.life);
    blips.forEach(b => {
      b.age++;
      const alpha = (1 - b.age / b.life) * 0.6;
      const sz    = 1 + (1 - b.age / b.life) * 1.8;
      ctx.fillStyle = `rgba(${rgbC2},${alpha})`;
      ctx.fillRect(b.x - sz / 2, b.y - sz / 2, sz, sz);
    });

    // ── Clock dot targets ──
    const scale  = Math.min(W * 0.82 / 540, H * 0.38 / 120, 2.2);
    const startX = cx - (540 * scale) / 2;
    const startY = cy - (120 * scale) / 2;

    targets.forEach(pt => {
      const sx = startX + pt.x * scale;
      const sy = startY + pt.y * scale;
      const dx = sx - cx, dy = sy - cy;
      const ang = Math.atan2(dy, dx);
      let diff = sweepAngle - ang;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      if (diff >= 0 && diff < tailWidth) {
        const f = 1 - diff / tailWidth;
        ctx.fillStyle = f > 0.85 ? '#fff' : `rgba(${rgbC2},${0.35 + f * 0.65})`;
        ctx.fillRect(sx - 1, sy - 1, 2.5, 2.5);
      } else {
        ctx.fillStyle = `rgba(${rgbC1},0.85)`;
        ctx.fillRect(sx - 1, sy - 1, 1.5, 1.5);
      }
    });

    // ── Target-lock brackets around clock ──
    const cW  = 540 * scale, cH = 120 * scale;
    const mg  = 20, bS = 18;
    const bL  = startX - mg, bR = startX + cW + mg;
    const bT  = startY - mg, bB = startY + cH + mg;
    ctx.strokeStyle = `rgba(${rgbC2},0.38)`;
    ctx.lineWidth = 1;
    [[bL,bT,1,1],[bR,bT,-1,1],[bL,bB,1,-1],[bR,bB,-1,-1]].forEach(([x,y,sx2,sy2]) => {
      ctx.beginPath();
      ctx.moveTo(x + sx2*bS, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy2*bS);
      ctx.stroke();
    });
    ctx.fillStyle = `rgba(${rgbC2},0.38)`;
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('TGT_LOCK', bL, bT - 3);
    ctx.textAlign = 'right';
    ctx.fillText(`${targets.length}pts`, bR, bT - 3);

    // ── Corner HUD text ──
    const bearing = ((sweepAngle * 180 / Math.PI + 90 + 360) % 360).toFixed(1);
    ctx.fillStyle = `rgba(${rgbC2},0.32)`;
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const hx = cx - rRings + 10, hy = cy - rRings + 18;
    ctx.fillText('SYS_RADAR_ACTIVE', hx, hy);
    ctx.fillText(`BRG ${bearing}°`, hx, hy + 14);
    ctx.fillText(`RNG ${rRings.toFixed(0)}px`, hx, hy + 28);

    ctx.textAlign = 'right';
    ctx.fillText(`${pad(hrs)}:${pad(mins)} ${ampm}`, cx + rRings - 10, hy);
    ctx.fillText(`${secs}s`, cx + rRings - 10, hy + 14);
    ctx.fillText(`BLIPS ${blips.length}`, cx + rRings - 10, hy + 28);
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: AURORA CLOCK
// ═══════════════════════════════════════════════════════════════
const sceneAurora = (() => {
  let t = 0, stars = [];

  function init() {
    stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.1 + 0.2,
      a: Math.random(),
      speed: rand(0.005, 0.015)
    }));
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    t += 0.004 * (cfg.speed / 5);
    fillBg('aurora');

    stars.forEach(s => {
      s.a += s.speed;
      if (s.a > 1 || s.a < 0) s.speed = -s.speed;
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0.08, Math.min(0.8, s.a))})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    const cx = W / 2, cy = H / 2;
    const now = new Date();
    const hrs = now.getHours(), mins = now.getMinutes(), secs = now.getSeconds(), ms = now.getMilliseconds();
    const sf = cfg.settings.aurora.needle / 70;
    const r1 = Math.min(W, H) * 0.18 * sf;
    const r2 = Math.min(W, H) * 0.28 * sf;
    const r3 = Math.min(W, H) * 0.38 * sf;

    function drawAuroraRing(radius, frac, color, width, speedMult, ampMult) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      const steps = 150, startAngle = -Math.PI / 2, endAngle = startAngle + frac * Math.PI * 2;

      function ringPath(extra) {
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const angle = startAngle + (i / steps) * (endAngle - startAngle);
          const wf = 7 + (cfg.intensity / 2);
          const wa = (cfg.intensity / 10) * 11 * ampMult;
          const r = radius + Math.sin(angle * wf + t * speedMult + extra) * wa;
          const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
      }

      ringPath(0);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke();

      ringPath(1.2);
      ctx.strokeStyle = `rgba(${hexToRgb(color).join(',')},0.25)`;
      ctx.lineWidth = width * 2.8; ctx.stroke();
      ctx.restore();
    }

    drawAuroraRing(r3, ((hrs%12)+mins/60)/12, C1, 6, 2, 0.9);
    drawAuroraRing(r2, (mins+secs/60)/60,      C2, 4, 2.8, 1.2);
    drawAuroraRing(r1, (secs+ms/1000)/60,  '#fff', 1.8, 3.8, 1.4);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${pad(hrs%12||12)}:${pad(mins)}`, cx, cy - 6);
    ctx.font = '13px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(`${pad(secs)}s`, cx, cy + 24);
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: ORBITAL CLOCK
// ═══════════════════════════════════════════════════════════════
const sceneOrbs = (() => {
  let stars = [], trailS = [], trailM = [], trailH = [];

  function init() {
    stars = Array.from({ length: 90 }, () => ({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*0.8+0.2 }));
    trailS = []; trailM = []; trailH = [];
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    const speed = cfg.speed / 5;
    fillBg('orbs');

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    stars.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill(); });

    const cx = W/2, cy = H/2;
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds(), ms = now.getMilliseconds();
    const sf = cfg.settings.orbs.needle / 70;
    const r1 = Math.min(W,H)*0.16*sf, r2 = Math.min(W,H)*0.27*sf, r3 = Math.min(W,H)*0.38*sf;

    const aS = ((s+ms/1000)/60)*Math.PI*2-Math.PI/2;
    const aM = ((m+s/60)/60)*Math.PI*2-Math.PI/2;
    const aH = (((h%12)+m/60)/12)*Math.PI*2-Math.PI/2;
    const pS = { x: cx+Math.cos(aS)*r1, y: cy+Math.sin(aS)*r1 };
    const pM = { x: cx+Math.cos(aM)*r2, y: cy+Math.sin(aM)*r2 };
    const pH = { x: cx+Math.cos(aH)*r3, y: cy+Math.sin(aH)*r3 };

    trailS.push({ x:pS.x, y:pS.y, a:1 }); if (trailS.length>50) trailS.shift();
    trailM.push({ x:pM.x, y:pM.y, a:1 }); if (trailM.length>40) trailM.shift();
    trailH.push({ x:pH.x, y:pH.y, a:1 }); if (trailH.length>30) trailH.shift();

    ctx.strokeStyle = 'rgba(255,255,255,0.012)'; ctx.lineWidth = 1;
    const gs = 44;
    for (let x = 0; x < W; x += gs) {
      ctx.beginPath();
      for (let y = 0; y < H; y += 12) {
        let wx = x, wy = y;
        [pS,pM,pH].forEach((p,idx) => {
          const dx=x-p.x, dy=y-p.y, d=Math.sqrt(dx*dx+dy*dy);
          const pr = idx===0?80:idx===1?115:150;
          if (d < pr) { const f=(1-d/pr)*16*(cfg.intensity/5); wx-=(dx/d)*f; wy-=(dy/d)*f; }
        });
        if (y===0) ctx.moveTo(wx,wy); else ctx.lineTo(wx,wy);
      }
      ctx.stroke();
    }
    for (let y = 0; y < H; y += gs) {
      ctx.beginPath();
      for (let x = 0; x < W; x += 12) {
        let wx=x, wy=y;
        [pS,pM,pH].forEach((p,idx) => {
          const dx=x-p.x, dy=y-p.y, d=Math.sqrt(dx*dx+dy*dy);
          const pr=idx===0?80:idx===1?115:150;
          if(d<pr){const f=(1-d/pr)*16*(cfg.intensity/5);wx-=(dx/d)*f;wy-=(dy/d)*f;}
        });
        if(x===0)ctx.moveTo(wx,wy);else ctx.lineTo(wx,wy);
      }
      ctx.stroke();
    }

    ctx.strokeStyle='rgba(255,255,255,0.035)';
    [r1,r2,r3].forEach(r=>{ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();});

    function drawTrail(trail, color, size) {
      for (let i=0;i<trail.length;i++) {
        const pt=trail[i]; pt.a-=0.02*speed;
        if(pt.a<=0) continue;
        ctx.fillStyle=`rgba(${hexToRgb(color).join(',')},${pt.a*0.35})`;
        ctx.beginPath(); ctx.arc(pt.x,pt.y,size*pt.a,0,Math.PI*2); ctx.fill();
      }
    }
    drawTrail(trailS,'#fff',4); drawTrail(trailM,C2,6); drawTrail(trailH,C1,8);

    [[pH,C1,10],[pM,C2,7],[pS,'#fff',4]].forEach(([p,c,r])=>{
      ctx.shadowColor=c; ctx.shadowBlur=15; ctx.fillStyle=c;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill();
    });
    ctx.shadowBlur=0;

    const sg=ctx.createRadialGradient(cx,cy,0,cx,cy,28);
    sg.addColorStop(0,`rgba(${hexToRgb(C2).join(',')},0.45)`);
    sg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,28,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.shadowColor=C2; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;

    ctx.fillStyle='#fff'; ctx.font='bold 18px JetBrains Mono, monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(`${pad(h)}:${pad(m)}`,cx,cy);
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: WORD CLOCK  (3-section full-screen grid)
// ═══════════════════════════════════════════════════════════════
const sceneDvd = (() => {
  // Each section fills exactly 1/3 of the screen height.
  // Hours → top third, Minutes → middle, Seconds → bottom.
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

  // Section color arrays (set in init, updated on palette change)
  let sc = [null, null, null]; // rgb arrays for hours / minutes / seconds
  let tiles = [];              // flat: { word, x, y, w, h, si }

  function numToWords(n) {
    const OT = ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE',
                'TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN',
                'SEVENTEEN','EIGHTEEN','NINETEEN'];
    const TN = ['TWENTY','THIRTY','FORTY','FIFTY'];
    const out = new Set();
    if (n <= 0 || n > 59) return out;
    if (n < 20) { out.add(OT[n-1]); }
    else { out.add(TN[Math.floor(n/10)-2]); if (n%10) out.add(OT[n%10-1]); }
    return out;
  }

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
    const H_WORDS = ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE'];
    return [
      new Set([H_WORDS[h12 - 1]]),
      numToWords(now.getMinutes()),
      numToWords(now.getSeconds()),
    ];
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    fillBg('dvd');

    const active = getActive();

    tiles.forEach(({ word, x, y, w, h, si }) => {
      const isActive = active[si].has(word);
      const [cr, cg, cb] = sc[si] || [255, 255, 255];

      // Grid line (very dim)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

      if (isActive) {
        // Glow background
        ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
        ctx.shadowBlur = 36;
        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.13)`;
        ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
        ctx.shadowBlur = 0;

        // Bright border
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.5)`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      }

      // Word text — font size fits both height and width
      const charRatio = 0.58;
      const fs = Math.min(h * 0.40, (w * 0.84) / (word.length * charRatio));
      ctx.font = `700 ${fs}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isActive) {
        ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.065)';
        ctx.shadowBlur = 0;
      }

      ctx.fillText(word, x + w / 2, y + h / 2);
      ctx.shadowBlur = 0;
    });

    // Section dividers
    const [c1r, c1g, c1b] = sc[0] || hexToRgb(C1);
    ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},0.18)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H / 3);   ctx.lineTo(W, H / 3);
    ctx.moveTo(0, 2*H / 3); ctx.lineTo(W, 2*H / 3);
    ctx.stroke();

    // Section labels
    ['HOURS', 'MINUTES', 'SECONDS'].forEach((label, i) => {
      const [lr, lg, lb] = sc[i] || [255, 255, 255];
      ctx.fillStyle = `rgba(${lr},${lg},${lb},0.22)`;
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, 10, i * H / 3 + 5);
    });
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: NEON (Digital Rain Clock)
// ═══════════════════════════════════════════════════════════════
const sceneNeon = (() => {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&!?+=<>';
  let cols = [], fs = 16, lastTs = 0;

  function init() {
    fs = Math.max(12, Math.floor(W / 60));
    const colW = fs * 0.7;
    const numCols = Math.floor(W / colW);
    cols = Array.from({length: numCols}, (_, i) => {
      const trailLen = Math.floor(rand(8, 26));
      return {
        x: i * colW + colW * 0.3,
        y: rand(-H * 1.5, H),
        speed: rand(60, 200),
        trailLen,
        chars: Array.from({length: trailLen}, () => CHARS[Math.floor(Math.random()*CHARS.length)]),
      };
    });
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    fillBg('neon');

    const [c1r,c1g,c1b] = hexToRgb(C1);
    const [c2r,c2g,c2b] = hexToRgb(C2);
    const spd = cfg.speed / 5;

    ctx.font = `${fs}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    cols.forEach(col => {
      col.y += col.speed * spd * dt;
      if (col.y - col.trailLen * fs > H) {
        col.y = -col.trailLen * fs * rand(0.3, 1.2);
        col.speed = rand(60, 200);
        col.trailLen = Math.floor(rand(8, 26));
        col.chars = Array.from({length: col.trailLen}, () => CHARS[Math.floor(Math.random()*CHARS.length)]);
      }
      if (Math.random() < 0.05) {
        col.chars[Math.floor(Math.random()*col.chars.length)] = CHARS[Math.floor(Math.random()*CHARS.length)];
      }

      col.chars.forEach((ch, i) => {
        const cy = col.y - (col.trailLen - 1 - i) * fs;
        if (cy < -fs || cy > H) return;
        const frac = i / (col.trailLen - 1);
        if (frac > 0.88) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = `rgb(${c2r},${c2g},${c2b})`;
          ctx.shadowBlur = 10;
        } else {
          const alpha = frac * 0.6 + 0.04;
          const r = Math.round(c1r + (c2r - c1r) * frac);
          const g = Math.round(c1g + (c2g - c1g) * frac);
          const b = Math.round(c1b + (c2b - c1b) * frac);
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.shadowBlur = 0;
        }
        ctx.fillText(ch, col.x, cy);
        ctx.shadowBlur = 0;
      });
    });

    // Big centered time with bloom
    const now = new Date();
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const bigFs = Math.min(W * 0.19, H * 0.27, 170);
    const cy = H * 0.46;

    // Dark panel so time is readable over rain
    const panW = bigFs * 5.5, panH = bigFs * 1.25;
    ctx.fillStyle = 'rgba(2,0,14,0.7)';
    ctx.beginPath();
    ctx.roundRect(W/2 - panW/2, cy - panH/2, panW, panH, 10);
    ctx.fill();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `300 ${bigFs}px 'JetBrains Mono', monospace`;

    // Outer purple bloom
    ctx.shadowColor = `rgb(${c1r},${c1g},${c1b})`; ctx.shadowBlur = 80;
    ctx.fillStyle = `rgba(${c1r},${c1g},${c1b},0.35)`;
    ctx.fillText(timeStr, W/2, cy);

    // Mid cyan glow
    ctx.shadowColor = `rgb(${c2r},${c2g},${c2b})`; ctx.shadowBlur = 35;
    ctx.fillStyle = `rgba(${c2r},${c2g},${c2b},0.65)`;
    ctx.fillText(timeStr, W/2, cy);

    // White core
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(timeStr, W/2, cy);
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: FIRE (Plasma waves + clear time overlay)
// ═══════════════════════════════════════════════════════════════
const sceneFire = (() => {
  let t = 0, lastTs = 0;
  let pOff = null, pCtx = null;
  const SCALE = 5;

  function init() {
    t = 0; lastTs = 0;
    if (!pOff) { pOff = document.createElement('canvas'); pCtx = pOff.getContext('2d'); }
    pOff.width  = Math.ceil(W / SCALE);
    pOff.height = Math.ceil(H / SCALE);
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    t += dt * 0.6 * (cfg.speed / 5);

    if (pOff.width !== Math.ceil(W/SCALE) || pOff.height !== Math.ceil(H/SCALE)) {
      pOff.width = Math.ceil(W/SCALE); pOff.height = Math.ceil(H/SCALE);
    }

    const pw = pOff.width, ph = pOff.height;
    const [c1r,c1g,c1b] = hexToRgb(C1);
    const [c2r,c2g,c2b] = hexToRgb(C2);

    // Build plasma via ImageData at 1/SCALE resolution
    const img = pCtx.createImageData(pw, ph);
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const nx = x / pw, ny = y / ph;
        const dx = nx - 0.5, dy = ny - 0.5;
        const v = (
          Math.sin(nx * 9  + t        ) +
          Math.sin(ny * 7  - t * 0.8  ) +
          Math.sin((nx+ny) * 6 + t*0.6) +
          Math.sin(Math.sqrt(dx*dx+dy*dy) * 14 - t*1.1)
        ) * 0.25;                             // range -1..1
        const blend = (v + 1) * 0.5;          // 0..1
        const idx = (y * pw + x) * 4;
        img.data[idx]   = Math.round(c1r + (c2r - c1r) * blend);
        img.data[idx+1] = Math.round(c1g + (c2g - c1g) * blend);
        img.data[idx+2] = Math.round(c1b + (c2b - c1b) * blend);
        img.data[idx+3] = 255;
      }
    }
    pCtx.putImageData(img, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(pOff, 0, 0, W, H);

    // Dark vignette so center time pops
    const vig = ctx.createRadialGradient(W/2, H/2, W*0.1, W/2, H/2, W*0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0.55)');
    vig.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    // Clear readable time in center
    const now = new Date();
    const tStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const fs = Math.min(W * 0.19, H * 0.26, 165);
    ctx.font = `300 ${fs}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = `rgb(${c2r},${c2g},${c2b})`; ctx.shadowBlur = 45;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tStr, W/2, H/2);
    ctx.shadowBlur = 0;
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: WARP (Hyperspace Star Tunnel)
// ═══════════════════════════════════════════════════════════════
const sceneWarp = (() => {
  const NUM = 500;
  let stars = [];

  function resetStar(i, randomZ) {
    stars[i] = {
      x: (Math.random() - 0.5) * 2200,
      y: (Math.random() - 0.5) * 2200,
      z: randomZ ? Math.random() * 1000 : 1000,
      pz: randomZ ? Math.random() * 1000 + 1 : 1000,
    };
  }

  function init() {
    stars = [];
    for (let i = 0; i < NUM; i++) resetStar(i, true);
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    fillBg('warp');

    const speed = (cfg.speed / 5) * 7;
    const cx = W/2, cy = H/2;
    const [c1r,c1g,c1b] = hexToRgb(C1);
    const [c2r,c2g,c2b] = hexToRgb(C2);

    stars.forEach((s, i) => {
      s.pz = s.z;
      s.z -= speed;
      if (s.z <= 1) { resetStar(i, false); return; }

      const sx = (s.x / s.z)  * W * 0.5 + cx;
      const sy = (s.y / s.z)  * W * 0.5 + cy;
      const px = (s.x / s.pz) * W * 0.5 + cx;
      const py = (s.y / s.pz) * W * 0.5 + cy;

      if (sx < -50 || sx > W+50 || sy < -50 || sy > H+50) { resetStar(i, false); return; }

      const bright = 1 - s.z / 1000;
      const r = Math.round(c1r + (c2r-c1r) * bright);
      const g = Math.round(c1g + (c2g-c1g) * bright);
      const b = Math.round(c1b + (c2b-c1b) * bright);

      ctx.strokeStyle = `rgba(${r},${g},${b},${bright * 0.85})`;
      ctx.lineWidth = Math.max(0.5, bright * 2.5);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    });

    const now = new Date();
    const h = now.getHours(), m = now.getMinutes(), sv = now.getSeconds();
    const tStr = `${pad(h)}:${pad(m)}:${pad(sv)}`;
    const fs = Math.min(W * 0.1, 110);

    ctx.font = `300 ${fs}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = C1;
    ctx.shadowBlur = 40;
    ctx.fillStyle = `rgba(${c1r},${c1g},${c1b},0.5)`;
    ctx.fillText(tStr, cx, cy);

    ctx.shadowColor = C2;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(${c2r},${c2g},${c2b},0.7)`;
    ctx.fillText(tStr, cx, cy);

    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tStr, cx, cy);
    ctx.shadowBlur = 0;
  }

  function destroy() { stars = []; }

  return { init, tick, destroy };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: GLITCH CLOCK
// ═══════════════════════════════════════════════════════════════
const sceneGlitch = (() => {
  let glitchTimer = 800;
  let glitchRows = [];
  let offscreen = null, oCtx = null;

  function init() {
    glitchTimer = 800;
    glitchRows  = [];
    if (!offscreen) {
      offscreen = document.createElement('canvas');
      oCtx = offscreen.getContext('2d');
    }
    offscreen.width = W; offscreen.height = H;
  }

  function scheduleGlitch() {
    glitchTimer = rand(400, 2800);
    glitchRows  = [];
    const n = 2 + Math.floor(Math.random() * 7);
    for (let i = 0; i < n; i++) {
      glitchRows.push({
        y:      Math.random() * H,
        h:      2 + Math.random() * 28,
        offset: (Math.random() - 0.5) * 90,
        life:   60 + Math.random() * 180,
      });
    }
  }

  function renderToOffscreen(timeStr) {
    if (offscreen.width !== W || offscreen.height !== H) {
      offscreen.width = W; offscreen.height = H;
    }
    oCtx.clearRect(0, 0, W, H);
    const fs = Math.min(W * 0.2, H * 0.32, 200);
    const cx = W/2, cy = H/2;
    oCtx.textAlign = 'center';
    oCtx.textBaseline = 'middle';
    oCtx.font = `700 ${fs}px 'JetBrains Mono', monospace`;

    const off = glitchRows.length > 2 ? 7 : 2;
    oCtx.fillStyle = `rgba(${hexToRgb(C1).join(',')},0.75)`;
    oCtx.fillText(timeStr, cx - off, cy + 2);
    oCtx.fillStyle = `rgba(${hexToRgb(C2).join(',')},0.75)`;
    oCtx.fillText(timeStr, cx + off, cy - 2);
    oCtx.fillStyle = '#ffffff';
    oCtx.shadowColor = C2;
    oCtx.shadowBlur = 22;
    oCtx.fillText(timeStr, cx, cy);
    oCtx.shadowBlur = 0;
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    glitchTimer -= 16;
    if (glitchTimer <= 0) scheduleGlitch();
    glitchRows.forEach(r => { r.life -= 16; });
    glitchRows = glitchRows.filter(r => r.life > 0);

    fillBg('glitch');

    const now = new Date();
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    renderToOffscreen(timeStr);

    // Full draw
    ctx.drawImage(offscreen, 0, 0);

    // Glitched row slices
    glitchRows.forEach(row => {
      const srcY = Math.max(0, Math.floor(row.y));
      const srcH = Math.min(Math.ceil(row.h), H - srcY);
      if (srcH <= 0) return;
      ctx.drawImage(offscreen, 0, srcY, W, srcH, row.offset, srcY, W, srcH);
    });

    // Horizontal scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

    // Random noise flickers
    if (Math.random() < 0.05) {
      const ny = Math.random() * H;
      ctx.fillStyle = `rgba(${hexToRgb(C2).join(',')},${Math.random() * 0.25})`;
      ctx.fillRect(0, ny, W, 1 + Math.random() * 3);
    }

    // Occasional full-frame color shift
    if (glitchRows.length > 4 && Math.random() < 0.015) {
      ctx.fillStyle = `rgba(${hexToRgb(C1).join(',')},0.06)`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function destroy() { glitchRows = []; }

  return { init, tick, destroy };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: HEX CLOCK (Dot-matrix with hexagonal cells — 5×7 font)
// ═══════════════════════════════════════════════════════════════
const sceneHex = (() => {
  const ROWS = 7, CHAR_W = 5, GAP = 1;
  const FONT = {
    '0': [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
    '1': [0b00100,0b01100,0b00100,0b00100,0b00100,0b00100,0b01110],
    '2': [0b01110,0b10001,0b00001,0b00010,0b00100,0b01000,0b11111],
    '3': [0b01110,0b10001,0b00001,0b00110,0b00001,0b10001,0b01110],
    '4': [0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0b00010],
    '5': [0b11111,0b10000,0b11110,0b00001,0b00001,0b10001,0b01110],
    '6': [0b00110,0b01000,0b10000,0b11110,0b10001,0b10001,0b01110],
    '7': [0b11111,0b00001,0b00010,0b00100,0b01000,0b01000,0b01000],
    '8': [0b01110,0b10001,0b10001,0b01110,0b10001,0b10001,0b01110],
    '9': [0b01110,0b10001,0b10001,0b01111,0b00001,0b00010,0b01100],
    ':': [0b00000,0b00100,0b00100,0b00000,0b00100,0b00100,0b00000],
  };

  function hexDot(cx, cy, r) {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI/3)*i - Math.PI/6;
      const hx = cx + r*Math.cos(a), hy = cy + r*Math.sin(a);
      if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
  }

  function init() {}

  function tick() {
    rafId = requestAnimationFrame(tick);
    fillBg('hex');

    const now = new Date();
    const chars = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`.split('');

    const totalCols = chars.length * (CHAR_W + GAP) - GAP;
    const cell      = Math.min(W * 0.88 / totalCols, H * 0.74 / ROWS);
    const hexR      = cell * 0.40;
    const ox        = (W - totalCols * cell) / 2;
    const oy        = (H - ROWS * cell) / 2;

    const [c1r,c1g,c1b] = hexToRgb(C1);
    const [c2r,c2g,c2b] = hexToRgb(C2);

    // Pass 1: all inactive dots (single batched path)
    ctx.beginPath();
    let colOff = 0;
    chars.forEach(ch => {
      const bm = FONT[ch] || FONT['0'];
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < CHAR_W; col++) {
          if ((bm[row] >> (CHAR_W-1-col)) & 1) continue;
          hexDot(ox+(colOff+col)*cell+cell/2, oy+row*cell+cell/2, hexR);
        }
      }
      colOff += CHAR_W + GAP;
    });
    ctx.fillStyle = `rgba(${c1r},${c1g},${c1b},0.07)`;
    ctx.fill();

    // Pass 2: active dots per char (gradient color + glow)
    colOff = 0;
    chars.forEach((ch, ci) => {
      const frac = chars.length > 1 ? ci / (chars.length - 1) : 0;
      const cr = Math.round(c1r + (c2r-c1r)*frac);
      const cg = Math.round(c1g + (c2g-c1g)*frac);
      const cb = Math.round(c1b + (c2b-c1b)*frac);

      ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
      ctx.shadowBlur  = cell * 0.6;
      ctx.fillStyle   = `rgb(${cr},${cg},${cb})`;
      ctx.beginPath();

      const bm = FONT[ch] || FONT['0'];
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < CHAR_W; col++) {
          if (!((bm[row] >> (CHAR_W-1-col)) & 1)) continue;
          hexDot(ox+(colOff+col)*cell+cell/2, oy+row*cell+cell/2, hexR);
        }
      }
      ctx.fill();
      colOff += CHAR_W + GAP;
    });
    ctx.shadowBlur = 0;
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: RING WORD CLOCK (words on three concentric rotating rings)
// ═══════════════════════════════════════════════════════════════
const sceneRing = (() => {
  const H_WORDS  = ['TWELVE','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN'];
  const MS_WORDS = ['TWENTY','THIRTY','FORTY','FIFTY','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN',
                    'EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN',
                    'SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'];
  let t = 0;

  function wordSet(n) {
    const OT = ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE',
                'TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN',
                'SEVENTEEN','EIGHTEEN','NINETEEN'];
    const TN = ['TWENTY','THIRTY','FORTY','FIFTY'];
    const s = new Set();
    if (n <= 0 || n > 59) return s;
    if (n < 20) s.add(OT[n-1]);
    else { s.add(TN[Math.floor(n/10)-2]); if (n%10) s.add(OT[n%10-1]); }
    return s;
  }

  function init() { t = 0; }

  function drawRing(words, cx, cy, r, active, rgb, rot) {
    const [cr,cg,cb] = rgb;
    const n = words.length;
    const arcPerWord = (2 * Math.PI * r) / n;

    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.07)`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();

    words.forEach((word, i) => {
      const ang = -Math.PI/2 + (i/n)*Math.PI*2 + rot;
      const wx  = cx + Math.cos(ang)*r;
      const wy  = cy + Math.sin(ang)*r;
      const isActive = active instanceof Set ? active.has(word) : active === word;
      const fs = Math.max(Math.min(arcPerWord*0.55/(word.length*0.6), r*0.17, 20), 8);

      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(ang + Math.PI/2);
      ctx.font = `700 ${fs}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (isActive) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = `rgb(${cr},${cg},${cb})`; ctx.shadowBlur = 22;
        ctx.fillText(word, 0, 0);
        ctx.shadowBlur = 40;
        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.35)`;
        ctx.fillText(word, 0, 0);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.065)';
        ctx.fillText(word, 0, 0);
      }
      ctx.restore();
    });
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    t += 0.0008 * (cfg.speed / 5);
    fillBg('ring');

    const cx = W/2, cy = H/2;
    const rMin = Math.min(W, H);
    const r1 = rMin*0.19, r2 = rMin*0.34, r3 = rMin*0.47;

    const now   = new Date();
    const c1rgb = hexToRgb(C1);
    const c2rgb = hexToRgb(C2);
    const c3rgb = lerpColor(C1, C2, 0.5);

    drawRing(H_WORDS,  cx, cy, r1, H_WORDS[now.getHours()%12], c1rgb, t*0.5);
    drawRing(MS_WORDS, cx, cy, r2, wordSet(now.getMinutes()),   c2rgb, -t*0.3);
    drawRing(MS_WORDS, cx, cy, r3, wordSet(now.getSeconds()),   c3rgb,  t*0.18);

    // Center digital time
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `300 ${Math.min(r1*0.42, 22)}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`, cx, cy);

    // Ring labels (H / M / S) to the left of each ring
    ctx.font = '500 9px Inter, sans-serif';
    [[r1,'H',c1rgb],[r2,'M',c2rgb],[r3,'S',c3rgb]].forEach(([r,lbl,rgb]) => {
      const [lr,lg,lb] = rgb;
      ctx.fillStyle = `rgba(${lr},${lg},${lb},0.28)`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lbl, cx - r - 10, cy);
    });
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: FLOAT WORD CLOCK (words drift + spring when active)
// ═══════════════════════════════════════════════════════════════
const sceneFlow = (() => {
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

  function wordSet(n) {
    const OT = ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE',
                'TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN',
                'SEVENTEEN','EIGHTEEN','NINETEEN'];
    const TN = ['TWENTY','THIRTY','FORTY','FIFTY'];
    const s = new Set();
    if (n <= 0 || n > 59) return s;
    if (n < 20) s.add(OT[n-1]);
    else { s.add(TN[Math.floor(n/10)-2]); if (n%10) s.add(OT[n%10-1]); }
    return s;
  }

  function init() {
    words = []; t = 0;
    const sH = H / 3;
    SEC_WORDS.forEach((wlist, si) => {
      const COLS = Math.min(wlist.length, 6);
      const ROWS = Math.ceil(wlist.length / COLS);
      wlist.forEach((word, i) => {
        const col = i % COLS, row = Math.floor(i / COLS);
        const bx = (col + 0.5) * (W / COLS);
        const by = si * sH + (row + 0.5) * (sH / ROWS);
        words.push({
          word, si, bx, by,
          x: bx + rand(-25,25), y: by + rand(-12,12),
          phase: Math.random()*Math.PI*2, freq: rand(0.22,0.52),
          scale: 1,
        });
      });
    });
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    t += 0.01 * (cfg.speed / 5);
    fillBg('flow');

    const now    = new Date();
    const h12    = now.getHours() % 12 || 12;
    const activeH = new Set([H_LABELS[h12-1]]);
    const activeM = wordSet(now.getMinutes());
    const activeS = wordSet(now.getSeconds());
    const active  = [activeH, activeM, activeS];

    const c1rgb = hexToRgb(C1), c2rgb = hexToRgb(C2), c3rgb = lerpColor(C1,C2,0.5);
    const secRgb = [c1rgb, c2rgb, c3rgb];
    const sH = H / 3;

    // Dashed section dividers
    const [c1r,c1g,c1b] = c1rgb;
    ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},0.1)`;
    ctx.lineWidth = 1; ctx.setLineDash([3,8]);
    ctx.beginPath();
    ctx.moveTo(0, H/3);   ctx.lineTo(W, H/3);
    ctx.moveTo(0, 2*H/3); ctx.lineTo(W, 2*H/3);
    ctx.stroke(); ctx.setLineDash([]);

    words.forEach(wo => {
      const isActive = active[wo.si].has(wo.word);
      const fx = Math.sin(t*wo.freq + wo.phase)*14;
      const fy = Math.cos(t*wo.freq*0.7 + wo.phase+1)*9;
      wo.x += (wo.bx+fx - wo.x)*0.04;
      wo.y += (wo.by+fy - wo.y)*0.04;
      wo.scale += ((isActive ? 1.55 : 1) - wo.scale)*0.07;

      const ROWS  = Math.ceil(SEC_WORDS[wo.si].length / Math.min(SEC_WORDS[wo.si].length, 6));
      const baseFs = Math.min(sH/ROWS*0.34, 28);
      const fs    = baseFs * wo.scale;
      const [cr,cg,cb] = secRgb[wo.si];

      ctx.font = `700 ${fs}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (isActive) {
        ctx.shadowColor = `rgb(${cr},${cg},${cb})`; ctx.shadowBlur = 18;
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.065)'; ctx.shadowBlur = 0;
      }
      ctx.fillText(wo.word, wo.x, wo.y);
      ctx.shadowBlur = 0;
    });

    // Section labels
    ['HOURS','MINUTES','SECONDS'].forEach((lbl, i) => {
      const [lr,lg,lb] = secRgb[i];
      ctx.fillStyle = `rgba(${lr},${lg},${lb},0.22)`;
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(lbl, 10, i*H/3 + 5);
    });
  }

  return { init, tick };
})();

// ── Scene Registry ────────────────────────────────────────────
const scenes = {
  waves:  sceneWaves,
  clock:  sceneClock,
  matrix: sceneMatrix,
  aurora: sceneAurora,
  orbs:   sceneOrbs,
  dvd:    sceneDvd,
  neon:   sceneNeon,
  fire:   sceneFire,
  warp:   sceneWarp,
  glitch: sceneGlitch,
  hex:    sceneHex,
  ring:   sceneRing,
  flow:   sceneFlow,
};

// ── Settings Wiring ───────────────────────────────────────────
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
document.querySelectorAll('.palette-btn').forEach(btn => {
  btn.addEventListener('click', () => applyPalette(btn.dataset.palette));
});

// ── Fullscreen ────────────────────────────────────────────────
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

// ── Settings Drawer ───────────────────────────────────────────
const drawer = document.getElementById('settings-drawer');
document.getElementById('settings-toggle').addEventListener('click', () => drawer.classList.toggle('closed'));
document.getElementById('settings-close').addEventListener('click', () => drawer.classList.add('closed'));

// ── Mode Bar ──────────────────────────────────────────────────
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => switchScene(btn.dataset.scene));
});

// ── Keyboard Shortcuts ────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  const map = { a:'waves', s:'clock', d:'matrix', f:'aurora', g:'orbs', h:'dvd', j:'neon', k:'fire', l:'warp', ';':'glitch', "'": 'hex' };
  const scene = map[e.key.toLowerCase()];
  if (scene) switchScene(scene);
});

// ── Hash Routing ──────────────────────────────────────────────
window.addEventListener('hashchange', () => {
  const name = location.hash.slice(1);
  if (name && scenes[name] && name !== cfg.scene) switchScene(name);
});

// ── Boot ──────────────────────────────────────────────────────
applyPalette('neon');
const _initScene = scenes[location.hash.slice(1)] ? location.hash.slice(1) : 'orbs';
switchScene(_initScene);
acquireWakeLock();
