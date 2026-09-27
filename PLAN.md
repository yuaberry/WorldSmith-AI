# PLAN.MD — NEXUS FORGE (Documento de Continuidade)

> ⚡ **AI Autonomous Game Development Studio** — o usuário descreve o jogo em linguagem natural; agentes de IA derivam uma **GameSpecification** formal, forjam o projeto completo (código, mundo, assets com Art Bible, dados), **validam no Godot de verdade**, geram Steam Kit, builds executáveis e preview jogável no navegador.
>
> **Este arquivo é a memória do projeto.** Se o chat foi compactado: leia isto, o `README.md` e o `docs/STATUS.md` antes de tocar em qualquer código.

---

## 0. FATOS ESSENCIAIS (leia primeiro)

| Item | Valor |
|---|---|
| Repo local | `~/nexus-forge/` (git, branch `main`) |
| GitHub | https://github.com/yuaberry/nexus-forge (público, MIT, conta `yuaberry` logada via `gh`) |
| Site de download + demo jogável | https://yuaberry.github.io/nexus-forge/ (GitHub Pages serve `docs/`; demo WASM em `docs/demo/`) |
| Releases | v0.1…**v0.8.0** (última: "Studio-Grade Pixel Art") — `dist-release/nexus-forge.exe` (Win), `nexus-forge` (Linux), `nexus-forge-macos` |
| Stack | Monorepo pnpm: `packages/core` (Bun 1.4.2 + TypeScript strict + SQLite via `bun:sqlite`), `apps/ui` (React 18 + Vite + Tailwind v4), `packages/shared` (zod) |
| Runtime do app | `bun run packages/core/src/main.ts serve` → http://127.0.0.1:5180 (UI servida pelo core; no exe standalone a UI é embutida em base64) |
| Engine alvo principal | **Godot 4.3** — binário oficial auto-baixado para `~/.nexusforge/engines/godot/godot` (+ export templates em `~/.local/share/godot/export_templates/4.3.stable/`) |
| IA | OpenRouter (chave do usuário no arquivo `~/Key Openrouter Free`, importável pela UI/Settings; armazenada cifrada AES-256-GCM em `~/.nexusforge/secrets.enc`). Modelo texto default: `z-ai/glm-5.3-flash`; imagem: `google/gemini-3.1-flash-image` (créditos oscilam — 402 é tratado com ladder honesto); visão: `z-ai/glm-5.3` |
| Projetos gerados | ficam em `~/.nexusforge/projects/<slug>/` (DB: `~/.nexusforge/nexus.db`, SQLite WAL) — previews em `~/.nexusforge/previews/`, builds em `~/.nexusforge/builds/`, cache de assets em `~/.nexusforge/asset-cache/` |
| Testes | `bun test packages/core/tests` — **28 testes, 180 asserts, todos verdes** (2 suítes: `forge2.test.ts` spec/mundo/template; `assets.test.ts` Art Bible/validação/anim/material/reuse) |
| Comandos-chave | `pnpm core:dev` (server dev) · `./scripts/start.sh` (launcher) · `bun run scripts/build-release.ts` (recompila os 3 exes com UI embutida) · `gh release create vX.Y ./dist-release/...` |
| Estado atual | **v0.8.0** — pipeline spec→scaffold→assets estúdio→validação→preview funcionando ponta a ponta. Projeto de prova: `hollow-echoes` (metroidvania dark fantasy — o exemplo exato da diretiva) |

---

## 1. CRONOLOGIA COMPLETA (por release/commit)

