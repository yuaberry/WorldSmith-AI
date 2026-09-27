# PLAN.MD — WORLDSMITH AI · Documento-Mãe de Continuidade

> ⚡ **WorldSmith AI** (renomeado de *Nexus Forge* na v0.10.0 — ver §14) — **AI Autonomous Game Development Studio**: o usuário descreve o jogo em linguagem natural; agentes de IA derivam uma **GameSpecification** formal, forjam o projeto completo (código, mundo determinístico, assets com Art Bible e pixel art de nível estúdio, dados), **validam no Godot de verdade**, geram Steam Kit completo, builds executáveis (.exe/Linux/macOS) e um preview **jogável dentro do estúdio e no site**.
>
> **Este arquivo é a memória integral do projeto.** Se o chat foi compactado: leia este documento INTEIRO, depois o `README.md` e o `docs/STATUS.md`, execute o Protocolo de Retomada (§9) e só então toque em código.

---

## 1. VISÃO DO PROJETO (a estrela-guia — nunca perder de vista)

**Visão original do dono**: *"minha ideia inicial era fazer um Launcher Engine com preview ao vivo"*.

**Visão evoluída (atual, confirmada pelo dono)**: um **AI Game Production Environment de nível estúdio internacional** — não um gerador de mockups, não um chatbot de código. O usuário escreve um prompt natural (ex.: o metroidvania dark fantasy do §2), e o WorldSmith AI produz **um jogo de verdade**: especificação formal → Game DNA → GDD → arquitetura → mundo interconectado → código modular data-driven → **assets com direção de arte consistente (Art Bible) e pixel art profissional** → validação automatizada em engine real → Steam Kit completo (capa, descrição, screenshots, legal) → builds standalone → preview jogável no navegador.

**Identity**: `WORLDSMITH AI` · *AI Autonomous Game Development Studio* · **Imagine. Direct. Build.** · *(até v0.9.0: NEXUS FORGE — histórico preservado nas citações)*

**Pilares invioláveis** (extraídos de todas as sessões — regem toda decisão):
1. **Honestidade antes de polish**: nada de botão "Coming Soon" falso; 402 de créditos, QA indisponível ou feature pendente são dito com clareza (§ "No fake professionalism").
2. **Validação real**: um jogo só é "pronto" quando o Godot headless roda limpo; assets só entram no jogo após validação técnica (§13) e são verificados por QA multimodal (§14).
3. **Assets são dependências de gameplay**, não decoração — governados pela Art Bible (§1 asset directive).
4. **Especificação formal**: linguagem natural NUNCA dirige a geração diretamente — tudo passa pelo GameSpecification.
5. **Mudanças incrementais**: o Change Engine altera dados/Art Bible, não regenera o projeto.
6. **Multi-engine, provider-agnóstico**: Godot hoje, Unreal scaffold, Unity prevista; OpenRouter hoje, abstrações prontas para outros.
7. **O usuário é Creative Director**; os agentes são a equipe técnica de engenharia/QA/art.

---

## 2. PROMPT INICIAL DO PROJETO (fundador — digest fiel das 47 seções)

> Título: **"NEXUS FORGE — AI AUTONOMOUS GAME DEVELOPMENT STUDIO"** · Tagline: *Imagine. Direct. Build.*
> Missão: plataforma desktop profissional de desenvolvimento de jogos assistido/automatizado por múltiplos agentes de IA — capaz de: criar projetos, analisar referências visuais/conceituais, transformar ideias em documentação técnica, escolher/configurar engine, criar estrutura, escrever código, criar sistemas de gameplay, gerar/organizar assets, executar a engine, compilar, executar o jogo, testes automatizados, playtests automatizados, detectar/corrigir problemas, versionar, memória persistente, aprovação humana, coordenar agentes, progresso em tempo real. Exemplo de uso: "Quero criar um jogo chamado NeoHaven, inspirado em jogos de colony survival... quero utilizar Unreal Engine 5."

