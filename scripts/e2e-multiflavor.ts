/**
 * e2e-multiflavor.ts — proves the functional-QA release gate on EVERY
 * template: forges a topdown, a platformer and a 3D game (scaffold+validate)
 * and requires validate PASS — which now runs qa/functional.gd (polling
 * harness) inside the real engine. "Boots" is not enough; every flavor must
 * PLAY.
 */
import { forge } from "/home/llinux/nexus-forge/packages/core/src/pipeline/forge";
import { createProject, listProjects } from "/home/llinux/nexus-forge/packages/core/src/orchestrator/store";

const CASES: Array<{ name: string; idea: string; dimensions: string }> = [
  {
    name: "QA E2E Topdown",
    idea: "Um jogo de arena top-down onde um guardião coleta fragmentos arcanos espalhados pela arena, evita sentinelas hostis e pontua ao coletar cada fragmento.",
    dimensions: "2d",
  },
  {
    name: "QA E2E Platformer",
    idea: "Um jogo de plataforma de precisão com salto e física: um pequeno explorador atravessa plataformas flutuantes numa torre em ruínas, coleta fragmentos e evita espinhos.",
    dimensions: "2d",
  },
  {
    name: "QA E2E 3D",
    idea: "Uma experiência de exploração 3D em terceira pessoa: um andarilho atravessa um vale de monólitos low-poly coletando fragmentos de luz.",
    dimensions: "3d",
  },
];

let failures = 0;
for (const c of CASES) {
  const existing = listProjects().find((p) => p.name === c.name);
  const project = existing ?? createProject({ idea: c.idea, name: c.name, dimensions: c.dimensions as never, engine: "godot4" });
  const r = await forge(project.id, { stages: ["scaffold", "validate"] });
  const ok = r.ok === true;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} · ${c.name}: scaffold+validate ${r.ok}${r.failedAt ? ` (failedAt: ${r.failedAt})` : ""}`);
}
console.log(failures === 0 ? "MULTIFLAVOR E2E: all green" : `MULTIFLAVOR E2E: ${failures} flavor(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