| Versão | Entrega |
|---|---|
| v0.1 | Fundação: monorepo, core Bun+SQLite, pipeline forge 8 estágios, adapters Godot/Unreal, providers OpenRouter, Game DNA com proveniência, 20 arquétipos de gênero, UI dark-first, site, release de exes standalone |
| v0.2 | **PRO GAME KIT** (templates com menu/pausa/SFX/save) + **Steam Publish Kit** (store copy por LLM, capsules renderizadas via movie-writer, screenshots reais) + **builds .exe dos jogos** + **LIVE PREVIEW** (export Web → WASM rodando DENTRO do estúdio, assíncrono, auto-refresh pós-validação) |
| v0.2.1 | Jogo da IA jogável **no site** (WASM no GitHub Pages); redesign do site e do estúdio (design system v2, sidebar hub, blueprint grid) |
| v0.3 | **SPRITE FORGE**: PNG encoder próprio em TS puro (3 bugs corrigidos: chunks big-endian, wrapper zlib, CRC32 com máscara `&0xff`), pixel-art procedural animada, **AI sprites** (chroma-key magenta + credit-ladder 3000→1024→512), galeria Assets na UI |
| v0.4 | **Sprites ANIMADOS** (walk 4f/squash 3f/pulse 4f) + fix raiz `tex()` load-first (o export empacota .ctex, não o PNG cru — sprites eram invisíveis nos builds) + Steam Kit profissional completo (21 arquivos: publish-guide Steam Direct, press-release, IARC, legal, changelog, checklist de prontidão REAL) + `docs/game-dna.md` profissional |
| v0.5 | **SPEC-DRIVEN GENERATION**: GameSpecification formal (zod) persistida (`data/spec.json` + doc) governando tudo; **METROIDVANIA GENRE PACK** (parry+i-frames+knockback, FSM inimigo, boss 2 fases com intro cinematográfica letterbox/zoom, NPC+diálogo com escolhas, ability gates+backtracking, checkpoints+save versionado, mapa por descoberta, chuva, parallax 2.5D, gamepad); mundo determinístico por seed (`spec/roomGraph.ts` xorshift); data-driven (`data/*.json`); **Change Engine** (edição de stats em data, sem regen); 12 testes |
| v0.6 | **ASSET PIPELINE**: **Art Bible** (estilo derivado do prompt — pixel/anime/comic/painterly/vector/realistic; paleta com papéis semânticos; silhueta/contraste; identidades canônicas com `canonicalPrompt`); **materiais semânticos** (aged_stone/magical_crystal/ancient_wood/polished_steel/wet_asphalt/snow — estrutura, não ruído); **Asset Manifest**; **validação técnica** (decoder PNG próprio com verificação de CRC por chunk, dims, alpha, frame-consistency anti-drift, duplicatas — asset inválido = scaffold falha honestamente); **QA visual multimodal** (contact sheet → vision provider contra a Art Bible); **retheme engine** ("darker"/"cyberpunk"/"hand-painted"/"capa vermelha" → muta Bible → regenera SÓ a camada visual) |
| v0.7 | **ASSET PIPELINE V2**: **Animation Package System** (9 anims nomeadas no player: IDLE/WALK/RUN/JUMP/FALL/ATTACK(anticipation→impact→recovery)/PARRY/HURT/DEATH — com frame count, FPS, pivot, loop e **EVENTOS**: `hit_active` no frame de impacto, `parry_window_open`); FSM do inimigo mapeada a anims; boss WINDUP→ATTACK; `GameState.sprite_frames_for()` lê `data/animations.json` em runtime; **support assets** canônicos (portraits de diálogo usados pelo HUD, ícones de ability, key prompts, logo); **asset cache** content-addressed (§18 reuse); manifest com importSettings/deps/quality tiers; **QA de screenshots** (movie-writer captura frames reais → vision); validador com budgets por tipo de animação (combate ≤68%, locomoção ≤45%) |
| v0.8 | **STUDIO-GRADE PIXEL ART**: `pixelRamp.ts` (ramps com hue-shift, sel-out outlines, rim-light, dithering); herói 24×24 com capa esvoaçante/armadura 3-tonos/espada com glow; criatura 24×24 assimétrica; boss 32×32 com coroa; NPC com lanterna; tiles com bevel+AO+rachaduras; céu dithered + **skyline silhueta por bioma** + lua focal; pintores legados delegam aos v2; escalas calibradas (24px@1.5× alinha pés ao hitbox) |

