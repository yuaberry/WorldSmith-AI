/**
 * Genre System Map (§11.3) — tells the coder LLM WHERE each gameplay system
 * lives in the generated project, instead of letting it guess from the tree.
 *
 * The genre packs are system-complete at scaffold time; coder tasks are
 * incremental. Giving the coder the exact file + data knob per system means:
 *   - stats changes go to data/*.json (data-driven, no code churn)
 *   - behavior changes go to the one .gd that owns the system
 *   - no cross-system collateral edits
 */

export interface SystemEntry {
  /** Lowercase keywords matched against the task title + description. */
  keywords: string[];
  /** Exact files/knobs that own the system (paths are project-relative). */
  where: string;
  /** How to change it safely (data-driven first). */
  note?: string;
}

const METROIDVANIA: SystemEntry[] = [
  {
    keywords: ["parry", "counter", "block", "iframe", "i-frame", "invinci", "knockback"],
    where: "scripts/player/player.gd (PARRY state machine) + data/player.json (moveSpeed, jumpVelocity, parryWindowMs, parryKnockback, iframesMs)",
    note: "Tuning combat feel = edit data/player.json only; the state machine reads these knobs at runtime.",
  },
  {
    keywords: ["dash", "movement", "jump", "walk", "speed", "coyote", "control"],
    where: "scripts/player/player.gd (IDLE/RUN/FALL states) + data/player.json (moveSpeed, jumpVelocity, dashSpeed, coyoteTimeMs)",
    note: "Movement tuning is data-driven — prefer data/player.json.",
  },
  {
    keywords: ["enemy", "enemies", "ai", "patrol", "fsm", "chase", "aggro", "wraith"],
    where: "scripts/ai/enemy.gd (FSM: PATROL→CHASE→TELEGRAPH→ATTACK→STAGGER→DEATH) + data/enemies.json (hp, speed, damage, telegraphMs)",
  },
  {
    keywords: ["boss", "phase", "cinematic", "intro"],
    where: "scripts/ai/boss.gd (two-phase with cinematic intro) + data/bosses.json (phases, patterns, hp, enrage thresholds)",
  },
  {
    keywords: ["npc", "dialog", "dialogue", "quest", "talk", "choices"],
    where: "scripts/characters/npc.gd (interaction + branching choices) + data/dialogue.json",
  },
  {
    keywords: ["checkpoint", "save", "respawn", "death", "retry"],
    where: "scripts/world/checkpoint.gd (activation) + scripts/core/game_state.gd (versioned save slots) + data/rooms.json (checkpoint placement)",
  },
  {
    keywords: ["room", "world", "level", "gate", "door", "backtrack", "shortcut", "layout"],
    where: "scripts/world/main.gd (seeded room graph, ability gates, room loader) + data/rooms.json (connections, gate requirements)",
  },
  {
    keywords: ["ability", "upgrade", "unlock", "relic", "shard", "pickup", "collectible"],
    where: "scripts/world/ability_pickup.gd (grants) + scripts/player/player.gd (ability flags) + data/abilities.json + data/rooms.json (gate requirements)",
  },
  {
    keywords: ["camera", "zoom", "shake", "limits"],
    where: "scripts/player/camera_rig.gd (limits/zoom/lerp) + data/player.json (cameraZoom, cameraLerp)",
  },
  {
    keywords: ["hud", "hearts", "boss bar", "health", "menu", "pause", "settings"],
    where: "scripts/ui/hud.gd (HUD) + scripts/core/game_menu.gd (menu/pause) + data/player.json (maxHearts)",
  },
  {
    keywords: ["map", "cartograph", "discovery"],
    where: "scripts/core/map_screen.gd (discovered-room map)",
  },
  {
    keywords: ["weather", "rain", "parallax", "sky", "background", "ambience"],
    where: "scripts/world/main.gd (weather particles + parallax layers)",
  },
  {
    keywords: ["animation", "anim", "sprite", "frame", "attack timing", "windup"],
    where: "data/animations.json (named anims, fps, frame events like hit_active/parry_window_open) + scripts/ai/enemy.gd + scripts/player/player.gd (event handlers)",
    note: "Frame events are data: retiming an attack = editing data/animations.json, not code.",
  },
  {
    keywords: ["audio", "sfx", "sound", "volume"],
    where: "scripts/core/game_state.gd (Sfx autoload, synthesized chiptune SFX) + data/player.json (sfxVolume)",
  },
  {
    keywords: ["difficulty", "balance", "damage", "hp", "economy"],
    where: "data/player.json + data/enemies.json + data/bosses.json (all combat/economy stats are data-driven)",
    note: "Balance passes should stay in data/*.json — zero code edits, instantly revalidated.",
  },
];

const GENERIC_GODOT: SystemEntry[] = [
  {
    keywords: ["player", "movement", "input"],
    where: "scripts/player/player.gd + data/player.json (if present)",
  },
  {
    keywords: ["enemy", "ai", "damage"],
    where: "scripts/enemy.gd (or scripts/ai/) + data/*.json",
  },
  {
    keywords: ["hud", "ui", "menu"],
    where: "scripts/ui/hud.gd / scripts/core/game_menu.gd",
  },
];

/** Returns the system map for a flavor/engine combo. */
export function systemMapFor(flavor: string, _engine: string): SystemEntry[] {
  if (flavor === "metroidvania") return METROIDVANIA;
  return GENERIC_GODOT;
}

/**
 * Picks the entries relevant to a task (keyword match on title+description).
 * Returns at most 3 — the prompt stays small and the signal high.
 */
export function relevantSystems(taskText: string, entries: SystemEntry[]): SystemEntry[] {
  const t = taskText.toLowerCase();
  const hits = entries.filter((e) => e.keywords.some((k) => t.includes(k)));
  return hits.slice(0, 3);
}

/** Renders relevant entries as a prompt section (empty string when none). */
export function systemMapSection(taskText: string, entries: SystemEntry[]): string {
  const rel = relevantSystems(taskText, entries);
  if (rel.length === 0) return "";
  const lines = rel.map((e) => `- ${e.where}${e.note ? `\n  (${e.note})` : ""}`);
  return `## SYSTEM MAP (where this system lives in THIS project)\n${lines.join("\n")}\n`;
}
