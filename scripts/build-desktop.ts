import { existsSync, mkdirSync, copyFileSync } from "node:fs";
 * build-desktop.ts — one command to the professional desktop app:
 *   1) ensures the backend standalone binary exists (build-release.ts)
 *   2) copies it into apps/desktop/resources/backend (bundled by the packer)
 *   3) runs electron-builder → .deb + AppImage with the brand icon
 * Run: bun run scripts/build-desktop.ts   (from the repo root)
 */

import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const BACKEND = join(ROOT, "dist-release", "WorldSmith AI");
const TARGET = join(ROOT, "apps", "desktop", "resources", "backend", "WorldSmith AI");

if (!existsSync(BACKEND)) {
  console.log("· backend binary missing — building it (build-release.ts)…");
  execFileSync("bun", ["run", "scripts/build-release.ts"], { cwd: ROOT, stdio: "inherit" });
}
mkdirSync(join(TARGET, ".."), { recursive: true });
copyFileSync(BACKEND, TARGET);
console.log("· backend bundled into apps/desktop/resources/backend");

console.log("· packaging (electron-builder: deb + AppImage)…");
execFileSync(join(ROOT, "apps/desktop/node_modules/.bin/electron-builder"), ["--linux", "deb", "appimage"], {
  cwd: join(ROOT, "apps", "desktop"), stdio: "inherit",
});
console.log("\n✓ Desktop app: apps/desktop/dist/ (.deb installer + .AppImage)");
