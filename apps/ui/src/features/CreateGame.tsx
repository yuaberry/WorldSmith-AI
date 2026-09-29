/** Create Game — professional multi-step wizard (§6).
 *
 *  Every step maps to a REAL effect: backend fields (idea, genreTags,
 *  qualityTier, platforms, contentRating, engine, dimensions) or idea-text
 *  augmentation that provably flows into generation (Art Bible's
 *  styleFromPrompt and the Director's plan read the idea). No decorative
 *  steps, no fake options. Back/Next is always free — the plan is reviewed
 *  before forging (§6 Etapa I).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, Info, ArrowLeft, ArrowRight, Wand2, Check } from "lucide-react";
import { api } from "../lib/api";

// ── catálogos (real pipeline surface) ────────────────────────────────────────

const ARCHETYPES: Array<{ id: string; label: string; kw: string[] }> = [
  { id: "metroidvania", label: "Metroidvania", kw: ["metroidvania", "hollow", "interconectado", "backtracking", "mapa", "explorar"] },
  { id: "precision-platformer", label: "Plataforma de Precisão", kw: ["plataforma", "precision", "celeste", "pulo", "dificil"] },
  { id: "roguelite-action", label: "Roguelike / Roguelite", kw: ["roguelike", "roguelite", "run", "permadeath", "hades", "sobrevisal por rodadas"] },
  { id: "soulslike", label: "Action RPG (Souls-like)", kw: ["souls", "elden", "difícil", "boss", "esquiva", "bonfire"] },
  { id: "arpg-loot", label: "Action RPG / Loot", kw: ["diablo", "loot", "grind", "dungeon", "itens raros"] },
  { id: "colony-survival", label: "Colônia / City Builder", kw: ["colony", "colônia", "rimworld", "settlers", "cidade", "colonos"] },
  { id: "survival-craft", label: "Sobrevivência & Crafting", kw: ["sobrevivência", "survival", "craft", "fome", "zumbi", "rust"] },
  { id: "cozy-life-sim", label: "Life/Farm Sim", kw: ["farm", "stardew", "agricultura", "vila", "acolhedor", "cozy"] },
  { id: "tower-defense", label: "Tower Defense", kw: ["tower defense", "torres", "ondas", "defesa"] },
  { id: "factory-automation", label: "Automação / Fábrica", kw: ["automação", "factory", "factorio", "belts", "máquinas"] },
  { id: "deckbuilder", label: "Cartas / Deckbuilding", kw: ["cartas", "cards", "deck", "baralho"] },
  { id: "fps-multiplayer", label: "FPS", kw: ["fps", "tiro", "shooter", "primeira pessoa"] },
  { id: "racing-sim", label: "Corrida", kw: ["corrida", "racing", "carro", "pista", "direção"] },
  { id: "psychological-horror", label: "Terror Atmosférico", kw: ["terror", "horror", "assustador", "silencio", "dark"] },
  { id: "physics-coop", label: "Física / Party", kw: ["física", "party", "friends", "cooperativo local"] },
  { id: "jrpg-narrative", label: "RPG Narrativo / Turnos", kw: ["turnos", "jrpg", "história", "narrativo", "rpg"] },
  { id: "rts", label: "Estratégia em Tempo Real", kw: ["rts", "estratégia", "bases", "exército"] },
  { id: "sports-arcade", label: "Esportes / Arcade", kw: ["esporte", "futebol", "arcade", "competição"] },
  { id: "pixel-mmorpg", label: "MMO 2D", kw: ["mmo", "online", "multiplayer", "mundo aberto online"] },
  { id: "sandbox-voxel", label: "Sandbox / Voxel", kw: ["sandbox", "voxel", "minecraft", "blocos"] },
  { id: "open-world-action", label: "Mundo Aberto / Ação", kw: ["mundo aberto", "open world", "aventura", "explorar"] },
  { id: "zombie-openworld", label: "Zumbi / Parkour", kw: ["zumbi", "parkour", "apocalipse"] },
  { id: "anime-action", label: "Action RPG Estilo Anime", kw: ["anime", "gacha", "elementos", "party"] },
  { id: "session-horror", label: "Horror Co-op", kw: ["coop", "horror", "equipe", "fantasmas"] },
];

const SCOPES = [
  { id: "ps2-era", label: "Protótipo Jogável", hint: "Um slice vertical rápido: valida a ideia na engine. Menor custo, resultado em minutos." },
  { id: "indie", label: "Demo Vertical (recomendado)", hint: "O equilíbrio da pipeline atual: sistemas completos de um gênero, boss, Steam Kit e preview jogável." },
  { id: "aa", label: "Projeto de Médio Porte", hint: "Mais conteúdo e sistemas por cima do mesmo alicerce — exige mais sessões de buildout." },
];

const ART_STYLES = [
  { id: "pixel-dark", label: "Pixel Art Sombria", hint: "Dark fantasy 2D, paleta profunda", inject: "Direção de arte: pixel art sombria estilo dark fantasy, paleta fria com acentos quentes." },
  { id: "pixel-vivid", label: "Pixel Art Vívida", hint: "Cores vivas, cozinheiro-friendly", inject: "Direção de arte: pixel art vívida e colorida, silhuetas legíveis." },
  { id: "hand-drawn", label: "Desenhado à Mão", hint: "Traço orgânico 2D", inject: "Direção de arte: estilo desenhado à mão, traço orgânico." },
  { id: "cyberpunk", label: "Cyberpunk Neon", hint: "Neon, ciberesgoto", inject: "Direção de arte: cyberpunk neon, atmosfera noturna com luzes saturadas." },
  { id: "low-poly", label: "Low-poly", hint: "3D estilizado leve", inject: "Direção de arte: low-poly estilizado." },
  { id: "survival-gritty", label: "Sobrevivência Crua", hint: "Realismo sujo, tons terrosos", inject: "Direção de arte: sobrevivência crua, tons terrosos, atmosfera pesada." },
];

const DIMENSIONS = [
  { id: "2d", label: "2D", hint: "Pixel / top-down / platformer" },
  { id: "3d", label: "3D", hint: "Mundos tridimensionais" },
];
const ENGINES = [
  { id: "godot4", label: "Godot 4", hint: "2D+3D · validação headless real" },
  { id: "unreal5", label: "Unreal 5", hint: "3D · scaffold real (compila com engine instalada)" },
];
const PLATFORMS = ["windows", "linux", "macos", "web"];
const EXTRA_PLATFORMS = ["switch", "ps5", "xbox", "android", "ios", "vr"];
const RATINGS = [
  { id: "everyone", label: "Livre (E)" },
  { id: "teen", label: "Adolescente (T)" },
  { id: "mature", label: "Maduro (M)" },
  { id: "adult", label: "Adulto (+18)" },
];
const ACCESSIBILITY = [
  { id: "gamepad", label: "Gamepad completo", inject: "Controles: suporte total a gamepad." },
  { id: "remap", label: "Remapeamento de teclas", inject: "Controles: remapeamento de teclado." },
  { id: "subtitles", label: "Legendas em diálogos", inject: "Acessibilidade: legendas em todos os diálogos." },
  { id: "high-contrast", label: "Modo alto contraste", inject: "Acessibilidade: modo de alto contraste na UI." },
];

const STEPS = ["Ideia", "Gênero", "Escopo", "Arte", "Plataformas", "Conteúdo", "Plano"];

// ── component ───────────────────────────────────────────────────────────────

export default function CreateGame() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState("");
  const [name, setName] = useState("");
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [scope, setScope] = useState("indie");
  const [art, setArt] = useState<string | null>(null);
  const [dimension, setDimension] = useState("2d");
  const [engine, setEngine] = useState("godot4");
  const [platforms, setPlatforms] = useState<string[]>(["windows", "linux"]);
  const [extra, setExtra] = useState<string[]>([]);
  const [rating, setRating] = useState("teen");
  const [access, setAccess] = useState<string[]>(["gamepad"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const t = idea.toLowerCase();
    if (t.length < 12) return [] as string[];
    return ARCHETYPES.filter((a) => a.kw.some((k) => t.includes(k))).slice(0, 3).map((a) => a.id);
  }, [idea]);

  const toggle = (list: string[], set: (v: string[]) => void, id: string, multi = true) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : multi ? [...list, id] : [id]);

  const composedIdea = useMemo(() => {
    const extras: string[] = [];
    const artStyle = ART_STYLES.find((a) => a.id === art);
    if (artStyle) extras.push(artStyle.inject);
    for (const a of ACCESSIBILITY) if (access.includes(a.id)) extras.push(a.inject);
    return extras.length ? `${idea.trim()}\n\n${extras.join(" ")}` : idea.trim();
  }, [idea, art, access]);

  const canNext = () => {
    if (step === 0) return idea.trim().length >= 10;
    return true;
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const { project } = await api.createProject({
        idea: composedIdea,
        name: name.trim() || undefined,
        dimensions: dimension,
        engine,
        qualityTier: scope,
        platforms: [...platforms, ...extra],
        genreTags,
        contentRating: rating,
      });
      void api.forge(project.id).catch(() => undefined);
      nav(`/project/${project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar projeto");
      setBusy(false);
    }
  };

  const archLabel = (id: string) => ARCHETYPES.find((a) => a.id === id)?.label ?? id;
  const scopeLabel = SCOPES.find((s) => s.id === scope)?.label ?? scope;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5 slide-in">
      <div>
        <h1 className="text-xl font-bold">Criar um jogo</h1>
        <p className="text-mute text-sm mt-1">
          Sete passos rápidos — só a ideia é obrigatória. Você revisa o plano antes da forja.
        </p>
      </div>

      {/* stepper */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i <= step && setStep(i)}
            className={`flex-1 text-[10px] font-bold tracking-wider px-2 py-2 rounded-lg border transition-colors ${
              i === step
                ? "border-brand/50 text-brand-soft bg-brand/10"
                : i < step
                  ? "border-good/30 text-good/60 bg-good/5 cursor-pointer"
                  : "border-edge text-faint"
            }`}
          >
            {i < step ? <Check size={10} className="inline mr-1" /> : `${i + 1}. `}
            {s}
          </button>
        ))}
      </div>

      {/* ── ETAPA A — ideia ── */}
      {step === 0 && (
        <div className="panel p-5 space-y-3">
          <label className="kicker">A · A IDEIA</label>
          <textarea
            className="input min-h-[140px]"
            placeholder='Ex.: "Um metroidvania sombrio onde uma vaga-lume procura sua luz roubada num reino em ruínas, com parry, dash e um rei oco…"'
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
          />
          <input className="input" placeholder="Título (opcional — a IA sugere)" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex items-center gap-2 text-[11px] text-mute">
            <Info size={12} /> Anexos de referência (imagens, docs) são importados dentro do projeto.
          </div>
          {suggestions.length > 0 && (
            <div className="text-[11px]">
              <span className="text-warn flex items-center gap-1 mb-1.5"><Wand2 size={11} /> Sugestões pela sua ideia:</span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => { setGenreTags([s]); setStep(1); }} className="tag cursor-pointer border-brand/40 text-brand-soft">
                    {archLabel(s)} →
                  </button>
                ))}
              </div>
            </div>
          )}
          {idea.trim().length > 0 && idea.trim().length < 10 && (
            <div className="text-[11px] text-warn">Descreva com pelo menos 10 caracteres.</div>
          )}
        </div>
      )}

      {/* ── ETAPA B — gênero/arquétipos ── */}
      {step === 1 && (
        <div className="panel p-5 space-y-3">
          <label className="kicker">B · GÊNERO & ARQUÉTIPOS</label>
          <p className="text-[11px] text-mute">Combine um ou mais — os arquétipos alimentam o Director com padrões de design (loops, sistemas, armadilhas conhecidas).</p>
          <div className="flex flex-wrap gap-1.5 max-h-[280px] overflow-y-auto">
            {ARCHETYPES.map((a) => (
              <button
                key={a.id}
                onClick={() => toggle(genreTags, setGenreTags, a.id)}
                className={`tag cursor-pointer ${genreTags.includes(a.id) ? "border-brand text-brand-soft bg-brand/10" : ""}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ETAPA C — escopo ── */}
      {step === 2 && (
        <div className="panel p-5 space-y-3">
          <label className="kicker">C · ESCOPO</label>
          <p className="text-[11px] text-mute">Sem promessas impossíveis: cada escopo descreve o que a pipeline sustenta hoje.</p>
          <div className="space-y-2">
            {SCOPES.map((s) => (
              <button
                key={s.id}
                onClick={() => setScope(s.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors ${scope === s.id ? "border-brand/50 bg-brand/10" : "border-edge hover:border-brand/25"}`}
              >
                <div className="text-[13px] font-bold">{s.label}</div>
                <div className="text-[11px] text-mute mt-0.5">{s.hint}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ETAPA D — direção de arte ── */}
      {step === 3 && (
        <div className="panel p-5 space-y-3">
          <label className="kicker">D · DIREÇÃO DE ARTE</label>
          <p className="text-[11px] text-mute">A escolha é injetada na ideia e governa a Art Bible (paleta, iluminação, identidades canônicas).</p>
          <div className="grid grid-cols-2 gap-2">
            {ART_STYLES.map((a) => (
              <button
                key={a.id}
                onClick={() => setArt(art === a.id ? null : a.id)}
                className={`text-left p-3.5 rounded-xl border transition-colors ${art === a.id ? "border-brand/50 bg-brand/10" : "border-edge hover:border-brand/25"}`}
              >
                <div className="text-[13px] font-bold">{a.label}</div>
                <div className="text-[11px] text-mute mt-0.5">{a.hint}</div>
              </button>
            ))}
          </div>
          <label className="kicker pt-2">DIMENSÃO</label>
          <div className="flex gap-2">
            {DIMENSIONS.map((d) => (
              <button key={d.id} onClick={() => setDimension(d.id)} className={`btn flex-1 justify-center ${dimension === d.id ? "btn-primary" : ""}`}>
                {d.label} <span className="text-[10px] opacity-60 ml-1">{d.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ETAPA E — plataformas + engine ── */}
      {step === 4 && (
        <div className="panel p-5 space-y-4">
          <label className="kicker">E · PLATAFORMAS</label>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => toggle(platforms, setPlatforms, p)} className={`tag uppercase cursor-pointer ${platforms.includes(p) ? "border-brand text-brand-soft bg-brand/10" : ""}`}>
                {p}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-faint">Alvos verificados pela pipeline atual: Windows, Linux e Web (WASM). macOS tem código pronto.</p>
          <div className="flex flex-wrap gap-1.5">
            {EXTRA_PLATFORMS.map((p) => (
              <button key={p} onClick={() => toggle(extra, setExtra, p)} className={`tag uppercase cursor-pointer text-faint ${extra.includes(p) ? "border-warn/40 text-warn bg-warn/5" : ""}`}>
                {p}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-faint">Alvos futuros (metadados honestos: exigem SDK/licença — nada é prometido sem build).</p>
          <label className="kicker pt-2">ENGINE</label>
          <div className="grid grid-cols-2 gap-2">
            {ENGINES.map((e2) => (
              <button key={e2.id} onClick={() => setEngine(e2.id)} className={`btn justify-start ${engine === e2.id ? "btn-primary" : ""}`}>
                <div className="text-left">
                  <div className="text-[13px]">{e2.label}</div>
                  <div className="text-[10px] opacity-70">{e2.hint}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ETAPA F/G — classificação, acessibilidade ── */}
      {step === 5 && (
        <div className="panel p-5 space-y-4">
          <label className="kicker">F · CLASSIFICAÇÃO & CONTROLES</label>
          <select className="input" value={rating} onChange={(e) => setRating(e.target.value)}>
            {RATINGS.map((r) => (
              <option key={r.id} value={r.id} className="bg-panel">{r.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-faint">A classificação alimenta o Steam Kit (IARC) e vira metadados de publicação. Conteúdo adulto explícito fica fora do escopo.</p>
          <label className="kicker pt-2">ACESSIBILIDADE</label>
          <div className="flex flex-wrap gap-1.5">
            {ACCESSIBILITY.map((a) => (
              <button key={a.id} onClick={() => toggle(access, setAccess, a.id)} className={`tag cursor-pointer ${access.includes(a.id) ? "border-brand text-brand-soft bg-brand/10" : ""}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ETAPA I — plano ── */}
      {step === 6 && (
        <div className="panel p-5 space-y-4">
          <label className="kicker">G · PLANO — REVISE ANTES DE FORJAR</label>
          <div className="space-y-2.5 text-[12.5px]">
            <div><span className="text-mute">Conceito:</span> {composedIdea.slice(0, 220)}{composedIdea.length > 220 ? "…" : ""}</div>
            <div><span className="text-mute">Título:</span> {name.trim() || <i className="text-faint">a IA sugere</i>}</div>
            <div><span className="text-mute">Arquétipos:</span> {genreTags.length ? genreTags.map(archLabel).join(" + ") : <i className="text-faint">o Director infere</i>}</div>
            <div><span className="text-mute">Escopo:</span> {scopeLabel}</div>
            <div><span className="text-mute">Arte:</span> {art ? ART_STYLES.find((a) => a.id === art)?.label : <i className="text-faint">derivada da ideia</i>}</div>
            <div><span className="text-mute">Engine / dimensão:</span> {engine === "godot4" ? "Godot 4" : "Unreal 5"} · {dimension.toUpperCase()}</div>
            <div><span className="text-mute">Plataformas:</span> {[...platforms, ...extra].join(", ")}</div>
            <div><span className="text-mute">Classificação:</span> {RATINGS.find((r) => r.id === rating)?.label}</div>
            <div><span className="text-mute">Acessibilidade:</span> {access.length ? access.map((x) => ACCESSIBILITY.find((a) => a.id === x)?.label).join(", ") : <i className="text-faint">padrão</i>}</div>
            <div className="text-[11px] text-mute pt-2 border-t border-edge">
              O pipeline: analyze → DNA → GDD → arquitetura → scaffold com assets (Art Bible) → tasks → buildout → <b>validate com QA funcional</b> → preview jogável.
            </div>
          </div>
          {error && <div className="panel border-bad/40 bg-bad/10 p-3 text-sm text-bad">{error}</div>}
          <button className="btn btn-primary w-full justify-center py-3 text-[14px]" disabled={busy} onClick={create}>
            <Rocket size={16} />
            {busy ? "Forjando…" : "Aprovar plano e forjar o jogo"}
          </button>
        </div>
      )}

      {/* nav */}
      <div className="flex gap-2 pb-6">
        <button className="btn flex-1 justify-center" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>
          <ArrowLeft size={14} /> Voltar
        </button>
        {step < 6 && (
          <button className="btn btn-primary flex-1 justify-center" disabled={!canNext() || busy} onClick={() => setStep(step + 1)}>
            Continuar <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
