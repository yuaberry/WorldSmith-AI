/**
 * Support assets (§16) — dialogue portraits, ability icons, key prompts and
 * title art, all painted from the SAME Art Bible identities and palette.
 * Support assets share the project's visual identity by construction.
 */
import { Px, encodePNG, type ForgePalette } from "./spriteForgeHelpers";
import type { ArtBible } from "./artBible";

function hex(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
const sh = (c: [number, number, number], f: number) => [Math.min(255, Math.round(c[0] * f)), Math.min(255, Math.round(c[1] * f)), Math.min(255, Math.round(c[2] * f))] as [number, number, number];

/** Dialogue portrait (§16) — closeup of a canonical identity, 24×24. */
export function paintPortrait(bible: ArtBible, who: "protagonist" | "enemy" | "boss" | "npc"): Uint8Array {
  const id = bible.identities[who];
  const size = 24;
  const p = new Px(size, size);
  const bgc = sh(hex(bible.palette.bg), 1.4);
  p.rect(0, 0, size, size, bgc);
  const main = hex(id.colors.main);
  const skin = hex(id.colors.skin ?? "#e8bea0");
  const eye = hex(id.colors.eye ?? "#fbbf24");
  // hood/crown volume
  p.rect(4, 3, 16, 8, main);
  p.rect(5, 4, 14, 6, sh(main, 1.15));
  // face
  p.rect(7, 7, 10, 8, skin);
  if (who === "npc" || who === "boss") p.rect(7, 7, 10, 3, sh(main, 0.8)); // hood shadow
  if (who === "enemy") p.rect(7, 7, 10, 10, sh(hex(bible.palette.danger), 1.05));
  // eyes (canonical)
  p.set(9, 10, eye); p.set(14, 10, eye);
  if (who === "boss") { p.set(8, 9, eye); p.set(15, 9, eye); }
  // robe shoulders
  p.rect(3, 16, 18, 8, main);
  p.rect(3, 16, 18, 1, sh(main, 1.25));
  // frame border (ui language)
  const ui = hex(bible.ui.panelColor);
  for (let x = 0; x < size; x++) { p.set(x, 0, sh(ui, 1.5)); p.set(x, size - 1, sh(ui, 1.5)); }
  for (let y = 0; y < size; y++) { p.set(0, y, sh(ui, 1.5)); p.set(size - 1, y, sh(ui, 1.5)); }
  return encodePNG(size, size, p.data);
}

/** Ability icon — 12×12, identity-consistent accent art. */
export function paintAbilityIcon(bible: ArtBible, ability: "dash" | "parry" | "relic"): Uint8Array {
  const size = 12;
  const p = new Px(size, size);
  const accent = hex(bible.palette.accent);
  const hi = hex(bible.palette.highlight);
  p.rect(0, 0, size, size, sh(hex(bible.palette.bg), 1.5));
  const draw = (cells: Array<[number, number]>, c: [number, number, number]) => cells.forEach(([x, y]) => p.set(x, y, c));
  if (ability === "dash") {
    draw([[2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 5], [9, 4], [3, 5], [3, 7]], accent);
    draw([[9, 3], [10, 2]], hi);
  } else if (ability === "parry") {
    draw([[6, 2], [6, 3], [6, 4], [5, 5], [6, 5], [7, 5], [4, 6], [8, 6], [3, 7], [9, 7]], hi);
    draw([[6, 6], [6, 7], [6, 8], [5, 9], [7, 9]], accent);
  } else {
    draw([[6, 2], [5, 3], [7, 3], [4, 4], [6, 4], [8, 4], [3, 5], [5, 5], [7, 5], [9, 5], [4, 6], [6, 6], [8, 6], [5, 7], [7, 7], [6, 8]], accent);
    p.set(6, 5, hi);
  }
  return encodePNG(size, size, p.data);
}

/** Key prompt chip (§16) — keyboard hint rendered in bible UI colors. */
export function paintKeyPrompt(bible: ArtBible, key: string): Uint8Array {
  const w = Math.max(12, 10 + key.length * 5), h = 14;
  const p = new Px(w, h);
  const panel = hex(bible.ui.panelColor);
  const fg = hex(bible.palette.fg);
  p.rect(0, 0, w, h, panel);
  for (let x = 0; x < w; x++) { p.set(x, 0, sh(panel, 1.8)); p.set(x, h - 1, sh(panel, 0.7)); }
  for (let y = 0; y < h; y++) { p.set(0, y, sh(panel, 1.8)); p.set(w - 1, y, sh(panel, 0.7)); }
  // render the glyph with a 3×5 micro font
  const FONT: Record<string, Array<[number, number]>> = {
    E: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 2], [0, 3], [0, 4], [1, 4], [2, 4]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
    A: [[0, 1], [1, 0], [2, 1], [0, 2], [1, 2], [2, 2], [0, 3], [2, 3], [0, 4], [2, 4]],
    B: [[0, 0], [1, 0], [0, 1], [2, 1], [0, 2], [1, 2], [0, 3], [2, 3], [0, 4], [1, 4], [2, 4]],
    C: [[1, 0], [2, 0], [0, 1], [0, 2], [0, 3], [1, 4], [2, 4]],
    D: [[0, 0], [1, 0], [0, 1], [2, 1], [0, 2], [2, 2], [0, 3], [2, 3], [0, 4], [1, 4]],
    J: [[2, 0], [2, 1], [2, 2], [0, 3], [2, 3], [1, 4], [2, 4]],
    K: [[0, 0], [1, 0], [0, 1], [2, 1], [0, 2], [1, 2], [0, 3], [2, 3], [0, 4], [2, 4]],
    L: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 4], [2, 4]],
    P: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [0, 3], [0, 4]],
    R: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [1, 3], [2, 4]],
    W: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2], [1, 3]],
    Y: [[0, 0], [2, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
  };
  let ox = 4;
  for (const ch of key.toUpperCase()) {
    const glyph = FONT[ch];
    if (glyph) glyph.forEach(([gx, gy]) => p.set(ox + gx, 5 + gy - 2, fg));
    ox += 5;
  }
  return encodePNG(w, h, p.data);
}

