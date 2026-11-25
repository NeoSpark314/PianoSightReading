import {
  ChordDefinition,
  ChordQuality,
  DifficultyLevel,
  HarmonicEvent,
  HarmonicMeasure,
  MeasureBlueprint,
  NotePitch,
  ResolvedStyleType,
  TimeSignature
} from './types';
import { createPitch, getKeyInfo, midiToPitch, pitchToMidi } from './pitchUtils';
import { getExpectedMeasureQuarterBeats } from './durationUtils';

function buildChord(
  name: string,
  rootStep: NotePitch['step'],
  rootAlter: number,
  quality: ChordQuality,
  keyKey: string,
  bassOctave: number = 3,
  inversion: 0 | 1 | 2 | 3 = 0
): ChordDefinition {
  const rootMidi = pitchToMidi({ step: rootStep, alter: rootAlter, octave: bassOctave });

  let intervals: number[];
  switch (quality) {
    case 'minor':
      intervals = [0, 3, 7];
      break;
    case 'diminished':
      intervals = [0, 3, 6];
      break;
    case 'augmented':
      intervals = [0, 4, 8];
      break;
    case 'dominant7':
      intervals = [0, 4, 7, 10];
      break;
    case 'major7':
      intervals = [0, 4, 7, 11];
      break;
    case 'minor7':
      intervals = [0, 3, 7, 10];
      break;
    case 'halfDim7':
      intervals = [0, 3, 6, 10];
      break;
    case 'sus4':
      intervals = [0, 5, 7];
      break;
    case 'add9':
      intervals = [0, 4, 7, 14];
      break;
    default:
      intervals = [0, 4, 7];
  }

  const keyInfo = getKeyInfo(keyKey);
  const preferFlats = quality === 'minor' || quality === 'dominant7' || quality === 'minor7'
    ? keyInfo.fifths <= 0
    : keyInfo.fifths < 0;

  const pitches: NotePitch[] = intervals.map(semitones =>
    midiToPitch(rootMidi + semitones, keyKey, preferFlats)
  );

  // Ensure root pitch preserves exact spelling
  pitches[0] = createPitch(rootStep, rootAlter, bassOctave);

  const bassPitch = inversion > 0 && pitches[inversion] ? pitches[inversion] : undefined;

  return {
    name,
    rootMidi,
    rootStep,
    rootAlter,
    quality,
    pitches,
    bassPitch,
    inversion
  };
}

