/**
 * Music Forge (§11.7) — deterministic chiptune soundtracks per game state.
 *
 * Composes REAL loopable music in pure TS (no external assets, no services):
 *   EXPLORE — calm minor progression, soft lead, sparse hats  (~85 BPM)
 *   COMBAT  — driving bass, arpeggio lead, kick/snare groove (~140 BPM)
 *   BOSS    — phrygian tension, tritone stabs, double kick   (~150 BPM)
 *
 * Every game gets a variation seeded by its slug (deterministic per project —
 * same project ⇒ same soundtrack, different projects ⇒ different music).
 * Output: PCM16 mono WAV @ 22050 Hz, exact bar multiples so loops wrap clean.
 */
import type { RGB } from "../assets/spriteForge";
void (0 as unknown as RGB); // keep type import shape stable if unused

const SR = 22050;

// ── WAV (same format as gd_pro SFX) ──────────────────────────────────────────

function wav(samples: Int16Array, sampleRate = SR): Uint8Array {
  const data = new Uint8Array(44 + samples.length * 2);
  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) data[off + i] = s.charCodeAt(i); };
  w(0, "RIFF");
  new DataView(data.buffer).setUint32(4, 36 + samples.length * 2, true);
  w(8, "WAVE"); w(12, "fmt ");
  new DataView(data.buffer).setUint32(16, 16, true);
  new DataView(data.buffer).setUint16(20, 1, true);   // PCM
  new DataView(data.buffer).setUint16(22, 1, true);   // mono
  new DataView(data.buffer).setUint32(24, sampleRate, true);
  new DataView(data.buffer).setUint32(28, sampleRate * 2, true);
  new DataView(data.buffer).setUint16(32, 2, true);
  new DataView(data.buffer).setUint16(34, 16, true);
  w(36, "data");
  new DataView(data.buffer).setUint32(40, samples.length * 2, true);
  const dv = new DataView(data.buffer);
  for (let i = 0; i < samples.length; i++) dv.setInt16(44 + i * 2, samples[i] ?? 0, true);
  return data;
}

// ── Seeded PRNG (deterministic per project) ──────────────────────────────────

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number): () => number {
  let s = seed || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// ── Music theory ─────────────────────────────────────────────────────────────

/** MIDI note → Hz. */
function hz(note: number): number { return 440 * Math.pow(2, (note - 69) / 12); }

const SCALES = {
  minorPent: [0, 3, 5, 7, 10],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
} as const;

/** Chord progressions per mood (semitone offsets from the song root). */
const PROGRESSIONS = {
  explore: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]],   // Am · F · C · G
  combat: [[0, 3, 7], [5, 8, 12], [3, 7, 10], [7, 10, 14]],      // Am · Dm · C · Em
  boss: [[0, 1, 7], [0, 3, 6], [1, 5, 8], [0, 6, 11]],          // phrygian + tritones
} as const;

// ── Synth voices ─────────────────────────────────────────────────────────────

interface Voice {
  wave: "square" | "tri" | "saw" | "noise";
  duty?: number;       // for square
  gain: number;        // 0..1
  attack: number;      // seconds
  release: number;     // seconds
}

function osc(voice: Voice, phase: number, rnd: () => number): number {
  const t = phase % 1;
  switch (voice.wave) {
    case "square": return t < (voice.duty ?? 0.5) ? 1 : -1;
    case "tri": return 4 * Math.abs(t - 0.5) - 1;
    case "saw": return 2 * t - 1;
    case "noise": return rnd() * 2 - 1;
  }
}

/** Adds one note into the mix buffer with AR envelope (click-free). */
function addNote(
  mix: Float32Array, voice: Voice, note: number, startS: number, durS: number,
  gainMul = 1, detune = 0, rnd: () => number = () => 0.5,
) {
  const start = Math.floor(startS * SR);
  const n = Math.floor(durS * SR);
  const f = hz(note) * (1 + detune);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= mix.length) break;
    const t = i / n;
    // attack + smooth (cosine) release — no clicks at note edges
    const env = Math.min(1, i / (voice.attack * SR)) * Math.min(1, (n - i) / (voice.release * SR));
    const g = Math.pow(env, 0.85);
    if (g <= 0) continue;
    phase += f / SR;
    mix[idx] = (mix[idx] ?? 0) + osc(voice, phase, rnd) * voice.gain * gainMul * g;
  }
}

// ── Drum voices ──────────────────────────────────────────────────────────────

