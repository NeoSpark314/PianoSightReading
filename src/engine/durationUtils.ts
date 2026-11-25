import { NoteData, NoteDuration, TimeSignature } from './types';

export const DIVISIONS_PER_QUARTER = 4;

export interface DurationSpec {
  quarterBeats: number;
  divisions: number;
  xmlType: 'whole' | 'half' | 'quarter' | 'eighth' | '16th';
  hasDot: boolean;
}

export const DURATION_SPECS: Record<NoteDuration, DurationSpec> = {
  whole: { quarterBeats: 4.0, divisions: 16, xmlType: 'whole', hasDot: false },
  'dotted-half': { quarterBeats: 3.0, divisions: 12, xmlType: 'half', hasDot: true },
  half: { quarterBeats: 2.0, divisions: 8, xmlType: 'half', hasDot: false },
  'dotted-quarter': { quarterBeats: 1.5, divisions: 6, xmlType: 'quarter', hasDot: true },
  quarter: { quarterBeats: 1.0, divisions: 4, xmlType: 'quarter', hasDot: false },
  eighth: { quarterBeats: 0.5, divisions: 2, xmlType: 'eighth', hasDot: false },
  sixteenth: { quarterBeats: 0.25, divisions: 1, xmlType: '16th', hasDot: false }
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
