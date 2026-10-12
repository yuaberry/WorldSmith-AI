/**
 * gen-icon.ts v2 — the WorldSmith AI application icon (512×512).
 *
 * "A world being forged": a shaded planet (real Lambert sphere lighting),
 * an orbital ring, a forge hammer striking it with sparks, on the brand
 * gradient — rendered by the project's own pixel engine, deterministic.
 * Output: apps/desktop/build/icon.png (the electron-builder source).
 */
import { Px, encodePNG, type RGB } from "../packages/core/src/assets/spriteForge";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const S = 512;
const p = new Px(S, S);
const BLUE: RGB = [79, 124, 255];
const VIOLET: RGB = [167, 139, 250];
const DEEP: RGB = [21, 26, 41];
const DEEP2: RGB = [37, 27, 61];
const WHITE: RGB = [255, 255, 255];
const WARM: RGB = [255, 179, 71];

const lerp = (a: RGB, b: RGB, t: number): RGB =>
  [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];

// ── background: rounded square, diagonal brand gradient, bloom, vignette ────
const R = 96;
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  const dx = Math.min(x, S - 1 - x), dy = Math.min(y, S - 1 - y);
  const inRound = (dx >= R || dy >= R) || Math.hypot(R - dx, R - dy) <= R;
  if (!inRound) continue;
  const t = (x + y) / (2 * (S - 1));
  let c = lerp(DEEP, DEEP2, t);
  const bloom = Math.max(0, 1 - Math.hypot(x - 110, y - 90) / 300) * 22;
  c = [Math.min(255, c[0] + bloom), Math.min(255, c[1] + bloom), Math.min(255, c[2] + bloom * 1.2)];
  const vig = Math.max(0, Math.hypot(x - 256, y - 256) / 400 - 0.62) * 60;
  c = [Math.max(0, c[0] - vig), Math.max(0, c[1] - vig), Math.max(0, c[2] - vig)];
  p.set(x, y, c);
}

// rim light on the rounded edge
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  const dx = Math.min(x, S - 1 - x), dy = Math.min(y, S - 1 - y);
  const d = (dx >= R || dy >= R) ? 0 : Math.hypot(R - dx, R - dy) - R;
  if (d > 0 && d < 3) p.set(x, y, d < 1.5 ? [125, 145, 255] : lerp([70, 90, 220], DEEP, 0.4), d < 1.5 ? 235 : 150);
}

// ── planet: real Lambert sphere shading (light from top-right) ──────────────
const CX = 256, CY = 296, PR = 128;
for (let y = CY - PR; y <= CY + PR; y++) for (let x = CX - PR; x <= CX + PR; x++) {
  const dx = x - CX, dy = y - CY;
  const dist = Math.hypot(dx, dy);
  if (dist > PR) continue;
  // sphere normal + light
  const nz = Math.sqrt(Math.max(0, PR * PR - dist * dist)) / PR;
  const nx = dx / PR, ny = dy / PR;
  const lx = 0.48, ly = -0.62, lz = 0.62; // top-right-front light (normalized-ish)
  const ndl = Math.max(0.18, nx * lx + ny * ly + nz * lz);
  const base = lerp([28, 44, 96], BLUE, ndl);          // ambient→lit ramp
  const hi = ndl > 0.92 ? lerp(base, WHITE, 0.35) : base; // specular bloom cap
  p.set(x, y, hi);
}
// meridians (2 vertical ellipses + equator) — reads "world"
for (let y = CY - PR; y <= CY + PR; y++) {
  const dy = (y - CY) / PR;
  for (const sx of [0.42, -0.42]) {
    const x = Math.round(CX + sx * PR * Math.sqrt(Math.max(0, 1 - dy * dy)));
    p.set(x, y, WHITE, 70);
  }
  if (Math.abs(dy) < 0.03) for (let x = CX - PR + 6; x <= CX + PR - 6; x++) p.set(x, y, WHITE, 90);
}
// terminator edge glow (planet silhouette pops from bg)
for (let a = 0; a < 720; a++) {
  const th = (a / 720) * Math.PI * 2;
  p.set(Math.round(CX + (PR + 2.5) * Math.cos(th)), Math.round(CY + (PR + 2.5) * Math.sin(th)), [120, 150, 255], 90);
}

