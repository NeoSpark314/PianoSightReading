import {
  DifficultyLevel,
  HarmonicMeasure,
  MeasureData,
  NoteData,
  NotePitch,
  TimeSignature
} from '../types';
import { StyleRealizer } from './types';
import { makeNote } from '../durationUtils';
import { chooseBassNote } from '../voiceLeading';
import {
  ScaleMode,
  clampPitchToRange,
  getClosestChordTone,
  getKeyInfo,
  getScaleDegreePitch,
  stepOffsetToPitch
} from '../pitchUtils';

// Build a crisp Baroque 8-eighth-note (or 6-note) imitative subject line in a target register
function buildBaroqueSubject(
  anchor: NotePitch,
  contour: number[],
  keyKey: string,
  mode: ScaleMode,
  minMidi: number,
  maxMidi: number
): NoteData[] {
  const notes: NoteData[] = [];
  let curr = clampPitchToRange(anchor, minMidi, maxMidi);

  for (let i = 0; i < contour.length; i++) {
    if (i > 0) {
      curr = clampPitchToRange(stepOffsetToPitch(curr, contour[i], keyKey, mode), minMidi, maxMidi);
    }
    const art = i === 0 || i === contour.length - 1 ? ['staccato' as const] : undefined;
    notes.push(makeNote(curr, 'eighth', { articulations: art }));
  }
  return notes;
}

// Build a contrasting Baroque quarter-note counterpoint line (contrary motion)
function buildCounterLine(
  chordPitches: NotePitch[],
  startTargetMidi: number,
  direction: 1 | -1,
  keyKey: string,
  mode: ScaleMode,
  minMidi: number,
  maxMidi: number
): NoteData[] {
  const first = getClosestChordTone(startTargetMidi, chordPitches, minMidi, maxMidi);
  const second = clampPitchToRange(stepOffsetToPitch(first, direction, keyKey, mode), minMidi, maxMidi);
  const third = clampPitchToRange(stepOffsetToPitch(second, direction, keyKey, mode), minMidi, maxMidi);
  const fourth = getClosestChordTone(third.midi + direction * 2, chordPitches, minMidi, maxMidi);

  return [
    makeNote(first, 'quarter', { articulations: ['staccato'] }),
    makeNote(second, 'quarter'),
    makeNote(third, 'quarter'),
    makeNote(fourth, 'quarter', { articulations: ['staccato'] })
  ];
}

