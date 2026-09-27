/**
 * Animation pack assembly + runtime metadata (data/animations.json).
 * The game reads this at runtime to build SpriteFrames with named
 * animations, per-anim FPS, loops and frame events (§5 state machines).
 */
import type { ForgePalette } from "./spriteForgeHelpers";
import { playerAnimPack, enemyAnimPack, bossAnimPack, type AnimDef, type CharacterColors } from "./animPack";
import { paintCheckpoint, paintPickup, paintShard, paintGlow } from "./spriteForge";
import { paintNpcV2 } from "./creaturePainters";
import type { ArtBible } from "./artBible";

export interface AnimPack { files: Record<string, Uint8Array>; meta: Record<string, Record<string, AnimDef>> }

/** Builds the full animation pack for a project from its Art Bible. */
export function buildAnimPack(bible: ArtBible): AnimPack {
  const pal: ForgePalette = { accent: bible.palette.accent, bg: bible.palette.bg };
  const col: CharacterColors = {
    main: bible.identities.protagonist.colors.main,
    trim: bible.identities.protagonist.colors.trim ?? "#fbbf24",
    skin: bible.identities.protagonist.colors.skin ?? "#e8bea0",
    eye: bible.identities.protagonist.colors.eye ?? "#fbbf24",
    danger: bible.palette.danger,
  };

  const files: Record<string, Uint8Array> = {};
  const meta: Record<string, Record<string, AnimDef>> = {};

  const player = playerAnimPack(pal, col);
  Object.assign(files, player.files);
  meta["player"] = player.defs;

  const enemy = enemyAnimPack(pal, col);
  Object.assign(files, enemy.files);
  meta["enemy"] = enemy.defs;

  const bossCol: CharacterColors = { ...col, main: bible.identities.boss.colors.main, trim: bible.identities.boss.colors.trim ?? col.trim };
  const boss = bossAnimPack(pal, bossCol);
  Object.assign(files, boss.files);
  meta["boss"] = boss.defs;

  const simple = (char: string, painter: (pal: ForgePalette, size?: number, frame?: number) => Uint8Array, frames: number, fps: number, anim: string, size = 16) => {
    for (let f = 0; f < frames; f++) files[`assets/anims/${char}/${anim}_${f}.png`] = painter(pal, size, f);
    meta[char] = { [anim]: { frames, fps, loop: true, pivot: [Math.floor(size / 2), size], tags: ["ambient"] } as AnimDef };
  };
  const npcPaint = (pal2: ForgePalette, _size?: number, frame?: number) => paintNpcV2(frame ?? 0, bible.identities.npc.colors.main);
  simple("npc", npcPaint, 2, 2, "IDLE", 24);
  simple("checkpoint", paintCheckpoint, 3, 6, "FLAME");
  simple("pickup", paintPickup, 2, 3, "PULSE", 14);
  simple("shard", paintShard, 4, 6, "PULSE", 12);
  simple("glow", paintGlow, 3, 4, "BEAT", 32);

  return { files, meta };
}

/** data/animations.json — the runtime contract the game scripts read. */
export function animationsJson(pack: AnimPack): string {
  return JSON.stringify(pack.meta, null, 2);
}
