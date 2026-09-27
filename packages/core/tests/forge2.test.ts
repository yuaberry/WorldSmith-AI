/**
 * Production test suite (§13) — spec layer, deterministic world generation
 * and template integrity for the metroidvania genre pack.
 */
import { describe, expect, test } from "bun:test";
import { deriveSpec, GameSpecification, specToMarkdown } from "../src/spec/gameSpec";
import { generateRooms, roomsJson } from "../src/spec/roomGraph";
import { metroidvaniaFiles } from "../src/engines/templates/godot_metroidvania";
import type { GameSpec } from "../src/engines/types";

const EXAMPLE_PROMPT = "Create a dark fantasy 2.5D metroidvania about an immortal girl exploring a ruined kingdom. The game must have responsive combat, parry mechanics, bosses, abilities, interconnected areas, dialogue, NPCs, secrets, save points, atmospheric lighting, dynamic weather, cinematic boss introductions, a melancholic soundtrack, and controller support.";

const gameSpec: GameSpec = {
  title: "Hollow Echoes", slug: "hollow-echoes", dimension: "2.5d", qualityTier: "indie",
  flavor: "metroidvania", palette: { primary: "#4f7cff", accent: "#a78bfa", bg: "#12131a", fg: "#e8eaf2" },
  playerSpeed: 260, shortDescription: EXAMPLE_PROMPT,
};

describe("GameSpecification layer (§2)", () => {
  test("derives the metroidvania identity systems from the example prompt", () => {
    const spec = deriveSpec({
      title: "Hollow Echoes", genre: "action-adventure", dimension: "2.5d", flavor: "metroidvania",
      pillars: ["Responsive combat"], coreLoop: "Explore, fight, unlock, backtrack.",
      idea: EXAMPLE_PROMPT, seed: 42,
    });
    expect(spec.systems.parry).toBe(true);
    expect(spec.systems.boss).toBe(true);
    expect(spec.systems.bossCinematicIntro).toBe(true);
    expect(spec.systems.dialogue).toBe(true);
    expect(spec.systems.map).toBe(true);
    expect(spec.systems.weather).toBe(true);
    expect(spec.systems.gamepad).toBe(true);
    expect(spec.identity.dimension).toBe("2.5d");
  });

  test("does not invent systems that contradict the design", () => {
    const spec = deriveSpec({
      title: "Plain Hops", genre: "platformer", dimension: "2d", flavor: "platformer",
      pillars: ["Precision"], coreLoop: "Jump.", idea: "a simple precision platformer", seed: 1,
    });
    expect(spec.systems.parry).toBe(false);
    expect(spec.systems.boss).toBe(false);
    expect(spec.systems.dialogue).toBe(false);
  });

  test("schema rejects invalid specs", () => {
    const bad = () => GameSpecification.parse({ identity: {}, pillars: [], loops: {} });
    expect(bad).toThrow();
  });

  test("spec renders as a professional document", () => {
    const spec = deriveSpec({ title: "Hollow Echoes", genre: "a", dimension: "2.5d", flavor: "metroidvania", pillars: ["x"], coreLoop: "y", idea: EXAMPLE_PROMPT, seed: 7 });
    const md = specToMarkdown(spec);
    expect(md).toContain("# GameSpecification — Hollow Echoes");
    expect(md).toContain("Parry");
  });
});

describe("Deterministic world generation (§7)", () => {
  test("same seed ⇒ byte-identical world", () => {
    const a = deriveSpec({ title: "T", genre: "g", dimension: "2.5d", flavor: "metroidvania", pillars: ["p"], coreLoop: "c", idea: "metroidvania", seed: 999 });
    const b = deriveSpec({ title: "T", genre: "g", dimension: "2.5d", flavor: "metroidvania", pillars: ["p"], coreLoop: "c", idea: "metroidvania", seed: 999 });
    expect(roomsJson(a)).toBe(roomsJson(b));
  });

  test("world has the interconnected skeleton: hub, paths, arena, boss gate", () => {
    const spec = deriveSpec({ title: "T", genre: "g", dimension: "2.5d", flavor: "metroidvania", pillars: ["p"], coreLoop: "c", idea: "metroidvania", seed: 5 });
    const rooms = generateRooms(spec);
    const ids = rooms.map((r) => r.id);
    expect(ids).toContain("hub");
    expect(ids).toContain("arena");
    expect(ids).toContain("gate");
    const gate = rooms.find((r) => r.id === "arena")!;
    const gateDoor = gate.doors.find((d) => d.to === "gate");
    expect(gateDoor?.requires).toBe("dash");
  });

  test("different seeds ⇒ different platforms", () => {
    const mk = (seed: number) => generateRooms(deriveSpec({ title: "T", genre: "g", dimension: "2.5d", flavor: "metroidvania", pillars: ["p"], coreLoop: "c", idea: "metroidvania", seed })).find((r) => r.id === "west")!.platforms;
    expect(JSON.stringify(mk(11))).not.toBe(JSON.stringify(mk(12)));
  });
});

describe("Metroidvania template integrity (§11, §12)", () => {
  test("every autoload script exists in the file map", () => {
    const files = metroidvaniaFiles(gameSpec);
    const godot = files["project.godot"] as string;
    const autoloadPaths = [...godot.matchAll(/"\*res:\/\/([^"]+)"/g)].map((m) => m[1]!);
    expect(autoloadPaths.length).toBe(4);
    for (const p of autoloadPaths) {
      expect(files[p]).toBeDefined();
    }
  });

  test("every scene references an existing script", () => {
    const files = metroidvaniaFiles(gameSpec);
    for (const [name, content] of Object.entries(files)) {
      if (name.endsWith(".tscn")) {
        const m = (content as string).match(/path="res:\/\/(scripts\/[^"]+)"/);
        if (m) expect(files[m[1]!], `scene ${name} references ${m[1]}`).toBeDefined();
      }
    }
  });

  test("all data files are valid JSON", () => {
    const files = metroidvaniaFiles(gameSpec);
    for (const name of Object.keys(files)) {
      if (name.startsWith("data/") && name.endsWith(".json")) {
        expect(() => JSON.parse(files[name] as string), name).not.toThrow();
      }
    }
  });

  test("no ColorRect-only entities: animated sprite slots present", () => {
    const files = metroidvaniaFiles(gameSpec);
    for (const base of ["player", "enemy", "boss", "npc", "checkpoint", "pickup"]) {
      expect(files[`assets/sprites/${base}_0.png`], `sprite ${base}_0`).toBeDefined();
    }
  });

  test("system library scripts exist with data-driven loaders", () => {
    const files = metroidvaniaFiles(gameSpec);
    const enemy = files["scripts/ai/enemy.gd"] as string;
    expect(enemy).toContain("data/enemies.json");
    expect(enemy).toContain("E.TELEGRAPH");
    const boss = files["scripts/ai/boss.gd"] as string;
    expect(boss).toContain("cinema.emit");
    expect(boss).toContain("phase = 2");
    const player = files["scripts/player/player.gd"] as string;
    expect(player).toContain("parry_window");
    expect(player).toContain("data/player.json");
  });
});
