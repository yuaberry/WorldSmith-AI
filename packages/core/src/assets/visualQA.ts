/**
 * Multimodal Visual QA (§14) + provider abstraction (§10) + model routing.
 * VisionProvider inspects assets against the Art Bible. A failing asset is
 * NOT accepted — issues are reported and regeneration can be requested.
 * Credit-aware: failures are honest (402 → "QA unavailable"), never faked.
 */
import { getSetting, getCredential } from "../settings";
import { bus } from "../events";
import { z } from "zod";
import type { ArtBible } from "./artBible";
import { encodePNG, Px } from "./spriteForge";
import { decodePNG } from "./validate";

// ── Provider abstraction (§10, §17) ──────────────────────────────────────────

export interface ImageGenerationProvider {
  readonly id: string;
  readonly configured: boolean;
  generate(prompt: string, opts?: { maxTokens?: number }): Promise<{ ok: boolean; bytes?: Uint8Array; error?: string }>;
}

export interface VisionProvider {
  readonly id: string;
  readonly configured: boolean;
  analyze(image: Uint8Array, instructions: string): Promise<{ ok: boolean; pass?: boolean; issues?: string[]; error?: string }>;
}

const API = "https://openrouter.ai/api/v1/chat/completions";

class OpenRouterImageProvider implements ImageGenerationProvider {
  readonly id = "openrouter-image";
  get configured(): boolean { return getCredential("openrouter") != null; }
  async generate(prompt: string, opts?: { maxTokens?: number }): Promise<{ ok: boolean; bytes?: Uint8Array; error?: string }> {
    const key = getCredential("openrouter");
    if (!key) return { ok: false, error: "no key" };
    const model = getSetting<string>("providers.openrouter.imageModel", "google/gemini-3.1-flash-image");
    for (const maxTokens of [opts?.maxTokens ?? 3000, 1024, 512]) {
      try {
        const res = await fetch(API, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Nexus Forge" },
          body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"], max_tokens: maxTokens }),
          signal: AbortSignal.timeout(120_000),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          if (res.status === 402) continue;
          return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 120)}` };
        }
        const data = (await res.json()) as { choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }> };
        const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!url?.includes("base64,")) return { ok: false, error: "no image data" };
        return { ok: true, bytes: Uint8Array.from(atob(url.split("base64,")[1]!), (c) => c.charCodeAt(0)) };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
    return { ok: false, error: "402 — créditos insuficientes para geração de imagem" };
  }
}

class OpenRouterVisionProvider implements VisionProvider {
  readonly id = "openrouter-vision";
  get configured(): boolean { return getCredential("openrouter") != null; }
  async analyze(image: Uint8Array, instructions: string): Promise<{ ok: boolean; pass?: boolean; issues?: string[]; error?: string }> {
    const key = getCredential("openrouter");
    if (!key) return { ok: false, error: "no key" };
    const model = getSetting<string>("providers.openrouter.visionModel", "z-ai/glm-5.3");
    const b64 = Buffer.from(image).toString("base64");
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Nexus Forge" },
        body: JSON.stringify({
          model,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: instructions },
              { type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } },
            ],
          }],
          response_format: { type: "json_object" },
          max_tokens: 900,
        }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 120)}` };
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content ?? "";
      const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const candidate = fenced ? fenced[1]! : content;
      const start = candidate.indexOf("{"), end = candidate.lastIndexOf("}");
      const parsed = z.object({ pass: z.boolean(), issues: z.array(z.string()).default([]) })
        .parse(JSON.parse(candidate.slice(start, end + 1)));
      return { ok: true, pass: parsed.pass, issues: parsed.issues };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

export const imageProvider: ImageGenerationProvider = new OpenRouterImageProvider();
export const visionProvider: VisionProvider = new OpenRouterVisionProvider();

// ── Contact sheet (one vision call inspects ALL sprites) ─────────────────────

export function buildContactSheet(sprites: Array<{ label: string; bytes: Uint8Array }>, cell = 64): Uint8Array | null {
  const valid = sprites.filter((s) => s.bytes.length > 8);
  if (valid.length === 0) return null;
  const cols = Math.min(8, valid.length);
  const rows = Math.ceil(valid.length / cols);
  const sheet = new Px(cols * cell, rows * cell + 8);
  sheet.rect(0, 0, cols * cell, rows * cell + 8, [16, 18, 26]);
  valid.forEach((s, i) => {
    const cx = (i % cols) * cell, cy = Math.floor(i / cols) * cell;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      if ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0) sheet.set(cx + x, cy + y, [34, 38, 52]);
    }
    const info = decodePNG(s.bytes);
    if (info) {
      for (let y = 0; y < info.h; y++) for (let x = 0; x < info.w; x++) {
        const idx = (y * info.w + x) * 4;
        if (info.rgba[idx + 3]! > 0) {
          for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
            sheet.set(cx + 2 + x * 2 + dx, cy + 2 + y * 2 + dy, [info.rgba[idx]!, info.rgba[idx + 1]!, info.rgba[idx + 2]!]);
          }
        }
      }
    }
    // tag bar proportional to label length (per-cell identity tag)
    const bar = Math.min(cell - 4, s.label.length * 4);
    sheet.rect(cx + 2, cy + cell - 5, bar, 3, [127, 160, 255]);
  });
  return encodePNG(sheet.w, sheet.h, sheet.data);
}

// ── QA runner (§14, §15) ──────────────────────────────────────────────────────

export interface QAResult { checked: boolean; pass?: boolean; issues?: string[]; reason?: string }

export async function runVisualQA(
  projectId: string,
  sprites: Array<{ label: string; bytes: Uint8Array }>,
  bible: ArtBible,
): Promise<QAResult> {
  if (!visionProvider.configured) {
    const r: QAResult = { checked: false, reason: "Vision provider não configurado" };
    bus.emit({ projectId, agent: "visual-qa", stage: "assets", level: "warning", message: "Visual QA pulado: sem provider de visão configurado." });
    return r;
  }
  const sheet = buildContactSheet(sprites);
  if (!sheet) return { checked: false, reason: "no sprites to inspect" };
  const instructions = `Você é um QA visual de game assets. Inspecione este CONTACT SHEET de sprites de um jogo ${bible.style}.
Art Bible: silhueta — ${bible.silhouetteRule}. Contraste — ${bible.contrastRule}. Inimigos usam tom de perigo (${bible.palette.danger}), interagíveis usam destaque (${bible.palette.highlight}).
Cheque: (1) silhuetas quebradas/anatomia malformada; (2) artefatos visuais e texto acidental dentro dos sprites; (3) inconsistência de estilo entre sprites; (4) elementos ilegíveis contra fundo escuro; (5) personagens mudando de identidade entre células.
Responda APENAS JSON: {"pass": true|false, "issues": ["descrição curta de cada problema, ou lista vazia"]}`;
  const r = await visionProvider.analyze(sheet, instructions);
  if (!r.ok) {
    bus.emit({ projectId, agent: "visual-qa", stage: "assets", level: "warning", message: `Visual QA indisponível: ${(r.error ?? "").slice(0, 120)}` });
    return { checked: false, reason: r.error };
  }
  if (r.pass) {
    bus.emit({ projectId, agent: "visual-qa", stage: "assets", level: "success", message: `Visual QA PASS — ${sprites.length} assets consistentes com a Art Bible.` });
  } else {
    bus.emit({ projectId, agent: "visual-qa", stage: "assets", level: "error", message: `Visual QA FAIL: ${(r.issues ?? []).join(" | ").slice(0, 220)}` });
  }
  return { checked: true, pass: r.pass, issues: r.issues };
}
