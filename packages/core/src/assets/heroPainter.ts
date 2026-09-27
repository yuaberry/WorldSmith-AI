/**
 * Hero painter v2 — studio-grade 24x24 pixel art.
 * Hue-shifted 5-tone armor ramp, flowing cloak with real folds, hood,
 * glowing sword with rim light, sel-out outlines, contact shadow.
 * Same canonical body across ALL poses (§2 by construction): params move
 * limbs/cloth/weapon only — identity cannot drift.
 */
import { Px, encodePNG, type RGB } from "./spriteForgeHelpers";
import { ramp, selout, rimlight } from "./pixelRamp";

export interface HeroColors { main: string; trim: string; skin: string; eye: string }
export interface HeroPose {
  legs?: number; bob?: number; armF?: number; weapon?: number; blade?: number;
  lean?: number; crouch?: number; tint?: number; flash?: boolean; kneel?: boolean; slash?: boolean;
  /** cloak sway phase 0..3 */
  cloth?: number;
}

function hex(h: string): RGB {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export function paintHeroV2(pose: HeroPose, col: HeroColors, size = 24): Uint8Array {
  const p = new Px(size, size);
  const S = ramp(hex(col.main), 5);            // armor ramp (hue-shifted)
  const TR = ramp(hex(col.trim), 4);           // trim/cloak ramp
  const SK = ramp(hex(col.skin), 3);
  const EYE = hex(col.eye);

  const legs = pose.legs ?? 0;
  const bob = pose.bob ?? 0;
  const lean = pose.lean ?? 0;
  const crouch = pose.crouch ?? 0;
  const cloth = pose.cloth ?? 0;
  const cx = size / 2;
  const baseY = size - 3;
  const tintF = (c: RGB, f = 1): RGB => pose.flash
    ? [Math.min(255, c[0]! + 130), Math.min(255, c[1]! + 120), Math.min(255, c[2]! + 105)]
    : [clamp(c[0]! * f), clamp(c[1]! * f), clamp(c[2]! * f)];
  const T = (i: number, f = 1) => tintF(S[i]!, f);
  const C = (i: number, f = 1) => tintF(TR[i]!, f);
  const K = (i: number, f = 1) => tintF(SK[i]! as RGB, f);

  // contact shadow (grounding — pro readability)
  if (!pose.kneel) {
    p.rect(cx - 7, size - 2, 14, 1, [10, 11, 18], 120);
  }

  if (pose.kneel) {
    // DEATH collapse: body over blade, cloak pooling
    p.rect(cx - 8, baseY - 3, 13, 3, C(1));
    p.rect(cx + 1, baseY - 5, 6, 2, C(0));
    p.circle(cx + 6, baseY - 7, 2, K(2));
    p.line(cx - 8, baseY - 1, cx + 4, baseY - 8, TR[3]!);
    p.set(cx + 6, baseY - 8, EYE, 200);
  } else {
    const legY = baseY - 4 + crouch;
    // boots
    p.rect(cx - 5 + legs + lean, legY, 3, 4 - crouch, T(0));
    p.rect(cx + 2 - legs + lean, legY, 3, 4 - crouch, T(0));
    p.rect(cx - 5 + legs + lean, legY, 3, 1, T(1));
    p.rect(cx + 2 - legs + lean, legY, 3, 1, T(1));
    // legs
    p.rect(cx - 4 + legs + lean, legY - 4, 3, 4, T(1));
    p.rect(cx + 1 - legs + lean, legY - 4, 3, 4, T(0));
    // torso: 3-tone lit from upper-left
    const ty = 9 + bob;
    p.rect(cx - 4 + lean, ty, 8, baseY - 8 - ty, T(2));
    p.rect(cx - 4 + lean, ty, 8, 1, T(3));
    p.rect(cx - 4 + lean, ty, 1, baseY - 8 - ty, T(3));
    p.rect(cx + 3 + lean, ty, 1, baseY - 8 - ty, T(1));
    // belt
    p.rect(cx - 4 + lean, baseY - 8, 8, 1, TR[2]!);
    // chest emblem (trim)
    p.set(cx - 1 + lean, ty + 2, TR[3]!);
    p.set(cx + lean, ty + 2, TR[3]!);
    p.set(cx - 1 + lean, ty + 3, TR[2]!);
    // CLOAK: flowing behind with cloth-phase folds (the signature upgrade)
    const sway = [-1, 0, 1, 0][cloth % 4] ?? 0;
    const cb = ty + 1;
    p.rect(cx - 7 + lean - sway, cb, 3, baseY - 6 - cb, C(1));
    p.rect(cx - 7 + lean - sway, cb, 3, 1, C(2));
    p.rect(cx - 7 + lean - sway, baseY - 6, 3, 1, C(0));
    p.rect(cx - 8 + lean - sway, cb + 3, 2, 2, C(0));
    p.set(cx - 6 + lean - sway, cb + 2, C(3)); // rim-lit fold
    // arms
    const armF = pose.armF ?? 0;
    p.rect(cx - 6 + lean, ty + 2, 2, 4, T(1));
    p.rect(cx + 4 + lean + armF, ty + 2, 2, 4, T(2));
    p.set(cx + 4 + lean + armF, ty + 2, T(3));
    // head + hood (canonical: eyes are 2px, canonical eye color)
    const hy = 5 + bob;
    p.rect(cx - 3 + lean, hy - 2, 6, 2, C(2));          // hood top
    p.rect(cx - 4 + lean, hy, 8, 3, C(1));              // hood wrap
    p.rect(cx - 3 + lean, hy + 3, 6, 1, C(0));
    p.rect(cx - 2 + lean, hy + 1, 4, 2, K(2));          // face
    p.set(cx - 1 + lean, hy + 2, tintF(EYE));           // eyes
    p.set(cx + 1 + lean, hy + 2, tintF(EYE));
    p.set(cx + 2 + lean, hy + 1, rimlight(C(1)!), 180); // hood rim light
    // WEAPON: angled blade with glow gradient + guard
    const wa = ((pose.weapon ?? 45) * Math.PI) / 180;
    const bl = pose.blade ?? 5;
    const ox = cx + 5 + lean + armF, oy = ty + 2;
    const dx = Math.round(Math.cos(wa - Math.PI / 2) * bl);
    const dy = Math.round(Math.sin(wa - Math.PI / 2) * bl);
    // glow underblade
    p.line(ox, oy, ox + dx, oy + dy, TR[3]!, 90);
    p.line(ox, oy - 1, ox + dx, oy + dy - 1, rimlight(TR[3]!));
    p.line(ox, oy, ox + dx, oy + dy, TR[3]!);
    p.set(ox, oy, TR[2]!); // guard stud
    if (pose.slash) {
      // impact frame: arc spark in trim+highlight
      p.set(ox + dx + 1, oy + dy, [255, 255, 255], 240);
      p.set(ox + dx + 2, oy + dy - 1, TR[3]!, 220);
      p.set(ox + dx + 1, oy + dy - 2, TR[3]!, 180);
      p.set(ox + dx - 1, oy + dy + 1, TR[3]!, 160);
    }
  }

  // sel-out outline pass (tinted by nearest surface — no dead black)
  const snap = new Uint8Array(p.data);
  const has = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && (snap[(y * size + x) * 4 + 3] ?? 0) > 0;
  const near = (x: number, y: number): RGB => {
    const q: Array<[number, number]> = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [qx, qy] of q) {
      if (qx >= 0 && qy >= 0 && qx < size && qy < size) {
        const i = (qy * size + qx) * 4;
        if ((snap[i + 3] ?? 0) > 0) return [snap[i]!, snap[i + 1]!, snap[i + 2]!];
      }
    }
    return S[0]!;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!has(x, y) && (has(x + 1, y) || has(x - 1, y) || has(x, y + 1) || has(x, y - 1))) {
      p.set(x, y, selout(near(x, y)));
    }
  }
  return encodePNG(size, size, p.data);
}

function clamp(v: number): number { return Math.max(0, Math.min(255, Math.round(v))); }
