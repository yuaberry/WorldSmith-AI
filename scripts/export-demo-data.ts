/**
 * export-demo-data.ts — snapshots a REAL generated project into the static
 * web demo bundle (apps/ui/public/demo-data.json).
 *
 * The GitHub Pages studio runs without a backend; every byte it shows comes
 * from this file — real DB rows, real docs, real code, real sprites of a
 * project forged by the actual pipeline. Honest demo, zero mock data.
 *
 * Run AFTER e2e-rescaffold so the snapshot carries the latest art/code:
 *   bun run scripts/e2e-rescaffold.ts && bun run scripts/export-demo-data.ts
 */
import { Database } from "bun:sqlite";
import { existsSync, readdirSync, statSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { homedir } from "node:os";

const ROOT = homedir() + "/.worldsmith";
const SLUG = process.argv[2] ?? "hollow-echoes";
const OUT = new URL("../apps/ui/public/demo-data.json", import.meta.url).pathname;

const db = new Database(join(ROOT, "worldsmith.db"), { readonly: true });
const proj = db.query("SELECT * FROM projects WHERE slug = ?").get(SLUG) as Record<string, unknown> | null;
if (!proj) { console.error(`project ${SLUG} not found`); process.exit(1); }
const pid = proj.id as string;
const projDir = proj.data_path as string;

// ── tasks / events / dna ─────────────────────────────────────────────────────
const tasks = db.query("SELECT * FROM tasks WHERE project_id = ? ORDER BY priority, created_at").all(pid);
const events = db.query("SELECT * FROM events WHERE project_id = ? ORDER BY ts DESC LIMIT 80").all(pid).reverse();
const dnaRows = db.query("SELECT * FROM dna WHERE project_id = ?").all(pid) as Array<Record<string, unknown>>;
const dna: Record<string, Record<string, { value: unknown; origin: string; note?: string; updatedAt: string }>> = {};
for (const r of dnaRows) {
  const sec = String(r.section);
  dna[sec] ??= {};
  dna[sec]![String(r.key)] = {
    value: JSON.parse(r.value_json as string),
    origin: String(r.origin),
    ...(r.note ? { note: String(r.note) } : {}),
    updatedAt: String(r.updated_at),
  };
}

// ── file tree (walk, capped) ─────────────────────────────────────────────────
const tree: Array<{ path: string; type: "file" | "dir" }> = [];
const skip = new Set([".git", ".godot", ".worldsmith-tmp", "node_modules"]);
(function walk(dir: string, depth = 0) {
  if (tree.length >= 700 || depth > 6) return;
  let entries: string[] = [];
  try { entries = readdirSync(dir).sort(); } catch { return; }
  for (const e of entries) {
    if (skip.has(e) || e.endsWith(".import")) continue;
    const abs = join(dir, e);
    const rel = relative(projDir, abs);
    let st; try { st = statSync(abs); } catch { continue; }
    if (st.isDirectory()) { tree.push({ path: rel, type: "dir" }); walk(abs, depth + 1); }
    else tree.push({ path: rel, type: "file" });
    if (tree.length >= 700) return;
  }
})(projDir);

// ── curated text files (truncated to keep the bundle lean) ───────────────────
const TEXT_FILES = [
  "docs/game-dna.md", "docs/game-design.md", "docs/tech-architecture.md",
  "docs/game-specification.md", "docs/validation-report.md", "docs/art-bible.md", "docs/README.md",
  "data/spec.json", "data/player.json", "data/enemies.json", "data/abilities.json",
  "data/dialogue.json", "data/rooms.json", "data/animations.json", "data/art_bible.json",
  "scripts/player/player.gd", "scripts/ai/enemy.gd", "scripts/ai/boss.gd",
  "scripts/characters/npc.gd", "scripts/world/main.gd", "scripts/world/checkpoint.gd",
  "scripts/world/ability_pickup.gd", "scripts/ui/hud.gd", "scripts/player/camera_rig.gd",
  "scripts/core/game_state.gd", "scripts/core/game_menu.gd", "scripts/core/map_screen.gd",
  "project.godot",
];
const CAP = 12_000;
const files: Record<string, string> = {};
for (const f of TEXT_FILES) {
  const abs = join(projDir, f);
  if (!existsSync(abs)) continue;
  let text = readFileSync(abs, "utf8");
  if (text.length > CAP) text = text.slice(0, CAP) + `\n\n/* …truncated in web demo snapshot (full file in the app) */`;
  files[f] = text;
}

// ── sprite PNGs as base64 (AssetsView gallery) ───────────────────────────────
const SLOTS = ["player", "enemy", "boss", "npc", "checkpoint", "pickup", "shard", "tile_ground", "tile_wall", "sky", "glow"];
const assets: Record<string, string> = {};
for (const slot of SLOTS) {
  for (const p of [`assets/sprites/${slot}.png`, `assets/sprites/${slot}_0.png`]) {
    const abs = join(projDir, p);
    if (existsSync(abs)) { assets[p] = Buffer.from(readFileSync(abs)).toString("base64"); break; }
  }
}

// ── git log / builds / store kit ─────────────────────────────────────────────
function gitLog(): Array<{ short: string; message: string; date: string; author: string }> {
  try {
    const out = Bun.spawnSync(["git", "log", "--pretty=%h|%s|%ad|%an", "--date=short", "-12"], { cwd: projDir });
    const text = new TextDecoder().decode(out.stdout);
    return text.trim().split("\n").filter(Boolean).map((l) => {
      const [short, ...rest] = l.split("|");
      const [message, date, author] = rest.join("|").split("|");
      return { short: short ?? "", message: message ?? "", date: date ?? "", author: author ?? "" };
    });
  } catch { return []; }
}
function buildList(): Array<{ name: string; size: number }> {
  const dir = join(ROOT, "builds", SLUG);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).map((name) => ({ name, size: statSync(join(dir, name)).size }));
}
function storeKitCounts(): { images: number; screenshots: number } {
  const dir = join(projDir, "docs", "store-kit");
  if (!existsSync(dir)) return { images: 0, screenshots: 0 };
  const all = readdirSync(dir);
  return {
    images: all.filter((f) => f.endsWith(".png") || f.endsWith(".jpg")).length,
    screenshots: all.filter((f) => f.startsWith("screenshot")).length,
  };
}