---

## 2. ARQUITETURA (mapa de arquivos)

```
packages/core/src/
├── main.ts                 CLI: serve | detect | forge --idea/--resume | (rotas por script)
├── server.ts               Bun.serve 127.0.0.1:5180: REST + WS(/ws) + estáticos (UI dist ou EMBED) 
│                           Rotas: /api/status,projects,forge,tree,file,events,git,editor,validate,
│                           export-web,preview-status,store-kit,builds,build-game,assets,asset-file,
│                           ai-sprite,regen-sprite,change,credentials,settings,engines + /preview/:slug + /download/:slug
├── pipeline/forge.ts       8 estágios: analyze→dna→gdd→architecture→scaffold→tasks→buildout→validate
│                           (+ crash recovery: tasks "running" → pending; auto-preview pós-validate)
├── orchestrator/director.ts Plan (LLM zod-validado, fallback determinístico) · store.ts (CRUD SQLite)
├── spec/gameSpec.ts        GameSpecification (zod) + deriveSpec + specToMarkdown — O CONTRATO
├── spec/roomGraph.ts       Mundo determinístico por seed (grafo hub/west/crossroads/arena/gate/secret)
├── assets/
│   ├── pixelRamp.ts        hue-shift, selout, rimlight, dither — A base visual
│   ├── heroPainter.ts      paintHeroV2 (24×24, poses paramétricas — §2 por construção)
│   ├── creaturePainters.ts creature/boss/npc v2 (ramps, outline compartilhado)
│   ├── envPainters.ts      tiles stone/wood/crystal + sky v2 (dithered + skyline)
│   ├── spriteForge.ts      encoder PNG (IHDR/IDAT/IEND, zlib, CRC) + pintores legados (delegam a v2)
│   │                       + forgeDefaultSprites (slots animados + singles legacy)
│   ├── animPack.ts         player/enemy/boss packs (poses→frames; IDLE..DEATH com eventos)
│   ├── animPackBuilder.ts  buildAnimPack(bible) + animationsJson
│   ├── artBible.ts         ArtBible zod + deriveBible + bibleToMarkdown + styleFromPrompt
│   ├── materials.ts        forgeMaterials(biome) → assets/materials/tile_<mat>.png
│   ├── supportAssets.ts    portraits, ability icons, key prompts, logo (da Bible)
│   ├── assetCache.ts       cachedGenerate: reuse content-addressed (§18)
│   ├── manifest.ts         buildManifest (id/source/generator/style/dims/usage/version)
│   ├── validate.ts         decodePNG (CRC por chunk) + validateAssets (dims/alpha/não-vazio/
│   │                       frame-consistency com budgets por tipo/anti-drift/duplicatas)
│   ├── visualQA.ts         ImageGenerationProvider/VisionProvider + contact sheet + QA de sprites
│   │                       + runScreenshotQA (frames reais do jogo via movie-writer)
│   ├── aiSprites.ts        IA de imagem (chroma-key + credit-ladder) — slot-based
│   └── retheme.ts          regenera sprites+materiais da Bible mutada (§19)
├── engines/                GameEngineAdapter: godot.ts (detect/scaffold/validate/exportWeb/exe), unreal.ts (scaffold C++), manager.ts
│   ├── templates/          gd_common (project.godot c/ autoloads, rootScene, hudScript)
│   │                       gd_pro (gameStateProPatch: tex() load-first, SFX, save; menuScript)
│   │                       godot_topdown / godot_platformer / godot_3d (com sprites+áudio+menu)
│   │                       godot_metroidvania (compositor: bible→assets→validação→manifest)
│   ├── systems/            mv_player (state machine 9 estados+parry+anim events), mv_entities
│   │                       (enemy FSM/boss fases+cinema/npc), mv_world (GameState+sprite_frames_for/
│   │                       room loader/checkpoint/pickup), mv_ui (HUD+letterbox+diálogo+mapa+menu)
│   ├── godotExport.ts      ensureExportTemplates (~1GB streaming unzip) + exportWeb (import→export)
│   └── publish/            storeKit (capsules por movie-writer + 21 arquivos + checklist real),
│                           builds (export .exe/.linux + zip), publishingSet (Steam Direct/IARC/legal)
├── agents/                 prompts.ts (personas) + runtime.ts (coder→validação→fixer loop)
├── providers/              AIProvider + OpenRouter (timeout 5min, retry, JSON-repair) + registry (chatJson)
├── dna/ knowledge/ db/ events.ts settings.ts workspace.ts git.ts
packages/shared/src/index.ts  zod: DnaSection/Origin, Task, ForgeStage(8), GameBrief…
apps/ui/src/                App (sidebar hub), Home, CreateGame, ProjectView (▶Live Preview, Steam Kit,
                            .exe, Assets, DNA, Code, Logs), AssetsView, DnaView, SettingsView
scripts/                    start.sh/.bat/.command, build-release.ts (UI→base64→bun --compile ×3 OS),
                            e2e-rescaffold.ts (forge stages scaffold+validate no hollow-echoes)
docs/                       index.html (SITE de download + demo) + demo/ (WASM) + STATUS.md
tests/ (packages/core/tests) forge2.test.ts + assets.test.ts — 28 testes
```

