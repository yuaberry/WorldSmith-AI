/** Isolated vision-QA test: capture one real screenshot + run provider ladder once. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const exec = promisify(execFile);

const ws = join(homedir(), ".nexusforge/projects/hollow-echoes");
const godot = join(homedir(), ".nexusforge/engines/godot/godot");
const tmp = join(ws, ".nexusforge-tmp/qa-test");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const t0 = Date.now();
// display mode first (movie writer needs raster), headless fallback
for (const mode of [[], ["--headless"]] as string[][]) {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  try {
    await exec(godot, [...mode, "--path", ".", "--write-movie", join(tmp, "f.png"), "--quit-after", "40"], { cwd: ws, timeout: 90_000, maxBuffer: 20_000_000 });
    const pngs = readdirSync(tmp).filter((f) => f.endsWith(".png")).sort();
    if (pngs.length) {
      const png = join(tmp, pngs[pngs.length - 1]!);
      const bytes = new Uint8Array(await Bun.file(png).arrayBuffer());
      console.log(`captured ${pngs[pngs.length - 1]} (${Math.round(bytes.length / 1024)}KB) in ${Date.now() - t0}ms via ${mode.length ? "headless" : "display"}`);
      const { visionProvider } = await import("/home/llinux/nexus-forge/packages/core/src/assets/visualQA");
      const bible = { style: "pixel art dark fantasy" } as never;
      const instructions = `Você é QA visual de jogos. Screenshot REAL de um jogo ${"pixel art dark fantasy"}. Verifique: (1) elementos de gameplay legíveis contra o fundo; (2) UI sobreposta ou ilegível; (3) iluminacao incorreta/artefatos; (4) composicao com espaco vazio excessivo; (5) personagens fora de proporcao. Responda APENAS JSON: {"pass": true|false, "issues": ["curto"]}`;
      const t1 = Date.now();
      const r = await visionProvider.analyze(bytes, instructions);
      console.log(`vision result (${Date.now() - t1}ms):`, JSON.stringify(r).slice(0, 300));
      void bible;
      process.exit(0);
    }
  } catch (e) { console.log(`mode ${mode.length ? "headless" : "display"} failed: ${(e as Error).message.slice(0, 80)}`); }
}
console.log("capture failed in all modes");
