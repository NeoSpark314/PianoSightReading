import { ArticulationType, NoteData, NoteDuration, NotePitch, TimeSignature } from './types';

// 12 divisions per quarter note: cleanly divisible by 2, 3, 4, and 6
export const DIVISIONS_PER_QUARTER = 12;

export interface DurationSpec {
  quarterBeats: number;
  divisions: number;
  xmlType: 'whole' | 'half' | 'quarter' | 'eighth' | '16th';
  hasDot: boolean;
}

export const DURATION_SPECS: Record<NoteDuration, DurationSpec> = {
  whole: { quarterBeats: 4.0, divisions: 48, xmlType: 'whole', hasDot: false },
  'dotted-half': { quarterBeats: 3.0, divisions: 36, xmlType: 'half', hasDot: true },
  half: { quarterBeats: 2.0, divisions: 24, xmlType: 'half', hasDot: false },
  'dotted-quarter': { quarterBeats: 1.5, divisions: 18, xmlType: 'quarter', hasDot: true },
  quarter: { quarterBeats: 1.0, divisions: 12, xmlType: 'quarter', hasDot: false },
  'dotted-eighth': { quarterBeats: 0.75, divisions: 9, xmlType: 'eighth', hasDot: true },
  eighth: { quarterBeats: 0.5, divisions: 6, xmlType: 'eighth', hasDot: false },
  sixteenth: { quarterBeats: 0.25, divisions: 3, xmlType: '16th', hasDot: false }
};

export function getExpectedMeasureQuarterBeats(timeSignature: TimeSignature): number {
  return timeSignature.beats * (4 / timeSignature.beatType);
}

export function sumQuarterBeats(notes: NoteData[]): number {
  return notes.reduce((sum, n) => sum + DURATION_SPECS[n.duration].quarterBeats, 0);
}

export function assertMeasureDuration(
  notes: NoteData[],
  timeSignature: TimeSignature,
  context: string
): void {
  const expected = getExpectedMeasureQuarterBeats(timeSignature);
  const actual = sumQuarterBeats(notes);
  if (Math.abs(actual - expected) > 1e-6) {
    throw new Error(
      `Invalid measure duration in ${context}: expected ${expected} quarter beats (${timeSignature.name}), got ${actual}`
    );
  }
}

export function makeNote(
  pitch: NotePitch,
  duration: NoteDuration,
  opts?: {
    tie?: NoteData['tie'];
    slurStart?: boolean;
    slurStop?: boolean;
    articulations?: ArticulationType[];
  }
): NoteData {
  return {
    pitch,
    duration,
    durationInQuarterNotes: DURATION_SPECS[duration].quarterBeats,
    ...opts
  };
}

export function makeChord(
  pitches: NotePitch[],
  duration: NoteDuration,
  opts?: {
    tie?: NoteData['tie'];
    slurStart?: boolean;
    slurStop?: boolean;
    articulations?: ArticulationType[];
  }
): NoteData {
  // Deduplicate by MIDI and sort ascending (lowest to highest)
  const uniqueMap = new Map<number, NotePitch>();
  for (const p of pitches) {
    if (!uniqueMap.has(p.midi)) {
      uniqueMap.set(p.midi, p);
    }
  }
  const sorted = Array.from(uniqueMap.values()).sort((a, b) => a.midi - b.midi);

  if (sorted.length === 1) {
    return makeNote(sorted[0], duration, opts);
  }

  return {
    pitch: sorted[sorted.length - 1], // Top voice for convenient melodic tracking
    pitches: sorted,
    duration,
    durationInQuarterNotes: DURATION_SPECS[duration].quarterBeats,
    ...opts
  };
}

export function makeRest(duration: NoteDuration): NoteData {
  return {
    isRest: true,
    duration,
    durationInQuarterNotes: DURATION_SPECS[duration].quarterBeats
  };
}

export function getFullMeasureDuration(timeSignature: TimeSignature): NoteDuration {
  const qb = getExpectedMeasureQuarterBeats(timeSignature);
  if (Math.abs(qb - 4.0) < 1e-6) return 'whole';
  if (Math.abs(qb - 3.0) < 1e-6) return 'dotted-half';
  if (Math.abs(qb - 2.0) < 1e-6) return 'half';
  return 'whole';
}
