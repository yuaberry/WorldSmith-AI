# EVOLUTION.md — Programa de Evolução WorldSmith AI

> Documento de progresso contínuo (missão §21). Auditoria com evidências + matriz de capacidades + registro fase a fase. Não substitui PLAN.md (memória operacional) — o complementa.

---

## FASE 1 — AUDITORIA E DIAGNÓSTICO (2026-09-27)

### Por que a demo atual é simples (evidências do código)

O compositor de salas (`mv_world.ts::_load_room`) constrói cada sala com exatamente 4 camadas: plataformas texturizadas, hazards, portas e spawns. Diagnóstico técnico da simplicidade:

| # | Limitação | Evidência | Impacto |
|---|---|---|---|
| 1 | **Salas sem camada de decoração** — sem tochas, props, foreground, vinheta | `mv_world.ts:344-396` (só platforms/hazards/doors/spawns) | Cenários "funcionais mas vazios" |
| 2 | **Zero game feel** — sem screenshake, hitstop, partículas de impacto, poeira de pouso | `mv_player.gd`/`mv_entities.gd` sem qualquer efeito | Combate sem feedback físico |
| 3 | **1 só arquétipo de inimigo** (wraith terrestre, FSM único) | `godot_metroidvania.ts:48` (dict `enemiesData` com 1 entrada) | Encontros repetitivos |
| 4 | **Sem validação de alcançabilidade/gates** — o roomGraph é gerado mas nunca provado | `spec/roomGraph.ts` gera; ninguém valida | Risco de mapa injogável não detectado |
| 5 | **QA não testa gameplay** — só smoke-run de engine + visual QA opcional | `forge.ts stageValidate` (headless run) | "Roda" ≠ "funciona" |
| 6 | **Wizard single-page** — sem etapas de escopo, direção de arte, acessibilidade, revisão de plano | `apps/ui/src/features/CreateGame.tsx` (164 linhas, 1 tela) | Usuário não expressa intenções ricas |
| 7 | **Arquétipos: 20** com metadados parciais vs. os 24 exigidos com config completa | `knowledge/genres.ts` | Cobertura de gêneros menor |

### Matriz de capacidades (existente / parcial / ausente)

| Capacidade | Estado | Onde |
|---|---|---|
| Pipeline 8 estágios c/ crash recovery + retomada | ✅ Existe | `pipeline/forge.ts` |
| GameSpec formal + DNA + GDD | ✅ Existe | `spec/gameSpec.ts`, `dna/` |
| Art Bible + pixel art nível estúdio (v2) | ✅ Existe | `assets/*` |
| Animações nomeadas c/ eventos de frame | ✅ Existe | `animPack*` |
| QA visual multimodal (screenshots) | ✅ Existe (crédito-dependente) | `visualQA.ts` |
| Música por estado + SFX | ✅ Existe | `audio/musicForge.ts` |
| Steam Kit 21 arquivos | ✅ Existe | `publish/` |
| Live preview WASM + builds + .deb | ✅ Existe | `godotExport`, `builds.ts` |
| **Validação estrutural de níveis** | ❌ Ausente | → Fase 2 |
| **Game feel (shake/hitstop/partículas)** | ❌ Ausente | → Fase 3 |
| **Inimigos com comportamentos distintos** | ❌ Ausente (1 tipo) | → Fase 3 |
| **Testes funcionais de gameplay no jogo gerado** | ❌ Ausente | → Fase 4 |
| **Wizard profissional multi-etapa** | ❌ Ausente | → Fase 6 |
| **24 arquétipos com config completa** | ⚠️ Parcial (20, campos incompletos) | → Fase 6 |
| 3D text-to-mesh | ❌ Ausente (interface pronta) | → Fase 5 |

### Priorização (dependências técnicas)
1. **Validador de níveis** (fundação de qualidade — tudo depois depende de mapa são)
2. **Feel + decoração + inimigos** (a "cara" do demo de referência §15)
3. **Harness de QA funcional** (prova de gameplay §12)
4. **Regenerar demo + evidências** (critérios §16)
5. Wizard + arquétipos (captação de intenção)
6. 3D modular (fase futura)