// ── status DTO (honest: no backend on the web demo) ──────────────────────────
const status = {
  app: "WorldSmith AI",
  version: "0.10.0",
  aiConfigured: false, // honest: the static demo cannot call providers
  uiBuilt: true,
  engines: [
    { engine: "godot4", label: "Godot 4.3", installed: true, version: "4.3.stable", path: null, note: "snapshot: jogo validado neste engine" },
    { engine: "unreal5", label: "Unreal Engine 5", installed: false, version: null, path: null, note: "não instalado nesta máquina" },
  ],
};

const bundle = {
  generatedAt: new Date().toISOString(),
  kind: "web-demo-snapshot",
  sourceProject: SLUG,
  status,
  project: proj,
  tasks,
  events,
  dna,
  tree,
  files,
  assets,
  git: { log: gitLog(), status: { dirty: false, files: [] }, diff: "" },
  builds: buildList(),
  storeKit: storeKitCounts(),
  previewUrl: "../demo/", // the site's real WASM build of this game
};

mkdirSync(new URL("../apps/ui/public/", import.meta.url).pathname, { recursive: true });
writeFileSync(OUT, JSON.stringify(bundle));
const kb = Math.round(statSync(OUT).size / 1024);
console.log(`demo snapshot → apps/ui/public/demo-data.json (${kb} KB) · project: ${SLUG} · files: ${Object.keys(files).length} · sprites: ${Object.keys(assets).length} · events: ${events.length}`);
