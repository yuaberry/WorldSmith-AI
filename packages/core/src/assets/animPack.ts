/**
 * Animation Package System (§4, §5).
 * Every character gets a REAL animation set — not one looping blob: named
 * animations with anticipation/impact/recovery frames, frame dims, FPS,
 * pivot, loop flags and animation EVENTS (e.g. hit_active on the impact
 * frame). All frames are painted from ONE canonical body painter with
 * parametric poses → identity consistency is guaranteed by construction
 * and enforced by the §13 validator.
 *
 * Layout is deterministic: assets/anims/<char>/<ANIM>_<i>.png
 * Metadata: data/animations.json (read by the game at runtime).
 */

import { Px, encodePNG, type RGB, type ForgePalette } from "./spriteForgeHelpers";

type Hex = string;
function hexRGB(hex: Hex): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const sh = (c: RGB, f: number): RGB => [Math.min(255, Math.round(c[0] * f)), Math.min(255, Math.round(c[1] * f)), Math.min(255, Math.round(c[2] * f))];

export interface CharacterColors { main: Hex; trim: Hex; skin: Hex; eye: Hex; danger?: Hex }
export interface Pose {
  /** leg stride dx (phase-shifted per leg) */
  legs?: number;
  /** vertical body bob (px) */
  bob?: number;
  /** arm forward extension (px, weapon arm) */
  armF?: number;
  /** weapon angle in degrees (0 = up, 90 = forward) */
  weapon?: number;
  /** weapon blade length (px) */
  blade?: number;
  /** body lean (px x-offset of torso) */
  lean?: number;
  /** crouch (px shorter legs) */
  crouch?: number;
  /** tint multiplier */
  tint?: number;
  /** flash white (hurt) */
  flash?: boolean;
  /** on ground (death kneel) */
  kneel?: boolean;
  /** slash arc on impact frame */
  slash?: boolean;
}

/** Canonical 16×16 humanoid — ONE painter, N poses (§2 by construction). */
export function paintHeroPose(pal: ForgePalette, col: CharacterColors, pose: Pose, size = 16): Uint8Array {
  const p = new Px(size, size);
  const outline: RGB = [14, 16, 26];
  const body = hexRGB(col.main);
  const trim = hexRGB(col.trim);
  const skin = hexRGB(col.skin);
  const dark = sh(body, 0.55);
  const mid = sh(body, 0.78);
  const legs = pose.legs ?? 0;
  const bob = pose.bob ?? 0;
  const lean = pose.lean ?? 0;
  const crouch = pose.crouch ?? 0;
  const cx = Math.floor(size / 2);
  const f = (c: RGB): RGB => pose.flash ? [Math.min(255, c[0]! + 160), Math.min(255, c[1]! + 150), Math.min(255, c[2]! + 140)] : sh(c, pose.tint ?? 1);

  if (pose.kneel) {
    // death pose: body collapsed, blade planted
    p.rect(cx - 4 + lean, size - 6, 8, 4, f(body));
    p.circle(cx + lean, size - 7, 3, f(skin));
    p.line(cx + 3, size - 4, cx + 5, size - 8, f(trim));
  } else {
    // legs (stride phases)
    const legY = size - 5 + crouch;
    p.rect(cx - 4 + legs + lean, legY, 2, 5 - crouch + (legs < 0 ? 1 : 0), f(dark));
    p.rect(cx + 2 - legs + lean, legY, 2, 5 - crouch - (legs > 0 ? 1 : 0), f(dark));
    // torso
    p.rect(cx - 3 + lean, 8 + bob, 6, size - 12 - crouch, f(body));
    p.rect(cx - 3 + lean, 8 + bob, 6, 1, sh(body, 1.25));
    p.rect(cx - 3 + lean, size - 5 - crouch, 6, 1, f(mid));
    // back arm
    p.rect(cx - 5 + lean, 9 + bob, 2, 4, f(mid));
    // weapon arm (forward extension)
    const armF = pose.armF ?? 0;
    p.rect(cx + 3 + lean + armF, 9 + bob, 2, 4, f(mid));
    // head
    p.circle(cx + lean, 5 + bob, 3, f(skin));
    p.rect(cx - 3 + lean, 2 + bob, 7, 1, sh(trim, 1.05));
    p.rect(cx - 3 + lean, 3 + bob, 7, 1, f(trim));
    p.set(cx - 1 + lean, 5 + bob, hexRGB(col.eye));
    // weapon (angle: 0=up guard, 45=high, 90=thrust forward, 135=windup back)
    const wa = ((pose.weapon ?? 0) * Math.PI) / 180;
    const bl = pose.blade ?? 4;
    const ox = cx + 4 + lean + armF;
    const oy = 6 + bob;
    const dx = Math.round(Math.cos(wa - Math.PI / 2) * bl);
    const dy = Math.round(Math.sin(wa - Math.PI / 2) * bl);
    p.line(ox, oy, ox + dx, oy + dy, f(trim));
    if (pose.slash) {
      // impact frame: arc spark
      p.set(ox + dx + 1, oy + dy, [255, 255, 255], 230);
      p.set(ox + dx, oy + dy + 1, [200, 235, 255], 210);
      p.set(ox + dx + 2, oy + dy - 1, [200, 235, 255], 180);
    }
  }

  // outline pass (shared silhouette rule)
  const snap = new Uint8Array(p.data);
  const has = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && (snap[(y * size + x) * 4 + 3] ?? 0) > 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!has(x, y) && (has(x + 1, y) || has(x - 1, y) || has(x, y + 1) || has(x, y - 1))) p.set(x, y, outline);
  }
  return encodePNG(size, size, p.data);
}

