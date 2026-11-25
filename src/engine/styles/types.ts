import {
  DifficultyLevel,
  HarmonicMeasure,
  MeasureData,
  ResolvedStyleType,
  TimeSignature
} from '../types';

export interface StyleRealizer {
  id: ResolvedStyleType;
  displayName: string;
  shortLabel: string;
  titlePrefix: string;
  tempoText: string;
  tempoByDifficulty: Record<DifficultyLevel, number>;
  timeSignature: TimeSignature;
  pedagogicalTags: string[];
  realizePiece(
    harmonicMeasures: HarmonicMeasure[],
    timeSignature: TimeSignature,
    keyKey: string,
    difficulty: DifficultyLevel
  ): MeasureData[];
}