- **§1 Princípio fundamental**: não ser caixa-preta — o usuário visualiza o que a IA entendeu, decisões, agentes trabalhando, arquivos modificados, sistemas criados, testes, problemas, aprovações, estado. Autônoma, mas **auditável, reversível e controlável**.
- **§2 Identidade**: dark-first, preto/grafite, azul elétrico, roxo discreto, ciano ativo, glassmorphism moderado; estética Unreal+VS Code+Blender+Figma.
- **§3 Plataformas**: Windows x64, Linux x64/ARM64, macOS Intel/Apple Silicon; **nunca assumir caminhos de um SO**; descoberta de engines instaladas.
- **§4 Arquitetura modular**: Desktop Client, Project Manager, AI Orchestrator, Agent Runtime, Game Knowledge, Game DNA, Reference Analyzer, Engine Integration, Asset Pipeline, Code Workspace, Build, Test, Playtesting, VCS, Artifact Manager, Plugin System, Settings/Security.
- **§5 Interface**: sidebar Dashboard, Projects, Create Game, Game DNA, Agents, References, Design, World, Systems, Code, Assets, Engine, Builds, Tests, Playtest, Versions, Logs, Settings; topbar com projeto/engine/branch/build/agentes/CPU/RAM/GPU.
- **§6 Dashboard**: progresso, fase, engine, agentes ativos, tasks (completed/running/pending/blocked), build, tests, last playtest + timeline + activity feed por agente.
- **§7 Create Game Wizard**: campo grande de linguagem natural + anexos (imagens, vídeos, docs, PDFs); campos opcionais (Name, Genre, Engine, Platform, Camera, Visual Style, Resolution, FPS, Multiplayer, Audience); a IA **infere** e marca Confirmado/Inferido/Unknown/Requires Decision.
- **§8 GAME DNA** (o coração): memória estrutural permanente com 24 seções (Vision, Core Fantasy, Pillars, Genre, Loop, Mechanics, World, Lore, Characters, Factions, Economy, Progression, Art/Audio/UX Direction, Tech Architecture, Perf Targets, Platforms, Engine, Coding Standards, Asset Rules, Naming, Dev Rules, Decisions). **Todo agente consulta o DNA antes de decidir**; ninguém contradiz decisões aprovadas sem revisão.
- **§9-10 Reference Hub + biblioteca de jogos de referência**: análise ABSTRATA de padrões (zero conteúdo proprietário — nunca baixar/copiar assets protegidos).
- **§12 MULTI-AGENT**: Nexus Director (orquestrador), Game Designer, Technical Architect, Gameplay Programmer, AI/NPC, World Builder, UI/UX, Art Director, Asset, Audio, Build, QA, Playtest, Optimization, Documentation, Reference Analyst.
- **§14 Orchestrator**: tasks com ID, prioridade, dependências, agente, status (PENDING…COMPLETED), risco, aprovação; Director resolve dependências.
- **§15 Níveis de execução**: Manual / Assisted / Autonomous (alterações críticas sempre protegidas).
- **§16 Sandbox**: permissões ALLOW/DENY/ASK por Filesystem, Network, Terminal, Engine, Compiler, Git, etc.
- **§17-18 Engine Manager/Adapter**: detect, createProject, openEditor, build, run, package, logs, getErrors; **UE5 primeiro**, abstração para Unity/Godot; **nunca assumir uma única versão**.
- **§19 Code Agent**: analisa estrutura, consulta DNA, localiza arquivos, planeja, implementa, testa, revisa, relata; nunca sobrescreve indiscriminadamente — usa diffs.
- **§20 VCS**: branch/task-name, diff, commit, rollback, snapshots automáticos.
- **§21-22 Asset Pipeline + Visual Bible**: categorias, IDs, licenças, tags; Art Director valida consistência (Color/Lighting/Material/Architecture/Character/Environment/Camera/UI/VFX Rules).
- **§24-25 Test System + Autonomous Playtesting**: unit/integration/gameplay/engine/save-load/perf/regression; Playtest agent: launch→scenario→interact→observe→record→detect→report→fix task.
- **§28-29 AI Provider + Context**: provider-agnóstico (OpenRouter/OpenAI/Ollama); chave por agente; memória em camadas (Global/Project/DNA/Agent/Task/File/Conversation) — nunca enviar o projeto inteiro.
- **§31 Human Approval Center**: AGENT REQUEST com diff, risco, motivo → APPROVE/REJECT/ASK.
- **§33 Command Center**: comandos NL → Director transforma em tarefas.
- **§34 NEOHAVEN** como exemplo funcional: colony survival/city builder com construção, sobrevivência, agricultura, necessidades, relações, economia, tech tree, eventos, mundo procedural, clima, estações.
- **§35 Pipeline**: USER IDEA→INTENT→REFERENCE→DESIGN→DNA→TASK GRAPH→AGENTS→PROJECT→ENGINE→CODE→ASSETS→BUILD→TEST→PLAYTEST→FIX→BUILD AGAIN.
- **§36 MVP em 7 fases**: 1 Foundation (UI, projects, DNA, providers, agents, tasks, workspace, Git, logs) → 2 Unreal Integration → 3 Autonomous Coding → 4 Reference Intelligence → 5 Autonomous QA → 6 Asset Intelligence → 7 Multi-engine.
- **§44 NÃO MOCKAR**: sem botões "Coming Soon" sem necessidade; deixar arquitetura pronta, mostrar indisponibilidade claramente, priorizar MVP real.
- **§47 Regra final**: produto real — funcionamento, arquitetura, segurança, modularidade, UX, autonomia, consistência do DNA, integração real com engines. Não inventar APIs/integrações/capacidades; quando depender de ferramenta externa, criar interface de integração. Objetivo: **uma pessoa como Creative Director + agentes executando o trabalho técnico até um jogo jogável.**

---

## 3. ARQUIVO DE TODOS OS PROMPTS (cronologia das sessões)

