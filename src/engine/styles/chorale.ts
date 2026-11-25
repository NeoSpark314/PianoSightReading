import {
  DifficultyLevel,
  HarmonicMeasure,
  MeasureData,
  NoteData,
  TimeSignature
} from '../types';
import { StyleRealizer } from './types';
import { makeChord, makeNote } from '../durationUtils';
import { SATBVoicing, voiceFourPartChorale } from '../voiceLeading';
import { clampPitchToRange, stepOffsetToPitch } from '../pitchUtils';

export const choraleStyle: StyleRealizer = {
  id: 'chorale',
  displayName: 'Chorale (4-Part Voice Leading)',
  shortLabel: 'Chorale Harmony',
  titlePrefix: 'Sacred Chorale',
  tempoText: 'Andante religioso',
  tempoByDifficulty: { 1: 68, 2: 74, 3: 80 },
  timeSignature: { beats: 4, beatType: 4, name: '4/4' },
  pedagogicalTags: ['4-Part SATB Reading', 'Smooth Voice Leading', 'Chord Inversions'],

  realizePiece(
    harmonicMeasures: HarmonicMeasure[],
    timeSignature: TimeSignature,
    keyKey: string,
    difficulty: DifficultyLevel
  ): MeasureData[] {
    const measures: MeasureData[] = [];
    let prevSatb: SATBVoicing | null = null;

    for (let i = 0; i < harmonicMeasures.length; i++) {
      const hm = harmonicMeasures[i];
      const { blueprint, events } = hm;
      const targetSop = 67 + Math.round((blueprint.energy - 0.45) * 8);

      const trebleNotes: NoteData[] = [];
      const bassNotes: NoteData[] = [];

      if (blueprint.isFinal) {
        const satb = voiceFourPartChorale(events[0].chord, prevSatb, 69);
        prevSatb = satb;
        trebleNotes.push(makeChord([satb.alto, satb.soprano], 'whole'));
        bassNotes.push(makeChord([satb.bass, satb.tenor], 'whole'));
      } else if (events.length === 2) {
        // Two chords in the measure: half note + half note (classic chorale harmonic rhythm)
        const s1 = voiceFourPartChorale(events[0].chord, prevSatb, targetSop);
        const s2 = voiceFourPartChorale(events[1].chord, s1, targetSop + (blueprint.phrasePos === 2 ? 2 : -1));
        prevSatb = s2;

        if (difficulty === 1) {
          trebleNotes.push(makeChord([s1.alto, s1.soprano], 'half'), makeChord([s2.alto, s2.soprano], 'half'));
          bassNotes.push(makeNote(s1.bass, 'half'), makeNote(s2.bass, 'half'));
        } else {
          trebleNotes.push(makeChord([s1.alto, s1.soprano], 'half'), makeChord([s2.alto, s2.soprano], 'half'));
          bassNotes.push(makeChord([s1.bass, s1.tenor], 'half'), makeChord([s2.bass, s2.tenor], 'half'));
        }
      } else if (blueprint.motivicRole === 'cadence') {
        const satb = voiceFourPartChorale(events[0].chord, prevSatb, targetSop - 2);
        prevSatb = satb;
        trebleNotes.push(makeChord([satb.alto, satb.soprano], 'whole'));
        bassNotes.push(
          difficulty === 1
            ? makeNote(satb.bass, 'whole')
            : makeChord([satb.bass, satb.tenor], 'whole')
        );
      } else {
        // 1-chord measure: half + quarter + quarter with gentle soprano passing tone for musical flow
        const satb = voiceFourPartChorale(events[0].chord, prevSatb, targetSop);
        const altSatb = voiceFourPartChorale(events[0].chord, satb, satb.soprano.midi + 2);
        prevSatb = altSatb;

        const passingSop = clampPitchToRange(
          stepOffsetToPitch(satb.soprano, altSatb.soprano.midi >= satb.soprano.midi ? 1 : -1, keyKey),
          62,
          77
        );

        trebleNotes.push(
          makeChord([satb.alto, satb.soprano], 'half'),
          makeChord([satb.alto, passingSop], 'quarter'),
          makeChord([altSatb.alto, altSatb.soprano], 'quarter')
        );

        if (difficulty === 1) {
          bassNotes.push(makeNote(satb.bass, 'half'), makeNote(altSatb.bass, 'half'));
        } else {
          bassNotes.push(
            makeChord([satb.bass, satb.tenor], 'half'),
            makeChord([altSatb.bass, altSatb.tenor], 'half')
          );
        }
      }

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
