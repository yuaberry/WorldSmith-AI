/**
 * Art Bible (§1, §2) — the persistent visual constitution of a project.
 * Derived from the user prompt (LLM w/ deterministic fallback), validated
 * by zod, persisted as data/art_bible.json + docs/art-bible.md.
 * EVERY asset generator reads this. Assets are gameplay dependencies,
 * and their visual identity is contracted here.
 */
import { z } from "zod";

export const STYLE_PROFILES = [
  "pixel-art", "hand-drawn", "anime", "comic", "painterly",
  "vector", "stylized", "semi-realistic", "realistic",
] as const;
export type StyleProfile = (typeof STYLE_PROFILES)[number];

export const VisualIdentity = z.object({
  name: z.string(),
  proportions: z.object({ h: z.number().int(), headRatio: z.number().default(4) }),
  colors: z.object({
    main: z.string(),
    trim: z.string(),
    skin: z.string().optional(),
    eye: z.string().optional(),
  }),
  silhouette: z.string(),
  costume: z.string().default(""),
  hair: z.string().optional(),
  accessory: z.string().optional(),
  canonicalPrompt: z.string(),
});
export type VisualIdentity = z.infer<typeof VisualIdentity>;

export const ArtBible = z.object({
  style: z.enum(STYLE_PROFILES),
  palette: z.object({
    primary: z.string(), secondary: z.string(), accent: z.string(),
    bg: z.string(), fg: z.string(), danger: z.string(), highlight: z.string(),
  }),
  lighting: z.object({
    philosophy: z.string(),
    ambient: z.string(),
    key: z.string(),
  }),
  shapeLanguage: z.object({
    characters: z.string(),
    enemies: z.string(),
  }),
  silhouetteRule: z.string(),
  contrastRule: z.string(),
  ui: z.object({ style: z.string(), panelColor: z.string() }),
  vfx: z.object({ style: z.string(), particleColors: z.array(z.string()) }),
  environment: z.object({
    biome: z.string(),
    materials: z.array(z.string()).default(["aged_stone"]),
    landmarkRule: z.string(),
  }),
  animation: z.object({ style: z.string(), fps: z.number().default(8), anticipation: z.boolean().default(true) }),
  identities: z.object({
    protagonist: VisualIdentity,
    enemy: VisualIdentity,
    boss: VisualIdentity,
    npc: VisualIdentity,
  }),
});
export type ArtBible = z.infer<typeof ArtBible>;

function darken(hex: string, f: number): string {
  const h = hex.replace("#", "");
  const n = [0, 2, 4].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f))));
  return `#${n.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Style routing from the user's own words (§3: never force one style). */
export function styleFromPrompt(idea: string): StyleProfile {
  const t = idea.toLowerCase();
  if (t.includes("pixel") || t.includes("8-bit") || t.includes("16-bit")) return "pixel-art";
  if (t.includes("anime") || t.includes("cel-shad")) return "anime";
  if (t.includes("comic") || t.includes("bande dessin")) return "comic";
  if (t.includes("painterly") || t.includes("hand-painted") || t.includes("aquarela") || t.includes("pintura")) return "painterly";
  if (t.includes("vector") || t.includes("flat")) return "vector";
  if (t.includes("realista") || t.includes("realistic")) return t.includes("semi") ? "semi-realistic" : "realistic";
  if (t.includes("dark fantasy") || t.includes("medieval") || t.includes("ruined")) return "pixel-art";
  return "stylized";
}

function basePalette(idea: string): ArtBible["palette"] {
  const t = idea.toLowerCase();
  if (t.includes("cyberpunk") || t.includes("neon")) {
    return { primary: "#12e6ff", secondary: "#ff2ea6", accent: "#22d3ee", bg: "#0a0714", fg: "#e9ecf5", danger: "#ff5577", highlight: "#a7f3ff" };
  }
  if (t.includes("dark fantasy") || t.includes("ruined") || t.includes("sombr") || t.includes("melanc")) {
    return { primary: "#6d5fd6", secondary: "#3b4a8f", accent: "#a78bfa", bg: "#0d0e16", fg: "#d8dff2", danger: "#e5484d", highlight: "#fbbf24" };
  }
  if (t.includes("snow") || t.includes("inverno") || t.includes("gelad")) {
    return { primary: "#7fd0ff", secondary: "#5f8fb8", accent: "#bfe9ff", bg: "#101722", fg: "#eaf6ff", danger: "#f87171", highlight: "#ffffff" };
  }
  return { primary: "#4f7cff", secondary: "#3560e8", accent: "#7fa0ff", bg: "#12131a", fg: "#e8eaf2", danger: "#e5484d", highlight: "#fbbf24" };
}

/** Deterministic Art Bible — always available (offline mode / LLM fallback). */
export function deriveBible(input: { title: string; idea: string; protagonist?: string }): ArtBible {
  const style = styleFromPrompt(input.idea);
  const pal = basePalette(input.idea);
  const t = input.idea.toLowerCase();
  const dark = t.includes("dark") || t.includes("sombr") || t.includes("melanc") || t.includes("ruined");
  const env = t.includes("cyberpunk") || t.includes("neon")
    ? { biome: "cypunk-ruins", materials: ["wet_asphalt", "polished_steel"], landmarkRule: "neon signage as landmark; rain reflections on asphalt" }
    : t.includes("snow") || t.includes("gelad")
      ? { biome: "frozen-ruins", materials: ["snow", "aged_stone"], landmarkRule: "ice shards glow as landmarks" }
      : { biome: "ruins", materials: ["aged_stone", "ancient_wood", "magical_crystal"], landmarkRule: "one bonfire or crystal landmark visible per room" };

  const protagonistName = input.protagonist
    ?? (t.includes("immortal girl") || t.includes("menina imortal") ? "The Immortal Girl" : "The Wanderer");

  const mk = (name: string, main: string, trim: string, silhouette: string, costume: string, eye?: string, skin?: string): VisualIdentity => ({
    name,
    proportions: { h: 16, headRatio: 4 },
    colors: { main, trim, skin: skin ?? "#e8bea0", eye: eye ?? "#fbbf24" },
    silhouette,
    costume,
    canonicalPrompt: "",
  });

  const protagonist = mk(protagonistName, pal.accent, pal.highlight, "compact hero, readable at 32px, weapon held high", "tattered traveling cloak over light armor", "#fbbf24");
  const enemy = mk("Hollow Wraith", pal.danger, darken(pal.danger, 0.5), "hunched imp with horns — never symmetrical detail below 2px", "none");
  const boss = mk("The Hollow Sovereign", darken(pal.primary, 0.7), pal.accent, "towering robed silhouette with horned crown; widest at shoulders", "royal tattered robes", "#fff2b0");
  const npc = mk("Keeper Echo", "#607868", "#a8d0b8", "hooded robed figure, always static, lantern-lit", "heavy hooded robe");

  const bible: ArtBible = {
    style,
    palette: dark
      ? { ...pal, bg: darken(pal.bg, 0.7) }
      : pal,
    lighting: {
      philosophy: dark ? "low-key: cold ambient, single warm key from lanterns/fires; gameplay-critical elements always lit" : "high-key even ambient with accent lighting",
      ambient: dark ? "#8a94c8" : "#d8dcea",
      key: "#fbbf24",
    },
    shapeLanguage: {
      characters: "rounded volumes, 1px outlines, faces as 2px dark pixels (no fine facial detail)",
      enemies: "angular + asymmetric accents (horns/spikes) to read as hostile at a glance",
    },
    silhouetteRule: "every entity readable at 32×32 against the darkest bg color; no interior detail below 1px",
    contrastRule: "enemies use the danger hue; interactables use the highlight hue; environment never uses those two hues",
    ui: { style: "dark glass panels, 1px light borders, tabular numerals", panelColor: darken(pal.bg, 0.8) },
    vfx: { style: "additive sparks, 3-frame pulses, no smoke blobs", particleColors: [pal.highlight, pal.accent] },
    environment: env,
    animation: { style: "snappy 2-4 frame cycles; anticipation frame before attacks", fps: 8, anticipation: true },
    identities: { protagonist, enemy, boss, npc },
  };

  // Canonical prompts guarantee AI regeneration consistency (§2)
  for (const id of [protagonist, enemy, boss, npc]) {
    id.canonicalPrompt = `${style} game character sheet of ${id.name}: ${id.silhouette}. Costume: ${id.costume}. Palette main ${id.colors.main} with ${id.colors.trim} trim on ${pal.bg} backgrounds. ${bible.silhouetteRule}. Single character, centered, magenta background (#FF00FF) for chroma keying.`;
  }
  return ArtBible.parse(bible);
}