function buildKeyChordPalette(keyKey: string): Record<string, ChordDefinition> {
  const key = getKeyInfo(keyKey);
  const s = key.scaleSteps;
  const a = key.scaleAlters;
  const ha = key.harmonicAlters;

  if (!key.isMinor) {
    return {
      I: buildChord(`${s[0]}maj`, s[0], a[0], 'major', keyKey, 3),
      I6: buildChord(`${s[0]}maj/3`, s[0], a[0], 'major', keyKey, 3, 1),
      I64: buildChord(`${s[0]}maj/5`, s[0], a[0], 'major', keyKey, 3, 2),
      Imaj7: buildChord(`${s[0]}maj7`, s[0], a[0], 'major7', keyKey, 3),
      I7: buildChord(`${s[0]}7`, s[0], a[0], 'dominant7', keyKey, 3),
      Iadd9: buildChord(`${s[0]}add9`, s[0], a[0], 'add9', keyKey, 3),
      ii: buildChord(`${s[1]}m`, s[1], a[1], 'minor', keyKey, 3),
      ii6: buildChord(`${s[1]}m/3`, s[1], a[1], 'minor', keyKey, 3, 1),
      ii7: buildChord(`${s[1]}m7`, s[1], a[1], 'minor7', keyKey, 3),
      'V/V': buildChord(`${s[1]}7`, s[1], a[1], 'dominant7', keyKey, 3),
      iii: buildChord(`${s[2]}m`, s[2], a[2], 'minor', keyKey, 3),
      iii6: buildChord(`${s[2]}m/3`, s[2], a[2], 'minor', keyKey, 3, 1),
      'V/vi': buildChord(`${s[2]}7`, s[2], a[2], 'dominant7', keyKey, 3),
      IV: buildChord(`${s[3]}maj`, s[3], a[3], 'major', keyKey, 3),
      IV7: buildChord(`${s[3]}7`, s[3], a[3], 'dominant7', keyKey, 3),
      iv: buildChord(`${s[3]}m`, s[3], a[3], 'minor', keyKey, 3), // Borrowed minor iv
      V: buildChord(`${s[4]}maj`, s[4], a[4], 'major', keyKey, 3),
      V6: buildChord(`${s[4]}maj/3`, s[4], a[4], 'major', keyKey, 3, 1),
      V7: buildChord(`${s[4]}7`, s[4], a[4], 'dominant7', keyKey, 3),
      Vsus4: buildChord(`${s[4]}sus4`, s[4], a[4], 'sus4', keyKey, 3),
      vi: buildChord(`${s[5]}m`, s[5], a[5], 'minor', keyKey, 3),
      VI7: buildChord(`${s[5]}7`, s[5], a[5], 'dominant7', keyKey, 3),
      'vii°': buildChord(`${s[6]}dim`, s[6], a[6], 'diminished', keyKey, 3)
    };
  }

  // Minor key: Natural minor for i, III, iv, VI, VII; Harmonic minor for V, V7, vii°
  return {
    i: buildChord(`${s[0]}m`, s[0], a[0], 'minor', keyKey, 3),
    i6: buildChord(`${s[0]}m/3`, s[0], a[0], 'minor', keyKey, 3, 1),
    i64: buildChord(`${s[0]}m/5`, s[0], a[0], 'minor', keyKey, 3, 2),
    i7: buildChord(`${s[0]}m7`, s[0], a[0], 'minor7', keyKey, 3),
    'ii°': buildChord(`${s[1]}dim`, s[1], a[1], 'diminished', keyKey, 3),
    'ii°6': buildChord(`${s[1]}dim/3`, s[1], a[1], 'diminished', keyKey, 3, 1),
    ii7: buildChord(`${s[1]}m7b5`, s[1], a[1], 'halfDim7', keyKey, 3),
    'V/V': buildChord(`${s[1]}7`, s[1], a[1], 'dominant7', keyKey, 3),
    III: buildChord(`${s[2]}maj`, s[2], a[2], 'major', keyKey, 3),
    III6: buildChord(`${s[2]}maj/3`, s[2], a[2], 'major', keyKey, 3, 1),
    iv: buildChord(`${s[3]}m`, s[3], a[3], 'minor', keyKey, 3),
    iv7: buildChord(`${s[3]}m7`, s[3], a[3], 'minor7', keyKey, 3),
    V: buildChord(`${s[4]}maj`, s[4], a[4], 'major', keyKey, 3),
    V6: buildChord(`${s[4]}maj/3`, s[4], a[4], 'major', keyKey, 3, 1),
    V7: buildChord(`${s[4]}7`, s[4], a[4], 'dominant7', keyKey, 3),
    Vsus4: buildChord(`${s[4]}sus4`, s[4], a[4], 'sus4', keyKey, 3),
    VI: buildChord(`${s[5]}maj`, s[5], a[5], 'major', keyKey, 3),
    VII: buildChord(`${s[6]}maj`, s[6], a[6], 'major', keyKey, 3),
    'vii°': buildChord(`${s[6]}dim`, s[6], ha[6], 'diminished', keyKey, 3)
  };
}

