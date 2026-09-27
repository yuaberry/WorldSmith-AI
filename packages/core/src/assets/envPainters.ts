/**
 * Environment painters v2 (§7, §8): studio-grade tiles with bevel + AO +
 * edge treatment, sky with dithered gradient + biome skyline silhouette.
 * Materials keep semantic structure, now with hue-shifted ramps.
 */
import { Px, encodePNG, type RGB, type ForgePalette } from "./spriteForgeHelpers";
import { ramp, dither } from "./pixelRamp";

function hex(h: string): RGB {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 0xffffffff; };
}

const STONE = ramp([96, 104, 128], 6);
const MORTAR = ramp([52, 56, 70], 3);
const WOOD = ramp([128, 92, 60], 6);
const CRYSTAL = ramp([150, 130, 230], 6);
const STEEL = ramp([150, 160, 178], 5);
const ASPH = ramp([44, 46, 54], 4);
const SNOW = ramp([225, 235, 250], 4);

function edgeTreatment(p: Px, size: number, top: RGB, bottom: RGB, side: RGB): void {
  p.rect(0, 0, size, 1, top);            // top light bevel
  p.rect(0, size - 1, size, 1, bottom);  // bottom AO
  for (let y = 1; y < size - 1; y++) { p.set(0, y, side); p.set(size - 1, y, side); }
}

/** Stone tile v2: bricks with bevel, AO mortar, cracks, moss, speckle. */
export function paintStoneTile(pal: ForgePalette, size = 32): Uint8Array {
  const p = new Px(size, size);
  const r = rng(9001);
  const moss = ramp([80, 118, 84], 3);
  p.rect(0, 0, size, size, MORTAR[0]!);
  for (let row = 0; row < 4; row++) {
    const y = row * 8;
    const off = row % 2 === 0 ? 0 : 8;
    for (let x = off; x < size; x += 16) {
      const bx = Math.max(0, x), bw = Math.min(16, size - bx);
      p.rect(bx, y, bw, 7, STONE[2]!);
      p.rect(bx, y, bw, 1, STONE[4]!);               // brick bevel
      p.rect(bx, y + 6, bw, 1, STONE[0]!);           // brick AO
      p.rect(bx, y, 1, 7, STONE[3]!);
      if (bw > 4) {
        p.set(bx + 2, y + 2, STONE[1]!);
        p.set(bx + bw - 3, y + 4, STONE[1]!);        // tonal variation
        if (r() > 0.6) p.set(bx + 4 + Math.floor(r() * 6), y + 2 + Math.floor(r() * 3), moss[1]!, 220);
      }
    }
  }
  // cracks
  for (let c = 0; c < 3; c++) {
    let x = Math.floor(r() * size), y = Math.floor(r() * size);
    for (let l = 0; l < 9; l++) {
      p.set(x, y, MORTAR[0]!);
      x = Math.max(0, Math.min(size - 1, x + (r() > 0.5 ? 1 : -1)));
      y = Math.max(0, Math.min(size - 1, y + (r() > 0.35 ? 1 : 0)));
    }
  }
  edgeTreatment(p, size, STONE[3]!, MORTAR[0]!, MORTAR[0]!);
  return encodePNG(size, size, p.data);
}

/** Wood platform tile v2: planks, grain, knots, nails, top bevel. */
export function paintWoodTile(_pal: ForgePalette, size = 32): Uint8Array {
  const p = new Px(size, size);
  const r = rng(777);
  p.rect(0, 0, size, size, WOOD[1]!);
  for (let row = 0; row < 4; row++) {
    const y = row * 8;
    p.rect(0, y + 7, size, 1, WOOD[0]!);
    for (let g = 0; g < 4; g++) {
      const gy = y + 1 + g * 2;
      let x = Math.floor(r() * 3);
      while (x < size) {
        p.set(x, gy, WOOD[2]!, 200);
        x += 3 + Math.floor(r() * 5);
      }
    }
    // knot
    if (r() > 0.5) {
      const kx = 4 + Math.floor(r() * 22);
      p.set(kx, y + 3, WOOD[0]!); p.set(kx + 1, y + 3, WOOD[0]!);
      p.set(kx, y + 4, WOOD[0]!, 200);
    }
    // nails (iron, aged)
    p.set(3, y + 3, [70, 72, 82]); p.set(size - 4, y + 3, [70, 72, 82]);
  }
  edgeTreatment(p, size, WOOD[4]!, WOOD[0]!, WOOD[1]!);
  return encodePNG(size, size, p.data);
}

