import { ctx, W, H } from '../core/canvas.js';
import { cfg, C1, C2 } from '../core/cfg.js';
import { pad, hexToRgb, lerpColor, rand, fillBg } from '../core/helpers.js';
import { setRafId } from '../core/raf.js';

// Bedside monitor: sweep-mode traces that overwrite themselves, ECG + pleth + respiration.
const LEADS = [
  { yf: 0.20, label: 'ECG II',  unit: 'mV',   tone: 0   },
  { yf: 0.46, label: 'SpO2',    unit: '%',    tone: 1   },
  { yf: 0.72, label: 'RESP',    unit: 'rpm',  tone: 0.5 },
];

let buf = [], head = 0, phase = 0, respPhase = 0, lastTs = 0;
let flash = 0, hrv = 0, beatAmp = 1, isPVC = false, spo2 = 98, alarm = 0;

// Normal sinus beat, phase 0..1
function ekg(m) {
  m = ((m % 1) + 1) % 1;
  if (m < 0.04)  return m / 0.04 * 0.15;
  if (m < 0.08)  return 0.15 - (m - 0.04) / 0.04 * 0.15;
  if (m < 0.12)  return -(m - 0.08) / 0.04 * 0.35;
  if (m < 0.145) return -0.35 + (m - 0.12) / 0.025 * 2.2;
  if (m < 0.175) return 1.85 - (m - 0.145) / 0.03 * 2.4;
  if (m < 0.22)  return -0.55 + (m - 0.175) / 0.045 * 0.75;
  if (m < 0.28)  return 0.2 - (m - 0.22) / 0.06 * 0.25;
  return 0;
}

// Ectopic beat: wide QRS, no P wave, inverted T
function pvc(m) {
  m = ((m % 1) + 1) % 1;
  if (m < 0.06)  return -(m / 0.06) * 0.45;
  if (m < 0.14)  return -0.45 + (m - 0.06) / 0.08 * 2.9;
  if (m < 0.26)  return 2.45 - (m - 0.14) / 0.12 * 3.3;
  if (m < 0.38)  return -0.85 + (m - 0.26) / 0.12 * 1.05;
  if (m < 0.52)  return 0.2 - (m - 0.38) / 0.14 * 0.5;
  return 0;
}

// Pulse-oximeter waveform: steep upstroke, dicrotic notch on the way down
function pleth(m) {
  m = ((m % 1) + 1) % 1;
  if (m < 0.18) return Math.pow(m / 0.18, 0.65);
  if (m < 0.42) return 1 - (m - 0.18) / 0.24 * 0.55;
  if (m < 0.5)  return 0.45 + Math.sin((m - 0.42) / 0.08 * Math.PI) * 0.12;
  return Math.max(0, 0.45 * (1 - (m - 0.5) / 0.5));
}

function init() {
  buf = LEADS.map(() => new Array(Math.max(1, Math.ceil(W))).fill(null));
  head = 0; phase = 0; respPhase = 0; lastTs = 0;
  flash = 0; hrv = 0; beatAmp = 1; isPVC = false; spo2 = 98; alarm = 0;
}

