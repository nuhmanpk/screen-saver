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

export function initWakeLock() {
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
  acquireWakeLock();
}