function kick(mix: Float32Array, at: number, gain = 0.9) {
  const start = Math.floor(at * SR), n = Math.floor(0.12 * SR);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const idx = start + i;
    if (idx >= mix.length) break;
    const f = 120 * Math.exp(-i / (SR * 0.03)) + 42;
    phase += f / SR;
    mix[idx] = (mix[idx] ?? 0) + Math.sin(2 * Math.PI * phase) * gain * Math.exp(-i / (SR * 0.055));
  }
}
function snare(mix: Float32Array, at: number, rnd: () => number, gain = 0.5) {
  const start = Math.floor(at * SR), n = Math.floor(0.09 * SR);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const idx = start + i;
    if (idx >= mix.length) break;
    phase += 190 / SR;
    mix[idx] = (mix[idx] ?? 0) + (Math.sin(2 * Math.PI * phase) * 0.4 + (rnd() * 2 - 1)) * gain * Math.exp(-i / (SR * 0.025));
  }
}
function hat(mix: Float32Array, at: number, rnd: () => number, gain = 0.18, dur = 0.03) {
  const start = Math.floor(at * SR), n = Math.floor(dur * SR);
  for (let i = 0; i < n; i++) {
    const idx = start + i;
    if (idx >= mix.length) break;
    mix[idx] = (mix[idx] ?? 0) + (rnd() * 2 - 1) * gain * Math.exp(-i / (SR * dur * 0.7));
  }
}

// ── Composers ─────────────────────────────────────────────────────────────────

interface TrackSpec {
  bpm: number;
  bars: number;
  root: number;        // MIDI root (A2 = 45, D2 = 38…)
  progression: ReadonlyArray<readonly number[]>;
  scale: readonly number[];
  leadOctave: number;  // semitones added to lead register
  leadStyle: "melody" | "arp16" | "stabs";
  drums: "sparse" | "groove" | "double";
  leadGain: number;
  bassGain: number;
  padGain: number;
}

const SPECS: Record<"explore" | "combat" | "boss", TrackSpec> = {
  explore: {
    bpm: 85, bars: 8, root: 45, progression: PROGRESSIONS.explore, scale: SCALES.minorPent,
    leadOctave: 24, leadStyle: "melody", drums: "sparse",
    leadGain: 0.16, bassGain: 0.15, padGain: 0.05,
  },
  combat: {
    bpm: 140, bars: 8, root: 45, progression: PROGRESSIONS.combat, scale: SCALES.naturalMinor,
    leadOctave: 12, leadStyle: "arp16", drums: "groove",
    leadGain: 0.17, bassGain: 0.26, padGain: 0.08,
  },
  boss: {
    bpm: 150, bars: 8, root: 41, progression: PROGRESSIONS.boss, scale: SCALES.phrygian,
    leadOctave: 12, leadStyle: "stabs", drums: "double",
    leadGain: 0.18, bassGain: 0.28, padGain: 0.10,
  },
};

