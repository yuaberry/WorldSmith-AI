/** Small utilities: ids, paths, time, fs helpers. */
import { mkdirSync, existsSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function uid(prefix = ""): string {
  const raw = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return prefix ? `${prefix}_${raw}` : raw;
}

export function now(): string {
  return new Date().toISOString();
}

/**
 * Root data dir: ~/.worldsmith (never inside repo).
 *
 * MIGRATION (Nexus Forge → WorldSmith AI, v0.10.0): on first call, if the old
 * ~/.nexusforge exists and the new dir doesn't, it is renamed atomically
 * (same filesystem). Idempotent; falls back to the old dir if the rename
 * is impossible (e.g. held by another process) so nothing is ever lost.
 */
export function dataRoot(): string {
  const home = homedir();
  const oldDir = join(home, ".nexusforge");
  const dir = join(home, ".worldsmith");
  if (!existsSync(dir) && existsSync(oldDir)) {
    try {
      renameSync(oldDir, dir);
      console.warn("[worldsmith] migrated data dir ~/.nexusforge → ~/.worldsmith (one-time).");
    } catch (e) {
      console.warn(`[worldsmith] could not migrate data dir (${e instanceof Error ? e.message : String(e)}); using ~/.nexusforge.`);
      return oldDir;
    }
  }
  return dir;
}

export function projectsRoot(): string {
  return join(dataRoot(), "projects");
}

export function ensureDirs(...paths: string[]): void {
  for (const p of paths) mkdirSync(p, { recursive: true });
}
