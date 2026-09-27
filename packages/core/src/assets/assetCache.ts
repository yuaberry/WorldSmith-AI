/**
 * Asset reuse system (§18) — content-addressed canonical cache.
 * The same (generator + params) always yields the same bytes: a castle wall
 * referenced 100 times costs ONE generation. Cache lives in
 * ~/.worldsmith/asset-cache keyed by a params hash; the manifest records
 * canonicalOf so regeneration skips identical work and retheme only
 * re-forges what actually changed.
 */
import { dataRoot } from "../util";
import { existsSync, mkdirSync } from "node:fs";

import { join } from "node:path";

const CACHE_DIR = join(dataRoot(), "asset-cache");

/** Stable FNV-1a-ish hash of the generator identity + params. */
export function paramHash(generator: string, params: unknown): string {
  const s = generator + "|" + JSON.stringify(params);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36) + "_" + s.length.toString(36);
}

/**
 * Reuse-or-generate: if the canonical cache holds these exact bytes, reuse
 * them (assets must be byte-identical across regenerations of the same
 * bible anyway — deterministic painters guarantee this; the cache makes it
 * explicit and future-proofs non-deterministic generators like image AI).
 */
export function cachedGenerate(
  generator: string,
  params: Record<string, unknown>,
  produce: () => Uint8Array,
): { bytes: Uint8Array; cached: boolean } {
  const key = paramHash(generator, params);
  const file = join(CACHE_DIR, key + ".bin");
  try {
    if (existsSync(file)) {
      const bytes = new Uint8Array(require("node:fs").readFileSync(file));
      if (bytes.length > 0) return { bytes, cached: true };
    }
  } catch { /* cache miss is fine */ }
  const bytes = produce();
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    require("node:fs").writeFileSync(file, bytes);
  } catch { /* cache write failure is non-fatal */ }
  return { bytes, cached: false };
}

/** Cache stats for reporting/telemetry. */
export function cacheStats(): { files: number; bytes: number } {
  try {
    const files = require("node:fs").readdirSync(CACHE_DIR) as string[];
    let bytes = 0;
    for (const f of files) {
      try { bytes += require("node:fs").statSync(join(CACHE_DIR, f)).size; } catch { /* skip */ }
    }
    return { files: files.length, bytes };
  } catch {
    return { files: 0, bytes: 0 };
  }
}
