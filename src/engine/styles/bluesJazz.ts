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
import { chooseBassNote } from '../voiceLeading';
import { clampPitchToRange, getClosestChordTone, midiToPitch } from '../pitchUtils';
import { AbstractMotif, createStyleMotif, realizeMotifMeasure } from '../motifEngine';

function getLastPitch(notes: NoteData[]): NotePitch | null {
  for (let i = notes.length - 1; i >= 0; i--) {
    if (!notes[i].isRest && notes[i].pitch) return notes[i].pitch!;
  }
  return null;
}

/**
 * Builds an idiomatic 4-beat walking bass measure:
 * Beat 1 = root, Beat 2 = 3rd, Beat 3 = 5th, Beat 4 = chromatic/scalar approach to next root.
 */
function buildWalkingBassMeasure(
  hm: HarmonicMeasure,
  nextHm: HarmonicMeasure | undefined,
  prevBassMidi: number | null,
  keyKey: string
): NoteData[] {
  const chord = hm.events[0].chord;
  const root = chooseBassNote(chord, prevBassMidi, 36, 48, false);
  const third = getClosestChordTone(root.midi + 4, [chord.pitches[1] || chord.pitches[0]], root.midi + 2, root.midi + 6);
  const fifth = getClosestChordTone(root.midi + 7, [chord.pitches[2] || chord.pitches[0]], root.midi + 5, root.midi + 9);

  // Beat 4: chromatic approach tone 1 semitone below or above the next bar's root
  const nextRoot = nextHm
    ? chooseBassNote(nextHm.events[0].chord, root.midi, 36, 48, false)
    : root;
  const approachMidi =
    fifth.midi <= nextRoot.midi ? nextRoot.midi - 1 : nextRoot.midi + 1;
  const approach = clampPitchToRange(midiToPitch(approachMidi, keyKey, approachMidi > nextRoot.midi), 36, 55);

  return [
    makeNote(root, 'quarter'),
    makeNote(third, 'quarter'),
    makeNote(fifth, 'quarter'),
    makeNote(approach, 'quarter')
  ];
}

/**
 * Builds jazz shell voicings (Root + 3rd or Root + 7th) for comping contrast in Section B.
 */
function buildShellVoicingMeasure(
  hm: HarmonicMeasure,
  prevBassMidi: number | null
): NoteData[] {
  const chord = hm.events[0].chord;
  const root = chooseBassNote(chord, prevBassMidi, 40, 52, false);
  const seventhOrThird =
    chord.pitches.length >= 4
      ? getClosestChordTone(root.midi + 10, [chord.pitches[3]], root.midi + 7, root.midi + 11)
      : getClosestChordTone(root.midi + 4, [chord.pitches[1] || chord.pitches[0]], root.midi + 3, root.midi + 7);

  return [
    makeChord([root, seventhOrThird], 'half', { articulations: ['tenuto'] }),
    makeChord([root, seventhOrThird], 'half', { articulations: ['staccato'] })
  ];
}

export const bluesJazzStyle: StyleRealizer = {
  id: 'blues',
  displayName: 'Blues / Jazz Swing Etude',
  shortLabel: 'Blues / Jazz',
  titlePrefix: 'Swing Blues Etude',
  tempoText: 'Moderato swing',
  tempoByDifficulty: { 1: 96, 2: 112, 3: 126 },
  timeSignature: { beats: 4, beatType: 4, name: '4/4' },
  pedagogicalTags: ['Walking Bass', 'Blues Accidentals', 'Shell Voicings & Syncopation'],

  realizePiece(
    harmonicMeasures: HarmonicMeasure[],
    timeSignature: TimeSignature,
    keyKey: string,
    difficulty: DifficultyLevel
  ): MeasureData[] {
    const measures: MeasureData[] = [];
    let prevBassMidi: number | null = null;
    let prevRhPitch: NotePitch | null = null;

    const motifA: AbstractMotif = createStyleMotif('blues', timeSignature, difficulty, false);
    const motifB: AbstractMotif = createStyleMotif('blues', timeSignature, difficulty, true);

    for (let i = 0; i < harmonicMeasures.length; i++) {
      const hm = harmonicMeasures[i];
      const nextHm = harmonicMeasures[i + 1];
      const { blueprint, events } = hm;
      const activeMotif = blueprint.sectionId === 'B' ? motifB : motifA;

      let bassNotes: NoteData[];
      if (blueprint.isFinal) {
        const root = chooseBassNote(events[0].chord, prevBassMidi, 36, 48, false);
        const seventh =
          events[0].chord.pitches.length >= 4
            ? getClosestChordTone(root.midi + 10, [events[0].chord.pitches[3]], root.midi + 7, root.midi + 11)
            : midiToPitch(root.midi + 7, keyKey);
        bassNotes = [makeChord([root, seventh], 'whole')];
      } else if (blueprint.sectionId === 'B' && difficulty >= 2) {
        bassNotes = buildShellVoicingMeasure(hm, prevBassMidi);
      } else {
        bassNotes = buildWalkingBassMeasure(hm, nextHm, prevBassMidi, keyKey);
      }

      const lastBass = bassNotes[0]?.pitches?.[0] || bassNotes[0]?.pitch;
      if (lastBass) prevBassMidi = lastBass.midi;

      const trebleNotes = realizeMotifMeasure(
        activeMotif,
        hm,
        timeSignature,
        keyKey,
        prevRhPitch,
        difficulty,
        {
          minMidi: 60,
          maxMidi: difficulty === 1 ? 75 : 80,
          bluesColor: true,
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
