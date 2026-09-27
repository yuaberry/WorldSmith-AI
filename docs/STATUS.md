# WorldSmith AI — Status Real (v0.10.0)

> Regra da casa: nada de "Coming Soon" falso. Este documento distingue
> **verificado por teste**, **implementado sem teste** e **arquitetura pronta**.

## ✅ Verificado por teste (nesta máquina: Linux Mint 22, Bun 1.4.2)

- **Pipeline completo (8 estágios):** ideia → GameSpecification → DNA → GDD →
  arquitetura → scaffold com assets (Art Bible) → tasks → buildout (coder LLM +
  validação + fixer ×3) → validate (smoke-run autoritativo) → **playable**.
  E2E de referência: `bun run scripts/e2e-rescaffold.ts` → `true null`.
- **Metroidvania genre pack:** parry/i-frames, FSM, boss 2 fases com cinematic,
  NPC dialogue, ability gates, checkpoints, mapa, weather, parallax, gamepad.
- **Art Bible + assets:** pixel art v2 de nível estúdio (ramps hue-shifted,
  sel-out, rim light, dithering) — herói, criatura, boss, NPC, tiles, céu,
  **e props v2 (bonfire, orb, shard, glow)**. Validador anti-drift com budgets.
- **QA visual multimodal (§14):** screenshot REAL do jogo (movie-writer) →
  ladder de visão gratuito (nemotron → qwen → gemma) com retry — medido
  funcionando de ponta a ponta (PASS e FAIL com achados reais). Integrado ao
  estágio validate: escreve `docs/qa-report.md` e abre task de reparo em FAIL.
- **System map (§11.3):** coder LLM recebe o mapa sistema→arquivo→knob do
  genre pack (tuning vai para `data/*.json`, não para código).
- **Steam Publish Kit (21 arquivos)** + capsules reais + screenshots reais.
- **Live Preview:** export Web real (WASM) rodando dentro do estúdio.
- **Builds standalone dos jogos** (.exe/Linux) e **do estúdio**
  (`dist-release/`, UI embutida, smoke-testado: UI 200 / API 200).
- **Estúdio no GitHub Pages:** `/studio/` (SPA com snapshot REAL de um projeto
  forjado — DNA, tasks, código, assets, QA report — e preview jogável embutido)
  + demo WASM do jogo no `/demo/`. Mutações respondem honestamente no modo demo.
- **Testes:** 28 testes / 180 asserts verdes; typecheck estrito core+UI: 0 erros.
- **Segurança:** chave AES-256-GCM fora do repo (grep verificado); servidor
  localhost-only; paths de agentes contidos ao workspace.

## 🟡 Implementado, ainda não testado nesta máquina

- **Windows/macOS:** código multi-OS pronto, exes publicados; máquina de dev é
  Linux — reporte issues.
- **Unreal 5 scaffold:** gera .uproject/Source/Config; compilação exige UE5.

## 🟠 Limitações conhecidas (honestas)

- Endpoints de visão **gratuitos** são instáveis (429/ResourceExhausted) — o
  ladder com retry cobre na maioria das vezes; quando falha, o QA pula com
  aviso honesto (nunca bloqueia o build). Créditos de **imagem** (Gemini)
  depletam rápido (402 tratado).
- 3D: text-to-3D ainda não (interface `ModelGenerationProvider` pronta).
- Música: só SFX sintetizados.
- Playtesting autônomo com métricas: Fase 5 (hooks existem, loop não).
- Unity adapter: Fase 7 (interface pronta, implementação não).
- O estúdio WEB (Pages) é demo estático de um projeto real — forjar novos
  jogos exige o app (física do hosting estático, documentada no banner).
