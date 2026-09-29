/**
 * Deterministic room-graph world generator (§7).
 * The metroidvania template builds its world from data/rooms.json produced
 * here: same seed ⇒ byte-identical world. Encounter rules and pacing come
 * from the GameSpecification; layout is seeded, never random-without-design.
 */
import type { GameSpecification } from "./gameSpec";

export interface RoomPlatform { x: number; y: number; w: number; h: number }
export interface RoomSpawn { type: "enemy" | "npc" | "checkpoint" | "pickup" | "boss" | "secret"; id: string; x: number; y: number }
export interface RoomDoor { to: string; x: number; y: number; dir: "left" | "right"; requires?: string }
export interface RoomDef {
  id: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  playerSpawn: { x: number; y: number };
  platforms: RoomPlatform[];
  hazards: RoomPlatform[];
  spawns: RoomSpawn[];
  doors: RoomDoor[];
  modulate: string;
}

/** xorshift32 — tiny deterministic PRNG. */
class Rng {
  s: number;
  constructor(seed: number) { this.s = seed >>> 0 || 1; }
  next(): number {
    let x = this.s;
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    this.s = x >>> 0;
    return x / 0xffffffff;
  }
  range(min: number, max: number): number { return min + this.next() * (max - min); }
}

const W = 1280;
const GROUND = 620;
const THICK = 200;

/**
 * Generates the vertical-slice world: hub ⇄ west gallery ⇄ crossroads ⇄
 * arena ⇄ boss gate, plus a secret alcove behind the hub. Platforms are
 * seeded; the skeleton (pacing/encounters/ability gates) is design-driven.
 */
export function generateRooms(spec: GameSpecification): RoomDef[] {
  const rng = new Rng(spec.world.seed * 7919 + 17);
  const rooms: RoomDef[] = [];

  const mk = (partial: Partial<RoomDef> & Pick<RoomDef, "id" | "name">): RoomDef => ({
    biome: "ruins",
    width: W,
    height: 720,
    playerSpawn: { x: 200, y: GROUND - 100 },
    platforms: [],
    hazards: [],
    spawns: [],
    doors: [],
    modulate: "#cfd6e8",
    ...partial,
  });

  // HUB — safe start: NPC + checkpoint + door west/east
  rooms.push(mk({
    id: "hub", name: "Broken Cloister", biome: "ruins",
    platforms: [
      { x: 0, y: GROUND, w: W, h: THICK },
      { x: 540, y: 520, w: 160, h: 24 },
      { x: 900, y: 440, w: 160, h: 24 },
    ],
    spawns: [
      { type: "npc", id: "keeper", x: 960, y: GROUND - 40 },
      { type: "checkpoint", id: "cp_hub", x: 260, y: GROUND - 40 },
    ],
    doors: [
      { to: "west", x: 24, y: GROUND - 60, dir: "left" },
      { to: "crossroads", x: W - 24, y: GROUND - 60, dir: "right" },
      // hidden passage at the far wall — the secret room is REACHABLE (§10 R6:
      // orphan rooms are dead content; the validator would reject them)
      { to: "secret", x: 1216, y: GROUND - 60, dir: "right" },
    ],
    modulate: "#d8dcea",
  }));

  // WEST — Sunken Gallery: platform gauntlet + 2 enemies, pickup at the end
  const westPlatforms: RoomPlatform[] = [{ x: 0, y: GROUND, w: W, h: THICK }];
  let px = 240;
  while (px < W - 260) {
    const w = Math.round(rng.range(90, 150));
    const y = Math.round(rng.range(380, 560));
    westPlatforms.push({ x: px, y, w, h: 22 });
    px += w + Math.round(rng.range(60, 110));
  }
  rooms.push(mk({
    id: "west", name: "Sunken Gallery",
    platforms: westPlatforms,
    hazards: [{ x: 420, y: GROUND + 60, w: 200, h: 40 }],
    spawns: [
      { type: "enemy", id: "wraith", x: 500, y: GROUND - 60 },
      { type: "enemy", id: "wraith", x: 900, y: GROUND - 60 },
      { type: "enemy", id: "wisp", x: 640, y: 380 },   // §15 flyer — guards the gallery air
      { type: "pickup", id: "dash", x: 1160, y: 420 },
    ],
    doors: [{ to: "hub", x: W - 24, y: GROUND - 60, dir: "right" }],
    modulate: "#b9c2d6",
  }));

  // CROSSROADS — vertical-ish gauntlet to arena, ability gate ahead
  rooms.push(mk({
    id: "crossroads", name: "Wailing Crossroads", biome: "caves",
    platforms: [
      { x: 0, y: GROUND, w: W, h: THICK },
      { x: 300, y: 500, w: 140, h: 22 },
      { x: 620, y: 420, w: 140, h: 22 },
      { x: 940, y: 520, w: 140, h: 22 },
    ],
    hazards: [{ x: 520, y: GROUND + 60, w: 240, h: 40 }],
    spawns: [
      { type: "enemy", id: "wraith", x: 360, y: GROUND - 60 },
      { type: "enemy", id: "sentinel", x: 820, y: GROUND - 60 },
      { type: "enemy", id: "wisp", x: 700, y: 300 },   // §15 flyer — dives from the dark
      { type: "checkpoint", id: "cp_cross", x: 120, y: GROUND - 40 },
    ],
    doors: [
      { to: "hub", x: 24, y: GROUND - 60, dir: "left" },
      { to: "arena", x: W - 24, y: GROUND - 60, dir: "right" },
    ],
    modulate: "#aab4cc",
  }));

  // ARENA — combat test before the boss
  rooms.push(mk({
    id: "arena", name: "Chapel of Hollows", biome: "arena",
    platforms: [
      { x: 0, y: GROUND, w: W, h: THICK },
      { x: 180, y: 470, w: 130, h: 22 },
      { x: 970, y: 470, w: 130, h: 22 },
    ],
    spawns: [
      { type: "enemy", id: "sentinel", x: 480, y: GROUND - 60 },
      { type: "enemy", id: "wraith", x: 800, y: GROUND - 60 },
      { type: "checkpoint", id: "cp_arena", x: 120, y: GROUND - 40 },
    ],
    doors: [
      { to: "crossroads", x: 24, y: GROUND - 60, dir: "left" },
      { to: "gate", x: W - 24, y: GROUND - 60, dir: "right", requires: "dash" },
    ],
    modulate: "#c4bcd8",
  }));

  // GATE — boss room
  rooms.push(mk({
    id: "gate", name: "Sovereign's Door", biome: "boss",
    platforms: [
      { x: 0, y: GROUND, w: W, h: THICK },
      { x: 200, y: 430, w: 130, h: 22 },
      { x: 950, y: 430, w: 130, h: 22 },
    ],
    spawns: [
      { type: "boss", id: "sovereign", x: 640, y: GROUND - 140 },
    ],
    doors: [{ to: "arena", x: 24, y: GROUND - 60, dir: "left" }],
    modulate: "#8f86b8",
  }));

  // SECRET — behind hub (right side), collectible vault
  rooms.push(mk({
    id: "secret", name: "Forgotten Reliquary", biome: "caves",
    platforms: [{ x: 0, y: GROUND, w: W, h: THICK }],
    spawns: [
      { type: "pickup", id: "relic", x: 640, y: GROUND - 80 },
    ],
    doors: [{ to: "hub", x: 24, y: GROUND - 60, dir: "left" }],
    modulate: "#9db6a8",
  }));

  return rooms;
}

export function roomsJson(spec: GameSpecification): string {
  return JSON.stringify(generateRooms(spec), null, 2);
}