### S3-A — Elevação de ambição (2D/3D nível concorrência)
> "Continue o Projeto, quero que eleve o objetivo para conseguir criar/fazer jogos tanto 2D quanto 3D de **Altíssima Qualidade** para concorrer com jogos que já existem" — seguiu-se a lista de ~120 jogos de referência (Dying Light 1/2, Spider-Man 2, Hogwarts Legacy, R.E.P.O., Genshin Impact, ZZZ, PS2/Switch/VRChat, Hollow Knight, Celeste, COD Warzone, Battlefield, Dead Cells, Terraria, Diablo 1-5, RimWorld, ETS2/ATS, Rust, Haste, Poly Bridge, Forza, Black Myth Wukong, Hades, God of War, Fallout, Stardew, Dark Souls, RDR, Spore, Clair Obscur 33, AC series, Cyberpunk, DayZ, Palworld, Cuphead, Lies of P, Silent Hill F, Backrooms, TLOU, Ghost of Tsushima, 7DtD, Blasphemous, Remnant 2, Detroit, Stray, Horizon, MGSV, Sea of Stars, Project Zomboid, Necesse, Rocket League, Rucoy, Fortnite, **inclusive conteúdo adulto**).
> Requisitos-chave: "o usuário manda a ideia e o nexus forge **faz tudo sozinho**"; "com o mínimo possível de erros, ou nada de erros"; "anexar exemplos e plataformas desejadas"; começar pelo projeto.
> **Resultado**: base de 20 arquétipos de gênero destilada da lista (padrões abstratos, zero cópia), wizard com plataformas/classificação adulta com age-gate.

### S3-B — "continue a criação"
> **Resultado**: templates platformer + 3D, adapter Unreal com scaffold C++ real, validação headless, forge CLI, download automático do Godot 4.3 oficial.

### S3-C — "Arrume os Erros e Continue até o aplicativo estiver pronto"
> **Resultado**: servidor HTTP+WS completo, UI React dark-first (wizard/dashboard/DNA/code/logs/settings), typecheck limpo, **E2E real**: ideia → jogo playable validado no Godot, pipeline assíncrono com eventos ao vivo, modelos por agente via OpenRouter (`z-ai/glm-5.3-flash` testado empiricamente), chatJson com repair, crash recovery, timeout de 5min.

### S3-D — Site + GitHub
> "quero que me faça um **site para download** com Animações, bonito e clean com abas: **Download, Sobre** com redirecionamento para **GITHUB**... Repositório **aberto**... não pode deixar fazer alteração nos arquivos" + "crie um repositório no github Nexus Forge com tudo do projeto... continue para todos os sistemas operacionais LINUX/WINDOWS/etc"
> **Resultado**: site animado (hero, pipeline visual, demo), `gh` autenticado como `yuaberry` → repo público criado + push; **GitHub Pages** (site em `docs/`); launchers start.sh/.bat/.command; adapter Godot multi-OS (win64.exe/macos universal/arm64).

### S3-E — Launcher-Engine com Live Preview (a visão revelada)
> "minha ideia inicial era fazer um **Launcher Engine com preview ao vivo**, mas estou gostando do que está virando, tente fazer mais nesse objetivo, tipo uma engine com essa ideia."
> **Resultado**: **LIVE PREVIEW** — export Web real do Godot (WASM) rodando **DENTRO do estúdio** (iframe, assíncrono, auto-refresh pós-validate), templates de export injetados, fix do OOM (extração streaming de 1GB), demo **jogável no site** (jogo da IA no navegador).

### S3-F — Nível profissional + Steam + executável do app
> "aumente o nível do **código dos jogos**... profissional... implemente **tudo o que um jogo precisa para ser adicionado a Steam** e outros launchers... não apenas criar um conceito, mas **o jogo inteiro**, capa, design, descrição etc... usuário vai abrir a ferramenta baixando **executável .exe no Windows** e rodar como **aplicativo profissional**."
> **Resultado**: kit profissional nos jogos (menu/pausa/settings/SFX WAV sintetizado/save de recorde), **Steam Publish Kit** (store copy por LLM, capsules nas resoluções Steam renderizadas pelo movie-writer, screenshots reais do jogo), export .exe dos jogos, **build do próprio estúdio**: UI embutida em base64 → `bun --compile` → 3 binários → GitHub Releases.

### S3-G — Assets quebrados + Steam Kit completo
> "os **assets não estão funcionando** e nem os sprites; crie assets e sprites **animados**; melhore o steam kit e gere um arquivo **completo de tudo** para publicação e jogável; faça Game DNA, GDD etc. **como arquivo profissional**."
> **Resultado**: **bug raiz corrigido** (exports empacotam .ctex → `tex()` load-first), sprites animados (walk/squash/pulse), Steam Kit de 21 arquivos (publish-guide Steam Direct, press-release, requisitos, IARC, legal EULA/Privacy/Credits, changelog, checklist de prontidão REAL), `docs/game-dna.md` profissional.

