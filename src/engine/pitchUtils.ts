import { DifficultyLevel, NoteDuration, NotePitch, ResolvedKeyCenter } from './types';
export type { NotePitch, NoteDuration };

export type ScaleMode = 'natural' | 'harmonic' | 'melodic';

export interface KeyInfo {
  key: ResolvedKeyCenter;
  name: string;
  fifths: number;
  isMinor: boolean;
  tonicStep: NotePitch['step'];
  tonicAlter: number;
  tonicMidi: number;
  scaleSteps: NotePitch['step'][];
  scaleAlters: number[]; // Natural scale alterations (matches key signature)
  harmonicAlters: number[]; // Minor: raised 7th; Major: same as natural
  melodicAlters: number[]; // Minor: raised 6th & 7th; Major: same as natural
}

function makeKey(
  key: ResolvedKeyCenter,
  name: string,
  fifths: number,
  isMinor: boolean,
  tonicMidi: number,
  scaleSteps: NotePitch['step'][],
  scaleAlters: number[]
): KeyInfo {
  const harmonicAlters = [...scaleAlters];
  const melodicAlters = [...scaleAlters];
  if (isMinor) {
    harmonicAlters[6] = scaleAlters[6] + 1;
    melodicAlters[5] = scaleAlters[5] + 1;
    melodicAlters[6] = scaleAlters[6] + 1;
  }
  return {
    key,
    name,
    fifths,
    isMinor,
    tonicStep: scaleSteps[0],
    tonicAlter: scaleAlters[0],
    tonicMidi,
    scaleSteps,
    scaleAlters,
    harmonicAlters,
    melodicAlters
  };
}

export const KEYS_MAP: Record<ResolvedKeyCenter, KeyInfo> = {
  C: makeKey('C', 'C Major', 0, false, 60, ['C', 'D', 'E', 'F', 'G', 'A', 'B'], [0, 0, 0, 0, 0, 0, 0]),
  Am: makeKey('Am', 'A Minor', 0, true, 57, ['A', 'B', 'C', 'D', 'E', 'F', 'G'], [0, 0, 0, 0, 0, 0, 0]),
  G: makeKey('G', 'G Major', 1, false, 55, ['G', 'A', 'B', 'C', 'D', 'E', 'F'], [0, 0, 0, 0, 0, 0, 1]),
  Em: makeKey('Em', 'E Minor', 1, true, 52, ['E', 'F', 'G', 'A', 'B', 'C', 'D'], [0, 1, 0, 0, 0, 0, 0]),
  F: makeKey('F', 'F Major', -1, false, 53, ['F', 'G', 'A', 'B', 'C', 'D', 'E'], [0, 0, 0, -1, 0, 0, 0]),
  Dm: makeKey('Dm', 'D Minor', -1, true, 50, ['D', 'E', 'F', 'G', 'A', 'B', 'C'], [0, 0, 0, 0, 0, -1, 0]),
  D: makeKey('D', 'D Major', 2, false, 62, ['D', 'E', 'F', 'G', 'A', 'B', 'C'], [0, 0, 1, 0, 0, 0, 1]),
  Bm: makeKey('Bm', 'B Minor', 2, true, 59, ['B', 'C', 'D', 'E', 'F', 'G', 'A'], [0, 1, 0, 0, 1, 0, 0]),
  Bb: makeKey('Bb', 'B♭ Major', -2, false, 58, ['B', 'C', 'D', 'E', 'F', 'G', 'A'], [-1, 0, 0, -1, 0, 0, 0]),
  Gm: makeKey('Gm', 'G Minor', -2, true, 55, ['G', 'A', 'B', 'C', 'D', 'E', 'F'], [0, 0, -1, 0, 0, -1, 0]),
  A: makeKey('A', 'A Major', 3, false, 57, ['A', 'B', 'C', 'D', 'E', 'F', 'G'], [0, 0, 1, 0, 0, 1, 1]),
  'F#m': makeKey('F#m', 'F♯ Minor', 3, true, 54, ['F', 'G', 'A', 'B', 'C', 'D', 'E'], [1, 1, 0, 0, 1, 0, 0]),
  Eb: makeKey('Eb', 'E♭ Major', -3, false, 63, ['E', 'F', 'G', 'A', 'B', 'C', 'D'], [-1, 0, 0, -1, -1, 0, 0]),
  Cm: makeKey('Cm', 'C Minor', -3, true, 60, ['C', 'D', 'E', 'F', 'G', 'A', 'B'], [0, 0, -1, 0, 0, -1, -1])
};