## 3. PIPELINES DE GERAÇÃO (fluxo real atual)

**Forge:** ideia → analyze (Plan LLM/fallback) → dna (+`docs/game-dna.md`) → gdd → architecture → scaffold
(composer MV: deriveBible → sprites via cache → animPack → support → materiais → validateAssets (gate! §13)
→ manifest → screenshots QA async) → tasks (grafo) → buildout (coder LLM + validação headless + fixer ×3;
sem LLM: bloqueia honesto) → validate (smoke-run Godot autoritativo; PASS → auto-preview web) → playable.

**Change Engine (POST /change):** 1º retheme artístico (§19: escuro/cyberpunk/hand-painted/capa) →
2º stats data-driven (`data/player.json`: speed/parry/damage/jump) → 3º senão vira task incremental de coder.

## 4. INVARIÁVEIS E LIÇÕES TÉCNICAS (memory de engenharia — NÃO REGREDIR)

1. **Validação autoritativa**: `godot --headless --path . --quit-after N` é o juiz ("funciona?"). O `--check-only` do Godot **não registra autoloads e sai 0 mesmo com erro** — medido; nunca usar como gate.
2. **`tex()` load-first**: exports empacotam `.ctex`; PNG cru falha em builds. Ordem: `ResourceLoader.exists→load()`, senão `Image.new().load_png_from_buffer(bytes)` (método de INSTÂNCIA — estático não existe).
3. **Encoder PNG**: chunks big-endian; DEFLATE precisa wrapper **zlib** (fflate `zlibSync`, não `deflateSync`); CRC32 index precisa `& 0xff`.
4. **GDScript 4.3**: proibido `var x := null`; atribuição de propriedade fora de `_ready` no corpo da classe (ex.: `layer=100`) não compila; `ColorRect` **não** é `Node2D` (ancestral comum: `CanvasItem`); `SpriteFrames.get_animation_names()` (Godot 4), NÃO `get_animation_list()`; lambdas multi-linha ok; corotinas auto-resumem.
5. **APIs inventadas = proibição**: `Bun.ZipReaderChain` não existe (usar fflate). Verificar sempre contra o engine real.
6. **Self-match do pkill**: padrão `src/main[.]ts serve` para não matar o próprio shell; portas zumbis no 5180 mascaram testes (checar com `ss -tln`).
7. **Bun.write aceita `string|Uint8Array`**; workspace com sandbox de path (travessura → exceção); WS broadcast por eventBus.
8. **Crash recovery**: tasks "running" órfãs resetam para pending no início do forge; `--resume <id>` retoma; slugs duplicados ganham sufixo `-2`.
9. **Import antes de exportar**: `godot --headless --path . --import` é obrigatório antes de `--export-release` (gera `.godot/`), senão "file_cache" falha.
10. **Heredoc/bash tool**: strings > ~12KB podem truncar → dividir; `printf '%s\n' '...' > arquivo` para JSON (o write tool quebra com JSON puro).
11. **Honestidade como produto**: 402 de créditos, QA indisponível, feature inexistente → dizer claramente; STATUS.md mantém o que é real vs pendente.
12. **Anti-drift §2**: frames do mesmo personagem: locomoção ≤45% diff, combate/reação ≤68% (poses mudam silhueta legitimamente) — validador rejeita drift real.

