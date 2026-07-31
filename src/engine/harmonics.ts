import { ChordDefinition, HarmonicMeasure } from './types';
import { KEYS_MAP, pitchToMidi, NotePitch } from './pitchUtils';

// Helper to build a ChordDefinition given root step, alter, octave, and quality
function buildChord(
  name: string,
  functionName: string,
  rootStep: NotePitch['step'],
  rootAlter: number = 0,
  quality: 'major' | 'minor' | 'diminished' | 'dominant7' | 'major7',
  bassOctave: number = 3
): ChordDefinition {
  const rootMidi = pitchToMidi({ step: rootStep, alter: rootAlter !== 0 ? rootAlter : undefined, octave: bassOctave, midi: 0 });
  
  let intervals: number[] = [0, 4, 7]; // Major triad default
  if (quality === 'minor') intervals = [0, 3, 7];
  else if (quality === 'diminished') intervals = [0, 3, 6];
  else if (quality === 'dominant7') intervals = [0, 4, 7, 10];
  else if (quality === 'major7') intervals = [0, 4, 7, 11];

  const pitches: NotePitch[] = intervals.map(semitones => {
    const midi = rootMidi + semitones;
    const oct = Math.floor(midi / 12) - 1;
    const stepOffsets: Record<NotePitch['step'], number> = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
    const pc = midi % 12;
    
    let bestStep: NotePitch['step'] = 'C';
    let bestAlter = 0;
    
    const steps: NotePitch['step'][] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    for (const st of steps) {
      const basePc = stepOffsets[st];
      let diff = pc - basePc;
      if (diff > 6) diff -= 12;
      if (diff < -6) diff += 12;
      if (Math.abs(diff) <= 2) {
        bestStep = st;
        bestAlter = diff;
        break;
      }
    }

    return {
      step: bestStep,
      alter: bestAlter !== 0 ? bestAlter : undefined,
      octave: oct,
      midi
    };
  });

  return {
    name: `${name} (${functionName})`,
    rootMidi,
    rootStep,
    rootAlter,
    quality,
    pitches
  };
}

export function generateHarmonicProgression(keyKey: string, length: 8 | 16 | 32): HarmonicMeasure[] {
  const key = KEYS_MAP[keyKey] || KEYS_MAP['C'];
  const isMinor = key.isMinor;

  let chords: Record<string, ChordDefinition> = {};

  if (!isMinor) {
    chords = {
      'I': buildChord(`${key.tonicStep}maj`, 'I', key.scaleSteps[0], key.scaleAlters[0], 'major', 3),
      'ii': buildChord(`${key.scaleSteps[1]}m`, 'ii', key.scaleSteps[1], key.scaleAlters[1], 'minor', 3),
      'iii': buildChord(`${key.scaleSteps[2]}m`, 'iii', key.scaleSteps[2], key.scaleAlters[2], 'minor', 3),
      'IV': buildChord(`${key.scaleSteps[3]}maj`, 'IV', key.scaleSteps[3], key.scaleAlters[3], 'major', 3),
      'V': buildChord(`${key.scaleSteps[4]}maj`, 'V', key.scaleSteps[4], key.scaleAlters[4], 'major', 3),
      'V7': buildChord(`${key.scaleSteps[4]}7`, 'V7', key.scaleSteps[4], key.scaleAlters[4], 'dominant7', 3),
      'vi': buildChord(`${key.scaleSteps[5]}m`, 'vi', key.scaleSteps[5], key.scaleAlters[5], 'minor', 3),
      'vii°': buildChord(`${key.scaleSteps[6]}dim`, 'vii°', key.scaleSteps[6], key.scaleAlters[6], 'diminished', 3)
    };
  } else {
    chords = {
      'i': buildChord(`${key.tonicStep}m`, 'i', key.scaleSteps[0], key.scaleAlters[0], 'minor', 3),
      'ii°': buildChord(`${key.scaleSteps[1]}dim`, 'ii°', key.scaleSteps[1], key.scaleAlters[1], 'diminished', 3),
      'III': buildChord(`${key.scaleSteps[2]}maj`, 'III', key.scaleSteps[2], key.scaleAlters[2], 'major', 3),
      'iv': buildChord(`${key.scaleSteps[3]}m`, 'iv', key.scaleSteps[3], key.scaleAlters[3], 'minor', 3),
      'V': buildChord(`${key.scaleSteps[4]}maj`, 'V', key.scaleSteps[4], key.scaleAlters[4], 'major', 3),
      'V7': buildChord(`${key.scaleSteps[4]}7`, 'V7', key.scaleSteps[4], key.scaleAlters[4], 'dominant7', 3),
      'VI': buildChord(`${key.scaleSteps[5]}maj`, 'VI', key.scaleSteps[5], key.scaleAlters[5], 'major', 3),
      'vii°': buildChord(`${key.scaleSteps[6]}dim`, 'vii°', key.scaleSteps[6], key.scaleAlters[6], 'diminished', 3)
    };
  }

  const majorPhrases = [
    ['I', 'IV', 'V', 'I', 'vi', 'ii', 'V7', 'I'],
    ['I', 'vi', 'IV', 'V', 'I', 'IV', 'V7', 'I'],
    ['I', 'V', 'vi', 'iii', 'IV', 'I', 'V7', 'I'],
    ['I', 'ii', 'V7', 'I', 'IV', 'V', 'V7', 'I']
  ];

  const minorPhrases = [
    ['i', 'iv', 'V7', 'i', 'VI', 'ii°', 'V7', 'i'],
    ['i', 'VI', 'iv', 'V7', 'i', 'iv', 'V7', 'i'],
    ['i', 'V7', 'i', 'iv', 'i', 'ii°', 'V7', 'i'],
    ['i', 'III', 'iv', 'V7', 'i', 'VI', 'V7', 'i']
  ];

  const availablePhrases = isMinor ? minorPhrases : majorPhrases;
  
  const phrase1 = availablePhrases[Math.floor(Math.random() * availablePhrases.length)];
  const phrase2 = availablePhrases[(Math.floor(Math.random() * availablePhrases.length) + 1) % availablePhrases.length];
  
  let fullProgressionNames: string[] = [];

  if (length === 8) {
    fullProgressionNames = phrase1;
  } else if (length === 16) {
    fullProgressionNames = [...phrase1, ...phrase2];
  } else {
    fullProgressionNames = [...phrase1, ...phrase2, ...phrase1, ...phrase2];
  }

  const harmonicMeasures: HarmonicMeasure[] = fullProgressionNames.map((funcName, idx) => {
    const chord = chords[funcName] || (isMinor ? chords['i'] : chords['I']);
    return {
      measureNumber: idx + 1,
      chord,
      functionName: funcName
    };
  });

  return harmonicMeasures;
}
