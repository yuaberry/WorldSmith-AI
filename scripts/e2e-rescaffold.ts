import { forge } from "/home/llinux/nexus-forge/packages/core/src/pipeline/forge";
import { listProjects } from "/home/llinux/nexus-forge/packages/core/src/orchestrator/store";
const p = listProjects().find((x) => x.slug === "hollow-echoes")!;
const r = await forge(p.id, { stages: ["scaffold", "validate"] });
console.log("forge scaffold+validate:", r.ok, r.failedAt);