### S3-H — Diretiva PRODUÇÃO (22 seções) · "tenha como base esse prompt"
> "You are the **Principal Game Engine Architect**... NEXUS FORGE IS NOT A TOY... must evolve into a professional AI game production environment." — AUDIT BEFORE MODIFYING (§0) · pipeline filosófico USER PROMPT→…→PLAYABLE GAME (§1) · **GameSpecification formal** (§2) · orquestrador com estágios recuperáveis (§3) · biblioteca de sistemas (player/combat/AI/RPG/quests/dialogue/world/save/UI/audio/VFX) (§4) · **gênero-consciente** (§5) · **"Stop generating test dummy games"** (§6) · procedural com seed (§7) · câmeras (§8) · input unificado (§9) · performance DEBUG/RELEASE (§10) · estrutura de projeto coesa (§11) · **data-driven design** (§12) · build+test+repair loop (§13) · visual QA multimodal (§14) · agente de engenharia real — "Do not say 'I would implement...' **Actually implement it**" (§15) · no fake professionalism (§16) · extensibilidade/providers (§17) · model routing (§18) · **project memory persistente** (§19) · **Game Change Engine** (§20) · vertical slice por gênero (§21) · critérios de aceite (§22). Relatório final em 10 itens obrigatório.
> **Resultado**: spec/gameSpec.ts + spec/roomGraph.ts (seed determinística), **METROIDVANIA PACK** (parry+i-frames+knockback, FSM, boss 2 fases com intro cinematográfica, diálogo com escolhas, ability gates/backtracking, checkpoints/save versionado, mapa, chuva, parallax, gamepad), `data/*.json`, Change Engine de stats, **12 testes**, E2E com o prompt-exemplo → playable 0 erros.

### S3-I — Diretiva ASSET PIPELINE (20 seções) · "continue"
> "Transforming Nexus Forge's asset-generation system into a professional game-production asset pipeline... The existing problem is unacceptable (ugly generic textures, inconsistent characters, characters changing appearance between frames...)" — **ART BIBLE** persistente governando tudo (§1) · **identidades canônicas anti-drift entre frames** (§2) · 2D pipeline multi-estilo derivado do prompt (§3) · **sprite sheet system com frame count/FPS/pivot/eventos** (§4) · animation state machines com anticipation/impact/recovery (§5) · 3D pipeline (§6) · **materiais semânticos, não ruído** (§7) · ambientes como composição (§8) · hierarquia visual jogável (§9) · provider abstraction ImageGen/Vision (§10) · 3D generation (§11) · **Asset Manifest** (§12) · **validação automática** (§13) · **QA multimodal — "DO NOT accept a failing asset"** (§14) · never accept good-enough (§15) · support assets (§16) · performance-aware import com tiers (§17) · **asset reuse — mesma parede ≠ 100 gerações** (§18) · **art direction change engine** ("make it darker", "give the protagonist a red coat") (§19) · "Build the pipeline" (§20).
> **Resultado v0.6+v0.7**: Art Bible (zod+doc), identidades com canonicalPrompt, materiais semânticos, decoder PNG com CRC, validador anti-drift (budgets por tipo de anim), manifest com importSettings/tiers, QA de sprites E de screenshots, retheme engine, **Animation Packages** (9 anims nomeadas no player com eventos de frame; hit no frame de impacto), support assets (portraits usados no HUD, ícones, key prompts, logo), asset cache content-addressed — **28 testes**.

### S3-J — Refinamento nível estúdio
> "refine todo o código e faça com que o Nexus Forge fique com **qualidade de nível estúdio**, melhorando os assets e sprites, melhorando **tudo** que foi feito."
> **Resultado v0.8**: `pixelRamp.ts` (hue-shift, sel-out, rim-light, dithering), herói 24×24 com capa esvoaçante/armadura 3-tonos/espada com glow, criatura/boss/NPC v2, tiles com bevel+AO+rachaduras, céu dithered com skyline por bioma + lua, escalas calibradas ao hitbox, pintores legados delegando aos v2.

### S3-K — PLAN.md (memória)
> "atualize o PLAN.md com tudo que foi feito, porque vou **compactar o chat**" + "adicione **todos os prompts**, garanta que vai **continuar certo**, coloque o **prompt inicial**, a **visão do projeto**, tudo que ele precisa para **continuar daqui sem errar nada**."
> **Resultado**: PLAN.md v2 (§1 Visão, §2 Prompt inicial, §3 Arquivo de prompts, §9 Protocolo de Retomada) + §13 AGENTES.

### S3-L — Execução do direcionamento + Estúdio no Pages (v0.9.0)
> "agora continue com esse direcionamento, fazendo tudo que não foi feito anteriormente e **implemente o estúdio no Github Pages (tire do localhost)**"
> **Resultado v0.9.0**: Etapa 1 (Plan.MD → stub arquivado; §13 AGENTES merged); **§11.1** propsPainters v2 (bonfire com bacia bevelada+embers, orb com halo dithered+rune sparks, shard com facet planes+sparkle orbit, glow com falloff dithered); **§11.2** screenshot QA integrado AO validate (awaited, escreve docs/qa-report.md, FAIL → task de reparo com guard anti-duplicata; ladder de visão gratuito com retry medido — nemotron/qwen/gemma); **§11.3** systemMap.ts (gênero→sistema→arquivo→knob injetado no prompt do coder; tuning=data); **Estúdio Web no Pages**: `apps/ui/src/lib/demo.ts` (detecção honesta backend↔snapshot + intercept fetch com rotas read-only reais e mutações honestas 400), `scripts/export-demo-data.ts` (snapshot REAL: DB+docs+código+sprites base64), HashRouter + base './' (mesmo dist serve exe/Pages/estático), `docs/studio/` publicado + nav "Estúdio Web" no site + demo WASM regenerada; exes reconstruídos e smoke-testados; STATUS.md reescrito (era v0.1).
> **Invariantes novas**: (15) ladder de visão gratuita é flaky — retry 5 tentativas com backoff, 401/402 fail-fast; (16) o mesmo dist UI deve servir em localhost-root (exe), subpath (/studio/) e dev — por isso base './' + HashRouter; (17) snapshot demo = dados REAIS exportados do projeto, nunca mock; mutações do demo respondem 400 com mensagem honesta.


