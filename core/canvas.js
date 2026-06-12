export const canvas = document.getElementById('bg-canvas');
export const ctx    = canvas.getContext('2d');
export let W = 0, H = 0;

export function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
