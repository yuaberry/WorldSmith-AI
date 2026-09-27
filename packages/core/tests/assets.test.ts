/**
 * Asset pipeline tests (§1, §2, §7, §12, §13): Art Bible determinism + style
 * routing, frame-consistency enforcement, material semantics, manifest
 * integrity and the §19 retheme loop.
 */
import { describe, expect, test } from "bun:test";
import { deriveBible, styleFromPrompt, bibleToMarkdown } from "../src/assets/artBible";
import { paintMaterial, MATERIALS, forgeMaterials } from "../src/assets/materials";
import { decodePNG, validateAssets } from "../src/assets/validate";
import { buildContactSheet } from "../src/assets/visualQA";
import { buildManifest } from "../src/assets/manifest";
import { forgeDefaultSprites } from "../src/assets/spriteForge";
import { metroidvaniaFiles } from "../src/engines/templates/godot_metroidvania";

const MV_PROMPT = "Create a dark fantasy 2.5D metroidvania about an immortal girl exploring a ruined kingdom with parry mechanics, bosses, dialogue, NPCs, save points, dynamic weather, cinematic boss introductions and controller support.";

describe("Art Bible (§1)", () => {
  test("style routing follows the user's words (§3: no forced style)", () => {
    expect(styleFromPrompt("pixel art platformer 16-bit")).toBe("pixel-art");
    expect(styleFromPrompt("anime adventure")).toBe("anime");
    expect(styleFromPrompt("hand-painted painterly world")).toBe("painterly");
    expect(styleFromPrompt("cyberpunk neon realistic")).toBe("realistic");
  });
  test("bible derives dark-fantasy palette + canonical identities", () => {
    const b = deriveBible({ title: "Hollow Echoes", idea: MV_PROMPT });
    expect(b.palette.bg).not.toBe(b.palette.danger); // contrast roles distinct
    expect(b.identities.protagonist.name).toContain("Immortal");
    expect(b.identities.protagonist.canonicalPrompt.length).toBeGreaterThan(40);
  });
  test("bible renders as a professional doc", () => {
    const md = bibleToMarkdown(deriveBible({ title: "T", idea: MV_PROMPT }), "T");
    expect(md).toContain("# Art Bible");
    expect(md).toContain("Identidades canônicas");
  });
});

describe("Consistency system (§2)", () => {
  test("animation frames never drift identity (>45% diff rejected by validator)", () => {
    const pal = { accent: "#a78bfa", bg: "#0d0e16" };
    const sprites = forgeDefaultSprites(pal);
    const frames = [0, 1, 2, 3].map((f) => sprites[`assets/sprites/player_${f}.png`]!);
    const infos = frames.map((b) => decodePNG(b)!);
    expect(infos.every(Boolean)).toBe(true);
    // walk cycle frames: same painter, parametric deltas → small diffs
    const d01 = diff(infos[0]!, infos[1]!);
    expect(d01).toBeGreaterThan(0.01);
    expect(d01).toBeLessThan(0.45);
  });
  test("validator rejects identity drift", () => {
    // craft a fake sheet: frame0 = 16x16 solid, frame1 = 64x64 noise (huge diff)
    const a = tiny(16), b = tiny(64);
    const report = validateAssets(
      { "assets/sprites/fake_0.png": a, "assets/sprites/fake_1.png": b },
      [{ path: "assets/sprites/fake_0.png", minDim: 8, maxDim: 128, requireAlpha: true }],
    );
    expect(report.pass).toBe(false);
  });
});

describe("Material system (§7)", () => {
  test("all materials produce valid, structured textures", () => {
    for (const m of MATERIALS) {
      const png = paintMaterial(m.id, { accent: "#a78bfa", bg: "#0d0e16" });
      const info = decodePNG(png);
      expect(info, m.id).not.toBeNull();
      expect(info!.w).toBe(32);
    }
  });
  test("materials are NOT generic noise (structured pixel variety)", () => {
    const png = paintMaterial("aged_stone", { accent: "#a78bfa", bg: "#0d0e16" });
    const info = decodePNG(png)!;
    const variants = new Set<number>();
    for (let i = 0; i < info.rgba.length; i += 4) variants.add((info.rgba[i]! << 16) | (info.rgba[i + 1]! << 8) | info.rgba[i + 2]!);
    // structured material: multiple semantic tones (stone/mortar/cracks/moss)
    // but NOT hundreds — which would be generic noise (§7)
    expect(variants.size).toBeGreaterThanOrEqual(4);
    expect(variants.size).toBeLessThanOrEqual(64);
  });
});

describe("Manifest + QA tooling (§12, §14)", () => {
  test("contact sheet composes all canonical slots", () => {
    const pal = { accent: "#a78bfa", bg: "#0d0e16" };
    const sprites = forgeDefaultSprites(pal);
    const labeled = Object.entries(sprites).map(([p, b]) => ({ label: p.split("/").pop() ?? p, bytes: b as Uint8Array }));
    const sheet = buildContactSheet(labeled);
    expect(sheet).not.toBeNull();
    const info = decodePNG(sheet!);
    expect(info!.w).toBeGreaterThan(64);
  });
  test("manifest registers every asset with style + usage", () => {
    const files = metroidvaniaFiles({ title: "T", slug: "t", dimension: "2.5d", qualityTier: "indie", flavor: "metroidvania", palette: { primary: "#4f7cff", accent: "#a78bfa", bg: "#12131a" }, playerSpeed: 200, shortDescription: MV_PROMPT } as never);
    const manifest = JSON.parse(files["data/asset_manifest.json"] as string);
    expect(manifest.validation.pass).toBe(true);
    expect(manifest.assets.length).toBeGreaterThan(15);
    expect(manifest.assets[0].styleProfile).toBe(manifest.style);
  });
});

describe("Metroidvania ships the full artifact set", () => {
  test("bible + spec + manifest + materials land in the project", () => {
    const files = metroidvaniaFiles({ title: "T", slug: "t", dimension: "2.5d", qualityTier: "indie", flavor: "metroidvania", palette: { primary: "#4f7cff", accent: "#a78bfa", bg: "#12131a" }, playerSpeed: 200, shortDescription: MV_PROMPT } as never);
    expect(files["data/art_bible.json"]).toBeDefined();
    expect(files["docs/art-bible.md"]).toBeDefined();
    expect(files["data/asset_manifest.json"]).toBeDefined();
    expect(Object.keys(files).some((k) => k.startsWith("assets/materials/"))).toBe(true);
  });
});

function tiny(size: number): Uint8Array {
  // valid minimal RGBA PNG
  const { encodePNG, Px } = require("../src/assets/spriteForge") as typeof import("../src/assets/spriteForge");
  const p = new Px(size, size);
  p.rect(0, 0, size, size, [160, 60, 200], 255);
  return encodePNG(size, size, p.data);
}

function diff(a: { w: number; h: number; rgba: Uint8Array }, b: { w: number; h: number; rgba: Uint8Array }): number {
  if (a.w !== b.w) return 1;
  let d = 0;
  for (let i = 0; i < a.rgba.length; i += 4) {
    if (Math.abs(a.rgba[i]! - b.rgba[i]!) + Math.abs(a.rgba[i + 3]! - b.rgba[i + 3]!) > 40) d++;
  }
  return d / (a.w * a.h);
}