---

### S3-M — RENOMEAÇÃO COMPLETA (v0.10.0)
> "Atue como um engenheiro de software sênior… Quero realizar uma **renomeação completa** do meu projeto, anteriormente chamado Nexus Forge, para **WorldSmith AI**… todas as referências internas, externas, visuais e documentais… sem reduzir funcionalidades… compatibilidade e migração… não faça push sem autorização."
> **Resultado v0.10.0**: auditoria completa (300+ ocorrências classificadas em 35+ arquivos) → identidade (UI, títulos, status, X-Title, personas, banner, 404 page, créditos dos jogos gerados, Steam Kit, launchers) → pacotes `@nexus/*`→`@worldsmith/*` (+ pnpm lock regenerado) → tokens CSS `nexus`→`brand` · `useNexus`→`useStudio` → binários `worldsmith-ai(.exe/-macos)` → **MIGRAÇÃO DE DADOS**: `dataRoot()` renomeia `~/.nexusforge`→`~/.worldsmith` atomicamente (fallback seguro), `nexus.db`→`worldsmith.db`, `UPDATE projects.data_path` (paths absolutos no DB!), `.nexusforge-tmp`→`.worldsmith-tmp`, env `WORLDSMITH_NO_OPEN` (legacy `NEXUS_NO_OPEN` aceito) → LICENSE/README/STATUS/site → commit local (push PENDENTE de autorização).
> **Invariantes novas**: (18) scrypt salt `"nexus-forge-v1"` é IMUTÁVEL (derivador da chave AES — mudar destrói `secrets.enc`); (19) URLs `github.com/yuaberry/nexus-forge` funcionais até rename manual (GitHub redireciona); (20) nunca esquecer o `UPDATE projects.data_path` — paths absolutos vivem no DB; (21) `&` em `sed` substitui pelo match inteiro (`&nbsp;` precisa de escape `\&`).

---

## 4. FATOS ESSENCIAIS (estado atual)

| Item | Valor |
|---|---|
| Versão | **v0.10.0** — RENOMEAÇÃO: Nexus Forge → **WorldSmith AI** (+ estúdio Web no Pages, QA no validate, system map, props v2 na v0.9.0) |
| Nome | **WorldSmith AI** · binários `worldsmith-ai(.exe/-macos)` · pacotes `@worldsmith/*` · dados `~/.worldsmith/` (migração automática de `~/.nexusforge/`) |
| Repo | `~/nexus-forge/` (checkout local — nome do dir é irrelevante) · https://github.com/yuaberry/nexus-forge (MIT, `gh` logado; **rename do repo = passo manual pendente**) |
| Site+demo | https://yuaberry.github.io/nexus-forge/ (Pages serve `docs/`; muda p/ `…/worldsmith-ai/` quando o repo for renomeado; demo WASM em `docs/demo/`; estúdio demo em `docs/studio/`) |
| Executáveis | `dist-release/worldsmith-ai.exe` (Win) · `worldsmith-ai` (Linux) · `worldsmith-ai-macos` — UI embutida |
| Stack | pnpm monorepo: `@worldsmith/core` (Bun 1.4.2, TS strict, `bun:sqlite`), `@worldsmith/ui` (React+Vite+Tailwind v4), `@worldsmith/shared` (zod) |
| App | `bun run packages/core/src/main.ts serve` → http://127.0.0.1:5180 |
| Engine | **Godot 4.3** auto-baixado em `~/.worldsmith/engines/godot/godot`; export templates instalados |
| IA | OpenRouter (chave: arquivo `~/Key Openrouter Free`; cifrada em `~/.worldsmith/secrets.enc`). Texto: `z-ai/glm-5.3-flash` · Imagem: `google/gemini-3.1-flash-image` (créditos oscilam, ladder 3000→1024→512) · Visão: ladder gratuito `nemotron-3-nano-omni → qwen3.8-27b → gemma-4-31b` com retry |
| Dados | Projetos `~/.worldsmith/projects/` · DB `~/.worldsmith/worldsmith.db` (migração `nexus.db`+`projects.data_path` idempotente) · previews/builds/cache em `~/.worldsmith/` |
| Testes | `bun test packages/core/tests` → **28 testes, 180 asserts, verdes** (`forge2.test.ts` + `assets.test.ts`) |
| E2E de referência | Projeto `hollow-echoes` (prompt-exato da diretiva): `bun run scripts/e2e-rescaffold.ts` → scaffold+validate **PASS**, 0 erros Godot |
| Modelos-por-agente | settings DB (`modelAssignments`); direção LLM+fallback determinístico sempre |

