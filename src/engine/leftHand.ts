import { NoteData, HarmonicMeasure, StyleType, NotePitch } from './types';

// Helper to construct a LH pitch in a specific bass octave (usually Octave 2 or 3)
function getVoicedLHPitches(chordPitches: NotePitch[], targetBassOctave: number = 3): NotePitch[] {
  // Take chord root, 3rd, 5th, 7th and shift to target octave
  if (!chordPitches || chordPitches.length === 0) {
    return [{ step: 'C', octave: targetBassOctave, midi: 48 }];
  }

  const root = chordPitches[0];
  const third = chordPitches[1] || root;
  const fifth = chordPitches[2] || third;

  // Root in low bass (e.g. C3 = 48)
  const rootMidi = (targetBassOctave + 1) * 12 + ((root.midi % 12));
  const rootPitch: NotePitch = { ...root, octave: targetBassOctave, midi: rootMidi };

  // 3rd & 5th in middle bass register (slightly above root)
  const thirdMidi = (targetBassOctave + 1) * 12 + ((third.midi % 12));
  const thirdPitch: NotePitch = { ...third, octave: targetBassOctave, midi: thirdMidi < rootMidi ? thirdMidi + 12 : thirdMidi };

  const fifthMidi = (targetBassOctave + 1) * 12 + ((fifth.midi % 12));
  const fifthPitch: NotePitch = { ...fifth, octave: targetBassOctave, midi: fifthMidi < rootMidi ? fifthMidi + 12 : fifthMidi };

  return [rootPitch, thirdPitch, fifthPitch];
}

export function generateLeftHandMeasure(
  harmonicMeasure: HarmonicMeasure,
  style: StyleType,
  isFinalMeasure: boolean = false
): NoteData[] {
  const { chord } = harmonicMeasure;
  const [root, third, fifth] = getVoicedLHPitches(chord.pitches, 3);

  // If final measure, play a solid whole note or dotted half note resolving to Root
  if (isFinalMeasure) {
    if (style === 'waltz') {
      return [{
        pitch: root,
        duration: 'dotted-half',
        durationInQuarterNotes: 3.0
      }];
    } else {
      return [{
        pitch: root,
        duration: 'whole',
        durationInQuarterNotes: 4.0
      }];
    }
  }

  switch (style) {
    case 'alberti': {
      // Alberti Bass: Root - 5th - 3rd - 5th (8th notes across 4 beats = 8 notes)
      const patternPitches = [root, fifth, third, fifth, root, fifth, third, fifth];
      return patternPitches.map((p) => ({
        pitch: p,
        duration: 'eighth',
        durationInQuarterNotes: 0.5
      }));
    }

    case 'waltz': {
      // 3/4 Time: Beat 1 = Root note, Beat 2 = blocked chord (3rd + 5th), Beat 3 = blocked chord
      // Note: For OSMD/MusicXML representation, we can output single note or chord note.
      return [
        {
          pitch: root,
          duration: 'quarter',
          durationInQuarterNotes: 1.0
        },
        {
          pitch: third,
          duration: 'quarter',
          durationInQuarterNotes: 1.0
        },
        {
          pitch: third,
          duration: 'quarter',
          durationInQuarterNotes: 1.0
        }
      ];
    }

    case 'chorale': {
      // 4/4 Time: 2 Half notes or 4 Quarter notes with smooth voice leading
      return [
        {
          pitch: root,
          duration: 'half',
          durationInQuarterNotes: 2.0
        },
        {
          pitch: fifth,
          duration: 'half',
          durationInQuarterNotes: 2.0
        }
      ];
    }

    case 'pop': {
      // 4/4 Time: Syncopated rhythm (Dotted quarter root, 8th 5th, quarter root, quarter 3rd)
      return [
        {
          pitch: root,
          duration: 'dotted-quarter',
          durationInQuarterNotes: 1.5
        },
        {
          pitch: fifth,
          duration: 'eighth',
          durationInQuarterNotes: 0.5
        },
        {
          pitch: root,
          duration: 'quarter',
          durationInQuarterNotes: 1.0
        },
        {
          pitch: third,
          duration: 'quarter',
          durationInQuarterNotes: 1.0
        }
      ];
    }

    default:
      return [{
        pitch: root,
        duration: 'whole',
        durationInQuarterNotes: 4.0
      }];
  }
}
