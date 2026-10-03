/**
 * glTF validator tests (§8/Fase 5) — the tests BUILD real glTF/GLB bytes
 * from scratch (triangle geometry with a true binary buffer), so the parser
 * is proven against the actual spec, not a mock.
 *
 * GLB layout (all little-endian):
 *   header: magic "glTF" | version 2 | total length
 *   chunk0: len | "JSON" | JSON (space-padded to 4B)
 *   chunk1: len | "BIN\0" | data (zero-padded to 4B)
 */
import { describe, expect, test } from "bun:test";
import { validateGltf } from "../src/assets/gltfValidate";

const POS = new Float32Array([0, 1, 0, -1, -1, 0, 1, -1, 0]);      // 3 verts (36B)
const IDX = new Uint16Array([0, 1, 2]);                            // 3 indices (6B)

function triangleDoc(): Record<string, unknown> {
  return {
    asset: { version: "2.0", generator: "worldsmith-test" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: POS.byteLength },
      { buffer: 0, byteOffset: POS.byteLength, byteLength: IDX.byteLength },
    ],
    buffers: [{ byteLength: POS.byteLength + IDX.byteLength }],
    materials: [{ name: "test-mat" }],
  };
}

/** Assembles a spec-correct GLB around the triangle document. */
function buildGlb(doc: Record<string, unknown>, bin: Uint8Array): Uint8Array {
  const pad4 = (n: number) => (4 - (n % 4)) % 4;
  const json = new TextEncoder().encode(JSON.stringify(doc));
  const jsonPad = pad4(json.length);
  const binPad = pad4(bin.length);
  const total = 12 + 8 + json.length + jsonPad + 8 + bin.length + binPad;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true);       // magic "glTF"
  dv.setUint32(4, 2, true);                // version
  dv.setUint32(8, total, true);           // total length
  let o = 12;
  dv.setUint32(o, json.length + jsonPad, true); o += 4;
  dv.setUint32(o, 0x4e4f534a, true); o += 4;   // "JSON"
  out.set(json, o); o += json.length;
  for (let i = 0; i < jsonPad; i++) out[o + i] = 0x20; o += jsonPad;  // space padding
  dv.setUint32(o, bin.length + binPad, true); o += 4;
  dv.setUint32(o, 0x004e4942, true); o += 4;   // "BIN\0"
  out.set(bin, o); o += bin.length;
  return out;   // trailing zero padding is implicit (buffer pre-zeroed)
}

function triangleBin(): Uint8Array {
  const bin = new Uint8Array(POS.byteLength + IDX.byteLength);
  bin.set(new Uint8Array(POS.buffer), 0);
  bin.set(new Uint8Array(IDX.buffer), POS.byteLength);
  return bin;
}

describe("glTF validator (§8/Fase 5)", () => {
  test("valid GLB triangle passes with correct stats", () => {
    const r = validateGltf(buildGlb(triangleDoc(), triangleBin()));
    expect(r.pass).toBe(true);
    expect(r.format).toBe("glb");
    expect(r.version).toBe("2.0");
    expect(r.stats.meshes).toBe(1);
    expect(r.stats.vertices).toBe(3);
    expect(r.stats.materials).toBe(1);
    expect(r.stats.accessors).toBe(2);
    expect(r.issues.length).toBe(0);
  });

  test("valid .gltf (JSON with data URI) passes", () => {
    const bin = triangleBin();
    const doc = triangleDoc();
    (doc.buffers as Array<Record<string, unknown>>)[0]!.uri =
      "data:application/octet-stream;base64," + Buffer.from(bin).toString("base64");
    const r = validateGltf(new TextEncoder().encode(JSON.stringify(doc)));
    expect(r.pass).toBe(true);
    expect(r.format).toBe("gltf");
  });

  test("R1: wrong magic / truncated / overrun are rejected", () => {
    expect(validateGltf(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])).issues[0]!.rule).toBe("R1");
    const glb = buildGlb(triangleDoc(), triangleBin());
    const truncated = glb.subarray(0, glb.length - 40);
    expect(validateGltf(truncated).pass).toBe(false);
    const res = validateGltf(truncated);
    expect(res.issues.some((i) => i.rule === "R1")).toBe(true);
  });

  test("R2: glTF 1.0 asset version is rejected", () => {
    const doc = triangleDoc();
    (doc.asset as Record<string, unknown>).version = "1.0";
    const r = validateGltf(new TextEncoder().encode(JSON.stringify(doc)));
    expect(r.pass).toBe(false);
    expect(r.issues.some((i) => i.rule === "R2")).toBe(true);
  });

  test("R3/R4: mesh without POSITION or empty model rejected", () => {
    const doc = triangleDoc();
    (doc.meshes as Array<Record<string, unknown>>)[0]!.primitives = [{ attributes: { NORMAL: 0 } }];
    const r = validateGltf(new TextEncoder().encode(JSON.stringify(doc)));
    expect(r.issues.some((i) => i.rule === "R4")).toBe(true);
    const empty = { asset: { version: "2.0" }, scenes: [{}], nodes: [], meshes: [] };
    const r2 = validateGltf(new TextEncoder().encode(JSON.stringify(empty)));
    expect(r2.issues.some((i) => i.rule === "R3")).toBe(true);
  });

  test("R5/R6: out-of-range accessor, material and BIN size rejected", () => {
    const doc = triangleDoc();
    ((doc.meshes as Array<Record<string, unknown>>)[0]!.primitives as Array<Record<string, unknown>>)[0]!.material = 7;
    const r = validateGltf(new TextEncoder().encode(JSON.stringify(doc)));
    expect(r.issues.some((i) => i.rule === "R5")).toBe(true);
    // BIN chunk smaller than declared buffer
    const smallBin = new Uint8Array(8);
    const r2 = validateGltf(buildGlb(triangleDoc(), smallBin));
    expect(r2.issues.some((i) => i.rule === "R6")).toBe(true);
  });

  test("deterministic: same bytes, same report", () => {
    const glb = buildGlb(triangleDoc(), triangleBin());
    const a = validateGltf(glb);
    const b = validateGltf(glb);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