function tick(ts) {
  setRafId(requestAnimationFrame(tick));
  const dt = Math.min((ts - lastTs) / 1000, 0.05) || 0.016;
  lastTs = ts;
  fillBg('pulse');

  if (buf[0].length !== Math.ceil(W)) init();

  const spd = cfg.speed / 5;
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();

  // Heart rate drifts with the seconds hand, plus HRV wander
  hrv += rand(-0.7, 0.7);
  hrv  = Math.max(-10, Math.min(10, hrv * 0.97));
  const bpm = 52 + (s / 59) * 46 + hrv;
  const rr  = 10 + (m % 8);

  const before = phase;
  phase     += dt * (bpm / 60) * spd;
  respPhase += dt * (rr / 60) * spd;

  // R-peak crossing → flash, new beat amplitude, occasional PVC
  const pm = ((before % 1) + 1) % 1, cm = ((phase % 1) + 1) % 1;
  const beat = pm < 0.145 && cm >= 0.145;
  if (beat) {
    beatAmp = 0.75 + Math.random() * 0.5;
    isPVC   = Math.random() < 0.05;
    flash   = 1;
    spo2    = Math.max(93, Math.min(100, spo2 + rand(-0.6, 0.6)));
    if (isPVC) alarm = 1.4;
  }
  flash = Math.max(0, flash - dt * 4);
  alarm = Math.max(0, alarm - dt);

  const [c1r, c1g, c1b] = hexToRgb(C1);
  const [c2r, c2g, c2b] = hexToRgb(C2);

  // Sample the traces into the ring buffer at a fixed pixel rate
  const pxPerSec = W / 6 * spd;
  const steps = Math.max(1, Math.round(pxPerSec * dt));
  for (let i = 0; i < steps; i++) {
    const sub = (i + 1) / steps;
    const ph  = before + (phase - before) * sub;
    const raw = isPVC ? pvc(ph) : ekg(ph);
    buf[0][head] = raw * beatAmp + rand(-0.015, 0.015);
    buf[1][head] = pleth(ph - 0.12) * 0.9;
    buf[2][head] = Math.sin((respPhase + sub * 0.01) * Math.PI * 2) * 0.55
                 + Math.sin(respPhase * Math.PI * 4) * 0.08;
    head = (head + 1) % buf[0].length;
    // Erase a gap ahead of the sweep, like a real monitor
    for (let g = 0; g < 26; g++) buf.forEach(b => { b[(head + g) % b.length] = null; });
  }

  // Grid
  const gW = W / 30, gH = H / 18;
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = `rgba(${c1r},${c1g},${c1b},0.05)`;
  for (let x = 0; x <= W; x += gW) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += gH) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Traces
  LEADS.forEach((lead, li) => {
    const cy  = H * lead.yf;
    const amp = H * 0.13 * (cfg.intensity / 5) * (li === 2 ? 0.7 : 1);
    const [r, g, b] = lerpColor(C1, C2, lead.tone);
    const data = buf[li];

    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      let pen = false;
      for (let x = 0; x < data.length; x++) {
        const v = data[x];
        if (v === null) { pen = false; continue; }
        const y = cy - v * amp;
        if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
      }
      if (pass === 0) {
        ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`;
        ctx.lineWidth   = 6;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.shadowBlur  = 16;
      } else {
        ctx.strokeStyle = `rgba(${r},${g},${b},0.95)`;
        ctx.lineWidth   = 1.6;
        ctx.shadowBlur  = 0;
      }
      ctx.stroke();
    }

    const lfs = Math.min(W * 0.016, 13);
    ctx.font         = `500 ${lfs}px 'JetBrains Mono', monospace`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle    = `rgba(${r},${g},${b},0.55)`;
    ctx.fillText(`${lead.label}${isPVC && li === 0 ? '   ⚠ PVC' : ''}`, 14, cy - amp * 1.15);
  });

  // Sweep head
  const hx = head;
  ctx.strokeStyle = `rgba(${c2r},${c2g},${c2b},0.5)`;
  ctx.lineWidth   = 1.5;
  ctx.shadowColor = C2; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, H); ctx.stroke();
  ctx.shadowBlur  = 0;

  // Beat flash
  if (flash > 0) {
    const rg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) * 0.5);
    rg.addColorStop(0, `rgba(${c2r},${c2g},${c2b},${flash * 0.1})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }

  // Vitals panel
  const vals = [
    { v: Math.round(bpm),   u: 'BPM',  c: `rgb(${c1r},${c1g},${c1b})` },
    { v: Math.round(spo2),  u: '%SpO2', c: `rgb(${c2r},${c2g},${c2b})` },
    { v: rr,                u: 'RR',   c: `rgba(${c2r},${c2g},${c2b},0.8)` },
  ];
  const vfs = Math.min(W * 0.038, H * 0.055, 46);
  vals.forEach((val, i) => {
    const y = 18 + i * vfs * 1.9;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.font         = `700 ${vfs}px 'JetBrains Mono', monospace`;
    ctx.shadowColor  = val.c; ctx.shadowBlur = i === 0 ? 16 + flash * 24 : 10;
    ctx.fillStyle    = val.c;
    ctx.fillText(String(val.v), W - 16, y);
    ctx.shadowBlur   = 0;
    ctx.font         = `300 ${Math.min(W * 0.014, 12)}px 'JetBrains Mono', monospace`;
    ctx.fillStyle    = 'rgba(255,255,255,0.35)';
    ctx.fillText(val.u, W - 16, y + vfs * 1.05);
  });

  // Alarm banner when an ectopic beat lands
  if (alarm > 0) {
    ctx.fillStyle = `rgba(${c1r},${c1g},${c1b},${0.12 * alarm})`;
    ctx.fillRect(0, 0, W, H * 0.06);
    ctx.font         = `600 ${Math.min(W * 0.018, 15)}px 'JetBrains Mono', monospace`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = `rgba(255,255,255,${0.5 + 0.5 * alarm})`;
    ctx.fillText('⚠  VENTRICULAR ECTOPY', 16, H * 0.03);
  }

  // Time
  const tStr = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const fs   = Math.min(W * 0.095, H * 0.12, 105);
  ctx.font         = `300 ${fs}px 'JetBrains Mono', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor  = C1; ctx.shadowBlur = 40;
  ctx.fillStyle    = `rgba(${c1r},${c1g},${c1b},0.32)`;
  ctx.fillText(tStr, W / 2, H - 12);
  ctx.shadowColor  = C2; ctx.shadowBlur = 14;
  ctx.fillStyle    = 'rgba(255,255,255,0.94)';
  ctx.fillText(tStr, W / 2, H - 12);
  ctx.shadowBlur   = 0;
}

export default { init, tick };
