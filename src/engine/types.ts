export type StyleType = 'alberti' | 'waltz' | 'chorale' | 'pop' | 'random';

export type KeyCenter = 'C' | 'Am' | 'G' | 'Em' | 'F' | 'Dm' | 'random';

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
  | 'eighth' 
  | 'sixteenth';

export interface NotePitch {
  step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  alter?: number; // -1 for flat, 1 for sharp, 0 for natural
  octave: number;
  midi: number;
}

export interface NoteData {
  pitch?: NotePitch; // Undefined if rest
  isRest?: boolean;
  duration: NoteDuration;
  durationInQuarterNotes: number;
  tie?: 'start' | 'stop' | 'continue';
  slurStart?: boolean;
  slurStop?: boolean;
  dynamic?: string; // 'p', 'mp', 'mf', 'f'
  fingering?: number;
  beam?: Array<{ number: number; value: 'begin' | 'continue' | 'end' }>;
}

export interface ChordDefinition {
  name: string;
  rootMidi: number;
  rootStep: NotePitch['step'];
  rootAlter: number;
  quality: 'major' | 'minor' | 'diminished' | 'dominant7' | 'major7';
  pitches: NotePitch[]; // 3-4 chord tones
}

export interface HarmonicMeasure {
  measureNumber: number;
  chord: ChordDefinition;
  functionName: string; // e.g. "I", "iv", "V7"
}

export interface MeasureData {
  measureNumber: number;
  trebleNotes: NoteData[];
  bassNotes: NoteData[];
  timeSignature?: TimeSignature;
  dynamicMarker?: string; // e.g. 'p', 'crescendo', 'f'
  tempoMarker?: string; // e.g. 'Allegretto', 'Andante'
  systemBreak?: boolean;
}

export interface GenerationConfig {
  style: StyleType;
  keyCenter: KeyCenter;
  length: LengthOption;
  tempo?: number;
  title?: string;
}

export interface MusicPiece {
  title: string;
  composer: string;
  keyName: string;
  keyFifths: number; // Number of sharps (+ve) or flats (-ve)
  isMinor: boolean;
  timeSignature: TimeSignature;
  tempo: number;
  tempoText: string;
  measures: MeasureData[];
}
