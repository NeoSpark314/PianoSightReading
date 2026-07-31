import { GenerationConfig, MusicPiece, MeasureData, TimeSignature, NoteDuration, StyleType, KeyCenter } from './types';
import { KEYS_MAP } from './pitchUtils';
import { generateHarmonicProgression } from './harmonics';
import { generateLeftHandMeasure } from './leftHand';
import { generateRightHandMeasure, selectPhraseMotif } from './rightHand';
import { applyExpressiveMarkers } from './expressive';
import { compileMusicXml } from './musicXmlCompiler';

export interface GeneratedResult {
  piece: MusicPiece;
  musicXml: string;
}

export function generateSightReadingPiece(config: GenerationConfig): GeneratedResult {
  // Resolve random style
  let style = config.style;
  if (style === 'random') {
    const availableStyles: StyleType[] = ['alberti', 'waltz', 'chorale', 'pop'];
    style = availableStyles[Math.floor(Math.random() * availableStyles.length)];
  }

  // Resolve random key center
  let keyKey = config.keyCenter;
  if (keyKey === 'random') {
    const keys: KeyCenter[] = ['C', 'Am', 'G', 'Em', 'F', 'Dm'];
    keyKey = keys[Math.floor(Math.random() * keys.length)];
  }

  // Resolve random length
  let length: 8 | 16 | 32 = config.length === 'random' ? 8 : config.length;
  if (config.length === 'random') {
    const lengths: (8 | 16 | 32)[] = [8, 16, 32];
    length = lengths[Math.floor(Math.random() * lengths.length)];
  }

  const keyInfo = KEYS_MAP[keyKey] || KEYS_MAP['C'];

  // Time Signature based on style
  const timeSignature: TimeSignature = style === 'waltz' 
    ? { beats: 3, beatType: 4, name: '3/4' } 
    : { beats: 4, beatType: 4, name: '4/4' };

  // Phase 1: Harmonic Backbone
  const harmonicProgression = generateHarmonicProgression(keyKey, length);

  // Phase 2 & 3: LH & RH note generation measure by measure
  const rawMeasures: MeasureData[] = [];
  let prevTrebleNote = null;
  let activePhraseMotif: NoteDuration[] | undefined = undefined;

  for (let i = 0; i < harmonicProgression.length; i++) {
    const hMeasure = harmonicProgression[i];
    const isFinal = i === harmonicProgression.length - 1;
    const phrasePos = i % 4;

    // Select a fresh rhythmic motif for every 4-bar phrase
    if (phrasePos === 0) {
      activePhraseMotif = selectPhraseMotif(style);
    }

    const bassNotes = generateLeftHandMeasure(hMeasure, style, isFinal);
    const trebleNotes = generateRightHandMeasure(
      hMeasure,
      style,
      keyKey,
      prevTrebleNote,
      isFinal,
      activePhraseMotif
    );

    if (trebleNotes.length > 0) {
      prevTrebleNote = trebleNotes[trebleNotes.length - 1];
    }

    rawMeasures.push({
      measureNumber: i + 1,
      trebleNotes,
      bassNotes,
      timeSignature: i === 0 ? timeSignature : undefined
    });
  }

  // Phase 4: Expressive Markers
  const expressiveMeasures = applyExpressiveMarkers(rawMeasures, style);

  // Title generation
  const styleNames: Record<string, string> = {
    alberti: 'Classical Sonatina Study',
    waltz: 'Lyrical Piano Waltz',
    chorale: 'Sacred Chorale Harmony',
    pop: 'Syncopated Modern Etude'
  };

  const title = config.title || `${styleNames[style]} in ${keyInfo.name}`;

  const piece: MusicPiece = {
    title,
    composer: 'Sight-Reading Generator',
    keyName: keyInfo.name,
    keyFifths: keyInfo.fifths,
    isMinor: keyInfo.isMinor,
    timeSignature,
    tempo: style === 'chorale' ? 72 : style === 'alberti' ? 108 : 120,
    tempoText: style === 'chorale' ? 'Andante' : 'Allegretto',
    measures: expressiveMeasures
  };

  // Phase 5: MusicXML Compilation
  const musicXml = compileMusicXml(piece);

  return {
    piece,
    musicXml
  };
}