// ── orbital ring (behind at top, in front at bottom — the "smith's anvil") ───
for (let t = 0; t < 3.14 * 2; t += 0.0025) {
  const rx = PR * 1.65, ry = PR * 0.42;
  const x = CX + rx * Math.cos(t);
  const y = CY + 34 + ry * Math.sin(t) - Math.abs(Math.cos(t)) * 10;
  const front = Math.sin(t) > 0; // bottom half passes in front
  if (y < CY - PR + 8 && !front) continue; // hidden behind planet (top)
  const xi = Math.round(x), yi = Math.round(y);
  const core = front ? WHITE : lerp(VIOLET, WHITE, 0.3);
  p.set(xi, yi, core, front ? 190 : 140);
  p.set(xi + 1, yi, core, front ? 110 : 80);
}

// ── forge hammer: diagonal shaft striking the planet's crown ────────────────
const hx = 350, hy = 128; // head anchor (top-right, above planet)
for (let i = 0; i < 150; i++) { // shaft from lower-left to head
  const x = Math.round(hx - i * 0.85), y = Math.round(hy + i * 0.72);
  p.set(x, y, [148, 158, 178]); p.set(x + 1, y, [98, 106, 126]);
  p.set(x - 1, y, [200, 208, 224], 160);
}
// head: rotated rounded block
for (let yy = -20; yy <= 20; yy++) for (let xx = -34; xx <= 34; xx++) {
  const x = Math.round(hx + xx - yy * 0.35), y = Math.round(hy + yy + xx * 0.18);
  const edge = Math.abs(xx) > 30 || Math.abs(yy) > 16;
  p.set(x, y, edge ? [70, 78, 96] : (xx + yy) % 9 === 0 ? [120, 130, 150] : [168, 178, 198]);
}
// strike sparks at the impact point (head's lower-left corner)
const impactX = hx - 26, impactY = hy + 26;
const sparks: Array<[number, number, number]> = [
  [-30, -18, 255], [-14, -32, 235], [10, -40, 255], [30, -26, 200], [42, -8, 160], [-44, 2, 190],
];
for (const [sx, sy, sa] of sparks) {
  for (let r = 0; r < 3; r++) {
    p.set(Math.round(impactX + sx * 0.8 + r), Math.round(impactY + sy * 0.8), WARM, Math.max(70, sa - r * 40));
  }
  p.set(Math.round(impactX + sx * 0.8 - 2), Math.round(impactY + sy * 0.8 - 2), [255, 240, 200], 140);
}
// motion arc under the head (the swing's ghost)
for (let t = 0; t < 14; t++) {
  const x = Math.round(hx - 60 + t * 6), y = Math.round(hy - 8 + Math.sin(t / 14 * Math.PI) * -16);
  p.set(x, y, WHITE, 60 + t * 4);
}

// ── brand signature: the white diamond + dot (bottom-right) ─────────────────
const dx0 = 404, dy0 = 420, dr = 34;
for (let yy = -dr; yy <= dr; yy++) {
  const w = dr - Math.abs(yy);
  p.rect(dx0 - w, dy0 + yy, w * 2 + 1, 1, WHITE, 235);
}
for (let yy = -dr + 13; yy <= dr - 13; yy++) {
  const w = (dr - 13) - Math.abs(yy);
  const t = (dx0 + (dy0 + yy)) / (2 * (S - 1));
  p.rect(dx0 - w, dy0 + yy, w * 2 + 1, 1, lerp(DEEP, DEEP2, t));
}
p.circle(dx0, dy0, 12, WHITE);

mkdirSync(join(import.meta.dir, "..", "apps", "desktop", "build"), { recursive: true });
writeFileSync(join(import.meta.dir, "..", "apps", "desktop", "build", "icon.png"), encodePNG(S, S, p.data));
console.log("apps/desktop/build/icon.png (512×512) — world being forged");
