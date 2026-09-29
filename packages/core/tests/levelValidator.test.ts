/**
 * Level Validator tests (§10) — the validator must PASS the real generated
 * world and CATCH each class of defect (evidence-driven, per rule).
 */
import { describe, expect, test } from "bun:test";
import { roomsJson } from "../src/spec/roomGraph";
import { validateLevel, type LevelReport } from "../src/spec/levelValidator";
import type { GameSpecification } from "../src/spec/gameSpec";
import type { RoomDef } from "../src/spec/roomGraph";

import { join } from "node:path";

const spec = JSON.parse(
  (await Bun.file(join(process.env.HOME ?? "/home/llinux", ".worldsmith/projects/hollow-echoes/data/spec.json")).text()),
) as GameSpecification;


const world = (): RoomDef[] => JSON.parse(roomsJson(spec));

describe("Level Validator (§10)", () => {
  test("the real generated world passes all rules", () => {
    const r: LevelReport = validateLevel(world());
    expect(r.pass).toBe(true);
    expect(r.reachableWithProgression.length).toBe(6);
  });

  test("R1: disconnected room is rejected", () => {
    const w = world();
    w.push({ id: "island", name: "orphan", biome: "ruins", width: 1280, height: 720,
      playerSpawn: { x: 100, y: 500 }, platforms: [{ x: 0, y: 620, w: 1280, h: 40 }],
      hazards: [], spawns: [], doors: [], modulate: "#fff" });
    const r = validateLevel(w);
    expect(r.pass).toBe(false);
    expect(r.issues.some((i) => i.rule === "R1" && i.room === "island")).toBe(true);
  });

  test("R2: one-way door (player trap) is rejected", () => {
    const w = world();
    const hub = w.find((r) => r.id === "hub")!;
    hub.doors.push({ to: "west", x: 640, y: 560, dir: "right" }); // west has a return door — use a target without one
    // make it a true one-way: add door to a room and remove its returns
    const west = w.find((r) => r.id === "west")!;
    west.doors = [];
    const r = validateLevel(w);
    expect(r.pass).toBe(false);
    expect(r.issues.some((i) => i.rule === "R2")).toBe(true);
  });

  test("R3: floating door is rejected", () => {
    const w = world();
    const hub = w.find((r) => r.id === "hub")!;
    hub.doors.push({ to: "secret", x: 640, y: 200, dir: "right" }); // 400px above any platform
    const r = validateLevel(w);
    expect(r.pass).toBe(false);
    expect(r.issues.some((i) => i.rule === "R3")).toBe(true);
  });

  test("R4: spawn buried inside a solid is rejected", () => {
    const w = world();
    const hub = w.find((r) => r.id === "hub")!;
    hub.spawns.push({ type: "enemy", id: "ghost_in_wall", x: 60, y: 640 }); // inside the ground rect
    const r = validateLevel(w);
    expect(r.pass).toBe(false);
    expect(r.issues.some((i) => i.rule === "R4" && i.room === "hub")).toBe(true);
  });

  test("R5: player spawning inside a hazard is rejected", () => {
    const w = world();
    const hub = w.find((r) => r.id === "hub")!;
    hub.hazards.push({ x: 150, y: 480, w: 200, h: 200 }); // covers the spawn at (200, 520)
    const r = validateLevel(w);
    expect(r.pass).toBe(false);
    expect(r.issues.some((i) => i.rule === "R5")).toBe(true);
  });

  test("R6: ability gate with no reachable pickup makes the world unsolvable", () => {
    const w = world();
    const west = w.find((r) => r.id === "west")!;
    west.spawns = west.spawns.filter((s) => !(s.type === "pickup" && s.id === "dash")); // remove the dash pickup
    const r = validateLevel(w);
    expect(r.pass).toBe(false);
    expect(r.issues.some((i) => i.rule === "R6" && i.room === "gate")).toBe(true);
  });

  test("R6: progression proof — gate room reachable ONLY after the pickup", () => {
    const r = validateLevel(world());
    expect(r.reachableWithProgression).toContain("gate");   // solvable with dash found
    expect(r.reachableWithProgression).toContain("arena");  // the road to the boss
    expect(r.pass).toBe(true);
  });

  test("R7: world without a boss is rejected", () => {
    const w = world();
    const gate = w.find((r) => r.id === "gate")!;
    gate.spawns = gate.spawns.filter((s) => s.type !== "boss");
    const r = validateLevel(w);
    expect(r.pass).toBe(false);
    expect(r.issues.some((i) => i.rule === "R7")).toBe(true);
  });
});