export const baroqueStyle: StyleRealizer = {
  id: 'baroque',
  displayName: 'Baroque Two-Part Invention (Counterpoint)',
  shortLabel: 'Baroque Invention',
  titlePrefix: 'Two-Part Invention',
  tempoText: 'Allegro moderato',
  tempoByDifficulty: { 1: 88, 2: 100, 3: 112 },
  timeSignature: { beats: 4, beatType: 4, name: '4/4' },
  pedagogicalTags: ['Two-Part Imitation', 'Hand Independence', 'Contrary Motion'],

  realizePiece(
    harmonicMeasures: HarmonicMeasure[],
    timeSignature: TimeSignature,
    keyKey: string,
    difficulty: DifficultyLevel
  ): MeasureData[] {
    const keyInfo = getKeyInfo(keyKey);
    const measures: MeasureData[] = [];

    // Pick a signature 8-eighth-note Baroque contour for this invention
    const subjectContours: number[][] = [
      [0, 1, 1, 1, -1, -1, 1, -1], // Ascending scale + turn
      [0, 2, -1, 1, -1, -1, -1, 1], // Arpeggio skip + scalar fall
      [0, -1, -1, 1, 1, 1, 1, -1] // Dip + energetic climb
    ];
    const subjectA = subjectContours[Math.floor(Math.random() * subjectContours.length)];
    const subjectB = subjectA.map(step => -step); // Inverted subject for Section B!

    let prevRhMidi = 67;
    let prevLhMidi = 48;

    for (let i = 0; i < harmonicMeasures.length; i++) {
      const hm = harmonicMeasures[i];
      const { blueprint, events } = hm;
      const primaryChord = events[0].chord;
      const mode: ScaleMode =
        keyInfo.isMinor && (hm.functionName.startsWith('V') || hm.functionName.startsWith('vii'))
          ? 'harmonic'
          : 'natural';
      const contour = blueprint.sectionId === 'B' ? subjectB : subjectA;

      let trebleNotes: NoteData[];
      let bassNotes: NoteData[];

      if (blueprint.isFinal) {
        const rhTonic = getClosestChordTone(prevRhMidi, [primaryChord.pitches[0]], 60, 76);
        const lhTonic = chooseBassNote(primaryChord, prevLhMidi, 36, 52, false);
        trebleNotes = [makeNote(rhTonic, 'whole')];
        bassNotes = [makeNote(lhTonic, 'whole')];
      } else if (blueprint.phrasePos === 0) {
        // Bar 1 of phrase: RH states the Baroque subject in 8ths; LH plays crisp quarter counterpoint
        const rhAnchor = getClosestChordTone(prevRhMidi, primaryChord.pitches, 62, 76);
        trebleNotes = buildBaroqueSubject(rhAnchor, contour, keyKey, mode, 60, 81);
        bassNotes =
          difficulty === 1
            ? [
                makeNote(chooseBassNote(primaryChord, prevLhMidi, 40, 55, false), 'half'),
                makeNote(chooseBassNote(events[events.length - 1].chord, prevLhMidi + 4, 40, 55, true), 'half')
              ]
            : buildCounterLine(primaryChord.pitches, prevLhMidi, -1, keyKey, mode, 38, 57);
      } else if (blueprint.phrasePos === 1) {
        // Bar 2 of phrase: TRUE IMITATION! LH answers with the subject in 8ths; RH plays counter-melody
        const lhAnchor = getClosestChordTone(prevLhMidi, primaryChord.pitches, 43, 55);
        bassNotes = buildBaroqueSubject(lhAnchor, contour, keyKey, mode, 38, 59);
        trebleNotes = buildCounterLine(primaryChord.pitches, prevRhMidi, -1, keyKey, mode, 62, 79);
      } else if (blueprint.phrasePos === 2) {
        // Bar 3: Sequential contrary motion (both hands active!)
        const rhAnchor = getClosestChordTone(prevRhMidi + 2, primaryChord.pitches, 64, 79);
        const lhAnchor = chooseBassNote(primaryChord, prevLhMidi, 40, 55, true);
        trebleNotes = buildBaroqueSubject(rhAnchor, contour, keyKey, mode, 60, 81);
        bassNotes = buildCounterLine(
          events[events.length - 1].chord.pitches,
          lhAnchor.midi,
          -1,
          keyKey,
          mode,
          38,
          57
        );
      } else {
        // Bar 4: Clean Baroque cadence (half + half, or leading-tone resolution)
        const targetDeg = blueprint.cadenceType === 'half' ? 5 : 1;
        const rhGoal = getClosestChordTone(
          prevRhMidi,
          [getScaleDegreePitch(keyKey, targetDeg, 4, mode)],
          62,
          77
        );
        const rhApproach = clampPitchToRange(
          stepOffsetToPitch(rhGoal, -1, keyKey, mode),
          60,
          79
        );
        const lhBass1 = chooseBassNote(events[0].chord, prevLhMidi, 38, 54, false);
        const lhBass2 = chooseBassNote(events[events.length - 1].chord, lhBass1.midi, 38, 54, false);

        trebleNotes = [makeNote(rhApproach, 'half'), makeNote(rhGoal, 'half')];
        bassNotes = [
          makeNote(lhBass1, 'half'),
          makeNote(lhBass2, 'half')
        ];
      }

      const lastRh = trebleNotes[trebleNotes.length - 1]?.pitch;
      const lastLh = bassNotes[bassNotes.length - 1]?.pitch;
      if (lastRh) prevRhMidi = lastRh.midi;
      if (lastLh) prevLhMidi = lastLh.midi;

      measures.push({
        measureNumber: hm.measureNumber,
        trebleNotes,
        bassNotes,
        timeSignature: i === 0 ? timeSignature : undefined
      });
    }

    return measures;
  }
};