## 5. AMBIENTE DESTA MÁQUINA (dev)

- Linux Mint 22 · 4 cores · 7.7GB RAM (usar streaming p/ >1GB; unzipSync em memória OOM)
- Godot 4.3 em `~/.nexusforge/engines/godot/godot`; templates de export instalados; **movie-writer só renderiza com display** (DISPLAY=:0 existe — Intel HD 4400); caminhos absolutos em `--write-movie` (relativo gravava na raiz)
- Chave OpenRouter: arquivo `~/Key Openrouter Free` (443 modelos; **imagem gasta créditos rápido** — ladder 3000→1024→512; visão geral funciona)
- GitHub: `gh` autenticado como `yuaberry`; releases publicam os 3 exes; Pages build automático
- Projeto de referência E2E: `hollow-echoes` (rode `bun run scripts/e2e-rescaffold.ts` após mudanças nos templates; validação: 0 erros esperado)

## 6. LIMITAÇÕES HONESTAS ATUAIS

- 3D: sem text-to-3D ainda (Godot 3D usa primitives+sky; `ModelGenerationProvider` é o próximo passo)
- Música/áudio: só SFX sintetizados (WAV gerado em TS)
- QA visual: depende de créditos; frames de screenshots precisam de raster com display
- Tasks LLM em buildout usam coder genérico (não mapeiam sistemas do genre pack → arquivos específicos)
- Assets pequenos (checkpoint/pickup/shard/glow) ainda nos pintores antigos (não v2)
- Windows/macOS: código multi-OS pronto, testes reais pendentes (máquina dev é Linux)

## 7. PRÓXIMAS PRIORIDADES (ordem sugerida)

1. Pintores v2 para checkpoint/pickup/shard/glow (fechar o refinamento visual)
2. **Vision QA em loop de screenshots do JOGO** (existe `runScreenshotQA`; ligar ao estágio validate com regen)
3. Mapear tasks do genre pack para o coder LLM (sistema→arquivo→edit cirúrgico)
4. Pipeline 3D: text-to-3D → GLTF → import/LOD/colisão → manifest
5. Atlas packing + import profiles por plataforma (§17 LOW→ULTRA real nos .import)
6. Genre packs 2/3: third-person action (lock-on), racing
7. Tauri shell (app desktop de verdade vs navegador) — Fase 2 antiga
8. Geração de música (loops por estado: explore/combat/boss)

## 8. REGRAS DA CASA (Yua Devs — sempre)

1. Ler antes de alterar; causa raiz antes de consertar. 2. Zero dados falsos — o STATUS é honesto. 3. Alterações pequenas, verificáveis, testadas (`bun test` + `tsc --noEmit` antes de commitar). 4. Registrar erros próprios (seção 4 acima). 5. Segredos nunca no repo. 6. Nunca inventar API de engine/Bun — medir contra o runtime. 7. Ao retomar: rodar `bun test packages/core/tests` e `./packages/core/node_modules/.bin/tsc -p packages/core/tsconfig.json --noEmit` antes de qualquer mudança.

---

_Atualizado em 2026-09-26 (pós-v0.8.0, commit 5d44994) para sobreviver à compactação do chat. Cronologia completa: `git log --oneline` + `gh release list`._
