/* ─────────────────────────────────────────────────────────────
   NoSleep — app.js
   ───────────────────────────────────────────────────────────── */
'use strict';

const canvas = document.getElementById('bg-canvas');
const ctx    = canvas.getContext('2d');
let W = 0, H = 0;

const cfg = {
  scene:        'aurora',
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
  let targets = [], lastTimeStr = '', offscreen = null, oCtx = null;

  function init() {
    targets = []; lastTimeStr = '';
    if (!offscreen) { offscreen = document.createElement('canvas'); oCtx = offscreen.getContext('2d'); }
    offscreen.width = 540; offscreen.height = 120;
    ctx.clearRect(0, 0, W, H);
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    fillBg('matrix');

    const cx = W / 2, cy = H / 2;
    const sf = cfg.settings.matrix.needle / 70;
    const rMax = Math.min(W, H) * 0.44 * sf;

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
      oCtx.textAlign = 'center';
      oCtx.textBaseline = 'middle';
      oCtx.fillText(timeStr, 270, 60);
      const d = oCtx.getImageData(0, 0, 540, 120);
      targets = [];
      for (let y = 0; y < 120; y += 3) {
        for (let x = 0; x < 540; x += 3) {
          if (d.data[(y * 540 + x) * 4 + 3] > 70) targets.push({ x, y });
        }
      }
    }

    ctx.strokeStyle = `rgba(${hexToRgb(C1).join(',')},0.05)`;
    ctx.lineWidth = 1;
    [rMax*0.25, rMax*0.5, rMax*0.75, rMax].forEach(r => {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(cx - rMax, cy); ctx.lineTo(cx + rMax, cy);
    ctx.moveTo(cx, cy - rMax); ctx.lineTo(cx, cy + rMax);
    ctx.stroke();

    const sweepAngle = ((secs + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2;
    const tailWidth = 0.5;
    for (let i = 0; i < 30; i++) {
      const angle = sweepAngle - (i / 30) * tailWidth;
      ctx.strokeStyle = `rgba(${hexToRgb(C2).join(',')},${0.16*(1-i/30)})`;
      ctx.lineWidth = i === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * rMax, cy + Math.sin(angle) * rMax);
      ctx.stroke();
    }

    const scale = Math.min(W * 0.82 / 540, H * 0.38 / 120, 2.2);
    const startX = cx - (540 * scale) / 2;
    const startY = cy - (120 * scale) / 2;
    const rgbC1 = hexToRgb(C1).join(',');
    const rgbC2 = hexToRgb(C2).join(',');

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
        ctx.fillStyle = f > 0.85 ? '#fff' : `rgba(${rgbC2},${0.15+f*0.85})`;
        ctx.fillRect(sx-1, sy-1, 2.5, 2.5);
      } else {
        ctx.fillStyle = `rgba(${rgbC1},0.08)`;
        ctx.fillRect(sx-1, sy-1, 1.5, 1.5);
      }
    });

    ctx.fillStyle = `rgba(${rgbC2},0.3)`;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SYS_RADAR_ACTIVE', cx - rMax + 10, cy - rMax + 20);
    ctx.fillText(`BEARING: ${(sweepAngle*180/Math.PI+90).toFixed(1)}°`, cx - rMax + 10, cy - rMax + 34);
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
//  SCENE: NEON (Synthwave 7-Segment)
// ═══════════════════════════════════════════════════════════════
const sceneNeon = (() => {
  // Segments: [top, top-right, bot-right, bot, bot-left, top-left, mid]
  const SEGS = {
    '0':[1,1,1,1,1,1,0], '1':[0,1,1,0,0,0,0], '2':[1,1,0,1,1,0,1],
    '3':[1,1,1,1,0,0,1], '4':[0,1,1,0,0,1,1], '5':[1,0,1,1,0,1,1],
    '6':[1,0,1,1,1,1,1], '7':[1,1,1,0,0,0,0], '8':[1,1,1,1,1,1,1],
    '9':[1,1,1,1,0,1,1],
  };

  let gridOffset = 0;

  function init() { gridOffset = 0; }

  function drawDigit(char, cx, cy, dw, dh) {
    const segs = SEGS[char] || [0,0,0,0,0,0,0];
    const th = dw * 0.11;
    const pad = th * 0.8;
    const hw = dw / 2, hh = dh / 2;

    const segPaths = [
      () => { ctx.rect(cx-hw+pad, cy-hh,       dw-pad*2, th); },           // top
      () => { ctx.rect(cx+hw-th,  cy-hh+pad,   th, hh-pad*1.5); },         // top-right
      () => { ctx.rect(cx+hw-th,  cy+th*0.5,   th, hh-pad*1.5); },         // bot-right
      () => { ctx.rect(cx-hw+pad, cy+hh-th,    dw-pad*2, th); },           // bot
      () => { ctx.rect(cx-hw,     cy+th*0.5,   th, hh-pad*1.5); },         // bot-left
      () => { ctx.rect(cx-hw,     cy-hh+pad,   th, hh-pad*1.5); },         // top-left
      () => { ctx.rect(cx-hw+pad, cy-th*0.55,  dw-pad*2, th); },           // mid
    ];

    segs.forEach((on, i) => {
      ctx.beginPath();
      segPaths[i]();
      if (on) {
        ctx.fillStyle = C2;
        ctx.shadowColor = C2;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
        // outer glow pass
        ctx.fillStyle = `rgba(${hexToRgb(C2).join(',')},0.25)`;
        ctx.shadowColor = C2;
        ctx.shadowBlur = 28;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = `rgba(${hexToRgb(C1).join(',')},0.07)`;
        ctx.fill();
      }
    });
  }

  function drawColon(x, cy, dh, blink) {
    const dotR = dh * 0.065;
    const color = blink ? C2 : `rgba(${hexToRgb(C2).join(',')},0.25)`;
    ctx.fillStyle = color;
    ctx.shadowColor = blink ? C2 : 'transparent';
    ctx.shadowBlur = blink ? 12 : 0;
    [-0.22, 0.22].forEach(offset => {
      ctx.beginPath();
      ctx.arc(x, cy + dh * offset, dotR, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    fillBg('neon');
    gridOffset = (gridOffset + cfg.speed * 0.4) % 60;

    const [c1r, c1g, c1b] = hexToRgb(C1);
    const [c2r, c2g, c2b] = hexToRgb(C2);
    const horizon = H * 0.6;

    // Grid floor
    const numV = 24;
    for (let i = 0; i <= numV; i++) {
      const frac = i / numV;
      const xBot = frac * W;
      const xTop = W/2 + (frac - 0.5) * W * 0.06;
      ctx.beginPath();
      ctx.moveTo(xTop, horizon);
      ctx.lineTo(xBot, H);
      const a = 0.05 + Math.abs(frac - 0.5) * 0.12;
      ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},${a})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const numH = 14;
    for (let i = 1; i <= numH; i++) {
      const frac = i / numH;
      const pf = Math.pow(frac, 2.2);
      // animate offset
      const animFrac = ((pf * numH + gridOffset / 60) % numH) / numH;
      const pf2 = Math.pow(animFrac, 2.2);
      const y = horizon + pf2 * (H - horizon);
      const a = 0.03 + pf2 * 0.14;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},${a})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Horizon glow
    const hg = ctx.createLinearGradient(0, horizon-40, 0, horizon+60);
    hg.addColorStop(0, 'rgba(0,0,0,0)');
    hg.addColorStop(0.45, `rgba(${c1r},${c1g},${c1b},0.18)`);
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, horizon-40, W, 100);

    // Sun
    const sg = ctx.createRadialGradient(W/2, horizon, 0, W/2, horizon, W*0.25);
    sg.addColorStop(0, `rgba(${c2r},${c2g},${c2b},0.5)`);
    sg.addColorStop(0.35, `rgba(${c1r},${c1g},${c1b},0.22)`);
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, horizon);

    // Horizontal lines on sun (retro stripes)
    const sunR = W * 0.14;
    for (let i = 0; i < 8; i++) {
      const sy = horizon - sunR * 0.05 + (i / 8) * sunR * 0.95;
      const hf = Math.sqrt(Math.max(0, 1 - Math.pow((sy - horizon) / sunR, 2)));
      const lineW = sunR * hf * 2;
      ctx.fillStyle = `rgba(${c1r},${c1g},${c1b},0.25)`;
      ctx.fillRect(W/2 - lineW/2, sy, lineW, sunR * 0.07);
    }

    // 7-segment clock
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    const dh = Math.min(W * 0.14, H * 0.28, 160);
    const dw = dh * 0.56;
    const colonW = dw * 0.28;
    const gap = dw * 0.14;
    const totalW = 6*(dw+gap) + 2*(colonW+gap);
    let x = W/2 - totalW/2 + dw/2;
    const cy2 = H * 0.30;

    // Dark panel behind digits
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(W/2 - totalW/2 - 20, cy2 - dh/2 - 16, totalW + 40, dh + 32, 12);
    ctx.fill();

    const blink = Math.floor(Date.now() / 500) % 2 === 0;
    const chars = [pad(h)[0], pad(h)[1], ':', pad(m)[0], pad(m)[1], ':', pad(s)[0], pad(s)[1]];
    chars.forEach(ch => {
      if (ch === ':') {
        drawColon(x, cy2, dh, blink);
        x += colonW + gap;
      } else {
        drawDigit(ch, x, cy2, dw, dh);
        x += dw + gap;
      }
    });

    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  }

  return { init, tick };
})();

