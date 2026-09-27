/**
 * PixelRamp — the color science that separates studio pixel art from blobs.
 *
 * 1. HUE-SHIFTED RAMPS: dark tones shift toward blue/purple, bright tones
 *    toward warm yellow (classic pro technique — multipliers of one color
 *    look "muddy AI noise"; shifted ramps look like light).
 * 2. SEL-OUT OUTLINES: outline color derived from the local surface, not
 *    pure black — edges stay readable without crushing contrast.
 * 3. RIM LIGHT: a bright accent on the light-facing edge.
 * 4. DITHER: 2x2 checkerboard blends between ramp steps for gradients.
 */

export type RGB = [number, number, number];

function clamp255(v: number): number { return Math.max(0, Math.min(255, Math.round(v))); }

/** RGB → HSL */
function rgb2hsl(c: RGB): [number, number, number] {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}

/** HSL → RGB */
function hsl2rgb(h: number, s: number, l: number): RGB {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) return [clamp255(l * 255), clamp255(l * 255), clamp255(l * 255)];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    clamp255(hue2rgb(p, q, h + 1 / 3) * 255),
    clamp255(hue2rgb(p, q, h) * 255),
    clamp255(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/**
 * Builds a N-step ramp from a base color with professional hue shifting:
 * shadows drift toward blue/purple, highlights toward warm yellow.
 * This single function is why assets stop looking like "AI noise".
 */
export function ramp(base: RGB, steps = 5): RGB[] {
  const [h, s, l] = rgb2hsl(base);
  const out: RGB[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);            // 0 = darkest, 1 = brightest
    const light = Math.max(0.06, Math.min(0.94, l * (0.32 + 1.10 * t) - 0.02));
    const hueShift = (0.5 - t) * -0.055;  // dark → +blue-ish, bright → warm
    const sat = Math.min(1, s * (1.05 - 0.25 * Math.abs(t - 0.5)));
    out.push(hsl2rgb((h + hueShift + 1) % 1, sat, light));
  }
  return out;
}

/** Sel-out outline: outline tinted by the local surface (pro edge rule). */
export function selout(surface: RGB, darkness = 0.22): RGB {
  const [h, s, l] = rgb2hsl(surface);
  return hsl2rgb((h + 0.04) % 1, Math.min(1, s + 0.2), Math.max(0.05, l * darkness));
}

/** Rim light: bright warm-tinted edge color for the light side. */
export function rimlight(surface: RGB): RGB {
  const [h, s, l] = rgb2hsl(surface);
  return hsl2rgb((h + 0.06) % 1, Math.min(1, s * 0.9), Math.min(0.93, l * 1.5 + 0.25));
}

/** Dither blend helper: checkerboard between two ramp steps. */
export function dither(a: RGB, b: RGB, x: number, y: number): RGB {
  return (x + y) % 2 === 0 ? a : b;
}
