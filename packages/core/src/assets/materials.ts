/**
 * Material system (§7) — semantic textures, NOT generic noise.
 * Each material has characteristic structure: stone has mortar+cracks+moss,
 * wood has grain+nails, crystal has facets+glow lines, steel has bands+spec.
 * The biome in the Art Bible selects which materials a project uses.
 */
import { Px, type ForgePalette, type RGB } from "./spriteForgeHelpers";
import { paintStoneTile, paintWoodTile, paintCrystalTile } from "./envPainters";

export interface MaterialDef { id: string; label: string; usage: string }

export const MATERIALS: MaterialDef[] = [
  { id: "aged_stone", label: "Pedra antiga", usage: "floors & walls of ruins" },
  { id: "ancient_wood", label: "Madeira antiga", usage: "platforms & props" },
  { id: "magical_crystal", label: "Cristal arcano", usage: "gates & landmarks" },
  { id: "polished_steel", label: "Aço polido", usage: "metal architecture" },
  { id: "wet_asphalt", label: "Asfalto molhado", usage: "ground, cypunk" },
  { id: "snow", label: "Neve", usage: "frozen grounds" },
];

function hexRGB(hex: string): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const sh = (c: RGB, f: number): RGB => [Math.min(255, Math.round(c[0] * f)), Math.min(255, Math.round(c[1] * f)), Math.min(255, Math.round(c[2] * f))];

/** Deterministic PRNG (seeded per material — reproducible). */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 0xffffffff;
  };
}

export function paintMaterial(id: string, pal: ForgePalette, size = 32): Uint8Array {
  const p = new Px(size, size);
  const base = hexRGB(pal.bg);
  const rnd = rng(id.split("").reduce((a, c) => a + c.charCodeAt(0) * 31, 7));
  switch (id) {
    case "aged_stone": return paintStoneTile(pal, size);
    case "ancient_wood": return paintWoodTile(pal, size);
    case "magical_crystal": return paintCrystalTile(pal, size);
    case "aged_stone_legacy": {
      const stone = sh(base, 2.0);
      const mortar = sh(base, 1.25);
      p.rect(0, 0, size, size, stone);
      for (let row = 0; row < 4; row++) {
        const y = row * 8;
        p.rect(0, y + 7, size, 1, mortar);
        const off = row % 2 === 0 ? 0 : 8;
        for (let x = off; x < size; x += 16) p.rect(x === 0 ? 0 : x - 1, y, 1, 8, mortar);
      }
      // cracks: 1px dark meanders
      for (let c = 0; c < 3; c++) {
        let x = Math.floor(rnd() * size), y = Math.floor(rnd() * size);
        for (let l = 0; l < 8; l++) {
          p.set(x, y, sh(stone, 0.55));
          x = Math.max(0, Math.min(size - 1, x + (rnd() > 0.5 ? 1 : -1)));
          y = Math.max(0, Math.min(size - 1, y + (rnd() > 0.4 ? 1 : 0)));
        }
      }
      // moss specks (semantic: ruins = age)
      for (let m = 0; m < 26; m++) {
        const x = Math.floor(rnd() * size), y = Math.floor(rnd() * size);
        p.set(x, y, [70, 110, 76], 200);
      }
      break;
    }
    case "ancient_wood": {
      const wood: RGB = [122, 88, 58];
      p.rect(0, 0, size, size, wood);
      for (let row = 0; row < 4; row++) {
        p.rect(0, row * 8 + 7, size, 1, sh(wood, 0.55)); // plank gaps
        for (let g = 0; g < 3; g++) { // grain lines per plank
          const y = row * 8 + 1 + g * 2;
          let x = 0;
          while (x < size) {
            p.set(x, y, sh(wood, 0.8));
            const w = Math.floor(2 + rnd() * 4);
            x += w;
          }
        }
        p.set(4, row * 8 + 3, [40, 40, 46]); // nails
        p.set(size - 5, row * 8 + 3, [40, 40, 46]);
      }
      break;
    }
    case "magical_crystal": {
      const crystal = hexRGB(pal.accent);
      p.rect(0, 0, size, size, sh(crystal, 0.5));
      // facet triangles
      for (let f = 0; f < 6; f++) {
        const cx = Math.floor(rnd() * size), cy = Math.floor(rnd() * size);
        const r = 4 + Math.floor(rnd() * 6);
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
          if (Math.abs(x) + Math.abs(y) <= r) p.set(cx + x, cy + y, (Math.abs(x) + Math.abs(y)) % 3 === 0 ? sh(crystal, 1.3) : crystal);
        }
      }
      // glow lines (semantic: arcane)
      for (let gl = 0; gl < 4; gl++) {
        const y = Math.floor(rnd() * size);
        p.rect(Math.floor(rnd() * 12), y, 8 + Math.floor(rnd() * 10), 1, sh(crystal, 1.7));
      }
      break;
    }
    case "polished_steel": {
      const steel: RGB = [148, 158, 176];
      p.rect(0, 0, size, size, steel);
      for (let y = 0; y < size; y += 4) {
        p.rect(0, y, size, 1, sh(steel, 0.7));
        p.rect(0, y + 1, size, 1, sh(steel, 1.15)); // banded sheen
      }
      // specular sweep (semantic: polished)
      for (let y = 0; y < size; y++) {
        const x = (y * 3 + 10) % size;
        p.set(x, y, [220, 232, 255], 160);
      }
      break;
    }
    case "wet_asphalt": {
      const asph: RGB = [42, 44, 52];
      p.rect(0, 0, size, size, asph);
      for (let i = 0; i < 70; i++) p.set(Math.floor(rnd() * size), Math.floor(rnd() * size), sh(asph, 1.3));
      // reflective streaks (semantic: wet)
      for (let s = 0; s < 3; s++) {
        const y = 6 + Math.floor(rnd() * 22);
        p.rect(0, y, size, 1, sh(asph, 1.9), 90);
      }
      // painted line remnant
      p.rect(0, 14, size, 2, [200, 190, 90], 140);
      break;
    }
    case "snow": {
      const snow: RGB = [228, 238, 250];
      p.rect(0, 0, size, size, snow);
      for (let i = 0; i < 40; i++) p.set(Math.floor(rnd() * size), Math.floor(rnd() * size), sh(snow, 0.88));
      // sparkles
      for (let i = 0; i < 10; i++) p.set(Math.floor(rnd() * size), Math.floor(rnd() * size), [255, 255, 255]);
      // footprint dents (semantic: traversal readable)
      p.set(8, 20, sh(snow, 0.8)); p.set(9, 20, sh(snow, 0.8));
      p.set(20, 26, sh(snow, 0.8)); p.set(21, 26, sh(snow, 0.8));
      break;
    }
  }
  return p.png();
}

/** Generates the material set selected by the bible biome. */
export function forgeMaterials(bibleMaterials: string[], pal: ForgePalette): Record<string, Uint8Array> {
  const out: Record<string, Uint8Array> = {};
  for (const id of bibleMaterials) {
    if (MATERIALS.some((m) => m.id === id)) out[`assets/materials/tile_${id}.png`] = paintMaterial(id, pal);
  }
  return out;
}
