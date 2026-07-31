import { NotePitch, NoteDuration } from './types';
export type { NotePitch, NoteDuration };

export interface KeyInfo {
  name: string;
  fifths: number;
  isMinor: boolean;
  tonicStep: NotePitch['step'];
  tonicAlter: number;
  tonicMidi: number;
  scaleSteps: NotePitch['step'][];
  scaleAlters: number[];
}

export const KEYS_MAP: Record<string, KeyInfo> = {
  'C': {
    name: 'C Major',
    fifths: 0,
    isMinor: false,
    tonicStep: 'C',
    tonicAlter: 0,
    tonicMidi: 60,
    scaleSteps: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    scaleAlters: [0, 0, 0, 0, 0, 0, 0]
  },
  'Am': {
    name: 'A Minor',
    fifths: 0,
    isMinor: true,
    tonicStep: 'A',
    tonicAlter: 0,
    tonicMidi: 57,
    scaleSteps: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    scaleAlters: [0, 0, 0, 0, 0, 0, 1] // G# for leading tone
  },
  'G': {
    name: 'G Major',
    fifths: 1,
    isMinor: false,
    tonicStep: 'G',
    tonicAlter: 0,
    tonicMidi: 55,
    scaleSteps: ['G', 'A', 'B', 'C', 'D', 'E', 'F'],
    scaleAlters: [0, 0, 0, 0, 0, 0, 1] // F#
  },
  'Em': {
    name: 'E Minor',
    fifths: 1,
    isMinor: true,
    tonicStep: 'E',
    tonicAlter: 0,
    tonicMidi: 52,
    scaleSteps: ['E', 'F', 'G', 'A', 'B', 'C', 'D'],
    scaleAlters: [0, 1, 0, 0, 0, 0, 1] // F#, D# leading tone
  },
  'F': {
    name: 'F Major',
    fifths: -1,
    isMinor: false,
    tonicStep: 'F',
    tonicAlter: 0,
    tonicMidi: 53,
    scaleSteps: ['F', 'G', 'A', 'B', 'C', 'D', 'E'],
    scaleAlters: [0, 0, 0, -1, 0, 0, 0] // Bb
  },
  'Dm': {
    name: 'D Minor',
    fifths: -1,
    isMinor: true,
    tonicStep: 'D',
    tonicAlter: 0,
    tonicMidi: 50,
    scaleSteps: ['D', 'E', 'F', 'G', 'A', 'B', 'C'],
    scaleAlters: [0, 0, 0, 0, 0, -1, 1] // Bb, C# leading tone
  }
};

const STEP_MIDI_OFFSET: Record<NotePitch['step'], number> = {
  'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
};

export function midiToPitch(midi: number, preferredKeyKey: string = 'C'): NotePitch {
  const octave = Math.floor(midi / 12) - 1;
  const pc = midi % 12;

  const keyInfo = KEYS_MAP[preferredKeyKey] || KEYS_MAP['C'];

  for (let i = 0; i < keyInfo.scaleSteps.length; i++) {
    const step = keyInfo.scaleSteps[i];
    const alter = keyInfo.scaleAlters[i];
    const stepPc = (STEP_MIDI_OFFSET[step] + alter + 12) % 12;
    if (stepPc === pc) {
      return { step, alter: alter !== 0 ? alter : undefined, octave, midi };
    }
  }

  const stepMap: { step: NotePitch['step']; alter?: number }[] = [
    { step: 'C' }, { step: 'C', alter: 1 }, { step: 'D' }, { step: 'D', alter: 1 },
    { step: 'E' }, { step: 'F' }, { step: 'F', alter: 1 }, { step: 'G' },
    { step: 'G', alter: 1 }, { step: 'A' }, { step: 'A', alter: 1 }, { step: 'B' }
  ];
  const info = stepMap[pc];
  return { step: info.step, alter: info.alter, octave, midi };
}

export function pitchToMidi(pitch: NotePitch): number {
  return (pitch.octave + 1) * 12 + STEP_MIDI_OFFSET[pitch.step] + (pitch.alter || 0);
}

export function getDurationQuarterValue(duration: NoteDuration): number {
  switch (duration) {
    case 'whole': return 4.0;
    case 'dotted-half': return 3.0;
    case 'half': return 2.0;
    case 'dotted-quarter': return 1.5;
    case 'quarter': return 1.0;
    case 'eighth': return 0.5;
    case 'sixteenth': return 0.25;
  }
}

export function getDiatonicScalePitches(keyKey: string, octaves: number[] = [3, 4, 5]): NotePitch[] {
  const keyInfo = KEYS_MAP[keyKey] || KEYS_MAP['C'];
  const pitches: NotePitch[] = [];

  for (const oct of octaves) {
    for (let i = 0; i < keyInfo.scaleSteps.length; i++) {
      const step = keyInfo.scaleSteps[i];
      const alter = keyInfo.scaleAlters[i];
      const midi = (oct + 1) * 12 + STEP_MIDI_OFFSET[step] + alter;
      pitches.push({ step, alter: alter !== 0 ? alter : undefined, octave: oct, midi });
    }
  }
  return pitches.sort((a, b) => a.midi - b.midi);
}

export function stepOffsetToPitch(basePitch: NotePitch, stepOffset: number, keyKey: string): NotePitch {
  const diatonicPitches = getDiatonicScalePitches(keyKey, [1, 2, 3, 4, 5, 6]);
  let baseIndex = diatonicPitches.findIndex(p => p.midi === basePitch.midi);
  if (baseIndex === -1) {
    baseIndex = diatonicPitches.findIndex(p => p.step === basePitch.step && p.octave === basePitch.octave);
  }
  if (baseIndex === -1) {
    baseIndex = 14; // Fallback C4
  }
  const targetIndex = Math.max(0, Math.min(diatonicPitches.length - 1, baseIndex + stepOffset));
  return diatonicPitches[targetIndex];
}
