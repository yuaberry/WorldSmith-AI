/**
 * Creature / Boss / NPC painters v2 — studio-grade, sharing the pixelRamp
 * color science. Same canonical body per character across poses (§2).
 */
import { Px, encodePNG, type RGB } from "./spriteForgeHelpers";
import { ramp, selout, rimlight } from "./pixelRamp";

function hex(h: string): RGB {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

export interface CreatureOpts { tint?: RGB; lunge?: number; rise?: number; squat?: number; glow?: boolean }

/** Wraith 24x24 — hunched imp, curved horns, glowing eyes, clawed feet. */
export function paintCreatureV2(frame: number, danger: string, size = 24, opts: CreatureOpts = {}): Uint8Array {
  const p = new Px(size, size);
  const S = ramp(hex(danger), 5);
  const HORN = ramp([235, 225, 205], 3);
  const EYEB = [255, 240, 120] as RGB;
  const cx = size / 2;
  const rise = opts.rise ?? [0, -1, 1][frame % 3] ?? 0;
  const lunge = opts.lunge ?? 0;
  const body = opts.tint ?? S[2]!;
  const belly = opts.tint ? [cl(opts.tint[0] * 0.6), cl(opts.tint[1] * 0.6), cl(opts.tint[2] * 0.6)] as RGB : S[0]!;
  const by = 9 + rise;

  p.rect(cx - 8, size - 2, 16, 1, [10, 11, 18], 110); // contact shadow
  // body: asymmetric hunch (right shoulder higher — hostile read)
  for (let y = 0; y < 10; y++) {
    const w = Math.max(3, Math.round((9 - y) * 0.9 + 3));
    p.rect(cx - w / 2 + lunge, by + y, w, 1, y < 3 ? body : belly);
  }
  p.rect(cx - 3 + lunge, by + 3, 4, 1, rimlight(body));   // rim light shoulder
  // curved horns
  p.line(cx - 4 + lunge, by - 1, cx - 6 + lunge, by - 5, HORN[2]!);
  p.set(cx - 6 + lunge, by - 6, HORN[2]!);
  p.line(cx + 4 + lunge, by - 1, cx + 6 + lunge, by - 5, HORN[1]!);
  p.set(cx + 6 + lunge, by - 6, HORN[2]!);
  // face: sunken eyes glow (2px each), jagged maw
  p.set(cx - 3 + lunge, by + 3, EYEB);
  p.set(cx - 2 + lunge, by + 3, EYEB);
  p.set(cx + 2 + lunge, by + 3, EYEB);
  p.set(cx + 3 + lunge, by + 3, EYEB);
  p.set(cx - 1 + lunge, by + 6, S[4]!, 220);
  p.set(cx + 1 + lunge, by + 7, S[4]!, 180);
  // clawed feet
  const fy = size - 4;
  p.rect(cx - 5 + lunge, fy, 2, 2, belly);
  p.rect(cx + 3 + lunge, fy, 2, 2, belly);
  p.set(cx - 6 + lunge, fy + 2, belly);
  p.set(cx + 5 + lunge, fy + 2, belly);

  outline(p, size);
  return encodePNG(size, size, p.data);
}

/** Boss 32x32 — towering sovereign: crown, layered robes, shoulder spikes. */
export function paintBossV2(frame: number, main: string, trim: string, size = 32, opts: CreatureOpts = {}): Uint8Array {
  const p = new Px(size, size);
  const S = ramp(hex(main), 5);
  const TR = ramp(hex(trim), 4);
  const EYE = [255, 240, 150] as RGB;
  const cx = size / 2;
  const rise = opts.rise ?? [0, -1, 1][frame % 3] ?? 0;
  const glow = opts.glow ?? true;
  const by = 10 + rise;

  p.rect(cx - 12, size - 2, 24, 1, [10, 11, 18], 130);
  // robe: layered with vertical fold shading
  for (let y = 0; y < 18; y++) {
    const t = y / 17;
    const w = Math.round(10 + t * 8);
    const shade = y < 4 ? S[3]! : y < 10 ? S[2]! : S[1]!;
    p.rect(cx - w / 2, by + y, w, 1, shade);
  }
  // fold lines (structured robe — not noise)
  p.line(cx - 3, by + 6, cx - 4, by + 16, S[0]!, 190);
  p.line(cx + 4, by + 5, cx + 5, by + 15, S[0]!, 190);
  p.line(cx - 1, by + 8, cx - 1, by + 17, S[0]!, 150);
  // pauldrons + spikes
  p.rect(cx - 11, by - 1, 5, 4, S[3]!);
  p.rect(cx + 6, by - 1, 5, 4, S[2]!);
  p.set(cx - 12, by - 2, TR[2]!); p.set(cx - 13, by - 3, TR[3]!);
  p.set(cx + 11, by - 2, TR[2]!); p.set(cx + 12, by - 3, TR[3]!);
  p.rect(cx - 11, by - 1, 5, 1, rimlight(S[3]!));
  // head: hooded void with crown
  p.rect(cx - 4, by - 6, 8, 6, S[1]!);
  p.rect(cx - 4, by - 6, 8, 1, S[3]!);
  // crown of horned spires
  p.line(cx - 3, by - 7, cx - 4, by - 10, TR[3]!);
  p.line(cx + 3, by - 7, cx + 4, by - 10, TR[3]!);
  p.line(cx, by - 7, cx, by - 11, TR[3]!);
  // burning eyes (canonical)
  p.set(cx - 2, by - 3, EYE); p.set(cx - 1, by - 3, EYE, 200);
  p.set(cx + 1, by - 3, EYE); p.set(cx + 2, by - 3, EYE, 200);
  if (glow) {
    p.set(cx - 3, by - 4, EYE, 120);
    p.set(cx + 3, by - 4, EYE, 120);
  }

  outline(p, size);
  return encodePNG(size, size, p.data);
}

/** Keeper NPC 24x24 — lantern-lit hooded figure with robe folds. */
export function paintNpcV2(frame: number, main: string, size = 24): Uint8Array {
  const p = new Px(size, size);
  const S = ramp(hex(main), 5);
  const LANTERN = [255, 214, 130] as RGB;
  const cx = size / 2;
  const sway = frame % 2;
  const by = 8;

  p.rect(cx - 7, size - 2, 14, 1, [10, 11, 18], 110);
  // robe with folds
  for (let y = 0; y < 14; y++) {
    const t = y / 13;
    const w = Math.round(5 + t * 4);
    p.rect(cx - w / 2 + (sway === 1 && y > 7 ? 1 : 0), by + y, w, 1, y < 3 ? S[3]! : y < 9 ? S[2]! : S[1]!);
  }
  p.line(cx - 2, by + 4, cx - 3, by + 13, S[0]!, 200);
  p.line(cx + 3, by + 3, cx + 4, by + 12, S[0]!, 170);
  // hood with face shadow
  p.rect(cx - 4, by - 4, 8, 5, S[3]!);
  p.rect(cx - 3, by - 1, 6, 2, S[0]!);
  p.set(cx - 2, by, LANTERN, 230); // faint lit eyes
  p.set(cx + 1, by, LANTERN, 230);
  p.set(cx + 3, by - 4, rimlight(S[3]!), 190);
  // held lantern (interactable highlight §9)
  const lx = cx + 6;
  p.line(cx + 3, by + 6, lx, by + 8, S[0]!);
  p.rect(lx - 1, by + 8, 3, 4, S[1]!);
  p.rect(lx, by + 9, 1, 2, LANTERN);
  p.set(lx, by + 7, LANTERN, 200);
  p.set(lx + 2, by + 8, LANTERN, 160);

  outline(p, size);
  return encodePNG(size, size, p.data);
}

/** Shared sel-out outline pass. */
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