/** Title logo (§16) — shield-diamond with palette identity, 64×64. */
export function paintLogo(bible: ArtBible, title: string): Uint8Array {
  const size = 64;
  const p = new Px(size, size);
  const bg = hex(bible.palette.bg);
  const accent = hex(bible.palette.accent);
  const hi = hex(bible.palette.highlight);
  p.rect(0, 0, size, size, bg);
  // diamond
  const c = 32, r = 22;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (Math.abs(x) + Math.abs(y) <= r) p.set(c + x, c + y, sh(bg, 1.6));
    }
  }
  for (let y = -r; y <= r; y++) {
    if (Math.abs(y) + r <= r + 1) p.set(c - (r - Math.abs(y)), c + y, accent);
    p.set(c + (r - Math.abs(y)), c + y, accent);
  }
  // hammer-sword sigil
  for (let i = -10; i <= 10; i++) p.set(c + i, c, hi);
  for (let i = -6; i <= 6; i++) p.set(c, c + i, sh(hi, 0.9));
  p.set(c, c - 12, hi); p.set(c - 3, c - 9, accent); p.set(c + 3, c - 9, accent);
  void title;
  return encodePNG(size, size, p.data);
}

/** Builds the support-asset bundle for a project. */
export function forgeSupportAssets(bible: ArtBible): Record<string, Uint8Array> {
  const pal: ForgePalette = { accent: bible.palette.accent, bg: bible.palette.bg };
  void pal;
  return {
    "assets/portraits/protagonist.png": paintPortrait(bible, "protagonist"),
    "assets/portraits/enemy.png": paintPortrait(bible, "enemy"),
    "assets/portraits/boss.png": paintPortrait(bible, "boss"),
    "assets/portraits/npc.png": paintPortrait(bible, "npc"),
    "assets/icons/ability_dash.png": paintAbilityIcon(bible, "dash"),
    "assets/icons/ability_parry.png": paintAbilityIcon(bible, "parry"),
    "assets/icons/ability_relic.png": paintAbilityIcon(bible, "relic"),
    "assets/ui/key_e.png": paintKeyPrompt(bible, "E"),
    "assets/ui/key_j.png": paintKeyPrompt(bible, "J"),
    "assets/ui/key_k.png": paintKeyPrompt(bible, "K"),
    "assets/ui/key_tab.png": paintKeyPrompt(bible, "TAB"),
    "assets/ui/logo.png": paintLogo(bible, "title"),
  };
}
