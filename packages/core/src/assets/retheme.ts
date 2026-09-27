/**
 * Art Direction Change Engine — regeneration layer (§19).
 * Mutates ONLY the visual layer: sprites + materials are re-forged from the
 * mutated Art Bible. Identity structure, gameplay data and code untouched.
 */
import { forgeDefaultSprites } from "./spriteForge";
import { forgeMaterials } from "./materials";
import type { ArtBible } from "./artBible";

export function rethemeAssets(wsPath: string, bible: ArtBible): number {
  const pal = {
    accent: bible.identities.protagonist.colors.main,
    bg: bible.palette.bg,
  };
  const sprites = forgeDefaultSprites(pal);
  const materials = forgeMaterials(bible.environment.materials, pal);
  let count = 0;
  for (const [rel, bytes] of Object.entries(sprites)) {
    Bun.write(join(wsPath, rel), bytes as Uint8Array);
    count++;
  }
  for (const [rel, bytes] of Object.entries(materials)) {
    Bun.write(join(wsPath, rel), bytes as Uint8Array);
    count++;
  }
  return count;
}

import { join } from "node:path";
import { mkdirSync } from "node:fs";
