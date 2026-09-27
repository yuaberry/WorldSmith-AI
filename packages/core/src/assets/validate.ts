/**
 * Asset validation (§13) — technical gate before an asset enters a game.
 * Decodes every generated PNG and enforces: integrity, dimensions, alpha,
 * non-emptiness, frame-consistency (§2: no character changing shape between
 * frames) and duplicate detection. Failures produce an honest report —
 * scaffold aborts recoverably instead of shipping broken art.
 */
import { type ValidationReport } from "./manifestTypes";

export interface PngInfo { w: number; h: number; rgba: Uint8Array }

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Minimal PNG decoder (8-bit truecolor/RGBA) for validation. */
export function decodePNG(bytes: Uint8Array): PngInfo | null {
  if (bytes.length < 16) return null;
  if (bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) return null;
  let off = 8;
  let w = 0, h = 0, channels = 0;
  const idat: Uint8Array[] = [];
  while (off + 12 <= bytes.length) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset + off);
    const len = dv.getUint32(0);
    const type = String.fromCharCode(bytes[off + 4]!, bytes[off + 5]!, bytes[off + 6]!, bytes[off + 7]!);
    const data = bytes.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      const hdv = new DataView(data.buffer, data.byteOffset);
      w = hdv.getUint32(0); h = hdv.getUint32(4);
      if (data[8] !== 8 || (data[9] !== 6 && data[9] !== 2)) return null;
      channels = data[9] === 6 ? 4 : 3;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") break;
    // integrity: CRC must match (dv is already offset at `off`)
    const stored = dv.getUint32(8 + len);
    const chunkCrc = crc32(bytes.subarray(off + 4, off + 8 + len));
    if (stored !== chunkCrc) return null;
    off += 12 + len;
  }
  if (!w || !h || idat.length === 0) return null;
  const total = idat.reduce((a, b) => a + b.length, 0);
  const zipped = new Uint8Array(total);
  let zi = 0;
  for (const part of idat) { zipped.set(part, zi); zi += part.length; }
  let raw: Uint8Array;
  try {
    const { unzlibSync } = require("fflate") as typeof import("fflate");
    raw = unzlibSync(zipped);
  } catch { return null; }
  const stride = w * channels;
  if (raw.length < (stride + 1) * h) return null;
  const rgba = new Uint8Array(w * h * 4);
  const prev = new Uint8Array(stride);
  const cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const rowStart = y * (stride + 1);
    const filter = raw[rowStart]!;
    cur.set(raw.subarray(rowStart + 1, rowStart + 1 + stride));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels]! : 0;
      const b = prev[x]!;
      const cc = x >= channels ? prev[x - channels]! : 0;
      let v = cur[x]!;
      if (filter === 1) v = (v + a) & 0xff;
      else if (filter === 2) v = (v + b) & 0xff;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const pp = a + b - cc;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - cc);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : cc)) & 0xff;
      }
      cur[x] = v;
    }
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      rgba[i] = cur[x * channels]!; rgba[i + 1] = cur[x * channels + 1]!; rgba[i + 2] = cur[x * channels + 2]!;
      rgba[i + 3] = channels === 4 ? cur[x * channels + 3]! : 255;
    }
    prev.set(cur);
  }
  return { w, h, rgba };
}

/** Pixel-difference ratio between two same-size frames (alpha-aware). */
export function frameDiff(a: PngInfo, b: PngInfo): number | null {
  if (a.w !== b.w || a.h !== b.h) return null;
  let diff = 0;
  for (let i = 0; i < a.rgba.length; i += 4) {
    const d =
      Math.abs(a.rgba[i]! - b.rgba[i]!) + Math.abs(a.rgba[i + 1]! - b.rgba[i + 1]!) +
      Math.abs(a.rgba[i + 2]! - b.rgba[i + 2]!) + Math.abs(a.rgba[i + 3]! - b.rgba[i + 3]!);
    if (d > 40) diff++;
  }
  return diff / (a.w * a.h);
}

export interface AssetExpectation {
  path: string;
  minDim: number;
  maxDim: number;
  requireAlpha: boolean;
  animated?: boolean;
}