## FASE 2 — VALIDADOR ESTRUTURAL DE NÍVEIS (§10) ✅

`spec/levelValidator.ts` — 7 regras com prova de solvabilidade real (R6: BFS iterativo — gated doors destravam com pickups ALCANÇÁVEIS; 100% das salas devem ser atingíveis). Integrado ao compositor (mundo inválido = scaffold falha honesto).

**Achado real**: a sala `secret` era CONTEÚDO ÓRFÃO (nenhuma porta levava a ela; o relic era duplicado no hub). Corrigido no gerador: passagem escondida real no hub → secret. **9 testes** (mundo real passa; mutações falham cada regra).

## FASE 3 — FEEL, DECORAÇÃO E VARIEDADE (§7/§15) ✅

- **Feel autoload** (data/feel.json): hitstop (wall-clock!), screenshake, sparks, landing dust — hooks em attack-hit, player-hurt, enemy-death
- **Decoração de salas**: tochas animadas com halo quente (frames do checkpoint + glow), clusters de cristal arcano, embers ambientais por sala, **vinheta radial** (layer 5, abaixo do HUD-40) — determinístico por room-id
- **3 arquétipos de inimigo** (data-driven `mode`): wraith chaser · **sentinel turret** (projétil arcano tween-driven, antes era clone do chaser) · **wisp flyer** (hover senoidal + dive, sem gravidade)

## FASE 4 — QA FUNCIONAL NO JOGO (§12) ✅ (pagou-se imediatamente)

`qa/functional.gd` (autoload QATest, env `WORLDSMITH_QA=1`): **14 probes de gameplay REAL** no jogo bootado de verdade — start pela title screen, boot, player+API, HUD, música (3 faixas), feel, dano, save/load, transição hub→west, morte de inimigo, grant de ability, lógica do music director. **Gate no validate** (adapter roda o harness e parseia o RESULT; exit code vira evidência).

**Design medido a duras penas** — harness POLLING (_process), imune a 3 classes de congelamento: (1) jogo nasce PAUSADO na title screen, (2) hitstop com time_scale=0, (3) SceneTreeTimers escalados criados durante freeze = infinito.

**2 BUGS REAIS DE GAMEPLAY pegos pelo harness no primeiro dia**:
1. **Hitstop congelava o jogo PARA SEMPRE** (delta escalado a zero nunca decrementava o timer; o primeiro hit de combate travaria tudo) → fix: wall-clock + PROCESS_MODE_ALWAYS
2. **`GameState.add_score` NÃO EXISTIA** → `_die()` crashava em TODA morte de inimigo (o jogo nunca pontuava; erro silencioso até hoje) → fix: API `add_score` no GameState

## DEMO DE REFERÊNCIA §15/§16 — RELATÓRIO COMPARATIVO (v0.12)

| Critério §16 | Antes | Agora | Evidência |
|---|---|---|---|
| Compila sem erros bloqueadores | ✅ (já) | ✅ | E2E: scaffold+validate **true**, 0 erros engine |
| Inicia e permite interação | ✅ via title | ✅ + **provado por probe** | QA: boot/title-start PASS (caminho real DESPERTAR) |
| Sistemas essenciais integrados | parcial | ✅ **14/14 probes** | QA RESULT pass=14 fail=0 |
| Progresso preservado | ✅ | ✅ **provado por probe** | QA: save/roundtrip PASS |
| Testes funcionais executados | ❌ inexistia | ✅ **gate de release** | validate roda o harness (exit code = evidência) |
| Mundo jogável (alcançabilidade) | ⚠️ sala órfã | ✅ **provado** | levelValidator: 6/6 salas via progressão |
| Capturas do jogo real | ✅ | ✅ + decoração nova | docs/evidence-v012.png |
| Identidade visual consistente | ✅ | ✅ + tochas/cristais/embers/vinheta | pintores v2 + decor determinístico |
| Variedade de encontros | ❌ 1 comportamento | ✅ **3 arquétipos** (chaser/turret/flyer) | data/enemies.json `mode` |
| Feedback de combate | ❌ nenhum | ✅ hitstop+shake+sparks+dust | data/feel.json (data-driven) |

