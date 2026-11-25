import {
  DifficultyLevel,
  GenerationConfig,
  MusicPiece,
  ResolvedKeyCenter,
  ResolvedStyleType
} from './types';
import { getKeyInfo, KEYS_BY_DIFFICULTY } from './pitchUtils';
import { planMusicalForm } from './formPlanner';
import { generateHarmonicProgression } from './harmonics';
import { ALL_STYLES, getStyleRealizer } from './styles';
import { applyExpressiveMarkers } from './expressive';
import { compileMusicXml } from './musicXmlCompiler';
import { assertMeasureDuration } from './durationUtils';

export interface GeneratedResult {
  piece: MusicPiece;
  musicXml: string;
}

export function generateSightReadingPiece(config: GenerationConfig): GeneratedResult {
  const difficulty: DifficultyLevel = config.difficulty || 2;

  // Resolve style
  let style: ResolvedStyleType;
  if (config.style === 'random') {
    style = ALL_STYLES[Math.floor(Math.random() * ALL_STYLES.length)];
  } else {
    style = config.style;
  }

  const styleRealizer = getStyleRealizer(style);

  // Resolve key center (scaled by difficulty when random)
  let keyKey: ResolvedKeyCenter;
  if (config.keyCenter === 'random') {
    const allowedKeys = KEYS_BY_DIFFICULTY[difficulty];
    keyKey = allowedKeys[Math.floor(Math.random() * allowedKeys.length)];
  } else {
    keyKey = config.keyCenter;
  }

  // Resolve length (random picks 8 or 16 for ideal sight-reading session length)
  let length: 8 | 16 | 32 = config.length === 'random' ? 8 : config.length;
  if (config.length === 'random') {
    const lengths: (8 | 16)[] = [8, 16];
    length = lengths[Math.floor(Math.random() * lengths.length)];
  }

  const keyInfo = getKeyInfo(keyKey);
  const timeSignature = styleRealizer.timeSignature;

  // Stage 1: Form & Phrase Blueprint
  const { formName, blueprints } = planMusicalForm(length, style);

  // Stage 2: Style-Aware Harmony & Cadences
  const harmonicProgression = generateHarmonicProgression(
    keyKey,
    blueprints,
    style,
    timeSignature,
    difficulty
  );

  // Stage 3 & 4: Motif & Coupled Style Realization
  const rawMeasures = styleRealizer.realizePiece(
    harmonicProgression,
    timeSignature,
    keyKey,
    difficulty
  );

  // Validate rhythmic integrity of every generated measure
  for (let i = 0; i < rawMeasures.length; i++) {
    assertMeasureDuration(
      rawMeasures[i].bassNotes,
      timeSignature,
      `measure ${i + 1} bass (${style}, L${difficulty})`
    );
    assertMeasureDuration(
      rawMeasures[i].trebleNotes,
      timeSignature,
      `measure ${i + 1} treble (${style}, L${difficulty})`
    );
  }

  // Stage 5: Expressive Markers & Phrasing
  const expressiveMeasures = applyExpressiveMarkers(rawMeasures, styleRealizer, blueprints);

  const title = config.title || `${styleRealizer.titlePrefix} in ${keyInfo.name}`;
  const tempo = config.tempo || styleRealizer.tempoByDifficulty[difficulty];

  const piece: MusicPiece = {
    title,
    composer: `${formName} · Level ${difficulty}`,
    style,
    difficulty,
    formName,
    pedagogicalTags: styleRealizer.pedagogicalTags,
    keyName: keyInfo.name,
    keyFifths: keyInfo.fifths,
    isMinor: keyInfo.isMinor,
    timeSignature,
    tempo,
    tempoText: styleRealizer.tempoText,
    measures: expressiveMeasures
  };

  // Stage 6: MusicXML Compilation
  const musicXml = compileMusicXml(piece);

  return {
    piece,
    musicXml
  };
}
