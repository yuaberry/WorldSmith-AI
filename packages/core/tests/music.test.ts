/**
 * Music Forge tests (§11.7) — the soundtrack is a REAL audio artifact:
 * valid PCM16 WAV, deterministic per project, energetic per state, loopable.
 */
import { describe, expect, test } from "bun:test";
import { forgeMusicTrack, forgeSoundtrack } from "../src/audio/musicForge";

function header(bytes: Uint8Array) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    riff: String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!),
    wave: String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!),
    audioBytes: dv.getUint32(40, true),
    sampleRate: dv.getUint32(24, true),
    channels: dv.getUint16(22, true),
    bits: dv.getUint16(34, true),
  };
}

function samples(bytes: Uint8Array): Int16Array {
  const n = new DataView(bytes.buffer, bytes.byteOffset).getUint32(40, true) / 2;
  const dv = new DataView(bytes.buffer, bytes.byteOffset + 44);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) out[i] = dv.getInt16(i * 2, true);
  return out;
}

function rms(s: Int16Array): number {
  let acc = 0;
  for (let i = 0; i < s.length; i++) acc += (s[i]! / 32768) ** 2;
  return Math.sqrt(acc / s.length);
}

describe("Music Forge (§11.7)", () => {
  test("three state tracks with valid PCM16 WAV structure", () => {
    for (const state of ["explore", "combat", "boss"] as const) {
      const wav = forgeMusicTrack(state, "test-project");
      const h = header(wav);
      expect(h.riff).toBe("RIFF");
      expect(h.wave).toBe("WAVE");
      expect(h.channels).toBe(1);
      expect(h.bits).toBe(16);
      expect(h.sampleRate).toBe(22050);
      expect(h.audioBytes).toBeGreaterThan(200_000); // real music, not blips
      expect(h.audioBytes % 2).toBe(0);
      expect(44 + h.audioBytes).toBe(wav.length);
    }
  });

  test("durations are musically correct (8 bars per state)", () => {
    const sr = 22050;
    // explore: 8 bars @ 85 BPM 4/4 = 8*4*(60/85) ≈ 22.6s
    const exploreS = samples(forgeMusicTrack("explore", "t")).length / sr;
    expect(exploreS).toBeGreaterThan(20);
    expect(exploreS).toBeLessThan(24);
    // combat: @ 140 BPM ≈ 13.7s
    const combatS = samples(forgeMusicTrack("combat", "t")).length / sr;
    expect(combatS).toBeGreaterThan(12);
    expect(combatS).toBeLessThan(15);
    // boss: @ 150 BPM ≈ 12.8s
    const bossS = samples(forgeMusicTrack("boss", "t")).length / sr;
    expect(bossS).toBeGreaterThan(11.5);
    expect(bossS).toBeLessThan(14);
  });

  test("deterministic per project; varied across projects", () => {
    const a1 = forgeMusicTrack("combat", "hollow-echoes");
    const a2 = forgeMusicTrack("combat", "hollow-echoes");
    const b = forgeMusicTrack("combat", "aetherdrift");
    expect(Buffer.compare(Buffer.from(a1), Buffer.from(a2))).toBe(0);
    expect(Buffer.compare(Buffer.from(a1), Buffer.from(b))).not.toBe(0);
  });

  test("states have the right energy: combat/boss > explore", () => {
    const e = rms(samples(forgeMusicTrack("explore", "t")));
    const c = rms(samples(forgeMusicTrack("combat", "t")));
    const b = rms(samples(forgeMusicTrack("boss", "t")));
    expect(e).toBeGreaterThan(0.02); // audible, not silence
    expect(e).toBeLessThan(c);      // explore is the calm bed
    expect(e).toBeLessThan(b);      // boss is in your face
  });

  test("loop boundary is seam-safe (fades out, no clip, real onset)", () => {
    for (const state of ["explore", "combat", "boss"] as const) {
      const s = samples(forgeMusicTrack(state, "loop"));
      const tail = s.subarray(s.length - 100)!;
      const head = s.subarray(0, 100)!;
      // the bar-line seam: tail fades toward silence (no pop at the wrap)…
      expect(rms(tail)).toBeLessThan(0.05);
      expect(Math.abs(s[s.length - 1]! / 32768)).toBeLessThan(0.85); // no full-scale pop
      // …and the loop opens with a real musical onset (downbeat), not silence
      expect(rms(head)).toBeGreaterThan(0.01);
    }
  });

  test("forgeSoundtrack returns the three canonical game paths", () => {
    const st = forgeSoundtrack("proj");
    expect(Object.keys(st).sort()).toEqual([
      "audio/music_boss.wav",
      "audio/music_combat.wav",
      "audio/music_explore.wav",
    ]);
    for (const bytes of Object.values(st)) {
      expect(header(bytes).wave).toBe("WAVE");
    }
  });
});
