export let rafId = null;
export function setRafId(id) { rafId = id; }
export function cancelRaf() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }
