/**
 * Props Painters v2 — studio-grade pixel art for the four small slots that
 * were still pre-v2: checkpoint (bonfire), pickup (ability orb), shard
 * (collectible crystal), glow (VFX radial).
 *
 * Same discipline as hero/creature/env v2: hue-shifted ramps, sel-out
 * outlines, rim light, dithered gradients, per-frame motion that stays
 * inside anti-drift budgets (§13 validate.ts).
 */
import { Px, encodePNG, type RGB } from "./spriteForge";
import { ramp, rimlight, selout, dither } from "./pixelRamp";

function hex(h: string): RGB {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

/** Shared sel-out outline pass (same as creaturePainters). */
function outline(p: Px, size: number): void {
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
    return [40, 40, 60];
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!has(x, y) && (has(x + 1, y) || has(x - 1, y) || has(x, y + 1) || has(x, y - 1))) {
      p.set(x, y, selout(near(x, y)));
    }
  }
}

// ── CHECKPOINT — stone basin bonfire (16x16, 3-frame FLAME) ──────────────────

export function paintCheckpointV2(frame: number, warm = "#ff8c3a", stoneHex = "#5c6480", size = 16): Uint8Array {
  const p = new Px(size, size);
  const ST = ramp(hex(stoneHex), 5);
  const FL = ramp(hex(warm), 5);          // hue-shifted fire ramp: deep red → hot yellow
  const HOT: RGB = [255, 246, 190];       // near-white core
  const COAL = FL[0]!;
  const cx = size / 2;
  const sway = [-1, 0, 1][frame % 3] ?? 0;
  const flameH = [7, 8, 6][frame % 3] ?? 7;

  p.rect(cx - 6, size - 2, 12, 1, [10, 11, 18], 120);  // contact shadow

  // stone basin: beveled ring — rim light on top, AO inside the lip
  p.rect(3, 11, 10, 4, ST[2]!);
  p.rect(3, 11, 10, 1, rimlight(ST[2]!));              // top bevel catch
  p.rect(3, 14, 10, 1, ST[0]!);                        // under-shade
  p.rect(4, 12, 8, 2, ST[0]!);                         // coal bed recess (AO)
  p.set(3, 14, ST[1]!); p.set(12, 14, ST[1]!);         // corner knocks
  // structured cracks (not noise — 2 reads max)
  p.set(4, 13, ST[0]!, 200); p.set(11, 12, ST[0]!, 180);
  // coal bed: banked embers glowing through
  p.rect(5, 12, 6, 1, COAL);
  p.set(6, 12, FL[1]!, 220); p.set(9, 12, FL[1]!, 220);

  // flame: layered silhouette — outer ramp → mid → hot core, sway per frame
  for (let y = 0; y < flameH; y++) {
    const t = y / Math.max(1, flameH - 1);             // 0 = tip, 1 = base
    const w = Math.max(1, Math.round(2 + t * 5));
    const x0 = Math.round(cx - w / 2) + (y < 3 ? sway : Math.round(sway / 2));
    const fy = 11 - y;
    p.rect(x0, fy, w, 1, y < 2 ? FL[1]! : y < 4 ? FL[2]! : FL[3]!);
  }
  // hot core hugging the base (light lives low in a real fire)
  p.rect(Math.round(cx - 1) + Math.round(sway / 2), 10, 2, 2, FL[4]!);
  p.set(Math.round(cx) + sway, 8, HOT, 230);
  // embers rising — the motion cue that sells "alive"
  const embers: Array<[number, number, number]> = [
    [cx - 3, 7, 235], [cx + 2, 5, 255], [cx - 1, 3, 200],
  ];
  for (let i = 0; i < embers.length; i++) {
    const [ex, ey, ea] = embers[(i + frame) % embers.length]!;
    p.set(Math.round(ex) + sway * ((i + frame) % 2), Math.round(ey - frame), FL[4]!, Math.max(120, ea - frame * 45));
  }
  // warm light spill onto the stone lip (fire lights its own pedestal)
  p.set(4, 11, FL[3]!, 70); p.set(11, 11, FL[3]!, 70);
  p.set(3, 12, FL[2]!, 50); p.set(12, 12, FL[2]!, 50);

  outline(p, size);
  return encodePNG(size, size, p.data);
}

// ── PICKUP — ability orb (14x14, 2-frame PULSE) ───────────────────────────────

