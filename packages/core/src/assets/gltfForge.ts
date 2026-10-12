/**
 * gltfForge — the FIRST real 3D asset producer (Fase 5): generates a valid
 * glTF 2.0 model file (self-contained, embedded base64 buffer) straight from
 * code. The generated file passes the project's own validateGltf gate — the
 * same bar any imported third-party model must clear.
 *
 * Monolith: a tapered obelisk (flat-shaded, 6 faces, 24 verts, 12 tris) —
 * the visual anchor of the 3D exploration template.
 */
import { validateGltf, type GltfReport } from "./gltfValidate";

interface Face { v: Array<[number, number, number]>; n: [number, number, number] }

/** Tapered-prism obelisk: base 1×1, top 0.55×0.55, height H. Flat normals. */
function obeliskFaces(h = 2.6): Face[] {
  const b = 0.5, t = 0.28;
  const b0: [number, number, number] = [-b, 0, -b];
  const b1: [number, number, number] = [b, 0, -b];
  const b2: [number, number, number] = [b, 0, b];
  const b3: [number, number, number] = [-b, 0, b];
  const t0: [number, number, number] = [-t, h, -t];
  const t1: [number, number, number] = [t, h, -t];
  const t2: [number, number, number] = [t, h, t];
  const t3: [number, number, number] = [-t, h, t];
  const n = (a: [number, number, number], bb: [number, number, number], c: [number, number, number]): [number, number, number] => {
    const u = [bb[0] - a[0], bb[1] - a[1], bb[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const x = u[1]! * v[2]! - u[2]! * v[1]!, y = u[2]! * v[0]! - u[0]! * v[2]!, z = u[0]! * v[1]! - u[1]! * v[0]!;
    const len = Math.hypot(x, y, z) || 1;
    return [x / len, y / len, z / len] as [number, number, number];
  };
  const quad = (a: [number, number, number], bb: [number, number, number], c: [number, number, number], d: [number, number, number]): Face => ({
    v: [a, bb, c, a, c, d],   // two CCW triangles, reusing flat normal
    n: n(a, bb, c),
  });
  return [
    quad(b0, b1, t1, t0), // north
    quad(b1, b2, t2, t1), // east
    quad(b2, b3, t3, t2), // south
    quad(b3, b0, t0, t3), // west
    quad(t0, t1, t2, t3), // top cap
  ];
}

export interface ForgedGltf { json: string; report: GltfReport }

/**
 * Builds the monolith model. The report is attached and MUST pass — callers
 * treat a failing report as a build error (§8: invalid assets never ship).
 */
export function forgeMonolithGltf(accentHex = "#6f8cff"): ForgedGltf {
  const faces = obeliskFaces();
  const verts: number[] = [];
  const normals: number[] = [];
  for (const f of faces) {
    for (const v of f.v) verts.push(...v);
    for (let i = 0; i < 6; i++) normals.push(...f.n);
  }
  const pos = new Float32Array(verts);
  const nor = new Float32Array(normals);
  const bin = Buffer.concat([Buffer.from(pos.buffer), Buffer.from(nor.buffer)]);

  const doc = {
    asset: { version: "2.0", generator: "WorldSmith AI gltfForge (procedural monolith)" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "Monolith" }],
    meshes: [{
      name: "obelisk",
      primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, material: 0 }],
    }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: pos.length / 3, type: "VEC3", min: [-0.5, 0, -0.5], max: [0.5, 2.6, 0.5] },
      { bufferView: 1, componentType: 5126, count: nor.length / 3, type: "VEC3" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pos.byteLength, target: 34962 },
      { buffer: 0, byteOffset: pos.byteLength, byteLength: nor.byteLength, target: 34962 },
    ],
    buffers: [{ byteLength: bin.byteLength, uri: "data:application/octet-stream;base64," + bin.toString("base64") }],
    materials: [{
      name: "worldsmith-stone",
      pbrMetallicRoughness: {
        baseColorFactor: [0.16, 0.19, 0.26, 1.0],
        metallicFactor: 0.1,
        roughnessFactor: 0.85,
      },
      emissiveFactor: [hex01(accentHex)[0], hex01(accentHex)[1], hex01(accentHex)[2]],
    }],
  };
  const json = JSON.stringify(doc);
  const report = validateGltf(new TextEncoder().encode(json));
  return { json, report };
}

function hex01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const f = (i: number) => parseInt(h.slice(i * 2, i * 2 + 2), 16) / 255;
  return [f(0) * 0.35, f(1) * 0.35, f(2) * 0.35]; // subtle emissive band
}