## 5. ARQUITETURA (mapa)

```
packages/core/src/
├── main.ts (CLI: serve|detect|forge --idea|--resume) · server.ts (REST+WS+preview+download+change)
├── pipeline/forge.ts        8 estágios: analyze→dna→gdd→architecture→scaffold→tasks→buildout→validate
│                            (+crash recovery, auto-preview pós-validate, screenshot-QA async)
├── orchestrator/director.ts (Plan LLM zod + fallback) · store.ts (CRUD SQLite)
├── spec/gameSpec.ts (GameSpecification zod — O CONTRATO) · spec/roomGraph.ts (mundo seed-determinístico)
├── assets/
│   ├── pixelRamp.ts (hue-shift/selout/rimlight/dither — a base visual)
│   ├── heroPainter.ts (paintHeroV2 24×24 poses paramétricas) · creaturePainters.ts (creature/boss/npc v2)
│   ├── envPainters.ts (tiles stone/wood/crystal + sky dithered+skyline+lua)
│   ├── spriteForge.ts (encoder PNG puro + pintores legados delegando a v2 + slots animados)
│   ├── propsPainters.ts (v2: bonfire/orb/shard/glow — dithered halo, facets, embers)
│   ├── animPack.ts / animPackBuilder.ts (9 anims player com eventos; FSM enemy; boss) → data/animations.json
│   ├── artBible.ts (ArtBible zod + deriveBible + styleFromPrompt + bibleToMarkdown + identidades canônicas)
│   ├── materials.ts (materiais semânticos) · supportAssets.ts (portraits/ícones/prompts/logo)
│   ├── assetCache.ts (reuse §18) · manifest.ts (§12) · validate.ts (§13 anti-drift + CRC)
│   ├── visualQA.ts (providers Vision/ImageGen + contact sheet + QA de screenshots) · aiSprites.ts · retheme.ts (§19)
├── engines/ godot.ts (detect/scaffold/validate/exportWeb/exe) · unreal.ts (scaffold C++) · manager.ts
│   ├── templates/ gd_common · gd_pro (tex load-first/SFX/menu/save) · godot_topdown/platformer/3d
│   │             godot_metroidvania (compositor: bible→assets→validação→manifest)
│   ├── systems/ mv_player (state machine 9 estados + parry + anim events) · mv_entities (FSM/boss cinema/npc)
│   │             mv_world (GameState + sprite_frames_for + room loader/checkpoint/pickup) · mv_ui (HUD/diálogo/mapa/menu)
│   ├── godotExport.ts (templates streaming + import→exportWeb) · publish/ (storeKit 21 arquivos + builds .exe)
│   ├── systems/ systemMap.ts (§11.3: sistema→arquivo→knob por gênero, injetado no coder)
├── agents/ prompts.ts (personas) + runtime.ts (coder→validação→fixer ×3, com systemMap §11.3) · providers/ (AIProvider+OpenRouter+registry)
├── dna/ knowledge/ db/ events.ts settings.ts workspace.ts git.ts util (dataRoot com MIGRAÇÃO ~/.nexusforge→~/.worldsmith)
@worldsmith/shared (zod: DnaSection/Origin, Task, ForgeStage, GameBrief) · @worldsmith/ui (wizard, dashboard, Live
Preview, Steam Kit, Assets, DNA, Code, Logs, Settings, lib/demo.ts — modo web-demo com intercept, store useStudio) · scripts/
(start.*, build-release.ts → binários worldsmith-ai*, e2e-rescaffold.ts, export-demo-data.ts, test-vision-qa.ts)
docs/ (site + demo WASM + studio/ = UI compilada com snapshot + STATUS.md) · tests/ (28)
```

## 6. PIPELINES (fluxo real)

**Forge**: ideia → analyze (Plan LLM/fallback; flavor routing p/ metroidvania) → dna (+`docs/game-dna.md`) → gdd → architecture → scaffold (composer: deriveBible → sprites via cache → animPack → support → materiais → **validateAssets GATE §13** → manifest → screenshot-QA async) → tasks (grafo dependências) → buildout (coder LLM + validação headless + fixer; offline = bloqueia honesto) → validate (smoke-run **autoritativo**; PASS → playable 100% + auto-preview WASM).

**Change Engine** (POST /change): 1º retheme artístico (§19: escuro/cyberpunk/hand-painted/capa vermelha → muta Bible → rethemeAssets) → 2º stats data-driven (`data/player.json`: speed/parry_window/damage/jump) → 3º senão task incremental de coder.

**Steam Kit**: copy LLM → covers por movie-writer (231x87…1920x620 + social) → screenshots reais (48 frames) → publish-guide/press/IARC/legal/changelog → checklist de prontidão AUDITANDO o que existe (capsules/preview/builds).

## 7. INVARIÁVEIS TÉCNICAS (memory de engenharia — NUNCA REGREDIR)