// Each bar entry is either a single chord symbol ("I") or a 2-chord split ("ii6|V7")
type PhraseTemplate = string[];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function selectPhraseTemplate(
  style: ResolvedStyleType,
  isMinor: boolean,
  sectionId: MeasureBlueprint['sectionId'],
  cadenceType: MeasureBlueprint['cadenceType'],
  difficulty: DifficultyLevel
): PhraseTemplate {
  const isHalf = cadenceType === 'half';

  if (style === 'blues') {
    if (!isMinor) {
      if (sectionId === 'B') {
        return pick([
          ['IV7', 'IV7', 'I7', 'VI7'],
          ['ii7', 'V7', 'I7', 'V7']
        ]);
      }
      return isHalf
        ? pick([
            ['I7', 'IV7', 'I7', 'V7'],
            ['I7', 'I7', 'IV7', 'V7']
          ])
        : pick([
            ['IV7', 'IV7', 'I7|V7', 'I7'],
            ['ii7', 'V7', 'I7', 'I7'],
            ['IV7', 'ii7|V7', 'I7', 'I7']
          ]);
    } else {
      if (sectionId === 'B') return ['iv7', 'iv7', 'i7', 'V7'];
      return isHalf ? ['i7', 'iv7', 'i7', 'V7'] : ['iv7', 'ii7|V7', 'i7', 'i7'];
    }
  }

  if (style === 'pop') {
    if (!isMinor) {
      if (sectionId === 'B') {
        return isHalf
          ? pick([
              ['IV', 'V', 'iii', 'vi'],
              ['ii', 'IV', 'vi', 'V']
            ])
          : ['IV', 'V', 'vi', 'I'];
      }
      return isHalf
        ? pick([
            ['I', 'V', 'vi', 'IV'],
            ['I', 'iii', 'IV', 'V'],
            ['vi', 'IV', 'I', 'V']
          ])
        : pick([
            ['I', 'V', 'vi|IV', 'I'],
            ['vi', 'IV', 'V', 'I'],
            ['I', 'IV', 'V', 'I']
          ]);
    } else {
      if (sectionId === 'B') return ['VI', 'VII', 'i', 'V'];
      return isHalf
        ? pick([
            ['i', 'VI', 'III', 'VII'],
            ['i', 'iv', 'VI', 'V']
          ])
        : pick([
            ['i', 'VI', 'iv|V7', 'i'],
            ['VI', 'VII', 'V7', 'i']
          ]);
    }
  }

  if (style === 'baroque') {
    if (!isMinor) {
      if (sectionId === 'B') {
        return ['vi', 'ii', 'V', 'I'];
      }
      return isHalf
        ? pick([
            ['I', 'V6', 'vi', 'V'],
            ['I', 'IV', 'vii°', 'V']
          ])
        : pick([
            ['I', 'IV', 'ii6|V7', 'I'],
            ['vi', 'ii', 'V7', 'I'],
            ['I6', 'IV', 'V7', 'I']
          ]);
    } else {
      if (sectionId === 'B') return ['III', 'VI', 'ii°6', 'V'];
      return isHalf
        ? ['i', 'V6', 'i', 'V']
        : pick([
            ['i', 'iv', 'ii°6|V7', 'i'],
            ['VI', 'ii°', 'V7', 'i']
          ]);
    }
  }

  if (style === 'chorale') {
    if (!isMinor) {
      if (sectionId === 'B') {
        return difficulty >= 2
          ? ['vi', 'ii6', 'V/V', 'V']
          : ['vi', 'IV', 'ii', 'V'];
      }
      return isHalf
        ? pick([
            ['I', 'IV|I6', 'ii6', 'V'],
            ['I', 'V6|vi', 'IV', 'V']
          ])
        : pick([
            ['I', 'IV', 'ii6|V7', 'I'],
            ['I6', 'IV|ii', 'I64|V7', 'I']
          ]);
    } else {
      if (sectionId === 'B') return ['III', 'iv', 'ii°6', 'V'];
      return isHalf
        ? ['i', 'iv|i6', 'ii°6', 'V']
        : ['i', 'VI|iv', 'ii°6|V7', 'i'];
    }
  }

  // Classical (alberti), Romantic Waltz (waltz), Lyrical 6/8 Barcarolle (barcarolle)
  if (!isMinor) {
    if (sectionId === 'B') {
      if (difficulty >= 3) {
        return pick([
          ['vi', 'V/V', 'V', 'V7'],
          ['IV', 'iv', 'I64', 'V7'],
          ['ii', 'V/vi', 'vi', 'V']
        ]);
      }
      return pick([
        ['IV', 'I', 'ii', 'V'],
        ['vi', 'ii', 'V', 'I'],
        ['IV', 'V', 'vi', 'V']
      ]);
    }
    return isHalf
      ? pick([
          ['I', 'IV', 'I6', 'V'],
          ['I', 'V', 'vi', 'V'],
          ['I', 'ii', 'I6', 'V'],
          ['I', 'vi', 'IV', 'V']
        ])
      : pick([
          ['I', 'IV', 'ii6|V7', 'I'],
          ['I', 'vi', 'ii|V7', 'I'],
          ['I', 'IV', 'I64|V7', 'I'],
          ['I', 'ii', 'V7', 'I']
        ]);
  } else {
    if (sectionId === 'B') {
      return pick([
        ['III', 'VI', 'ii°6', 'V7'],
        ['iv', 'i', 'VI', 'V']
      ]);
    }
    return isHalf
      ? pick([
          ['i', 'iv', 'i6', 'V'],
          ['i', 'VI', 'iv', 'V']
        ])
      : pick([
          ['i', 'iv', 'ii°6|V7', 'i'],
          ['i', 'VI', 'ii°|V7', 'i'],
          ['i', 'iv', 'V7', 'i']
        ]);
  }
}