export interface AnimDef {
  frames: number;
  fps: number;
  loop: boolean;
  pivot: [number, number];
  /** frame-indexed gameplay events (§4) */
  events?: Array<{ frame: number; type: string }>;
  /** gameplay tags */
  tags?: string[];
}

/** The player's animation library (§4) — only anims that make sense. */
export function playerAnimPack(pal: ForgePalette, col: CharacterColors): { files: Record<string, Uint8Array>; defs: Record<string, AnimDef> } {
  const files: Record<string, Uint8Array> = {};
  const defs: Record<string, AnimDef> = {};

  const add = (name: string, poses: Pose[], def: Omit<AnimDef, "frames" | "pivot">) => {
    poses.forEach((pose, i) => {
      files[`assets/anims/player/${name}_${i}.png`] = paintHeroPose(pal, col, pose);
    });
    defs[name] = { ...def, frames: poses.length, pivot: [8, 16] };
  };

  add("IDLE", [{ bob: 0 }, { bob: -1 }], { fps: 2, loop: true, tags: ["locomotion"] });
  add("WALK", [
    { legs: 0, bob: 0 },
    { legs: 1, bob: -1 },
    { legs: 0, bob: 0 },
    { legs: -1, bob: -1 },
  ], { fps: 8, loop: true, tags: ["locomotion"] });
  add("RUN", [
    { legs: 1, bob: -1, lean: 1 },
    { legs: 2, bob: -2, lean: 1 },
    { legs: 1, bob: -1, lean: 1 },
    { legs: -2, bob: -2, lean: 1 },
  ], { fps: 10, loop: true, tags: ["locomotion"] });
  add("JUMP", [{ legs: 2, bob: -2, crouch: 1 }], { fps: 1, loop: false, tags: ["air"] });
  add("FALL", [{ legs: -2, bob: 0 }], { fps: 1, loop: false, tags: ["air"] });
  add("ATTACK", [
    { weapon: 135, blade: 4, armF: -1, bob: -1 },
    { weapon: 90, blade: 7, armF: 2, slash: true, lean: 1 },
    { weapon: 70, blade: 5, armF: 1, lean: 1 },
  ], { fps: 12, loop: false, events: [{ frame: 1, type: "hit_active" }, { frame: 2, type: "recovery" }], tags: ["combat"] });
  add("PARRY", [
    { weapon: 0, blade: 5, armF: 0, bob: -1 },
    { weapon: 10, blade: 6, slash: true, bob: -1 },
  ], { fps: 14, loop: false, events: [{ frame: 0, type: "parry_window_open" }, { frame: 1, type: "parry_flash" }], tags: ["combat"] });
  add("HURT", [{ flash: true, lean: -1, legs: -1 }], { fps: 8, loop: false, tags: ["hit-reaction"] });
  add("DEATH", [{ kneel: false, flash: true, bob: 1 }, { kneel: true }], { fps: 4, loop: false, tags: ["hit-reaction"] });

  return { files, defs };
}