/**
 * Validates generated sprites: integrity, dims, alpha, non-empty,
 * frame consistency (§2) and duplicates. Returns a structured report.
 */
export function validateAssets(files: Record<string, Uint8Array>, expectations: AssetExpectation[]): ValidationReport {
  const issues: string[] = [];
  const warnings: string[] = [];
  const checked = new Set<string>();
  const seen = new Map<string, string>();

  for (const exp of expectations) {
    const bytes = files[exp.path];
    if (!bytes) { issues.push(`MISSING: ${exp.path}`); continue; }
    const info = decodePNG(bytes);
    if (!info) { issues.push(`CORRUPT/UNDECODABLE: ${exp.path}`); continue; }
    if (info.w < exp.minDim || info.h < exp.minDim) issues.push(`DIM: ${exp.path} is ${info.w}x${info.h}, min expected ${exp.minDim}`);
    if (info.w > exp.maxDim) issues.push(`DIM: ${exp.path} exceeds ${exp.maxDim}px (${info.w}x${info.h})`);
    // alpha presence for characters
    let alphaPixels = 0, opaque = 0, colored = 0;
    for (let i = 0; i < info.rgba.length; i += 4) {
      const a = info.rgba[i + 3]!;
      if (a === 0) alphaPixels++;
      else { opaque++; if (info.rgba[i]! + info.rgba[i + 1]! + info.rgba[i + 2]! > 30) colored++; }
    }
    const total = info.w * info.h;
    if (exp.requireAlpha && alphaPixels / total < 0.2) issues.push(`ALPHA: ${exp.path} has almost no transparency (${(100 * alphaPixels / total).toFixed(0)}%)`);
    if (colored / total < 0.02) issues.push(`EMPTY: ${exp.path} is visually empty`);
    // duplicate detection
    const key = `${info.w}x${info.h}:${hash(info.rgba)}`;
    if (seen.has(key) && !exp.path.includes("_")) warnings.push(`DUPLICATE content: ${exp.path} == ${seen.get(key)} (only acceptable across animation frames)`);
    if (!seen.has(key)) seen.set(key, exp.path);
    checked.add(exp.path);
  }

  // Frame consistency (§2): same-base frames must differ slightly (>=2%)
  // but never dramatically — characters must not change identity. Combat and
  // hit-reaction animations legitimately change silhouette (weapon arcs,
  // kneel) so they get a wider-but-still-bounded budget (§4 anim types).
  const COMBAT_OR_REACTION = new Set(["ATTACK", "PARRY", "HURT", "DEATH", "TELEGRAPH", "STAGGER", "WINDUP"]);
  const byBase = new Map<string, PngInfo[]>();
  for (const [path, bytes] of Object.entries(files)) {
    const m = path.match(/^(.*)_([0-9]+)\.png$/);
    if (!m) continue;
    const info = decodePNG(bytes);
    if (info) (byBase.get(m[1]!) ?? byBase.set(m[1]!, []).get(m[1]!)!).push(info);
  }
  for (const [base, frames] of byBase) {
    const animName = base.split("/").pop() ?? "";
    const budget = COMBAT_OR_REACTION.has(animName) ? 0.68 : 0.45;
    for (let i = 1; i < frames.length; i++) {
      const d = frameDiff(frames[0]!, frames[i]!);
      if (d === null) { issues.push(`FRAMES: ${base} frames have different dimensions`); continue; }
      if (d < 0.02) warnings.push(`FRAMES: ${base} frames ${0}-${i} nearly identical — dead animation`);
      if (d > budget) issues.push(`FRAMES: ${base} frame ${i} differs ${Math.round(d * 100)}% from frame 0 (budget ${Math.round(budget * 100)}% for ${animName}) — identity drift (§2 violation)`);
    }
  }

  return { pass: issues.length === 0, issues, warnings, checked: checked.size };
}

function hash(data: Uint8Array): string {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(data.length / 4096));
  for (let i = 0; i < data.length; i += step) {
    h ^= data[i]!;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