/** Renders one state track to a loopable WAV. Deterministic for (state, seed). */
export function forgeMusicTrack(state: "explore" | "combat" | "boss", seedStr: string): Uint8Array {
  const spec = SPECS[state]!;
  const r = rng(hashSeed(`${seedStr}:${state}`));
  const beat = 60 / spec.bpm;               // seconds per beat (4/4)
  const bar = beat * 4;
  const totalS = bar * spec.bars;
  const mix = new Float32Array(Math.ceil(totalS * SR));

  const LEAD: Voice = { wave: "square", duty: 0.25, gain: spec.leadGain, attack: 0.006, release: 0.05 };
  const BASS: Voice = { wave: "tri", gain: spec.bassGain, attack: 0.004, release: 0.04 };
  const PAD: Voice = { wave: "saw", gain: spec.padGain, attack: 0.25, release: 0.30 };

  for (let b = 0; b < spec.bars; b++) {
    const barAt = b * bar;
    const chord = spec.progression[b % spec.progression.length]!;

    // PAD: sustained chord (the harmonic bed)
    if (state !== "combat") {
      for (const semi of chord) {
        addNote(mix, PAD, spec.root + semi + 12, barAt, bar * 0.98, 1, 0, r);
      }
    } else {
      for (const semi of chord) {
        addNote(mix, PAD, spec.root + semi + 12, barAt, bar * 0.5, 1, 0, r);
      }
    }

    // BASS: style per state
    if (state === "explore") {
      // one rooted half-note pair per bar (calm)
      addNote(mix, BASS, spec.root + chord[0]! - 12, barAt, bar * 0.48);
      addNote(mix, BASS, spec.root + chord[0]! - 12, barAt + bar / 2, bar * 0.44);
    } else {
      // driving eighths: root/octave/fifth pulses
      for (let e = 0; e < 8; e++) {
        const off = [0, 12, 7, 12][e % 4]!;
        addNote(mix, BASS, spec.root + chord[0]! - 12 + (e % 2 === 1 ? off : 0), barAt + e * beat * 0.5, beat * 0.42);
      }
    }

    // LEAD: melody / arpeggio / stabs — seeded note choices from the scale
    if (spec.leadStyle === "melody") {
      // 4 notes/bar, walk the pentatonic with seeded steps and rests
      let deg = Math.floor(r() * spec.scale.length);
      for (let n = 0; n < 4; n++) {
        if (r() < 0.18) { deg = (deg + 2) % spec.scale.length; continue; } // rest
        deg = (deg + (r() < 0.5 ? 1 : -1) + spec.scale.length) % spec.scale.length;
        const note = spec.root + spec.scale[deg]! + spec.leadOctave + (r() < 0.3 ? 12 : 0);
        addNote(mix, LEAD, note, barAt + n * beat, beat * (r() < 0.4 ? 1.6 : 0.9));
      }
    } else if (spec.leadStyle === "arp16") {
      // 16th arpeggio over the chord (energy)
      for (let s = 0; s < 16; s++) {
        const semi = chord[s % chord.length]!;
        const oct = s % 8 < 4 ? 12 : 24;
        addNote(mix, LEAD, spec.root + semi + oct, barAt + s * beat * 0.25, beat * 0.22);
      }
    } else {
      // stabs: tritone-flavored accents on 1 and the "and of 3" (tension)
      const stab = chord[2]!;
      addNote(mix, LEAD, spec.root + stab + spec.leadOctave, barAt, beat * 0.35);
      addNote(mix, LEAD, spec.root + stab + 6 + spec.leadOctave, barAt + beat * 2.5, beat * 0.3);
      addNote(mix, LEAD, spec.root + chord[1]! + spec.leadOctave, barAt + beat * 3, beat * 0.3);
    }

    // DRUMS
    for (let bt = 0; bt < 4; bt++) {
      const at = barAt + bt * beat;
      if (spec.drums === "sparse") {
        if (bt === 0) kick(mix, at, 0.5);
        if (bt === 2) hat(mix, at, r, 0.12);
      } else if (spec.drums === "groove") {
        kick(mix, at, bt === 0 || bt === 2 ? 0.85 : 0.55);
        if (bt === 1 || bt === 3) snare(mix, at, r);
        hat(mix, at + beat * 0.5, r, 0.14);
      } else {
        kick(mix, at, 0.95); kick(mix, at + beat * 0.5, 0.8);     // double kick
        if (bt === 1 || bt === 3) snare(mix, at, r, 0.6);
        hat(mix, at + beat * 0.25, r, 0.15, 0.02);
        hat(mix, at + beat * 0.75, r, 0.15, 0.02);
      }
    }
  }

  // Mastering: normalize to a per-state TARGET RMS (perceived loudness — peak
  // normalization would pump the sparse explore track back up and flatten the
  // intended dynamics), then a hard peak guard + gentle tanh soft-clip.
  let energy = 0;
  for (let i = 0; i < mix.length; i++) energy += (mix[i] ?? 0) ** 2;
  const trackRms = Math.sqrt(energy / mix.length);
  const targetRms = state === "explore" ? 0.095 : state === "combat" ? 0.135 : 0.14;
  let norm = trackRms > 0 ? targetRms / trackRms : 1;
  let scaledPeak = 0;
  for (let i = 0; i < mix.length; i++) scaledPeak = Math.max(scaledPeak, Math.abs((mix[i] ?? 0) * norm));
  if (scaledPeak > 0.9) norm *= 0.9 / scaledPeak;
  const out = new Int16Array(mix.length);
  for (let i = 0; i < mix.length; i++) {
    const v = Math.tanh((mix[i] ?? 0) * norm * 1.06); // tanh = musical soft clip
    out[i] = Math.round(Math.max(-1, Math.min(1, v)) * 32767);
  }
  return wav(out);
}

/** Full soundtrack for a project: three state tracks, deterministic by seed. */
export function forgeSoundtrack(seed: string): Record<string, Uint8Array> {
  return {
    "audio/music_explore.wav": forgeMusicTrack("explore", seed),
    "audio/music_combat.wav": forgeMusicTrack("combat", seed),
    "audio/music_boss.wav": forgeMusicTrack("boss", seed),
  };
}
