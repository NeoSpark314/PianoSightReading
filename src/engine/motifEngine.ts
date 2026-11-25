import {
  ArticulationType,
  DifficultyLevel,
  HarmonicEvent,
  HarmonicMeasure,
  NoteData,
  NoteDuration,
  NotePitch,
  ResolvedStyleType,
  TimeSignature
} from './types';
import {
  DURATION_SPECS,
  getExpectedMeasureQuarterBeats,
  getFullMeasureDuration,
  makeChord,
  makeNote,
  makeRest
} from './durationUtils';
import {
  ScaleMode,
  clampPitchToRange,
  getClosestChordTone,
  getKeyInfo,
  getScaleDegreePitch,
  midiToPitch,
  stepOffsetToPitch
} from './pitchUtils';

export interface MotifCell {
  duration: NoteDuration;
  isRest?: boolean;
  tieStart?: boolean;
  tieStop?: boolean;
  stepDelta: number; // Relative diatonic step from previous note (0 = anchor chord tone)
  preferChordTone?: boolean;
  articulations?: ArticulationType[];
}

export interface AbstractMotif {
  cells: MotifCell[];
  anchorType: 'root' | 'third' | 'fifth' | 'closest';
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createStyleMotif(
  style: ResolvedStyleType,
  timeSignature: TimeSignature,
  difficulty: DifficultyLevel,
  isSectionB: boolean = false
): AbstractMotif {
  if (timeSignature.name === '6/8') {
    const patterns68: MotifCell[][] = [
      [
        { duration: 'dotted-quarter', stepDelta: 0, preferChordTone: true },
        { duration: 'quarter', stepDelta: 1 },
        { duration: 'eighth', stepDelta: -1 }
      ],
      [
        { duration: 'quarter', stepDelta: 0, preferChordTone: true },
        { duration: 'eighth', stepDelta: 1 },
        { duration: 'quarter', stepDelta: 1, preferChordTone: true },
        { duration: 'eighth', stepDelta: -1 }
      ],
      [
        { duration: 'eighth', stepDelta: 0, preferChordTone: true },
        { duration: 'eighth', stepDelta: 1 },
        { duration: 'eighth', stepDelta: 1 },
        { duration: 'dotted-quarter', stepDelta: -1, preferChordTone: true }
      ],
      [
        { duration: 'dotted-quarter', stepDelta: 0, preferChordTone: true },
        { duration: 'eighth', stepDelta: 2 },
        { duration: 'eighth', stepDelta: -1 },
        { duration: 'eighth', stepDelta: -1 }
      ]
    ];
    return {
      cells: pick(isSectionB ? patterns68.slice(1) : patterns68),
      anchorType: isSectionB ? 'fifth' : 'third'
    };
  }

  if (timeSignature.name === '3/4') {
    const patterns34: MotifCell[][] = [
      [
        { duration: 'dotted-quarter', stepDelta: 0, preferChordTone: true },
        { duration: 'eighth', stepDelta: 1 },
        { duration: 'quarter', stepDelta: 1, preferChordTone: true }
      ],
      [
        { duration: 'quarter', stepDelta: 0, preferChordTone: true },
        { duration: 'eighth', stepDelta: 1 },
        { duration: 'eighth', stepDelta: 1 },
        { duration: 'quarter', stepDelta: -1, preferChordTone: true }
      ],
      [
        { duration: 'half', stepDelta: 0, preferChordTone: true },
        { duration: 'quarter', stepDelta: -1 }
      ],
      [
        { duration: 'quarter', stepDelta: 0, preferChordTone: true },
        { duration: 'quarter', stepDelta: 2, preferChordTone: true },
        { duration: 'quarter', stepDelta: -1 }
      ]
    ];
    if (difficulty >= 2) {
      patterns34.push([
        { duration: 'quarter', stepDelta: 0, preferChordTone: true, articulations: ['tenuto'] },
        { duration: 'dotted-quarter', stepDelta: 2, preferChordTone: true },
        { duration: 'eighth', stepDelta: -1 }
      ]);
    }
    return {
      cells: pick(patterns34),
      anchorType: isSectionB ? 'fifth' : 'third'
    };
  }

  if (timeSignature.name === '2/4') {
    const patterns24: MotifCell[][] = [
      [
        { duration: 'eighth', stepDelta: 0, preferChordTone: true },
        { duration: 'eighth', stepDelta: 1 },
        { duration: 'quarter', stepDelta: 1, preferChordTone: true }
      ],
      [
        { duration: 'quarter', stepDelta: 0, preferChordTone: true },
        { duration: 'eighth', stepDelta: -1 },
        { duration: 'eighth', stepDelta: -1 }
      ],
      [
        { duration: 'dotted-eighth', stepDelta: 0, preferChordTone: true },
        { duration: 'sixteenth', stepDelta: 1 },
        { duration: 'quarter', stepDelta: 1, preferChordTone: true }
      ]
    ];
    return {
      cells: pick(patterns24),
      anchorType: 'third'
    };
  }

  // 4/4 patterns tailored by style
  if (style === 'pop') {
    const popPatterns: MotifCell[][] = [
      // Classic pop syncopation tied across beat 2 -> 3
      [
        { duration: 'quarter', stepDelta: 0, preferChordTone: true },
        { duration: 'eighth', stepDelta: 1 },
        { duration: 'eighth', stepDelta: 1, preferChordTone: true, tieStart: true, articulations: ['accent'] },
        { duration: 'quarter', stepDelta: 0, tieStop: true },
        { duration: 'quarter', stepDelta: -1 }
      ],
      [
        { duration: 'dotted-quarter', stepDelta: 0, preferChordTone: true },
        { duration: 'eighth', stepDelta: 1, tieStart: true },
        { duration: 'quarter', stepDelta: 0, tieStop: true },
        { duration: 'eighth', stepDelta: -1 },
        { duration: 'eighth', stepDelta: -1 }
      ],
      [
        { duration: 'quarter', stepDelta: 0, preferChordTone: true },
        { duration: 'quarter', stepDelta: 1 },
        { duration: 'eighth', isRest: true, stepDelta: 0 },
        { duration: 'eighth', stepDelta: 1, preferChordTone: true, articulations: ['accent'] },
        { duration: 'quarter', stepDelta: -1 }
      ]
    ];
    if (difficulty === 1) {
      return {
        cells: [
          { duration: 'dotted-quarter', stepDelta: 0, preferChordTone: true },
          { duration: 'eighth', stepDelta: 1 },
          { duration: 'quarter', stepDelta: 1, preferChordTone: true },
          { duration: 'quarter', stepDelta: -1 }
        ],
        anchorType: isSectionB ? 'fifth' : 'third'
      };
    }
    return {
      cells: pick(popPatterns),
      anchorType: isSectionB ? 'fifth' : 'third'
    };
  }

  if (style === 'blues') {
    const bluesPatterns: MotifCell[][] = [
      [
        { duration: 'quarter', isRest: true, stepDelta: 0 },
        { duration: 'eighth', stepDelta: 0, preferChordTone: true },
        { duration: 'eighth', stepDelta: 1, articulations: ['accent'] },
        { duration: 'quarter', stepDelta: 1, preferChordTone: true },
        { duration: 'quarter', stepDelta: -1, articulations: ['staccato'] }
      ],
      [
        { duration: 'dotted-quarter', stepDelta: 0, preferChordTone: true },
        { duration: 'eighth', stepDelta: 1, articulations: ['accent'] },
        { duration: 'quarter', stepDelta: -1 },
        { duration: 'quarter', isRest: true, stepDelta: 0 }
      ],
      [
        { duration: 'eighth', stepDelta: 0, preferChordTone: true },
        { duration: 'eighth', stepDelta: 1 },
        { duration: 'quarter', stepDelta: 1, articulations: ['accent'] },
        { duration: 'eighth', isRest: true, stepDelta: 0 },
        { duration: 'eighth', stepDelta: -1 },
        { duration: 'quarter', stepDelta: -1, preferChordTone: true }
      ]
    ];
    return {
      cells: pick(bluesPatterns),
      anchorType: 'third'
    };
  }

  // Classical / Baroque / default 4/4 motifs
  const classicalPatterns: MotifCell[][] = [
    [
      { duration: 'quarter', stepDelta: 0, preferChordTone: true },
      { duration: 'eighth', stepDelta: 1 },
      { duration: 'eighth', stepDelta: 1 },
      { duration: 'quarter', stepDelta: 1, preferChordTone: true },
      { duration: 'quarter', stepDelta: -1 }
    ],
    [
      { duration: 'dotted-quarter', stepDelta: 0, preferChordTone: true },
      { duration: 'eighth', stepDelta: 1 },
      { duration: 'quarter', stepDelta: -1, preferChordTone: true },
      { duration: 'quarter', stepDelta: -1 }
    ],
    [
      { duration: 'eighth', stepDelta: 0, preferChordTone: true },
      { duration: 'eighth', stepDelta: 1 },
      { duration: 'eighth', stepDelta: 1 },
      { duration: 'eighth', stepDelta: 1 },
      { duration: 'half', stepDelta: -1, preferChordTone: true }
    ]
  ];

  if (difficulty >= 2) {
    classicalPatterns.push([
      { duration: 'quarter', stepDelta: 0, preferChordTone: true },
      { duration: 'sixteenth', stepDelta: 1 },
      { duration: 'sixteenth', stepDelta: 1 },
      { duration: 'sixteenth', stepDelta: -1 },
      { duration: 'sixteenth', stepDelta: -1 },
      { duration: 'quarter', stepDelta: 1, preferChordTone: true },
      { duration: 'quarter', stepDelta: -1 }
    ]);
  }

  return {
    cells: pick(classicalPatterns),
    anchorType: isSectionB ? 'fifth' : 'third'
  };
}

function getActiveHarmonicEvent(events: HarmonicEvent[], beatOffset: number): HarmonicEvent {
  for (let i = events.length - 1; i >= 0; i--) {
    if (beatOffset >= events[i].beatStart - 1e-5) {
      return events[i];
    }
  }
  return events[0];
}

function getModeForChord(functionName: string, isMinor: boolean): ScaleMode {
  if (!isMinor) return 'natural';
  if (functionName.startsWith('V') || functionName.startsWith('vii')) {
    return 'harmonic';
  }
  return 'natural';
}

export interface RealizeMotifOptions {
  minMidi?: number;
  maxMidi?: number;
  targetCenterMidi?: number;
  addCadenceDyad?: boolean;
  bluesColor?: boolean;
  preferBreathAtCadence?: boolean;
}

export function realizeMotifMeasure(
  motif: AbstractMotif,
  harmonicMeasure: HarmonicMeasure,
  timeSignature: TimeSignature,
  keyKey: string,
  prevPitch: NotePitch | null,
  difficulty: DifficultyLevel,
  options: RealizeMotifOptions = {}
): NoteData[] {
  const { blueprint, events } = harmonicMeasure;
  const keyInfo = getKeyInfo(keyKey);
  const minMidi = options.minMidi ?? 60; // C4
  const maxMidi = options.maxMidi ?? (difficulty === 1 ? 76 : 81); // E5 or A5
  const centerMidi = options.targetCenterMidi ?? (67 + Math.round((blueprint.energy - 0.5) * 8));

  // Final measure: clean tonic arrival
  if (blueprint.isFinal) {
    const tonic = clampPitchToRange(
      getScaleDegreePitch(keyKey, 1, 5, 'natural'),
      minMidi,
      maxMidi
    );
    const closestTonic = prevPitch
      ? getClosestChordTone(prevPitch.midi, [events[0].chord.pitches[0]], minMidi, maxMidi)
      : tonic;

    const fullDur = getFullMeasureDuration(timeSignature);
    if (options.addCadenceDyad && difficulty >= 2) {
      const thirdBelow = getClosestChordTone(
        closestTonic.midi - 4,
        events[0].chord.pitches,
        minMidi - 5,
        closestTonic.midi - 2
      );
      if (thirdBelow.midi < closestTonic.midi && closestTonic.midi - thirdBelow.midi <= 9) {
        return [makeChord([thirdBelow, closestTonic], fullDur)];
      }
    }
    return [makeNote(closestTonic, fullDur)];
  }

  // Phrase cadence bar (bar 4, 8, 12...): melodic arrival + optional breath rest
  if (blueprint.motivicRole === 'cadence') {
    const targetDegree = blueprint.cadenceType === 'half' ? (Math.random() < 0.6 ? 2 : 5) : 1;
    const mode = getModeForChord(events[events.length - 1].functionName, keyInfo.isMinor);
    const goalBase = getScaleDegreePitch(keyKey, targetDegree, 4, mode);
    const goalPitch = getClosestChordTone(
      prevPitch ? prevPitch.midi : centerMidi,
      [goalBase],
      minMidi,
      maxMidi
    );
    const approachPitch = stepOffsetToPitch(
      goalPitch,
      prevPitch && prevPitch.midi > goalPitch.midi ? 1 : -1,
      keyKey,
      mode
    );

    const qb = getExpectedMeasureQuarterBeats(timeSignature);
    if (timeSignature.name === '6/8') {
      return [
        makeNote(clampPitchToRange(approachPitch, minMidi, maxMidi), 'dotted-quarter'),
        makeNote(goalPitch, 'quarter'),
        makeRest('eighth')
      ];
    }
    if (Math.abs(qb - 3.0) < 1e-6) {
      return options.preferBreathAtCadence
        ? [makeNote(goalPitch, 'half'), makeRest('quarter')]
        : [makeNote(clampPitchToRange(approachPitch, minMidi, maxMidi), 'quarter'), makeNote(goalPitch, 'half')];
    }
    if (Math.abs(qb - 2.0) < 1e-6) {
      return [makeNote(goalPitch, 'quarter'), makeRest('quarter')];
    }
    // 4/4 cadence bar
    if (options.preferBreathAtCadence) {
      return [
        makeNote(clampPitchToRange(approachPitch, minMidi, maxMidi), 'quarter'),
        makeNote(goalPitch, 'half'),
        makeRest('quarter')
      ];
    }
    return [
      makeNote(clampPitchToRange(approachPitch, minMidi, maxMidi), 'half'),
      makeNote(goalPitch, 'half')
    ];
  }

  // Continuation bar (bar 3 of phrase): gentle rhythmic acceleration toward cadence
  let cells = motif.cells;
  if (blueprint.motivicRole === 'continuation' && timeSignature.name === '4/4' && !options.bluesColor) {
    cells = [
      { duration: 'eighth', stepDelta: 0, preferChordTone: true },
      { duration: 'eighth', stepDelta: 1 },
      { duration: 'eighth', stepDelta: 1 },
      { duration: 'eighth', stepDelta: 1 },
      { duration: 'quarter', stepDelta: -1, preferChordTone: true },
      { duration: 'quarter', stepDelta: -1 }
    ];
  } else if (blueprint.motivicRole === 'continuation' && timeSignature.name === '3/4') {
    cells = [
      { duration: 'eighth', stepDelta: 0, preferChordTone: true },
      { duration: 'eighth', stepDelta: 1 },
      { duration: 'eighth', stepDelta: 1 },
      { duration: 'eighth', stepDelta: -1 },
      { duration: 'quarter', stepDelta: -1, preferChordTone: true }
    ];
  }

  // Realize each cell over the measure's harmonic events
  const notes: NoteData[] = [];
  let beatOffset = 0;

  // Choose anchor pitch for beat 1
  const firstEvent = events[0];
  let anchorTarget = prevPitch ? prevPitch.midi : centerMidi;
  if (blueprint.motivicRole === 'sequence') {
    // Sequence shifts subtly up/down toward the energy target
    anchorTarget = prevPitch ? prevPitch.midi + (blueprint.energy > 0.5 ? 2 : -2) : centerMidi + 2;
  } else if (blueprint.motivicRole === 'contrast') {
    anchorTarget = centerMidi + 4;
  }

  let currentPitch = getClosestChordTone(anchorTarget, firstEvent.chord.pitches, minMidi, maxMidi);
  let lastSoundedPitch: NotePitch = currentPitch;
  let needsRecovery = false;
  let recoveryDir = -1;

  // Blues color scale offsets (semitones from key tonic: b3, 4, #4, 5, b7)
  const bluesPcSet = new Set([0, 3, 5, 6, 7, 10].map(semi => (keyInfo.tonicMidi + semi) % 12));

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const durBeats = DURATION_SPECS[cell.duration].quarterBeats;
    const activeEvent = getActiveHarmonicEvent(events, beatOffset);
    const mode = getModeForChord(activeEvent.functionName, keyInfo.isMinor);

    if (cell.isRest) {
      notes.push(makeRest(cell.duration));
      beatOffset += durBeats;
      continue;
    }

    let nextPitch: NotePitch;

    if (cell.tieStop) {
      // Tied continuation MUST repeat the exact same pitch
      nextPitch = lastSoundedPitch;
    } else if (i === 0 && !cells[0].isRest) {
      nextPitch = currentPitch;
    } else if (needsRecovery) {
      nextPitch = stepOffsetToPitch(lastSoundedPitch, recoveryDir, keyKey, mode);
      needsRecovery = false;
    } else if (cell.preferChordTone) {
      const shiftedTarget = lastSoundedPitch.midi + cell.stepDelta * 2;
      nextPitch = getClosestChordTone(shiftedTarget, activeEvent.chord.pitches, minMidi, maxMidi);
    } else {
      const delta = cell.stepDelta === 0 ? (Math.random() < 0.5 ? 1 : -1) : cell.stepDelta;
      nextPitch = stepOffsetToPitch(lastSoundedPitch, delta, keyKey, mode);
    }

    // Optional blues note inflection on weak beats
    if (options.bluesColor && !cell.tieStop && !cell.preferChordTone && Math.random() < 0.35) {
      const pc = nextPitch.midi % 12;
      if (!bluesPcSet.has(pc)) {
        const flattened = midiToPitch(nextPitch.midi - 1, keyKey, true);
        if (bluesPcSet.has(flattened.midi % 12)) {
          nextPitch = flattened;
        }
      }
    }

    nextPitch = clampPitchToRange(nextPitch, minMidi, maxMidi);

    // Track large leaps (>= 5th) for natural stepwise recovery
    if (!cell.tieStop && Math.abs(nextPitch.midi - lastSoundedPitch.midi) >= 7) {
      needsRecovery = true;
      recoveryDir = nextPitch.midi > lastSoundedPitch.midi ? -1 : 1;
    }

    const tie =
      cell.tieStart && cell.tieStop
        ? 'continue'
        : cell.tieStart
          ? 'start'
          : cell.tieStop
            ? 'stop'
            : undefined;

    notes.push(
      makeNote(nextPitch, cell.duration, {
        tie,
        articulations: cell.articulations
      })
    );

    lastSoundedPitch = nextPitch;
    currentPitch = nextPitch;
    beatOffset += durBeats;
  }

  return notes;
}