/** Crystal tile v2: faceted clusters with inner glow lines. */
export function paintCrystalTile(pal: ForgePalette, size = 32): Uint8Array {
  const p = new Px(size, size);
  const r = rng(1313);
  const base = ramp(hex(pal.accent), 6);
  p.rect(0, 0, size, size, base[1]!);
  for (let f = 0; f < 7; f++) {
    const cx = 3 + Math.floor(r() * (size - 6)), cy = 3 + Math.floor(r() * (size - 6));
    const rr = 3 + Math.floor(r() * 4);
    for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) {
      const d = Math.abs(x) + Math.abs(y);
      if (d <= rr) {
        const c = d % 3 === 0 ? base[4]! : d % 3 === 1 ? base[3]! : base[2]!;
        p.set(cx + x, cy + y, c);
      }
    }
    p.set(cx - 1, cy - rr + 1, base[5]!, 230); // facet sparkle
  }
  // glow veins
  for (let v = 0; v < 4; v++) {
    const y = 2 + Math.floor(r() * (size - 4));
    p.rect(Math.floor(r() * 8), y, 6 + Math.floor(r() * 10), 1, base[5]!, 150);
  }
  edgeTreatment(p, size, base[4]!, base[0]!, base[1]!);
  return encodePNG(size, size, p.data);
}

/** Sky v2 (§8): dithered gradient + biome skyline silhouette + stars. */
export function paintSkyV2(pal: ForgePalette, w = 256, h = 144, biome: "ruins" | "caves" | "cypunk" | "frozen" = "ruins"): Uint8Array {
  const p = new Px(w, h);
  const top = ramp(hex(pal.bg), 3)[2]!;
  const mid = ramp(hex(pal.bg), 3)[1]!;
  const bot = ramp(hex(pal.accent), 4)[1]!;
  const bands = [top, top, mid, mid, bot, bot];
  const r = rng(4242);
  for (let y = 0; y < h; y++) {
    const t = (y / h) * (bands.length - 1);
    const i = Math.min(bands.length - 2, Math.floor(t));
    const frac = t - i;
    const c = dither(bands[i]!, bands[i + 1]!, 0, y % 2); // banded dither
    for (let x = 0; x < w; x++) {
      const cc = frac > 0.5 && (x + y) % 2 === 0 ? bands[i + 1]! : c;
      p.set(x, y, cc);
    }
  }
  // stars (varied brightness, upper third)
  for (let s = 0; s < 46; s++) {
    const x = Math.floor(r() * w), y = Math.floor(r() * h * 0.45);
    p.set(x, y, [255, 255, 255], Math.round(70 + r() * 170));
    if (r() > 0.8) p.set(x + 1, y, [200, 220, 255], 90);
  }
  // skyline silhouette: ruined arches/spires (biome-aware landmark identity)
  const sil = ramp(hex(pal.bg), 3)[0]!;
  const drawSpire = (x: number, wd: number, ht: number) => {
    p.rect(x, h - ht, wd, ht, sil);
    p.rect(x, h - ht, 1, ht, [sil[0]! + 12, sil[1]! + 12, sil[2]! + 16]);
    if (r() > 0.5) p.rect(x + 1, h - ht - 3, 1, 3, sil); // spire tip
    p.set(x + 2, h - ht + 3, sil); p.set(x + 3, h - ht + 3, sil); // broken crenellation
  };
  let x = 6;
  while (x < w - 20) {
    const wd = 10 + Math.floor(r() * 16);
    const ht = biome === "cypunk" ? 30 + Math.floor(r() * 50) : 22 + Math.floor(r() * 36);
    drawSpire(x, wd, ht);
    if (biome === "ruins" && r() > 0.55) {
      // broken arch between spires
      const ax = x + wd + 2;
      p.rect(ax, h - ht + 8, 3, ht - 8, sil);
      p.rect(ax, h - ht + 8, 10, 2, sil);
    }
    x += wd + 4 + Math.floor(r() * 10);
  }
  // moon (focal landmark, upper right)
  const mx = w - 44, my = 26;
  p.circle(mx, my, 9, [228, 232, 244], 235);
  p.circle(mx, my, 9, [228, 232, 244], 235);
  p.circle(mx - 2, my - 2, 8, [240, 244, 252], 245);
  p.set(mx + 3, my + 1, [200, 208, 226], 200);
  return encodePNG(w, h, p.data);
}
