/**
 * Reference images (§2/§6-A) — the user attaches images at creation time;
 * they are stored inside the project and ANALYZED BY VISION before planning:
 * the extracted art direction (palette, mood, style, camera) is appended to
 * the brief so both the deterministic planner AND the Art Bible inherit the
 * reference's look. Honest fallbacks: no key/credits → stored, skipped with
 * a visible event, planning proceeds text-only.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getDB } from "../db";
import { uid, now } from "../util";
import { bus } from "../events";
import { visionProvider } from "../assets/visualQA";
import type { ProjectRow } from "../orchestrator/store";

export interface ReferenceRow {
  id: string;
  projectId: string;
  kind: string;
  name: string;
  path: string | null;
  analysis: string | null;
}

const MAX_BYTES = 5 * 1024 * 1024;

export function referencesDir(project: ProjectRow): string {
  return join(project.data_path, "references");
}

export function saveReference(
  project: ProjectRow,
  name: string,
  mime: string,
  dataBase64: string,
): { ok: boolean; id?: string; error?: string } {
  if (typeof dataBase64 !== "string" || dataBase64.length < 32) {
    return { ok: false, error: "arquivo vazio ou inválido" };
  }
  const bytes = Buffer.from(dataBase64, "base64");
  if (bytes.length === 0) return { ok: false, error: "arquivo vazio" };
  if (bytes.length > MAX_BYTES) return { ok: false, error: `arquivo maior que 5MB (${(bytes.length / 1048576).toFixed(1)}MB)` };

  const kind = mime.startsWith("image/") ? "image" : mime.startsWith("text/") ? "text" : "document";
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "reference";
  const dir = referencesDir(project);
  mkdirSync(dir, { recursive: true });
  const unique = `${uid("ref")}-${safe}`;
  const abs = join(dir, unique);
  writeFileSync(abs, bytes);

  const id = uid("refid");
  getDB().run(
    `INSERT INTO project_references (id, project_id, kind, category, name, path, meta, analysis, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    id, project.id, kind, "visual", safe, `references/${unique}`, JSON.stringify({ mime, size: bytes.length }),
    null, "imported", now(),
  );
  bus.emit({ projectId: project.id, agent: "reference-hub", stage: "analyze", level: "info", message: `Referência anexada: ${safe} (${kind}, ${(bytes.length / 1024).toFixed(0)}KB)` });
  return { ok: true, id };
}

export function listReferences(projectId: string): ReferenceRow[] {
  return getDB().all<ReferenceRow & Record<string, unknown>>(
    `SELECT id, project_id as projectId, kind, name, path, analysis FROM project_references
     WHERE project_id = ? ORDER BY created_at`,
    projectId,
  );
}

interface ReferenceRead {
  palette: string[];
  mood: string;
  style: string;
  camera: string;
  genreHints: string[];
  avoid: string[];
}

const REF_PROMPT = `Você é um diretor de arte de jogos analisando uma IMAGEM DE REFERÊNCIA enviada por um usuário (um jogo que ele quer criar — extraia apenas características ABSTRATAS: nada de marcas, personagens ou conteúdo protegido).
Responda APENAS JSON:
{"palette": ["#rrggbb", "#rrggbb", "#rrggbb", "#rrggbb", "#rrggbb"], "mood": "3-6 palavras", "style": "ex.: pixel art sombria / low-poly estilizado / pintura digital", "camera": "perspectiva sugerida", "genreHints": ["2-4 palavras de gênero"], "avoid": ["1-3 coisas a evitar pela identidade da referência"]}`;

function referenceToBriefText(r: ReferenceRead, name: string): string {
  return `ANÁLISE DE REFERÊNCIA VISUAL ("${name}"): paleta ${r.palette?.slice(0, 5).join(" ") ?? ""}; mood ${r.mood ?? ""}; estilo ${r.style ?? ""}; câmera ${r.camera ?? ""}; gêneros sugeridos ${(r.genreHints ?? []).join(", ")}; evitar ${(r.avoid ?? []).join(", ")}. Use esta direção de arte como base visual do jogo.`;
}

/**
 * Analyzes up to `limit` image references with the vision ladder and returns
 * the accumulated brief-text ("" when none/failed). Stores the analysis per
 * reference row. NEVER throws — planning proceeds text-only on any failure.
 */
export async function analyzeReferenceImages(project: ProjectRow, limit = 2): Promise<string> {
  const refs = listReferences(project.id).filter((r) => r.kind === "image" && r.path);
  if (refs.length === 0) return "";
  if (!visionProvider.configured) {
    bus.emit({ projectId: project.id, agent: "reference-hub", stage: "analyze", level: "warning", message: "Referências armazenadas, mas sem provider de visão configurado — análise visual pulada (honesto)." });
    return "";
  }
  const parts: string[] = [];
  for (const ref of refs.slice(0, limit)) {
    const abs = join(project.data_path, ref.path!);
    if (!existsSync(abs)) continue;
    try {
      const bytes = new Uint8Array((await Bun.file(abs).arrayBuffer()));
      const r = await visionProvider.visionJson<ReferenceRead>(bytes, REF_PROMPT);
      if (r.ok && r.json && Array.isArray(r.json.palette)) {
        const text = referenceToBriefText(r.json, ref.name);
        parts.push(text);
        getDB().run(`UPDATE project_references SET analysis = ?, status = 'analyzed' WHERE id = ?`, JSON.stringify(r.json), ref.id);
        bus.emit({ projectId: project.id, agent: "reference-hub", stage: "analyze", level: "success", message: `Referência analisada por visão: ${ref.name} → ${r.json.style ?? "?"} · paleta ${r.json.palette.length} cores` });
      } else {
        bus.emit({ projectId: project.id, agent: "reference-hub", stage: "analyze", level: "warning", message: `Análise de "${ref.name}" indisponível: ${(r.error ?? "").slice(0, 90)} — seguindo só com texto.` });
      }
    } catch (e) {
      bus.emit({ projectId: project.id, agent: "reference-hub", stage: "analyze", level: "warning", message: `Análise de "${ref.name}" falhou: ${e instanceof Error ? e.message.slice(0, 90) : String(e)}` });
    }
  }
  return parts.join("\n");
}