**Estado do QA funcional na demo**: `[QA] RESULT pass=14 fail=0` (exit 0).

## FASE 6 (parcial) — WIZARD §6 + ARQUÉTIPOS §5 + BOSS FEEL ✅

- **§6 Wizard multi-etapa**: CreateGame.tsx reescrito como 7 passos com stepper, voltar/avançar livre e **plano revisável antes da forja** — (A) Ideia + sugestões de arquétipo por palavras-chave, (B) 24 arquétipos selecionáveis (→ `genreTags` real), (C) Escopo com implicações honestas (→ `qualityTier`), (D) Direção de arte que é **injetada na ideia** (governa a Art Bible via styleFromPrompt — efeito real comprovado), (E) Plataformas com separação honesta entre "verificados pela pipeline" (win/linux/web) e "metadados futuros", (F) Classificação (IARC/Steam Kit) + acessibilidade (gamepad/remap/legendas/contraste), (G) Plano completo revisável → Aprovar & Forjar. Zero passo decorativo: tudo mapeia a campo real ou augmentação com efeito medido.
- **§5 Arquétipos: 20 → 24** com a interface `config` completa (câmera, controles, progressão, conteúdo, UI, áudio, animação, save, performance, testes, plataformas): **roguelite-action, tower-defense, factory-automation, deckbuilder** (config §5 completo em cada; enriquecimento progressivo dos 20 antigos documentado). +2 testes (24 únicos; config completo nos novos).
- **Boss Feel**: take_hit com hitstop+shake+sparks; **mudança de fase** com shake 7.0 + burst de 30 sparks.

**Estado da sessão**: 45 testes / 281 asserts · E2E true com gate de QA funcional · `[QA] RESULT pass=14 fail=0` · wizard typecheckado.

## PRÓXIMAS TAREFAS RECOMENDADAS (ordem)
1. Estender o harness de QA para os outros templates (topdown/platformer/3D)
2. Enriquecer `config` §5 nos 20 arquétipos originais
3. Decoração por BIOMA (frozen/cypunk) + boss gate cinematográfico
4. Fase 5: pipeline 3D (import GLTF + validação + LOD)


## FASE 5 — FUNDAÇÃO 3D (§8) + GATES UNIVERSAIS ✅

**QA funcional em TODOS os templates (§12)**: `generic_qa.ts` (harness polling, imune às 3 classes de freeze) injetado em topdown/platformer/3D via autoload QATest do kit gd_pro. Probes universais: title-start (caminho REAL do menu — aprendido com as duas convenções: gd_pro `_on_any_button("PLAY")` vs metroidvania `_action("DESPERTAR")`), boot+player, damage, score, HUD, save-path. **E2E multiflavor** (`scripts/e2e-multiflavor.ts`): forja os 3 flavors e exige validate PASS — **all green**. Todo jogo gerado por qualquer template agora nasce com gate de QA funcional.

**24/24 arquétipos com config §5 completo** (câmera, controles, progressão, conteúdo, UI, áudio, animação, save, performance, testes, plataformas) — teste endurecido exige TODOS os campos em TODOS.

**Validador glTF/GLB (fundação do pipeline 3D)**: `assets/gltfValidate.ts` — parser binário puro (GLB magic/chunks/length + documento glTF 2.0) com 7 regras (R1 contêiner, R2 documento, R3 conteúdo, R4 POSITION, R5 accessors, R6 buffers) + stats (vértices/malhas/materiais/animações) que alimentarão o estágio de LOD/import-profile. Testes CONSTRUEM GLBs binários spec-correct (triângulo com buffer real) e provam cada regra — 7/7.

**Dependência registrada**: modelos 3D reais dependem de importação do usuário ou text-to-3D futuro (interface ModelGenerationProvider pronta); o validador já protege qualquer GLB que entrar.

## PRÓXIMAS TAREFAS
1. Import GLTF no template 3D (cena de referência com modelo validado)
2. LOD/import-profiles por plataforma usando os stats do validador
3. Decor por bioma nos demais templates + gates cinematográficos
