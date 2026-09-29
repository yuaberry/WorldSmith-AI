/**
 * Level Validator (§10) — proves the generated world is actually PLAYABLE,
 * not just generated. Pure, deterministic, no engine needed.
 *
 * Rules (each maps to a real player-facing failure):
 *   R1 connectivity     — every room reachable from the first (BFS over doors)
 *   R2 door symmetry    — a door A→B implies a return door B→A (no traps)
 *   R3 door grounding   — doors stand on solid platforms (no floating exits)
 *   R4 spawn sanity     — spawns inside room bounds, not buried in solids
 *   R5 safe start       — player spawn not inside a hazard, on/near ground
 *   R6 progression      — fixpoint expansion: gated doors unlock with
 *                         pickups found along the way ⇒ 100% of rooms
 *                         reachable (the actual game-solvability proof)
 *   R7 pacing anchors   — ≥1 checkpoint, exactly 1 boss, boss room exists
 */
import type { RoomDef, RoomPlatform, RoomSpawn } from "./roomGraph";

export interface LevelIssue { room?: string; rule: string; detail: string }
export interface LevelReport { pass: boolean; issues: LevelIssue[]; reachableWithProgression: string[] }

type Rooms = Record<string, RoomDef>;

const M = 8; // solid-margin (px) for "inside solid" tests

function inside(p: { x: number; y: number }, r: RoomPlatform, margin = M): boolean {
  return p.x > r.x - margin && p.x < r.x + r.w + margin &&
         p.y > r.y - margin && p.y < r.y + r.h + margin;
}
function onSolid(rooms: Rooms, roomId: string, x: number, y: number, reach = 90): boolean {
  const r = rooms[roomId];
  if (!r) return false;
  // "ground below the point": platform TOP must sit under (or at) the point,
  // within reach — y ≤ top ≤ y+reach (a rect's y IS its top edge).
  return r.platforms.some((p) => x >= p.x - 4 && x <= p.x + p.w + 4 && p.y >= y - 6 && p.y <= y + reach);
}
function bfs(start: string, next: (id: string) => string[]): Set<string> {
  const seen = new Set<string>([start]);
  const q = [start];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of next(cur)) if (!seen.has(n)) { seen.add(n); q.push(n); }
  }
  return seen;
}

export function validateLevel(world: RoomDef[] | Rooms): LevelReport {
  const issues: LevelIssue[] = [];
  // Normalize: roomsJson returns an ARRAY keyed by semantic id (doors use
  // room.id, e.g. "hub", "gate") — map it; plain objects are keyed already.
  const rooms: Rooms = Array.isArray(world)
    ? Object.fromEntries((world as RoomDef[]).map((r) => [r.id, r]))
    : (world as Rooms);
  const ids = Object.keys(rooms);
  if (ids.length === 0) return { pass: false, issues: [{ rule: "R0", detail: "world has no rooms" }], reachableWithProgression: [] };
  const first = ids[0]!;

  // R1 connectivity (gates treated as passable for raw connectivity)
  const conn = bfs(first, (id) => (rooms[id]?.doors ?? []).map((d) => d.to));
  for (const id of ids) {
    if (!conn.has(id)) issues.push({ room: id, rule: "R1", detail: "room is not connected to the start" });
  }

  // R2 door symmetry + R3 door grounding
  for (const id of ids) {
    const r = rooms[id]!;
    for (const d of r.doors) {
      const target = rooms[d.to];
      if (!target) { issues.push({ room: id, rule: "R2", detail: `door → "${d.to}" (room does not exist)` }); continue; }
      const back = target.doors.some((t) => t.to === id);
      if (!back) issues.push({ room: id, rule: "R2", detail: `door → "${d.to}" has no return door (player would be trapped)` });
      if (!onSolid(rooms, id, d.x, d.y + 60)) {
        issues.push({ room: id, rule: "R3", detail: `door → "${d.to}" floats: no platform within 90px below` });
      }
    }
  }

  // R4 spawn sanity
  for (const id of ids) {
    const r = rooms[id]!;
    const check = (label: string, s: RoomSpawn | { x: number; y: number }) => {
      if (s.x < 0 || s.y < 0 || s.x > r.width || s.y > r.height) {
        issues.push({ room: id, rule: "R4", detail: `${label} out of bounds (${s.x},${s.y}) vs ${r.width}x${r.height}` });
      }
      const buried = r.platforms.some((p) => inside(s, p));
      if (buried) issues.push({ room: id, rule: "R4", detail: `${label} is buried inside a solid platform` });
    };
    for (const s of r.spawns) check(`spawn ${s.type}:${s.id}`, s);
    check("playerSpawn", r.playerSpawn);
  }

  // R5 safe start
  const fr = rooms[first]!;
  const spawnInHazard = fr.hazards?.some((h) => inside(fr.playerSpawn, h, 24)) ?? false;
  if (spawnInHazard) issues.push({ room: first, rule: "R5", detail: "player spawns inside a hazard" });
  if (!onSolid(rooms, first, fr.playerSpawn.x, fr.playerSpawn.y, 160)) {
    issues.push({ room: first, rule: "R5", detail: "player spawn has no ground within 160px below" });
  }

  // R6 the solvability proof: iterative expansion, gated doors need pickups
  // that are reachable BEFORE the gate (fixpoint = the whole playable arc).
  const abilities = new Set<string>();
  let reachable = new Set<string>([first]);
  for (;;) {
    const before = reachable.size + abilities.size;
    for (const id of reachable) {
      for (const s of rooms[id]!.spawns) if (s.type === "pickup") abilities.add(s.id);
    }
    reachable = bfs(first, (id) =>
      (rooms[id]!.doors)
        .filter((d) => !d.requires || abilities.has(d.requires))
        .map((d) => d.to),
    );
    if (reachable.size + abilities.size === before) break;
  }
  for (const id of ids) {
    if (!reachable.has(id)) {
      const req = ids.flatMap((i) => (rooms[i]!.doors).filter((d) => d.to === id && d.requires).map((d) => `${i}→${id} (req: ${d.requires})`));
      issues.push({
        room: id,
        rule: "R6",
        detail: `unreachable through progression${req.length ? ` — gate ${req.join(", ")} never satisfiable` : ""}`,
      });
    }
  }
  for (const id of ids) {
    for (const d of rooms[id]!.doors) {
      if (d.requires && !abilities.has(d.requires)) {
        issues.push({ room: id, rule: "R6", detail: `door requires "${d.requires}" but no pickup with that id exists in the reachable world` });
      }
    }
  }

  // R7 pacing anchors
  const cps = ids.flatMap((i) => rooms[i]!.spawns.filter((s) => s.type === "checkpoint"));
  const bosses = ids.flatMap((i) => rooms[i]!.spawns.filter((s) => s.type === "boss"));
  if (cps.length === 0) issues.push({ rule: "R7", detail: "no checkpoint in the world" });
  if (bosses.length === 0) issues.push({ rule: "R7", detail: "no boss in the world" });
  if (bosses.length > 1) issues.push({ rule: "R7", detail: `${bosses.length} bosses — pacing expects exactly 1 for the vertical slice` });

  return { pass: issues.length === 0, issues, reachableWithProgression: [...reachable].sort() };
}
