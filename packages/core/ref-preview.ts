import { homedir } from "node:os";
import { getProject } from "/home/llinux/nexus-forge/packages/core/src/orchestrator/store";
import { exportWeb } from "/home/llinux/nexus-forge/packages/core/src/engines/godotExport";
import { Godot4Adapter } from "/home/llinux/nexus-forge/packages/core/src/engines/godot";
const p = getProject(process.argv[2]!)!;
const det = await new Godot4Adapter().detect();
const r = await exportWeb(p.data_path, det.path!, homedir() + "/.worldsmith/previews/" + p.slug);
console.log("preview:", r.ok, "| files:", r.files.length, "| err:", (r.error || "").slice(0, 90));
