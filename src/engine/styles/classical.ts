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

export const classicalStyle: StyleRealizer = {
  id: 'alberti',
  displayName: 'Classical Sonatina (Alberti & Inversions)',
  shortLabel: 'Classical Sonatina',
  titlePrefix: 'Classical Sonatina',
  tempoText: 'Allegretto',
  tempoByDifficulty: { 1: 96, 2: 108, 3: 120 },
  timeSignature: { beats: 4, beatType: 4, name: '4/4' },
  pedagogicalTags: ['Alberti Inversions', 'Classical Cadences', 'Motivic Sequences'],

  realizePiece(
    harmonicMeasures: HarmonicMeasure[],
    timeSignature: TimeSignature,
    keyKey: string,
    difficulty: DifficultyLevel
  ): MeasureData[] {
    const measures: MeasureData[] = [];
    let prevLhVoicing: NotePitch[] | null = null;
    let prevRhPitch: NotePitch | null = null;

    const motifA: AbstractMotif = createStyleMotif('alberti', timeSignature, difficulty, false);
    const motifB: AbstractMotif = createStyleMotif('alberti', timeSignature, difficulty, true);

    for (let i = 0; i < harmonicMeasures.length; i++) {
      const hm = harmonicMeasures[i];
      const { blueprint, events } = hm;
      const activeMotif = blueprint.sectionId === 'B' ? motifB : motifA;

      // Left Hand: Voice-led Alberti Bass (low - high - mid - high)
      let bassNotes: NoteData[];
      if (blueprint.isFinal) {
        const root = chooseBassNote(events[0].chord, prevLhVoicing?.[0].midi ?? null, 45, 55, false);
        const voicing = voiceClosePosition(events[0].chord, prevLhVoicing, 48, 60, difficulty === 1 ? 2 : 3);
        bassNotes = [difficulty === 1 ? makeNote(root, 'whole') : makeChord([root, voicing[voicing.length - 1]], 'whole')];
      } else if (blueprint.motivicRole === 'cadence') {
        // Gentle cadential punctuation: half-note broken or block chord
        const v = voiceClosePosition(events[0].chord, prevLhVoicing, 45, 62, 3);
        prevLhVoicing = v;
        const [low, mid, high] = [v[0], v[1] || v[0], v[2] || v[1] || v[0]];
        bassNotes = [
          makeChord([low, mid, high], 'half'),
          makeNote(low, 'half')
        ];
      } else if (events.length === 2) {
        // 2 chords in bar: 4 eighths of Alberti on each chord
        const v1 = voiceClosePosition(events[0].chord, prevLhVoicing, 45, 62, 3);
        const v2 = voiceClosePosition(events[1].chord, v1, 45, 62, 3);
        prevLhVoicing = v2;
        const [l1, m1, h1] = [v1[0], v1[1] || v1[0], v1[2] || v1[1] || v1[0]];
        const [l2, m2, h2] = [v2[0], v2[1] || v2[0], v2[2] || v2[1] || v2[0]];
        bassNotes = [l1, h1, m1, h1, l2, h2, m2, h2].map(p => makeNote(p, 'eighth'));
      } else {
        const v = voiceClosePosition(events[0].chord, prevLhVoicing, 45, 62, 3);
        prevLhVoicing = v;
        const [low, mid, high] = [v[0], v[1] || v[0], v[2] || v[1] || v[0]];
        // In Section B, use broken-chord ascending/descending pattern for subtle contrast
        const pattern =
          blueprint.sectionId === 'B'
            ? [low, mid, high, mid, low, mid, high, mid]
            : [low, high, mid, high, low, high, mid, high];
        bassNotes = pattern.map(p => makeNote(p, 'eighth'));
      }

      // Right Hand: Motif-driven Classical melody
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
          preferBreathAtCadence: true,
          addCadenceDyad: difficulty >= 3
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