// ═══════════════════════════════════════════════════════════════
//  SCENE: FIRE CLOCK (DOOM-style fire with digit silhouettes)
// ═══════════════════════════════════════════════════════════════
const sceneFire = (() => {
  const FW = 240, FH = 100;
  let firePixels = null, digitMask = null, palette = [];
  let offFire = null, offCtx = null, offDigit = null, offDCtx = null;
  let lastTimeStr = '';
  const PS = 38;

  function buildPalette() {
    palette = [];
    const [r1,g1,b1] = hexToRgb(C1);
    const [r2,g2,b2] = hexToRgb(C2);
    for (let i = 0; i < PS; i++) {
      const t = i / (PS - 1);
      let r, g, b;
      if (t < 0.28) {
        const f = t / 0.28;
        r = Math.round(r1*f*0.5); g = Math.round(g1*f*0.4); b = Math.round(b1*f*0.4);
      } else if (t < 0.62) {
        const f = (t-0.28)/0.34;
        r = Math.round(r1*(0.5+f*0.5)); g = Math.round(g1*(0.4+f*0.6)); b = Math.round(b1*(0.4+f*0.6));
      } else if (t < 0.82) {
        const f = (t-0.62)/0.2;
        r = Math.round(r1+(r2-r1)*f); g = Math.round(g1+(g2-g1)*f); b = Math.round(b1+(b2-b1)*f);
      } else {
        const f = (t-0.82)/0.18;
        r = Math.round(r2+(255-r2)*f); g = Math.round(g2+(255-g2)*f); b = Math.round(b2+(255-b2)*f);
      }
      palette.push([Math.min(255,r), Math.min(255,g), Math.min(255,b)]);
    }
  }

  function init() {
    if (!offFire) {
      offFire  = document.createElement('canvas'); offCtx  = offFire.getContext('2d');
      offDigit = document.createElement('canvas'); offDCtx = offDigit.getContext('2d');
    }
    offFire.width = FW; offFire.height = FH;
    offDigit.width = FW; offDigit.height = FH;
    firePixels = new Uint8Array(FW * FH).fill(0);
    digitMask  = new Uint8Array(FW * FH).fill(0);
    lastTimeStr = '';
    buildPalette();
  }

  function updateDigitMask() {
    const now = new Date();
    const ts = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    if (ts === lastTimeStr) return;
    lastTimeStr = ts;
    offDCtx.clearRect(0, 0, FW, FH);
    offDCtx.fillStyle = '#fff';
    offDCtx.font = `bold ${Math.floor(FH * 0.5)}px 'JetBrains Mono', monospace`;
    offDCtx.textAlign = 'center';
    offDCtx.textBaseline = 'middle';
    offDCtx.fillText(ts, FW/2, FH * 0.48);
    const d = offDCtx.getImageData(0, 0, FW, FH);
    for (let i = 0; i < FW*FH; i++) digitMask[i] = d.data[i*4+3] > 60 ? 1 : 0;
  }

  function spread() {
    // Seed bottom row
    for (let x = 0; x < FW; x++) firePixels[(FH-1)*FW+x] = PS - 1;

    // Propagate upward
    for (let y = 0; y < FH-1; y++) {
      for (let x = 0; x < FW; x++) {
        const below = firePixels[(y+1)*FW+x];
        const rx = Math.floor(Math.random() * 3) - 1;
        const nx = (x + rx + FW) % FW;
        const decay = Math.random() < 0.35 ? 1 : 0;
        firePixels[y*FW+nx] = Math.max(0, below - decay);
      }
    }

    // Apply digit mask (keep digit pixels cold)
    for (let i = 0; i < FW*FH; i++) {
      if (digitMask[i]) firePixels[i] = 0;
    }
  }

  function render() {
    const img = offCtx.createImageData(FW, FH);
    for (let i = 0; i < FW*FH; i++) {
      const [r,g,b] = palette[Math.min(firePixels[i], PS-1)];
      img.data[i*4]=r; img.data[i*4+1]=g; img.data[i*4+2]=b; img.data[i*4+3]=255;
    }
    offCtx.putImageData(img, 0, 0);
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    fillBg('fire');
    updateDigitMask();
    spread();
    render();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offFire, 0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
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
//  SCENE: HEX CLOCK (Hexagonal pixel display)
// ═══════════════════════════════════════════════════════════════
const sceneHex = (() => {
  let hexes = [], activeSet = new Set();
  let offscreen = null, oCtx = null;
  let lastTimeStr = '';
  let hexR = 20;

  function buildGrid() {
    hexes = [];
    hexR = Math.min(W, H) * 0.024;
    const hexW = hexR * 2;
    const hexH = Math.sqrt(3) * hexR;
    const cols = Math.ceil(W / (hexW * 0.75)) + 2;
    const rows = Math.ceil(H / hexH) + 2;

    for (let col = -1; col < cols; col++) {
      for (let row = -1; row < rows; row++) {
        const x = col * hexW * 0.75;
        const y = row * hexH + (col % 2 === 0 ? 0 : hexH / 2);
        hexes.push({ x, y });
      }
    }
  }

  function updateActive() {
    const now = new Date();
    const ts = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    if (ts === lastTimeStr) return;
    lastTimeStr = ts;

    if (!offscreen) { offscreen = document.createElement('canvas'); oCtx = offscreen.getContext('2d'); }
    if (offscreen.width !== W || offscreen.height !== H) { offscreen.width = W; offscreen.height = H; }

    const fs = Math.min(W * 0.22, H * 0.32, 220);
    oCtx.clearRect(0, 0, W, H);
    oCtx.fillStyle = '#fff';
    oCtx.font = `700 ${fs}px 'JetBrains Mono', monospace`;
    oCtx.textAlign = 'center';
    oCtx.textBaseline = 'middle';
    oCtx.fillText(ts, W/2, H/2);

    const d = oCtx.getImageData(0, 0, W, H);
    activeSet = new Set();
    hexes.forEach((hex, i) => {
      const px = Math.round(hex.x), py = Math.round(hex.y);
      if (px < 0 || px >= W || py < 0 || py >= H) return;
      if (d.data[(py * W + px) * 4 + 3] > 80) activeSet.add(i);
    });
  }

  function init() {
    buildGrid();
    activeSet = new Set();
    lastTimeStr = '';
  }

  function hexPath(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const hx = x + r * Math.cos(a), hy = y + r * Math.sin(a);
      if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    fillBg('hex');
    updateActive();

    const [c1r,c1g,c1b] = hexToRgb(C1);
    const [c2r,c2g,c2b] = hexToRgb(C2);
    const innerR = hexR * 0.86;

    // Draw inactive hexes in one batched path
    ctx.beginPath();
    hexes.forEach((h, i) => {
      if (activeSet.has(i)) return;
      for (let j = 0; j < 6; j++) {
        const a = (Math.PI / 3) * j - Math.PI / 6;
        const hx = h.x + innerR * Math.cos(a), hy = h.y + innerR * Math.sin(a);
        if (j === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
    });
    ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},0.07)`;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Draw active hexes with glow
    ctx.shadowColor = C2;
    ctx.shadowBlur = hexR * 0.9;
    ctx.fillStyle = `rgba(${c2r},${c2g},${c2b},0.88)`;
    hexes.forEach((h, i) => {
      if (!activeSet.has(i)) return;
      hexPath(h.x, h.y, innerR);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Bright core of active hexes
    ctx.fillStyle = `rgba(${c2r},${c2g},${c2b},0.3)`;
    hexes.forEach((h, i) => {
      if (!activeSet.has(i)) return;
      hexPath(h.x, h.y, innerR * 0.55);
      ctx.fill();
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

// ── Boot ──────────────────────────────────────────────────────
applyPalette('neon');
switchScene('aurora');
acquireWakeLock(); // explicit call at boot (also fires at top of file)
