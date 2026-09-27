/**
 * GameSpecification v2 — the formal intermediate layer (§2, §19 of the
 * production directive). Natural language NEVER drives generation directly:
 * the Director (LLM) or the deterministic genre-pack derives this schema,
 * it is persisted per project (data/spec.json + docs/game-specification.md)
 * and becomes the contract every stage, agent and the Change Engine reads.
 */
import { z } from "zod";

export const SystemFlags = z.object({
  movement: z.boolean().default(true),
  combat: z.boolean().default(true),
  parry: z.boolean().default(false),
  dodge: z.boolean().default(false),
  combos: z.boolean().default(false),
  aiFsm: z.boolean().default(true),
  boss: z.boolean().default(false),
  bossCinematicIntro: z.boolean().default(false),
  npc: z.boolean().default(false),
  dialogue: z.boolean().default(false),
  quests: z.boolean().default(false),
  inventory: z.boolean().default(false),
  equipment: z.boolean().default(false),
  abilities: z.boolean().default(false),
  abilityGates: z.boolean().default(false),
  backtracking: z.boolean().default(false),
  checkpoints: z.boolean().default(true),
  saveSlots: z.boolean().default(true),
  map: z.boolean().default(false),
  weather: z.boolean().default(false),
  particles: z.boolean().default(true),
  parallax: z.boolean().default(false),
  secrets: z.boolean().default(false),
  collectibles: z.boolean().default(true),
  gamepad: z.boolean().default(true),
});
export type SystemFlags = z.infer<typeof SystemFlags>;

export const GameSpecification = z.object({
  identity: z.object({
    title: z.string(),
    subtitle: z.string().default(""),
    genre: z.string(),
    subgenre: z.string().default(""),
    dimension: z.enum(["2d", "2.5d", "3d"]),
    camera: z.string().default("side-scroll"),
    platforms: z.array(z.string()).default(["windows", "linux", "web"]),
    rating: z.string().default("teen"),
    audience: z.string().default("core"),
  }),
  pillars: z.array(z.string()).min(1),
  loops: z.object({
    core: z.string(),
    secondary: z.array(z.string()).default([]),
  }),
  controls: z.object({
    scheme: z.string().default("gamepad-first"),
    actions: z.array(z.string()).default(["move", "jump", "attack", "parry", "dash", "interact", "map"]),
  }).passthrough(),
  systems: SystemFlags,
  world: z.object({
    areas: z.array(z.object({
      id: z.string(),
      name: z.string(),
      biome: z.string().default("ruins"),
      role: z.string().default("path"),
    })),
    seed: z.number().int().default(1),
    encounterPacing: z.string().default("ramp"),
  }),
  progression: z.object({
    abilities: z.array(z.string()).default([]),
    currency: z.string().default("shards"),
    onDeath: z.string().default("respawn-checkpoint"),
  }).passthrough(),
  narrative: z.object({
    tone: z.string().default("melancholic"),
    protagonist: z.string().default("the wanderer"),
    npcs: z.array(z.string()).default([]),
  }).passthrough(),
  performance: z.object({
    targetFps: z.number().int().default(60),
    resolution: z.string().default("1280x720"),
    tier: z.string().default("indie"),
  }).passthrough(),
  art: z.object({
    style: z.string().default("dark-fantasy pixel"),
    palette: z.object({
      accent: z.string().default("#4f7cff"),
      bg: z.string().default("#12131a"),
    }).passthrough(),
  }).passthrough(),
});
export type GameSpecification = z.infer<typeof GameSpecification>;

/** Derives the spec deterministically from the plan (offline mode / fallback). */
export function deriveSpec(input: {
  title: string; genre: string; dimension: "2d" | "3d" | "2.5d" | "hybrid";
  flavor: string; pillars: string[]; coreLoop: string; idea: string; seed: number;
}): GameSpecification {
  const t = input.idea.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  const mv = input.flavor === "metroidvania";
  const systems: SystemFlags = {
    movement: true,
    combat: true,
    parry: has("parry", "parry", "parry"),
    dodge: has("dodge", "esquiva", "roll"),
    combos: has("combo"),
    aiFsm: true,
    boss: has("boss", "chefe"),
    bossCinematicIntro: has("cinematic", "cinematogr"),
    npc: has("npc", "dialog", "diálogo", "dialogo"),
    dialogue: has("dialog", "dialogo", "diálogo", "fala"),
    quests: has("quest", "mission", "missão"),
    inventory: has("inventor"),
    equipment: has("equip", "gear", "loot"),
    abilities: true,
    abilityGates: mv,
    backtracking: mv,
    checkpoints: true,
    saveSlots: true,
    map: mv,
    weather: has("weather", "clima", "rain", "chuva"),
    particles: true,
    parallax: input.dimension !== "3d",
    secrets: mv || has("secret", "segredo"),
    collectibles: true,
    gamepad: has("controller", "gamepad", "controle"),
  };
  // metroidvania always gets its identity systems (genre pack baseline)
  if (mv) {
    systems.parry = true; systems.boss = true; systems.bossCinematicIntro = true;
    systems.npc = true; systems.dialogue = true; systems.map = true;
    systems.abilityGates = true; systems.backtracking = true; systems.checkpoints = true;
    systems.weather = true; systems.secrets = true; systems.gamepad = true;
  }
  return GameSpecification.parse({
    identity: {
      title: input.title,
      subtitle: mv ? "Echoes of the Ruined Kingdom" : "",
      genre: input.genre,
      subgenre: mv ? "metroidvania" : "",
      dimension: input.dimension === "3d" ? "3d" : input.dimension === "2.5d" ? "2.5d" : "2d",
      camera: mv ? "side-scroll" : input.dimension === "3d" ? "third-person" : "top-down",
      platforms: ["windows", "linux", "web"],
      rating: "teen",
      audience: "core",
    },
    pillars: input.pillars,
    loops: { core: input.coreLoop, secondary: mv ? ["unlock abilities → backtrack secrets", "souls from combat → progression"] : [] },
    controls: { scheme: "gamepad-first", actions: ["move", "jump", "attack", "parry", "dash", "interact", "map"] },
    systems,
    world: {
      areas: mv
        ? [
            { id: "hub", name: "Broken Cloister", biome: "ruins", role: "hub" },
            { id: "west", name: "Sunken Gallery", biome: "ruins", role: "path" },
            { id: "crossroads", name: "Wailing Crossroads", biome: "caves", role: "path" },
            { id: "arena", name: "Chapel of Hollows", biome: "arena", role: "arena" },
            { id: "gate", name: "Sovereign's Door", biome: "boss", role: "boss-gate" },
            { id: "secret", name: "Forgotten Reliquary", biome: "caves", role: "secret" },
          ]
        : [{ id: "hub", name: "The Threshold", biome: "ruins", role: "hub" }],
      seed: input.seed,
      encounterPacing: "ramp",
    },
    progression: {
      abilities: mv ? ["dash"] : [],
      currency: "shards",
      onDeath: "respawn-checkpoint",
    },
    narrative: {
      tone: has("dark", "sombr", "melanc", "tragic") ? "melancholic" : "neutral",
      protagonist: has("immortal", "imortal") ? "the immortal girl" : "the wanderer",
      npcs: mv ? ["Keeper Echo"] : [],
    },
    performance: { targetFps: 60, resolution: "1280x720", tier: "indie" },
    art: { style: mv ? "dark-fantasy pixel" : "pixel", palette: { accent: "#4f7cff", bg: "#12131a" } },
  });
}

