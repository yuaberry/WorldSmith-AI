/**
 * gen-icon.ts — renders the WorldSmith AI app icon (256x256 PNG) with the
 * project's own pixel engine (encodePNG — deterministic, no external deps).
 * Motif: the site mark — white outlined diamond + filled center dot over the
 * blue→violet brand gradient, rounded app-icon corners.
 */
import { Px, encodePNG, type RGB } from "../packages/core/src/assets/spriteForge";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const S = 256;
const p = new Px(S, S);
const BLUE: RGB = [79, 124, 255];   // #4f7cff (brand blue)
const VIOLET: RGB = [167, 139, 250]; // #a78bfa (brand violet)
const WHITE: RGB = [255, 255, 255];
const R = 26;                       // rounded-corner radius

const lerp = (a: RGB, b: RGB, t: number): RGB =>
  [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];

// rounded-square mask
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  const dx = Math.min(x, S - 1 - x), dy = Math.min(y, S - 1 - y);
  const inRounded = dx >= R || dy >= R || Math.hypot(R - dx, R - dy) <= R;
  if (!inRounded) continue;
  const t = (x + y) / (2 * (S - 1));            // diagonal gradient (135°)
  let c = lerp(BLUE, VIOLET, t);
  // subtle top-left light / bottom-right depth (app-icon bevel feel)
  const light = (1 - t) * 26;
  c = [Math.min(255, c[0] + light), Math.min(255, c[1] + light), Math.min(255, c[2] + light)];
  p.set(x, y, c);
}

// filled diamond helper (square rotated 45°)
const diamond = (cx: number, cy: number, r: number, c: RGB, a = 255) => {
  for (let dy = -r; dy <= r; dy++) {
    const w = r - Math.abs(dy);
    p.rect(cx - w, cy + dy, w * 2 + 1, 1, c, a);
  }
};

// logo: white diamond ring (outer white, inner gradient) + solid center dot
diamond(128, 128, 96, WHITE);
for (let dy = -70; dy <= 70; dy++) {              // re-cut inner with the local gradient (ring effect)
  const w = 70 - Math.abs(dy);
  for (let x = 128 - w; x <= 128 + w; x++) {
    const t = (x + (128 + dy)) / (2 * (S - 1));
    const light = (1 - t) * 26;
    const c = lerp(BLUE, VIOLET, t);
    p.set(x, 128 + dy, [Math.min(255, c[0] + light), Math.min(255, c[1] + light), Math.min(255, c[2] + light)]);
  }
}
p.circle(128, 128, 34, WHITE);                    // the mark's center dot

// soft outer glow along the rounded edge (readable on any background)
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  const dx = Math.min(x, S - 1 - x), dy = Math.min(y, S - 1 - y);
  const d = (dx >= R || dy >= R) ? 0 : Math.hypot(R - dx, R - dy);
  if (d > R && d < R + 3) p.set(x, y, [90, 120, 255], Math.round(255 * (1 - (d - R) / 3)));
}

mkdirSync(join(import.meta.dir, "..", "docs"), { recursive: true });
writeFileSync(join(import.meta.dir, "..", "docs", "icon.png"), encodePNG(S, S, p.data));
console.log("docs/icon.png written (256x256)");