1. **Validação autoritativa** = `godot --headless --path . --quit-after N` (o `--check-only` NÃO registra autoloads e sai 0 mesmo com erro — medido; proibido como gate).
2. **`tex()` load-first**: exports empacotam `.ctex` → PNG cru falha em builds. Ordem: `ResourceLoader.exists→load()` senão `Image.new().load_png_from_buffer(bytes)` (método de INSTÂNCIA).
3. **Encoder PNG**: chunks big-endian; DEFLATE exige wrapper **zlib** (`zlibSync`); CRC32 index com `&0xff`.
4. **GDScript 4.3**: proibido `var x := null`; proibido propriedade no corpo da classe (ex. `layer=100` → mover p/ `_ready`); `ColorRect` NÃO é `Node2D` (ancestral comum: `CanvasItem`); `SpriteFrames.get_animation_names()` (NÃO `get_animation_list`); lambdas ok; corotinas auto-resumem.
5. **Nunca inventar API**: `Bun.ZipReaderChain` não existe (usar fflate); validar contra o runtime.
6. **pkill self-match**: padrão `src/main[.]ts serve`; portas zumbis no 5180 mascaram testes (`ss -tln`).
7. **Import antes de export**: `--headless --path . --import` é obrigatório antes de `--export-release`.
8. **Movie-writer**: caminho ABSOLUTO em `--write-movie`; só renderiza com **display** (DISPLAY=:0 Intel HD); extrações >1GB em streaming (unzipSync em memória OOM em 8GB RAM).
9. **Bash tool**: heredocs >~12KB truncam (dividir); JSON via `printf '%s\n'`; /tmp é limpo entre chamadas (scripts de teste em `packages/core/*.ts` ou `scripts/`).
10. **Slugs**: duplicados ganham `-2` automático; forge nunca explode por UNIQUE.
11. **Anti-drift §2**: validador com budgets — locomoção ≤45%, combate/reação ≤68% de diff entre frames; drift real = scaffold FALHA (recuperável, relatório honesto).
12. **Timeouts LLM**: fetch com AbortController 5min + retry; 4xx (≠429) fail-fast; max_tokens ladder contra 402.
13. **Segredos**: chave NUNCA em código/log/repo (grep antes de publicar); cifrada AES-256-GCM machine-bound.
14. **Honestidade**: 402/indisponível/pendente → dito com clareza em eventos/UI/STATUS; zero mocks.
15. **Visão gratuita é flaky** (429/ResourceExhausted): ladder nemotron→qwen→gemma com 5 tentativas e backoff; 401/402 fail-fast.
16. **Um dist, três servidores**: o mesmo build da UI serve localhost-root (exe), subpath (`/studio/`) e dev — por isso `base: "./"` + HashRouter.
17. **Snapshot demo = dados REAIS** exportados do projeto (nunca mock); mutações do demo respondem 400 com mensagem honesta.
18. **scrypt salt `"nexus-forge-v1"` é IMUTÁVEL**: é o derivador da chave AES que decifra `secrets.enc` — mudar destrói a chave salva.
19. **Paths absolutos vivem no DB**: renomeios de data-dir exigem `UPDATE projects.data_path` (implementado na migração do DB).
20. **URLs do repo são compat, não identidade**: `github.com/yuaberry/nexus-forge` funciona hoje e redireciona após rename manual.
21. **`&` em `sed` = match inteiro**: literais com `&` (ex.: `&nbsp;`) precisam de escape `\&` — já corrompi e reparei um arquivo por isso.

## 8. AMBIENTE (dev machine)

Linux Mint 22 · 4 cores · 7.7GB RAM · Node 18/Bun 1.4.2/pnpm · gh autenticado (`yuaberry`) ·
Godot 4.3 + templates · chave OpenRouter em `~/Key Openrouter Free` (imagem consome créditos rápido; visão/texto OK) ·
DISPLAY=:0 disponível (movie-writer renderiza).

## 9. PROTOCOLO DE RETOMADA (garantia de continuidade — executar SEMPRE nesta ordem)

```bash
# 1. CONTEXTO — ler antes de qualquer coisa
cat PLAN.md && cat README.md && cat docs/STATUS.md && git log --oneline | head -15

# 2. SANIDADE — nada foi quebrado desde a última sessão?
cd ~/nexus-forge
./packages/core/node_modules/.bin/tsc -p packages/core/tsconfig.json --noEmit && \
./packages/core/node_modules/.bin/tsc --noEmit -p apps/ui
#    → espera: 0 erros em ambos
bun test packages/core/tests
#    → espera: 28 pass, 0 fail (se falhar: conserte ANTES de qualquer feature nova)

# 3. E2E REAL — o produto ainda forja jogos?
bun run scripts/e2e-rescaffold.ts
#    → espera: "forge scaffold+validate: true null"
cd ~/.worldsmith/projects/hollow-echoes && \
~/.worldsmith/engines/godot/godot --headless --path . --quit-after 5 2>&1 | grep -cE "SCRIPT ERROR|Parse Error|ERR_"
#    → espera: 0

# 4. Só agora: implementar. Regras durante o trabalho:
#    - mudança pequena → testes → commit (mensagem descritiva) → push
#    - feature nova → teste novo na suíte
#    - asset/painter novo → passa pelo validateAssets (gate do composer)
#    - script GDScript novo → regra §7.4 do PLAN
#    - nunca commitar com testes vermelhos; nunca publicar segredo
```

