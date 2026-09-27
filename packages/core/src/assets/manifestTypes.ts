/** Shared asset-manifest types (§12). */
export interface AssetManifestEntry {
  id: string;
  name: string;
  type: "sprite" | "tile" | "material" | "portrait" | "logo" | "backdrop" | "audio";
  source: "procedural" | "ai";
  generator: string;
  prompt?: string;
  styleProfile: string;
  dims: string;
  usage: string;
  version: number;
  canonicalOf?: string;
  qa?: { checked: boolean; pass?: boolean; issues?: string[]; reason?: string };
}

export interface ValidationReport {
  pass: boolean;
  issues: string[];
  warnings: string[];
  checked: number;
}
