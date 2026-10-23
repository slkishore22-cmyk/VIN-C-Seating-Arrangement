export interface Swatch {
  bg: string;
  text: string;
}

const DEPT_FALLBACK: Swatch[] = [
  { bg: '#D32F2F', text: '#FFFFFF' },
  { bg: '#1565C0', text: '#FFFFFF' },
  { bg: '#2E7D32', text: '#FFFFFF' },
  { bg: '#F57F17', text: '#000000' },
  { bg: '#6A1B9A', text: '#FFFFFF' },
  { bg: '#00838F', text: '#FFFFFF' },
  { bg: '#BF360C', text: '#FFFFFF' },
  { bg: '#283593', text: '#FFFFFF' },
  { bg: '#558B2F', text: '#FFFFFF' },
  { bg: '#E91E63', text: '#FFFFFF' },
  { bg: '#004D40', text: '#FFFFFF' },
  { bg: '#E65100', text: '#FFFFFF' },
  { bg: '#880E4F', text: '#FFFFFF' },
  { bg: '#1A237E', text: '#FFFFFF' },
  { bg: '#33691E', text: '#FFFFFF' },
];

const DEPT_KNOWN: Record<string, Swatch> = {
  BBA: { bg: '#D32F2F', text: '#FFFFFF' },
  'B.COM.': { bg: '#1565C0', text: '#FFFFFF' },
  'B.SC.': { bg: '#2E7D32', text: '#FFFFFF' },
  'B.A': { bg: '#F57F17', text: '#000000' },
  MA: { bg: '#6A1B9A', text: '#FFFFFF' },
  'B.COM.(CS)': { bg: '#00838F', text: '#FFFFFF' },
  'BSC[VC]': { bg: '#BF360C', text: '#FFFFFF' },
  'M.COM.': { bg: '#880E4F', text: '#FFFFFF' },
  'M.SC.': { bg: '#004D40', text: '#FFFFFF' },
  'B.COM.(CA)': { bg: '#283593', text: '#FFFFFF' },
  UNKNOWN: { bg: '#424242', text: '#FFFFFF' },
};

const EXAM_CODE_PALETTE: Swatch[] = [
  { bg: '#E53935', text: '#FFFFFF' },
  { bg: '#1E88E5', text: '#FFFFFF' },
  { bg: '#43A047', text: '#FFFFFF' },
  { bg: '#FDD835', text: '#000000' },
  { bg: '#8E24AA', text: '#FFFFFF' },
  { bg: '#FB8C00', text: '#000000' },
  { bg: '#00ACC1', text: '#FFFFFF' },
  { bg: '#EC407A', text: '#FFFFFF' },
  { bg: '#3949AB', text: '#FFFFFF' },
  { bg: '#6D4C41', text: '#FFFFFF' },
  { bg: '#00897B', text: '#FFFFFF' },
  { bg: '#7CB342', text: '#000000' },
  { bg: '#5E35B1', text: '#FFFFFF' },
  { bg: '#F4511E', text: '#FFFFFF' },
  { bg: '#546E7A', text: '#FFFFFF' },
  { bg: '#C0CA33', text: '#000000' },
];

const deptAssigned: Record<string, Swatch> = {};
const examAssigned: Record<string, Swatch> = {};

const normalize = (s: string) => s.toUpperCase().replace(/\s+/g, '').replace(/\.$/, '');

function hslToHex(h: number, s: number, l: number) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** Black or white text, whichever reads better on the background. */
function textOn(bg: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16) / 255);
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.6 ? '#000000' : '#FFFFFF';
}

/**
 * Colours beyond the fixed palettes. Hues step by the golden angle so they never repeat,
 * and three lightness bands keep neighbouring hues apart.
 */
function generatedSwatch(n: number): Swatch {
  const hue = (n * 137.508 + 20) % 360;
  const light = [42, 32, 55][n % 3];
  const bg = hslToHex(hue, 70, light);
  return { bg, text: textOn(bg) };
}

/** First unused palette colour, else a generated one not already taken. */
function nextUnique(palette: Swatch[], taken: Swatch[]): Swatch {
  const used = new Set(taken.map((s) => s.bg));
  const free = palette.find((s) => !used.has(s.bg));
  if (free) return free;
  for (let n = 0; ; n++) {
    const s = generatedSwatch(n);
    if (!used.has(s.bg)) return s;
  }
}

export function examCodeColor(code: string): Swatch {
  examAssigned[code] ??= nextUnique(EXAM_CODE_PALETTE, Object.values(examAssigned));
  return examAssigned[code];
}

export function deptColor(dept: string): Swatch {
  if (DEPT_KNOWN[dept]) return DEPT_KNOWN[dept];
  const key = normalize(dept);
  for (const [name, swatch] of Object.entries(DEPT_KNOWN)) {
    const k = normalize(name);
    if (key === k || key.includes(k) || k.includes(key)) return swatch;
  }
  // Unknown degrees avoid the fixed degree colours too, so every degree stays distinct.
  deptAssigned[dept] ??= nextUnique(DEPT_FALLBACK, [...Object.values(DEPT_KNOWN), ...Object.values(deptAssigned)]);
  return deptAssigned[dept];
}