**Se algo falhar na retomada**: consulte §7 (invariáveis) — 90% dos erros de sessões passadas estão lá; depois `git log -p` para achar o que mudou.

## 10. LIMITAÇÕES HONESTAS

- 3D: sem text-to-3D ainda (`ModelGenerationProvider` é a interface pronta)
- Música: só SFX sintetizados (sem geração de trilha)
- Screenshot QA: precisa de créditos de visão + display p/ raster
- Tasks LLM de buildout: coder genérico (não mapeia sistema→arquivo do genre pack)
- Pintores pequenos (checkpoint/pickup/shard/glow) ainda pré-v2
- Windows/macOS: código multi-OS pronto, testes reais pendentes (dev é Linux)

## 11. PRÓXIMAS PRIORIDADES (ordem — 1-3 entregues na v0.9.0)

1. ~~Pintores v2 checkpoint/pickup/shard/glow~~ ✅ v0.9.0 (propsPainters.ts)
2. ~~Vision QA no loop do validate~~ ✅ v0.9.0 (qa-report.md + repair task; ladder com retry)
3. ~~Mapear tasks do genre pack → coder LLM~~ ✅ v0.9.0 (engines/systems/systemMap.ts)
4. **Text-to-3D: image-to-mesh → GLTF → import → LOD/collision → manifest** (próximo marcos)
5. Atlas packing + .import profiles reais por plataforma (tiers LOW→ULTRA)
6. Genre packs: third-person action (lock-on), racing
7. Geração de música por estado (explore/combat/boss)
8. Tauri shell (desktop nativo; hoje o exe abre o navegador — aceitável, documentado)
9. Melhorias no Estúdio Web: selecionar múltiplos projetos-snapshot, tour guiado, embed do site de cada jogo

## 13. AGENTES & AMBIENTE OPENCODE (merge do Plan.MD histórico)

- **Plataforma desta máquina**: OpenCode + configuração **Yua Devs** (`~/.config/opencode/AGENTS.md`).
- **Agentes disponíveis**: `architect` (planeja, não edita) · `builder` (implementa) · `game-dev` (natural p/ este projeto) · `reviewer` (audita) · `debugger` (causa raiz) · `quick` — subagentes: `debugger`, `explore`, `general`, `reviewer`.
- **Uso correto**: mudanças grandes → `architect` direciona, `builder` executa, `reviewer` audita; bugs → `debugger` antes de `builder`.
- **Plan.MD**: stub arquivado — APENAS PLAN.md é canônico (ver §0 e o topo do Plan.MD).

## 12. REGRAS DA CASA (Yua Devs)

1. Ler antes de alterar; causa raiz antes de consertar. 2. Zero dados falsos. 3. Passos pequenos, verificados, testados. 4. Registrar erros próprios (§7). 5. Segredos fora do repo. 6. Nunca inventar API — medir contra o runtime. 7. "Do not say 'I would implement…' — actually implement it." 8. Ao terminar cada fase: testes reais → corrigir → commit → push → atualizar PLAN.md/STATUS.

---


---

## 14. RENOMEAÇÃO v0.10.0 — NEXUS FORGE → WORLDSMITH AI (registro da decisão)

**Renomeado**: nome do produto (UI/títulos/status/personas/créditos dos jogos gerados), pacotes (`@worldsmith/{core,shared,ui}`, root `worldsmith-ai`), binários (`worldsmith-ai.exe/-macos`), tokens CSS (`brand`), store (`useStudio`), data-dir (`~/.worldsmith`), DB (`worldsmith.db`), env (`WORLDSMITH_NO_OPEN`), LICENSE, README, STATUS, site, launchers.

**Migração automática e idempotente** (zero perda de dados): `dataRoot()` renomeia `~/.nexusforge`→`~/.worldsmith` (atômico, fallback para o antigo se falhar) → construtor do DB renomeia `nexus.db`→`worldsmith.db` → `UPDATE projects SET data_path = REPLACE(...)` reponta os projetos. Backup prévio do crítico em `/tmp/opencode/nexusforge-backup-pre-rename/` (db+secrets+projects).

**Mantido INTENCIONALMENTE (compat/histórico)**: scrypt salt `nexus-forge-v1` (invariável 18 — decifra `secrets.enc`); URLs `github.com/yuaberry/nexus-forge` + site `yuaberry.github.io/nexus-forge` (redirecionam pós-rename manual); env legacy `NEXUS_NO_OPEN` aceito; citações históricas nos §2/§3 e no `Plan.MD` arquivado; diretório local de checkout `~/nexus-forge/` (nome de checkout não é identidade); `.nexusforge/` no .gitignore (rollback).

**PASSOS MANUAIS PENDENTES (autorização do dono)**: rename do repo GitHub (Settings → renomear; Pages/URLs redirecionam) → atualizar URLs do site/README → `git push` do commit local → release v0.10.0 com os 3 binários novos → (opcional) logo/ícone oficial da marca.
---
_Atualizado em 2026-09-27 (v0.10.0 — RENOMEAÇÃO WorldSmith AI + tudo da v0.9.0). Fontes de verdade: este arquivo + `git log --oneline` + `gh release list`._
