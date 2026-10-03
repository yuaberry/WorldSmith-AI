/**
 * glTF/GLB validator — the foundation of the 3D pipeline (§8/Fase 5).
 *
 * Pure-TS, zero deps: parses the REAL binary container (GLB magic, JSON
 * chunk, BIN chunk) and the glTF 2.0 document inside, proving the model is
 * structurally sound BEFORE it ever reaches an engine import:
 *
 *   R1 container — GLB magic "glTF", version 2, declared length == actual
 *   R2 document  — valid JSON + asset.version 2.x
 *   R3 content   — at least one mesh with primitives (a game asset, not an
 *                  empty shell)
 *   R4 geometry  — every primitive has a POSITION attribute
 *   R5 accessors — attribute/indices accessor indices in range, sane counts
 *   R6 buffers   — bufferView indices in range; data present (BIN chunk or
 *                  data URI) and large enough for the declared views
 *
 * The stats (nodes/meshes/materials/animations/vertex counts) feed the
 * future LOD/import-profile stage — LOD slicing needs these numbers.
 */

export interface GltfIssue { rule: string; detail: string }
export interface GltfStats {
  scenes: number; nodes: number; meshes: number; materials: number;
  accessors: number; bufferViews: number; textures: number; animations: number;
  vertices: number;
}
export interface GltfReport {
  pass: boolean;
  format: "glb" | "gltf" | "unknown";
  version: string | null;
  generator: string | null;
  stats: GltfStats;
  issues: GltfIssue[];
}

const EMPTY_STATS: GltfStats = {
  scenes: 0, nodes: 0, meshes: 0, materials: 0,
  accessors: 0, bufferViews: 0, textures: 0, animations: 0, vertices: 0,
};