export function generateHarmonicProgression(
  keyKey: string,
  blueprints: MeasureBlueprint[],
  style: ResolvedStyleType,
  timeSignature: TimeSignature,
  difficulty: DifficultyLevel = 2
): HarmonicMeasure[] {
  const key = getKeyInfo(keyKey);
  const palette = buildKeyChordPalette(keyKey);
  const fallbackChord = key.isMinor ? palette.i : palette.I;
  const measureBeats = getExpectedMeasureQuarterBeats(timeSignature);

  // Build progressions 4-bar phrase by 4-bar phrase
  const barSpecs: string[] = [];
  const totalPhrases = Math.ceil(blueprints.length / 4);

  for (let p = 0; p < totalPhrases; p++) {
    const phraseStartIdx = p * 4;
    const phraseEndIdx = Math.min(phraseStartIdx + 3, blueprints.length - 1);
    const startBp = blueprints[phraseStartIdx];
    const endBp = blueprints[phraseEndIdx];

    const template = selectPhraseTemplate(
      style,
      key.isMinor,
      startBp.sectionId,
      endBp.cadenceType,
      difficulty
    );

    for (let k = 0; k < 4 && phraseStartIdx + k < blueprints.length; k++) {
      // At Level 1, keep 1 chord per measure except on Chorale/final cadences for easier reading
      let spec = template[k];
      if (difficulty === 1 && spec.includes('|') && style !== 'chorale') {
        const parts = spec.split('|');
        spec = parts[parts.length - 1];
      }
      barSpecs.push(spec);
    }
  }

  return blueprints.map((bp, idx) => {
    const spec = barSpecs[idx] || (key.isMinor ? 'i' : 'I');
    const parts = spec.split('|');

    const events: HarmonicEvent[] = [];
    if (parts.length === 2 && measureBeats >= 2.0) {
      // Split measure into two harmonic regions
      const firstHalf = timeSignature.name === '3/4' ? 2.0 : measureBeats / 2;
      const secondHalf = measureBeats - firstHalf;
      const c1 = palette[parts[0]] || fallbackChord;
      const c2 = palette[parts[1]] || fallbackChord;
      events.push(
        { chord: c1, functionName: parts[0], beatStart: 0, durationBeats: firstHalf },
        { chord: c2, functionName: parts[1], beatStart: firstHalf, durationBeats: secondHalf }
      );
    } else {
      const c = palette[parts[0]] || fallbackChord;
      events.push({ chord: c, functionName: parts[0], beatStart: 0, durationBeats: measureBeats });
    }

    return {
      measureNumber: bp.measureNumber,
      chord: events[0].chord,
      functionName: events[0].functionName,
      events,
      blueprint: bp
    };
  });
}