export function paintPickupV2(frame: number, coreHex = "#22d3ee", size = 14): Uint8Array {
  const p = new Px(size, size);
  const S = ramp(hex(coreHex), 5);
  const HOT: RGB = [235, 255, 255];
  const cx = Math.floor(size / 2), cy = Math.floor(size / 2);
  const r = frame % 2 === 0 ? 5 : 6;                   // pulse: halo breathes

  p.rect(cx - 5, size - 2, 10, 1, [10, 11, 18], 110); // contact shadow

  // dithered halo — checkerboard fade so the edge is soft, not aliased
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y);
    if (d <= r && d > r - 2) {
      p.set(cx + x, cy + y, dither(S[2]!, S[1]!, cx + x, cy + y), (x + y) % 2 === 0 ? 150 : 70);
    }
  }
  // orb body: shaded sphere — shadow bottom-left, light top-right
  p.circle(cx, cy, 4, S[1]!);
  p.circle(cx + 1, cy - 1, 3, S[3]!);
  p.circle(cx, cy, 2, S[2]!);
  p.set(cx + 1, cy - 2, HOT);                          // specular
  p.set(cx + 2, cy - 2, HOT, 200);
  // inner glyph line — reads as "ability" (a rune seam through the core)
  p.line(cx - 1, cy + 1, cx + 1, cy - 1, S[4]!, 180);
  // orbiting rune sparks — rotate with the pulse frame
  if (frame % 2 === 0) { p.set(cx - 3, cy - 3, S[4]!, 235); p.set(cx + 3, cy + 3, S[4]!, 235); }
  else { p.set(cx - 4, cy, S[4]!, 220); p.set(cx + 4, cy, S[4]!, 220); p.set(cx, cy - 4, S[4]!, 220); }

  outline(p, size);
  return encodePNG(size, size, p.data);
}

// ── SHARD — faceted collectible crystal (12x12, 4-frame PULSE) ────────────────

export function paintShardV2(frame: number, gemHex = "#7dd3fc", size = 12): Uint8Array {
  const p = new Px(size, size);
  const G = ramp(hex(gemHex), 5);
  const SPARK: RGB = [255, 255, 255];
  const cx = size / 2;

  p.rect(cx - 4, size - 2, 8, 1, [10, 11, 18], 100);   // contact shadow

  // main crystal: three facet planes + bright crown facet
  for (let y = 0; y < 8; y++) {
    const w = y < 3 ? 2 + y : 8 - (y - 3);            // diamond silhouette
    const x0 = Math.round(cx - w / 2);
    const fy = y + 1;
    // left plane (shadow), right plane (light), center seam
    p.rect(x0, fy, w, 1, G[1]!);
    p.rect(x0 + Math.ceil(w * 0.45), fy, Math.floor(w * 0.55), 1, G[3]!);
    p.rect(x0 + Math.ceil(w / 2) - 1, fy, 1, 1, G[2]!);   // center seam
    if (y < 3) p.rect(x0 + Math.floor(w / 2), fy, 1, 1, rimlight(G[3]!)); // crown catch
  }
  // crown facet — the brightest read at the very top
  p.rect(Math.round(cx) - 1, 1, 2, 1, G[4]!);
  // inner glow seam: light trapped in the crystal (accents pulse per frame)
  const pulse = [1.0, 1.18, 1.0, 0.86][frame % 4] ?? 1.0;
  const seamA = Math.round(120 + (pulse - 0.8) * 300);
  p.line(Math.round(cx), 2, Math.round(cx), 8, G[4]!, Math.max(90, Math.min(235, seamA)));
  // foot cluster: two child shards grounded beside the main one
  p.line(2, 10, 3, 8, G[2]!, 220); p.line(9, 10, 8, 8, G[3]!, 220);
  // sparkle orbits the crown across frames — the collectible "shine"
  const sp: Array<[number, number]> = [[Math.round(cx) - 2, 0], [Math.round(cx) + 3, 2], [Math.round(cx) + 1, 5], [Math.round(cx) - 3, 3]];
  const [sx, sy] = sp[frame % 4]!;
  p.set(sx, sy, SPARK, 235);
  p.set(sx + 1, sy, SPARK, 140);

  outline(p, size);
  return encodePNG(size, size, p.data);
}

// ── GLOW — radial VFX with dithered falloff (32x32, 3-frame BEAT) ─────────────

export function paintGlowV2(frame: number, accentHex = "#22d3ee", size = 32): Uint8Array {
  const p = new Px(size, size);
  const S = ramp(hex(accentHex), 5);
  const CORE: RGB = [255, 255, 244];
  const cx = size / 2;
  const beat = 1 + 0.10 * Math.sin((frame / 3) * Math.PI * 2);  // subtle: stays in budget

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x - cx + 0.5, y - cx + 0.5) / (size / 2);
    if (d >= 1) continue;
    // three-zone falloff: hot core → accent mid → deep ring, dithered at seams
    let c: RGB, a: number;
    if (d < 0.28 * beat) { c = CORE; a = 255; }
    else if (d < 0.55 * beat) { c = S[3]!; a = 220; }
    else { c = S[1]!; a = Math.round(200 * Math.pow(Math.max(0, 1 - d), 1.6)); }
    p.set(x, y, c, a);
    // dither the ring seams — 2x2 checker between zones (§4 dither rule)
    const seam = Math.abs(d - 0.28 * beat) < 0.045 || Math.abs(d - 0.55 * beat) < 0.045;
    if (seam && (x + y) % 2 === 1) p.set(x, y, S[2]!, Math.round(a * 0.8));
  }
  return p.png();
}