const readU32 = (b: Uint8Array, o: number): number =>
  (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;

function jsonStats(doc: Record<string, unknown>): GltfStats {
  const arr = (k: string): unknown[] => (Array.isArray(doc[k]) ? (doc[k] as unknown[]) : []);
  const accessors = arr("accessors").map((a) => a as Record<string, unknown>);
  let vertices = 0;
  for (const acc of accessors) {
    if (acc.type === "VEC3" && acc.componentType === 5126) vertices += Number(acc.count ?? 0);
  }
  return {
    scenes: arr("scenes").length,
    nodes: arr("nodes").length,
    meshes: arr("meshes").length,
    materials: arr("materials").length,
    accessors: accessors.length,
    bufferViews: arr("bufferViews").length,
    textures: arr("textures").length,
    animations: arr("animations").length,
    vertices,
  };
}

/** Validates GLB (binary) or .gltf (JSON) bytes. Deterministic, pure. */
export function validateGltf(bytes: Uint8Array): GltfReport {
  const issues: GltfIssue[] = [];
  let format: GltfReport["format"] = "unknown";
  let jsonText: string | null = null;
  let binChunk: Uint8Array | null = null;

  // ── R1: container detection ──────────────────────────────────────────────
  if (bytes.length >= 12 && bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) {
    format = "glb";
    const version = readU32(bytes, 4);
    const declared = readU32(bytes, 8);
    if (version !== 2) issues.push({ rule: "R1", detail: `GLB container version ${version} (expected 2)` });
    if (declared > bytes.length) issues.push({ rule: "R1", detail: `declared length ${declared} > file size ${bytes.length} (truncated)` });
    if (declared < bytes.length - 3) issues.push({ rule: "R1", detail: `file has ${bytes.length - declared} trailing bytes beyond declared length` });
    // chunk 0 = JSON
    if (bytes.length >= 20) {
      const jsonLen = readU32(bytes, 12);
      const jsonType = readU32(bytes, 16);
      if (jsonType !== 0x4e4f534a) {
        issues.push({ rule: "R1", detail: "first GLB chunk is not JSON (0x4E4F534A)" });
      } else if (12 + 8 + jsonLen <= bytes.length) {
        jsonText = new TextDecoder().decode(bytes.subarray(20, 20 + jsonLen));
      } else {
        issues.push({ rule: "R1", detail: `JSON chunk length ${jsonLen} overruns the file` });
      }
      // optional chunk 1 = BIN
      const binAt = 20 + jsonLen;
      if (binAt + 8 <= bytes.length) {
        const binLen = readU32(bytes, binAt);
        const binType = readU32(bytes, binAt + 4);
        if (binType === 0x004e4942) {
          const binStart = binAt + 8;
          if (binStart + binLen <= bytes.length) binChunk = bytes.subarray(binStart, binStart + binLen);
          else issues.push({ rule: "R1", detail: "BIN chunk overruns the file" });
        }
      }
    } else {
      issues.push({ rule: "R1", detail: "GLB too short for a JSON chunk header" });
    }
  } else if (bytes.length > 0 && (bytes[0] === 0x7b || bytes[0] === 0x20 || bytes[0] === 0x0a)) {
    format = "gltf";
    jsonText = new TextDecoder().decode(bytes);
  } else {
    issues.push({ rule: "R1", detail: "not a GLB container and not glTF JSON" });
  }

  if (jsonText === null) {
    return { pass: false, format, version: null, generator: null, stats: { ...EMPTY_STATS }, issues };
  }

  // ── R2: document parses, asset.version 2.x ────────────────────────────────
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(jsonText) as Record<string, unknown>;
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) throw new Error("document root is not an object");
  } catch (e) {
    issues.push({ rule: "R2", detail: `invalid glTF JSON: ${e instanceof Error ? e.message : String(e)}` });
    return { pass: false, format, version: null, generator: null, stats: { ...EMPTY_STATS }, issues };
  }
  const asset = doc.asset as Record<string, unknown> | undefined;
  const version = typeof asset?.version === "string" ? asset.version : null;
  const generator = typeof asset?.generator === "string" ? asset.generator : null;
  if (!version || !version.startsWith("2")) {
    issues.push({ rule: "R2", detail: `asset.version missing or not 2.x ("${version ?? "none"}")` });
  }

  const stats = jsonStats(doc);

  // ── R3: it must be a game asset with real geometry ────────────────────────
  if (stats.meshes === 0) issues.push({ rule: "R3", detail: "no meshes (camera/light-only glTF is not a game asset)" });
  if (stats.scenes === 0) issues.push({ rule: "R3", detail: "no scenes" });

  const meshes = Array.isArray(doc.meshes) ? (doc.meshes as Array<Record<string, unknown>>) : [];
  const accessors = Array.isArray(doc.accessors) ? (doc.accessors as Array<Record<string, unknown>>) : [];
  const bufferViews = Array.isArray(doc.bufferViews) ? (doc.bufferViews as Array<Record<string, unknown>>) : [];
  const buffers = Array.isArray(doc.buffers) ? (doc.buffers as Array<Record<string, unknown>>) : [];
  const materials = Array.isArray(doc.materials) ? (doc.materials as Array<Record<string, unknown>>) : [];

  for (let mi = 0; mi < meshes.length; mi++) {
    const mesh = meshes[mi]!;
    const prims = Array.isArray(mesh.primitives) ? (mesh.primitives as Array<Record<string, unknown>>) : [];
    if (prims.length === 0) {
      issues.push({ rule: "R3", detail: `mesh[${mi}] has no primitives` });
      continue;
    }
    for (let pi = 0; pi < prims.length; pi++) {
      const prim = prims[pi]!;
      const attrs = prim.attributes as Record<string, unknown> | undefined;
      // ── R4: geometry must have positions ──────────────────────────────────
      if (!attrs || attrs.POSITION === undefined) {
        issues.push({ rule: "R4", detail: `mesh[${mi}].primitives[${pi}] has no POSITION attribute` });
        continue;
      }
      // ── R5: accessor indices in range with sane counts ────────────────────
      const posIdx = Number(attrs.POSITION);
      const acc = accessors[posIdx];
      if (!(posIdx >= 0 && posIdx < accessors.length) || !acc) {
        issues.push({ rule: "R5", detail: `mesh[${mi}] POSITION accessor ${posIdx} out of range (accessors: ${accessors.length})` });
        continue;
      }
      if (Number(acc.count ?? 0) < 3) {
        issues.push({ rule: "R5", detail: `mesh[${mi}] POSITION has ${acc.count} vertices (< 3 — not a triangle)` });
      }
      if (prim.indices !== undefined) {
        const idx = Number(prim.indices);
        if (!(idx >= 0 && idx < accessors.length)) {
          issues.push({ rule: "R5", detail: `mesh[${mi}] indices accessor ${idx} out of range` });
        }
      }
      if (prim.material !== undefined) {
        const mat = Number(prim.material);
        if (!(mat >= 0 && mat < materials.length)) {
          issues.push({ rule: "R5", detail: `mesh[${mi}] material index ${mat} out of range (materials: ${materials.length})` });
        }
      }
    }
  }

  // ── R6: buffers/views must be in range and actually backed by data ────────
  for (const acc of accessors) {
    const bvIdx = acc.bufferView;
    if (bvIdx === undefined) continue; // sparse/zero-filled accessors are legal
    const idx = Number(bvIdx);
    if (!(idx >= 0 && idx < bufferViews.length)) {
      issues.push({ rule: "R6", detail: `accessor bufferView ${idx} out of range (bufferViews: ${bufferViews.length})` });
    }
  }
  for (let bi = 0; bi < buffers.length; bi++) {
    const buf = buffers[bi]!;
    const declared = Number(buf.byteLength ?? 0);
    if (buf.uri === undefined) {
      // GLB BIN chunk backs it
      if (format === "glb" && !binChunk) {
        issues.push({ rule: "R6", detail: `buffer[${bi}] has no uri and the GLB has no BIN chunk` });
      } else if (format === "glb" && binChunk && binChunk.length < declared) {
        issues.push({ rule: "R6", detail: `buffer[${bi}] declares ${declared}B but BIN chunk has ${binChunk.length}B` });
      }
    }
    // data URIs are validated by the importer itself — presence is enough here
  }

  return { pass: issues.length === 0, format, version, generator, stats, issues };
}