export const KEYS_BY_DIFFICULTY: Record<DifficultyLevel, ResolvedKeyCenter[]> = {
  1: ['C', 'Am', 'G', 'Em', 'F', 'Dm'],
  2: ['C', 'Am', 'G', 'Em', 'F', 'Dm', 'D', 'Bm', 'Bb', 'Gm'],
  3: ['C', 'Am', 'G', 'Em', 'F', 'Dm', 'D', 'Bm', 'Bb', 'Gm', 'A', 'F#m', 'Eb', 'Cm']
};

export const STEP_MIDI_OFFSET: Record<NotePitch['step'], number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
};

export function getKeyInfo(keyKey: string): KeyInfo {
  return KEYS_MAP[keyKey as ResolvedKeyCenter] || KEYS_MAP.C;
}

export function pitchToMidi(pitch: Pick<NotePitch, 'step' | 'alter' | 'octave'>): number {
  return (pitch.octave + 1) * 12 + STEP_MIDI_OFFSET[pitch.step] + (pitch.alter || 0);
}

export function createPitch(step: NotePitch['step'], alter: number, octave: number): NotePitch {
  const cleanAlter = alter !== 0 ? alter : undefined;
  return {
    step,
    alter: cleanAlter,
    octave,
    midi: pitchToMidi({ step, alter: cleanAlter, octave })
  };
}

export function midiToPitch(
  midi: number,
  preferredKeyKey: string = 'C',
  preferFlatsOverride?: boolean
): NotePitch {
  const pc = ((midi % 12) + 12) % 12;
  const keyInfo = getKeyInfo(preferredKeyKey);

  // 1. Check natural scale degrees first
  for (let i = 0; i < keyInfo.scaleSteps.length; i++) {
    const step = keyInfo.scaleSteps[i];
    const alter = keyInfo.scaleAlters[i];
    const stepPc = (STEP_MIDI_OFFSET[step] + alter + 12) % 12;
    if (stepPc === pc) {
      const octave = Math.round((midi - STEP_MIDI_OFFSET[step] - alter) / 12) - 1;
      return createPitch(step, alter, octave);
    }
  }

  // 2. Check harmonic minor raised leading tone if minor
  if (keyInfo.isMinor) {
    const step = keyInfo.scaleSteps[6];
    const alter = keyInfo.harmonicAlters[6];
    const stepPc = (STEP_MIDI_OFFSET[step] + alter + 12) % 12;
    if (stepPc === pc) {
      const octave = Math.round((midi - STEP_MIDI_OFFSET[step] - alter) / 12) - 1;
      return createPitch(step, alter, octave);
    }
  }

  // 3. Chromatic fallback spelled according to key signature direction
  const useFlats = preferFlatsOverride !== undefined ? preferFlatsOverride : keyInfo.fifths < 0;
  const sharpMap: { step: NotePitch['step']; alter: number }[] = [
    { step: 'C', alter: 0 },
    { step: 'C', alter: 1 },
    { step: 'D', alter: 0 },
    { step: 'D', alter: 1 },
    { step: 'E', alter: 0 },
    { step: 'F', alter: 0 },
    { step: 'F', alter: 1 },
    { step: 'G', alter: 0 },
    { step: 'G', alter: 1 },
    { step: 'A', alter: 0 },
    { step: 'A', alter: 1 },
    { step: 'B', alter: 0 }
  ];
  const flatMap: { step: NotePitch['step']; alter: number }[] = [
    { step: 'C', alter: 0 },
    { step: 'D', alter: -1 },
    { step: 'D', alter: 0 },
    { step: 'E', alter: -1 },
    { step: 'E', alter: 0 },
    { step: 'F', alter: 0 },
    { step: 'G', alter: -1 },
    { step: 'G', alter: 0 },
    { step: 'A', alter: -1 },
    { step: 'A', alter: 0 },
    { step: 'B', alter: -1 },
    { step: 'B', alter: 0 }
  ];

  const chosen = (useFlats ? flatMap : sharpMap)[pc];
  const octave = Math.round((midi - STEP_MIDI_OFFSET[chosen.step] - chosen.alter) / 12) - 1;
  return createPitch(chosen.step, chosen.alter, octave);
}

