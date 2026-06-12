/* ─────────────────────────────────────────────────────────────
   NoSleep — app.js
   Scenes: waves (Wave Clock) · clock (Flip Clock) · matrix (Matrix Clock)
           aurora (Aurora Clock) · orbs (Orbital Clock) · dvd (Word Clock) · eye (Vortex Clock)
   ───────────────────────────────────────────────────────────── */

'use strict';

// ── Globals ───────────────────────────────────────────────────
const canvas   = document.getElementById('bg-canvas');
const ctx      = canvas.getContext('2d');
let W = 0, H = 0;

const cfg = {
  scene:     'waves',
  speed:     5,
  intensity: 5,
  palette:   'neon',
  clockOverlay: false,
  dim:       0,
  settings: {
    waves:  { bg: '#030308', needle: 70 },
    clock:  { bg: '#040409', needle: 70 },
    matrix: { bg: '#030308', needle: 70 },
    aurora: { bg: '#030307', needle: 70 },
    orbs:   { bg: '#030308', needle: 70 },
    dvd:    { bg: '#030307', needle: 70 },
    eye:    { bg: '#030307', needle: 70 }
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

// Current palette colors (hex)
let C1 = '#7b2ff7', C2 = '#00f0ff';

// Active animation frame ID
let rafId = null;

// ── Resize ────────────────────────────────────────────────────
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
  if (!('wakeLock' in navigator)) {
    setWakeLockUI(false, 'Not supported');
    return;
  }
  if (wakeLock !== null && !wakeLock.released) {
    return;
  }
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    setWakeLockUI(true);
    wakeLock.addEventListener('release', () => {
      setWakeLockUI(false);
      if (document.visibilityState === 'visible') {
        acquireWakeLock();
      }
    });
  } catch (err) {
    console.warn(`Wake Lock request failed: ${err.name}, ${err.message}`);
    setWakeLockUI(false, `Inactive: ${err.message}`);
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) acquireWakeLock();
});
// Re-request wake lock on user interactions (since browsers block initial auto-requests)
['click', 'touchstart', 'keydown'].forEach(type => {
  document.addEventListener(type, () => {
    if (document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) {
      acquireWakeLock();
    }
  }, { passive: true });
});
// Periodic active verification
setInterval(() => {
  if (document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) {
    acquireWakeLock();
  }
}, 15000);
function setWakeLockUI(ok, msg) {
  const dot  = document.querySelector('#lock-indicator .dot');
  const ind  = document.getElementById('lock-indicator');
  const txt  = document.getElementById('wl-status-text');
  const icon = document.getElementById('wl-icon');
  if (ok) {
    if (ind) ind.classList.remove('failed');
    if (txt) txt.textContent = 'Screen will stay on';
    if (icon) icon.textContent = '☀️';
  } else {
    if (ind) ind.classList.add('failed');
    if (txt) txt.textContent = msg || 'Not active';
    if (icon) icon.textContent = '🌙';
  }
}
acquireWakeLock();

// ── Live Clock (HUD + Overlay) ────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }
function updateClock() {
  const now = new Date();
  const str = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const liveTimeEl = document.getElementById('live-time');
  if (liveTimeEl) liveTimeEl.textContent = str;
  const ov = document.getElementById('clock-overlay-time');
  if (ov) ov.textContent = str;
}
setInterval(updateClock, 1000);
updateClock();

// ── Palette Apply ─────────────────────────────────────────────
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
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return [r, g, b];
}
function lerpColor(hex1, hex2, t) {
  const [r1,g1,b1] = hexToRgb(hex1);
  const [r2,g2,b2] = hexToRgb(hex2);
  const r = Math.round(r1+(r2-r1)*t);
  const g = Math.round(g1+(g2-g1)*t);
  const b = Math.round(b1+(b2-b1)*t);
  return [r, g, b];
}
function rand(a, b)  { return a + Math.random() * (b - a); }

