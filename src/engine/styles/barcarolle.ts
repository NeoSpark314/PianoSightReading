import {
  DifficultyLevel,
  HarmonicMeasure,
  MeasureData,
  NoteData,
  NotePitch,
  TimeSignature
} from '../types';
import { StyleRealizer } from './types';
import { makeChord, makeNote } from '../durationUtils';
import { chooseBassNote, voiceClosePosition } from '../voiceLeading';
import { createPitch, midiToPitch } from '../pitchUtils';
import { AbstractMotif, createStyleMotif, realizeMotifMeasure } from '../motifEngine';

function getLastPitch(notes: NoteData[]): NotePitch | null {
  for (let i = notes.length - 1; i >= 0; i--) {
    if (!notes[i].isRest && notes[i].pitch) return notes[i].pitch!;
  }
  return null;
}

export const barcarolleStyle: StyleRealizer = {
  id: 'barcarolle',
  displayName: 'Lyrical 6/8 Barcarolle / Nocturne',
  shortLabel: '6/8 Barcarolle',
  titlePrefix: 'Barcarolle Nocturne',
  tempoText: 'Andante cantabile',
  tempoByDifficulty: { 1: 48, 2: 56, 3: 64 }, // Dotted-quarter BPM in 6/8
  timeSignature: { beats: 6, beatType: 8, name: '6/8' },
  pedagogicalTags: ['Compound 6/8 Meter', 'Sweeping LH Arpeggios', 'Cantabile Phrasing'],

  realizePiece(
    harmonicMeasures: HarmonicMeasure[],
    timeSignature: TimeSignature,
    keyKey: string,
    difficulty: DifficultyLevel
  ): MeasureData[] {
    const measures: MeasureData[] = [];
    let prevBassMidi: number | null = null;
    let prevVoicing: NotePitch[] | null = null;
    let prevRhPitch: NotePitch | null = null;

    const motifA: AbstractMotif = createStyleMotif('barcarolle', timeSignature, difficulty, false);
    const motifB: AbstractMotif = createStyleMotif('barcarolle', timeSignature, difficulty, true);

    for (let i = 0; i < harmonicMeasures.length; i++) {
      const hm = harmonicMeasures[i];
      const { blueprint, events } = hm;
      const activeMotif = blueprint.sectionId === 'B' ? motifB : motifA;

      let bassNotes: NoteData[];

      if (blueprint.isFinal) {
        const root = chooseBassNote(events[0].chord, prevBassMidi, 36, 48, false);
        const fifth = midiToPitch(root.midi + 7, keyKey);
        bassNotes = [makeChord([root, fifth], 'dotted-half')];
      } else if (events.length === 2) {
        // 2 chords in 6/8: 3 eighths on chord 1 + 3 eighths on chord 2
        const v1 = voiceClosePosition(events[0].chord, prevVoicing, 43, 60, 3);
        const v2 = voiceClosePosition(events[1].chord, v1, 43, 60, 3);
        prevVoicing = v2;
        prevBassMidi = v2[0].midi;
        bassNotes = [
          v1[0],
          v1[1] || v1[0],
          v1[2] || v1[1] || v1[0],
          v2[0],
          v2[1] || v2[0],
          v2[2] || v2[1] || v2[0]
        ].map(p => makeNote(p, 'eighth'));
      } else {
        const root = chooseBassNote(events[0].chord, prevBassMidi, 38, 49, false);
        prevBassMidi = root.midi;
        const fifth = midiToPitch(root.midi + 7, keyKey);
        const octave = createPitch(root.step, root.alter || 0, root.octave + 1);
        const thirdAboveOctave = midiToPitch(
          root.midi + (events[0].chord.quality === 'minor' || events[0].chord.quality === 'diminished' ? 15 : 16),
          keyKey
        );

        if (difficulty === 1) {
          // Comfortable close-position rocking 6/8: low - mid - high - mid - high - mid
          const v = voiceClosePosition(events[0].chord, prevVoicing, 45, 60, 3);
          prevVoicing = v;
          const [l, m, h] = [v[0], v[1] || v[0], v[2] || v[1] || v[0]];
          bassNotes = [l, m, h, m, h, m].map(p => makeNote(p, 'eighth'));
        } else if (difficulty === 2) {
          // Sweeping 1 - 5 - 8 - 5 - 8 - 5 rocking arpeggio
          bassNotes = [root, fifth, octave, fifth, octave, fifth].map(p => makeNote(p, 'eighth'));
        } else {
          // Nocturne 10th sweep: 1 - 5 - 8 - 10 - 8 - 5
          bassNotes = [root, fifth, octave, thirdAboveOctave, octave, fifth].map(p =>
            makeNote(p, 'eighth')
          );
        }
      }

      const trebleNotes = realizeMotifMeasure(
        activeMotif,
        hm,
        timeSignature,
        keyKey,
        prevRhPitch,
        difficulty,
        {
          minMidi: 62,
          maxMidi: difficulty === 1 ? 76 : 82,
          addCadenceDyad: difficulty >= 2,
          preferBreathAtCadence: true
        }
      );

      prevRhPitch = getLastPitch(trebleNotes) || prevRhPitch;

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