/** Renders the spec as the professional document (docs/game-specification.md). */
export function specToMarkdown(spec: GameSpecification): string {
  const on = (b: boolean) => (b ? "SIM" : "—");
  const s = spec.systems;
  const systemsTable = [
    ["Movimento (acel, coyote, buffer)", s.movement],
    ["Combate corpo a corpo + i-frames", s.combat],
    ["Parry (janela, counter, stagger)", s.parry],
    ["Dodge/roll", s.dodge],
    ["IA por máquina de estados (FSM)", s.aiFsm],
    ["Chefe com fases", s.boss],
    ["Introdução cinematográfica do chefe", s.bossCinematicIntro],
    ["NPCs", s.npc],
    ["Diálogo com escolhas e retratos", s.dialogue],
    ["Habilidades desbloqueáveis", s.abilities],
    ["Portões de habilidade (backtracking)", s.abilityGates],
    ["Backtracking", s.backtracking],
    ["Checkpoints (save points)", s.checkpoints],
    ["Slots de save versionados", s.saveSlots],
    ["Mapa por descoberta", s.map],
    ["Clima dinâmico", s.weather],
    ["Partículas (chuva, impactos)", s.particles],
    ["Parallax 2.5D", s.parallax],
    ["Segredos", s.secrets],
    ["Coletáveis", s.collectibles],
    ["Suporte a controle (gamepad)", s.gamepad],
  ] as Array<[string, boolean]>;
  return `# GameSpecification — ${spec.identity.title}

> Especificação formal derivada do prompt. É o CONTRATO da geração: estágios,
> agentes e o Change Engine leem \`data/spec.json\` (idêntico a este documento).

## Identidade
- **Título**: ${spec.identity.title}${spec.identity.subtitle ? ` — *${spec.identity.subtitle}*` : ""}
- **Gênero**: ${spec.identity.genre}${spec.identity.subgenre ? ` · subgênero ${spec.identity.subgenre}` : ""}
- **Dimensão/Câmera**: ${spec.identity.dimension} · ${spec.identity.camera}
- **Plataformas**: ${spec.identity.platforms.join(", ")} · Classificação: ${spec.identity.rating}

## Pilares de design
${spec.pillars.map((p) => `- ${p}`).join("\n")}

## Loops
- **Core**: ${spec.loops.core}
${spec.loops.secondary.map((l) => `- Secundário: ${l}`).join("\n")}

## Sistemas ativados (biblioteca de sistemas)
| Sistema | Ativo |
|---|---|
${systemsTable.map(([label, active]) => `| ${label} | ${on(active)} |`).join("\n")}

## Mundo (geração determinística)
- **Seed**: ${spec.world.seed} — mesma seed ⇒ mesmo mundo
- **Áreas**: ${spec.world.areas.map((a) => `${a.name} (${a.role}/${a.biome})`).join(" · ")}

## Progressão e narrativa
- Habilidades: ${spec.progression.abilities.join(", ") || "—"} · Moeda: ${spec.progression.currency} · Morte: ${spec.progression.onDeath}
- Tom: ${spec.narrative.tone} · Protagonista: ${spec.narrative.protagonist} · NPCs: ${spec.narrative.npcs.join(", ") || "—"}

## Performance
- ${spec.performance.targetFps} FPS @ ${spec.performance.resolution} (tier ${spec.performance.tier})

## Controles
- Esquema: ${spec.controls.scheme} · Ações: ${spec.controls.actions.join(", ")}

---
*Gerado pelo Nexus Forge · fonte de verdade: data/spec.json*
`;
}
