/**
 * AssetManifest (§12) — the registry the game-generation engine reads to
 * know which assets exist, where they came from, what style they follow and
 * what they are used for. Written to data/asset_manifest.json per project.
 */
import type { AssetManifestEntry, ValidationReport } from "./manifestTypes";

export function buildManifest(input: {
  sprites: Record<string, Uint8Array>;
  bibleStyle: string;
  materials: string[];
  report: ValidationReport;
  qa?: { checked: boolean; pass?: boolean; issues?: string[]; reason?: string };
}): AssetManifestEntry[] {
  const entries: AssetManifestEntry[] = [];

  for (const [path, bytes] of Object.entries(input.sprites)) {
    const name = path.split("/").pop() ?? path;
    const m = name.match(/^(.*)_([0-9]+)\.png$/);
    const base = m?.[1] ?? name.replace(".png", "");
    const usage = USAGE_MAP[base] ?? "gameplay";
    const generator = GENERATOR_MAP[base] ?? "spriteForge";
    const type = path.includes("/materials/") ? "material"
      : base.startsWith("tile_") ? "tile"
      : base === "sky" ? "backdrop"
      : "sprite";
    entries.push({
      id: `asset_${path.replace(/[^a-z0-9]/gi, "_")}`,
      name,
      type: type as AssetManifestEntry["type"],
      source: "procedural",
      generator,
      styleProfile: input.bibleStyle,
      dims: dimsOf(bytes),
      usage,
      version: 1,
      canonicalOf: m ? `canonical:${base}` : undefined,
      qa: input.qa,
    });
  }

  void input.materials;
  return entries;
}

const USAGE_MAP: Record<string, string> = {
  player: "protagonist entity (all scenes)",
  enemy: "hostile entity (all scenes)",
  boss: "boss entity (boss gate)",
  npc: "npc entity + dialogue portrait source",
  checkpoint: "save point interactable",
  pickup: "ability pickup interactable",
  shard: "collectible",
  glow: "vfx additive glow",
  sky: "parallax backdrop layer",
  tile_wall: "environment collision surface",
  tile_ground: "environment collision surface",
};

const GENERATOR_MAP: Record<string, string> = {
  player: "spriteForge.paintHero(4-frame walk)",
  enemy: "spriteForge.paintCreature(3-frame squash)",
  boss: "spriteForge.paintBoss(3-frame hover)",
  npc: "spriteForge.paintNpc(2-frame sway)",
  checkpoint: "propsPainters.paintCheckpointV2(3-frame flame, beveled basin, embers)",
  pickup: "propsPainters.paintPickupV2(2-frame pulse, dithered halo, rune sparks)",
  shard: "propsPainters.paintShardV2(4-frame pulse, facet planes, sparkle orbit)",
  glow: "propsPainters.paintGlowV2(3-frame beat, dithered falloff)",
  sky: "spriteForge.paintSky(gradient+stars)",
};

function dimsOf(bytes: Uint8Array): string {
  // IHDR width/height at bytes 16..24 (big-endian)
  const dv = new DataView(bytes.buffer, bytes.byteOffset);
  try {
    return `${dv.getUint32(16)}x${dv.getUint32(20)}`;
  } catch {
    return "unknown";
  }
}
