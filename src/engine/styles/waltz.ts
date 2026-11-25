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
import { AbstractMotif, createStyleMotif, realizeMotifMeasure } from '../motifEngine';

function getLastPitch(notes: NoteData[]): NotePitch | null {
  for (let i = notes.length - 1; i >= 0; i--) {
    if (!notes[i].isRest && notes[i].pitch) return notes[i].pitch!;
  }
  return null;
}

export const waltzStyle: StyleRealizer = {
  id: 'waltz',
  displayName: 'Romantic Waltz (3/4 Oom-Pah-Pah)',
  shortLabel: 'Romantic Waltz',
  titlePrefix: 'Lyrical Waltz',
  tempoText: 'Tempo di Valse',
  tempoByDifficulty: { 1: 108, 2: 120, 3: 132 },
  timeSignature: { beats: 3, beatType: 4, name: '3/4' },
  pedagogicalTags: ['Oom-Pah-Pah Chords', 'LH Bass Leaps', 'Lyrical 3/4 Phrasing'],

  realizePiece(
    harmonicMeasures: HarmonicMeasure[],
    timeSignature: TimeSignature,
    keyKey: string,
    difficulty: DifficultyLevel
  ): MeasureData[] {
    const measures: MeasureData[] = [];
    let prevBassMidi: number | null = null;
    let prevChordVoicing: NotePitch[] | null = null;
    let prevRhPitch: NotePitch | null = null;

    const motifA: AbstractMotif = createStyleMotif('waltz', timeSignature, difficulty, false);
    const motifB: AbstractMotif = createStyleMotif('waltz', timeSignature, difficulty, true);
    const chordSize = difficulty === 1 ? 2 : 3;

    for (let i = 0; i < harmonicMeasures.length; i++) {
      const hm = harmonicMeasures[i];
      const { blueprint, events } = hm;
      const activeMotif = blueprint.sectionId === 'B' ? motifB : motifA;

      // Left Hand: Authentic 3/4 oom-pah-pah (bass beat 1 -> staccato chord beats 2 & 3)
      let bassNotes: NoteData[];
      if (blueprint.isFinal) {
        const root = chooseBassNote(events[0].chord, prevBassMidi, 38, 50, false);
        bassNotes = [makeNote(root, 'dotted-half')];
      } else if (events.length === 2) {
        // Split measure: beat 1 bass + beat 2 chord of event 0, beat 3 chord of event 1
        const b1 = chooseBassNote(events[0].chord, prevBassMidi, 38, 50, false);
        const c1 = voiceClosePosition(events[0].chord, prevChordVoicing, 50, 62, chordSize);
        const c2 = voiceClosePosition(events[1].chord, c1, 50, 62, chordSize);
        prevBassMidi = b1.midi;
        prevChordVoicing = c2;
        bassNotes = [
          makeNote(b1, 'quarter'),
          makeChord(c1, 'quarter', { articulations: ['staccato'] }),
          makeChord(c2, 'quarter', { articulations: ['staccato'] })
        ];
      } else {
        const bassNote = chooseBassNote(
          events[0].chord,
          prevBassMidi,
          38,
          50,
          blueprint.phrasePos === 2 && difficulty >= 2
        );
        const chordVoicing = voiceClosePosition(events[0].chord, prevChordVoicing, 50, 62, chordSize);
        prevBassMidi = bassNote.midi;
        prevChordVoicing = chordVoicing;

        bassNotes = [
          makeNote(bassNote, 'quarter'),
          makeChord(chordVoicing, 'quarter', { articulations: ['staccato'] }),
          makeChord(chordVoicing, 'quarter', { articulations: ['staccato'] })
        ];
      }

      // Right Hand: Singing cantabile melody
      const trebleNotes = realizeMotifMeasure(
        activeMotif,
        hm,
        timeSignature,
        keyKey,
        prevRhPitch,
        difficulty,
        {
          minMidi: 62,
          maxMidi: difficulty === 1 ? 77 : 83,
          addCadenceDyad: difficulty >= 2,
          preferBreathAtCadence: blueprint.cadenceType === 'half'
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
