export const PALETTES = {
  neon:   { c1: '#7b2ff7', c2: '#00f0ff' },
  ember:  { c1: '#ff4e00', c2: '#ec9f05' },
  forest: { c1: '#11998e', c2: '#38ef7d' },
  rose:   { c1: '#f953c6', c2: '#b91d73' },
  ice:    { c1: '#4facfe', c2: '#00f2fe' },
  gold:   { c1: '#f7971e', c2: '#ffd200' },
};

export const cfg = {
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
    warp:   { bg: '#000008', needle: 70, bgOpacity: 82  },
    glitch: { bg: '#040209', needle: 70, bgOpacity: 100 },
    hex:    { bg: '#030308', needle: 70, bgOpacity: 100 },
    ring:    { bg: '#030307', needle: 70, bgOpacity: 100 },
    flow:    { bg: '#030307', needle: 70, bgOpacity: 100 },
    sand:    { bg: '#030308', needle: 70, bgOpacity: 100 },
    pulse:   { bg: '#020008', needle: 70, bgOpacity: 100 },
    binary:  { bg: '#030308', needle: 70, bgOpacity: 100 },
    cube:    { bg: '#000008', needle: 70, bgOpacity: 100 },
    particle:{ bg: '#030308', needle: 70, bgOpacity: 100 },
    tron:    { bg: '#000a00', needle: 70, bgOpacity: 100 },
    kaleid:  { bg: '#030308', needle: 70, bgOpacity: 100 },
    morse:   { bg: '#030308', needle: 70, bgOpacity: 100 },
    spiral:  { bg: '#030308', needle: 70, bgOpacity: 100 },
    terrain: { bg: '#000008', needle: 70, bgOpacity: 100 },
    bubble:  { bg: '#030308', needle: 70, bgOpacity: 100 },
    ripple:  { bg: '#030308', needle: 70, bgOpacity: 100 },
    typer:   { bg: '#020010', needle: 70, bgOpacity: 100 },
  },
};

export let C1 = '#7b2ff7', C2 = '#00f0ff';

export function applyPalette(name) {
  cfg.palette = name;
  const p = PALETTES[name];
  C1 = p.c1; C2 = p.c2;
  document.documentElement.style.setProperty('--c1', C1);
  document.documentElement.style.setProperty('--c2', C2);
  document.querySelectorAll('.palette-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.palette === name);
  });
}
