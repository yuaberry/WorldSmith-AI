/**
 * WorldSmith AI — desktop shell (Electron).
 *
 * A NATIVE window (no browser tabs): spawns the bundled WorldSmith backend
 * (standalone binary), waits for the studio server and loads it in an
 * app window with the brand icon, menu and external-link handling.
 * The backend dies with the app (process-group kill — no orphan servers).
 */
const { app, BrowserWindow, Menu, shell } = require("electron");
const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const PORT = 5180;
const URL_APP = `http://127.0.0.1:${PORT}`;
const SMOKE = process.argv.includes("--smoke");

let win = null;
let backend = null;

function backendBinary() {
  // packaged: extraResources → resources/backend/WorldSmith AI
  const packaged = path.join(process.resourcesPath, "backend", "WorldSmith AI");
  if (existsSync(packaged)) return packaged;
  // dev: repo build
  const dev = path.join(__dirname, "..", "..", "dist-release", "WorldSmith AI");
  if (existsSync(dev)) return dev;
  return null;
}

function startBackend() {
  const bin = backendBinary();
  if (!bin) {
    console.error("[desktop] backend binary not found — run scripts/build-release.ts first");
    return false;
  }
  backend = spawn(bin, [], {
    cwd: path.dirname(bin),
    detached: true, // own process group → we can reap the whole tree on exit
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, WORLDSMITH_NO_OPEN: "1", ELECTRON_NO_ATTACH_CONSOLE: "1" },
  });
  backend.stdout.on("data", (d) => process.stdout.write(`[worldsmith] ${d}`));
  backend.stderr.on("data", (d) => process.stderr.write(`[worldsmith] ${d}`));
  return true;
}

async function waitForServer(timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(`${URL_APP}/api/status`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: "WorldSmith AI",
    backgroundColor: "#0b0c12",
    icon: path.join(__dirname, "build", "icon.png"),
    autoHideMenuBar: false,
    show: false,
  });
  win.once("ready-to-show", () => win.show());

  // brand menu (PT, product-grade)
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "WorldSmith AI", submenu: [
      { label: "Sobre o WorldSmith AI", click: () => shell.openExternal("https://github.com/yuaberry/WorldSmith-AI") },
      { type: "separator" },
      { role: "quit", label: "Sair" },
    ]},
    { label: "Ver", submenu: [
      { role: "reload", label: "Recarregar" },
      { role: "forceReload", label: "Recarregar (forçar)" },
      { role: "toggleDevTools", label: "DevTools" },
      { type: "separator" },
      { role: "resetZoom", label: "Zoom normal" },
      { role: "zoomIn", label: "Ampliar" },
      { role: "zoomOut", label: "Reduzir" },
      { role: "togglefullscreen", label: "Tela cheia" },
    ]},
  ]));

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url); // downloads / GitHub links open in the system browser
    return { action: "deny" };
  });
}

app.enableSandbox();
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  app.whenReady().then(async () => {
    if (!startBackend()) { app.quit(); return; }
    const up = await waitForServer();
    if (!up) { console.error("[desktop] studio server did not come up"); app.quit(); return; }
    createWindow();
    await win.loadURL(URL_APP);
    if (SMOKE) {
      setTimeout(async () => {
        const health = await fetch(`${URL_APP}/api/status`).then((r) => r.json()).catch(() => null);
        console.log(`[DESKTOP-SMOKE] title="${win.getTitle()}" loaded=${win.webContents.getURL()} backend=${health ? health.app + " " + health.version : "unreachable"}`);
        app.exit(0);
      }, 4000);
    }
  });

  app.on("window-all-closed", () => app.quit());

  // Belt & suspenders: app.exit() skips before-quit, but the node 'exit'
  // event ALWAYS runs — the backend tree must never outlive the app.
  const killBackend = () => {
    if (backend && backend.pid) {
      try { process.kill(-backend.pid, "SIGTERM"); } catch { try { backend.kill("SIGTERM"); } catch {} }
    }
    backend = null;
  };
  app.on("before-quit", killBackend);
  process.on("exit", killBackend);
}