/** Creature (enemy) pack — FSM-matched anims (§5 AI states). */
export function enemyAnimPack(pal: ForgePalette, col: CharacterColors): { files: Record<string, Uint8Array>; defs: Record<string, AnimDef> } {
  const files: Record<string, Uint8Array> = {};
  const defs: Record<string, AnimDef> = {};
  const danger = hexRGB(col.danger ?? "#e5484d");

  const body = (frame: number, opts: { squat?: number; lunge?: number; tint?: RGB; rise?: number } = {}) => {
    const size = 16;
    const p = new Px(size, size);
    const outline: RGB = [18, 12, 16];
    const cx = Math.floor(size / 2);
    const rise = opts.rise ?? 0;
    const lunge = opts.lunge ?? 0;
    const color = opts.tint ?? danger;
    p.circle(cx + lunge, 9 + rise, 5, color);
    p.circle(cx + lunge, 11 + rise, 3, sh(color, 0.55));
    p.line(cx - 4 + lunge, 4 + rise, cx - 5 + lunge, 1 + rise, [230, 220, 200]);
    p.line(cx + 4 + lunge, 4 + rise, cx + 5 + lunge, 1 + rise, [230, 220, 200]);
    p.set(cx - 2 + lunge, 8 + rise, [255, 240, 90]);
    p.set(cx + 2 + lunge, 8 + rise, [255, 240, 90]);
    p.rect(cx - 4 + lunge, 13, 2, 2 - (opts.squat ?? 0), sh(color, 0.55));
    p.rect(cx + 2 + lunge, 13, 2, 2 - (opts.squat ?? 0), sh(color, 0.55));
    void frame;
    const snap = new Uint8Array(p.data);
    const has = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && (snap[(y * size + x) * 4 + 3] ?? 0) > 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (!has(x, y) && (has(x + 1, y) || has(x - 1, y) || has(x, y + 1) || has(x, y - 1))) p.set(x, y, outline);
    }
    return encodePNG(size, size, p.data);
  };

  const add = (name: string, list: Uint8Array[], def: Omit<AnimDef, "frames" | "pivot">) => {
    list.forEach((bytes, i) => { files[`assets/anims/enemy/${name}_${i}.png`] = bytes; });
    defs[name] = { ...def, frames: list.length, pivot: [8, 16] };
  };

  add("IDLE", [body(0, { rise: 0 }), body(1, { rise: -1 })], { fps: 2, loop: true, tags: ["ai"] });
  add("PATROL", [body(0), body(1, { squat: 1 }), body(2), body(3, { squat: 1 })], { fps: 6, loop: true, tags: ["ai"] });
  add("TELEGRAPH", [body(0, { tint: [255, 120, 110], squat: 1, rise: 1 }), body(1, { tint: [255, 150, 130], squat: 2 })], { fps: 6, loop: false, events: [{ frame: 0, type: "telegraph_start" }], tags: ["ai", "combat"] });
  add("ATTACK", [body(0, { lunge: 2 }), body(1, { lunge: 3, tint: [255, 160, 140] })], { fps: 10, loop: false, events: [{ frame: 0, type: "hit_active" }], tags: ["ai", "combat"] });
  add("STAGGER", [body(0, { tint: [255, 255, 255], rise: -1 })], { fps: 8, loop: false, tags: ["hit-reaction"] });
  add("DEATH", [body(0, { squat: 2, rise: -2 })], { fps: 6, loop: false, tags: ["hit-reaction"] });

  return { files, defs };
}

/** Boss pack — idle hover, windup, attack slam. */
export function bossAnimPack(pal: ForgePalette, col: CharacterColors): { files: Record<string, Uint8Array>; defs: Record<string, AnimDef> } {
  const files: Record<string, Uint8Array> = {};
  const defs: Record<string, AnimDef> = {};
  const robe = hexRGB(col.main);
  const paint = (opts: { rise?: number; spread?: number; glow?: boolean; slam?: boolean }) => {
    const size = 24;
    const p = new Px(size, size);
    const cx = size / 2;
    const rise = opts.rise ?? 0;
    const spread = opts.spread ?? 8;
    p.circle(Math.floor(cx), 13 + rise, spread, robe);
    p.circle(Math.floor(cx), 16 + rise, spread - 3, sh(robe, 0.6));
    p.rect(6, 10 + rise, 12, 2, sh(robe, 1.25));
    p.set(Math.floor(cx) - 3, 9 + rise, [255, 236, 130]);
    p.set(Math.floor(cx) + 3, 9 + rise, [255, 236, 130]);
    p.line(8, 6 + rise, 6, 2 + rise, [160, 130, 220]);
    p.line(16, 6 + rise, 18, 2 + rise, [160, 130, 220]);
    if (opts.glow) { p.set(4, 20, [200, 235, 255], 200); p.set(19, 20, [200, 235, 255], 200); }
    if (opts.slam) { p.rect(2, 21, 20, 2, [255, 220, 140], 180); }
    return encodePNG(size, size, p.data);
  };
  const add = (name: string, list: Uint8Array[], def: Omit<AnimDef, "frames" | "pivot">) => {
    list.forEach((bytes, i) => { files[`assets/anims/boss/${name}_${i}.png`] = bytes; });
    defs[name] = { ...def, frames: list.length, pivot: [12, 24] };
  };
  add("IDLE", [paint({ rise: 0, glow: true }), paint({ rise: -1, glow: true }), paint({ rise: 1 })], { fps: 3, loop: true, tags: ["boss"] });
  add("WINDUP", [paint({ rise: -2, spread: 7 }), paint({ rise: -3, spread: 6, glow: true })], { fps: 6, loop: false, events: [{ frame: 1, type: "pattern_start" }], tags: ["boss", "combat"] });
  add("ATTACK", [paint({ rise: 1, spread: 9, slam: true }), paint({ rise: 2, spread: 10, slam: true })], { fps: 8, loop: false, events: [{ frame: 0, type: "hit_active" }], tags: ["boss", "combat"] });
  return { files, defs };
}