// ── Scene Manager ─────────────────────────────────────────────
function switchScene(name) {
  const prevScene = cfg.scene;
  if (scenes[prevScene]?.destroy) {
    scenes[prevScene].destroy();
  }
  if (rafId) cancelAnimationFrame(rafId);
  document.querySelectorAll('.scene').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(`scene-${name}`);
  if (el) el.classList.remove('hidden');
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.scene === name);
  });
  cfg.scene = name;

  // Sync settings inputs for active scene
  const sCfg = cfg.settings[name];
  if (sCfg) {
    const elNeedle = document.getElementById('cfg-needle');
    const elBg = document.getElementById('cfg-bg-color');
    const elBgVal = document.getElementById('cfg-bg-color-val');
    if (elNeedle) elNeedle.value = sCfg.needle;
    if (elBg) elBg.value = sCfg.bg;
    if (elBgVal) elBgVal.textContent = sCfg.bg;
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

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    t += 0.005 * (cfg.speed / 5);

    // Deep background canvas fill
    ctx.fillStyle = cfg.settings.waves.bg;
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const scale = cfg.settings.waves.needle / 70;
    const rMax = Math.min(W, H) * 0.35 * scale;

    // 1. Slow, organic background waves
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

    // 2. Clock Face Ticks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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
      ctx.strokeStyle = i % 3 === 0 ? `rgba(${hexToRgb(C2).join(',')}, 0.35)` : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = i % 3 === 0 ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // 3. Wavy analog clock hands
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ms = now.getMilliseconds();

    const secAngle = ((s + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2;
    const minAngle = ((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2;
    const hourAngle = (((h % 12) + m / 60) / 12) * Math.PI * 2 - Math.PI / 2;

    function drawWavyHand(angle, length, width, color, freq, amp, phase) {
      ctx.beginPath();
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const d = frac * length;
        const bx = cx + Math.cos(angle) * d;
        const by = cy + Math.sin(angle) * d;
        // Wavy transverse displacement
        const waveOffset = Math.sin(d * freq - phase) * amp * (1 - frac * 0.3);
        const wx = bx - Math.sin(angle) * waveOffset;
        const wy = by + Math.cos(angle) * waveOffset;
        if (i === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Soft tip glow
      const hx = cx + Math.cos(angle) * length;
      const hy = cy + Math.sin(angle) * length;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(hx, hy, width * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const handAmp = (cfg.intensity / 10) * 14;
    drawWavyHand(hourAngle, rMax * 0.55, 6, C1, 0.04, handAmp * 0.7, t * 1.8);
    drawWavyHand(minAngle, rMax * 0.78, 4, C2, 0.03, handAmp, t * 2.2);
    drawWavyHand(secAngle, rMax * 0.9, 1.5, '#ffffff', 0.02, handAmp * 1.3, t * 3.5);

    // Center pivot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Central digital overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
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
  let prevH = null, prevM = null;
  let bgT = 0;
  let clockInterval = null;

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
    const textEl = el.querySelector('.flip-text') || el;
    textEl.textContent = val;
  }

  function flipPanel(topEl, botEl, foldEl, unfoldEl, oldVal, newVal) {
    if (!topEl || !botEl || !foldEl || !unfoldEl) return;

    setPanelText(topEl, newVal);
    setPanelText(botEl, oldVal);
    setPanelText(foldEl, oldVal);
    setPanelText(unfoldEl, newVal);

    foldEl.classList.remove('flipping');
    unfoldEl.classList.remove('flipping');
    void foldEl.offsetWidth; // force reflow
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

    if (h !== prevH) {
      flipPanel(elHTop, elHBot, elHFold, elHUnfold, prevH, h);
      prevH = h;
    }
    if (m !== prevM) {
      flipPanel(elMTop, elMBot, elMFold, elMUnfold, prevM, m);
      prevM = m;
    }
  }

  function init() {
    if (clockInterval) clearInterval(clockInterval);
    const { h, m, ampm } = readTime();
    setPanelText(elHTop, h);
    setPanelText(elHBot, h);
    setPanelText(elMTop, m);
    setPanelText(elMBot, m);
    if (elAmpm) elAmpm.textContent = ampm;
    prevH = h;
    prevM = m;
    clockInterval = setInterval(updateTime, 1000);

    const scale = cfg.settings.clock.needle / 70;
    document.documentElement.style.setProperty('--fc-scale', scale);
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    bgT += 0.005 * (cfg.speed / 5);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = cfg.settings.clock.bg;
    ctx.fillRect(0, 0, W, H);

    // Glowing backlights
    [
      { x: W*0.35 + Math.sin(bgT)*W*0.06, y: H*0.5 + Math.cos(bgT*0.7)*H*0.06, r: W*0.35, c: C1 },
      { x: W*0.65 + Math.cos(bgT*0.8)*W*0.06, y: H*0.5 + Math.sin(bgT*0.9)*H*0.06, r: W*0.35, c: C2 },
    ].forEach(g => {
      const [r,g_val,b] = hexToRgb(g.c);
      const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
      grad.addColorStop(0, `rgba(${r},${g_val},${b},0.08)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    });
  }

  function destroy() {
    if (clockInterval) {
      clearInterval(clockInterval);
      clockInterval = null;
    }
  }

  return { init, tick, destroy };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: RADAR CLOCK (Matrix replacement)
// ═══════════════════════════════════════════════════════════════
const sceneMatrix = (() => {
  let targets = [];
  let lastTimeStr = '';
  let offscreen = null;
  let oCtx = null;

  function init() {
    targets = [];
    lastTimeStr = '';
    if (!offscreen) {
      offscreen = document.createElement('canvas');
      oCtx = offscreen.getContext('2d');
    }
    // Set offscreen dimensions
    offscreen.width = 540;
    offscreen.height = 120;
    ctx.clearRect(0, 0, W, H);
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);

    // Dark radar screen background
    ctx.fillStyle = cfg.settings.matrix.bg;
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const scaleFactor = cfg.settings.matrix.needle / 70;
    const rMax = Math.min(W, H) * 0.44 * scaleFactor;

    const now = new Date();
    const hrs = now.getHours();
    const mins = now.getMinutes();
    const secs = now.getSeconds();
    const ms = now.getMilliseconds();
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const dispHrs = hrs % 12 || 12;
    const timeStr = `${pad(dispHrs)}:${pad(mins)}:${pad(secs)} ${ampm}`;

    // 1. Generate target points if time changed
    if (timeStr !== lastTimeStr) {
      lastTimeStr = timeStr;
      oCtx.clearRect(0, 0, offscreen.width, offscreen.height);
      oCtx.fillStyle = '#fff';
      oCtx.font = 'bold 74px JetBrains Mono, monospace';
      oCtx.textAlign = 'center';
      oCtx.textBaseline = 'middle';
      oCtx.fillText(timeStr, offscreen.width / 2, offscreen.height / 2);

      const imgData = oCtx.getImageData(0, 0, offscreen.width, offscreen.height);
      targets = [];
      const step = 3; // high resolution grid
      for (let y = 0; y < offscreen.height; y += step) {
        for (let x = 0; x < offscreen.width; x += step) {
          const idx = (y * offscreen.width + x) * 4;
          if (imgData.data[idx + 3] > 70) {
            targets.push({ x, y });
          }
        }
      }
    }

    // 2. Draw tactical radar UI grid
    ctx.strokeStyle = `rgba(${hexToRgb(C1).join(',')}, 0.05)`;
    ctx.lineWidth = 1;
    
    // Draw concentric circles
    [rMax * 0.25, rMax * 0.5, rMax * 0.75, rMax].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw crosshair axes
    ctx.beginPath();
    ctx.moveTo(cx - rMax, cy); ctx.lineTo(cx + rMax, cy);
    ctx.moveTo(cx, cy - rMax); ctx.lineTo(cx, cy + rMax);
    ctx.stroke();

    // Draw angle markers & radial lines
    ctx.strokeStyle = `rgba(${hexToRgb(C1).join(',')}, 0.02)`;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * rMax, cy + Math.sin(a) * rMax);
      ctx.stroke();
    }

    // 3. Sweep line and tail
    const sweepAngle = ((secs + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2;
    const tailSteps = 30;
    const tailWidth = 0.5; // radians
    for (let i = 0; i < tailSteps; i++) {
      const angle = sweepAngle - (i / tailSteps) * tailWidth;
      const opacity = 0.16 * (1 - i / tailSteps);
      ctx.strokeStyle = `rgba(${hexToRgb(C2).join(',')}, ${opacity})`;
      ctx.lineWidth = i === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * rMax, cy + Math.sin(angle) * rMax);
      ctx.stroke();
    }

    // 4. Map and render time targets
    const scale = Math.min(W * 0.82 / offscreen.width, H * 0.38 / offscreen.height, 2.2);
    const startX = cx - (offscreen.width * scale) / 2;
    const startY = cy - (offscreen.height * scale) / 2;

    const rgbC1 = hexToRgb(C1).join(',');
    const rgbC2 = hexToRgb(C2).join(',');

    targets.forEach(pt => {
      const sx = startX + pt.x * scale;
      const sy = startY + pt.y * scale;

      const dx = sx - cx;
      const dy = sy - cy;
      const ang = Math.atan2(dy, dx);

      let diff = sweepAngle - ang;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      // Draw point
      if (diff >= 0 && diff < tailWidth) {
        // Active Sweep trail: bright flare fading out
        const factor = 1 - diff / tailWidth;
        if (factor > 0.85) {
          ctx.fillStyle = '#ffffff'; // White hot tip
        } else {
          ctx.fillStyle = `rgba(${rgbC2}, ${0.15 + factor * 0.85})`;
        }
        ctx.fillRect(sx - 1, sy - 1, 2.5, 2.5);
      } else {
        // Ambient background: dim glow
        ctx.fillStyle = `rgba(${rgbC1}, 0.08)`;
        ctx.fillRect(sx - 1, sy - 1, 1.5, 1.5);
      }
    });

    // Technical HUD indicators
    ctx.fillStyle = `rgba(${rgbC2}, 0.3)`;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SYS_RADAR_ACTIVE', cx - rMax + 10, cy - rMax + 20);
    ctx.fillText(`SWEEP_RAD: ${rMax.toFixed(0)}px`, cx - rMax + 10, cy - rMax + 34);
    ctx.fillText(`BEARING: ${(sweepAngle * 180 / Math.PI + 90).toFixed(1)}°`, cx - rMax + 10, cy - rMax + 48);

    ctx.textAlign = 'right';
    ctx.fillText(`FPS: 60.0`, cx + rMax - 10, cy - rMax + 20);
    ctx.fillText(`GRID_RES: 3x3`, cx + rMax - 10, cy - rMax + 34);
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: AURORA CLOCK
// ═══════════════════════════════════════════════════════════════
const sceneAurora = (() => {
  let t = 0;
  let stars = [];

  function init() {
    stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.1 + 0.2,
      a: Math.random(),
      speed: rand(0.005, 0.015)
    }));
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    t += 0.004 * (cfg.speed / 5);

    // Deep space
    ctx.fillStyle = cfg.settings.aurora.bg;
    ctx.fillRect(0, 0, W, H);

    // Starfield twinkle
    stars.forEach(s => {
      s.a += s.speed;
      if (s.a > 1 || s.a < 0) s.speed = -s.speed;
      const alpha = Math.max(0.08, Math.min(0.8, s.a));
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    const cx = W / 2, cy = H / 2;
    const now = new Date();
    const hrs = now.getHours();
    const mins = now.getMinutes();
    const secs = now.getSeconds();
    const ms = now.getMilliseconds();

    const hFrac = ((hrs % 12) + mins / 60) / 12;
    const mFrac = (mins + secs / 60) / 60;
    const sFrac = (secs + ms / 1000) / 60;

    // Radial ring paths
    const scaleFactor = cfg.settings.aurora.needle / 70;
    const r1 = Math.min(W, H) * 0.18 * scaleFactor; // Seconds
    const r2 = Math.min(W, H) * 0.28 * scaleFactor; // Minutes
    const r3 = Math.min(W, H) * 0.38 * scaleFactor; // Hours

    function drawAuroraRing(radius, frac, color, width, speedMult, ampMult) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;

      ctx.beginPath();
      const steps = 150;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + frac * Math.PI * 2;

      for (let i = 0; i <= steps; i++) {
        const angle = startAngle + (i / steps) * (endAngle - startAngle);
        const waveFreq = 7 + (cfg.intensity / 2);
        const waveAmp = (cfg.intensity / 10) * 11 * ampMult;
        const radialOffset = Math.sin(angle * waveFreq + t * speedMult) * waveAmp;
        const r = radius + radialOffset;

        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Outer sheath secondary glow
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const angle = startAngle + (i / steps) * (endAngle - startAngle);
        const waveFreq = 7 + (cfg.intensity / 2);
        const waveAmp = (cfg.intensity / 10) * 11 * ampMult;
        const radialOffset = Math.sin(angle * waveFreq + t * speedMult + 1.2) * (waveAmp * 1.5);
        const r = radius + radialOffset;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${hexToRgb(color).join(',')}, 0.25)`;
      ctx.lineWidth = width * 2.8;
      ctx.stroke();

      ctx.restore();
    }

    // Draw polar rings
    drawAuroraRing(r3, hFrac, C1, 6, 2, 0.9);
    drawAuroraRing(r2, mFrac, C2, 4, 2.8, 1.2);
    drawAuroraRing(r1, sFrac, '#ffffff', 1.8, 3.8, 1.4);

    // Center digital readout
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${pad(hrs % 12 || 12)}:${pad(mins)}`, cx, cy - 6);

    ctx.font = '13px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText(`${pad(secs)}s`, cx, cy + 24);
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: ORBITAL CLOCK
// ═══════════════════════════════════════════════════════════════
const sceneOrbs = (() => {
  let stars = [];
  let trailS = [], trailM = [], trailH = [];

  function init() {
    stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 0.8 + 0.2
    }));
    trailS = []; trailM = []; trailH = [];
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    const speed = cfg.speed / 5;

    ctx.fillStyle = cfg.settings.orbs.bg;
    ctx.fillRect(0, 0, W, H);

    // Stars background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    stars.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    const cx = W / 2, cy = H / 2;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ms = now.getMilliseconds();

    // Orb Paths
    const scaleFactor = cfg.settings.orbs.needle / 70;
    const r1 = Math.min(W, H) * 0.16 * scaleFactor; // Seconds
    const r2 = Math.min(W, H) * 0.27 * scaleFactor; // Minutes
    const r3 = Math.min(W, H) * 0.38 * scaleFactor; // Hours

    const aS = ((s + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2;
    const aM = ((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2;
    const aH = (((h % 12) + m / 60) / 12) * Math.PI * 2 - Math.PI / 2;

    const pS = { x: cx + Math.cos(aS) * r1, y: cy + Math.sin(aS) * r1 };
    const pM = { x: cx + Math.cos(aM) * r2, y: cy + Math.sin(aM) * r2 };
    const pH = { x: cx + Math.cos(aH) * r3, y: cy + Math.sin(aH) * r3 };

    // Record orbital trails
    trailS.push({ x: pS.x, y: pS.y, a: 1.0 });
    trailM.push({ x: pM.x, y: pM.y, a: 1.0 });
    trailH.push({ x: pH.x, y: pH.y, a: 1.0 });

    if (trailS.length > 50) trailS.shift();
    if (trailM.length > 40) trailM.shift();
    if (trailH.length > 30) trailH.shift();

    // Gravity blueprints coordinate grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
    ctx.lineWidth = 1;
    const gridSpacing = 44;
    
    // Y Gridlines
    for (let x = 0; x < W; x += gridSpacing) {
      ctx.beginPath();
      for (let y = 0; y < H; y += 12) {
        let wx = x;
        let wy = y;
        
        [pS, pM, pH].forEach((p, idx) => {
          const dx = x - p.x;
          const dy = y - p.y;
          const d = Math.sqrt(dx*dx + dy*dy);
          const pullRadius = idx === 0 ? 80 : idx === 1 ? 115 : 150;
          if (d < pullRadius) {
            const force = (1 - d / pullRadius) * 16 * (cfg.intensity / 5);
            wx -= (dx / d) * force;
            wy -= (dy / d) * force;
          }
        });
        
        if (y === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();
    }
    
    // X Gridlines
    for (let y = 0; y < H; y += gridSpacing) {
      ctx.beginPath();
      for (let x = 0; x < W; x += 12) {
        let wx = x;
        let wy = y;
        
        [pS, pM, pH].forEach((p, idx) => {
          const dx = x - p.x;
          const dy = y - p.y;
          const d = Math.sqrt(dx*dx + dy*dy);
          const pullRadius = idx === 0 ? 80 : idx === 1 ? 115 : 150;
          if (d < pullRadius) {
            const force = (1 - d / pullRadius) * 16 * (cfg.intensity / 5);
            wx -= (dx / d) * force;
            wy -= (dy / d) * force;
          }
        });
        
        if (x === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();
    }

    // Concentric orbits
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    [r1, r2, r3].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw stardust trails
    function drawTrail(trail, color, size) {
      for (let i = 0; i < trail.length; i++) {
        const pt = trail[i];
        pt.a -= 0.02 * speed;
        if (pt.a <= 0) continue;
        
        const size_val = size * pt.a;
        ctx.fillStyle = `rgba(${hexToRgb(color).join(',')}, ${pt.a * 0.35})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size_val, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawTrail(trailS, '#ffffff', 4);
    drawTrail(trailM, C2, 6);
    drawTrail(trailH, C1, 8);

    // Gravitational Spheres (Planets)
    // Hour Planet (C1)
    ctx.shadowColor = C1;
    ctx.shadowBlur = 15;
    ctx.fillStyle = C1;
    ctx.beginPath();
    ctx.arc(pH.x, pH.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Minute Planet (C2)
    ctx.shadowColor = C2;
    ctx.shadowBlur = 12;
    ctx.fillStyle = C2;
    ctx.beginPath();
    ctx.arc(pM.x, pM.y, 7, 0, Math.PI * 2);
    ctx.fill();

    // Second Planet (White)
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pS.x, pS.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Center Sun / Central Dial - replaced with a "small light"
    ctx.save();
    
    // Draw a small soft radial glow in the center
    const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
    sunGrad.addColorStop(0, `rgba(${hexToRgb(C2).join(',')}, 0.45)`);
    sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fill();

    // Draw a tiny glowing dot at the center
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = C2;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.restore();

    // 4. Draw central digital text (inside the dark inner space of the sun)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${pad(h)}:${pad(m)}`, cx, cy);
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: WORD CLOCK (Wordle-style letter grid)
// ═══════════════════════════════════════════════════════════════
const sceneDvd = (() => {
  const ONES = ['','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN',
                'EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN',
                'FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'];
  const TENS = ['','','TWENTY','THIRTY','FORTY','FIFTY'];

  const GRID = [
    'ITISOCLOCKXXX',
    'ONETWOTHREEXX',
    'FOURFIVESIXXX',
    'SEVENEIGHTXXX',
    'NINETENXXXXXX',
    'ELEVENXXXXXXX',
    'TWELVEXXXXXXX',
    'FIFTEENXXXXXX',
    'TWENTYXXXXXXX',
    'THIRTYFORTYXX',
    'FIFTYXXXXXXXX',
    'THIRTEENXXXXX',
    'FOURTEENXXXXX',
    'SIXTEENXXXXXX',
    'SEVENTEENXXXX',
    'EIGHTEENXXXXX',
    'NINETEENXXXXX',
    'AMPMSXXXXXXXX',
    'ANDSECONDSXXX',
  ];

  const NUMBER_WORDS = [
    'NINETEEN','EIGHTEEN','SEVENTEEN','SIXTEEN','FOURTEEN','THIRTEEN',
    'FIFTEEN','TWELVE','ELEVEN','THREE','SEVEN','EIGHT','FORTY','FIFTY',
    'TWENTY','THIRTY','FOUR','FIVE','NINE','ONE','TWO','SIX','TEN',
  ];

  let wordMap = {};

  function buildWordMap() {
    wordMap = {};
    for (let r = 0; r < GRID.length; r++) {
      const row = GRID[r];
      const used = new Array(row.length).fill(false);
      for (const word of NUMBER_WORDS) {
        let start = 0;
        while (start <= row.length - word.length) {
          const slice = row.slice(start, start + word.length);
          const free = !used.slice(start, start + word.length).some(Boolean);
          if (slice === word && free) {
            if (!wordMap[word]) wordMap[word] = [];
            wordMap[word].push(...word.split('').map((_, i) => [r, start + i]));
            for (let i = start; i < start + word.length; i++) used[i] = true;
            start += word.length;
          } else {
            start++;
          }
        }
      }
    }
  }

  function hourWord(h12) {
    if (h12 === 10) return 'TEN';
    if (h12 === 11) return 'ELEVEN';
    if (h12 === 12) return 'TWELVE';
    return ONES[h12];
  }

  function numberParts(n) {
    n = Math.max(0, Math.min(59, n));
    if (n === 0) return [];
    if (n < 20) return [ONES[n]];
    const t = TENS[Math.floor(n / 10)];
    const o = ONES[n % 10];
    return o ? [t, o] : [t];
  }

  function getActiveCells() {
    const now = new Date();
    const h12 = now.getHours() % 12 || 12;
    const active = new Set();

    const addWord = (word) => {
      (wordMap[word] || []).forEach(([r, c]) => active.add(`${r},${c}`));
    };

    addWord(hourWord(h12));
    numberParts(now.getMinutes()).forEach(addWord);
    numberParts(now.getSeconds()).forEach(addWord);

    return active;
  }

  function init() {
    buildWordMap();
  }

  function drawTile(x, y, size, char, isActive) {
    const radius = size * 0.14;

    ctx.fillStyle = isActive
      ? `rgba(${hexToRgb(C2).join(',')}, 0.28)`
      : 'rgba(255, 255, 255, 0.045)';
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, radius);
    ctx.fill();

    ctx.strokeStyle = isActive
      ? `rgba(${hexToRgb(C2).join(',')}, 0.65)`
      : 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = isActive ? 1.5 : 1;
    ctx.stroke();

    ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.1)';
    if (isActive) {
      ctx.shadowColor = C2;
      ctx.shadowBlur = 16;
    }
    ctx.font = `700 ${size * 0.52}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, x + size / 2, y + size / 2 + size * 0.02);
    ctx.shadowBlur = 0;
  }

  function tick() {
    rafId = requestAnimationFrame(tick);

    ctx.fillStyle = cfg.settings.dvd.bg;
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const scale = cfg.settings.dvd.needle / 70;
    const activeSet = getActiveCells();

    const glowRad = Math.min(W, H) * 0.42;
    const glowG = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRad);
    glowG.addColorStop(0, `rgba(${hexToRgb(C1).join(',')}, 0.06)`);
    glowG.addColorStop(0.6, `rgba(${hexToRgb(C2).join(',')}, 0.02)`);
    glowG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowG;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRad, 0, Math.PI * 2);
    ctx.fill();

    const cols = GRID[0].length;
    const rows = GRID.length;
    const gap = 5 * scale;
    const cellSize = Math.min(
      (W * 0.88 - gap * (cols - 1)) / cols,
      (H * 0.82 - gap * (rows - 1)) / rows,
      52 * scale
    );
    const gridW = cols * cellSize + gap * (cols - 1);
    const gridH = rows * cellSize + gap * (rows - 1);
    const startX = cx - gridW / 2;
    const startY = cy - gridH / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const char = GRID[r][c];
        if (char === 'X') continue;

        const x = startX + c * (cellSize + gap);
        const y = startY + r * (cellSize + gap);
        const isActive = activeSet.has(`${r},${c}`);
        drawTile(x, y, cellSize, char, isActive);
      }
    }
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: VORTEX CLOCK (Cosmic Particle Swarm)
// ═══════════════════════════════════════════════════════════════
const sceneEye = (() => {
  let particles = [];
  let targets = [];
  let offscreen = null;
  let oCtx = null;
  let lastTimeStr = '';
  let scale = 1.0;
  let modeTime = 0;
  let currentMode = 0; // 0 = Vortex, 1 = Time

  function init() {
    particles = [];
    targets = [];
    modeTime = 0;
    currentMode = 0;

    if (!offscreen) {
      offscreen = document.createElement('canvas');
      oCtx = offscreen.getContext('2d');
    }
    offscreen.width = 320;
    offscreen.height = 80;
    lastTimeStr = '';

    // Initialize particles
    const count = 900;
    const cx = W / 2, cy = H / 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = rand(40, Math.max(W, H) * 0.6);
      particles.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        orbitR: rand(50, Math.min(W, H) * 0.45),
        orbitPhase: Math.random() * Math.PI * 2,
        orbitSpeed: rand(0.008, 0.022),
        color: lerpColor(C1, C2, Math.random()),
        size: rand(1.1, 2.5)
      });
    }
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    
    const speed = cfg.speed / 5;
    modeTime += 16.6 * speed; // simulate smooth ms progress
    
    if (modeTime > 8000) {
      modeTime = 0;
      currentMode = (currentMode + 1) % 2;
    }

    const bgRgb = hexToRgb(cfg.settings.eye.bg);
    ctx.fillStyle = `rgba(${bgRgb[0]}, ${bgRgb[1]}, ${bgRgb[2]}, 0.22)`;
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;

    const now = new Date();
    const hrs = now.getHours();
    const mins = now.getMinutes();
    const secs = now.getSeconds();
    const timeStr = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;

    // Redraw mask & targets on time change
    if (timeStr !== lastTimeStr) {
      lastTimeStr = timeStr;
      
      oCtx.clearRect(0, 0, offscreen.width, offscreen.height);
      oCtx.fillStyle = '#fff';
      oCtx.font = 'bold 50px JetBrains Mono, monospace';
      oCtx.textAlign = 'center';
      oCtx.textBaseline = 'middle';
      oCtx.fillText(timeStr, offscreen.width / 2, offscreen.height / 2);
      
      const imgData = oCtx.getImageData(0, 0, offscreen.width, offscreen.height);
      
      targets = [];
      const step = 3;
      const scaleFactor = cfg.settings.eye.needle / 70;
      scale = Math.min(W * 0.85 / offscreen.width, H * 0.45 / offscreen.height, 2.5) * scaleFactor;
      
      for (let y = 0; y < offscreen.height; y += step) {
        for (let x = 0; x < offscreen.width; x += step) {
          const idx = (y * offscreen.width + x) * 4;
          if (imgData.data[idx + 3] > 110) {
            const sx = cx - (offscreen.width * scale) / 2 + x * scale;
            const sy = cy - (offscreen.height * scale) / 2 + y * scale;
            targets.push({ x: sx, y: sy });
          }
        }
      }
      
      targets.sort(() => Math.random() - 0.5);
    }

    const intensity = cfg.intensity / 5;

    particles.forEach((p, i) => {
      if (currentMode === 1 && i < targets.length) {
        // STATE 1: ATTRACT TO TIME TARGETS
        const target = targets[i];
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 1.5) {
          const force = Math.min(7, dist * 0.18) * intensity;
          p.vx += (dx / dist) * force - p.vx * 0.08;
          p.vy += (dy / dist) * force - p.vy * 0.08;
        } else {
          p.vx *= 0.5;
          p.vy *= 0.5;
        }
      } else {
        // STATE 0: SWIRL IN COSMIC VORTEX
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const angle = Math.atan2(dy, dx) + p.orbitSpeed * speed;
        const scaleFactor = cfg.settings.eye.needle / 70;
        const targetR = (p.orbitR * scaleFactor) + Math.sin(ts * 0.001 + p.orbitPhase) * 15 * intensity;
        
        const tx = cx + Math.cos(angle) * targetR;
        const ty = cy + Math.sin(angle) * targetR;
        
        p.vx += (tx - p.x) * 0.035 - p.vx * 0.06;
        p.vy += (ty - p.y) * 0.035 - p.vy * 0.06;
      }

      p.vx += (Math.random() - 0.5) * 0.12 * intensity;
      p.vy += (Math.random() - 0.5) * 0.12 * intensity;

      p.x += p.vx;
      p.y += p.vy;

      const isTarget = (currentMode === 1 && i < targets.length);

      // Draw particle
      if (isTarget) {
        // Foreground Clock Digit particles: bright white/neon flare
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = C2;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      } else {
        // Background Vortex particles: dim base color (C1)
        const [r, g, b] = hexToRgb(C1);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.18)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing tip for foreground/clock particles
      if (isTarget && p.size > 2.0 && Math.random() > 0.65) {
        ctx.fillStyle = C2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Ambient overlay metadata
    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('SYS_TIME_CONST', 30, H - 40);
    ctx.fillText(`MODE: ${currentMode === 1 ? "CONST_GRID" : "VORTEX_SWIRL"}`, 30, H - 24);
  }

  function destroy() {}

  return { init, tick, destroy };
})();

// ── Scene Registry ────────────────────────────────────────────
const scenes = {
  waves:  sceneWaves,
  clock:  sceneClock,
  matrix: sceneMatrix,
  aurora: sceneAurora,
  orbs:   sceneOrbs,
  dvd:    sceneDvd,
  eye:    sceneEye,
};

// ── Settings Wiring ───────────────────────────────────────────
document.getElementById('cfg-speed').addEventListener('input', e => {
  cfg.speed = +e.target.value;
  if (cfg.scene === 'orbs') scenes.orbs.init();
});
document.getElementById('cfg-intensity').addEventListener('input', e => {
  cfg.intensity = +e.target.value;
  if (cfg.scene === 'orbs') scenes.orbs.init();
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
  if (cfg.scene === 'clock') {
    document.documentElement.style.setProperty('--fc-scale', val / 70);
  }
});
document.getElementById('cfg-bg-color').addEventListener('input', e => {
  const val = e.target.value;
  cfg.settings[cfg.scene].bg = val;
  document.getElementById('cfg-bg-color-val').textContent = val;
});
document.querySelectorAll('.palette-btn').forEach(btn => {
  btn.addEventListener('click', () => applyPalette(btn.dataset.palette));
});

// ── Fullscreen Wiring ─────────────────────────────────────────
const fsToggle = document.getElementById('fullscreen-toggle');
if (fsToggle) {
  fsToggle.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });
}

document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('fullscreen-toggle');
  if (!btn) return;
  if (document.fullscreenElement) {
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  } else {
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }
});

// ── Settings Drawer ───────────────────────────────────────────
const drawer = document.getElementById('settings-drawer');
document.getElementById('settings-toggle').addEventListener('click', () => {
  drawer.classList.toggle('closed');
});
document.getElementById('settings-close').addEventListener('click', () => {
  drawer.classList.add('closed');
});

// ── Mode Bar ──────────────────────────────────────────────────
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => switchScene(btn.dataset.scene));
});

// ── Keyboard Shortcuts ────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  
  const key = e.key.toLowerCase();
  if (key === 'a') switchScene('waves');
  else if (key === 's') switchScene('clock');
  else if (key === 'd') switchScene('matrix');
  else if (key === 'f') switchScene('aurora');
  else if (key === 'g') switchScene('orbs');
  else if (key === 'h') switchScene('dvd');
  else if (key === 'j' || key === 'k' || key === 'l') switchScene('eye');
});

// ── Boot ──────────────────────────────────────────────────────
applyPalette('neon');
switchScene('waves');
