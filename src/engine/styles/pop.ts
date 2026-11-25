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

function buildOpenFifthRoll(root: NotePitch, keyKey: string, useTenth: boolean): NotePitch[] {
  const fifth = midiToPitch(root.midi + 7, keyKey);
  const octave = createPitch(root.step, root.alter || 0, root.octave + 1);
  if (!useTenth) {
    return [root, fifth, octave, fifth];
  }
  const ninth = midiToPitch(root.midi + 14, keyKey);
  return [root, fifth, octave, ninth];
}

export const popStyle: StyleRealizer = {
  id: 'pop',
  displayName: 'Modern Pop / Piano Ballad',
  shortLabel: 'Pop / Ballad',
  titlePrefix: 'Modern Piano Ballad',
  tempoText: 'Moderato con moto',
  tempoByDifficulty: { 1: 88, 2: 96, 3: 106 },
  timeSignature: { beats: 4, beatType: 4, name: '4/4' },
  pedagogicalTags: ['Syncopated Ties', 'Open-5th Ballad LH', 'Pop Progressions'],

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

    const motifA: AbstractMotif = createStyleMotif('pop', timeSignature, difficulty, false);
    const motifB: AbstractMotif = createStyleMotif('pop', timeSignature, difficulty, true);

    for (let i = 0; i < harmonicMeasures.length; i++) {
      const hm = harmonicMeasures[i];
      const { blueprint, events } = hm;
      const activeMotif = blueprint.sectionId === 'B' ? motifB : motifA;

      let bassNotes: NoteData[];

      if (blueprint.isFinal) {
        const root = chooseBassNote(events[0].chord, prevBassMidi, 36, 48, false);
        const fifth = midiToPitch(root.midi + 7, keyKey);
        bassNotes = [makeChord([root, fifth], 'whole')];
      } else if (events.length === 2) {
        const r1 = chooseBassNote(events[0].chord, prevBassMidi, 38, 50, false);
        const r2 = chooseBassNote(events[1].chord, r1.midi, 38, 50, false);
        prevBassMidi = r2.midi;
        const f1 = midiToPitch(r1.midi + 7, keyKey);
        const f2 = midiToPitch(r2.midi + 7, keyKey);
        bassNotes = [
          makeNote(r1, 'quarter'),
          makeNote(f1, 'quarter'),
          makeNote(r2, 'quarter'),
          makeNote(f2, 'quarter')
        ];
      } else if (blueprint.sectionId === 'B') {
        // Section B lift: driving rhythmic pop pulse (dotted-quarter + 8th + half chord)
        const v = voiceClosePosition(events[0].chord, prevVoicing, 43, 58, difficulty === 1 ? 2 : 3);
        prevVoicing = v;
        prevBassMidi = v[0].midi;
        bassNotes = [
          makeChord(v, 'dotted-quarter'),
          makeNote(v[0], 'eighth'),
          makeChord(v, 'half')
        ];
      } else {
        // Section A/A': signature Pop Ballad rolling 8th open-5th accompaniment
        const root = chooseBassNote(events[0].chord, prevBassMidi, 38, 49, false);
        prevBassMidi = root.midi;
        const roll = buildOpenFifthRoll(root, keyKey, difficulty >= 3);
        if (difficulty === 1) {
          // Simpler 1-5-8-5 in quarter notes
          bassNotes = [
            makeNote(roll[0], 'quarter'),
            makeNote(roll[1], 'quarter'),
            makeNote(roll[2], 'quarter'),
            makeNote(roll[1], 'quarter')
          ];
        } else {
          // 1-5-8-5-1-5-8-5 (or 1-5-8-9-8-5-8-5)
          const pattern =
            difficulty >= 3
              ? [roll[0], roll[1], roll[2], roll[3], roll[2], roll[1], roll[2], roll[1]]
              : [roll[0], roll[1], roll[2], roll[1], roll[0], roll[1], roll[2], roll[1]];
          bassNotes = pattern.map(p => makeNote(p, 'eighth'));
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
          minMidi: 60,
          maxMidi: difficulty === 1 ? 76 : 81,
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