/** Renders docs/art-bible.md — the human-readable artifact (§1). */
export function bibleToMarkdown(b: ArtBible, title: string): string {
  const id = (v: VisualIdentity) =>
    `- **${v.name}** — ${v.silhouette}. Traje: ${v.costume || "—"}. Cores: main \`${v.colors.main}\`, trim \`${v.colors.trim}\`${v.colors.eye ? `, olhos \`${v.colors.eye}\`` : ""}.`;
  return `# Art Bible — ${title}

> Constituição visual do projeto. TODO gerador de asset lê \`data/art_bible.json\` —
> nenhum asset é gerado fora deste contrato. Mudanças de direção passam pelo
> Art Direction Change Engine (POST /change) para regenerar dependências.

## Estilo de renderização
**${b.style}** · Animação: ${b.animation.style} (${b.animation.fps} fps${b.animation.anticipation ? ", com antecipação" : ""})

## Paleta
| Papel | Cor |
|---|---|
| primary | \`${b.palette.primary}\` |
| secondary | \`${b.palette.secondary}\` |
| accent | \`${b.palette.accent}\` |
| bg | \`${b.palette.bg}\` |
| fg | \`${b.palette.fg}\` |
| danger (hostis) | \`${b.palette.danger}\` |
| highlight (interagíveis) | \`${b.palette.highlight}\` |

## Iluminação
${b.lighting.philosophy}. Ambient \`${b.lighting.ambient}\` · key \`${b.lighting.key}\`.

## Shape language
- Personagens: ${b.shapeLanguage.characters}
- Inimigos: ${b.shapeLanguage.enemies}

## Regras de silhueta e contraste
- ${b.silhouetteRule}
- ${b.contrastRule}

## Ambiente
Bioma **${b.environment.biome}** — materiais: ${b.environment.materials.join(", ")}. Landmarks: ${b.environment.landmarkRule}

## Identidades canônicas (§2 — consistência entre frames e cenas)
### Protagonista
${id(b.identities.protagonist)}
### Inimigo recorrente
${id(b.identities.enemy)}
### Chefe
${id(b.identities.boss)}
### NPC
${id(b.identities.npc)}

## UI e VFX
- UI: ${b.ui.style} (painel \`${b.ui.panelColor}\`)
- VFX: ${b.vfx.style} — partículas ${b.vfx.particleColors.join(", ")}

---
*Documento persistente do projeto · fonte de verdade: data/art_bible.json*
`;
}
