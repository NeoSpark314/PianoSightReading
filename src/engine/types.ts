export type StyleType =
  | 'alberti'
  | 'waltz'
  | 'baroque'
  | 'chorale'
  | 'pop'
  | 'barcarolle'
  | 'blues'
  | 'random';

export type ResolvedStyleType = Exclude<StyleType, 'random'>;

export type DifficultyLevel = 1 | 2 | 3;

export type KeyCenter =
  | 'C'
  | 'Am'
  | 'G'
  | 'Em'
  | 'F'
  | 'Dm'
  | 'D'
  | 'Bm'
  | 'Bb'
  | 'Gm'
  | 'A'
  | 'F#m'
  | 'Eb'
  | 'Cm'
  | 'random';

export type ResolvedKeyCenter = Exclude<KeyCenter, 'random'>;

export type LengthOption = 8 | 16 | 32 | 'random';

export type TimeSignature = {
  beats: number;
  beatType: number;
  name: '4/4' | '3/4' | '2/4' | '6/8';
};

export type NoteDuration =
  | 'whole'
  | 'dotted-half'
  | 'half'
  | 'dotted-quarter'
  | 'quarter'
  | 'dotted-eighth'
  | 'eighth'
  | 'sixteenth';

export type ArticulationType = 'staccato' | 'accent' | 'tenuto';

export interface NotePitch {
  step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  alter?: number; // -1 for flat, 1 for sharp, 0/undefined for natural
  octave: number;
  midi: number;
}

export interface NoteData {
  pitch?: NotePitch; // Single note (undefined if rest or multi-note chord using pitches)
  pitches?: NotePitch[]; // Simultaneous pitches for chords/dyads (sorted low-to-high)
  isRest?: boolean;
  duration: NoteDuration;
  durationInQuarterNotes: number;
  tie?: 'start' | 'stop' | 'continue';
  slurStart?: boolean;
  slurStop?: boolean;
  articulations?: ArticulationType[];
  dynamic?: string; // 'p', 'mp', 'mf', 'f'
  fingering?: number;
  beam?: Array<{ number: number; value: 'begin' | 'continue' | 'end' }>;
}

export type ChordQuality =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'dominant7'
  | 'major7'
  | 'minor7'
  | 'halfDim7'
  | 'sus4'
  | 'add9';

export interface ChordDefinition {
  name: string;
  rootMidi: number;
  rootStep: NotePitch['step'];
  rootAlter: number;
  quality: ChordQuality;
  pitches: NotePitch[]; // 3-4 chord tones in reference octave
  bassPitch?: NotePitch; // Optional specific bass tone for inversions
  inversion?: 0 | 1 | 2 | 3;
}

export type SectionId = 'A' | 'B' | "A'" | "A''";

export type MotivicRole =
  | 'statement'
  | 'repeat'
  | 'sequence'
  | 'continuation'
  | 'cadence'
  | 'contrast';

export type CadenceType = 'none' | 'half' | 'deceptive' | 'authentic' | 'plagal';

export interface MeasureBlueprint {
  measureNumber: number;
  sectionId: SectionId;
  phraseIndex: number;
  phrasePos: number; // 0..3 within a 4-bar phrase
  phraseLength: number;
  motivicRole: MotivicRole;
  cadenceType: CadenceType;
  energy: number; // 0.0 - 1.0 arc for dynamics and register
  isFinal: boolean;
}

export interface HarmonicEvent {
  chord: ChordDefinition;
  functionName: string; // e.g. "I", "ii6", "V7", "V/V"
  beatStart: number; // Quarter-beat offset from start of measure
  durationBeats: number; // Length in quarter beats
}

export interface HarmonicMeasure {
  measureNumber: number;
  chord: ChordDefinition; // Primary chord (events[0].chord)
  functionName: string; // Primary function (events[0].functionName)
  events: HarmonicEvent[];
  blueprint: MeasureBlueprint;
}

export interface MeasureData {
  measureNumber: number;
  trebleNotes: NoteData[];
  bassNotes: NoteData[];
  timeSignature?: TimeSignature;
  dynamicMarker?: string; // e.g. 'p', 'mp', 'mf', 'f', 'crescendo', 'diminuendo'
  wedgeStop?: boolean; // Closes an active crescendo/diminuendo hairpin
  tempoMarker?: string; // e.g. 'Allegretto', 'Andante'
  systemBreak?: boolean;
}

export interface GenerationConfig {
  style: StyleType;
  keyCenter: KeyCenter;
  length: LengthOption;
  difficulty?: DifficultyLevel;
  tempo?: number;
  title?: string;
}

export interface MusicPiece {
  title: string;
  composer: string;
  style: ResolvedStyleType;
  difficulty: DifficultyLevel;
  formName: string;
  pedagogicalTags: string[];
  keyName: string;
  keyFifths: number; // Number of sharps (+ve) or flats (-ve)
  isMinor: boolean;
  timeSignature: TimeSignature;
  tempo: number;
  tempoText: string;
  measures: MeasureData[];
}
