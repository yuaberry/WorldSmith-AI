/**
 * Web demo mode — when the core backend isn't reachable (GitHub Pages),
 * the studio runs on a REAL snapshot of a project forged by the pipeline.
 * Every artifact shown is real (DB rows, docs, code, sprites, WASM preview);
 * only LIVE forging requires the app. Mutations answer honestly.
 */

interface DemoBundle {
  status: unknown;
  project: Record<string, unknown> & { id: string };
  tasks: unknown[];
  events: unknown[];
  dna: Record<string, unknown>;
  tree: Array<{ path: string; type: "file" | "dir" }>;
  files: Record<string, string>;
  assets: Record<string, string>; // base64 PNGs
  git: unknown;
  builds: unknown;
  storeKit: { images: number; screenshots: number };
  previewUrl: string;
}

let demo = false;
let data: DemoBundle | null = null;

export function isDemo(): boolean { return demo; }

/** Detect: try the real backend first; fall back to the snapshot honestly.
 *  NEVER throws — boot must always complete (hardened after the v0.10.0 bug:
 *  any rejection here left the studio stuck on "booting worldsmith…" forever). */
export async function initDemo(): Promise<boolean> {
  // 1) live backend probe (fast-fail: 2.5s)
  try {
    const res = await fetch("api/status", { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const j = (await res.json().catch(() => null)) as { app?: string } | null;
      if (j?.app) return false; // live backend
    }
  } catch { /* no backend here */ }
  // 2) web-demo snapshot — fully protected: ANY failure degrades to an honest
  //    empty studio (topbar OFFLINE), never an eternal spinner.
  try {
    const res = await fetch("demo-data.json", { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return false;
    const bundle = (await res.json()) as DemoBundle | null;
    if (!bundle || !bundle.project?.id || !bundle.status) return false; // shape sanity
    data = bundle;
    installIntercept(bundle);
    demo = true;
    return true;
  } catch {
    return false;
  }
}

const DEMO_MUTATION_MSG =
  "Modo demo web — o estúdio completo (forjar novos jogos, engine real, IA, builds) roda no aplicativo. Baixe o WorldSmith AI na aba Download do site.";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function pngResponse(b64: string): Response {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return new Response(new Blob([out], { type: "image/png" }));
}

/** Route resolver — mirrors the core server's API surface for read-only data. */
function resolve(url: string, d: DemoBundle): Response | null {
  const u = url.replace(/^(\.\/|\/)/, "");
  if (!u.startsWith("api/")) return null;
  const path = u.split("?")[0]!;
  const query = new URLSearchParams(u.includes("?") ? u.slice(u.indexOf("?") + 1) : "");
  const m = (re: RegExp) => path.match(re);

  // mutations → honest error (req() surfaces data.error in the UI)
  if (m(/^api\/(projects$|projects\/[^/]+\/(forge|validate|editor|export-web|preview-refresh|store-kit|build-game|ai-sprite|regen-sprite)|credentials$|settings$|engines\/godot\/(install|templates-install)|tasks\/[^/]+\/(approve|reject))/) && !path.includes("status")) {
    if (path === "api/settings" || path === "api/credentials") {
      // GETs on these are reads — handled below; anything else is a mutation
    }
    const isRead =
      (path === "api/settings" || path === "api/credentials") ||
      path.endsWith("preview-status") || path.endsWith("store-kit-status") ||
      path.endsWith("builds") || path.endsWith("templates-status") ||
      path.endsWith("/tree") || path.endsWith("/events") || path.endsWith("/git") ||
      path.includes("/file") || path.includes("/asset-file") ||
      path === "api/projects" || /\/api\/projects\/[^/]+$/.test(path);
    if (!isRead) return jsonResponse({ error: DEMO_MUTATION_MSG }, 400);
  }

  if (path === "api/status") return jsonResponse(d.status);
  if (path === "api/credentials") return jsonResponse({ configured: false, hint: "demo web: configure a chave no aplicativo" });
  if (path === "api/settings") return jsonResponse({ mode: "autonomous", autoEngineInstall: false, defaultModel: "z-ai/glm-5.3-flash" });
  if (path === "api/engines/godot/templates-status") return jsonResponse({ installed: true, target: "web" });
  if (path === "api/projects") return jsonResponse({ projects: [d.project] });

  const pm = path.match(/^api\/projects\/([^/?]+)(\/.*)?$/);
  if (pm) {
    if (!pm[2]) return jsonResponse({ project: d.project, tasks: d.tasks, events: d.events, dna: d.dna });
    const sub = pm[2]!;
    if (sub === "/tree") return jsonResponse({ tree: d.tree });
    if (sub === "/events") return jsonResponse({ events: d.events });
    if (sub === "/git") return jsonResponse(d.git);
    if (sub === "/preview-status") return jsonResponse({ ready: true, url: d.previewUrl });
    if (sub === "/store-kit-status") return jsonResponse({ ready: d.storeKit.images > 0, ...d.storeKit });
    if (sub === "/builds") return jsonResponse({ builds: d.builds });
    if (sub.startsWith("/file")) {
      const p = query.get("path") ?? "";
      const content = d.files[p];
      if (content === undefined) return jsonResponse({ error: `arquivo não incluído no snapshot web: ${p}` }, 404);
      return jsonResponse({ path: p, content });
    }
    if (sub.startsWith("/asset-file")) {
      const p = query.get("path") ?? "";
      if (d.assets[p]) return pngResponse(d.assets[p]!);
      const slot0 = p.replace(/\.png$/, "_0.png");
      if (d.assets[slot0]) return pngResponse(d.assets[slot0]!);
      return jsonResponse({ error: `asset fora do snapshot: ${p}` }, 404);
    }
  }
  return null; // unknown route → passthrough (will 404 honestly)
}

function installIntercept(d: DemoBundle): void {
  const orig = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname + input.search : input.url;
    const out = resolve(url, d);
    if (out) return Promise.resolve(out);
    return orig(input as never, init);
  }) as typeof fetch;
}
