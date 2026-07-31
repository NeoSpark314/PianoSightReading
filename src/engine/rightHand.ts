import { NoteData, HarmonicMeasure, StyleType, NotePitch, NoteDuration } from './types';
import { pitchToMidi, stepOffsetToPitch } from './pitchUtils';

export function selectPhraseMotif(style: StyleType): NoteDuration[] {
  if (style === 'waltz') {
    const waltzMotifs: NoteDuration[][] = [
      ['quarter', 'quarter', 'quarter'],
      ['quarter', 'eighth', 'eighth', 'quarter'],
      ['dotted-quarter', 'eighth', 'quarter'],
      ['quarter', 'sixteenth', 'sixteenth', 'sixteenth', 'sixteenth']
    ];
    return waltzMotifs[Math.floor(Math.random() * waltzMotifs.length)];
  } else {
    const motifs44: NoteDuration[][] = [
      ['dotted-quarter', 'eighth', 'quarter', 'quarter'],
      ['quarter', 'eighth', 'eighth', 'quarter', 'quarter'],
      ['quarter', 'sixteenth', 'sixteenth', 'sixteenth', 'sixteenth', 'quarter', 'quarter'],
      ['dotted-quarter', 'eighth', 'sixteenth', 'sixteenth', 'eighth', 'quarter'],
      ['quarter', 'quarter', 'eighth', 'eighth', 'quarter']
    ];
    return motifs44[Math.floor(Math.random() * motifs44.length)];
  }
}

export function generateRightHandMeasure(
  harmonicMeasure: HarmonicMeasure,
  style: StyleType,
  keyKey: string,
  prevNote: NoteData | null,
  isFinalMeasure: boolean = false,
  phraseMotif?: NoteDuration[]
): NoteData[] {
  const { chord, measureNumber } = harmonicMeasure;

  // Map chord tones to Treble register (Octaves 4 & 5)
  const trebleChordTones: NotePitch[] = chord.pitches.map(p => {
    const oct = p.octave < 4 ? p.octave + 1 : p.octave;
    return { ...p, octave: oct, midi: pitchToMidi({ ...p, octave: oct }) };
  });

  // Final measure resolution
  if (isFinalMeasure) {
    const tonicPitch = trebleChordTones[0]; // Tonic
    if (style === 'waltz') {
      return [{
        pitch: tonicPitch,
        duration: 'dotted-half',
        durationInQuarterNotes: 3.0
      }];
    } else {
      return [{
        pitch: tonicPitch,
        duration: 'whole',
        durationInQuarterNotes: 4.0
      }];
    }
  }

  // Determine rhythmic template based on 4-bar phrase structure (Motivic Intent)
  const phrasePos = (measureNumber - 1) % 4;
  let selectedTemplate: NoteDuration[];

  if (phrasePos === 0 || phrasePos === 1) {
    // Measure 1 & 2: Statement & Repetition of Phrase Motif
    selectedTemplate = phraseMotif || selectPhraseMotif(style);
  } else if (phrasePos === 2) {
    // Measure 3: Rhythmic Variation / Acceleration
    if (style === 'waltz') {
      selectedTemplate = ['eighth', 'eighth', 'eighth', 'eighth', 'quarter'];
    } else {
      selectedTemplate = ['eighth', 'eighth', 'eighth', 'eighth', 'half'];
    }
  } else {
    // Measure 4: Phrase Cadence resting point
    if (style === 'waltz') {
      selectedTemplate = ['dotted-half'];
    } else {
      selectedTemplate = ['half', 'half'];
    }
  }

  const measureNotes: NoteData[] = [];
  let currentPitch: NotePitch = prevNote?.pitch || trebleChordTones[Math.floor(Math.random() * trebleChordTones.length)];

  // Track leap recovery state
  let requiresStepwiseRecovery = false;
  let recoveryDirection = -1; // -1 for down, +1 for up

  let currentBeatOffset = 0;

  for (let i = 0; i < selectedTemplate.length; i++) {
    const duration = selectedTemplate[i];
    const durQuarterValue = duration === 'whole' ? 4.0 :
                            duration === 'dotted-half' ? 3.0 :
                            duration === 'half' ? 2.0 :
                            duration === 'dotted-quarter' ? 1.5 :
                            duration === 'quarter' ? 1.0 :
                            duration === 'eighth' ? 0.5 : 0.25;

    const isStrongBeat = (currentBeatOffset % 1.0 === 0) || (i === 0);

    let nextPitch: NotePitch;

    if (requiresStepwiseRecovery) {
      nextPitch = stepOffsetToPitch(currentPitch, recoveryDirection * 1, keyKey);
      requiresStepwiseRecovery = false;
    } else if (isStrongBeat) {
      const suitableChordTones = trebleChordTones.filter(ct => Math.abs(ct.midi - currentPitch.midi) <= 12);
      if (suitableChordTones.length > 0) {
        nextPitch = suitableChordTones[Math.floor(Math.random() * suitableChordTones.length)];
      } else {
        nextPitch = trebleChordTones[0];
      }
    } else {
      // Weak beat or 16th note figure: step-wise movement
      const stepOffset = Math.random() > 0.5 ? 1 : -1;
      nextPitch = stepOffsetToPitch(currentPitch, stepOffset, keyKey);
    }

    // Check for leap of 5th or more (>= 7 semitones)
    const intervalMidi = nextPitch.midi - currentPitch.midi;
    if (Math.abs(intervalMidi) >= 7) {
      requiresStepwiseRecovery = true;
      recoveryDirection = intervalMidi > 0 ? -1 : 1;
    }

    // Clamp pitch between C4 (MIDI 60) and C6 (MIDI 84) to keep sheet music readable
    if (nextPitch.midi < 57) {
      nextPitch = stepOffsetToPitch(nextPitch, 7, keyKey);
    } else if (nextPitch.midi > 84) {
      nextPitch = stepOffsetToPitch(nextPitch, -7, keyKey);
    }

    measureNotes.push({
      pitch: nextPitch,
      duration,
      durationInQuarterNotes: durQuarterValue
    });

    currentPitch = nextPitch;
    currentBeatOffset += durQuarterValue;
  }

  return measureNotes;
}