export function getDurationQuarterValue(duration: NoteDuration): number {
  switch (duration) {
    case 'whole':
      return 4.0;
    case 'dotted-half':
      return 3.0;
    case 'half':
      return 2.0;
    case 'dotted-quarter':
      return 1.5;
    case 'quarter':
      return 1.0;
    case 'dotted-eighth':
      return 0.75;
    case 'eighth':
      return 0.5;
    case 'sixteenth':
      return 0.25;
  }
}

export function getDiatonicScalePitches(
  keyKey: string,
  octaves: number[] = [3, 4, 5],
  mode: ScaleMode = 'natural'
): NotePitch[] {
  const keyInfo = getKeyInfo(keyKey);
  const alters =
    mode === 'harmonic'
      ? keyInfo.harmonicAlters
      : mode === 'melodic'
        ? keyInfo.melodicAlters
        : keyInfo.scaleAlters;

  const pitches: NotePitch[] = [];
  for (const oct of octaves) {
    for (let i = 0; i < keyInfo.scaleSteps.length; i++) {
      const step = keyInfo.scaleSteps[i];
      const alter = alters[i];
      pitches.push(createPitch(step, alter, oct));
    }
  }
  return pitches.sort((a, b) => a.midi - b.midi);
}

export function stepOffsetToPitch(
  basePitch: NotePitch,
  stepOffset: number,
  keyKey: string,
  mode: ScaleMode = 'natural'
): NotePitch {
  const diatonicPitches = getDiatonicScalePitches(keyKey, [1, 2, 3, 4, 5, 6, 7], mode);
  let baseIndex = diatonicPitches.findIndex(p => p.midi === basePitch.midi);
  if (baseIndex === -1) {
    // Find nearest pitch in scale
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < diatonicPitches.length; i++) {
      const diff = Math.abs(diatonicPitches[i].midi - basePitch.midi);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    baseIndex = bestIdx;
  }
  const targetIndex = Math.max(0, Math.min(diatonicPitches.length - 1, baseIndex + stepOffset));
  return diatonicPitches[targetIndex];
}

export function getScaleDegreePitch(
  keyKey: string,
  degree1to7: number,
  targetOctave: number,
  mode: ScaleMode = 'natural'
): NotePitch {
  const keyInfo = getKeyInfo(keyKey);
  const idx = ((degree1to7 - 1) % 7 + 7) % 7;
  const alters =
    mode === 'harmonic'
      ? keyInfo.harmonicAlters
      : mode === 'melodic'
        ? keyInfo.melodicAlters
        : keyInfo.scaleAlters;
  const step = keyInfo.scaleSteps[idx];
  const alter = alters[idx];
  const tonicMidi = createPitch(keyInfo.scaleSteps[0], keyInfo.scaleAlters[0], targetOctave).midi;
  let pitch = createPitch(step, alter, targetOctave);
  if (pitch.midi < tonicMidi) {
    pitch = createPitch(step, alter, targetOctave + 1);
  }
  return pitch;
}

export function getChordTonesInRange(
  chordPitches: NotePitch[],
  minMidi: number,
  maxMidi: number
): NotePitch[] {
  const results: NotePitch[] = [];
  const seen = new Set<number>();

  for (const cp of chordPitches) {
    for (let oct = 1; oct <= 7; oct++) {
      const candidate = createPitch(cp.step, cp.alter || 0, oct);
      if (candidate.midi >= minMidi && candidate.midi <= maxMidi && !seen.has(candidate.midi)) {
        seen.add(candidate.midi);
        results.push(candidate);
      }
    }
  }
  return results.sort((a, b) => a.midi - b.midi);
}

export function getClosestChordTone(
  targetMidi: number,
  chordPitches: NotePitch[],
  minMidi: number,
  maxMidi: number
): NotePitch {
  const candidates = getChordTonesInRange(chordPitches, minMidi, maxMidi);
  if (candidates.length === 0) {
    return chordPitches[0];
  }
  let best = candidates[0];
  let bestDist = Math.abs(best.midi - targetMidi);
  for (const c of candidates) {
    const dist = Math.abs(c.midi - targetMidi);
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

export function clampPitchToRange(
  pitch: NotePitch,
  minMidi: number,
  maxMidi: number
): NotePitch {
  let current = pitch;
  while (current.midi < minMidi) {
    current = createPitch(current.step, current.alter || 0, current.octave + 1);
  }
  while (current.midi > maxMidi) {
    current = createPitch(current.step, current.alter || 0, current.octave - 1);
  }
  return current;
}
